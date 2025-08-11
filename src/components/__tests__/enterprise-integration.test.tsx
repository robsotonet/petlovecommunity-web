import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../../lib/store';
import { CorrelationProvider } from '../enterprise/CorrelationProvider';
import { TransactionWrapper } from '../enterprise/TransactionWrapper';
import { IdempotencyGuard } from '../enterprise/IdempotencyGuard';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Form, FormSection, FormActions } from '../forms/Form';
import { Input } from '../forms/Input';

// Full Enterprise Test Wrapper
const EnterpriseTestWrapper: React.FC<{ 
  children: React.ReactNode;
  userId?: string;
}> = ({ children, userId }) => (
  <Provider store={store}>
    <CorrelationProvider userId={userId}>
      <TransactionWrapper>
        {children}
      </TransactionWrapper>
    </CorrelationProvider>
  </Provider>
);

// Complex test component that uses multiple enterprise patterns
const AdoptionFormComponent: React.FC = () => {
  const [formData, setFormData] = React.useState({
    petId: '',
    adopterName: '',
    email: '',
  });

  const handleAdoptionSubmit = async () => {
    // Simulate adoption API call
    await new Promise(resolve => setTimeout(resolve, 100));
    return { success: true, adoptionId: 'adoption-123' };
  };

  const handleServiceBooking = async () => {
    // Simulate service booking API call
    await new Promise(resolve => setTimeout(resolve, 50));
    return { success: true, bookingId: 'booking-456' };
  };

  return (
    <Card variant="pet">
      <CardHeader>
        <CardTitle>Pet Adoption Application</CardTitle>
      </CardHeader>
      
      <CardContent>
        <Form
          title="Adopt Fluffy"
          subtitle="Complete this form to start the adoption process"
        >
          <FormSection title="Pet Information">
            <Input
              label="Pet ID"
              value={formData.petId}
              onChange={(e) => setFormData({ ...formData, petId: e.target.value })}
              data-testid="pet-id-input"
            />
          </FormSection>
          
          <FormSection title="Adopter Information">
            <Input
              label="Full Name"
              required
              value={formData.adopterName}
              onChange={(e) => setFormData({ ...formData, adopterName: e.target.value })}
              data-testid="adopter-name-input"
            />
            
            <Input
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              data-testid="email-input"
            />
          </FormSection>
          
          <FormActions>
            {/* Idempotent adoption button */}
            <IdempotencyGuard
              operationName="pet-adoption"
              operationParams={{ petId: formData.petId }}
            >
              <Button
                variant="adoption"
                idempotent={true}
                operationName="pet-adoption"
                operationParams={{ petId: formData.petId }}
                onClick={handleAdoptionSubmit}
                data-testid="adopt-button"
              >
                Adopt Pet
              </Button>
            </IdempotencyGuard>
            
            {/* Regular service booking button */}
            <Button
              variant="service"
              idempotent={true}
              operationName="service-booking"
              operationParams={{ petId: formData.petId, service: 'grooming' }}
              onClick={handleServiceBooking}
              data-testid="service-button"
            >
              Book Grooming
            </Button>
          </FormActions>
        </Form>
      </CardContent>
    </Card>
  );
};

