import React from 'react'
import { configureStore } from '@reduxjs/toolkit'
import { render, renderHook } from '@testing-library/react'
import { Provider } from 'react-redux'
import { vi } from 'vitest'
import { HubConnection } from '@microsoft/signalr'
import correlationSlice from '../lib/store/slices/correlationSlice'
import transactionSlice from '../lib/store/slices/transactionSlice'
import { CorrelationContext, Transaction, TransactionType } from '../types/enterprise'

// Test store configuration
export function createTestStore(preloadedState?: any) {
  return configureStore({
    reducer: {
      correlation: correlationSlice,
      transaction: transactionSlice,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false, // Disable for testing
      }),
  })
}

// React Testing Library helper with Redux
export function renderWithRedux(
  ui: React.ReactElement,
  preloadedState?: any
) {
  const store = createTestStore(preloadedState)
  function Wrapper({ children }: { children?: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }
  return {
    ...render(ui, { wrapper: Wrapper }),
    store,
  }
}

// Mock correlation context factory
export function createMockCorrelationContext(overrides?: Partial<CorrelationContext>): CorrelationContext {
  return {
    correlationId: 'plc_test_correlation_id',
    sessionId: 'sess_test_session_id',
    timestamp: Date.now(),
    ...overrides,
  }
}

// Mock transaction factory
export function createMockTransaction(overrides?: Partial<Transaction>): Transaction {
  return {
    id: 'txn_test_transaction_id',
    correlationId: 'plc_test_correlation_id',
    idempotencyKey: 'idem_test_key',
    type: 'pet_favorite',
    status: 'pending',
    retryCount: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  }
}

// Timer mock utilities
export function mockTimers() {
  vi.useFakeTimers()
  return {
    advanceTime: (ms: number) => {
      // Ensure fake timers are active before advancing
      if (!vi.isFakeTimers()) {
        vi.useFakeTimers()
      }
      vi.advanceTimersByTime(ms)
    },
    runAllTimers: () => {
      // Ensure fake timers are active before running
      if (!vi.isFakeTimers()) {
        vi.useFakeTimers()
      }
      vi.runAllTimers()
    },
    restore: () => vi.useRealTimers(),
  }
}

// Console mock utilities
export function expectConsoleLog(message: string) {
  expect(console.log).toHaveBeenCalledWith(expect.stringContaining(message), expect.anything())
}

export function expectConsoleWarn(message: string) {
  expect(console.warn).toHaveBeenCalledWith(expect.stringContaining(message))
}

// Async test utilities
export function waitFor(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function createAsyncOperation<T>(result: T, delay = 0): () => Promise<T> {
  if (delay === 0) {
    return () => Promise.resolve(result)
  }
  return () => new Promise(resolve => setTimeout(() => resolve(result), delay))
}

export function createFailingAsyncOperation(error: Error, delay = 0): () => Promise<never> {
  if (delay === 0) {
    return () => Promise.reject(error)
  }
  return () => new Promise((_, reject) => setTimeout(() => reject(error), delay))
}

// React Hook Testing Utilities
export function renderHookWithRedux<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options?: {
    initialProps?: TProps
    preloadedState?: any
  }
) {
  const store = createTestStore(options?.preloadedState)
  const originalDispatch = store.dispatch
  const dispatchSpy = vi.fn(originalDispatch)
  store.dispatch = dispatchSpy
  
  function Wrapper({ children }: { children?: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }
  
  const result = renderHook(hook, {
    wrapper: Wrapper,
    initialProps: options?.initialProps,
  })
  
  return {
    ...result,
    store: {
      ...store,
      dispatch: dispatchSpy,
    },
  }
}

// SignalR Mock Utilities
export function createMockSignalRConnection(): Partial<HubConnection> {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    send: vi.fn().mockResolvedValue(undefined),
    invoke: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    onclose: vi.fn(),
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
    state: 'Disconnected',
    connectionId: 'mock-connection-id',
  }
}

export function createMockSignalRConnectionBuilder() {
  return {
    withUrl: vi.fn().mockReturnThis(),
    withAutomaticReconnect: vi.fn().mockReturnThis(),
    configureLogging: vi.fn().mockReturnThis(),
    build: vi.fn().mockReturnValue(createMockSignalRConnection()),
  }
}

// Enhanced mock factories for hooks testing
export function createMockCorrelationState(overrides?: any) {
  const mockContext = createMockCorrelationContext()
  return {
    currentContext: mockContext,
    history: [mockContext], // Match actual slice structure - history contains initial context
    ...overrides,
  }
}

export function createMockTransactionState(overrides?: any) {
  return {
    activeTransactions: {},
    completedTransactions: [],
    ...overrides,
  }
}

// Hook testing assertion helpers
export function expectHookToHaveBeenCalledWith(hookResult: any, method: string, ...args: any[]) {
  expect(hookResult.current[method]).toHaveBeenCalledWith(...args)
}

export function expectHookReturnValue(hookResult: any, property: string, expectedValue: any) {
  expect(hookResult.current[property]).toEqual(expectedValue)
}

// Enterprise test operation factories
export function createTestOperation<T>(result: T): () => Promise<T> {
  return vi.fn().mockResolvedValue(result)
}

export function createFailingTestOperation(error: Error): () => Promise<never> {
  return vi.fn().mockRejectedValue(error)
}

export function createTestTransactionType(): TransactionType {
  return 'pet_favorite'
}

export function createTestOperationParams(overrides?: Record<string, unknown>): Record<string, unknown> {
  return {
    petId: 'pet_12345',
    userId: 'user_67890',
    ...overrides,
  }
}