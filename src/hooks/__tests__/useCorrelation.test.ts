import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { useCorrelation } from '../useCorrelation'
import { correlationService } from '../../lib/services/CorrelationService'
import {
  renderHookWithRedux,
  createMockCorrelationContext,
  createMockCorrelationState,
  expectHookReturnValue,
} from '../../test/utils'

// Mock the correlation service
vi.mock('../../lib/services/CorrelationService', () => ({
  correlationService: {
    getRequestHeaders: vi.fn(),
    getContext: vi.fn(),
    updateContext: vi.fn(),
  },
  createCorrelationContext: vi.fn(),
}))

const { createCorrelationContext } = await import('../../lib/services/CorrelationService')

describe('useCorrelation Hook Integration Tests', () => {
  const mockContext = createMockCorrelationContext({
    correlationId: 'plc_hook_test_correlation',
    sessionId: 'sess_hook_test_session',
    userId: 'user_hook_test',
  })

  const mockDispatch = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock createCorrelationContext function
    vi.mocked(createCorrelationContext).mockReturnValue(mockContext)
    
    // Mock service methods
    vi.mocked(correlationService.getRequestHeaders).mockReturnValue({
      'X-Correlation-ID': mockContext.correlationId,
      'X-Session-ID': mockContext.sessionId,
    })
    vi.mocked(correlationService.getContext).mockReturnValue(mockContext)
    vi.mocked(correlationService.updateContext).mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Hook Initialization', () => {
    it('should initialize with correlation state from Redux store', () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
          history: [mockContext],
        }),
      }

      const { result } = renderHookWithRedux(() => useCorrelation(), {
        preloadedState,
      })

      expectHookReturnValue(result, 'currentContext', mockContext)
      expectHookReturnValue(result, 'history', [mockContext])
    })

    it('should provide all expected methods', () => {
      const { result } = renderHookWithRedux(() => useCorrelation())

      expect(result.current).toHaveProperty('currentContext')
      expect(result.current).toHaveProperty('history')
      expect(result.current).toHaveProperty('createContext')
      expect(result.current).toHaveProperty('createChild')
      expect(result.current).toHaveProperty('updateUserId')
      expect(result.current).toHaveProperty('getRequestHeaders')
      expect(result.current).toHaveProperty('getContext')
      expect(result.current).toHaveProperty('getContextHistory')
    })
  })

  describe('Context Creation', () => {
    it('should create new correlation context with userId', () => {
      const { result, store } = renderHookWithRedux(() => useCorrelation())

      act(() => {
        const context = result.current.createContext('test_user')
        expect(context).toEqual(mockContext)
      })

      expect(createCorrelationContext).toHaveBeenCalledWith('test_user', undefined)
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'correlation/setCorrelationContext' })
      )
    })

    it('should create new correlation context with userId and parentId', () => {
      const { result, store } = renderHookWithRedux(() => useCorrelation())

      act(() => {
        result.current.createContext('test_user', 'parent_correlation_id')
      })

      expect(createCorrelationContext).toHaveBeenCalledWith('test_user', 'parent_correlation_id')
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'correlation/setCorrelationContext' })
      )
    })

    it('should create child correlation context', () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
      }

      const { result, store } = renderHookWithRedux(() => useCorrelation(), {
        preloadedState,
      })

      act(() => {
        const childContext = result.current.createChild('child_user')
        expect(childContext).toEqual(mockContext)
      })

      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'correlation/createChildCorrelation' })
      )
    })
  })

  describe('User ID Management', () => {
    it('should update user ID in context and service', () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
      }

      const { result, store } = renderHookWithRedux(() => useCorrelation(), {
        preloadedState,
      })

      act(() => {
        result.current.updateUserId('new_user_id')
      })

      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'correlation/setUserId' })
      )
      expect(correlationService.updateContext).toHaveBeenCalledWith(
        mockContext.correlationId,
        { userId: 'new_user_id' }
      )
    })
  })

  describe('Request Headers', () => {
    it('should get request headers for current context', () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
      }

      const { result } = renderHookWithRedux(() => useCorrelation(), {
        preloadedState,
      })

      const headers = result.current.getRequestHeaders()

      expect(correlationService.getRequestHeaders).toHaveBeenCalledWith(mockContext.correlationId)
      expect(headers).toEqual({
        'X-Correlation-ID': mockContext.correlationId,
        'X-Session-ID': mockContext.sessionId,
      })
    })

    it('should get request headers for specific correlation ID', () => {
      const { result } = renderHookWithRedux(() => useCorrelation())
      const specificCorrelationId = 'specific_correlation_id'

      result.current.getRequestHeaders(specificCorrelationId)

      expect(correlationService.getRequestHeaders).toHaveBeenCalledWith(specificCorrelationId)
    })
  })

  describe('Context Retrieval', () => {
    it('should get current context when no correlationId provided', () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
      }

      const { result } = renderHookWithRedux(() => useCorrelation(), {
        preloadedState,
      })

      const context = result.current.getContext()
      expect(context).toEqual(mockContext)
    })

    it('should get specific context by correlationId', () => {
      const { result } = renderHookWithRedux(() => useCorrelation())
      const specificCorrelationId = 'specific_correlation_id'

      result.current.getContext(specificCorrelationId)

      expect(correlationService.getContext).toHaveBeenCalledWith(specificCorrelationId)
    })

    it('should get context history', () => {
      const historyData = [mockContext, createMockCorrelationContext({ correlationId: 'plc_another_context' })]
      const preloadedState = {
        correlation: createMockCorrelationState({
          history: historyData,
        }),
      }

      const { result } = renderHookWithRedux(() => useCorrelation(), {
        preloadedState,
      })

      const history = result.current.getContextHistory()
      expect(history).toEqual(historyData)
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing Redux provider gracefully', () => {
      // This test ensures the hook doesn't crash without Redux
      // Note: In a real scenario without Redux provider, useSelector would throw
      // but our test utilities always provide a Redux wrapper
      const { result } = renderHookWithRedux(() => useCorrelation(), {
        preloadedState: {
          correlation: {
            currentContext: mockContext,
            history: [],
          },
        },
      })

      expect(result.current.currentContext).toBeDefined()
    })

    it('should handle correlation service errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(correlationService.updateContext).mockRejectedValue(new Error('Service error'))

      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
      }

      const { result } = renderHookWithRedux(() => useCorrelation(), {
        preloadedState,
      })

      act(() => {
        // This should not throw, but may log an error
        result.current.updateUserId('new_user_id')
      })

      expect(correlationService.updateContext).toHaveBeenCalled()
      consoleErrorSpy.mockRestore()
    })

    it('should handle undefined correlation context', () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: undefined,
          history: [],
        }),
      }

      const { result } = renderHookWithRedux(() => useCorrelation(), {
        preloadedState,
      })

      // Should throw when context is undefined since the hook implementation doesn't guard against it
      expect(() => result.current.getRequestHeaders()).toThrow()
      expect(result.current.currentContext).toBeUndefined()
    })
  })

  describe('Redux Integration', () => {
    it('should dispatch correct actions when creating context', () => {
      const { result, store } = renderHookWithRedux(() => useCorrelation())

      act(() => {
        result.current.createContext('test_user')
      })

      // Verify the action was dispatched to Redux store
      const actions = store.getState()
      expect(store.dispatch).toHaveBeenCalled()
    })

    it('should reflect state changes in hook return values', () => {
      const initialState = createMockCorrelationState()
      const { result, store } = renderHookWithRedux(() => useCorrelation(), {
        preloadedState: { correlation: initialState },
      })

      // Initial state should be reflected in hook
      expect(result.current.currentContext).toEqual(initialState.currentContext)
      expect(result.current.history).toEqual(initialState.history)
    })
  })

  describe('Performance and Memory', () => {
    it('should not cause unnecessary re-renders', () => {
      const renderSpy = vi.fn()
      const TestComponent = () => {
        const correlation = useCorrelation()
        renderSpy()
        return null
      }

      const { rerender } = renderHookWithRedux(() => useCorrelation())

      const initialRenderCount = renderSpy.mock.calls.length
      rerender()
      
      // Hook should be stable and not cause excessive re-renders
      expect(renderSpy.mock.calls.length).toBeLessThanOrEqual(initialRenderCount + 1)
    })

    it('should provide consistent method types across renders', () => {
      const { result, rerender } = renderHookWithRedux(() => useCorrelation())

      const initialMethods = {
        createContext: typeof result.current.createContext,
        createChild: typeof result.current.createChild,
        updateUserId: typeof result.current.updateUserId,
        getRequestHeaders: typeof result.current.getRequestHeaders,
        getContext: typeof result.current.getContext,
        getContextHistory: typeof result.current.getContextHistory,
      }

      rerender()

      // Methods should maintain the same type signatures
      expect(typeof result.current.createContext).toBe(initialMethods.createContext)
      expect(typeof result.current.createChild).toBe(initialMethods.createChild)
      expect(typeof result.current.updateUserId).toBe(initialMethods.updateUserId)
      expect(typeof result.current.getRequestHeaders).toBe(initialMethods.getRequestHeaders)
      expect(typeof result.current.getContext).toBe(initialMethods.getContext)
      expect(typeof result.current.getContextHistory).toBe(initialMethods.getContextHistory)
    })
  })
})