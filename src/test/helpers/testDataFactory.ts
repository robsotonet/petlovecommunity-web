import { vi } from 'vitest';
import { TransactionType, TransactionStatus, Transaction } from '@/types/enterprise';
import { generateTransactionId } from '@/lib/utils/correlationUtils';

/**
 * Test constants for consistent values across test suites
 */
export const TEST_CONSTANTS = {
  // Performance test thresholds
  MAX_SLOW_TEST_MS: 10,
  FAST_TEST_THRESHOLD_MS: 5,
  
  // Data generation limits
  MAX_TRANSACTIONS: 500,
  MAX_CORRELATION_HISTORY: 100,
  DEFAULT_BATCH_SIZE: 50,
  
  // Timing values
  SHORT_DELAY_MS: 50,
  UPTIME_CALCULATION_DELAY_MS: 50,
  ASYNC_PROMISE_DELAY_MS: 0,
  
  // Test data patterns
  CORRELATION_ID_PREFIX: 'plc_test',
  TRANSACTION_ID_PREFIX: 'txn_test',
  IDEMPOTENCY_KEY_PREFIX: 'idem_test',
  SESSION_ID_PREFIX: 'sess_test',
} as const;

/**
 * Batch data generation utility for performance testing
 */
export class TestDataFactory {
  /**
   * Generate multiple transactions efficiently using batch operations
   */
  static generateMockTransactions(
    count: number,
    overrides: Partial<{
      type: TransactionType;
      status: TransactionStatus;
      correlationIdPrefix: string;
      transactionIdPrefix: string;
      idempotencyKeyPrefix: string;
      startTime: number;
    }> = {}
  ): Transaction[] {
    const {
      type = 'pet_favorite',
      status = 'completed',
      correlationIdPrefix = TEST_CONSTANTS.CORRELATION_ID_PREFIX,
      transactionIdPrefix = TEST_CONSTANTS.TRANSACTION_ID_PREFIX,
      idempotencyKeyPrefix = TEST_CONSTANTS.IDEMPOTENCY_KEY_PREFIX,
      startTime = 1234567890000,
    } = overrides;

    return Array.from({ length: count }, (_, index) => ({
      id: `${transactionIdPrefix}_${index}`,
      type,
      status,
      correlationId: `${correlationIdPrefix}_${index}`,
      idempotencyKey: `${idempotencyKeyPrefix}_${index}`,
      retryCount: 0,
      createdAtMs: startTime + index,
      updatedAtMs: startTime + index + 1000, // 1 second later
    }));
  }

  /**
   * Mock transaction ID generation for batch operations
   */
  /**
   * Mock transaction ID generation for consistent test data
   * 
   * Uses proper ES6 import instead of dynamic require() for better
   * TypeScript compatibility and maintainability.
   * 
   * @param count - Number of transaction IDs to mock
   * @param prefix - Prefix for generated transaction IDs
   */
  static mockTransactionIdGeneration(count: number, prefix: string = TEST_CONSTANTS.TRANSACTION_ID_PREFIX): void {
    Array.from({ length: count }, (_, index) => {
      vi.mocked(generateTransactionId)
        .mockReturnValueOnce(`${prefix}_${index}`);
    });
  }

  /**
   * Create initial state with pre-populated completed transactions
   * This avoids the expensive loop of reducer calls
   */
  static createStateWithCompletedTransactions(count: number) {
    const completedTransactions = this.generateMockTransactions(count);
    
    return {
      activeTransactions: {},
      completedTransactions,
    };
  }

  /**
   * Generate correlation contexts for testing
   */
  static generateMockCorrelationContexts(
    count: number,
    overrides: Partial<{
      correlationIdPrefix: string;
      sessionIdPrefix: string;
      userId?: string;
      startTime: number;
    }> = {}
  ) {
    const {
      correlationIdPrefix = TEST_CONSTANTS.CORRELATION_ID_PREFIX,
      sessionIdPrefix = TEST_CONSTANTS.SESSION_ID_PREFIX,
      userId,
      startTime = 1234567890000,
    } = overrides;

    return Array.from({ length: count }, (_, index) => ({
      correlationId: `${correlationIdPrefix}_${index}`,
      sessionId: `${sessionIdPrefix}_${index}`,
      userId: userId ? `${userId}_${index}` : undefined,
      timestampMs: startTime + index * 1000,
      parentCorrelationId: index > 0 ? `${correlationIdPrefix}_${index - 1}` : undefined,
    }));
  }

