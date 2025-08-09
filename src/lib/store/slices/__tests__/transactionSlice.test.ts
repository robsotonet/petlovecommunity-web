import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import transactionReducer, { 
  startTransaction, 
  updateTransactionStatus 
} from '../transactionSlice'
import { Transaction, TransactionType, TransactionStatus } from '../../../../types/enterprise'

// Mock the correlation utils
vi.mock('../../../utils/correlationUtils', () => ({
  generateTransactionId: vi.fn(() => 'txn_mock_transaction_id'),
}))

import { generateTransactionId } from '../../../utils/correlationUtils'

describe('transactionSlice', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state structure', () => {
      const state = transactionReducer(undefined, { type: '@@INIT' })
      
      expect(state).toEqual({
        activeTransactions: {},
        completedTransactions: []
      })
    })

    it('should start with empty active and completed transactions', () => {
      const state = transactionReducer(undefined, { type: '@@INIT' })
      
      expect(Object.keys(state.activeTransactions)).toHaveLength(0)
      expect(state.completedTransactions).toHaveLength(0)
    })
  })

  describe('startTransaction Action', () => {
    it('should create new transaction with generated ID', () => {
      const initialState = transactionReducer(undefined, { type: '@@INIT' })
      
      const action = startTransaction({
        type: 'pet_favorite',
        correlationId: 'plc_correlation_123',
        idempotencyKey: 'idem_key_456'
      })
      
      const newState = transactionReducer(initialState, action)
      
      expect(newState.activeTransactions['txn_mock_transaction_id']).toMatchObject({
        id: 'txn_mock_transaction_id',
        correlationId: 'plc_correlation_123',
        idempotencyKey: 'idem_key_456',
        type: 'pet_favorite',
        status: 'pending',
        retryCount: 0,
        createdAt: 1234567890000,
        updatedAt: 1234567890000,
      })
    })

    it('should handle all transaction types', () => {
      const transactionTypes: TransactionType[] = [
        'pet_favorite',
        'adoption_application',
        'service_booking',
        'event_rsvp',
        'social_interaction'
      ]
      
      let state = transactionReducer(undefined, { type: '@@INIT' })
      
      transactionTypes.forEach((type, index) => {
        vi.mocked(generateTransactionId).mockReturnValue(`txn_${type}_${index}`)
        
        state = transactionReducer(state, startTransaction({
          type,
          correlationId: `plc_${type}`,
          idempotencyKey: `idem_${type}`
        }))
        
        expect(state.activeTransactions[`txn_${type}_${index}`]).toMatchObject({
          type,
          status: 'pending',
          retryCount: 0,
        })
      })
      
      expect(Object.keys(state.activeTransactions)).toHaveLength(5)
    })

    it('should create multiple active transactions', () => {
      let state = transactionReducer(undefined, { type: '@@INIT' })
      
      // Create first transaction
      vi.mocked(generateTransactionId).mockReturnValue('txn_first')
      
      state = transactionReducer(state, startTransaction({
        type: 'pet_favorite',
        correlationId: 'plc_first',
        idempotencyKey: 'idem_first'
      }))
      
      // Create second transaction
      vi.mocked(generateTransactionId).mockReturnValue('txn_second')
      vi.spyOn(Date, 'now').mockReturnValue(1234567890001)
      
      state = transactionReducer(state, startTransaction({
        type: 'adoption_application',
        correlationId: 'plc_second',
        idempotencyKey: 'idem_second'
      }))
      
      expect(Object.keys(state.activeTransactions)).toHaveLength(2)
      expect(state.activeTransactions['txn_first'].createdAt).toBe(1234567890000)
      expect(state.activeTransactions['txn_second'].createdAt).toBe(1234567890001)
    })

    it('should set default values correctly', () => {
      const initialState = transactionReducer(undefined, { type: '@@INIT' })
      
      const newState = transactionReducer(initialState, startTransaction({
        type: 'social_interaction',
        correlationId: 'plc_test',
        idempotencyKey: 'idem_test'
      }))
      
      const transaction = newState.activeTransactions['txn_mock_transaction_id']
      
      expect(transaction.status).toBe('pending')
      expect(transaction.retryCount).toBe(0)
      expect(transaction.createdAt).toBe(transaction.updatedAt)
    })
  })

  describe('updateTransactionStatus Action', () => {
    let stateWithTransaction: ReturnType<typeof transactionReducer>
    
    beforeEach(() => {
      // Create initial state with one active transaction
      let state = transactionReducer(undefined, { type: '@@INIT' })
      state = transactionReducer(state, startTransaction({
        type: 'pet_favorite',
        correlationId: 'plc_test',
        idempotencyKey: 'idem_test'
      }))
      stateWithTransaction = state
    })

    it('should update transaction status', () => {
      vi.spyOn(Date, 'now').mockReturnValue(1234567890001)
      
      const newState = transactionReducer(stateWithTransaction, updateTransactionStatus({
        transactionId: 'txn_mock_transaction_id',
        status: 'processing'
      }))
      
      const transaction = newState.activeTransactions['txn_mock_transaction_id']
      expect(transaction.status).toBe('processing')
      expect(transaction.updatedAt).toBe(1234567890001)
      expect(transaction.createdAt).toBe(1234567890000) // Should not change
    })

    it('should update retry count when provided', () => {
      const newState = transactionReducer(stateWithTransaction, updateTransactionStatus({
        transactionId: 'txn_mock_transaction_id',
        status: 'processing',
        retryCount: 3
      }))
      
      const transaction = newState.activeTransactions['txn_mock_transaction_id']
      expect(transaction.retryCount).toBe(3)
      expect(transaction.status).toBe('processing')
    })

    it('should not update retry count when not provided', () => {
      const newState = transactionReducer(stateWithTransaction, updateTransactionStatus({
        transactionId: 'txn_mock_transaction_id',
        status: 'processing'
      }))
      
      const transaction = newState.activeTransactions['txn_mock_transaction_id']
      expect(transaction.retryCount).toBe(0) // Should remain original value
    })

    it('should handle non-existent transaction gracefully', () => {
      const newState = transactionReducer(stateWithTransaction, updateTransactionStatus({
        transactionId: 'non_existent_txn',
        status: 'completed'
      }))
      
      // State should remain unchanged
      expect(newState).toEqual(stateWithTransaction)
    })

    describe('Completed Transaction Handling', () => {
      const completedStatuses: TransactionStatus[] = ['completed', 'failed', 'cancelled']
      
      completedStatuses.forEach(status => {
        it(`should move ${status} transaction to completed list`, () => {
          const newState = transactionReducer(stateWithTransaction, updateTransactionStatus({
            transactionId: 'txn_mock_transaction_id',
            status,
            retryCount: 2
          }))
          
          // Should be removed from active transactions
          expect(newState.activeTransactions['txn_mock_transaction_id']).toBeUndefined()
          
          // Should be added to completed transactions
          expect(newState.completedTransactions).toHaveLength(1)
          expect(newState.completedTransactions[0]).toMatchObject({
            id: 'txn_mock_transaction_id',
            status,
            retryCount: 2,
            updatedAt: 1234567890000
          })
        })
      })

      it('should maintain processing transactions in active list', () => {
        const newState = transactionReducer(stateWithTransaction, updateTransactionStatus({
          transactionId: 'txn_mock_transaction_id',
          status: 'processing'
        }))
        
        // Should remain in active transactions
        expect(newState.activeTransactions['txn_mock_transaction_id']).toBeDefined()
        expect(newState.activeTransactions['txn_mock_transaction_id'].status).toBe('processing')
        
        // Should not be in completed transactions
        expect(newState.completedTransactions).toHaveLength(0)
      })

      it('should limit completed transactions to 500', () => {
        // Create state with 500 completed transactions
        let state = transactionReducer(undefined, { type: '@@INIT' })
        
        // Add 500 completed transactions
        for (let i = 0; i < 500; i++) {
          vi.mocked(generateTransactionId).mockReturnValue(`txn_${i}`)
          
          state = transactionReducer(state, startTransaction({
            type: 'pet_favorite',
            correlationId: `plc_${i}`,
            idempotencyKey: `idem_${i}`
          }))
          
          state = transactionReducer(state, updateTransactionStatus({
            transactionId: `txn_${i}`,
            status: 'completed'
          }))
        }
        
        expect(state.completedTransactions).toHaveLength(500)
        
        // Add one more - should still be 500 but oldest should be removed
        vi.mocked(generateTransactionId).mockReturnValue('txn_501')
        
        state = transactionReducer(state, startTransaction({
          type: 'pet_favorite',
          correlationId: 'plc_501',
          idempotencyKey: 'idem_501'
        }))
        
        state = transactionReducer(state, updateTransactionStatus({
          transactionId: 'txn_501',
          status: 'completed'
        }))
        
        expect(state.completedTransactions).toHaveLength(500)
        expect(state.completedTransactions[0].id).toBe('txn_1') // First removed
        expect(state.completedTransactions[499].id).toBe('txn_501') // New added
      })
    })
  })

  describe('Complex Transaction Workflows', () => {
    it('should handle multiple transactions with different statuses', () => {
      let state = transactionReducer(undefined, { type: '@@INIT' })
      
      // Create multiple transactions
      
      // Transaction 1: pending -> processing -> completed
      vi.mocked(generateTransactionId).mockReturnValue('txn_1')
      state = transactionReducer(state, startTransaction({
        type: 'pet_favorite',
        correlationId: 'plc_1',
        idempotencyKey: 'idem_1'
      }))
      
      state = transactionReducer(state, updateTransactionStatus({
        transactionId: 'txn_1',
        status: 'processing'
      }))
      
      state = transactionReducer(state, updateTransactionStatus({
        transactionId: 'txn_1',
        status: 'completed'
      }))
      
      // Transaction 2: pending -> failed
      vi.mocked(generateTransactionId).mockReturnValue('txn_2')
      state = transactionReducer(state, startTransaction({
        type: 'adoption_application',
        correlationId: 'plc_2',
        idempotencyKey: 'idem_2'
      }))
      
      state = transactionReducer(state, updateTransactionStatus({
        transactionId: 'txn_2',
        status: 'failed',
        retryCount: 3
      }))
      
      // Transaction 3: remains active
      vi.mocked(generateTransactionId).mockReturnValue('txn_3')
      state = transactionReducer(state, startTransaction({
        type: 'service_booking',
        correlationId: 'plc_3',
        idempotencyKey: 'idem_3'
      }))
      
      // Verify final state
      expect(Object.keys(state.activeTransactions)).toHaveLength(1)
      expect(state.activeTransactions['txn_3']).toBeDefined()
      
      expect(state.completedTransactions).toHaveLength(2)
      expect(state.completedTransactions.find(t => t.id === 'txn_1')?.status).toBe('completed')
      expect(state.completedTransactions.find(t => t.id === 'txn_2')?.status).toBe('failed')
    })

    it('should handle retry increments correctly', () => {
      let state = transactionReducer(undefined, { type: '@@INIT' })
      
      state = transactionReducer(state, startTransaction({
        type: 'adoption_application',
        correlationId: 'plc_retry',
        idempotencyKey: 'idem_retry'
      }))
      
      // First retry
      state = transactionReducer(state, updateTransactionStatus({
        transactionId: 'txn_mock_transaction_id',
        status: 'processing',
        retryCount: 1
      }))
      
      // Second retry
      state = transactionReducer(state, updateTransactionStatus({
        transactionId: 'txn_mock_transaction_id',
        status: 'processing',
        retryCount: 2
      }))
      
      // Final failure
      state = transactionReducer(state, updateTransactionStatus({
        transactionId: 'txn_mock_transaction_id',
        status: 'failed',
        retryCount: 3
      }))
      
      expect(state.completedTransactions[0]).toMatchObject({
        id: 'txn_mock_transaction_id',
        status: 'failed',
        retryCount: 3
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle updates to completed transactions gracefully', () => {
      let state = transactionReducer(undefined, { type: '@@INIT' })
      
      // Create and complete a transaction
      state = transactionReducer(state, startTransaction({
        type: 'pet_favorite',
        correlationId: 'plc_test',
        idempotencyKey: 'idem_test'
      }))
      
      state = transactionReducer(state, updateTransactionStatus({
        transactionId: 'txn_mock_transaction_id',
        status: 'completed'
      }))
      
      // Try to update the completed transaction
      const newState = transactionReducer(state, updateTransactionStatus({
        transactionId: 'txn_mock_transaction_id',
        status: 'processing'
      }))
      
      // State should remain unchanged
      expect(newState).toEqual(state)
      expect(newState.completedTransactions[0].status).toBe('completed')
    })

    it('should maintain immutability', () => {
      const initialState = transactionReducer(undefined, { type: '@@INIT' })
      
      const stateWithTransaction = transactionReducer(initialState, startTransaction({
        type: 'pet_favorite',
        correlationId: 'plc_immutable',
        idempotencyKey: 'idem_immutable'
      }))
      
      const originalActiveTransactions = stateWithTransaction.activeTransactions
      const originalTransaction = stateWithTransaction.activeTransactions['txn_mock_transaction_id']
      
      const updatedState = transactionReducer(stateWithTransaction, updateTransactionStatus({
        transactionId: 'txn_mock_transaction_id',
        status: 'processing'
      }))
      
      // Original objects should not be modified
      expect(originalTransaction.status).toBe('pending')
      expect(originalActiveTransactions).not.toBe(updatedState.activeTransactions)
      
      // New state should have different references
      expect(updatedState.activeTransactions['txn_mock_transaction_id']).not.toBe(originalTransaction)
    })

    it('should handle undefined and null values gracefully', () => {
      const initialState = transactionReducer(undefined, { type: '@@INIT' })
      
      // Test with malformed payload - Redux Toolkit should handle this
      expect(() => {
        // @ts-ignore - Testing runtime behavior
        transactionReducer(initialState, { type: 'transaction/startTransaction', payload: undefined })
      }).toThrow() // This should throw because payload is required
      
      // Test with null action payload for updateTransactionStatus
      expect(() => {
        // @ts-ignore - Testing runtime behavior  
        transactionReducer(initialState, { type: 'transaction/updateTransactionStatus', payload: null })
      }).toThrow() // This should also throw
    })

    it('should handle large numbers of concurrent transactions', () => {
      let state = transactionReducer(undefined, { type: '@@INIT' })
      
      
      // Create 100 active transactions
      for (let i = 0; i < 100; i++) {
        vi.mocked(generateTransactionId).mockReturnValue(`txn_concurrent_${i}`)
        
        state = transactionReducer(state, startTransaction({
          type: 'pet_favorite',
          correlationId: `plc_${i}`,
          idempotencyKey: `idem_${i}`
        }))
      }
      
      expect(Object.keys(state.activeTransactions)).toHaveLength(100)
      
      // Update all to completed
      for (let i = 0; i < 100; i++) {
        state = transactionReducer(state, updateTransactionStatus({
          transactionId: `txn_concurrent_${i}`,
          status: 'completed'
        }))
      }
      
      expect(Object.keys(state.activeTransactions)).toHaveLength(0)
      expect(state.completedTransactions).toHaveLength(100)
    })

    it('should preserve transaction data integrity', () => {
      let state = transactionReducer(undefined, { type: '@@INIT' })
      
      // Create transaction with specific data
      state = transactionReducer(state, startTransaction({
        type: 'adoption_application',
        correlationId: 'plc_integrity_test',
        idempotencyKey: 'idem_integrity_test'
      }))
      
      const originalTransaction = state.activeTransactions['txn_mock_transaction_id']
      
      // Update status multiple times
      state = transactionReducer(state, updateTransactionStatus({
        transactionId: 'txn_mock_transaction_id',
        status: 'processing',
        retryCount: 1
      }))
      
      state = transactionReducer(state, updateTransactionStatus({
        transactionId: 'txn_mock_transaction_id',
        status: 'completed',
        retryCount: 2
      }))
      
      const completedTransaction = state.completedTransactions[0]
      
      // Verify core data was preserved
      expect(completedTransaction.id).toBe(originalTransaction.id)
      expect(completedTransaction.correlationId).toBe(originalTransaction.correlationId)
      expect(completedTransaction.idempotencyKey).toBe(originalTransaction.idempotencyKey)
      expect(completedTransaction.type).toBe(originalTransaction.type)
      expect(completedTransaction.createdAt).toBe(originalTransaction.createdAt)
      
      // Verify updated data
      expect(completedTransaction.status).toBe('completed')
      expect(completedTransaction.retryCount).toBe(2)
    })
  })
})