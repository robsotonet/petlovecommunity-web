import { IdempotencyRecord } from '../../types/enterprise';

export class IdempotencyService {
  private static instance: IdempotencyService;
  private records: Map<string, IdempotencyRecord> = new Map();

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
    // Check if we already have a result for this key
    const existing = this.records.get(idempotencyKey);
    
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
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Idempotency] Invalidated record: ${idempotencyKey}`);
    }
  }

  cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, record] of this.records) {
      if (record.expiresAtMs <= now) {
        this.records.delete(key);
        cleanedCount++;
      }
    }
    
    if (process.env.NODE_ENV === 'development' && cleanedCount > 0) {
      console.log(`[Idempotency] Cleaned up ${cleanedCount} expired records`);
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