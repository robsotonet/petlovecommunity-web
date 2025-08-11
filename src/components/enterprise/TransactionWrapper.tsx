'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useTransaction } from '../../hooks/useTransaction';
import { useCorrelationContext } from './CorrelationProvider';
import type { TransactionType, Transaction } from '../../types/enterprise';

interface TransactionState {
  isExecuting: boolean;
  currentTransaction?: Transaction;
  error?: string;
  retryCount: number;
}

interface TransactionWrapperContextType {
  transactionState: TransactionState;
  executeTransaction: <T>(
    type: TransactionType,
    operation: () => Promise<T>,
    operationParams?: Record<string, unknown>
  ) => Promise<T>;
  executeIdempotent: <T>(
    operationName: string,
    operation: () => Promise<T>,
    operationParams?: Record<string, unknown>,
    expirationMinutes?: number
  ) => Promise<T>;
  clearError: () => void;
  resetTransactionState: () => void;
}

const TransactionWrapperContext = createContext<TransactionWrapperContextType | undefined>(
  undefined
);

interface TransactionWrapperProps {
  children: ReactNode;
  maxRetries?: number;
  onTransactionStart?: (type: TransactionType) => void;
  onTransactionComplete?: <T>(type: TransactionType, result: T) => void;
  onTransactionError?: (type: TransactionType, error: Error) => void;
  fallbackComponent?: React.ComponentType<{ error: string; retry: () => void }>;
}

export function TransactionWrapper({
  children,
  maxRetries = 3,
  onTransactionStart,
  onTransactionComplete,
  onTransactionError,
  fallbackComponent: FallbackComponent,
}: TransactionWrapperProps) {
  const transaction = useTransaction();
  const correlation = useCorrelationContext();

  const [transactionState, setTransactionState] = useState<TransactionState>({
    isExecuting: false,
    retryCount: 0,
  });

  const executeTransaction = useCallback(
    async <T,>(
      type: TransactionType,
      operation: () => Promise<T>,
      operationParams: Record<string, unknown> = {}
    ): Promise<T> => {
      setTransactionState(prev => ({
        ...prev,
        isExecuting: true,
        error: undefined,
      }));

      onTransactionStart?.(type);

      try {
        const result = await transaction.executeTransaction(type, operation, operationParams);
        
        setTransactionState(prev => ({
          ...prev,
          isExecuting: false,
          retryCount: 0,
        }));

        onTransactionComplete?.(type, result);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown transaction error';
        
        setTransactionState(prev => ({
          ...prev,
          isExecuting: false,
          error: errorMessage,
          retryCount: prev.retryCount + 1,
        }));

        const transactionError = error instanceof Error ? error : new Error(errorMessage);
        onTransactionError?.(type, transactionError);
        
        throw error;
      }
    },
    [transaction, onTransactionStart, onTransactionComplete, onTransactionError]
  );

  const executeIdempotent = useCallback(
    async <T,>(
      operationName: string,
      operation: () => Promise<T>,
      operationParams: Record<string, unknown> = {},
      expirationMinutes = 60
    ): Promise<T> => {
      setTransactionState(prev => ({
        ...prev,
        isExecuting: true,
        error: undefined,
      }));

      try {
        const result = await transaction.executeIdempotent(
          operationName,
          operation,
          operationParams,
          expirationMinutes
        );
        
        setTransactionState(prev => ({
          ...prev,
          isExecuting: false,
          retryCount: 0,
        }));

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown operation error';
        
        setTransactionState(prev => ({
          ...prev,
          isExecuting: false,
          error: errorMessage,
          retryCount: prev.retryCount + 1,
        }));
        
        throw error;
      }
    },
    [transaction]
  );

  const clearError = useCallback(() => {
    setTransactionState(prev => ({
      ...prev,
      error: undefined,
    }));
  }, []);

  const resetTransactionState = useCallback(() => {
    setTransactionState({
      isExecuting: false,
      retryCount: 0,
    });
  }, []);

  const contextValue: TransactionWrapperContextType = {
    transactionState,
    executeTransaction,
    executeIdempotent,
    clearError,
    resetTransactionState,
  };

  // If there's an error and we have a fallback component, render it
  if (transactionState.error && FallbackComponent && transactionState.retryCount >= maxRetries) {
    const retry = () => {
      resetTransactionState();
    };

    return <FallbackComponent error={transactionState.error} retry={retry} />;
  }

  return (
    <TransactionWrapperContext.Provider value={contextValue}>
      <div 
        data-transaction-context={correlation.currentContext.correlationId}
        data-transaction-executing={transactionState.isExecuting}
        data-transaction-error={!!transactionState.error}
      >
        {children}
      </div>
    </TransactionWrapperContext.Provider>
  );
}

export function useTransactionContext(): TransactionWrapperContextType {
  const context = useContext(TransactionWrapperContext);
  
  if (context === undefined) {
    throw new Error('useTransactionContext must be used within a TransactionWrapper');
  }
  
  return context;
}

// Higher-order component for automatic transaction wrapping
export function withTransaction<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    maxRetries?: number;
    fallbackComponent?: React.ComponentType<{ error: string; retry: () => void }>;
  } = {}
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    return (
      <TransactionWrapper {...options}>
        <Component {...props} />
      </TransactionWrapper>
    );
  };

  WrappedComponent.displayName = `withTransaction(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Loading component for transaction states
export function TransactionLoadingIndicator(): JSX.Element {
  const { transactionState } = useTransactionContext();

  if (!transactionState.isExecuting) {
    return <></>;
  }

  return (
    <div 
      className="fixed top-4 right-4 bg-coral text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center space-x-2"
      data-testid="transaction-loading"
    >
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      <span className="text-sm">Processing...</span>
    </div>
  );
}

// Error display component for transaction errors
export function TransactionErrorBoundary(): JSX.Element | null {
  const { transactionState, clearError } = useTransactionContext();

  if (!transactionState.error) {
    return null;
  }

  return (
    <div 
      className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center space-x-2 max-w-md"
      data-testid="transaction-error"
    >
      <div className="flex-1">
        <div className="text-sm font-medium">Transaction Error</div>
        <div className="text-xs opacity-90">{transactionState.error}</div>
        {transactionState.retryCount > 0 && (
          <div className="text-xs opacity-75">Retry attempt: {transactionState.retryCount}</div>
        )}
      </div>
      <button
        onClick={clearError}
        className="text-white hover:text-gray-200 text-lg font-bold"
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}