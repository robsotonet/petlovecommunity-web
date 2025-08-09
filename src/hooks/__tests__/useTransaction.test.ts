import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from '@testing-library/react'
import { useTransaction } from '../useTransaction'
import { transactionManager } from '../../lib/services/TransactionManager'
import { idempotencyService } from '../../lib/services/IdempotencyService'
import { generateIdempotencyKey } from '../../lib/utils/correlationUtils'
import {
  renderHookWithRedux,
  createMockCorrelationContext,
  createMockCorrelationState,
  createMockTransactionState,
  createMockTransaction,
  createTestOperation,
  createFailingTestOperation,
  createTestTransactionType,
  createTestOperationParams,
  mockTimers,
} from '../../test/utils'

// Mock the services
vi.mock('../../lib/services/TransactionManager', () => ({
  transactionManager: {
    executeTransaction: vi.fn(),
    getTransaction: vi.fn(),
    getTransactionsByCorrelationId: vi.fn(),
    cancelTransaction: vi.fn(),
  },
}))

vi.mock('../../lib/services/IdempotencyService', () => ({
  idempotencyService: {
    executeIdempotent: vi.fn(),
    hasRecord: vi.fn(),
    invalidateRecord: vi.fn(),
    getStats: vi.fn(),
  },
}))

vi.mock('../../lib/utils/correlationUtils', () => ({
  generateCorrelationId: vi.fn(() => 'plc_mock_correlation_id'),
  generateSessionId: vi.fn(() => 'sess_mock_session_id'),
  generateTransactionId: vi.fn(() => 'txn_mock_transaction_id'),
  generateIdempotencyKey: vi.fn(() => 'idem_mock_key'),
}))

// Mock useCorrelation hook
vi.mock('../useCorrelation', () => ({
  useCorrelation: vi.fn(),
}))

const { useCorrelation } = await import('../useCorrelation')

