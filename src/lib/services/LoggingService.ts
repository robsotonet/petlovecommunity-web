import { CorrelationService } from './CorrelationService';
import { CorrelationContext } from '@/types/enterprise';
import { parseBooleanEnvVar } from '@/lib/utils/envUtils';

// Logging levels and types
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info', 
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export enum LogCategory {
  API = 'api',
  TRANSACTION = 'transaction',
  SIGNALR = 'signalr',
  UI = 'ui',
  AUTHENTICATION = 'authentication',
  PERFORMANCE = 'performance',
  SECURITY = 'security',
  GENERAL = 'general'
}

// Log entry interface
export interface LogEntry {
  id: string;
  timestamp: string;
  timestampMs: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  correlationId: string;
  correlationContext?: CorrelationContext;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration?: number;
    startTime?: number;
    endTime?: number;
  };
  request?: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
  };
  response?: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
    body?: any;
    size?: number;
  };
}

// Performance metrics interface
export interface PerformanceMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  errors: {
    total: number;
    byCategory: Record<LogCategory, number>;
    byLevel: Record<LogLevel, number>;
  };
  correlations: {
    active: number;
    total: number;
    averageLifetime: number;
  };
  transactions: {
    total: number;
    successful: number;
    failed: number;
    retried: number;
    averageProcessingTime: number;
  };
}

// Logging service class
export class LoggingService {
  private static instance: LoggingService;
  private correlationService: CorrelationService;
  private logs: Map<string, LogEntry> = new Map();
  private maxLogEntries: number = 1000;
  private enabledLevels: Set<LogLevel> = new Set([LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL]);
  private enabledCategories: Set<LogCategory> = new Set(Object.values(LogCategory));
  private enableConsoleOutput: boolean = process.env.NODE_ENV === 'development';
  private enableMetrics: boolean = parseBooleanEnvVar(
    process.env.PERFORMANCE_METRICS_ENABLED, 
    false, 
    'LoggingService'
  );
  
  constructor() {
    this.correlationService = CorrelationService.getInstance();
    this.configureFromEnvironment();
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  // Configuration from environment variables with secure parsing
  private configureFromEnvironment(): void {
    // Configure enabled levels - add debug level if enterprise debug is enabled in development
    const enableEnterpriseDebug = parseBooleanEnvVar(
      process.env.ENTERPRISE_DEBUG_ENABLED,
      false,
      'LoggingService/Debug'
    );
    
    if (process.env.NODE_ENV === 'development' && enableEnterpriseDebug) {
      this.enabledLevels.add(LogLevel.DEBUG);
    }
    
    // Configure console output - enable in development or when request/response logging is enabled
    const enableRequestResponseLogging = parseBooleanEnvVar(
      process.env.REQUEST_RESPONSE_LOGGING,
      false,
      'LoggingService/RequestResponse'
    );
    
    this.enableConsoleOutput = 
      process.env.NODE_ENV === 'development' || 
      enableRequestResponseLogging;

    // Configure metrics - secure parsing with default false
    this.enableMetrics = parseBooleanEnvVar(
      process.env.PERFORMANCE_METRICS_ENABLED,
      false,
      'LoggingService/Metrics'
    );
  }

  // Core logging method
  private log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    metadata?: Record<string, any>,
    error?: Error,
    performance?: LogEntry['performance'],
    request?: LogEntry['request'],
    response?: LogEntry['response']
  ): string {
    // Check if logging is enabled for this level and category
    if (!this.enabledLevels.has(level) || !this.enabledCategories.has(category)) {
      return '';
    }

    const correlationId = this.correlationService.getCurrentCorrelationId();
    const correlationContext = this.correlationService.getContextWithFallback(correlationId);
    const logId = this.generateLogId();
    const timestamp = new Date();

    const logEntry: LogEntry = {
      id: logId,
      timestamp: timestamp.toISOString(),
      timestampMs: timestamp.getTime(),
      level,
      category,
      message,
      correlationId,
      correlationContext,
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
      performance,
      request,
      response,
    };

    // Store log entry (with size management)
    this.storeLogEntry(logEntry);

    // Console output
    if (this.enableConsoleOutput) {
      this.outputToConsole(logEntry);
    }

    // Send to external logging service (in production)
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(logEntry);
    }

