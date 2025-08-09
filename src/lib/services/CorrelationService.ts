import { CorrelationContext } from '../../types/enterprise';

export class CorrelationService {
  private static instance: CorrelationService;
  private contexts: Map<string, CorrelationContext> = new Map();

  static getInstance(): CorrelationService {
    if (!CorrelationService.instance) {
      CorrelationService.instance = new CorrelationService();
    }
    return CorrelationService.instance;
  }

  private generateSecureId(): string {
    // Use enterprise-grade cryptographically secure ID generation
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID().replace(/-/g, '');
    }
    
    // No fallbacks allowed in enterprise environment - this is a critical security requirement
    throw new Error(
      'CRITICAL SECURITY ERROR: crypto.randomUUID() is not available. ' +
      'Enterprise correlation IDs require cryptographically secure generation using Web Crypto API. ' +
      'This environment does not meet enterprise security requirements. ' +
      'Please ensure your environment supports crypto.randomUUID() (available in modern browsers and Node.js 19+).'
    );
  }

  generateCorrelationId(): string {
    return `plc_${this.generateSecureId()}`;
  }

  generateSessionId(): string {
    return `sess_${this.generateSecureId()}`;
  }

  createContext(userId?: string, parentCorrelationId?: string): CorrelationContext {
    const context: CorrelationContext = {
      correlationId: this.generateCorrelationId(),
      parentCorrelationId,
      userId,
      sessionId: parentCorrelationId ? 
        this.contexts.get(parentCorrelationId)?.sessionId || this.generateSessionId() :
        this.generateSessionId(),
      timestampMs: Date.now(),
    };

    this.contexts.set(context.correlationId, context);
    return context;
  }

  getContext(correlationId: string): CorrelationContext | undefined {
    return this.contexts.get(correlationId);
  }

  updateContext(correlationId: string, updates: Partial<CorrelationContext>): void {
    const existing = this.contexts.get(correlationId);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        timestampMs: Date.now(),
      };
      this.contexts.set(correlationId, updated);
    }
  }

  getRequestHeaders(correlationId: string): Record<string, string> {
    const context = this.contexts.get(correlationId);
    if (!context) {
      throw new Error(`Correlation context not found: ${correlationId}`);
    }

    const headers: Record<string, string> = {
      'X-Correlation-ID': context.correlationId,
      'X-Session-ID': context.sessionId,
      'X-Timestamp': context.timestampMs.toString(),
    };

    if (context.parentCorrelationId) {
      headers['X-Parent-Correlation-ID'] = context.parentCorrelationId;
    }

    if (context.userId !== undefined) {
      headers['X-User-ID'] = context.userId;
    }

    return headers;
  }

  // Enhanced context persistence
  persistContext(context: CorrelationContext): void {
    if (typeof window !== 'undefined') {
      try {
        const key = `plc_correlation_${context.correlationId}`;
        window.sessionStorage.setItem(key, JSON.stringify(context));
      } catch (error) {
        console.warn('Failed to persist correlation context:', error);
      }
    }
  }

  loadPersistedContext(correlationId: string): CorrelationContext | null {
    if (typeof window !== 'undefined') {
      try {
        const key = `plc_correlation_${correlationId}`;
        const stored = window.sessionStorage.getItem(key);
        if (stored) {
          return JSON.parse(stored);
        }
      } catch (error) {
        console.warn('Failed to load persisted correlation context:', error);
      }
    }
    return null;
  }

  // Enhanced parent-child correlation tracking
  createChildContext(parentCorrelationId: string, userId?: string): CorrelationContext {
    const parent = this.getContext(parentCorrelationId) || this.loadPersistedContext(parentCorrelationId);
    
    if (!parent) {
      throw new Error(`Parent correlation context not found: ${parentCorrelationId}`);
    }

    const childContext = this.createContext(userId || parent.userId, parentCorrelationId);
    
    // Maintain parent-child relationship metadata
    childContext.depth = (parent.depth || 0) + 1;
    childContext.rootCorrelationId = parent.rootCorrelationId || parent.correlationId;
    
    this.persistContext(childContext);
    return childContext;
  }

  // Request interceptor functionality
  injectCorrelationHeaders(
    request: RequestInit, 
    correlationId?: string
  ): RequestInit {
    const contextId = correlationId || this.generateCorrelationId();
    let context = this.getContext(contextId);
    
    if (!context) {
      context = this.createContext();
      this.persistContext(context);
    }

    const headers = new Headers(request.headers);
    const correlationHeaders = this.getRequestHeaders(context.correlationId);
    
    Object.entries(correlationHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return {
      ...request,
      headers,
    };
  }

  // Enhanced cleanup with persistence management
  cleanup(): void {
    // Remove contexts older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [correlationId, context] of this.contexts) {
      if (context.timestampMs < oneHourAgo) {
        this.contexts.delete(correlationId);
        
        // Also clean up persisted storage
        if (typeof window !== 'undefined') {
          try {
            window.sessionStorage.removeItem(`plc_correlation_${correlationId}`);
          } catch (error) {
            console.warn('Failed to clean up persisted context:', error);
          }
        }
      }
    }
  }

  // Enhanced context retrieval with persistence fallback
  getContextWithFallback(correlationId: string): CorrelationContext | undefined {
    let context = this.getContext(correlationId);
    
    if (!context) {
      context = this.loadPersistedContext(correlationId);
      if (context) {
        this.contexts.set(correlationId, context);
      }
    }
    
    return context;
  }
}

// Utility functions
export const correlationService = CorrelationService.getInstance();

export const generateCorrelationId = () => correlationService.generateCorrelationId();
export const generateSessionId = () => correlationService.generateSessionId();
export const createCorrelationContext = (userId?: string, parentId?: string) => 
  correlationService.createContext(userId, parentId);