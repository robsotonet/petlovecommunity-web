import { Middleware } from '@reduxjs/toolkit';

interface ActionWithIdempotency {
  type?: string;
  meta?: {
    idempotencyKey?: string;
    correlationId?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

// Simple in-memory cache for idempotency keys
const idempotencyCache = new Map<string, any>();

export const idempotencyMiddleware: Middleware = 
  (store) => (next) => (action: ActionWithIdempotency) => {
    // Handle idempotent actions
    if (action.meta?.idempotencyKey) {
      const key = action.meta.idempotencyKey;
      
      // Check if we've already processed this action
      if (idempotencyCache.has(key)) {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Idempotency] Duplicate action blocked: ${action.type}`, {
            idempotencyKey: key,
            correlationId: action.meta?.correlationId,
          });
        }
        return; // Don't process duplicate actions
      }
      
      // Process the action and cache the result
      const result = next(action);
      
      // Cache for 1 hour
      idempotencyCache.set(key, {
        result,
        timestamp: Date.now(),
        expiresAt: Date.now() + (60 * 60 * 1000),
      });
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Idempotency] Action cached: ${action.type}`, {
          idempotencyKey: key,
          correlationId: action.meta?.correlationId,
        });
      }
      
      return result;
    }
    
    return next(action);
  };

// Cleanup expired idempotency keys periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of idempotencyCache.entries()) {
    if (record.expiresAt < now) {
      idempotencyCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes