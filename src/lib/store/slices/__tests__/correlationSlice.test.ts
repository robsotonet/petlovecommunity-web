import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import correlationReducer, { 
  setCorrelationContext, 
  createChildCorrelation, 
  setUserId 
} from '../correlationSlice'
import { CorrelationContext } from '../../../../types/enterprise'

// Mock the correlation utils
vi.mock('../../../utils/correlationUtils', () => ({
  generateCorrelationId: vi.fn(() => 'plc_mock_correlation_id'),
  generateSessionId: vi.fn(() => 'sess_mock_session_id'),
}))

describe('correlationSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state structure', () => {
      const state = correlationReducer(undefined, { type: '@@INIT' })
      
      expect(state).toMatchObject({
        currentContext: expect.objectContaining({
          correlationId: expect.any(String),
          sessionId: expect.any(String),
          timestamp: expect.any(Number),
        }),
        history: expect.arrayContaining([
          expect.objectContaining({
            correlationId: expect.any(String),
            sessionId: expect.any(String),
            timestamp: expect.any(Number),
          })
        ])
      })
    })

    it('should initialize with generated correlation and session IDs', () => {
      const state = correlationReducer(undefined, { type: '@@INIT' })
      
      expect(state.currentContext.correlationId).toBe('plc_mock_correlation_id')
      expect(state.currentContext.sessionId).toBe('sess_mock_session_id')
      expect(state.history).toHaveLength(1)
      expect(state.history[0]).toBe(state.currentContext)
    })

    it('should not have userId or parentCorrelationId in initial state', () => {
      const state = correlationReducer(undefined, { type: '@@INIT' })
      
      expect(state.currentContext.userId).toBeUndefined()
      expect(state.currentContext.parentCorrelationId).toBeUndefined()
    })
  })

  describe('setCorrelationContext Action', () => {
    it('should update context with provided values', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      
      const updatedContext: Partial<CorrelationContext> = {
        userId: 'user123',
        correlationId: 'plc_custom_correlation',
      }
      
      const newState = correlationReducer(
        initialState,
        setCorrelationContext(updatedContext)
      )
      
      expect(newState.currentContext).toMatchObject({
        ...initialState.currentContext,
        userId: 'user123',
        correlationId: 'plc_custom_correlation',
        timestamp: 1234567890000, // Updated timestamp
      })
    })

    it('should preserve existing context values when partially updating', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      const originalCorrelationId = initialState.currentContext.correlationId
      const originalSessionId = initialState.currentContext.sessionId
      
      const newState = correlationReducer(
        initialState,
        setCorrelationContext({ userId: 'user456' })
      )
      
      expect(newState.currentContext).toMatchObject({
        correlationId: originalCorrelationId,
        sessionId: originalSessionId,
        userId: 'user456',
        timestamp: 1234567890000,
      })
    })

    it('should add new context to history', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      const initialHistoryLength = initialState.history.length
      
      const newState = correlationReducer(
        initialState,
        setCorrelationContext({ userId: 'user789' })
      )
      
      expect(newState.history).toHaveLength(initialHistoryLength + 1)
      expect(newState.history[newState.history.length - 1]).toBe(newState.currentContext)
    })

    it('should always update timestamp', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      
      // Advance time
      vi.spyOn(Date, 'now').mockReturnValue(1234567890001)
      
      const newState = correlationReducer(
        initialState,
        setCorrelationContext({}) // Empty update
      )
      
      expect(newState.currentContext.timestamp).toBe(1234567890001)
      expect(newState.currentContext.timestamp).not.toBe(initialState.currentContext.timestamp)
    })

    it('should limit history to 100 items', () => {
      // Create initial state with 100 items in history
      let state = correlationReducer(undefined, { type: '@@INIT' })
      
      // Add 99 more contexts to reach the limit (initial state already has 1)
      for (let i = 0; i < 99; i++) {
        vi.spyOn(Date, 'now').mockReturnValue(1234567890000 + i)
        state = correlationReducer(
          state,
          setCorrelationContext({ userId: `user${i}` })
        )
      }
      
      expect(state.history).toHaveLength(100)
      
      // Add one more - should still be 100 but oldest should be removed
      vi.spyOn(Date, 'now').mockReturnValue(1234567890100)
      const newState = correlationReducer(
        state,
        setCorrelationContext({ userId: 'user100' })
      )
      
      expect(newState.history).toHaveLength(100)
      expect(newState.history[0].userId).toBe('user0') // First added item now at start
      expect(newState.history[99].userId).toBe('user100') // New item added
    })
  })

  describe('createChildCorrelation Action', () => {
    it('should create child with new correlation ID', async () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      const parentCorrelationId = initialState.currentContext.correlationId
      
      // Mock new correlation ID for child
      const { generateCorrelationId } = await import('../../../utils/correlationUtils')
      vi.mocked(generateCorrelationId).mockReturnValue('plc_child_correlation_id')
      
      const newState = correlationReducer(
        initialState,
        createChildCorrelation({ userId: 'childUser' })
      )
      
      expect(newState.currentContext.correlationId).toBe('plc_child_correlation_id')
      expect(newState.currentContext.parentCorrelationId).toBe(parentCorrelationId)
    })

    it('should inherit session ID from parent', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      const parentSessionId = initialState.currentContext.sessionId
      
      const newState = correlationReducer(
        initialState,
        createChildCorrelation({ userId: 'childUser' })
      )
      
      expect(newState.currentContext.sessionId).toBe(parentSessionId)
    })

    it('should use provided userId for child', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      
      const newState = correlationReducer(
        initialState,
        createChildCorrelation({ userId: 'specificChildUser' })
      )
      
      expect(newState.currentContext.userId).toBe('specificChildUser')
    })

    it('should inherit parent userId when none provided', () => {
      // First set a userId on parent
      let state = correlationReducer(undefined, { type: '@@INIT' })
      state = correlationReducer(state, setCorrelationContext({ userId: 'parentUser' }))
      
      const newState = correlationReducer(
        state,
        createChildCorrelation({}) // No userId provided
      )
      
      expect(newState.currentContext.userId).toBe('parentUser')
    })

    it('should add child context to history', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      const initialHistoryLength = initialState.history.length
      
      const newState = correlationReducer(
        initialState,
        createChildCorrelation({ userId: 'childUser' })
      )
      
      expect(newState.history).toHaveLength(initialHistoryLength + 1)
      expect(newState.history[newState.history.length - 1]).toBe(newState.currentContext)
    })

    it('should set timestamp for child context', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      
      const newState = correlationReducer(
        initialState,
        createChildCorrelation({ userId: 'childUser' })
      )
      
      expect(newState.currentContext.timestamp).toBe(1234567890000)
    })
  })

  describe('setUserId Action', () => {
    it('should update userId in current context', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      
      const newState = correlationReducer(
        initialState,
        setUserId('newUserId')
      )
      
      expect(newState.currentContext.userId).toBe('newUserId')
    })

    it('should not change other context properties', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      const originalContext = { ...initialState.currentContext }
      
      const newState = correlationReducer(
        initialState,
        setUserId('unchangedUserId')
      )
      
      expect(newState.currentContext.correlationId).toBe(originalContext.correlationId)
      expect(newState.currentContext.sessionId).toBe(originalContext.sessionId)
      expect(newState.currentContext.timestamp).toBe(originalContext.timestamp)
      expect(newState.currentContext.parentCorrelationId).toBe(originalContext.parentCorrelationId)
    })

    it('should not add to history', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      const initialHistoryLength = initialState.history.length
      
      const newState = correlationReducer(
        initialState,
        setUserId('historyTestUser')
      )
      
      expect(newState.history).toHaveLength(initialHistoryLength)
    })

    it('should overwrite existing userId', () => {
      let state = correlationReducer(undefined, { type: '@@INIT' })
      state = correlationReducer(state, setUserId('firstUserId'))
      
      expect(state.currentContext.userId).toBe('firstUserId')
      
      const newState = correlationReducer(state, setUserId('secondUserId'))
      
      expect(newState.currentContext.userId).toBe('secondUserId')
    })
  })

  describe('Action Integration', () => {
    it('should handle complex workflow with multiple actions', async () => {
      // Start with initial state
      let state = correlationReducer(undefined, { type: '@@INIT' })
      
      // Set user context
      vi.spyOn(Date, 'now').mockReturnValue(1234567890001)
      state = correlationReducer(state, setCorrelationContext({ 
        userId: 'parentUser',
        correlationId: 'plc_parent'
      }))
      
      // Create child correlation
      vi.spyOn(Date, 'now').mockReturnValue(1234567890002)
      const { generateCorrelationId } = await import('../../../utils/correlationUtils')
      vi.mocked(generateCorrelationId).mockReturnValue('plc_child')
      
      state = correlationReducer(state, createChildCorrelation({ 
        userId: 'childUser' 
      }))
      
      // Update child's userId
      state = correlationReducer(state, setUserId('updatedChildUser'))
      
      // Verify final state
      expect(state.currentContext).toMatchObject({
        correlationId: 'plc_child',
        parentCorrelationId: 'plc_parent',
        sessionId: 'sess_mock_session_id',
        userId: 'updatedChildUser',
        timestamp: 1234567890002,
      })
      
      // Verify history contains all contexts
      expect(state.history).toHaveLength(3)
      expect(state.history[0].correlationId).toBe('plc_mock_correlation_id') // Initial
      expect(state.history[1].correlationId).toBe('plc_parent') // Parent
      expect(state.history[2].correlationId).toBe('plc_child') // Child
    })

    it('should handle empty and null values appropriately', () => {
      let state = correlationReducer(undefined, { type: '@@INIT' })
      
      // Test empty string userId
      state = correlationReducer(state, setUserId(''))
      expect(state.currentContext.userId).toBe('')
      
      // Test empty object context update
      state = correlationReducer(state, setCorrelationContext({}))
      expect(state.currentContext.userId).toBe('') // Should preserve
      
      // Test child creation with empty userId
      state = correlationReducer(state, createChildCorrelation({ userId: '' }))
      expect(state.currentContext.userId).toBe('')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined action payload gracefully', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      
      // @ts-ignore - Testing runtime behavior
      const newState = correlationReducer(initialState, setCorrelationContext(undefined))
      
      expect(newState.currentContext).toMatchObject({
        ...initialState.currentContext,
        timestamp: 1234567890000, // Updated timestamp
      })
    })

    it('should handle null values in context updates', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      
      // @ts-ignore - Testing runtime behavior
      const newState = correlationReducer(initialState, setCorrelationContext({
        userId: null,
        correlationId: null,
      }))
      
      expect(newState.currentContext.userId).toBeNull()
      expect(newState.currentContext.correlationId).toBeNull()
    })

    it('should handle very large history without performance issues', () => {
      let state = correlationReducer(undefined, { type: '@@INIT' })
      
      // Add 150 contexts quickly
      const startTime = Date.now()
      for (let i = 0; i < 150; i++) {
        state = correlationReducer(state, setCorrelationContext({ 
          userId: `user${i}` 
        }))
      }
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(100) // Should complete quickly
      expect(state.history).toHaveLength(100) // Should be limited to 100
    })

    it('should maintain immutability', () => {
      const initialState = correlationReducer(undefined, { type: '@@INIT' })
      const originalContext = initialState.currentContext
      const originalHistory = initialState.history
      
      const newState = correlationReducer(initialState, setCorrelationContext({ 
        userId: 'immutabilityTest' 
      }))
      
      // Original objects should not be modified
      expect(originalContext.userId).toBeUndefined()
      expect(originalHistory).toHaveLength(1)
      
      // New state should have new references
      expect(newState.currentContext).not.toBe(originalContext)
      expect(newState.history).not.toBe(originalHistory)
    })
  })
})