describe('Enterprise Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('integrates correlation IDs across all components', async () => {
    render(
      <EnterpriseTestWrapper userId="test-user-integration">
        <AdoptionFormComponent />
      </EnterpriseTestWrapper>
    );

    // Check that all components have correlation ID data attributes
    const card = screen.getByRole('heading', { name: 'Pet Adoption Application' }).closest('[data-correlation-id]');
    const adoptButton = screen.getByTestId('adopt-button');
    const serviceButton = screen.getByTestId('service-button');
    const petIdInput = screen.getByTestId('pet-id-input');

    expect(card).toHaveAttribute('data-correlation-id');
    expect(adoptButton).toHaveAttribute('data-correlation-id');
    expect(serviceButton).toHaveAttribute('data-correlation-id');
    expect(petIdInput).toHaveAttribute('data-correlation-id');

    // All should have the same correlation ID
    const correlationId = card?.getAttribute('data-correlation-id');
    expect(adoptButton).toHaveAttribute('data-correlation-id', correlationId);
    expect(serviceButton).toHaveAttribute('data-correlation-id', correlationId);
    expect(petIdInput).toHaveAttribute('data-correlation-id', correlationId);
  });

  it('handles idempotent operations across multiple components', async () => {
    render(
      <EnterpriseTestWrapper>
        <AdoptionFormComponent />
      </EnterpriseTestWrapper>
    );

    const petIdInput = screen.getByTestId('pet-id-input');
    const adoptButton = screen.getByTestId('adopt-button');

    // Fill in pet ID to create consistent operation parameters
    fireEvent.change(petIdInput, { target: { value: 'pet-123' } });

    // Click adoption button multiple times rapidly
    act(() => {
      fireEvent.click(adoptButton);
      fireEvent.click(adoptButton);
      fireEvent.click(adoptButton);
    });

    // Should handle idempotency correctly (no duplicate operations)
    await waitFor(() => {
      expect(adoptButton).toHaveAttribute('data-idempotency-blocked');
    });
  });

  it('maintains transaction state across component interactions', async () => {
    render(
      <EnterpriseTestWrapper>
        <AdoptionFormComponent />
      </EnterpriseTestWrapper>
    );

    const adoptButton = screen.getByTestId('adopt-button');
    const serviceButton = screen.getByTestId('service-button');

    // Start adoption transaction
    act(() => {
      fireEvent.click(adoptButton);
    });

    await waitFor(() => {
      // Transaction wrapper should indicate execution state
      const transactionContainer = adoptButton.closest('[data-transaction-executing]');
      expect(transactionContainer).toHaveAttribute('data-transaction-executing', 'true');
    });

    // Wait for transaction to complete
    await waitFor(() => {
      const transactionContainer = adoptButton.closest('[data-transaction-executing]');
      expect(transactionContainer).toHaveAttribute('data-transaction-executing', 'false');
    }, { timeout: 200 });

    // Should be able to start another transaction
    act(() => {
      fireEvent.click(serviceButton);
    });

    await waitFor(() => {
      const transactionContainer = serviceButton.closest('[data-transaction-executing]');
      expect(transactionContainer).toHaveAttribute('data-transaction-executing', 'true');
    });
  });

  it('propagates enterprise patterns through form components', () => {
    render(
      <EnterpriseTestWrapper userId="form-test-user">
        <AdoptionFormComponent />
      </EnterpriseTestWrapper>
    );

    // Form should have correlation context
    const form = screen.getByRole('form') || screen.getByText('Complete this form').closest('form');
    expect(form).toHaveAttribute('data-correlation-id');

    // Inputs should inherit correlation context
    const petIdInput = screen.getByTestId('pet-id-input');
    const nameInput = screen.getByTestId('adopter-name-input');
    const emailInput = screen.getByTestId('email-input');

    expect(petIdInput).toHaveAttribute('data-correlation-id');
    expect(nameInput).toHaveAttribute('data-correlation-id');
    expect(emailInput).toHaveAttribute('data-correlation-id');

    // All inputs should have the same correlation ID
    const correlationId = petIdInput.getAttribute('data-correlation-id');
    expect(nameInput).toHaveAttribute('data-correlation-id', correlationId);
    expect(emailInput).toHaveAttribute('data-correlation-id', correlationId);
  });

  it('handles errors gracefully across enterprise patterns', async () => {
    const ErrorComponent: React.FC = () => {
      const handleErrorOperation = async () => {
        throw new Error('Test operation failed');
      };

      return (
        <TransactionWrapper
          onTransactionError={(type, error) => {
            console.log(`Transaction ${type} failed:`, error.message);
          }}
        >
          <Button
            variant="adoption"
            idempotent={true}
            operationName="error-operation"
            onClick={handleErrorOperation}
            data-testid="error-button"
          >
            Trigger Error
          </Button>
        </TransactionWrapper>
      );
    };

    render(
      <EnterpriseTestWrapper>
        <ErrorComponent />
      </EnterpriseTestWrapper>
    );

    const errorButton = screen.getByTestId('error-button');

    // Click button to trigger error
    act(() => {
      fireEvent.click(errorButton);
    });

    await waitFor(() => {
      // Transaction should show error state
      const transactionContainer = errorButton.closest('[data-transaction-error]');
      expect(transactionContainer).toHaveAttribute('data-transaction-error', 'true');
    });
  });

  it('maintains performance with multiple enterprise components', async () => {
    const MultipleComponentsTest: React.FC = () => (
      <>
        {Array.from({ length: 10 }, (_, i) => (
          <Card key={i} variant={i % 2 === 0 ? 'pet' : 'service'}>
            <CardContent>
              <Button
                variant={i % 2 === 0 ? 'adoption' : 'service'}
                data-testid={`button-${i}`}
              >
                Action {i}
              </Button>
            </CardContent>
          </Card>
        ))}
      </>
    );

    const startTime = performance.now();

    render(
      <EnterpriseTestWrapper>
        <MultipleComponentsTest />
      </EnterpriseTestWrapper>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render multiple components with enterprise patterns quickly
    expect(renderTime).toBeLessThan(100); // 100ms threshold

    // All buttons should be rendered with correlation IDs
    for (let i = 0; i < 10; i++) {
      const button = screen.getByTestId(`button-${i}`);
      expect(button).toHaveAttribute('data-correlation-id');
    }
  });

  it('supports nested enterprise component patterns', async () => {
    const NestedComponent: React.FC = () => (
      <Card variant="feature">
        <CardContent>
          <Form>
            <FormSection title="Nested Form">
              <IdempotencyGuard
                operationName="nested-operation"
                operationParams={{ level: 'deep' }}
              >
                <TransactionWrapper>
                  <Button
                    idempotent={true}
                    operationName="nested-operation"
                    operationParams={{ level: 'deep' }}
                    onClick={async () => ({ success: true })}
                    data-testid="nested-button"
                  >
                    Nested Action
                  </Button>
                </TransactionWrapper>
              </IdempotencyGuard>
            </FormSection>
          </Form>
        </CardContent>
      </Card>
    );

    render(
      <EnterpriseTestWrapper>
        <NestedComponent />
      </EnterpriseTestWrapper>
    );

    const nestedButton = screen.getByTestId('nested-button');
    
    // Should work with deeply nested enterprise patterns
    expect(nestedButton).toHaveAttribute('data-correlation-id');
    expect(nestedButton).toHaveAttribute('data-button-variant');

    // Should handle nested transactions
    act(() => {
      fireEvent.click(nestedButton);
    });

    await waitFor(() => {
      const transactionContainer = nestedButton.closest('[data-transaction-executing]');
      expect(transactionContainer).toHaveAttribute('data-transaction-executing', 'true');
    });
  });
});