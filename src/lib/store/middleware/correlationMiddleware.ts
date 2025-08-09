import { Middleware } from '@reduxjs/toolkit';

interface ActionWithMeta {
  type?: string;
  meta?: {
    correlationId?: string;
    timestamp?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

export const correlationMiddleware: Middleware = 
  (store) => (next) => (action: ActionWithMeta) => {
    // Add correlation ID to all actions
    if (action.type && !action.meta?.correlationId) {
      const state = store.getState() as any;
      const correlationId = state.correlation?.currentContext?.correlationId;
      
      if (correlationId) {
        action.meta = {
          ...action.meta,
          correlationId,
          timestamp: Date.now(),
        };
      }
    }
    
    // Log action with correlation context for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Correlation] Action: ${action.type}`, {
        correlationId: action.meta?.correlationId,
        timestamp: action.meta?.timestamp,
      });
    }
    
    return next(action);
  };