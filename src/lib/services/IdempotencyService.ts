import { IdempotencyRecord } from '../../types/enterprise';

export class IdempotencyService {
  private static instance: IdempotencyService;
  private records: Map<string, IdempotencyRecord> = new Map();
  private persistedKeys: Set<string> = new Set(); // Track localStorage keys for performance
  
  constructor() {
    // Load persisted records on startup
    this.loadPersistedRecords();
  }

  static getInstance(): IdempotencyService {
    if (!IdempotencyService.instance) {
      IdempotencyService.instance = new IdempotencyService();
    }
    return IdempotencyService.instance;
  }

  async executeIdempotent<T>(
    idempotencyKey: string,
    correlationId: string,
    operation: () => Promise<T>,
    expirationMinutes: number = 60
  ): Promise<T> {
    // Check if we already have a result for this key (including persisted fallback)
    const existing = this.getRecordWithFallback(idempotencyKey);
    
    if (existing && existing.expiresAtMs > Date.now()) {
      // Return cached result
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Idempotency] Returning cached result for key: ${idempotencyKey}`, {
          correlationId,
        });
      }
      return existing.result;
    }

    try {
      // Execute the operation
      const result = await operation();
      
      // Cache the result
      const record: IdempotencyRecord = {
        key: idempotencyKey,
        correlationId,
        result,
        createdAtMs: Date.now(),
        expiresAtMs: Date.now() + expirationMinutes * 60 * 1000,
      };
      
      this.records.set(idempotencyKey, record);
      this.persistRecord(record);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Idempotency] Cached new result for key: ${idempotencyKey}`, {
          correlationId,
          expiresAtMs: record.expiresAtMs,
        });
      }
      
      return result;
    } catch (error) {
      // Don't cache errors
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Idempotency] Operation failed, not caching: ${idempotencyKey}`, {
          correlationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      throw error;
    }
  }

  hasRecord(idempotencyKey: string): boolean {
    const record = this.records.get(idempotencyKey);
    return record !== undefined && record.expiresAtMs > Date.now();
  }

  getRecord(idempotencyKey: string): IdempotencyRecord | undefined {
    const record = this.records.get(idempotencyKey);
    return record && record.expiresAtMs > Date.now() ? record : undefined;
  }

  invalidateRecord(idempotencyKey: string): void {
    this.records.delete(idempotencyKey);
    
    // Also remove from persisted storage
    if (typeof window !== 'undefined') {
      try {
        const storageKey = `plc_idempotency_${idempotencyKey}`;
        window.localStorage.removeItem(storageKey);
        this.persistedKeys.delete(storageKey); // Remove from tracked keys
      } catch (error) {
        console.warn('Failed to remove persisted idempotency record:', error);
      }
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Idempotency] Invalidated record: ${idempotencyKey}`);
    }
  }

  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    let persistedCleanedCount = 0;
    
    // Clean in-memory records
    for (const [key, record] of this.records) {
      if (record.expiresAtMs <= now) {
        this.records.delete(key);
        cleanedCount++;
        
        // Also clean up persisted version
        if (typeof window !== 'undefined') {
          try {
            const storageKey = `plc_idempotency_${key}`;
            window.localStorage.removeItem(storageKey);
            this.persistedKeys.delete(storageKey); // Remove from tracked keys
            persistedCleanedCount++;
          } catch (error) {
            console.warn('Failed to clean up persisted idempotency record:', error);
          }
        }
      }
    }
    
    // Also scan and clean directly from localStorage using tracked keys
    if (typeof window !== 'undefined') {
      try {
        // Create a copy to avoid issues if we modify the set during iteration
        const keys = Array.from(this.persistedKeys);
        
        for (const key of keys) {
          try {
            const stored = window.localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.expiresAtMs <= now) {
                window.localStorage.removeItem(key);
                this.persistedKeys.delete(key); // Remove from tracked keys
                persistedCleanedCount++;
              }
            }
          } catch {
            // Remove corrupt records
            window.localStorage.removeItem(key);
            this.persistedKeys.delete(key); // Remove from tracked keys
            persistedCleanedCount++;
          }
        }
      } catch (error) {
        console.warn('Failed to clean up persisted idempotency records:', error);
      }
    }
    
    if (process.env.NODE_ENV === 'development' && cleanedCount > 0) {
      console.log(`[Idempotency] Cleaned up ${cleanedCount} expired in-memory records and ${persistedCleanedCount} persisted records`);
    }
  }

  // Get statistics for monitoring
  getStats(): {
    totalRecords: number;
    activeRecords: number;
    expiredRecords: number;
  } {
    const now = Date.now();
    let activeCount = 0;
    let expiredCount = 0;

    for (const record of this.records.values()) {
      if (record.expiresAtMs > now) {
        activeCount++;
      } else {
        expiredCount++;
      }
    }

    return {
      totalRecords: this.records.size,
      activeRecords: activeCount,
      expiredRecords: expiredCount,
    };
  }

  // Enhanced cache persistence with TTL management
  private persistRecord(record: IdempotencyRecord): void {
    if (typeof window !== 'undefined') {
      try {
        const key = `plc_idempotency_${record.key}`;
        const persistedData = {
          ...record,
          _persistedAt: Date.now(),
          _version: 1, // For future compatibility
        };
        
        window.localStorage.setItem(key, JSON.stringify(persistedData));
        this.persistedKeys.add(key); // Track the key for performance
      } catch (error) {
        console.warn('Failed to persist idempotency record:', error);
      }
    }
  }

  private loadPersistedRecords(): void {
    if (typeof window !== 'undefined') {
      try {
        // Initial scan to populate tracked keys (acceptable on startup)
        const keys = Object.keys(window.localStorage).filter(key => 
          key.startsWith('plc_idempotency_')
        );
        
        let loadedCount = 0;
        const now = Date.now();
        
        for (const key of keys) {
          try {
            const stored = window.localStorage.getItem(key);
            if (stored) {
              const parsed = JSON.parse(stored);
              
              // Remove persistence metadata
              delete parsed._persistedAt;
              delete parsed._version;
              
              const record = parsed as IdempotencyRecord;
              
              // Only load if not expired
              if (record.expiresAtMs > now) {
                this.records.set(record.key, record);
                this.persistedKeys.add(key); // Track the key for future operations
                loadedCount++;
              } else {
                // Remove expired persisted record
                window.localStorage.removeItem(key);
              }
            }
          } catch (error) {
            console.warn(`Failed to load persisted idempotency record: ${key}`, error);
            // Remove corrupt record
            window.localStorage.removeItem(key);
          }
        }
        
        if (process.env.NODE_ENV === 'development' && loadedCount > 0) {
          console.log(`[Idempotency] Loaded ${loadedCount} persisted records`);
        }
      } catch (error) {
        console.warn('Failed to load persisted idempotency records:', error);
      }
    }
  }

  private getRecordWithFallback(idempotencyKey: string): IdempotencyRecord | undefined {
    // First check in-memory cache
    let record = this.records.get(idempotencyKey);
    
    if (!record && typeof window !== 'undefined') {
      // Try to load from persistence
      try {
        const key = `plc_idempotency_${idempotencyKey}`;
        const stored = window.localStorage.getItem(key);
        if (stored) {
          const parsed = JSON.parse(stored);
          delete parsed._persistedAt;
          delete parsed._version;
          
          record = parsed as IdempotencyRecord;
          
          // Add back to in-memory cache if still valid
          if (record.expiresAtMs > Date.now()) {
            this.records.set(idempotencyKey, record);
            this.persistedKeys.add(key); // Track the key for future operations
          } else {
            // Clean up expired persisted record
            window.localStorage.removeItem(key);
            this.persistedKeys.delete(key); // Remove from tracked keys
            record = undefined;
          }
        }
      } catch (error) {
        console.warn('Failed to load persisted idempotency record:', error);
      }
    }
    
    return record;
  }

  // Enhanced TTL management with configurable expiration policies
  setCustomTTL(idempotencyKey: string, ttlMinutes: number): boolean {
    const record = this.getRecordWithFallback(idempotencyKey);
    if (record) {
      record.expiresAtMs = Date.now() + ttlMinutes * 60 * 1000;
      this.records.set(idempotencyKey, record);
      this.persistRecord(record);
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Idempotency] Updated TTL for key: ${idempotencyKey}`, {
          newExpiresAt: record.expiresAtMs,
          ttlMinutes,
        });
      }
      
      return true;
    }
    return false;
  }

  // Cache collision detection
  detectCollision(idempotencyKey: string, correlationId: string): boolean {
    const record = this.getRecordWithFallback(idempotencyKey);
    if (record && record.correlationId !== correlationId) {
      console.warn(`[Idempotency] Collision detected for key: ${idempotencyKey}`, {
        existingCorrelationId: record.correlationId,
        newCorrelationId: correlationId,
      });
      return true;
    }
    return false;
  }
}

export const idempotencyService = IdempotencyService.getInstance();

// Hot-reload safe cleanup manager for IdempotencyService
let serviceCleanupIntervalId: NodeJS.Timeout | null = null;

const startServiceCleanup = () => {
  if (serviceCleanupIntervalId === null) {
    serviceCleanupIntervalId = setInterval(() => {
      idempotencyService.cleanup();
    }, 5 * 60 * 1000); // Cleanup every 5 minutes
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[IdempotencyService] Cleanup interval started');
    }
  }
};

const stopServiceCleanup = () => {
  if (serviceCleanupIntervalId !== null) {
    clearInterval(serviceCleanupIntervalId);
    serviceCleanupIntervalId = null;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[IdempotencyService] Cleanup interval stopped');
    }
  }
};

// Export service lifecycle management
export const idempotencyServiceLifecycle = {
  start: startServiceCleanup,
  stop: stopServiceCleanup,
  isRunning: () => serviceCleanupIntervalId !== null,
};

// Start cleanup automatically on first use
startServiceCleanup();

// Hot module replacement cleanup for development
if (typeof module !== 'undefined' && module.hot) {
  module.hot.dispose(() => {
    stopServiceCleanup();
  });
}