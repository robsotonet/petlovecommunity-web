'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardActions } from '../ui/Card';
import { correlationService } from '../../lib/services/CorrelationService';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  correlationId: string;
  timestamp: number;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: ErrorInfo, context: ErrorContext) => void;
  enableRetry?: boolean;
  maxRetries?: number;
  showDetails?: boolean;
  variant?: 'default' | 'minimal' | 'detailed';
  className?: string;
}

interface ErrorContext {
  correlationId: string;
  timestamp: number;
  userAgent: string;
  url: string;
  retryCount: number;
}

interface ErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  context: ErrorContext;
  retry: () => void;
  canRetry: boolean;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId?: NodeJS.Timeout;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      correlationId: '',
      timestamp: 0,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const correlationId = correlationService.getCurrentContext()?.correlationId || 'unknown';
    
    return {
      hasError: true,
      error,
      correlationId,
      timestamp: Date.now(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { correlationId, timestamp, retryCount } = this.state;

    // Enhanced error context
    const context: ErrorContext = {
      correlationId,
      timestamp,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      retryCount,
    };

    // Update state with error info
    this.setState({ errorInfo });

    // Log error with enterprise context
    this.logError(error, errorInfo, context);

    // Call custom error handler if provided
    onError?.(error, errorInfo, context);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logError(error: Error, errorInfo: ErrorInfo, context: ErrorContext) {
    const errorData = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      correlationId: context.correlationId,
      timestamp: context.timestamp,
      url: context.url,
      userAgent: context.userAgent,
      retryCount: context.retryCount,
      props: this.props,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 [ErrorBoundary] React Error Caught');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', context);
      console.error('Full Error Data:', errorData);
      console.groupEnd();
    }

    // In production, you would send this to your error monitoring service
    // Example: Sentry, LogRocket, etc.
    if (typeof window !== 'undefined') {
      // Store in localStorage for debugging
      try {
        const errors = JSON.parse(localStorage.getItem('errorBoundary') || '[]');
        errors.push(errorData);
        // Keep only last 10 errors
        if (errors.length > 10) {
          errors.splice(0, errors.length - 10);
        }
        localStorage.setItem('errorBoundary', JSON.stringify(errors));
      } catch (storageError) {
        console.warn('Failed to store error in localStorage:', storageError);
      }
    }
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));

    // Add small delay to prevent immediate re-error
    this.retryTimeoutId = setTimeout(() => {
      this.forceUpdate();
    }, 100);
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    const {
      children,
      fallback: FallbackComponent,
      enableRetry = true,
      maxRetries = 3,
      showDetails = process.env.NODE_ENV === 'development',
      variant = 'default',
    } = this.props;

    const { hasError, error, errorInfo, correlationId, timestamp, retryCount } = this.state;

    if (hasError && error) {
      const context: ErrorContext = {
        correlationId,
        timestamp,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        retryCount,
      };

      const canRetry = enableRetry && retryCount < maxRetries;

      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error}
            errorInfo={errorInfo!}
            context={context}
            retry={this.handleRetry}
            canRetry={canRetry}
            showDetails={showDetails}
          />
        );
      }

      // Default error UI based on variant
      switch (variant) {
        case 'minimal':
          return <MinimalErrorFallback onRetry={canRetry ? this.handleRetry : undefined} />;
        
        case 'detailed':
          return (
            <DetailedErrorFallback
              error={error}
              errorInfo={errorInfo!}
              context={context}
              onRetry={canRetry ? this.handleRetry : undefined}
              onReload={this.handleReload}
            />
          );
        
        default:
          return (
            <DefaultErrorFallback
              error={error}
              context={context}
              onRetry={canRetry ? this.handleRetry : undefined}
              onReload={this.handleReload}
              showDetails={showDetails}
            />
          );
      }
    }

    return children;
  }
}

// Default Error Fallback Component
interface DefaultErrorFallbackProps {
  error: Error;
  context: ErrorContext;
  onRetry?: () => void;
  onReload: () => void;
  showDetails: boolean;
}

