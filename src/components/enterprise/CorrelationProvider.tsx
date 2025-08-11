'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useCorrelation } from '../../hooks/useCorrelation';
import type { CorrelationContext } from '../../types/enterprise';

interface CorrelationProviderContextType {
  currentContext: CorrelationContext;
  createContext: (userId?: string, parentId?: string) => CorrelationContext;
  createChild: (userId?: string) => CorrelationContext;
  updateUserId: (userId: string) => void;
  getRequestHeaders: (correlationId?: string) => Record<string, string>;
  getContext: (correlationId?: string) => CorrelationContext | undefined;
  getContextHistory: () => CorrelationContext[];
}

const CorrelationProviderContext = createContext<CorrelationProviderContextType | undefined>(
  undefined
);

interface CorrelationProviderProps {
  children: ReactNode;
  userId?: string;
  initialCorrelationId?: string;
}

export function CorrelationProvider({
  children,
  userId,
  initialCorrelationId,
}: CorrelationProviderProps) {
  const correlation = useCorrelation();

  // Initialize correlation context on mount
  useEffect(() => {
    if (!correlation.currentContext || initialCorrelationId) {
      correlation.createContext(userId, initialCorrelationId);
    }
  }, []);

  // Update user ID when it changes
  useEffect(() => {
    if (userId && correlation.currentContext && correlation.currentContext.userId !== userId) {
      correlation.updateUserId(userId);
    }
  }, [userId, correlation.currentContext]);

  const contextValue: CorrelationProviderContextType = {
    currentContext: correlation.currentContext,
    createContext: correlation.createContext,
    createChild: correlation.createChild,
    updateUserId: correlation.updateUserId,
    getRequestHeaders: correlation.getRequestHeaders,
    getContext: correlation.getContext,
    getContextHistory: correlation.getContextHistory,
  };

  return (
    <CorrelationProviderContext.Provider value={contextValue}>
      {children}
    </CorrelationProviderContext.Provider>
  );
}

export function useCorrelationContext(): CorrelationProviderContextType {
  const context = useContext(CorrelationProviderContext);
  
  if (context === undefined) {
    throw new Error('useCorrelationContext must be used within a CorrelationProvider');
  }
  
  return context;
}

// Higher-order component for automatically adding correlation context
export function withCorrelation<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P & { correlationId?: string }> {
  const WrappedComponent = (props: P & { correlationId?: string }) => {
    const { correlationId, ...restProps } = props;
    const correlation = useCorrelationContext();
    
    // Create child correlation if correlationId is provided
    useEffect(() => {
      if (correlationId) {
        correlation.createChild();
      }
    }, [correlationId]);

    return <Component {...(restProps as P)} />;
  };

  WrappedComponent.displayName = `withCorrelation(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

// Component for debugging correlation context (development only)
export function CorrelationDebugger(): JSX.Element | null {
  const correlation = useCorrelationContext();

  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div 
      className="fixed bottom-4 left-4 bg-gray-900 text-white text-xs p-2 rounded shadow-lg z-50 max-w-sm"
      data-testid="correlation-debugger"
    >
      <h4 className="font-bold mb-1">Correlation Debug</h4>
      <div>ID: {correlation.currentContext.correlationId}</div>
      <div>Session: {correlation.currentContext.sessionId}</div>
      {correlation.currentContext.userId && (
        <div>User: {correlation.currentContext.userId}</div>
      )}
      {correlation.currentContext.parentCorrelationId && (
        <div>Parent: {correlation.currentContext.parentCorrelationId}</div>
      )}
      <div>Timestamp: {new Date(correlation.currentContext.timestampMs).toLocaleTimeString()}</div>
    </div>
  );
}