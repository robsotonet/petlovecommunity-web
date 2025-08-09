import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CorrelationService, correlationService, generateCorrelationId, generateSessionId, createCorrelationContext } from '../CorrelationService'
import { mockTimers } from '../../../test/utils'

describe('CorrelationService', () => {
  let service: CorrelationService

  beforeEach(() => {
    // Get a fresh instance for each test
    service = CorrelationService.getInstance()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = CorrelationService.getInstance()
      const instance2 = CorrelationService.getInstance()
      
      expect(instance1).toBe(instance2)
      expect(instance1).toBe(service)
    })

    it('should maintain state across getInstance calls', () => {
      const instance1 = CorrelationService.getInstance()
      const context = instance1.createContext('user123')
      
      const instance2 = CorrelationService.getInstance()
      const retrievedContext = instance2.getContext(context.correlationId)
      
      expect(retrievedContext).toBe(context)
    })
  })

  describe('ID Generation', () => {
    it('should generate correlation ID with plc_ prefix', () => {
      const id = service.generateCorrelationId()
      
      expect(id).toMatch(/^plc_[a-f0-9]{32}$/)
    })

    it('should generate session ID with sess_ prefix', () => {
      const id = service.generateSessionId()
      
      expect(id).toMatch(/^sess_[a-f0-9]{32}$/)
    })

    it('should generate unique IDs on multiple calls', () => {
      const id1 = service.generateCorrelationId()
      const id2 = service.generateCorrelationId()
      const sessionId1 = service.generateSessionId()
      const sessionId2 = service.generateSessionId()
      
      expect(id1).not.toBe(id2)
      expect(sessionId1).not.toBe(sessionId2)
      expect(id1).not.toBe(sessionId1) // Different prefixes
    })
  })

  describe('Context Creation', () => {
    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
    })

    it('should create context with generated IDs', () => {
      const context = service.createContext()
      
      expect(context).toMatchObject({
        correlationId: expect.stringMatching(/^plc_[a-f0-9]{32}$/),
        sessionId: expect.stringMatching(/^sess_[a-f0-9]{32}$/),
        timestamp: 1234567890000,
        userId: undefined,
        parentCorrelationId: undefined,
      })
    })

    it('should create context with provided userId', () => {
      const context = service.createContext('user123')
      
      expect(context.userId).toBe('user123')
      expect(context).toMatchObject({
        correlationId: expect.any(String),
        sessionId: expect.any(String),
        timestamp: 1234567890000,
      })
    })

    it('should create child context with parent relationship', () => {
      const parentContext = service.createContext('user123')
      const childContext = service.createContext('user456', parentContext.correlationId)
      
      expect(childContext.parentCorrelationId).toBe(parentContext.correlationId)
      expect(childContext.sessionId).toBe(parentContext.sessionId) // Inherits session
      expect(childContext.userId).toBe('user456')
      expect(childContext.correlationId).not.toBe(parentContext.correlationId)
    })

    it('should generate new session for child when parent not found', () => {
      const childContext = service.createContext('user123', 'non-existent-parent')
      
      expect(childContext.parentCorrelationId).toBe('non-existent-parent')
      expect(childContext.sessionId).toMatch(/^sess_[a-f0-9]{32}$/)
    })

    it('should store created context for retrieval', () => {
      const context = service.createContext('user123')
      const retrieved = service.getContext(context.correlationId)
      
      expect(retrieved).toBe(context)
    })
  })

  describe('Context Retrieval', () => {
    it('should return undefined for non-existent context', () => {
      const context = service.getContext('non-existent-id')
      
      expect(context).toBeUndefined()
    })

    it('should return exact context for existing ID', () => {
      const originalContext = service.createContext('user123')
      const retrieved = service.getContext(originalContext.correlationId)
      
      expect(retrieved).toBe(originalContext)
    })
  })

  describe('Context Updates', () => {
    it('should update existing context', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
      const context = service.createContext('user123')
      
      vi.spyOn(Date, 'now').mockReturnValue(1234567890001)
      service.updateContext(context.correlationId, { userId: 'updatedUser' })
      
      const updated = service.getContext(context.correlationId)
      expect(updated?.userId).toBe('updatedUser')
      expect(updated?.timestampMs).toBe(1234567890001)
      expect(updated?.correlationId).toBe(context.correlationId) // Unchanged
    })

    it('should not update non-existent context', () => {
      service.updateContext('non-existent-id', { userId: 'user123' })
      
      const context = service.getContext('non-existent-id')
      expect(context).toBeUndefined()
    })

    it('should preserve unchanged fields during update', () => {
      const context = service.createContext('user123')
      const originalSessionId = context.sessionId
      
      service.updateContext(context.correlationId, { userId: 'newUser' })
      
      const updated = service.getContext(context.correlationId)
      expect(updated?.sessionId).toBe(originalSessionId)
      expect(updated?.correlationId).toBe(context.correlationId)
    })
  })

  describe('Request Headers', () => {
    it('should generate headers for existing context', () => {
      const context = service.createContext('user123')
      const headers = service.getRequestHeaders(context.correlationId)
      
      expect(headers).toEqual({
        'X-Correlation-ID': context.correlationId,
        'X-Session-ID': context.sessionId,
        'X-Timestamp': context.timestampMs.toString(),
        'X-User-ID': 'user123',
      })
    })

    it('should generate headers without optional fields', () => {
      const context = service.createContext() // No userId
      const headers = service.getRequestHeaders(context.correlationId)
      
      expect(headers).toEqual({
        'X-Correlation-ID': context.correlationId,
        'X-Session-ID': context.sessionId,
        'X-Timestamp': context.timestampMs.toString(),
      })
      expect(headers['X-User-ID']).toBeUndefined()
    })

    it('should include parent correlation ID in headers', () => {
      const parentContext = service.createContext('parentUser')
      const childContext = service.createContext('childUser', parentContext.correlationId)
      const headers = service.getRequestHeaders(childContext.correlationId)
      
      expect(headers).toEqual({
        'X-Correlation-ID': childContext.correlationId,
        'X-Session-ID': childContext.sessionId,
        'X-Timestamp': childContext.timestampMs.toString(),
        'X-User-ID': 'childUser',
        'X-Parent-Correlation-ID': parentContext.correlationId,
      })
    })

    it('should throw error for non-existent context', () => {
      expect(() => {
        service.getRequestHeaders('non-existent-id')
      }).toThrow('Correlation context not found: non-existent-id')
    })
  })

  describe('Cleanup', () => {
    it('should remove contexts older than 1 hour', () => {
      const { advanceTime, restore } = mockTimers()
      
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      // Create contexts at different times
      const recentContext = service.createContext('recent')
      
      // Create old context (2 hours ago)
      const twoHoursAgo = now - (2 * 60 * 60 * 1000)
      vi.spyOn(Date, 'now').mockReturnValue(twoHoursAgo)
      const oldContext = service.createContext('old')
      
      // Reset to current time
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      // Run cleanup
      service.cleanup()
      
      // Recent context should exist, old should be removed
      expect(service.getContext(recentContext.correlationId)).toBeDefined()
      expect(service.getContext(oldContext.correlationId)).toBeUndefined()
      
      restore()
    })

    it('should preserve contexts within 1 hour window', () => {
      const now = Date.now()
      vi.spyOn(Date, 'now').mockReturnValue(now)
      
      const context1 = service.createContext('user1')
      
      // Create context 30 minutes ago (within 1 hour)
      const thirtyMinutesAgo = now - (30 * 60 * 1000)
      vi.spyOn(Date, 'now').mockReturnValue(thirtyMinutesAgo)
      const context2 = service.createContext('user2')
      
      // Reset to current time and cleanup
      vi.spyOn(Date, 'now').mockReturnValue(now)
      service.cleanup()
      
      // Both should exist
      expect(service.getContext(context1.correlationId)).toBeDefined()
      expect(service.getContext(context2.correlationId)).toBeDefined()
    })

    it('should handle cleanup with no contexts', () => {
      expect(() => service.cleanup()).not.toThrow()
    })
  })

  describe('Utility Functions', () => {
    it('should export working generateCorrelationId function', () => {
      const id = generateCorrelationId()
      expect(id).toMatch(/^plc_[a-f0-9]{32}$/)
    })

    it('should export working generateSessionId function', () => {
      const id = generateSessionId()
      expect(id).toMatch(/^sess_[a-f0-9]{32}$/)
    })

    it('should export working createCorrelationContext function', () => {
      const context = createCorrelationContext('user123', 'parent-id')
      
      expect(context).toMatchObject({
        correlationId: expect.any(String),
        sessionId: expect.any(String),
        timestamp: expect.any(Number),
        userId: 'user123',
        parentCorrelationId: 'parent-id',
      })
    })

    it('should export singleton instance', () => {
      expect(correlationService).toBe(CorrelationService.getInstance())
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle rapid context creation', () => {
      const contexts = []
      
      for (let i = 0; i < 100; i++) {
        contexts.push(service.createContext(`user${i}`))
      }
      
      // All contexts should be unique and retrievable
      const correlationIds = new Set(contexts.map(c => c.correlationId))
      expect(correlationIds.size).toBe(100)
      
      // All should be retrievable
      contexts.forEach(context => {
        expect(service.getContext(context.correlationId)).toBe(context)
      })
    })

    it('should handle context updates with partial data', () => {
      const context = service.createContext('user123')
      
      service.updateContext(context.correlationId, {})
      
      const updated = service.getContext(context.correlationId)
      expect(updated?.userId).toBe('user123') // Unchanged
    })

    it('should handle context creation with empty string userId', () => {
      const context = service.createContext('')
      
      expect(context.userId).toBe('')
      
      const headers = service.getRequestHeaders(context.correlationId)
      expect(headers['X-User-ID']).toBe('')
    })
  })
})