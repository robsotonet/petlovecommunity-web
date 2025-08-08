import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Transaction, TransactionType, TransactionStatus } from '../../../types/enterprise';
import { generateTransactionId } from '../../utils/transactionUtils';

interface TransactionState {
  activeTransactions: Record<string, Transaction>;
  completedTransactions: Transaction[];
}

const initialState: TransactionState = {
  activeTransactions: {},
  completedTransactions: [],
};

const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    startTransaction: (state, action: PayloadAction<{
      type: TransactionType;
      correlationId: string;
      idempotencyKey: string;
    }>) => {
      const { type, correlationId, idempotencyKey } = action.payload;
      const transaction: Transaction = {
        id: generateTransactionId(),
        correlationId,
        idempotencyKey,
        type,
        status: 'pending',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      state.activeTransactions[transaction.id] = transaction;
    },
    
    updateTransactionStatus: (state, action: PayloadAction<{
      transactionId: string;
      status: TransactionStatus;
      retryCount?: number;
    }>) => {
      const { transactionId, status, retryCount } = action.payload;
      const transaction = state.activeTransactions[transactionId];
      
      if (transaction) {
        transaction.status = status;
        transaction.updatedAt = new Date();
        
        if (retryCount !== undefined) {
          transaction.retryCount = retryCount;
        }
        
        // Move completed/failed/cancelled transactions to history
        if (['completed', 'failed', 'cancelled'].includes(status)) {
          state.completedTransactions.push(transaction);
          delete state.activeTransactions[transactionId];
          
          // Keep only last 500 completed transactions
          if (state.completedTransactions.length > 500) {
            state.completedTransactions = state.completedTransactions.slice(-500);
          }
        }
      }
    },
  },
});

export const { startTransaction, updateTransactionStatus } = transactionSlice.actions;
export default transactionSlice.reducer;