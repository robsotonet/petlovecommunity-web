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

  generateCorrelationId(): string {
    return `plc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  createContext(userId?: string, parentCorrelationId?: string): CorrelationContext {
    const context: CorrelationContext = {
      correlationId: this.generateCorrelationId(),
      parentCorrelationId,
      userId,
      sessionId: parentCorrelationId ? 
        this.contexts.get(parentCorrelationId)?.sessionId || this.generateSessionId() :
        this.generateSessionId(),
      timestamp: Date.now(),
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
        timestamp: Date.now(),
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
      'X-Timestamp': context.timestamp.toString(),
    };

    if (context.parentCorrelationId) {
      headers['X-Parent-Correlation-ID'] = context.parentCorrelationId;
    }

    if (context.userId) {
      headers['X-User-ID'] = context.userId;
    }

    return headers;
  }

  cleanup(): void {
    // Remove contexts older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [correlationId, context] of this.contexts) {
      if (context.timestamp < oneHourAgo) {
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