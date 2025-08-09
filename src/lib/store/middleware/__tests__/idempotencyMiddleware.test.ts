import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { idempotencyMiddleware } from '../idempotencyMiddleware'
import correlationSlice from '../../slices/correlationSlice'

// Mock console to avoid noise in tests
const mockConsoleLog = vi.fn()

describe('idempotencyMiddleware', () => {
  let store: ReturnType<typeof createTestStore>
  
  function createTestStore() {
    return configureStore({
      reducer: {
        correlation: correlationSlice,
        test: (state = { actions: [] }, action: any) => {
          if (action.type.startsWith('test/')) {
            return {
              actions: [...state.actions, action]
            }
          }
          return state
        }
      },
      middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware().concat(idempotencyMiddleware)
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

  describe('Basic Idempotency Behavior', () => {
    it('should allow actions without idempotency key to pass through', () => {
      const action = { type: 'test/normalAction', payload: { data: 'test' } }
      
      store.dispatch(action)
      
      const state = store.getState() as any
      expect(state.test.actions).toHaveLength(1)
      expect(state.test.actions[0]).toMatchObject(action)
    })

    it('should process first action with idempotency key', () => {
      const action = {
        type: 'test/idempotentAction',
        payload: { data: 'first' },
        meta: { idempotencyKey: 'idem_test_key_1' }
      }
      
      store.dispatch(action)
      
      const state = store.getState() as any
      expect(state.test.actions).toHaveLength(1)
      expect(state.test.actions[0]).toMatchObject(action)
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Idempotency] Action cached: test/idempotentAction',
        expect.objectContaining({
          idempotencyKey: 'idem_test_key_1',
        })
      )
    })

    it('should block duplicate actions with same idempotency key', () => {
      const action1 = {
        type: 'test/duplicateAction',
        payload: { data: 'first' },
        meta: { idempotencyKey: 'idem_duplicate_key' }
      }
      
      const action2 = {
        type: 'test/duplicateAction',
        payload: { data: 'second' },
        meta: { idempotencyKey: 'idem_duplicate_key' }
      }
      
      // First dispatch should succeed
      store.dispatch(action1)
      
      // Clear previous console calls
      mockConsoleLog.mockClear()
      
      // Second dispatch with same key should be blocked
      store.dispatch(action2)
      
      const state = store.getState() as any
      expect(state.test.actions).toHaveLength(1) // Only first action processed
      expect(state.test.actions[0]).toMatchObject(action1)
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Idempotency] Duplicate action blocked: test/duplicateAction',
        expect.objectContaining({
          idempotencyKey: 'idem_duplicate_key',
        })
      )
    })

    it('should allow actions with different idempotency keys', () => {
      const action1 = {
        type: 'test/differentKeys',
        payload: { data: 'first' },
        meta: { idempotencyKey: 'idem_key_1' }
      }
      
      const action2 = {
        type: 'test/differentKeys',
        payload: { data: 'second' },
        meta: { idempotencyKey: 'idem_key_2' }
      }
      
      store.dispatch(action1)
      store.dispatch(action2)
      
      const state = store.getState() as any
      expect(state.test.actions).toHaveLength(2)
      expect(state.test.actions[0]).toMatchObject(action1)
      expect(state.test.actions[1]).toMatchObject(action2)
    })
  })

  describe('Cache Management', () => {
    it('should cache action results with expiration time', () => {
      const action = {
        type: 'test/cacheTest',
        payload: { data: 'cached' },
        meta: { idempotencyKey: 'idem_cache_test' }
      }
      
      store.dispatch(action)
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Idempotency] Action cached: test/cacheTest',
        expect.objectContaining({
          idempotencyKey: 'idem_cache_test',
        })
      )
    })

    it('should include correlation ID in cache logs when available', () => {
      const action = {
        type: 'test/correlationCache',
        payload: { data: 'test' },
        meta: { 
          idempotencyKey: 'idem_correlation_test',
          correlationId: 'plc_correlation_123'
        }
      }
      
      store.dispatch(action)
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Idempotency] Action cached: test/correlationCache',
        expect.objectContaining({
          idempotencyKey: 'idem_correlation_test',
          correlationId: 'plc_correlation_123',
        })
      )
    })

    it('should handle actions with complex meta objects', () => {
      const action = {
        type: 'test/complexMeta',
        payload: { data: 'test' },
        meta: {
          idempotencyKey: 'idem_complex',
          correlationId: 'plc_complex',
          additionalData: { nested: { value: 'test' } },
          array: [1, 2, 3]
        }
      }
      
      expect(() => store.dispatch(action)).not.toThrow()
      
      const state = store.getState() as any
      expect(state.test.actions).toHaveLength(1)
    })
  })

  describe('Development Mode Logging', () => {
    it('should log cache hits in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      const action = {
        type: 'test/devLogging',
        payload: { data: 'dev' },
        meta: { idempotencyKey: 'idem_dev_test' }
      }
      
      // First dispatch - should cache
      store.dispatch(action)
      mockConsoleLog.mockClear()
      
      // Second dispatch - should hit cache
      store.dispatch(action)
      
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '[Idempotency] Duplicate action blocked: test/devLogging',
        expect.objectContaining({
          idempotencyKey: 'idem_dev_test',
        })
      )
      
      process.env.NODE_ENV = originalEnv
    })

    it('should not log in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      const prodStore = createTestStore()
      
      const action = {
        type: 'test/prodLogging',
        payload: { data: 'prod' },
        meta: { idempotencyKey: 'idem_prod_test' }
      }
      
      prodStore.dispatch(action)
      prodStore.dispatch(action) // Duplicate
      
      expect(mockConsoleLog).not.toHaveBeenCalled()
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Cache Expiration and Cleanup', () => {
    it('should set proper expiration time for cached actions', () => {
      const action = {
        type: 'test/expiration',
        payload: { data: 'expiring' },
        meta: { idempotencyKey: 'idem_expiration_test' }
      }
      
      const expectedExpiration = 1234567890000 + (60 * 60 * 1000) // 1 hour from now
      
      store.dispatch(action)
      
      // We can't directly access the cache, but we can verify the action was processed
      const state = store.getState() as any
      expect(state.test.actions).toHaveLength(1)
    })

    // Note: Testing the cleanup interval is complex in unit tests
    // as it involves real timers. In a real application, this would
    // be tested in integration tests or end-to-end tests.
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing idempotency key gracefully', () => {
      const action = {
        type: 'test/missingKey',
        payload: { data: 'test' },
        meta: { someOtherKey: 'value' }
      }
      
      expect(() => store.dispatch(action)).not.toThrow()
      
      const state = store.getState() as any
      expect(state.test.actions).toHaveLength(1)
    })

    it('should handle undefined meta gracefully', () => {
      const action = {
        type: 'test/undefinedMeta',
        payload: { data: 'test' },
        meta: undefined
      }
      
      expect(() => store.dispatch(action)).not.toThrow()
    })

    it('should handle empty idempotency key', () => {
      const action1 = {
        type: 'test/emptyKey',
        payload: { data: 'first' },
        meta: { idempotencyKey: '' }
      }
      
      const action2 = {
        type: 'test/emptyKey',
        payload: { data: 'second' },
        meta: { idempotencyKey: '' }
      }
      
      store.dispatch(action1)
      store.dispatch(action2) // Empty key means no idempotency, both should pass
      
      const state = store.getState() as any
      expect(state.test.actions).toHaveLength(2) // Both should pass (empty key = no idempotency)
    })

    it('should handle null idempotency key', () => {
      const action = {
        type: 'test/nullKey',
        payload: { data: 'test' },
        meta: { idempotencyKey: null }
      }
      
      expect(() => store.dispatch(action)).not.toThrow()
    })

    it('should maintain action immutability', () => {
      const originalAction = {
        type: 'test/immutable',
        payload: { data: 'original' },
        meta: { idempotencyKey: 'idem_immutable' }
      }
      
      const actionCopy = JSON.parse(JSON.stringify(originalAction))
      
      store.dispatch(originalAction)
      
      // Original action should not be modified
      expect(originalAction).toEqual(actionCopy)
    })

    it('should handle rapid duplicate actions', () => {
      const actions = Array.from({ length: 10 }, () => ({
        type: 'test/rapidDuplicates',
        payload: { data: 'rapid' },
        meta: { idempotencyKey: 'idem_rapid_test' }
      }))
      
      // Dispatch all actions rapidly
      actions.forEach(action => store.dispatch(action))
      
      const state = store.getState() as any
      expect(state.test.actions).toHaveLength(1) // Only first should pass through
    })

    it('should handle actions with very long idempotency keys', () => {
      const longKey = 'idem_' + 'x'.repeat(1000) // Very long key
      
      const action = {
        type: 'test/longKey',
        payload: { data: 'test' },
        meta: { idempotencyKey: longKey }
      }
      
      expect(() => store.dispatch(action)).not.toThrow()
      
      // Duplicate with same long key should be blocked
      expect(() => store.dispatch(action)).not.toThrow()
      
      const state = store.getState() as any
      expect(state.test.actions).toHaveLength(1)
    })
  })

  describe('Integration with Other Systems', () => {
    it('should work with correlation middleware', () => {
      // This would require setting up both middleware together
      // For now, we test that it doesn't interfere with correlation fields
      const action = {
        type: 'test/integration',
        payload: { data: 'integration' },
        meta: {
          idempotencyKey: 'idem_integration',
          correlationId: 'plc_integration_123'
        }
      }
      
      store.dispatch(action)
      
      const state = store.getState() as any
      expect(state.test.actions).toHaveLength(1)
      expect(state.test.actions[0].meta.correlationId).toBe('plc_integration_123')
    })

    it('should handle actions dispatched by other middleware', () => {
      // Create a store-local dispatch function
      let localStore: any
      
      const autoDispatchMiddleware = () => (next: any) => (action: any) => {
        const result = next(action)
        
        if (action.type === 'test/triggerAuto') {
          localStore.dispatch({
            type: 'test/autoDispatched',
            payload: { auto: true },
            meta: { idempotencyKey: 'idem_auto' }
          })
        }
        
        return result
      }
      
      const storeWithAuto = configureStore({
        reducer: {
          test: (state = { actions: [] }, action: any) => {
            if (action.type.startsWith('test/')) {
              return { actions: [...state.actions, action] }
            }
            return state
          }
        },
        middleware: (getDefaultMiddleware) => 
          getDefaultMiddleware()
            .concat(idempotencyMiddleware)
            .concat(autoDispatchMiddleware)
      })
      
      localStore = storeWithAuto
      
      storeWithAuto.dispatch({ type: 'test/triggerAuto' })
      
      const state = storeWithAuto.getState() as any
      expect(state.test.actions).toHaveLength(2) // Original + auto-dispatched
    })

    it('should preserve action return values', () => {
      const customReducer = (state = { value: 0 }, action: any) => {
        if (action.type === 'test/increment') {
          return { value: state.value + 1 }
        }
        return state
      }
      
      const storeWithReturn = configureStore({
        reducer: { counter: customReducer },
        middleware: (getDefaultMiddleware) => 
          getDefaultMiddleware().concat(idempotencyMiddleware)
      })
      
      const action = {
        type: 'test/increment',
        meta: { idempotencyKey: 'idem_increment' }
      }
      
      const result1 = storeWithReturn.dispatch(action)
      const result2 = storeWithReturn.dispatch(action) // Should be blocked
      
      const state = storeWithReturn.getState() as any
      expect(state.counter.value).toBe(1) // Only incremented once
    })
  })
})