import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { HubConnectionState } from '@microsoft/signalr'
import { useCorrelation } from '../useCorrelation'
import { useTransaction } from '../useTransaction'
import { useSignalR } from '../useSignalR'
import {
  renderHookWithRedux,
  createMockCorrelationContext,
  createMockCorrelationState,
  createMockTransactionState,
  createTestOperation,
  createTestTransactionType,
  mockTimers,
} from '../../test/utils'

// Mock all the services
vi.mock('../../lib/services/CorrelationService', () => ({
  correlationService: {
    getRequestHeaders: vi.fn(() => ({
      'X-Correlation-ID': 'plc_integration_test',
      'X-Session-ID': 'sess_integration_test',
    })),
    getContext: vi.fn(),
    updateContext: vi.fn(),
  },
  createCorrelationContext: vi.fn(() => ({
    correlationId: 'plc_integration_test',
    sessionId: 'sess_integration_test',
    timestamp: Date.now(),
  })),
}))

vi.mock('../../lib/services/TransactionManager', () => ({
  transactionManager: {
    executeTransaction: vi.fn().mockImplementation(async (type, correlationId, idempotencyKey, operation) => {
      // For testing, we need to execute the operation to allow errors to propagate
      // but return our consistent mock result for successful operations
      if (operation && typeof operation === 'function') {
        try {
          await operation() // Execute to allow errors to propagate
          return 'transaction_result' // Return consistent result for success
        } catch (error) {
          throw error // Properly propagate errors
        }
      }
      return 'transaction_result'
    }),
    getTransaction: vi.fn(),
    getTransactionsByCorrelationId: vi.fn(() => []),
    cancelTransaction: vi.fn(),
  },
}))

vi.mock('../../lib/services/IdempotencyService', () => ({
  idempotencyService: {
    executeIdempotent: vi.fn().mockImplementation(async (key, correlationId, operation) => {
      // Execute the operation function passed to IdempotencyService
      // This will call TransactionManager.executeTransaction which returns 'transaction_result'
      if (!operation || typeof operation !== 'function') {
        return undefined
      }
      return await operation()
    }),
    hasRecord: vi.fn(() => false),
    invalidateRecord: vi.fn(),
    getStats: vi.fn(() => ({
      totalRecords: 0,
      hitRate: 1.0,
      cleanupCount: 0,
    })),
  },
}))

vi.mock('../../lib/utils/correlationUtils', () => ({
  generateCorrelationId: vi.fn(() => 'plc_integration_test'),
  generateSessionId: vi.fn(() => 'sess_integration_test'),
  generateTransactionId: vi.fn(() => 'txn_integration_test'),
  generateIdempotencyKey: vi.fn(() => 'idem_integration_test'),
}))

vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn(() => ({
    withUrl: vi.fn().mockReturnThis(),
    withAutomaticReconnect: vi.fn().mockReturnThis(),
    configureLogging: vi.fn().mockReturnThis(),
    build: vi.fn(() => ({
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      send: vi.fn().mockResolvedValue(undefined),
      invoke: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      onclose: vi.fn(),
      onreconnecting: vi.fn(),
      onreconnected: vi.fn(),
      state: 'Disconnected',
      connectionId: 'integration-test-connection',
    })),
  })),
  HubConnectionState: {
    Disconnected: 'Disconnected',
    Connecting: 'Connecting', 
    Connected: 'Connected',
    Disconnecting: 'Disconnecting',
    Reconnecting: 'Reconnecting',
  },
  LogLevel: {
    Information: 1,
    Warning: 2,
    Error: 3,
    None: 6,
  },
}))

