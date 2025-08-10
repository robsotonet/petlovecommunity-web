'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { TransactionManager } from '@/lib/services/TransactionManager';
import { correlationService } from '@/lib/services/CorrelationService';
import { Transaction, TransactionType } from '@/types/enterprise';

interface TransactionErrorBoundaryProps {
  children: ReactNode;
  transactionType?: TransactionType;
  fallback?: (error: Error, errorInfo: ErrorInfo, transaction?: Transaction) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, transaction?: Transaction) => void;
  onRetry?: () => void;
  retryable?: boolean;
  maxRetryAttempts?: number;
}

interface TransactionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  activeTransaction: Transaction | null;
  retryCount: number;
  isRetrying: boolean;
}

export class TransactionErrorBoundary extends Component<
  TransactionErrorBoundaryProps,
  TransactionErrorBoundaryState
> {
  private transactionManager: TransactionManager;
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: TransactionErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      activeTransaction: null,
      retryCount: 0,
      isRetrying: false,
    };

    this.transactionManager = TransactionManager.getInstance();
  }

  static getDerivedStateFromError(error: Error): Partial<TransactionErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, transactionType } = this.props;
    const correlationId = correlationService.getCurrentCorrelationId();
    
    // Find active transaction related to this error
    let activeTransaction: Transaction | null = null;
    try {
      const transactions = this.transactionManager.getActiveTransactions();
      activeTransaction = transactions.find(t => 
        t.correlationId === correlationId && 
        (!transactionType || t.type === transactionType)
      ) || null;
    } catch (transactionError) {
      console.warn('Failed to get active transaction:', transactionError);
    }

    // Enhanced error logging with transaction context
    console.error(`[TransactionErrorBoundary] Error caught:`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      transaction: activeTransaction ? {
        id: activeTransaction.id,
        type: activeTransaction.type,
        status: activeTransaction.status,
        correlationId: activeTransaction.correlationId,
        retryCount: activeTransaction.retryCount,
        createdAtMs: activeTransaction.createdAtMs,
      } : null,
      correlationId,
      timestamp: new Date().toISOString(),
    });

    // Mark transaction as failed if it exists
    if (activeTransaction) {
      try {
        this.transactionManager.updateTransactionStatus(activeTransaction.id, 'failed');
      } catch (updateError) {
        console.warn('Failed to update transaction status:', updateError);
      }
    }

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo, activeTransaction || undefined);
      } catch (handlerError) {
        console.error('Error in custom transaction error handler:', handlerError);
      }
    }

    this.setState({
      errorInfo,
      activeTransaction,
    });
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  handleRetry = async () => {
    const { onRetry, maxRetryAttempts = 3 } = this.props;
    const { retryCount, activeTransaction } = this.state;
    
    if (retryCount >= maxRetryAttempts) {
      console.warn(`[TransactionErrorBoundary] Maximum retry attempts reached: ${retryCount}/${maxRetryAttempts}`);
      return;
    }

    this.setState({ isRetrying: true });

    try {
      // Log retry attempt
      console.log(`[TransactionErrorBoundary] Retry attempt ${retryCount + 1}/${maxRetryAttempts}`, {
        transactionId: activeTransaction?.id,
        correlationId: activeTransaction?.correlationId,
      });

      // Update transaction for retry if exists
      if (activeTransaction) {
        try {
          this.transactionManager.updateTransactionStatus(activeTransaction.id, 'retrying');
        } catch (updateError) {
          console.warn('Failed to update transaction status for retry:', updateError);
        }
      }

      // Execute custom retry logic if provided
      if (onRetry) {
        await onRetry();
      }

      // Reset error boundary after successful retry
      setTimeout(() => {
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null,
          activeTransaction: null,
          retryCount: retryCount + 1,
          isRetrying: false,
        });
      }, 500); // Small delay to prevent rapid retries

    } catch (retryError) {
      console.error('Retry failed:', retryError);
      this.setState({
        retryCount: retryCount + 1,
        isRetrying: false,
      });
    }
  };

  resetErrorBoundary = () => {
    const { activeTransaction } = this.state;
    
    if (activeTransaction) {
      console.log(`[TransactionErrorBoundary] Resetting error boundary for transaction: ${activeTransaction.id}`);
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      activeTransaction: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  render() {
    const { children, fallback, retryable = false, maxRetryAttempts = 3 } = this.props;
    const { hasError, error, errorInfo, activeTransaction, retryCount, isRetrying } = this.state;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        try {
          return fallback(error, errorInfo!, activeTransaction || undefined);
        } catch (fallbackError) {
          console.error('Error in custom transaction fallback component:', fallbackError);
          // Fall through to default fallback
        }
      }

      // Default enterprise-styled transaction error fallback
      return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Transaction Failed</h2>
                  <p className="text-teal-100 text-sm">Operation could not be completed</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Error Details</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700 font-mono">{error.message}</p>
                </div>
              </div>

              {/* Transaction Info */}
              {activeTransaction && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Transaction Information</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Type:</span>{' '}
                      <span className="capitalize">{activeTransaction.type.replace('_', ' ')}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Status:</span>{' '}
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        activeTransaction.status === 'failed' 
                          ? 'bg-red-100 text-red-800'
                          : activeTransaction.status === 'retrying'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {activeTransaction.status}
                      </span>
                    </p>
                    {retryCount > 0 && (
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Retry attempts:</span> {retryCount}/{maxRetryAttempts}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Enterprise Debug Info (development only) */}
              {process.env.NODE_ENV === 'development' && activeTransaction && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Debug Information</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Transaction ID:</span> {activeTransaction.id}
                    </p>
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Correlation ID:</span> {activeTransaction.correlationId}
                    </p>
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Idempotency Key:</span> {activeTransaction.idempotencyKey}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                {retryable && retryCount < maxRetryAttempts && (
                  <button
                    onClick={this.handleRetry}
                    disabled={isRetrying}
                    className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isRetrying
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : 'bg-teal-500 text-white hover:bg-teal-600'
                    }`}
                  >
                    {isRetrying ? 'Retrying...' : `Retry (${retryCount}/${maxRetryAttempts})`}
                  </button>
                )}
                <button
                  onClick={this.resetErrorBoundary}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-coral-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-coral-600 transition-colors"
                >
                  Reload
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// Higher-order component for easier usage
export function withTransactionErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<TransactionErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <TransactionErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </TransactionErrorBoundary>
  );
  
  WrappedComponent.displayName = `withTransactionErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}