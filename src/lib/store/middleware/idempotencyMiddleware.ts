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
      
      // Start cleanup interval on first idempotent action
      startCleanupIfNeeded();
      
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

// Hot-reload safe cleanup manager
let cleanupIntervalId: NodeJS.Timeout | null = null;

const startCleanupIfNeeded = () => {
  if (cleanupIntervalId === null) {
    cleanupIntervalId = setInterval(() => {
      const now = Date.now();
      let cleanedCount = 0;
      
      for (const [key, record] of idempotencyCache.entries()) {
        if (record.expiresAt < now) {
          idempotencyCache.delete(key);
          cleanedCount++;
        }
      }
      
      if (process.env.NODE_ENV === 'development' && cleanedCount > 0) {
        console.log(`[Idempotency] Cleaned up ${cleanedCount} expired keys`);
      }
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Idempotency] Cleanup interval started');
    }
  }
};

const stopCleanup = () => {
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[Idempotency] Cleanup interval stopped');
    }
  }
};

// Export cleanup functions for lifecycle management
export const idempotencyCleanup = {
  start: startCleanupIfNeeded,
  stop: stopCleanup,
  forceClean: () => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, record] of idempotencyCache.entries()) {
      if (record.expiresAt < now) {
        idempotencyCache.delete(key);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }
};

// Hot module replacement cleanup for development
if (typeof module !== 'undefined' && module.hot) {
  module.hot.dispose(() => {
    stopCleanup();
  });
}