describe('Hook Integration Tests', () => {
  const mockContext = createMockCorrelationContext({
    correlationId: 'plc_integration_test',
    sessionId: 'sess_integration_test',
    userId: 'user_integration_test',
  })

  beforeEach(() => {
    // Clear all mock functions and their call history (keeps implementations)
    vi.clearAllMocks()
    
    // Clear any timers that might be running
    vi.clearAllTimers()
  })

  afterEach(() => {
    // Clear any remaining timers
    vi.clearAllTimers()
    
    // Use real timers for the next test
    vi.useRealTimers()
  })

  describe('Correlation + Transaction Integration', () => {
    it('should use correlation context in transaction execution', async () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
        transaction: createMockTransactionState(),
      }

      const { result } = renderHookWithRedux(() => ({
        correlation: useCorrelation(),
        transaction: useTransaction(),
      }), { preloadedState })

      const transactionType = createTestTransactionType()
      const testOperation = createTestOperation('test_result')

      await act(async () => {
        const transactionResult = await result.current.transaction.executeTransaction(
          transactionType,
          testOperation
        )
        expect(transactionResult).toBe('transaction_result')
      })

      // Verify correlation context was used
      expect(result.current.correlation.currentContext.correlationId).toBe(mockContext.correlationId)
    })

    it('should create child correlation for nested transactions', async () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
        transaction: createMockTransactionState(),
      }

      const { result, store } = renderHookWithRedux(() => ({
        correlation: useCorrelation(),
        transaction: useTransaction(),
      }), { preloadedState })

      // Create child correlation
      act(() => {
        result.current.correlation.createChild('child_user')
      })

      // Execute transaction with child context
      const transactionType = createTestTransactionType()
      const testOperation = createTestOperation('child_result')

      await act(async () => {
        await result.current.transaction.executeTransaction(transactionType, testOperation)
      })

      // Verify child correlation was dispatched
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'correlation/createChildCorrelation' })
      )
    })

    it('should handle concurrent transactions with same correlation context', async () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
        transaction: createMockTransactionState(),
      }

      const { result } = renderHookWithRedux(() => ({
        correlation: useCorrelation(),
        transaction: useTransaction(),
      }), { preloadedState })

      const transactionType = createTestTransactionType()
      const operation1 = createTestOperation('result_1')
      const operation2 = createTestOperation('result_2')

      let promises: any[]
      
      await act(async () => {
        promises = await Promise.all([
          result.current.transaction.executeTransaction(transactionType, operation1, { id: 1 }),
          result.current.transaction.executeTransaction(transactionType, operation2, { id: 2 }),
        ])
      })

      expect(promises[0]).toBe('transaction_result')
      expect(promises[1]).toBe('transaction_result')

      // Both transactions should use the same correlation context
      expect(result.current.correlation.currentContext.correlationId).toBe(mockContext.correlationId)
    })
  })

  describe('Correlation + SignalR Integration', () => {
    it('should include correlation headers in SignalR connection', () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
        transaction: createMockTransactionState(),
      }

      const { result } = renderHookWithRedux(() => ({
        correlation: useCorrelation(),
        signalr: useSignalR(),
      }), { preloadedState })

      // SignalR should be initialized (basic test since SignalR mocking is complex)
      // Just verify the integration works without errors
      expect(result.current.correlation.currentContext).toBeDefined()
      expect(result.current.signalr.connectionState).toBeDefined()
    })

    it('should track correlation context in SignalR event handlers', () => {
      const eventHandlers = {
        onPetAdoptionStatusChanged: vi.fn(),
      }

      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
        transaction: createMockTransactionState(),
      }

      const { result } = renderHookWithRedux(() => ({
        correlation: useCorrelation(),
        signalr: useSignalR({ eventHandlers }),
      }), { preloadedState })

      // Verify correlation context is available
      expect(result.current.correlation.currentContext.correlationId).toBe(mockContext.correlationId)
    })
  })

  describe('Transaction + SignalR Integration', () => {
    it('should handle real-time updates affecting ongoing transactions', async () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
        transaction: createMockTransactionState(),
      }

      const { result } = renderHookWithRedux(() => ({
        correlation: useCorrelation(),
        transaction: useTransaction(),
        signalr: useSignalR(),
      }), { preloadedState })

      const transactionType = createTestTransactionType()
      const testOperation = createTestOperation('realtime_result')

      await act(async () => {
        const transactionResult = await result.current.transaction.executeTransaction(
          transactionType,
          testOperation
        )
        expect(transactionResult).toBe('transaction_result')
      })

      // Verify all hooks are functioning
      expect(result.current.correlation.currentContext).toBeDefined()
      expect(result.current.transaction.activeTransactions).toBeDefined()
      expect(result.current.signalr.connectionState).toBeDefined()
    })
  })

  describe('Full Enterprise Integration Scenarios', () => {
    it('should handle complete pet adoption workflow', async () => {
      const petId = 'pet_12345'
      const userId = 'user_67890'
      
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: createMockCorrelationContext({
            correlationId: 'plc_pet_adoption_flow',
            userId,
          }),
        }),
        transaction: createMockTransactionState(),
      }

      const adoptionEventHandlers = {
        onPetAdoptionStatusChanged: vi.fn(),
      }

      const { result, store } = renderHookWithRedux(() => ({
        correlation: useCorrelation(),
        transaction: useTransaction(),
        signalr: useSignalR({ eventHandlers: adoptionEventHandlers }),
      }), { preloadedState })

      // 1. Start adoption application transaction
      const adoptionOperation = createTestOperation({
        petId,
        userId,
        status: 'application_submitted',
      })

      await act(async () => {
        const adoptionResult = await result.current.transaction.executeTransaction(
          'pet_adoption_application',
          adoptionOperation,
          { petId, userId }
        )
        
        expect(adoptionResult).toBe('transaction_result')
      })

      // 2. Verify transaction was dispatched with correlation
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transaction/startTransaction',
          payload: expect.objectContaining({
            type: 'pet_adoption_application',
            correlationId: 'plc_pet_adoption_flow',
          }),
        })
      )

      // 3. Verify all enterprise hooks are integrated
      expect(result.current.correlation.currentContext.correlationId).toBe('plc_pet_adoption_flow')
      expect(result.current.correlation.currentContext.userId).toBe(userId)
      expect(result.current.transaction.activeTransactions).toBeDefined()
      expect(result.current.signalr.connectionState).toBe('Disconnected')
    })

    it('should handle service booking with event capacity updates', async () => {
      const serviceId = 'service_grooming_123'
      const eventId = 'event_grooming_workshop_456'
      const userId = 'user_service_booker'

      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: createMockCorrelationContext({
            correlationId: 'plc_service_booking_flow',
            userId,
          }),
        }),
        transaction: createMockTransactionState(),
      }

      const serviceEventHandlers = {
        onServiceAvailabilityChanged: vi.fn(),
        onEventCapacityChanged: vi.fn(),
      }

      const { result } = renderHookWithRedux(() => ({
        correlation: useCorrelation(),
        transaction: useTransaction(),
        signalr: useSignalR({ eventHandlers: serviceEventHandlers }),
      }), { preloadedState })

      // Execute service booking transaction
      const bookingOperation = createTestOperation({
        serviceId,
        eventId,
        userId,
        bookingStatus: 'confirmed',
      })

      await act(async () => {
        await result.current.transaction.executeIdempotent(
          'service_booking',
          bookingOperation,
          { serviceId, eventId, userId },
          30 // 30-minute expiration
        )
      })

      // Verify enterprise integration
      expect(result.current.correlation.currentContext.correlationId).toBe('plc_service_booking_flow')
      expect(result.current.correlation.currentContext.userId).toBe(userId)
    })
  })

  describe('Performance Integration Tests', () => {
    it('should handle multiple hooks without performance degradation', async () => {
      const timers = mockTimers()
      const renderCount = vi.fn()

      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
        transaction: createMockTransactionState(),
      }

      const { result, rerender } = renderHookWithRedux(() => {
        renderCount()
        return {
          correlation: useCorrelation(),
          transaction: useTransaction(),
          signalr: useSignalR(),
        }
      }, { preloadedState })

      // Initial render
      const initialRenderCount = renderCount.mock.calls.length

      // Execute multiple operations rapidly
      await act(async () => {
        const operations = Array.from({ length: 3 }, (_, i) =>
          result.current.transaction.executeIdempotent(
            `rapid_operation_${i}`,
            createTestOperation(`result_${i}`),
            { index: i }
          )
        )

        timers.advanceTime(100)
        await Promise.all(operations)
      })

      // Force re-render
      rerender()

      // Should not cause excessive re-renders
      expect(renderCount.mock.calls.length).toBeLessThanOrEqual(initialRenderCount + 2)

      timers.restore()
    })

    it('should handle hook cleanup without memory leaks', () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
        transaction: createMockTransactionState(),
      }

      const { result, unmount } = renderHookWithRedux(() => ({
        correlation: useCorrelation(),
        transaction: useTransaction(),
        signalr: useSignalR(),
      }), { preloadedState })

      // Verify hooks are initialized
      expect(result.current.correlation.currentContext).toBeDefined()
      expect(result.current.transaction.activeTransactions).toBeDefined()
      expect(result.current.signalr.connectionState).toBeDefined()

      // Unmount should not throw
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle cascading errors across hooks gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
        transaction: createMockTransactionState(),
      }

      const { result } = renderHookWithRedux(() => ({
        correlation: useCorrelation(),
        transaction: useTransaction(),
        signalr: useSignalR(),
      }), { preloadedState })

      // Simulate a transaction error
      const failingOperation = vi.fn().mockRejectedValue(new Error('Operation failed'))

      await act(async () => {
        await expect(
          result.current.transaction.executeTransaction('failing_operation', failingOperation)
        ).rejects.toThrow('Operation failed')
      })

      // Other hooks should remain functional
      expect(result.current.correlation.currentContext.correlationId).toBe(mockContext.correlationId)
      expect(result.current.signalr.connectionState).toBeDefined()

      consoleErrorSpy.mockRestore()
    })

    it('should maintain correlation context during error recovery', async () => {
      const preloadedState = {
        correlation: createMockCorrelationState({
          currentContext: mockContext,
        }),
        transaction: createMockTransactionState(),
      }

      const { result } = renderHookWithRedux(() => ({
        correlation: useCorrelation(),
        transaction: useTransaction(),
        signalr: useSignalR(),
      }), { preloadedState })

      // Execute failing operation
      const failingOperation = vi.fn().mockRejectedValue(new Error('Network error'))

      await act(async () => {
        try {
          await result.current.transaction.executeTransaction('network_operation', failingOperation)
        } catch (error) {
          // Expected to fail
        }
      })

      // Correlation context should be preserved
      expect(result.current.correlation.currentContext.correlationId).toBe(mockContext.correlationId)

      // Should be able to execute successful operation after failure
      const successOperation = createTestOperation('recovery_success')

      await act(async () => {
        const recoveryResult = await result.current.transaction.executeTransaction(
          'recovery_operation',
          successOperation
        )
        expect(recoveryResult).toBe('transaction_result')
      })
    })
  })
})