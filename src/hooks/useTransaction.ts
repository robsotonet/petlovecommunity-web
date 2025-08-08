'use client';

import { useSelector, useDispatch } from 'react-redux';
import { transactionManager } from '../lib/services/TransactionManager';
import { idempotencyService } from '../lib/services/IdempotencyService';
import { startTransaction } from '../lib/store/slices/transactionSlice';
import { generateIdempotencyKey } from '../lib/utils/correlationUtils';
import type { RootState } from '../lib/store';
import { TransactionType, Transaction } from '../types/enterprise';
import { useCorrelation } from './useCorrelation';

export function useTransaction() {
  const dispatch = useDispatch();
  const transactionState = useSelector((state: RootState) => state.transaction);
  const { currentContext } = useCorrelation();

  const executeTransaction = async <T>(
    type: TransactionType,
    operation: () => Promise<T>,
    operationParams: Record<string, unknown> = {}
  ): Promise<T> => {
    const correlationId = currentContext.correlationId;
    const idempotencyKey = generateIdempotencyKey(type, operationParams);

    // Start transaction in Redux
    dispatch(startTransaction({
      type,
      correlationId,
      idempotencyKey,
    }));

    try {
      // Execute with both transaction management and idempotency
      const result = await idempotencyService.executeIdempotent(
        idempotencyKey,
        correlationId,
        () => transactionManager.executeTransaction(
          type,
          correlationId,
          idempotencyKey,
          operation
        )
      );

      return result;
    } catch (error) {
      console.error(`Transaction failed for type: ${type}`, {
        correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  };

  const executeIdempotent = async <T>(
    operationName: string,
    operation: () => Promise<T>,
    operationParams: Record<string, unknown> = {},
    expirationMinutes: number = 60
  ): Promise<T> => {
    const correlationId = currentContext.correlationId;
    const idempotencyKey = generateIdempotencyKey(operationName, operationParams);

    return idempotencyService.executeIdempotent(
      idempotencyKey,
      correlationId,
      operation,
      expirationMinutes
    );
  };

  const getTransaction = (transactionId: string): Transaction | undefined => {
    return transactionManager.getTransaction(transactionId);
  };

  const getTransactionsByCorrelation = (correlationId?: string): Transaction[] => {
    const id = correlationId || currentContext.correlationId;
    return transactionManager.getTransactionsByCorrelationId(id);
  };

  const cancelTransaction = (transactionId: string): boolean => {
    return transactionManager.cancelTransaction(transactionId);
  };

  const hasIdempotentResult = (operationName: string, operationParams: Record<string, unknown> = {}): boolean => {
    const idempotencyKey = generateIdempotencyKey(operationName, operationParams);
    return idempotencyService.hasRecord(idempotencyKey);
  };

  const invalidateIdempotentResult = (operationName: string, operationParams: Record<string, unknown> = {}): void => {
    const idempotencyKey = generateIdempotencyKey(operationName, operationParams);
    idempotencyService.invalidateRecord(idempotencyKey);
  };

  const getIdempotencyStats = () => {
    return idempotencyService.getStats();
  };

  return {
    activeTransactions: transactionState.activeTransactions,
    completedTransactions: transactionState.completedTransactions,
    executeTransaction,
    executeIdempotent,
    getTransaction,
    getTransactionsByCorrelation,
    cancelTransaction,
    hasIdempotentResult,
    invalidateIdempotentResult,
    getIdempotencyStats,
  };
}