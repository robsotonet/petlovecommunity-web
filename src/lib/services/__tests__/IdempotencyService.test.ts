import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IdempotencyService, idempotencyService } from '../IdempotencyService'
import { IdempotencyRecord } from '../../../types/enterprise'
// Test utilities to avoid JSX import issues
function mockTimers() {
  vi.useFakeTimers()
  return {
    advanceTime: (ms: number) => vi.advanceTimersByTime(ms),
    runAllTimers: () => vi.runAllTimers(),
    restore: () => vi.useRealTimers(),
  }
}

function createAsyncOperation<T>(result: T): () => Promise<T> {
  return () => Promise.resolve(result)
}

function createFailingAsyncOperation(error: Error): () => Promise<never> {
  return () => Promise.reject(error)
}

describe('IdempotencyService', () => {
  let service: IdempotencyService

  beforeEach(() => {
    service = IdempotencyService.getInstance()
    
    // Clear the singleton's internal records map
    const records = (service as any).records as Map<string, IdempotencyRecord>
    records.clear()
    
    vi.clearAllMocks()
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = IdempotencyService.getInstance()
      const instance2 = IdempotencyService.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(service)
    })

    it('should export singleton instance', () => {
      expect(idempotencyService).toBe(IdempotencyService.getInstance())
    })

    it('should maintain state across getInstance calls', async () => {
      const instance1 = IdempotencyService.getInstance()
      const mockOperation = vi.fn(createAsyncOperation({ result: 'test' }))
      
      await instance1.executeIdempotent(
        'test-key',
        'corr-123',
        mockOperation
      )
      
      const instance2 = IdempotencyService.getInstance()
      const hasRecord = instance2.hasRecord('test-key')
      
      expect(hasRecord).toBe(true)
    })
  })

  describe('Basic Idempotency Execution', () => {
    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
    })

    it('should execute operation and cache result on first call', async () => {
      const mockOperation = vi.fn(createAsyncOperation({ data: 'first-call' }))
      
      const result = await service.executeIdempotent(
        'first-key',
        'corr-123',
        mockOperation,
        60 // 60 minute expiration
      )
      
      expect(result).toEqual({ data: 'first-call' })
      expect(mockOperation).toHaveBeenCalledOnce()
      expect(service.hasRecord('first-key')).toBe(true)
    })

    it('should return cached result on subsequent calls', async () => {
      const mockOperation = vi.fn(createAsyncOperation({ data: 'cached-result' }))
      
      // First call
      const result1 = await service.executeIdempotent(
        'cache-key',
        'corr-123',
        mockOperation,
        60
      )
      
      // Second call - should return cached result
      const result2 = await service.executeIdempotent(
        'cache-key',
        'corr-456', // Different correlation ID
        mockOperation,
        60
      )
      
      expect(result1).toEqual({ data: 'cached-result' })
      expect(result2).toEqual({ data: 'cached-result' })
      expect(result1).toBe(result2) // Same reference
      expect(mockOperation).toHaveBeenCalledOnce() // Only called once
    })

    it('should handle different operations with same key', async () => {
      const mockOperation1 = vi.fn(createAsyncOperation({ result: 'first' }))
      const mockOperation2 = vi.fn(createAsyncOperation({ result: 'second' }))
      
      // First operation
      const result1 = await service.executeIdempotent(
        'same-key',
        'corr-123',
        mockOperation1
      )
      
      // Second operation with same key - should return cached result from first
      const result2 = await service.executeIdempotent(
        'same-key',
        'corr-456',
        mockOperation2
      )
      
      expect(result1).toEqual({ result: 'first' })
      expect(result2).toEqual({ result: 'first' }) // Returns first result
      expect(mockOperation1).toHaveBeenCalledOnce()
      expect(mockOperation2).not.toHaveBeenCalled()
    })

    it('should handle null and undefined results', async () => {
      const nullOperation = vi.fn(createAsyncOperation(null))
      const undefinedOperation = vi.fn(createAsyncOperation(undefined))
      
      const nullResult = await service.executeIdempotent(
        'null-key',
        'corr-123',
        nullOperation
      )
      
      const undefinedResult = await service.executeIdempotent(
        'undefined-key',
        'corr-456',
        undefinedOperation
      )
      
      expect(nullResult).toBeNull()
      expect(undefinedResult).toBeUndefined()
      
      // Should be cached
      expect(service.hasRecord('null-key')).toBe(true)
      expect(service.hasRecord('undefined-key')).toBe(true)
    })
  })

  describe('Expiration Handling', () => {
    const { advanceTime, restore } = mockTimers()

    afterEach(() => {
      restore()
    })

    it('should respect custom expiration time', async () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      const mockOperation = vi.fn(createAsyncOperation({ data: 'expires-soon' }))
      
      await service.executeIdempotent(
        'expires-key',
        'corr-123',
        mockOperation,
        5 // 5 minutes
      )
      
      const record = service.getRecord('expires-key')
      expect(record?.expiresAt).toBe(now + 5 * 60 * 1000)
    })

    it('should re-execute operation after expiration', async () => {
      const now = 1234567890000
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      let callCount = 0
      const mockOperation = vi.fn(() => {
        callCount++
        return Promise.resolve({ call: callCount })
      })
      
      // First call
      const result1 = await service.executeIdempotent(
        'expiry-key',
        'corr-123',
        mockOperation,
        5 // 5 minutes
      )
      
      expect(result1).toEqual({ call: 1 })
      expect(service.hasRecord('expiry-key')).toBe(true)
      
      // Advance time past expiration (6 minutes)
      vi.spyOn(Date, 'now').mockReturnValue(now + 6 * 60 * 1000)
      
      // Second call after expiration
      const result2 = await service.executeIdempotent(
        'expiry-key',
        'corr-456',
        mockOperation,
        5
      )
      
      expect(result2).toEqual({ call: 2 })
      expect(mockOperation).toHaveBeenCalledTimes(2)
    })

    it('should return false for hasRecord on expired keys', () => {
      const now = 1234567890000
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      // Manually add an expired record
      const expiredRecord: IdempotencyRecord = {
        key: 'expired-key',
        correlationId: 'corr-123',
        result: { data: 'expired' },
        createdAt: now - 2 * 60 * 60 * 1000, // 2 hours ago
        expiresAt: now - 60 * 60 * 1000, // 1 hour ago (expired)
      }
      
      // Access private records for testing
      ;(service as any).records.set('expired-key', expiredRecord)
      
      expect(service.hasRecord('expired-key')).toBe(false)
    })

    it('should return undefined for getRecord on expired keys', () => {
      const now = 1234567890000
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      // Manually add an expired record
      const expiredRecord: IdempotencyRecord = {
        key: 'expired-key',
        correlationId: 'corr-123',
        result: { data: 'expired' },
        createdAt: now - 2 * 60 * 60 * 1000,
        expiresAt: now - 60 * 60 * 1000,
      }
      
      ;(service as any).records.set('expired-key', expiredRecord)
      
      expect(service.getRecord('expired-key')).toBeUndefined()
    })
  })

  describe('Error Handling', () => {
    it('should not cache failed operations', async () => {
      const error = new Error('Operation failed')
      const mockOperation = vi.fn(createFailingAsyncOperation(error))
      
      await expect(
        service.executeIdempotent(
          'error-key',
          'corr-123',
          mockOperation
        )
      ).rejects.toThrow('Operation failed')
      
      expect(service.hasRecord('error-key')).toBe(false)
      expect(mockOperation).toHaveBeenCalledOnce()
    })

    it('should retry failed operations on subsequent calls', async () => {
      const error = new Error('Temporary failure')
      let attempts = 0
      const mockOperation = vi.fn(() => {
        attempts++
        if (attempts === 1) {
          return Promise.reject(error)
        }
        return Promise.resolve({ success: true, attempts })
      })
      
      // First call should fail
      await expect(
        service.executeIdempotent('retry-key', 'corr-123', mockOperation)
      ).rejects.toThrow('Temporary failure')
      
      expect(service.hasRecord('retry-key')).toBe(false)
      
      // Second call should succeed and be cached
      const result = await service.executeIdempotent(
        'retry-key',
        'corr-456',
        mockOperation
      )
      
      expect(result).toEqual({ success: true, attempts: 2 })
      expect(service.hasRecord('retry-key')).toBe(true)
      expect(mockOperation).toHaveBeenCalledTimes(2)
    })

    it('should handle synchronous errors', async () => {
      const mockOperation = vi.fn(() => {
        throw new Error('Sync error')
      })
      
      await expect(
        service.executeIdempotent('sync-error-key', 'corr-123', mockOperation)
      ).rejects.toThrow('Sync error')
      
      expect(service.hasRecord('sync-error-key')).toBe(false)
    })

    it('should handle non-Error exceptions', async () => {
      const mockOperation = vi.fn(() => {
        throw 'String error'
      })
      
      await expect(
        service.executeIdempotent('string-error-key', 'corr-123', mockOperation)
      ).rejects.toBe('String error')
      
      expect(service.hasRecord('string-error-key')).toBe(false)
    })
  })

  describe('Record Management', () => {
    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
    })

    it('should correctly identify existing records', async () => {
      const mockOperation = vi.fn(createAsyncOperation({ data: 'test' }))
      
      expect(service.hasRecord('test-key')).toBe(false)
      
      await service.executeIdempotent('test-key', 'corr-123', mockOperation)
      
      expect(service.hasRecord('test-key')).toBe(true)
      expect(service.hasRecord('non-existent-key')).toBe(false)
    })

    it('should retrieve correct record details', async () => {
      const mockOperation = vi.fn(createAsyncOperation({ data: 'record-data' }))
      const correlationId = 'corr-record-123'
      
      await service.executeIdempotent(
        'record-key',
        correlationId,
        mockOperation,
        30 // 30 minutes
      )
      
      const record = service.getRecord('record-key')
      
      expect(record).toMatchObject({
        key: 'record-key',
        correlationId,
        result: { data: 'record-data' },
        createdAt: 1234567890000,
        expiresAt: 1234567890000 + 30 * 60 * 1000,
      })
    })

    it('should return undefined for non-existent records', () => {
      const record = service.getRecord('non-existent-key')
      expect(record).toBeUndefined()
    })

    it('should invalidate records correctly', async () => {
      const mockOperation = vi.fn(createAsyncOperation({ data: 'to-invalidate' }))
      
      await service.executeIdempotent('invalidate-key', 'corr-123', mockOperation)
      
      expect(service.hasRecord('invalidate-key')).toBe(true)
      
      service.invalidateRecord('invalidate-key')
      
      expect(service.hasRecord('invalidate-key')).toBe(false)
      expect(service.getRecord('invalidate-key')).toBeUndefined()
    })

    it('should handle invalidation of non-existent records', () => {
      expect(() => {
        service.invalidateRecord('non-existent-key')
      }).not.toThrow()
    })
  })

  describe('Cleanup Operations', () => {
    it('should remove expired records during cleanup', () => {
      const now = 1234567890000
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      // Add active record
      const activeRecord: IdempotencyRecord = {
        key: 'active-key',
        correlationId: 'corr-active',
        result: { data: 'active' },
        createdAt: now,
        expiresAt: now + 60 * 60 * 1000, // 1 hour from now
      }
      
      // Add expired record
      const expiredRecord: IdempotencyRecord = {
        key: 'expired-key',
        correlationId: 'corr-expired',
        result: { data: 'expired' },
        createdAt: now - 2 * 60 * 60 * 1000,
        expiresAt: now - 60 * 60 * 1000, // 1 hour ago
      }
      
      // Manually add records for testing
      const records = (service as any).records as Map<string, IdempotencyRecord>
      records.set('active-key', activeRecord)
      records.set('expired-key', expiredRecord)
      
      expect(records.size).toBe(2)
      
      service.cleanup()
      
      expect(records.size).toBe(1)
      expect(records.has('active-key')).toBe(true)
      expect(records.has('expired-key')).toBe(false)
    })

    it('should handle cleanup with no records', () => {
      expect(() => service.cleanup()).not.toThrow()
    })

    it('should handle cleanup with only active records', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      // Add only active records
      const records = (service as any).records as Map<string, IdempotencyRecord>
      records.set('active1', {
        key: 'active1',
        correlationId: 'corr1',
        result: { data: 'active1' },
        createdAt: now,
        expiresAt: now + 60 * 60 * 1000,
      })
      
      const originalSize = records.size
      service.cleanup()
      
      expect(records.size).toBe(originalSize)
    })
  })

  describe('Statistics and Monitoring', () => {
    it('should provide accurate statistics', () => {
      const now = 1234567890000
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      const records = (service as any).records as Map<string, IdempotencyRecord>
      
      // Add active records
      records.set('active1', {
        key: 'active1',
        correlationId: 'corr1',
        result: { data: 'active1' },
        createdAt: now,
        expiresAt: now + 60 * 60 * 1000, // Active
      })
      
      records.set('active2', {
        key: 'active2',
        correlationId: 'corr2',
        result: { data: 'active2' },
        createdAt: now,
        expiresAt: now + 30 * 60 * 1000, // Active
      })
      
      // Add expired record
      records.set('expired1', {
        key: 'expired1',
        correlationId: 'corr3',
        result: { data: 'expired1' },
        createdAt: now - 2 * 60 * 60 * 1000,
        expiresAt: now - 30 * 60 * 1000, // Expired
      })
      
      const stats = service.getStats()
      
      expect(stats).toEqual({
        totalRecords: 3,
        activeRecords: 2,
        expiredRecords: 1,
      })
    })

    it('should return zero stats when no records exist', () => {
      // Clear any existing records
      const records = (service as any).records as Map<string, IdempotencyRecord>
      records.clear()
      
      const stats = service.getStats()
      
      expect(stats).toEqual({
        totalRecords: 0,
        activeRecords: 0,
        expiredRecords: 0,
      })
    })
  })

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent operations with different keys', async () => {
      const operations = Array.from({ length: 5 }, (_, i) =>
        vi.fn(createAsyncOperation({ id: i, data: `concurrent-${i}` }))
      )
      
      const promises = operations.map((op, i) =>
        service.executeIdempotent(
          `concurrent-key-${i}`,
          `corr-${i}`,
          op
        )
      )
      
      const results = await Promise.all(promises)
      
      results.forEach((result, i) => {
        expect(result).toEqual({ id: i, data: `concurrent-${i}` })
        expect(operations[i]).toHaveBeenCalledOnce()
        expect(service.hasRecord(`concurrent-key-${i}`)).toBe(true)
      })
    })

    it('should handle concurrent operations with same key', async () => {
      let executionCount = 0
      const mockOperation = vi.fn(() => {
        executionCount++
        return Promise.resolve({ executions: executionCount })
      })
      
      // First call to cache the result
      await service.executeIdempotent(
        'same-concurrent-key',
        'corr-concurrent',
        mockOperation
      )
      
      // Now all subsequent calls should return cached result
      const promises = Array.from({ length: 5 }, () =>
        service.executeIdempotent(
          'same-concurrent-key',
          'corr-concurrent',
          mockOperation
        )
      )
      
      const results = await Promise.all(promises)
      
      // All results should be the same (from the first execution)
      results.forEach(result => {
        expect(result).toEqual({ executions: 1 })
      })
      
      // Operation should only be called once due to idempotency
      expect(mockOperation).toHaveBeenCalledOnce()
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle rapid record creation and retrieval', async () => {
      const operations = Array.from({ length: 100 }, (_, i) =>
        vi.fn(createAsyncOperation({ batch: 'rapid', id: i }))
      )
      
      const promises = operations.map((op, i) =>
        service.executeIdempotent(
          `rapid-key-${i}`,
          `rapid-corr-${i}`,
          op
        )
      )
      
      const results = await Promise.all(promises)
      
      expect(results).toHaveLength(100)
      results.forEach((result, i) => {
        expect(result).toEqual({ batch: 'rapid', id: i })
        expect(service.hasRecord(`rapid-key-${i}`)).toBe(true)
      })
    })

    it('should handle complex result objects', async () => {
      const complexResult = {
        user: { id: '123', name: 'Test User', roles: ['admin', 'user'] },
        metadata: { created: Date.now(), version: '1.0' },
        data: { items: [1, 2, 3], nested: { deep: { value: 'test' } } },
      }
      
      const mockOperation = vi.fn(createAsyncOperation(complexResult))
      
      const result = await service.executeIdempotent(
        'complex-key',
        'corr-complex',
        mockOperation
      )
      
      expect(result).toEqual(complexResult)
      
      // Second call should return the same complex object
      const cachedResult = await service.executeIdempotent(
        'complex-key',
        'corr-complex-2',
        mockOperation
      )
      
      expect(cachedResult).toEqual(complexResult)
      expect(cachedResult).toBe(result) // Same reference
      expect(mockOperation).toHaveBeenCalledOnce()
    })

    it('should handle zero expiration time', async () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      const mockOperation = vi.fn(createAsyncOperation({ data: 'zero-expiry' }))
      
      await service.executeIdempotent(
        'zero-expiry-key',
        'corr-123',
        mockOperation,
        0 // Zero expiration
      )
      
      // Check the internal record was created with correct expiration
      const records = (service as any).records as Map<string, IdempotencyRecord>
      const internalRecord = records.get('zero-expiry-key')
      expect(internalRecord?.expiresAt).toBe(now) // Expires immediately
      
      // But hasRecord should return false because it's already expired
      expect(service.hasRecord('zero-expiry-key')).toBe(false)
      expect(service.getRecord('zero-expiry-key')).toBeUndefined()
    })
  })

  describe('Development Mode Logging', () => {
    it('should log in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const mockOperation = vi.fn(createAsyncOperation({ data: 'logged' }))
      
      await service.executeIdempotent('log-key', 'corr-log', mockOperation)
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Idempotency] Cached new result for key: log-key'),
        expect.objectContaining({
          correlationId: 'corr-log',
          expiresAt: expect.any(Number),
        })
      )
      
      process.env.NODE_ENV = originalEnv
    })

    it('should log cached result retrieval in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const mockOperation = vi.fn(createAsyncOperation({ data: 'cache-logged' }))
      
      // First call to cache
      await service.executeIdempotent('cache-log-key', 'corr-cache', mockOperation)
      
      // Clear previous logs
      vi.clearAllMocks()
      vi.spyOn(console, 'log').mockImplementation(() => {})
      
      // Second call should log cache retrieval
      await service.executeIdempotent('cache-log-key', 'corr-cache-2', mockOperation)
      
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Idempotency] Returning cached result for key: cache-log-key'),
        expect.objectContaining({
          correlationId: 'corr-cache-2',
        })
      )
      
      process.env.NODE_ENV = originalEnv
    })
  })
})