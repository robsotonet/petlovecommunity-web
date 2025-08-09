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

  cleanup(): void {
    // Remove contexts older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [correlationId, context] of this.contexts) {
      if (context.timestampMs < oneHourAgo) {
        this.contexts.delete(correlationId);
      }
    }
  }
}

// Utility functions
export const correlationService = CorrelationService.getInstance();

export const generateCorrelationId = () => correlationService.generateCorrelationId();
export const generateSessionId = () => correlationService.generateSessionId();
export const createCorrelationContext = (userId?: string, parentId?: string) => 
  correlationService.createContext(userId, parentId);