  /**
   * Performance test helper that measures execution time
   */
  static async measureTestPerformance<T>(
    testFn: () => T | Promise<T>,
    maxExpectedMs: number = TEST_CONSTANTS.MAX_SLOW_TEST_MS
  ): Promise<{ result: T; executionTimeMs: number; withinThreshold: boolean }> {
    const startTime = performance.now();
    const result = await testFn();
    const executionTimeMs = performance.now() - startTime;
    
    return {
      result,
      executionTimeMs,
      withinThreshold: executionTimeMs <= maxExpectedMs,
    };
  }

  /**
   * Create large datasets for stress testing
   */
  static createLargeDataset<T>(
    generator: (index: number) => T,
    count: number,
    batchSize: number = TEST_CONSTANTS.DEFAULT_BATCH_SIZE
  ): T[] {
    const result: T[] = [];
    
    for (let i = 0; i < count; i += batchSize) {
      const batch = Array.from(
        { length: Math.min(batchSize, count - i) },
        (_, batchIndex) => generator(i + batchIndex)
      );
      result.push(...batch);
    }
    
    return result;
  }
}

/**
 * Timer utilities for consistent time mocking
 */
export class MockTimeUtils {
  private static mockTime = 1234567890000;

  /**
   * Get consistent mock timestamp
   */
  static getMockTime(): number {
    return this.mockTime;
  }

  /**
   * Advance mock time by specified milliseconds
   */
  static advanceTime(ms: number): number {
    this.mockTime += ms;
    return this.mockTime;
  }

  /**
   * Reset mock time to default
   */
  static resetTime(): void {
    this.mockTime = 1234567890000;
  }

  /**
   * Mock Date.now() consistently across tests
   */
  static mockDateNow(): void {
    vi.spyOn(Date, 'now').mockReturnValue(this.getMockTime());
  }

  /**
   * Create time-based test sequence
   */
  static createTimeSequence(count: number, intervalMs: number = 1000): number[] {
    return Array.from({ length: count }, (_, index) => 
      this.getMockTime() + (index * intervalMs)
    );
  }
}

/**
 * Timer mocking utilities for setTimeout patterns
 */
export class MockTimerUtils {
  private static originalSetTimeout: typeof setTimeout;

  /**
   * Mock setTimeout to execute immediately for fast tests
   * Returns restore function to cleanup
   */
  static mockSetTimeoutImmediate(): () => void {
    this.originalSetTimeout = globalThis.setTimeout;
    
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn, delay) => {
      // Execute the function immediately instead of waiting
      if (typeof fn === 'function') {
        Promise.resolve().then(() => fn());
      }
      return 1 as any; // Return mock timer ID
    });

    return () => {
      globalThis.setTimeout = this.originalSetTimeout;
    };
  }

  /**
   * Mock setTimeout to capture delays without executing
   * Returns captured delays and restore function
   */
  static mockSetTimeoutCapture(): { capturedDelays: number[]; restore: () => void } {
    this.originalSetTimeout = globalThis.setTimeout;
    const capturedDelays: number[] = [];
    
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn, delay) => {
      capturedDelays.push(delay || 0);
      // Don't execute the function, just capture the delay
      return 1 as any; // Return mock timer ID
    });

    return {
      capturedDelays,
      restore: () => {
        globalThis.setTimeout = this.originalSetTimeout;
      }
    };
  }

  /**
   * Mock setTimeout with custom execution strategy
   * Returns captured delays and restore function
   */
  static mockSetTimeoutCustom(
    executionStrategy: (fn: Function, delay: number) => void = (fn) => Promise.resolve().then(() => fn())
  ): { capturedDelays: number[]; restore: () => void } {
    this.originalSetTimeout = globalThis.setTimeout;
    const capturedDelays: number[] = [];
    
    vi.spyOn(globalThis, 'setTimeout').mockImplementation((fn, delay) => {
      capturedDelays.push(delay || 0);
      if (typeof fn === 'function') {
        executionStrategy(fn, delay || 0);
      }
      return 1 as any; // Return mock timer ID
    });

    return {
      capturedDelays,
      restore: () => {
        globalThis.setTimeout = this.originalSetTimeout;
      }
    };
  }

  /**
   * Helper for retry pattern testing - mocks setTimeout for exponential backoff tests
   */
  static mockRetryTimeouts(expectedDelays: number[]): { 
    verifyDelays: () => void; 
    restore: () => void;
    capturedDelays: number[];
  } {
    const { capturedDelays, restore } = this.mockSetTimeoutCapture();
    
    return {
      capturedDelays,
      restore,
      verifyDelays: () => {
        expect(capturedDelays).toEqual(expectedDelays);
      }
    };
  }

  /**
   * Comprehensive timer setup for tests that need immediate execution
   */
  static setupImmediateExecution(): () => void {
    const restoreSetTimeout = this.mockSetTimeoutImmediate();
    MockTimeUtils.mockDateNow();
    
    return () => {
      restoreSetTimeout();
      MockTimeUtils.resetTime();
    };
  }
}