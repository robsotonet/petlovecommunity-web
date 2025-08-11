'use client';

import React, { useState, useCallback, useRef, ReactNode } from 'react';
import { useTransaction } from '../../hooks/useTransaction';
import { useCorrelationContext } from './CorrelationProvider';
import { generateIdempotencyKey } from '../../lib/utils/correlationUtils';

interface IdempotencyGuardProps {
  children: ReactNode;
  operationName: string;
  operationParams?: Record<string, unknown>;
  expirationMinutes?: number;
  preventDoubleClick?: boolean;
  doubleClickDelay?: number;
  showCachedResult?: boolean;
  onCachedResult?: (result: any) => void;
  onNewOperation?: () => void;
  className?: string;
}

interface IdempotencyState {
  isBlocked: boolean;
  lastExecutionTime: number | null;
  cachedResult: any;
  hasCachedResult: boolean;
}

export function IdempotencyGuard({
  children,
  operationName,
  operationParams = {},
  expirationMinutes = 60,
  preventDoubleClick = true,
  doubleClickDelay = 1000,
  showCachedResult = false,
  onCachedResult,
  onNewOperation,
  className = '',
}: IdempotencyGuardProps) {
  const transaction = useTransaction();
  const correlation = useCorrelationContext();
  
  const [state, setState] = useState<IdempotencyState>({
    isBlocked: false,
    lastExecutionTime: null,
    cachedResult: null,
    hasCachedResult: false,
  });

  const blockingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const idempotencyKey = generateIdempotencyKey(operationName, operationParams);

  // Check if there's already a cached result on mount
  React.useEffect(() => {
    const hasCached = transaction.hasIdempotentResult(operationName, operationParams);
    setState(prev => ({ ...prev, hasCachedResult: hasCached }));
  }, [operationName, operationParams, transaction]);

  const executeGuardedOperation = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T | void> => {
      const now = Date.now();

      // Check for double-click prevention
      if (preventDoubleClick && state.lastExecutionTime) {
        const timeSinceLastExecution = now - state.lastExecutionTime;
        if (timeSinceLastExecution < doubleClickDelay) {
          console.warn(`[IdempotencyGuard] Operation blocked due to double-click prevention`, {
            operationName,
            timeSinceLastExecution,
            minDelay: doubleClickDelay,
          });
          return;
        }
      }

      // Block further executions
      setState(prev => ({
        ...prev,
        isBlocked: true,
        lastExecutionTime: now,
      }));

      // Clear any existing timeout
      if (blockingTimeoutRef.current) {
        clearTimeout(blockingTimeoutRef.current);
      }

      try {
        // Execute with idempotency
        const result = await transaction.executeIdempotent(
          operationName,
          operation,
          operationParams,
          expirationMinutes
        );

        setState(prev => ({
          ...prev,
          isBlocked: false,
          cachedResult: result,
          hasCachedResult: true,
        }));

        onNewOperation?.();
        return result;
      } catch (error) {
        setState(prev => ({
          ...prev,
          isBlocked: false,
        }));
        throw error;
      }
    },
    [
      operationName,
      operationParams,
      expirationMinutes,
      preventDoubleClick,
      doubleClickDelay,
      state.lastExecutionTime,
      transaction,
      onNewOperation,
    ]
  );

  const getCachedResult = useCallback(() => {
    if (transaction.hasIdempotentResult(operationName, operationParams)) {
      // Note: The actual cached result retrieval would need to be implemented in the service
      // For now, we return the state cached result
      onCachedResult?.(state.cachedResult);
      return state.cachedResult;
    }
    return null;
  }, [operationName, operationParams, transaction, state.cachedResult, onCachedResult]);

  const invalidateCache = useCallback(() => {
    transaction.invalidateIdempotentResult(operationName, operationParams);
    setState(prev => ({
      ...prev,
      cachedResult: null,
      hasCachedResult: false,
    }));
  }, [operationName, operationParams, transaction]);

  const isBlocked = state.isBlocked;

  return (
    <div
      className={`idempotency-guard ${className}`}
      data-idempotency-key={idempotencyKey}
      data-operation-name={operationName}
      data-blocked={isBlocked}
      data-has-cached-result={state.hasCachedResult}
      data-correlation-id={correlation.currentContext.correlationId}
    >
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // Pass down idempotency-related props to child components
          return React.cloneElement(child, {
            ...child.props,
            disabled: child.props.disabled || isBlocked,
            'data-idempotency-blocked': isBlocked,
            'data-has-cached-result': state.hasCachedResult,
            onIdempotentExecute: executeGuardedOperation,
            getCachedResult,
            invalidateCache,
          } as any);
        }
        return child;
      })}

      {/* Show cached result indicator if enabled */}
      {showCachedResult && state.hasCachedResult && (
        <div className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
          <span className="w-2 h-2 bg-green-400 rounded-full"></span>
          <span>Using cached result</span>
          <button
            onClick={invalidateCache}
            className="text-coral hover:text-coral-dark text-xs underline"
            title="Clear cached result"
          >
            refresh
          </button>
        </div>
      )}

      {/* Show blocking indicator */}
      {isBlocked && (
        <div className="text-xs text-gray-400 mt-1 flex items-center space-x-1">
          <div className="animate-spin w-2 h-2 border border-gray-400 border-t-transparent rounded-full"></div>
          <span>Processing...</span>
        </div>
      )}
    </div>
  );
}

