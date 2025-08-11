import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit';
import { RootState } from '../index';

interface RequestLogEntry {
  correlationId: string;
  timestamp: number;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: unknown;
  userAgent: string;
  sessionId: string;
  userId?: string;
}

interface ResponseLogEntry extends RequestLogEntry {
  responseTimestamp: number;
  duration: number;
  status: number;
  statusText: string;
  responseHeaders: Record<string, string>;
  responseBody?: unknown;
  error?: string;
}

interface LoggingConfig {
  enableConsoleLogging: boolean;
  enableStorageLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxStorageEntries: number;
  sensitiveHeaders: string[];
  sensitiveFields: string[];
  logRequestBodies: boolean;
  logResponseBodies: boolean;
}

class RequestResponseLogger {
  private static instance: RequestResponseLogger;
  private config: LoggingConfig;
  private requestLog: Map<string, RequestLogEntry> = new Map();
  private responseLog: ResponseLogEntry[] = [];

  private readonly DEFAULT_CONFIG: LoggingConfig = {
    enableConsoleLogging: process.env.NODE_ENV === 'development',
    enableStorageLogging: true,
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    maxStorageEntries: 100,
    sensitiveHeaders: [
      'authorization',
      'cookie',
      'set-cookie',
      'x-api-key',
      'x-auth-token',
    ],
    sensitiveFields: [
      'password',
      'token',
      'secret',
      'key',
      'authorization',
      'creditCard',
      'ssn',
    ],
    logRequestBodies: process.env.NODE_ENV === 'development',
    logResponseBodies: process.env.NODE_ENV === 'development',
  };

  private constructor(config?: Partial<LoggingConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<LoggingConfig>): RequestResponseLogger {
    if (!RequestResponseLogger.instance) {
      RequestResponseLogger.instance = new RequestResponseLogger(config);
    }
    return RequestResponseLogger.instance;
  }

  logRequest(entry: RequestLogEntry): void {
    // Store request entry for correlation with response
    this.requestLog.set(entry.correlationId, entry);

    // Clean up old requests (older than 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [id, request] of this.requestLog.entries()) {
      if (request.timestamp < fiveMinutesAgo) {
        this.requestLog.delete(id);
      }
    }