    return logId;
  }

  // Convenience methods for different log levels
  debug(category: LogCategory, message: string, metadata?: Record<string, any>): string {
    return this.log(LogLevel.DEBUG, category, message, metadata);
  }

  info(category: LogCategory, message: string, metadata?: Record<string, any>): string {
    return this.log(LogLevel.INFO, category, message, metadata);
  }

  warn(category: LogCategory, message: string, metadata?: Record<string, any>, error?: Error): string {
    return this.log(LogLevel.WARN, category, message, metadata, error);
  }

  error(category: LogCategory, message: string, metadata?: Record<string, any>, error?: Error): string {
    return this.log(LogLevel.ERROR, category, message, metadata, error);
  }

  fatal(category: LogCategory, message: string, metadata?: Record<string, any>, error?: Error): string {
    return this.log(LogLevel.FATAL, category, message, metadata, error);
  }

  // API request/response logging
  logApiRequest(
    method: string,
    url: string,
    headers?: Record<string, string>,
    body?: any,
    startTime?: number
  ): string {
    return this.log(
      LogLevel.INFO,
      LogCategory.API,
      `API Request: ${method} ${url}`,
      {
        method,
        url,
        requestSize: body ? JSON.stringify(body).length : 0,
      },
      undefined,
      startTime ? { startTime } : undefined,
      {
        method,
        url,
        headers,
        body: this.sanitizeRequestBody(body),
      }
    );
  }

  logApiResponse(
    requestLogId: string,
    status: number,
    statusText: string,
    headers?: Record<string, string>,
    body?: any,
    duration?: number
  ): string {
    const originalRequest = this.logs.get(requestLogId);
    
    return this.log(
      status >= 400 ? LogLevel.ERROR : LogLevel.INFO,
      LogCategory.API,
      `API Response: ${status} ${statusText}`,
      {
        requestLogId,
        status,
        statusText,
        responseSize: body ? JSON.stringify(body).length : 0,
        duration,
      },
      undefined,
      duration ? { duration } : undefined,
      originalRequest?.request,
      {
        status,
        statusText,
        headers,
        body: this.sanitizeResponseBody(body),
        size: body ? JSON.stringify(body).length : 0,
      }
    );
  }

  // Performance logging
  logPerformance(
    category: LogCategory,
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): string {
    return this.log(
      LogLevel.INFO,
      LogCategory.PERFORMANCE,
      `Performance: ${operation} completed in ${duration}ms`,
      {
        operation,
        ...metadata,
      },
      undefined,
      { duration }
    );
  }

  // Transaction logging
  logTransactionStart(
    transactionId: string,
    type: string,
    metadata?: Record<string, any>
  ): string {
    return this.log(
      LogLevel.INFO,
      LogCategory.TRANSACTION,
      `Transaction started: ${type}`,
      {
        transactionId,
        type,
        ...metadata,
      }
    );
  }

  logTransactionEnd(
    transactionId: string,
    type: string,
    status: 'completed' | 'failed',
    duration?: number,
    metadata?: Record<string, any>
  ): string {
    return this.log(
      status === 'failed' ? LogLevel.ERROR : LogLevel.INFO,
      LogCategory.TRANSACTION,
      `Transaction ${status}: ${type}`,
      {
        transactionId,
        type,
        status,
        ...metadata,
      },
      undefined,
      duration ? { duration } : undefined
    );
  }

  // SignalR logging
  logSignalREvent(
    event: string,
    data?: any,
    metadata?: Record<string, any>
  ): string {
    return this.log(
      LogLevel.INFO,
      LogCategory.SIGNALR,
      `SignalR Event: ${event}`,
      {
        event,
        data: this.sanitizeSignalRData(data),
        ...metadata,
      }
    );
  }

  // Security logging
  logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    metadata?: Record<string, any>
  ): string {
    const level = severity === 'critical' ? LogLevel.FATAL : 
                 severity === 'high' ? LogLevel.ERROR :
                 severity === 'medium' ? LogLevel.WARN : LogLevel.INFO;
                 
    return this.log(
      level,
      LogCategory.SECURITY,
      `Security Event: ${event}`,
      {
        event,
        severity,
        ...metadata,
      }
    );
  }

  // Query and filtering methods
  getLogs(
    filters?: {
      level?: LogLevel;
      category?: LogCategory;
      correlationId?: string;
      startTime?: number;
      endTime?: number;
      limit?: number;
    }
  ): LogEntry[] {
    let logs = Array.from(this.logs.values());

    if (filters) {
      if (filters.level) {
        logs = logs.filter(log => log.level === filters.level);
      }
      if (filters.category) {
        logs = logs.filter(log => log.category === filters.category);
      }
      if (filters.correlationId) {
        logs = logs.filter(log => log.correlationId === filters.correlationId);
      }
      if (filters.startTime) {
        logs = logs.filter(log => log.timestampMs >= filters.startTime!);
      }
      if (filters.endTime) {
        logs = logs.filter(log => log.timestampMs <= filters.endTime!);
      }
    }

    // Sort by timestamp (most recent first)
    logs.sort((a, b) => b.timestampMs - a.timestampMs);

    if (filters?.limit) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  // Metrics and analytics
  getMetrics(): PerformanceMetrics {
    if (!this.enableMetrics) {
      return this.getEmptyMetrics();
    }

    const logs = Array.from(this.logs.values());
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Filter logs from the last hour for metrics
    const recentLogs = logs.filter(log => log.timestampMs >= oneHourAgo);

    // Calculate request metrics
    const apiLogs = recentLogs.filter(log => log.category === LogCategory.API);
    const requests = apiLogs.filter(log => log.request);
    const responses = apiLogs.filter(log => log.response);
    const successfulRequests = responses.filter(log => log.response!.status! < 400);
    const failedRequests = responses.filter(log => log.response!.status! >= 400);
    
    const responseTimes = responses
      .filter(log => log.performance?.duration)
      .map(log => log.performance!.duration!);
    
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Calculate error metrics
    const errorLogs = recentLogs.filter(log => 
      log.level === LogLevel.ERROR || log.level === LogLevel.FATAL
    );
    
    const errorsByCategory = errorLogs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<LogCategory, number>);

    const errorsByLevel = errorLogs.reduce((acc, log) => {
      acc[log.level] = (acc[log.level] || 0) + 1;
      return acc;
    }, {} as Record<LogLevel, number>);

    // Calculate transaction metrics
    const transactionLogs = recentLogs.filter(log => log.category === LogCategory.TRANSACTION);
    const completedTransactions = transactionLogs.filter(log => 
      log.metadata?.status === 'completed'
    );
    const failedTransactions = transactionLogs.filter(log => 
      log.metadata?.status === 'failed'
    );
    const retriedTransactions = transactionLogs.filter(log => 
      log.message.includes('retry') || log.metadata?.retryCount
    );

    const transactionTimes = transactionLogs
      .filter(log => log.performance?.duration)
      .map(log => log.performance!.duration!);
    
    const averageTransactionTime = transactionTimes.length > 0
      ? transactionTimes.reduce((sum, time) => sum + time, 0) / transactionTimes.length
      : 0;

    return {
      requests: {
        total: requests.length,
        successful: successfulRequests.length,
        failed: failedRequests.length,
        averageResponseTime,
      },
      errors: {
        total: errorLogs.length,
        byCategory: errorsByCategory,
        byLevel: errorsByLevel,
      },
      correlations: {
        active: this.correlationService['contexts'].size,
        total: new Set(recentLogs.map(log => log.correlationId)).size,
        averageLifetime: 0, // Would need more sophisticated tracking
      },
      transactions: {
        total: transactionLogs.length,
        successful: completedTransactions.length,
        failed: failedTransactions.length,
        retried: retriedTransactions.length,
        averageProcessingTime: averageTransactionTime,
      },
    };
  }

  // Utility methods
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private storeLogEntry(logEntry: LogEntry): void {
    this.logs.set(logEntry.id, logEntry);
    
    // Maintain maximum log entries (FIFO)
    if (this.logs.size > this.maxLogEntries) {
      const oldestLogId = Array.from(this.logs.keys())[0];
      this.logs.delete(oldestLogId);
    }
  }

  private outputToConsole(logEntry: LogEntry): void {
    const prefix = `[${logEntry.timestamp}] [${logEntry.level.toUpperCase()}] [${logEntry.category.toUpperCase()}] [${logEntry.correlationId}]`;
    const message = `${prefix} ${logEntry.message}`;
    
    switch (logEntry.level) {
      case LogLevel.DEBUG:
        console.debug(message, logEntry.metadata || {});
        break;
      case LogLevel.INFO:
        console.log(message, logEntry.metadata || {});
        break;
      case LogLevel.WARN:
        console.warn(message, logEntry.metadata || {}, logEntry.error || {});
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, logEntry.metadata || {}, logEntry.error || {});
        break;
    }
  }

  private sendToExternalService(logEntry: LogEntry): void {
    // In production, send logs to external service (e.g., Datadog, New Relic, etc.)
    // This would be implemented based on the chosen logging service
    if (process.env.EXTERNAL_LOGGING_ENDPOINT) {
      // Example implementation (would need proper error handling)
      fetch(process.env.EXTERNAL_LOGGING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(logEntry),
      }).catch(error => {
        console.error('Failed to send log to external service:', error);
      });
    }
  }

  private sanitizeRequestBody(body: any): any {
    if (!body) return body;
    
    // Remove sensitive data from request bodies
    const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];
    const sanitized = { ...body };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  private sanitizeResponseBody(body: any): any {
    if (!body) return body;
    
    // Limit response body size for logging
    const bodyString = JSON.stringify(body);
    if (bodyString.length > 1000) {
      return `[RESPONSE TOO LARGE: ${bodyString.length} characters]`;
    }
    
    return body;
  }

  private sanitizeSignalRData(data: any): any {
    if (!data) return data;
    
    // Limit SignalR data size for logging
    const dataString = JSON.stringify(data);
    if (dataString.length > 500) {
      return `[DATA TOO LARGE: ${dataString.length} characters]`;
    }
    
    return data;
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
      },
      errors: {
        total: 0,
        byCategory: {} as Record<LogCategory, number>,
        byLevel: {} as Record<LogLevel, number>,
      },
      correlations: {
        active: 0,
        total: 0,
        averageLifetime: 0,
      },
      transactions: {
        total: 0,
        successful: 0,
        failed: 0,
        retried: 0,
        averageProcessingTime: 0,
      },
    };
  }

  // Cleanup method
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let cleanedCount = 0;
    
    for (const [logId, logEntry] of this.logs) {
      if (logEntry.timestampMs < oneHourAgo) {
        this.logs.delete(logId);
        cleanedCount++;
      }
    }
    
    if (process.env.NODE_ENV === 'development' && cleanedCount > 0) {
      console.log(`[LoggingService] Cleaned up ${cleanedCount} old log entries`);
    }
  }
}

// Export singleton instance
export const loggingService = LoggingService.getInstance();

// Auto-cleanup setup
let cleanupIntervalId: NodeJS.Timeout | null = null;

const startCleanup = () => {
  if (cleanupIntervalId === null) {
    cleanupIntervalId = setInterval(() => {
      loggingService.cleanup();
    }, 10 * 60 * 1000); // Cleanup every 10 minutes
  }
};

const stopCleanup = () => {
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
};

// Export lifecycle management
export const loggingServiceLifecycle = {
  start: startCleanup,
  stop: stopCleanup,
  isRunning: () => cleanupIntervalId !== null,
};

// Start cleanup automatically
startCleanup();

