import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Button, AdoptionButton, ServiceButton, ButtonGroup } from '../Button';
import { CorrelationProvider } from '../../enterprise/CorrelationProvider';
import { TransactionWrapper } from '../../enterprise/TransactionWrapper';
import { Provider } from 'react-redux';
import { store } from '../../../lib/store';

// Test wrapper with required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>
    <CorrelationProvider>
      <TransactionWrapper>
        {children}
      </TransactionWrapper>
    </CorrelationProvider>
  </Provider>
);

describe('Button Component', () => {
  it('renders with default props', () => {
    render(
      <TestWrapper>
        <Button>Click me</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn-secondary'); // default variant
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(
      <TestWrapper>
        <Button variant="adoption">Adopt</Button>
      </TestWrapper>
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('btn-adoption');

    rerender(
      <TestWrapper>
        <Button variant="service">Book Service</Button>
      </TestWrapper>
    );
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('btn-service');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(
      <TestWrapper>
        <Button size="sm">Small</Button>
      </TestWrapper>
    );
    
    let button = screen.getByRole('button');
    expect(button).toHaveClass('px-3 py-2 text-sm');

    rerender(
      <TestWrapper>
        <Button size="lg">Large</Button>
      </TestWrapper>
    );
    
    button = screen.getByRole('button');
    expect(button).toHaveClass('px-8 py-4 text-lg');
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    
    render(
      <TestWrapper>
        <Button onClick={handleClick}>Click me</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state correctly', () => {
    render(
      <TestWrapper>
        <Button loading>Loading</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-loading', 'true');
    expect(button).toBeDisabled();
    
    // Check for loading spinner
    const spinner = button.querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('handles disabled state', () => {
    const handleClick = jest.fn();
    
    render(
      <TestWrapper>
        <Button disabled onClick={handleClick}>Disabled</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    
    fireEvent.click(button);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('displays icons correctly', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    
    const { rerender } = render(
      <TestWrapper>
        <Button icon={<TestIcon />} iconPosition="left">With Icon</Button>
      </TestWrapper>
    );
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();

    rerender(
      <TestWrapper>
        <Button icon={<TestIcon />} iconPosition="right">With Icon</Button>
      </TestWrapper>
    );
    
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('handles full width prop', () => {
    render(
      <TestWrapper>
        <Button fullWidth>Full Width</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('w-full');
  });

  it('includes correlation data attributes', () => {
    render(
      <TestWrapper>
        <Button>Test</Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('data-correlation-id');
    expect(button).toHaveAttribute('data-button-variant');
    expect(button).toHaveAttribute('data-button-size');
  });
});

describe('Specialized Button Components', () => {
  it('renders AdoptionButton with correct variant', () => {
    render(
      <TestWrapper>
        <AdoptionButton>Adopt Pet</AdoptionButton>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-adoption');
    expect(button).toHaveAttribute('data-button-variant', 'adoption');
  });

  it('renders ServiceButton with correct variant', () => {
    render(
      <TestWrapper>
        <ServiceButton>Book Service</ServiceButton>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('btn-service');
    expect(button).toHaveAttribute('data-button-variant', 'service');
  });
});

describe('ButtonGroup Component', () => {
  it('renders children in horizontal layout by default', () => {
    render(
      <TestWrapper>
        <ButtonGroup>
          <Button>First</Button>
          <Button>Second</Button>
        </ButtonGroup>
      </TestWrapper>
    );
    
    const group = screen.getByRole('button', { name: 'First' }).parentElement;
    expect(group).toHaveClass('flex', 'flex-row');
  });

  it('renders children in vertical layout', () => {
    render(
      <TestWrapper>
        <ButtonGroup orientation="vertical">
          <Button>First</Button>
          <Button>Second</Button>
        </ButtonGroup>
      </TestWrapper>
    );
    
    const group = screen.getByRole('button', { name: 'First' }).parentElement;
    expect(group).toHaveClass('flex', 'flex-col');
  });

  it('applies spacing correctly', () => {
    const { rerender } = render(
      <TestWrapper>
        <ButtonGroup spacing="tight">
          <Button>First</Button>
          <Button>Second</Button>
        </ButtonGroup>
      </TestWrapper>
    );
    
    let group = screen.getByRole('button', { name: 'First' }).parentElement;
    expect(group).toHaveClass('space-x-1');

    rerender(
      <TestWrapper>
        <ButtonGroup spacing="loose">
          <Button>First</Button>
          <Button>Second</Button>
        </ButtonGroup>
      </TestWrapper>
    );
    
    group = screen.getByRole('button', { name: 'First' }).parentElement;
    expect(group).toHaveClass('space-x-6');
  });
});

describe('Idempotent Button Integration', () => {
  it('handles idempotent operations', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    
    render(
      <TestWrapper>
        <Button
          idempotent={true}
          operationName="test-operation"
          onClick={mockOperation}
        >
          Idempotent Action
        </Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });

  it('prevents double clicks when configured', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    
    render(
      <TestWrapper>
        <Button
          idempotent={true}
          operationName="test-operation"
          onClick={mockOperation}
          preventDoubleClick={true}
          doubleClickDelay={500}
        >
          Prevent Double Click
        </Button>
      </TestWrapper>
    );
    
    const button = screen.getByRole('button');
    
    // Click multiple times rapidly
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    
    await waitFor(() => {
      // Should only be called once due to idempotency and double-click prevention
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });
  });
});