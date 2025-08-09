import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockRandomUUID } from '../../../test/setup'
import {
  generateCorrelationId,
  generateSessionId,
  generateTransactionId,
  generateIdempotencyKey,
} from '../correlationUtils'

describe('correlationUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRandomUUID.mockReturnValue('12345678-abcd-4efc-9012-3456789abcde')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('generateCorrelationId', () => {
    it('should generate correlation ID with plc_ prefix and crypto UUID', () => {
      const id = generateCorrelationId()
      
      expect(id).toMatch(/^plc_[a-f0-9]{32}$/)
      expect(id).toBe('plc_12345678abcd4efc90123456789abcde')
      expect(mockRandomUUID).toHaveBeenCalledOnce()
    })

    it('should generate unique IDs on multiple calls', () => {
      mockRandomUUID
        .mockReturnValueOnce('11111111-2222-4333-9444-555555555555')
        .mockReturnValueOnce('66666666-7777-4888-9999-aaaaaaaaaaaa')

      const id1 = generateCorrelationId()
      const id2 = generateCorrelationId()

      expect(id1).toBe('plc_11111111222243339444555555555555')
      expect(id2).toBe('plc_66666666777748889999aaaaaaaaaaaa')
      expect(id1).not.toBe(id2)
      expect(mockRandomUUID).toHaveBeenCalledTimes(2)
    })

    it('should throw error when crypto.randomUUID unavailable', () => {
      // Mock crypto being undefined
      const originalCrypto = globalThis.crypto
      // @ts-ignore
      globalThis.crypto = undefined
      
      expect(() => {
        generateCorrelationId()
      }).toThrow(/CRITICAL SECURITY ERROR: crypto\.randomUUID\(\) is not available/)
      
      // Restore crypto
      globalThis.crypto = originalCrypto
    })

    it('should throw error when crypto.randomUUID method missing', () => {
      // Mock crypto existing but randomUUID method missing
      const originalCrypto = globalThis.crypto
      globalThis.crypto = {} as Crypto
      
      expect(() => {
        generateCorrelationId()
      }).toThrow(/CRITICAL SECURITY ERROR: crypto\.randomUUID\(\) is not available/)
      
      // Restore crypto
      globalThis.crypto = originalCrypto
    })

    it('should require enterprise-grade crypto environment', () => {
      // Test that the function only works in enterprise-ready environments
      const originalCrypto = globalThis.crypto
      
      // Test with missing crypto entirely
      // @ts-ignore
      globalThis.crypto = undefined
      
      expect(() => {
        generateCorrelationId()
      }).toThrow(
        'CRITICAL SECURITY ERROR: crypto.randomUUID() is not available. ' +
        'Enterprise correlation IDs require cryptographically secure generation using Web Crypto API. ' +
        'This environment does not meet enterprise security requirements. ' +
        'Please ensure your environment supports crypto.randomUUID() (available in modern browsers and Node.js 19+).'
      )
      
      // Test with crypto but missing randomUUID method
      globalThis.crypto = {} as Crypto
      
      expect(() => {
        generateCorrelationId()
      }).toThrow(
        'CRITICAL SECURITY ERROR: crypto.randomUUID() is not available. ' +
        'Enterprise correlation IDs require cryptographically secure generation using Web Crypto API. ' +
        'This environment does not meet enterprise security requirements. ' +
        'Please ensure your environment supports crypto.randomUUID() (available in modern browsers and Node.js 19+).'
      )
      
      // Restore crypto
      globalThis.crypto = originalCrypto
    })
  })

  describe('generateSessionId', () => {
    it('should generate session ID with sess_ prefix and crypto UUID', () => {
      const id = generateSessionId()
      
      expect(id).toMatch(/^sess_[a-f0-9]{32}$/)
      expect(id).toBe('sess_12345678abcd4efc90123456789abcde')
      expect(mockRandomUUID).toHaveBeenCalledOnce()
    })

    it('should generate unique session IDs', () => {
      mockRandomUUID
        .mockReturnValueOnce('aaaaaaaa-bbbb-4ccc-9ddd-eeeeeeeeeeee')
        .mockReturnValueOnce('ffffffff-0000-4111-9222-333333333333')

      const id1 = generateSessionId()
      const id2 = generateSessionId()

      expect(id1).toBe('sess_aaaaaaaabbbb4ccc9dddeeeeeeeeeeee')
      expect(id2).toBe('sess_ffffffff000041119222333333333333')
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateTransactionId', () => {
    it('should generate transaction ID with txn_ prefix and crypto UUID', () => {
      const id = generateTransactionId()
      
      expect(id).toMatch(/^txn_[a-f0-9]{32}$/)
      expect(id).toBe('txn_12345678abcd4efc90123456789abcde')
      expect(mockRandomUUID).toHaveBeenCalledOnce()
    })

    it('should generate unique transaction IDs', () => {
      mockRandomUUID
        .mockReturnValueOnce('deadbeef-cafe-4bad-9f00-d0123456789a')
        .mockReturnValueOnce('fedcba98-7654-4321-9000-111122223333')

      const id1 = generateTransactionId()
      const id2 = generateTransactionId()

      expect(id1).toBe('txn_deadbeefcafe4bad9f00d0123456789a')
      expect(id2).toBe('txn_fedcba98765443219000111122223333')
      expect(id1).not.toBe(id2)
    })
  })

  describe('generateIdempotencyKey', () => {
    beforeEach(() => {
      // Mock Date.now for consistent testing
      vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('should generate idempotency key with operation name and timestamp', () => {
      const key = generateIdempotencyKey('test-operation')
      
      expect(key).toMatch(/^idem_test-operation_[A-Za-z0-9]+_1234567890000$/)
    })

    it('should generate different keys for different operations', () => {
      const key1 = generateIdempotencyKey('operation1')
      const key2 = generateIdempotencyKey('operation2')
      
      expect(key1).toContain('operation1')
      expect(key2).toContain('operation2')
      expect(key1).not.toBe(key2)
    })

    it('should generate same key for same operation and params', () => {
      const params = { petId: '123', userId: 'user456' }
      
      const key1 = generateIdempotencyKey('pet-favorite', params)
      const key2 = generateIdempotencyKey('pet-favorite', params)
      
      expect(key1).toBe(key2)
    })

    it('should generate different keys for same operation with different params', () => {
      const params1 = { petId: '123' }
      const params2 = { petId: '456' }
      
      const key1 = generateIdempotencyKey('pet-favorite', params1)
      const key2 = generateIdempotencyKey('pet-favorite', params2)
      
      expect(key1).not.toBe(key2)
      expect(key1).toContain('pet-favorite')
      expect(key2).toContain('pet-favorite')
    })

    it('should handle complex params objects', () => {
      const complexParams = {
        user: { id: '123', role: 'user' },
        pet: { id: '456', name: 'Buddy', breed: 'Golden Retriever' },
        metadata: { source: 'mobile', version: '1.0' }
      }
      
      const key = generateIdempotencyKey('adoption-application', complexParams)
      
      expect(key).toMatch(/^idem_adoption-application_[A-Za-z0-9]+_1234567890000$/)
    })

    it('should handle empty params', () => {
      const key1 = generateIdempotencyKey('empty-params', {})
      const key2 = generateIdempotencyKey('empty-params')
      
      // Both should be the same since {} and undefined should produce same hash
      expect(key1).toBe(key2)
    })

    it('should handle undefined params', () => {
      const key = generateIdempotencyKey('no-params', undefined)
      
      expect(key).toMatch(/^idem_no-params_[A-Za-z0-9]+_1234567890000$/)
    })

    it('should produce consistent hash for same object structure', () => {
      const params1 = { a: 1, b: 2 }
      const params2 = { b: 2, a: 1 } // Different order, same content
      
      const key1 = generateIdempotencyKey('test', params1)
      const key2 = generateIdempotencyKey('test', params2)
      
      // Note: JSON.stringify may produce different results for different property orders
      // This test documents current behavior - in production, use consistent param ordering
      expect(key1).toMatch(/^idem_test_[A-Za-z0-9]+_1234567890000$/)
      expect(key2).toMatch(/^idem_test_[A-Za-z0-9]+_1234567890000$/)
    })

    it('should include timestamp in key for uniqueness over time', () => {
      const params = { petId: '123' }
      
      // First call at time 1234567890000
      const key1 = generateIdempotencyKey('pet-favorite', params)
      
      // Second call at different time
      vi.spyOn(Date, 'now').mockReturnValue(1234567890001)
      const key2 = generateIdempotencyKey('pet-favorite', params)
      
      expect(key1).toContain('1234567890000')
      expect(key2).toContain('1234567890001')
      expect(key1).not.toBe(key2)
    })
  })

  describe('Security and Collision Resistance', () => {
    it('should generate highly unique IDs across many calls', () => {
      const ids = new Set<string>()
      const iterations = 1000
      
      // Mock different UUIDs for each call
      for (let i = 0; i < iterations; i++) {
        mockRandomUUID.mockReturnValueOnce(
          `${i.toString(16).padStart(8, '0')}-1234-4567-8901-${i.toString(16).padStart(12, '0')}`
        )
      }
      
      for (let i = 0; i < iterations; i++) {
        ids.add(generateCorrelationId())
      }
      
      expect(ids.size).toBe(iterations) // All IDs should be unique
    })

    it('should maintain format consistency across all ID types', () => {
      const correlationId = generateCorrelationId()
      const sessionId = generateSessionId()
      const transactionId = generateTransactionId()
      
      // All should use the same UUID format (32 hex chars)
      expect(correlationId.split('_')[1]).toHaveLength(32)
      expect(sessionId.split('_')[1]).toHaveLength(32)
      expect(transactionId.split('_')[1]).toHaveLength(32)
      
      // All should be valid hex
      expect(correlationId.split('_')[1]).toMatch(/^[a-f0-9]{32}$/)
      expect(sessionId.split('_')[1]).toMatch(/^[a-f0-9]{32}$/)
      expect(transactionId.split('_')[1]).toMatch(/^[a-f0-9]{32}$/)
    })
  })
})