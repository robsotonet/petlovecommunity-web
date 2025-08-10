'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { correlationService } from '@/lib/services/CorrelationService';
import { CorrelationContext } from '@/types/enterprise';

interface CorrelationErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, correlationId: string) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, correlationId: string) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number | boolean | null | undefined>;
}

interface CorrelationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  correlationContext: CorrelationContext | null;
  errorId: string | null;
}

export class CorrelationErrorBoundary extends Component<
  CorrelationErrorBoundaryProps,
  CorrelationErrorBoundaryState
> {
  private prevResetKeys: Array<string | number | boolean | null | undefined>;

  constructor(props: CorrelationErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      correlationContext: null,
      errorId: null,
    };

    this.prevResetKeys = props.resetKeys || [];
  }

  static getDerivedStateFromError(error: Error): Partial<CorrelationErrorBoundaryState> {
    // Capture correlation context at the moment of error
    const correlationId = correlationService.getCurrentCorrelationId();
    const correlationContext = correlationService.getContextWithFallback(correlationId);
    
    // Generate unique error ID for tracking
    const errorId = `err_${correlationId}_${Date.now()}`;
    
    return {
      hasError: true,
      error,
      correlationContext,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { correlationContext, errorId } = this.state;
    
    const correlationId = correlationContext?.correlationId || 'unknown';
    
    // Enhanced error logging with correlation context
    console.error(`[CorrelationErrorBoundary] Error caught:`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      errorInfo: {
        componentStack: errorInfo.componentStack,
      },
      correlation: {
        correlationId,
        userId: correlationContext?.userId,
        sessionId: correlationContext?.sessionId,
        timestamp: correlationContext?.timestampMs,
        parentCorrelationId: correlationContext?.parentCorrelationId,
      },
      errorId,
      timestamp: new Date().toISOString(),
    });

    // Store error information in correlation context for debugging
    if (correlationContext) {
      try {
        correlationService.updateContext(correlationId, {
          metadata: {
            ...correlationContext.metadata,
            lastError: {
              errorId,
              message: error.message,
              timestamp: Date.now(),
              componentStack: errorInfo.componentStack,
            },
          },
        });
      } catch (contextError) {
        console.warn('Failed to update correlation context with error info:', contextError);
      }
    }

    // Call custom error handler if provided
    if (onError) {
      try {
        onError(error, errorInfo, correlationId);
      } catch (handlerError) {
        console.error('Error in custom error handler:', handlerError);
      }
    }

    this.setState({
      errorInfo,
    });
  }

  componentDidUpdate(prevProps: CorrelationErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error state if reset keys change
    if (hasError) {
      if (resetOnPropsChange && prevProps !== this.props) {
        this.resetErrorBoundary();
        return;
      }

      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (key, idx) => this.prevResetKeys[idx] !== key
        );

        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
      }
    }
  }

  resetErrorBoundary = () => {
    const { correlationContext } = this.state;
    
    if (correlationContext) {
      // Log error recovery
      console.log(`[CorrelationErrorBoundary] Resetting error boundary for correlation: ${correlationContext.correlationId}`);
      
      // Update correlation context to indicate recovery
      try {
        correlationService.updateContext(correlationContext.correlationId, {
          metadata: {
            ...correlationContext.metadata,
            errorRecovered: {
              timestamp: Date.now(),
              recoveryType: 'boundary_reset',
            },
          },
        });
      } catch (error) {
        console.warn('Failed to update correlation context on recovery:', error);
      }
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      correlationContext: null,
      errorId: null,
    });
  };

  render() {
    const { children, fallback } = this.props;
    const { hasError, error, errorInfo, correlationContext, errorId } = this.state;

    if (hasError && error) {
      const correlationId = correlationContext?.correlationId || 'unknown';

      // Use custom fallback if provided
      if (fallback) {
        try {
          return fallback(error, errorInfo!, correlationId);
        } catch (fallbackError) {
          console.error('Error in custom fallback component:', fallbackError);
          // Fall through to default fallback
        }
      }

      // Default enterprise-styled error fallback
      return (
        <div className="min-h-screen bg-gradient-to-br from-coral-50 to-teal-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-coral-500 to-coral-600 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
                  <p className="text-coral-100 text-sm">We're working to fix this issue</p>
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

              {/* Enterprise Debug Info (development only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Debug Information</h4>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Correlation ID:</span> {correlationId}
                    </p>
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Error ID:</span> {errorId}
                    </p>
                    {correlationContext?.userId && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">User ID:</span> {correlationContext.userId}
                      </p>
                    )}
                    {correlationContext?.sessionId && (
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Session ID:</span> {correlationContext.sessionId}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={this.resetErrorBoundary}
                  className="flex-1 bg-coral-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-coral-600 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Reload Page
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
export function withCorrelationErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<CorrelationErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <CorrelationErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </CorrelationErrorBoundary>
  );
  
  WrappedComponent.displayName = `withCorrelationErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}