// Higher-order component for automatic idempotency guarding
export function withIdempotency<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    operationName: string;
    getOperationParams?: (props: P) => Record<string, unknown>;
    expirationMinutes?: number;
    preventDoubleClick?: boolean;
    doubleClickDelay?: number;
  }
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    const operationParams = options.getOperationParams?.(props) || {};
    
    return (
      <IdempotencyGuard
        operationName={options.operationName}
        operationParams={operationParams}
        expirationMinutes={options.expirationMinutes}
        preventDoubleClick={options.preventDoubleClick}
        doubleClickDelay={options.doubleClickDelay}
      >
        <Component {...props} />
      </IdempotencyGuard>
    );
  };

  WrappedComponent.displayName = `withIdempotency(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Hook for using idempotency guard functionality within components
export function useIdempotencyGuard(
  operationName: string,
  operationParams: Record<string, unknown> = {},
  expirationMinutes = 60
) {
  const transaction = useTransaction();
  
  const executeIdempotent = useCallback(
    async <T,>(operation: () => Promise<T>): Promise<T> => {
      return transaction.executeIdempotent(
        operationName,
        operation,
        operationParams,
        expirationMinutes
      );
    },
    [operationName, operationParams, expirationMinutes, transaction]
  );

  const hasCachedResult = useCallback(
    () => transaction.hasIdempotentResult(operationName, operationParams),
    [operationName, operationParams, transaction]
  );

  const invalidateCache = useCallback(
    () => transaction.invalidateIdempotentResult(operationName, operationParams),
    [operationName, operationParams, transaction]
  );

  return {
    executeIdempotent,
    hasCachedResult,
    invalidateCache,
  };
}

// Button component with built-in idempotency protection
export function IdempotentButton({
  children,
  onClick,
  operationName,
  operationParams = {},
  expirationMinutes = 60,
  preventDoubleClick = true,
  doubleClickDelay = 1000,
  className = '',
  ...buttonProps
}: {
  children: ReactNode;
  onClick: () => Promise<unknown>;
  operationName: string;
  operationParams?: Record<string, unknown>;
  expirationMinutes?: number;
  preventDoubleClick?: boolean;
  doubleClickDelay?: number;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  
  const [isExecuting, setIsExecuting] = useState(false);
  
  const handleClick = useCallback(async () => {
    if (isExecuting) return;
    
    setIsExecuting(true);
    try {
      await onClick();
    } finally {
      setIsExecuting(false);
    }
  }, [onClick, isExecuting]);

  return (
    <IdempotencyGuard
      operationName={operationName}
      operationParams={operationParams}
      expirationMinutes={expirationMinutes}
      preventDoubleClick={preventDoubleClick}
      doubleClickDelay={doubleClickDelay}
    >
      <button
        {...buttonProps}
        className={`${className} ${isExecuting ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={handleClick}
        disabled={buttonProps.disabled || isExecuting}
      >
        {children}
      </button>
    </IdempotencyGuard>
  );
}