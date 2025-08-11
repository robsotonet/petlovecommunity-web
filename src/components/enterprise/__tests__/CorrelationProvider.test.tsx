import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { CorrelationProvider, useCorrelationContext, CorrelationDebugger, withCorrelation } from '../CorrelationProvider';
import { Provider } from 'react-redux';
import { store } from '../../../lib/store';

// Test wrapper with required providers
const TestWrapper: React.FC<{ children: React.ReactNode; userId?: string }> = ({ children, userId }) => (
  <Provider store={store}>
    <CorrelationProvider userId={userId}>
      {children}
    </CorrelationProvider>
  </Provider>
);

// Test component to access correlation context
const TestComponent: React.FC = () => {
  const correlation = useCorrelationContext();
  
  return (
    <div>
      <div data-testid="correlation-id">{correlation.currentContext.correlationId}</div>
      <div data-testid="session-id">{correlation.currentContext.sessionId}</div>
      <div data-testid="user-id">{correlation.currentContext.userId || 'none'}</div>
      <div data-testid="timestamp">{correlation.currentContext.timestampMs}</div>
      <button 
        onClick={() => correlation.createChild('test-user')}
        data-testid="create-child"
      >
        Create Child
      </button>
      <button 
        onClick={() => correlation.updateUserId('updated-user')}
        data-testid="update-user"
      >
        Update User
      </button>
    </div>
  );
};

describe('CorrelationProvider', () => {
  beforeEach(() => {
    // Clear any existing correlation state
    jest.clearAllMocks();
  });

  it('provides correlation context to child components', () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    // Should have correlation ID
    const correlationId = screen.getByTestId('correlation-id');
    expect(correlationId.textContent).toMatch(/^[a-f0-9-]{36}$/); // UUID format
    
    // Should have session ID
    const sessionId = screen.getByTestId('session-id');
    expect(sessionId.textContent).toMatch(/^[a-f0-9-]{36}$/);
    
    // Should have timestamp
    const timestamp = screen.getByTestId('timestamp');
    expect(parseInt(timestamp.textContent || '0')).toBeGreaterThan(0);
  });

  it('initializes with provided userId', () => {
    render(
      <TestWrapper userId="test-user-123">
        <TestComponent />
      </TestWrapper>
    );
    
    const userId = screen.getByTestId('user-id');
    expect(userId.textContent).toBe('test-user-123');
  });

  it('creates child correlation contexts', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    const originalCorrelationId = screen.getByTestId('correlation-id').textContent;
    const createChildButton = screen.getByTestId('create-child');
    
    act(() => {
      createChildButton.click();
    });
    
    await waitFor(() => {
      const newCorrelationId = screen.getByTestId('correlation-id').textContent;
      expect(newCorrelationId).not.toBe(originalCorrelationId);
    });
  });

  it('updates user ID', async () => {
    render(
      <TestWrapper>
        <TestComponent />
      </TestWrapper>
    );
    
    const updateUserButton = screen.getByTestId('update-user');
    
    act(() => {
      updateUserButton.click();
    });
    
    await waitFor(() => {
      const userId = screen.getByTestId('user-id');
      expect(userId.textContent).toBe('updated-user');
    });
  });

  it('provides request headers', () => {
    let capturedHeaders: Record<string, string> = {};
    
    const HeaderTestComponent: React.FC = () => {
      const correlation = useCorrelationContext();
      capturedHeaders = correlation.getRequestHeaders();
      return <div>Headers captured</div>;
    };

    render(
      <TestWrapper>
        <HeaderTestComponent />
      </TestWrapper>
    );
    
    expect(capturedHeaders['X-Correlation-ID']).toMatch(/^[a-f0-9-]{36}$/);
    expect(capturedHeaders['X-Session-ID']).toMatch(/^[a-f0-9-]{36}$/);
  });

  it('throws error when used outside provider', () => {
    const TestComponentWithoutProvider = () => {
      try {
        useCorrelationContext();
        return <div>Should not render</div>;
      } catch (error) {
        return <div data-testid="error">{(error as Error).message}</div>;
      }
    };

    render(<TestComponentWithoutProvider />);
    
    const errorMessage = screen.getByTestId('error');
    expect(errorMessage.textContent).toBe('useCorrelationContext must be used within a CorrelationProvider');
  });
});

describe('withCorrelation HOC', () => {
  const BaseComponent: React.FC<{ title: string }> = ({ title }) => (
    <div data-testid="base-component">{title}</div>
  );

  it('wraps component with correlation context', () => {
    const WrappedComponent = withCorrelation(BaseComponent);
    
    render(
      <TestWrapper>
        <WrappedComponent title="Test Component" />
      </TestWrapper>
    );
    
    const component = screen.getByTestId('base-component');
    expect(component).toBeInTheDocument();
    expect(component.textContent).toBe('Test Component');
  });

  it('maintains component displayName', () => {
    BaseComponent.displayName = 'BaseComponent';
    const WrappedComponent = withCorrelation(BaseComponent);
    
    expect(WrappedComponent.displayName).toBe('withCorrelation(BaseComponent)');
  });
});

describe('CorrelationDebugger', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('renders in development mode', () => {
    process.env.NODE_ENV = 'development';
    
    render(
      <TestWrapper userId="debug-user">
        <CorrelationDebugger />
      </TestWrapper>
    );
    
    const debuggerElement = screen.getByTestId('correlation-debugger');
    expect(debuggerElement).toBeInTheDocument();
    expect(debuggerElement).toHaveTextContent('Correlation Debug');
    expect(debuggerElement).toHaveTextContent('debug-user');
  });

  it('does not render in production mode', () => {
    process.env.NODE_ENV = 'production';
    
    render(
      <TestWrapper>
        <CorrelationDebugger />
      </TestWrapper>
    );
    
    const debuggerElement = screen.queryByTestId('correlation-debugger');
    expect(debuggerElement).not.toBeInTheDocument();
  });

  it('displays all correlation context information', () => {
    process.env.NODE_ENV = 'development';
    
    render(
      <TestWrapper userId="test-user">
        <CorrelationDebugger />
      </TestWrapper>
    );
    
    const debuggerElement = screen.getByTestId('correlation-debugger');
    expect(debuggerElement).toHaveTextContent(/ID: [a-f0-9-]{36}/);
    expect(debuggerElement).toHaveTextContent(/Session: [a-f0-9-]{36}/);
    expect(debuggerElement).toHaveTextContent('User: test-user');
    expect(debuggerElement).toHaveTextContent(/Timestamp: \d+:\d+:\d+/);
  });
});