function DefaultErrorFallback({
  error,
  context,
  onRetry,
  onReload,
  showDetails,
}: DefaultErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-beige">
      <Card variant="default" className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-error/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <CardTitle level={2} className="text-error">Something went wrong</CardTitle>
              <p className="text-text-secondary text-sm">We&apos;ve encountered an unexpected error</p>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="bg-error/5 border border-error/10 rounded-lg p-4">
              <p className="text-sm text-error font-medium mb-2">Error Details</p>
              <p className="text-sm text-text-secondary">{error.message}</p>
              
              {showDetails && (
                <div className="mt-3 text-xs text-text-tertiary space-y-1">
                  <div>Correlation ID: {context.correlationId}</div>
                  <div>Timestamp: {new Date(context.timestamp).toLocaleString()}</div>
                  {context.retryCount > 0 && <div>Retry Count: {context.retryCount}</div>}
                </div>
              )}
            </div>

            <div className="text-sm text-text-secondary">
              <p>This error has been automatically reported with correlation ID: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs">{context.correlationId}</code></p>
            </div>
          </div>
        </CardContent>

        <CardActions alignment="right">
          <div className="flex space-x-3">
            {onRetry && (
              <Button variant="secondary" onClick={onRetry}>
                Try Again
              </Button>
            )}
            <Button variant="adoption" onClick={onReload}>
              Reload Page
            </Button>
          </div>
        </CardActions>
      </Card>
    </div>
  );
}

// Minimal Error Fallback
interface MinimalErrorFallbackProps {
  onRetry?: () => void;
}

function MinimalErrorFallback({ onRetry }: MinimalErrorFallbackProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-midnight font-medium mb-4">Something went wrong</p>
        {onRetry && (
          <Button variant="adoption" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
}

// Detailed Error Fallback
interface DetailedErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  context: ErrorContext;
  onRetry?: () => void;
  onReload: () => void;
}

function DetailedErrorFallback({
  error,
  errorInfo,
  context,
  onRetry,
  onReload,
}: DetailedErrorFallbackProps) {
  const [showTechnicalDetails, setShowTechnicalDetails] = React.useState(false);

  return (
    <div className="min-h-screen bg-beige p-4">
      <div className="max-w-4xl mx-auto">
        <Card variant="default">
          <CardHeader>
            <CardTitle level={1} className="text-error flex items-center">
              <svg className="w-8 h-8 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Application Error
            </CardTitle>
            <p className="text-text-secondary">A runtime error has occurred in the application.</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Summary */}
            <div className="bg-error/5 border border-error/10 rounded-lg p-4">
              <h3 className="text-error font-semibold mb-2">Error Message</h3>
              <code className="block bg-white p-3 rounded border text-sm overflow-x-auto">
                {error.message}
              </code>
            </div>

            {/* Context Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-teal-bg border border-teal/10 rounded-lg p-4">
                <h3 className="text-teal font-semibold mb-2">Request Context</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Correlation ID:</strong> {context.correlationId}</div>
                  <div><strong>Timestamp:</strong> {new Date(context.timestamp).toLocaleString()}</div>
                  <div><strong>Retry Count:</strong> {context.retryCount}</div>
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-gray-700 font-semibold mb-2">Environment</h3>
                <div className="text-sm space-y-1">
                  <div><strong>URL:</strong> {context.url}</div>
                  <div><strong>Browser:</strong> {context.userAgent}</div>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            <div>
              <button
                onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                className="flex items-center text-text-secondary hover:text-midnight transition-colors"
              >
                <svg
                  className={`w-4 h-4 mr-2 transform transition-transform ${showTechnicalDetails ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Technical Details
              </button>

              {showTechnicalDetails && (
                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Stack Trace</h4>
                    <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs overflow-x-auto">
                      {error.stack}
                    </pre>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Component Stack</h4>
                    <pre className="bg-gray-900 text-blue-400 p-4 rounded text-xs overflow-x-auto">
                      {errorInfo.componentStack}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </CardContent>

          <CardActions alignment="between">
            <div className="text-sm text-text-tertiary">
              Error ID: {context.correlationId}
            </div>
            <div className="flex space-x-3">
              {onRetry && (
                <Button variant="secondary" onClick={onRetry}>
                  Try Again
                </Button>
              )}
              <Button variant="adoption" onClick={onReload}>
                Reload Application
              </Button>
            </div>
          </CardActions>
        </Card>
      </div>
    </div>
  );
}

// Higher-order component for adding error boundaries to components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P) => {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Export error boundary types
export type { ErrorBoundaryProps, ErrorFallbackProps, ErrorContext };