    if (this.config.enableConsoleLogging) {
      this.consoleLogRequest(entry);
    }
  }

  logResponse(
    correlationId: string,
    responseData: {
      status: number;
      statusText: string;
      headers: Record<string, string>;
      body?: unknown;
      error?: string;
    }
  ): void {
    const requestEntry = this.requestLog.get(correlationId);
    if (!requestEntry) {
      console.warn('[RequestResponseLogger] No request found for correlation ID:', correlationId);
      return;
    }

    const responseTimestamp = Date.now();
    const duration = responseTimestamp - requestEntry.timestamp;

    const responseEntry: ResponseLogEntry = {
      ...requestEntry,
      responseTimestamp,
      duration,
      status: responseData.status,
      statusText: responseData.statusText,
      responseHeaders: this.sanitizeHeaders(responseData.headers),
      responseBody: this.config.logResponseBodies 
        ? this.sanitizeData(responseData.body) 
        : undefined,
      error: responseData.error,
    };

    // Add to response log
    this.responseLog.push(responseEntry);

    // Maintain max storage limit
    if (this.responseLog.length > this.config.maxStorageEntries) {
      this.responseLog.shift();
    }

    // Remove from pending requests
    this.requestLog.delete(correlationId);

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.consoleLogResponse(responseEntry);
    }

    // Storage logging
    if (this.config.enableStorageLogging && typeof window !== 'undefined') {
      this.storageLogResponse(responseEntry);
    }
  }

  private consoleLogRequest(entry: RequestLogEntry): void {
    const logLevel = this.getLogLevel(entry.method);
    const style = this.getConsoleStyle('request', entry.method);

    console.group(`%c[API Request] ${entry.method} ${entry.url}`, style);
    console.log('Correlation ID:', entry.correlationId);
    console.log('Timestamp:', new Date(entry.timestamp).toISOString());
    console.log('Headers:', entry.headers);
    
    if (this.config.logRequestBodies && entry.body) {
      console.log('Body:', entry.body);
    }
    
    console.log('User Context:', {
      userId: entry.userId,
      sessionId: entry.sessionId,
      userAgent: entry.userAgent,
    });
    console.groupEnd();
  }

  private consoleLogResponse(entry: ResponseLogEntry): void {
    const isError = entry.status >= 400;
    const style = this.getConsoleStyle('response', entry.method, isError);
    const statusIcon = this.getStatusIcon(entry.status);

    console.group(`%c[API Response] ${statusIcon} ${entry.status} ${entry.method} ${entry.url} (${entry.duration}ms)`, style);
    console.log('Correlation ID:', entry.correlationId);
    console.log('Duration:', `${entry.duration}ms`);
    console.log('Status:', `${entry.status} ${entry.statusText}`);
    
    if (entry.error) {
      console.error('Error:', entry.error);
    }
    
    if (this.config.logResponseBodies && entry.responseBody) {
      console.log('Response Body:', entry.responseBody);
    }
    
    console.groupEnd();
  }

  private storageLogResponse(entry: ResponseLogEntry): void {
    try {
      const storageKey = 'petlovecommunity_api_logs';
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      
      // Add new entry
      stored.push({
        correlationId: entry.correlationId,
        timestamp: entry.timestamp,
        responseTimestamp: entry.responseTimestamp,
        duration: entry.duration,
        method: entry.method,
        url: entry.url,
        status: entry.status,
        error: entry.error,
        userId: entry.userId,
      });

      // Keep only recent entries
      if (stored.length > this.config.maxStorageEntries) {
        stored.splice(0, stored.length - this.config.maxStorageEntries);
      }

      localStorage.setItem(storageKey, JSON.stringify(stored));
    } catch (error) {
      console.warn('[RequestResponseLogger] Failed to store log entry:', error);
    }
  }

  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (this.config.sensitiveHeaders.includes(lowerKey)) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private sanitizeData(data: unknown): unknown {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (this.config.sensitiveFields.some(field => lowerKey.includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeData(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  private getLogLevel(method: string): string {
    const methodLevels: Record<string, string> = {
      GET: 'debug',
      POST: 'info',
      PUT: 'info',
      PATCH: 'info',
      DELETE: 'warn',
    };
    return methodLevels[method] || 'info';
  }

  private getConsoleStyle(type: 'request' | 'response', method: string, isError = false): string {
    if (type === 'request') {
      const methodColors: Record<string, string> = {
        GET: 'color: #2563eb; font-weight: bold;',
        POST: 'color: #059669; font-weight: bold;',
        PUT: 'color: #d97706; font-weight: bold;',
        PATCH: 'color: #7c3aed; font-weight: bold;',
        DELETE: 'color: #dc2626; font-weight: bold;',
      };
      return methodColors[method] || 'color: #374151; font-weight: bold;';
    }

    if (isError) {
      return 'color: #dc2626; font-weight: bold;';
    }

    return 'color: #059669; font-weight: bold;';
  }

  private getStatusIcon(status: number): string {
    if (status >= 200 && status < 300) return '✅';
    if (status >= 300 && status < 400) return '↩️';
    if (status >= 400 && status < 500) return '⚠️';
    if (status >= 500) return '❌';
    return '📡';
  }

  // Public methods for accessing logs
  getRecentLogs(count = 10): ResponseLogEntry[] {
    return this.responseLog.slice(-count);
  }

  getLogsByCorrelationId(correlationId: string): ResponseLogEntry | undefined {
    return this.responseLog.find(entry => entry.correlationId === correlationId);
  }

  clearLogs(): void {
    this.responseLog = [];
    this.requestLog.clear();
    
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('petlovecommunity_api_logs');
      } catch (error) {
        console.warn('[RequestResponseLogger] Failed to clear storage logs:', error);
      }
    }
  }

  getStats() {
    const recentLogs = this.getRecentLogs(50);
    const successCount = recentLogs.filter(log => log.status >= 200 && log.status < 400).length;
    const errorCount = recentLogs.filter(log => log.status >= 400).length;
    const averageDuration = recentLogs.reduce((sum, log) => sum + log.duration, 0) / recentLogs.length;

    return {
      totalRequests: recentLogs.length,
      successRate: recentLogs.length > 0 ? (successCount / recentLogs.length) * 100 : 0,
      errorRate: recentLogs.length > 0 ? (errorCount / recentLogs.length) * 100 : 0,
      averageDuration: Math.round(averageDuration) || 0,
      pendingRequests: this.requestLog.size,
    };
  }
}

// Singleton instance
const logger = RequestResponseLogger.getInstance();

// Redux middleware for logging API requests and responses
export const loggingMiddleware: Middleware<{}, RootState> = 
  ({ getState }: MiddlewareAPI<Dispatch<AnyAction>, RootState>) => 
  (next: Dispatch) => 
  (action: AnyAction) => {
    // Log RTK Query actions
    if (action.type?.endsWith('/pending')) {
      const state = getState();
      const correlationContext = state.correlation.currentContext;
      
      // Extract request details from action
      const { requestId, arg } = action.meta || {};
      const endpoint = action.meta?.arg?.endpointName || 'unknown';
      
      logger.logRequest({
        correlationId: correlationContext.correlationId,
        timestamp: Date.now(),
        method: arg?.method || 'GET',
        url: `${endpoint}`,
        headers: {
          'X-Correlation-ID': correlationContext.correlationId,
          'X-Session-ID': correlationContext.sessionId,
          'Content-Type': 'application/json',
        },
        body: arg?.body,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        sessionId: correlationContext.sessionId,
        userId: correlationContext.userId,
      });
    }

    // Log RTK Query responses
    if (action.type?.endsWith('/fulfilled') || action.type?.endsWith('/rejected')) {
      const state = getState();
      const correlationContext = state.correlation.currentContext;
      
      logger.logResponse(correlationContext.correlationId, {
        status: action.type.endsWith('/fulfilled') ? 200 : 500,
        statusText: action.type.endsWith('/fulfilled') ? 'OK' : 'Error',
        headers: {},
        body: action.payload,
        error: action.error?.message,
      });
    }

    return next(action);
  };

// Export logger instance and types
export { RequestResponseLogger, logger };
export type { RequestLogEntry, ResponseLogEntry, LoggingConfig };