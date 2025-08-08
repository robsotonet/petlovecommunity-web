import { Middleware } from '@reduxjs/toolkit';

interface ActionWithPayload {
  type?: string;
  payload?: any;
  [key: string]: any;
}

export const transactionMiddleware: Middleware = 
  (store) => (next) => (action: ActionWithPayload) => {
    // Track transaction-related actions
    if (action.type && action.type.includes('transaction/')) {
      const state = store.getState() as any;
      const correlationId = state.correlation?.currentContext?.correlationId;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Transaction] ${action.type}`, {
          correlationId,
          payload: action.payload,
          timestamp: Date.now(),
        });
      }
    }
    
    return next(action);
  };