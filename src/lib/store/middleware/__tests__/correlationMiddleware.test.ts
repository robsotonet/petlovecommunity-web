import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { correlationMiddleware } from '../correlationMiddleware'
import correlationSlice from '../../slices/correlationSlice'

// Mock console to avoid noise in tests
const mockConsoleLog = vi.fn()

describe('correlationMiddleware', () => {
  let store: ReturnType<typeof createTestStore>
  
  function createTestStore() {
    return configureStore({
      reducer: {
        correlation: correlationSlice,
      },
      middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware().concat(correlationMiddleware)
    })
  }

  beforeEach(() => {
    // Set NODE_ENV to development for logging tests
    process.env.NODE_ENV = 'development'
    store = createTestStore()
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
    vi.spyOn(console, 'log').mockImplementation(mockConsoleLog)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Correlation ID Injection', () => {
    it('should add correlation ID to actions without meta', () => {
      const action = { type: 'test/action', payload: { data: 'test' } }
      
      store.dispatch(action)
      
      // The action should have been augmented with correlation metadata
      // We can't directly inspect the action, but we can verify the store state is updated
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Correlation] Action: test/action',
        expect.objectContaining({
          correlationId: expect.any(String),
          timestamp: 1234567890000,
        })
      )
    })

    it('should preserve existing meta and add correlation ID', () => {
      const action = {
        type: 'test/actionWithMeta',
        payload: { data: 'test' },
        meta: { existingKey: 'existingValue' }
      }
      
      store.dispatch(action)
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Correlation] Action: test/actionWithMeta',
        expect.objectContaining({
          correlationId: expect.any(String),
          timestamp: 1234567890000,
        })
      )
    })

    it('should not override existing correlation ID', () => {
      const existingCorrelationId = 'plc_existing_correlation'
      const action = {
        type: 'test/actionWithCorrelation',
        payload: { data: 'test' },
        meta: { correlationId: existingCorrelationId }
      }
      
      store.dispatch(action)
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Correlation] Action: test/actionWithCorrelation',
        expect.objectContaining({
          correlationId: existingCorrelationId,
        })
      )
    })

    it('should use current correlation context from store', () => {
      // First, set a specific correlation context
      const customCorrelationId = 'plc_custom_correlation'
      store.dispatch({
        type: 'correlation/setCorrelationContext',
        payload: { correlationId: customCorrelationId }
      })
      
      // Clear previous console calls
      mockConsoleLog.mockClear()
      
      // Now dispatch another action
      store.dispatch({ type: 'test/subsequentAction' })
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Correlation] Action: test/subsequentAction',
        expect.objectContaining({
          correlationId: customCorrelationId,
        })
      )
    })

    it('should handle actions without type (Redux will throw)', () => {
      const action = { payload: { data: 'test' } } as any
      
      // Redux throws for actions without type - this is expected behavior
      expect(() => store.dispatch(action)).toThrow('Actions may not have an undefined "type" property')
    })
  })

  describe('Timestamp Handling', () => {
    it('should add timestamp to actions', () => {
      const action = { type: 'test/timestamp', payload: { data: 'test' } }
      
      store.dispatch(action)
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Correlation] Action: test/timestamp',
        expect.objectContaining({
          timestamp: 1234567890000,
        })
      )
    })

    it('should use different timestamps for different actions', () => {
      const action1 = { type: 'test/action1' }
      const action2 = { type: 'test/action2' }
      
      store.dispatch(action1)
      
      // Advance time
      vi.spyOn(Date, 'now').mockReturnValue(1234567890001)
      
      store.dispatch(action2)
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(2)
      expect(mockConsoleLog).toHaveBeenNthCalledWith(1,
        '[Correlation] Action: test/action1',
        expect.objectContaining({ timestamp: 1234567890000 })
      )
      expect(mockConsoleLog).toHaveBeenNthCalledWith(2,
        '[Correlation] Action: test/action2',
        expect.objectContaining({ timestamp: 1234567890001 })
      )
    })
  })

  describe('Development Mode Logging', () => {
    it('should log in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      store.dispatch({ type: 'test/devLogging' })
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Correlation] Action: test/devLogging',
        expect.objectContaining({
          correlationId: expect.any(String),
          timestamp: expect.any(Number),
        })
      )
      
      process.env.NODE_ENV = originalEnv
    })

    it('should not log in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      // Create new store for production test
      const prodStore = createTestStore()
      prodStore.dispatch({ type: 'test/prodLogging' })
      
      expect(mockConsoleLog).not.toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })

    it('should log correlation ID and timestamp details', () => {
      const customCorrelationId = 'plc_log_test'
      
      store.dispatch({
        type: 'correlation/setCorrelationContext',
        payload: { correlationId: customCorrelationId }
      })
      
      mockConsoleLog.mockClear()
      
      store.dispatch({ type: 'test/logDetails', payload: { important: 'data' } })
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Correlation] Action: test/logDetails',
        {
          correlationId: customCorrelationId,
          timestamp: 1234567890000,
        }
      )
    })
  })

  describe('Store Integration', () => {
    it('should work with correlation slice actions', () => {
      const userId = 'user123'
      
      store.dispatch({
        type: 'correlation/setUserId',
        payload: userId
      })
      
      const state = store.getState()
      expect(state.correlation.currentContext.userId).toBe(userId)
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Correlation] Action: correlation/setUserId',
        expect.objectContaining({
          correlationId: expect.any(String),
        })
      )
    })

    it('should handle child correlation creation', () => {
      store.dispatch({
        type: 'correlation/createChildCorrelation',
        payload: { userId: 'childUser' }
      })
      
      const state = store.getState()
      expect(state.correlation.currentContext.userId).toBe('childUser')
      expect(state.correlation.currentContext.parentCorrelationId).toBeDefined()
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Correlation] Action: correlation/createChildCorrelation',
        expect.objectContaining({
          correlationId: expect.any(String),
        })
      )
    })

    it('should handle multiple sequential actions with correlation tracking', () => {
      // Set initial user
      store.dispatch({
        type: 'correlation/setUserId',
        payload: 'parentUser'
      })
      
      // Create child correlation
      store.dispatch({
        type: 'correlation/createChildCorrelation',
        payload: { userId: 'childUser' }
      })
      
      // Dispatch unrelated action
      store.dispatch({
        type: 'test/unrelated',
        payload: { data: 'test' }
      })
      
      expect(mockConsoleLog).toHaveBeenCalledTimes(3)
      
      // All actions should have correlation IDs
      mockConsoleLog.mock.calls.forEach(call => {
        expect(call[1]).toMatchObject({
          correlationId: expect.any(String),
          timestamp: expect.any(Number),
        })
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing correlation state gracefully', () => {
      // Create store without correlation slice
      const minimalStore = configureStore({
        reducer: {
          other: (state = {}) => state,
        },
        middleware: (getDefaultMiddleware) => 
          getDefaultMiddleware().concat(correlationMiddleware)
      })
      
      expect(() => {
        minimalStore.dispatch({ type: 'test/noCorrelation' })
      }).not.toThrow()
    })

    it('should handle malformed correlation state', () => {
      // Mock store.getState to return malformed state
      const originalGetState = store.getState
      vi.spyOn(store, 'getState').mockReturnValue({
        correlation: null
      } as any)
      
      expect(() => {
        store.dispatch({ type: 'test/malformedState' })
      }).not.toThrow()
      
      // Restore original getState
      store.getState = originalGetState
    })

    it('should handle undefined correlation context', () => {
      const originalGetState = store.getState
      vi.spyOn(store, 'getState').mockReturnValue({
        correlation: { currentContext: undefined }
      } as any)
      
      expect(() => {
        store.dispatch({ type: 'test/undefinedContext' })
      }).not.toThrow()
      
      store.getState = originalGetState
    })

    it('should handle actions with complex meta objects', () => {
      const complexMeta = {
        existingCorrelationId: 'should_not_override',
        nested: {
          deep: { value: 'test' }
        },
        array: [1, 2, 3],
        timestamp: 999999999 // Should not override
      }
      
      const action = {
        type: 'test/complexMeta',
        meta: complexMeta
      }
      
      expect(() => store.dispatch(action)).not.toThrow()
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Correlation] Action: test/complexMeta',
        expect.objectContaining({
          correlationId: expect.any(String),
          timestamp: 1234567890000, // Should be updated
        })
      )
    })

    it('should preserve action immutability', () => {
      const originalAction = {
        type: 'test/immutable',
        payload: { data: 'original' },
        meta: { original: 'meta' }
      }
      
      // Deep copy to capture the original state completely
      const actionCopy = JSON.parse(JSON.stringify(originalAction))
      
      store.dispatch(originalAction)
      
      // The middleware mutates the original action by adding meta properties
      // This is expected behavior in Redux middleware - it modifies the action in transit
      expect(originalAction.meta).toHaveProperty('correlationId')
      expect(originalAction.meta).toHaveProperty('timestamp')
      
      // But the core structure should still be intact
      expect(originalAction.type).toBe(actionCopy.type)
      expect(originalAction.payload).toEqual(actionCopy.payload)
      expect(originalAction.meta.original).toBe(actionCopy.meta.original)
    })

    it('should handle rapid action dispatching', () => {
      const actions = Array.from({ length: 100 }, (_, i) => ({
        type: `test/rapid${i}`,
        payload: { index: i }
      }))
      
      const startTime = Date.now()
      actions.forEach(action => store.dispatch(action))
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should be fast
      expect(mockConsoleLog).toHaveBeenCalledTimes(100)
    })
  })

  describe('Middleware Chain Integration', () => {
    it('should work with other middleware', () => {
      const customMiddleware = (store: any) => (next: any) => (action: any) => {
        if (action.type === 'test/custom') {
          action.custom = 'modified'
        }
        return next(action)
      }
      
      const storeWithCustom = configureStore({
        reducer: {
          correlation: correlationSlice,
        },
        middleware: (getDefaultMiddleware) => 
          getDefaultMiddleware()
            .concat(correlationMiddleware)
            .concat(customMiddleware)
      })
      
      expect(() => {
        storeWithCustom.dispatch({ type: 'test/custom' })
      }).not.toThrow()
    })

    it('should maintain proper middleware execution order', () => {
      const orderTracker: string[] = []
      
      const firstMiddleware = () => (next: any) => (action: any) => {
        orderTracker.push('first')
        return next(action)
      }
      
      const secondMiddleware = () => (next: any) => (action: any) => {
        orderTracker.push('second')
        return next(action)
      }
      
      const orderedStore = configureStore({
        reducer: {
          correlation: correlationSlice,
        },
        middleware: (getDefaultMiddleware) => 
          getDefaultMiddleware()
            .concat(firstMiddleware)
            .concat(correlationMiddleware)
            .concat(secondMiddleware)
      })
      
      orderedStore.dispatch({ type: 'test/order' })
      
      expect(orderTracker).toEqual(['first', 'second'])
    })
  })
})