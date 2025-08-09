'use client';

import { useSelector, useDispatch } from 'react-redux';
import { correlationService, createCorrelationContext } from '../lib/services/CorrelationService';
import { setCorrelationContext, createChildCorrelation, setUserId } from '../lib/store/slices/correlationSlice';
import type { RootState } from '../lib/store';
import { CorrelationContext } from '../types/enterprise';

export function useCorrelation() {
  const dispatch = useDispatch();
  const correlationState = useSelector((state: RootState) => state.correlation);

  const currentContext = correlationState.currentContext;

  const createContext = (userId?: string, parentId?: string) => {
    const context = createCorrelationContext(userId, parentId);
    dispatch(setCorrelationContext(context));
    return context;
  };

  const createChild = (userId?: string) => {
    dispatch(createChildCorrelation({ userId }));
    return correlationState.currentContext;
  };

  const updateUserId = (userId: string) => {
    dispatch(setUserId(userId));
    correlationService.updateContext(currentContext.correlationId, { userId });
  };

  const getRequestHeaders = (correlationId?: string) => {
    const id = correlationId || currentContext.correlationId;
    return correlationService.getRequestHeaders(id);
  };

  const getContext = (correlationId?: string): CorrelationContext | undefined => {
    if (!correlationId) {
      return currentContext;
    }
    return correlationService.getContext(correlationId);
  };

  const getContextHistory = () => {
    return correlationState.history;
  };

  return {
    currentContext,
    history: correlationState.history,
    createContext,
    createChild,
    updateUserId,
    getRequestHeaders,
    getContext,
    getContextHistory,
  };
}