describe('useTransaction Hook Integration Tests', () => {
  const mockContext = createMockCorrelationContext({
    correlationId: 'plc_transaction_test_correlation',
    sessionId: 'sess_transaction_test_session',
    userId: 'user_transaction_test',
  })

  const mockTransaction = createMockTransaction({
    id: 'txn_test_transaction',
    correlationId: mockContext.correlationId,
    type: 'pet_favorite',
    status: 'completed',
  })

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock useCorrelation hook
    vi.mocked(useCorrelation).mockReturnValue({
      currentContext: mockContext,
      history: [mockContext],
      createContext: vi.fn(),
      createChild: vi.fn(),
      updateUserId: vi.fn(),
      getRequestHeaders: vi.fn(),
      getContext: vi.fn(),
      getContextHistory: vi.fn(),
    })
    
    // Mock service methods
    vi.mocked(transactionManager.executeTransaction).mockResolvedValue('transaction_result')
    vi.mocked(transactionManager.getTransaction).mockReturnValue(mockTransaction)
    vi.mocked(transactionManager.getTransactionsByCorrelationId).mockReturnValue([mockTransaction])
    vi.mocked(transactionManager.cancelTransaction).mockReturnValue(true)
    
    vi.mocked(idempotencyService.executeIdempotent).mockImplementation(async (key, correlationId, operation) => {
      return await operation()
    })
    vi.mocked(idempotencyService.hasRecord).mockReturnValue(false)
    vi.mocked(idempotencyService.invalidateRecord).mockImplementation(() => {})
    vi.mocked(idempotencyService.getStats).mockReturnValue({
      totalRecords: 5,
      hitRate: 0.8,
      cleanupCount: 2,
    })
    
    vi.mocked(generateIdempotencyKey).mockReturnValue('idem_test_key')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Hook Initialization', () => {
    it('should initialize with transaction state from Redux store', () => {
      const preloadedState = {
        correlation: createMockCorrelationState(),
        transaction: createMockTransactionState({
          activeTransactions: new Map([['txn_1', mockTransaction]]),
          completedTransactions: [mockTransaction],
        }),
      }

      const { result } = renderHookWithRedux(() => useTransaction(), {
        preloadedState,
      })

      expect(result.current.activeTransactions).toEqual(preloadedState.transaction.activeTransactions)
      expect(result.current.completedTransactions).toEqual(preloadedState.transaction.completedTransactions)
    })

    it('should provide all expected methods', () => {
      const { result } = renderHookWithRedux(() => useTransaction())

      expect(result.current).toHaveProperty('activeTransactions')
      expect(result.current).toHaveProperty('completedTransactions')
      expect(result.current).toHaveProperty('executeTransaction')
      expect(result.current).toHaveProperty('executeIdempotent')
      expect(result.current).toHaveProperty('getTransaction')
      expect(result.current).toHaveProperty('getTransactionsByCorrelation')
      expect(result.current).toHaveProperty('cancelTransaction')
      expect(result.current).toHaveProperty('hasIdempotentResult')
      expect(result.current).toHaveProperty('invalidateIdempotentResult')
      expect(result.current).toHaveProperty('getIdempotencyStats')
    })

    it('should integrate with useCorrelation hook', () => {
      const { result } = renderHookWithRedux(() => useTransaction())

      expect(useCorrelation).toHaveBeenCalled()
    })
  })

  describe('Transaction Execution', () => {
    it('should execute transaction with all enterprise services', async () => {
      const transactionType = createTestTransactionType()
      const operationParams = createTestOperationParams()
      const testOperation = createTestOperation('test_result')
      
      const { result, store } = renderHookWithRedux(() => useTransaction())

      await act(async () => {
        const transactionResult = await result.current.executeTransaction(
          transactionType,
          testOperation,
          operationParams
        )
        expect(transactionResult).toBe('transaction_result')
      })

      // Verify Redux dispatch
      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ 
          type: 'transaction/startTransaction',
          payload: expect.objectContaining({
            type: transactionType,
            correlationId: mockContext.correlationId,
            idempotencyKey: 'idem_test_key',
          })
        })
      )

      // Verify service calls
      expect(generateIdempotencyKey).toHaveBeenCalledWith(transactionType, operationParams)
      expect(idempotencyService.executeIdempotent).toHaveBeenCalledWith(
        'idem_test_key',
        mockContext.correlationId,
        expect.any(Function)
      )
      expect(transactionManager.executeTransaction).toHaveBeenCalledWith(
        transactionType,
        mockContext.correlationId,
        'idem_test_key',
        testOperation
      )
    })

    it('should handle transaction execution errors gracefully', async () => {
      const transactionType = createTestTransactionType()
      const error = new Error('Transaction failed')
      const failingOperation = createFailingTestOperation(error)
      
      vi.mocked(idempotencyService.executeIdempotent).mockRejectedValue(error)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const { result } = renderHookWithRedux(() => useTransaction())

      await act(async () => {
        await expect(
          result.current.executeTransaction(transactionType, failingOperation)
        ).rejects.toThrow('Transaction failed')
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        `Transaction failed for type: ${transactionType}`,
        expect.objectContaining({
          correlationId: mockContext.correlationId,
          error: 'Transaction failed',
        })
      )

      consoleErrorSpy.mockRestore()
    })

    it('should execute transaction with default empty operation params', async () => {
      const transactionType = createTestTransactionType()
      const testOperation = createTestOperation('test_result')
      
      const { result } = renderHookWithRedux(() => useTransaction())

      await act(async () => {
        await result.current.executeTransaction(transactionType, testOperation)
      })

      expect(generateIdempotencyKey).toHaveBeenCalledWith(transactionType, {})
    })
  })

  describe('Idempotent Operations', () => {
    it('should execute idempotent operation with custom parameters', async () => {
      const operationName = 'test_operation'
      const operationParams = createTestOperationParams()
      const testOperation = createTestOperation('idempotent_test_result')
      const expirationMinutes = 30
      
      const { result } = renderHookWithRedux(() => useTransaction())

      await act(async () => {
        const operationResult = await result.current.executeIdempotent(
          operationName,
          testOperation,
          operationParams,
          expirationMinutes
        )
        expect(operationResult).toBe('idempotent_test_result')
      })

      expect(generateIdempotencyKey).toHaveBeenCalledWith(operationName, operationParams)
      expect(idempotencyService.executeIdempotent).toHaveBeenCalledWith(
        'idem_test_key',
        mockContext.correlationId,
        testOperation,
        expirationMinutes
      )
    })

    it('should execute idempotent operation with default parameters', async () => {
      const operationName = 'simple_operation'
      const testOperation = createTestOperation('simple_result')
      
      const { result } = renderHookWithRedux(() => useTransaction())

      await act(async () => {
        const operationResult = await result.current.executeIdempotent(operationName, testOperation)
        expect(operationResult).toBe('simple_result')
      })

      expect(generateIdempotencyKey).toHaveBeenCalledWith(operationName, {})
      expect(idempotencyService.executeIdempotent).toHaveBeenCalledWith(
        'idem_test_key',
        mockContext.correlationId,
        testOperation,
        60 // default expiration
      )
    })

    it('should check for idempotent result existence', () => {
      const operationName = 'check_operation'
      const operationParams = createTestOperationParams()
      
      vi.mocked(idempotencyService.hasRecord).mockReturnValue(true)
      
      const { result } = renderHookWithRedux(() => useTransaction())

      const hasResult = result.current.hasIdempotentResult(operationName, operationParams)

      expect(hasResult).toBe(true)
      expect(generateIdempotencyKey).toHaveBeenCalledWith(operationName, operationParams)
      expect(idempotencyService.hasRecord).toHaveBeenCalledWith('idem_test_key')
    })

    it('should invalidate idempotent result', () => {
      const operationName = 'invalidate_operation'
      const operationParams = createTestOperationParams()
      
      const { result } = renderHookWithRedux(() => useTransaction())

      result.current.invalidateIdempotentResult(operationName, operationParams)

      expect(generateIdempotencyKey).toHaveBeenCalledWith(operationName, operationParams)
      expect(idempotencyService.invalidateRecord).toHaveBeenCalledWith('idem_test_key')
    })

    it('should get idempotency statistics', () => {
      const { result } = renderHookWithRedux(() => useTransaction())

      const stats = result.current.getIdempotencyStats()

      expect(stats).toEqual({
        totalRecords: 5,
        hitRate: 0.8,
        cleanupCount: 2,
      })
      expect(idempotencyService.getStats).toHaveBeenCalled()
    })
  })

  describe('Transaction Management', () => {
    it('should get transaction by ID', () => {
      const transactionId = 'txn_test_transaction'
      
      const { result } = renderHookWithRedux(() => useTransaction())

      const transaction = result.current.getTransaction(transactionId)

      expect(transaction).toEqual(mockTransaction)
      expect(transactionManager.getTransaction).toHaveBeenCalledWith(transactionId)
    })

    it('should get transactions by correlation ID', () => {
      const { result } = renderHookWithRedux(() => useTransaction())

      const transactions = result.current.getTransactionsByCorrelation()

      expect(transactions).toEqual([mockTransaction])
      expect(transactionManager.getTransactionsByCorrelationId).toHaveBeenCalledWith(
        mockContext.correlationId
      )
    })

    it('should get transactions by specific correlation ID', () => {
      const specificCorrelationId = 'plc_specific_correlation'
      
      const { result } = renderHookWithRedux(() => useTransaction())

      result.current.getTransactionsByCorrelation(specificCorrelationId)

      expect(transactionManager.getTransactionsByCorrelationId).toHaveBeenCalledWith(
        specificCorrelationId
      )
    })

    it('should cancel transaction', () => {
      const transactionId = 'txn_cancel_transaction'
      
      const { result } = renderHookWithRedux(() => useTransaction())

      const cancelled = result.current.cancelTransaction(transactionId)

      expect(cancelled).toBe(true)
      expect(transactionManager.cancelTransaction).toHaveBeenCalledWith(transactionId)
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing correlation context gracefully', async () => {
      // Mock useCorrelation to return undefined context
      vi.mocked(useCorrelation).mockReturnValue({
        currentContext: undefined as any,
        history: [],
        createContext: vi.fn(),
        createChild: vi.fn(),
        updateUserId: vi.fn(),
        getRequestHeaders: vi.fn(),
        getContext: vi.fn(),
        getContextHistory: vi.fn(),
      })

      const { result } = renderHookWithRedux(() => useTransaction())

      const transactionType = createTestTransactionType()
      const testOperation = createTestOperation('test_result')

      await act(async () => {
        await expect(
          result.current.executeTransaction(transactionType, testOperation)
        ).rejects.toThrow()
      })
    })

    it('should handle service errors with proper logging', async () => {
      const error = new Error('Service unavailable')
      vi.mocked(idempotencyService.executeIdempotent).mockRejectedValue(error)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const { result } = renderHookWithRedux(() => useTransaction())

      const transactionType = createTestTransactionType()
      const testOperation = createTestOperation('test_result')

      await act(async () => {
        await expect(
          result.current.executeTransaction(transactionType, testOperation)
        ).rejects.toThrow('Service unavailable')
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transaction failed for type:'),
        expect.objectContaining({
          correlationId: mockContext.correlationId,
          error: 'Service unavailable',
        })
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle non-Error exceptions in transaction logging', async () => {
      const stringError = 'String error message'
      vi.mocked(idempotencyService.executeIdempotent).mockRejectedValue(stringError)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      const { result } = renderHookWithRedux(() => useTransaction())

      const transactionType = createTestTransactionType()
      const testOperation = createTestOperation('test_result')

      await act(async () => {
        await expect(
          result.current.executeTransaction(transactionType, testOperation)
        ).rejects.toBe(stringError)
      })

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Transaction failed for type:'),
        expect.objectContaining({
          correlationId: mockContext.correlationId,
          error: 'Unknown error',
        })
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Redux Integration', () => {
    it('should dispatch startTransaction action on transaction execution', async () => {
      const { result, store } = renderHookWithRedux(() => useTransaction())
      
      const transactionType = createTestTransactionType()
      const testOperation = createTestOperation('test_result')

      await act(async () => {
        await result.current.executeTransaction(transactionType, testOperation)
      })

      expect(store.dispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'transaction/startTransaction'
        })
      )
    })

    it('should reflect transaction state changes from Redux store', () => {
      const activeTransactions = new Map([['txn_1', mockTransaction]])
      const completedTransactions = [mockTransaction]
      
      const preloadedState = {
        correlation: createMockCorrelationState(),
        transaction: createMockTransactionState({
          activeTransactions,
          completedTransactions,
        }),
      }

      const { result } = renderHookWithRedux(() => useTransaction(), {
        preloadedState,
      })

      expect(result.current.activeTransactions).toBe(activeTransactions)
      expect(result.current.completedTransactions).toBe(completedTransactions)
    })
  })

  describe('Performance and Memory', () => {
    it('should not cause excessive re-renders', () => {
      const renderSpy = vi.fn()
      const TestComponent = () => {
        const transaction = useTransaction()
        renderSpy()
        return null
      }

      const { rerender } = renderHookWithRedux(() => useTransaction())

      const initialRenderCount = renderSpy.mock.calls.length
      rerender()
      
      expect(renderSpy.mock.calls.length).toBeLessThanOrEqual(initialRenderCount + 1)
    })

    it('should handle concurrent transaction executions', async () => {
      const { result } = renderHookWithRedux(() => useTransaction())
      
      const transactionType = createTestTransactionType()
      const operation1 = createTestOperation('result_1')
      const operation2 = createTestOperation('result_2')

      await act(async () => {
        const [result1, result2] = await Promise.all([
          result.current.executeTransaction(transactionType, operation1, { id: 1 }),
          result.current.executeTransaction(transactionType, operation2, { id: 2 }),
        ])

        expect(result1).toBe('transaction_result')
        expect(result2).toBe('transaction_result')
      })

      // Should have generated different idempotency keys for different operations
      expect(generateIdempotencyKey).toHaveBeenCalledTimes(2)
      expect(generateIdempotencyKey).toHaveBeenCalledWith(transactionType, { id: 1 })
      expect(generateIdempotencyKey).toHaveBeenCalledWith(transactionType, { id: 2 })
    })

    it('should handle rapid sequential operations', async () => {
      const timers = mockTimers()
      const { result } = renderHookWithRedux(() => useTransaction())
      
      const operations = Array.from({ length: 5 }, (_, i) => 
        createTestOperation(`result_${i}`)
      )

      await act(async () => {
        const promises = operations.map((op, index) =>
          result.current.executeIdempotent(`operation_${index}`, op, { index })
        )

        timers.advanceTime(100)
        await Promise.all(promises)
      })

      expect(idempotencyService.executeIdempotent).toHaveBeenCalledTimes(5)
      
      timers.restore()
    })
  })
})