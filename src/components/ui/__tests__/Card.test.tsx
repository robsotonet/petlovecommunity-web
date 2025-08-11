import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  CardActions,
  PetCard,
  ServiceCard,
  FeatureCard,
  CardGrid,
  StatsCard,
} from '../Card';
import { CorrelationProvider } from '../../enterprise/CorrelationProvider';
import { Provider } from 'react-redux';
import { store } from '../../../lib/store';

// Test wrapper with required providers
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Provider store={store}>
    <CorrelationProvider>
      {children}
    </CorrelationProvider>
  </Provider>
);

describe('Card Component', () => {
  it('renders with default props', () => {
    render(
      <TestWrapper>
        <Card>Card content</Card>
      </TestWrapper>
    );
    
    const card = screen.getByText('Card content');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('card-default'); // default variant
  });

  it('applies correct variant classes', () => {
    const { rerender } = render(
      <TestWrapper>
        <Card variant="pet">Pet card</Card>
      </TestWrapper>
    );
    
    let card = screen.getByText('Pet card');
    expect(card).toHaveClass('card-pet');

    rerender(
      <TestWrapper>
        <Card variant="service">Service card</Card>
      </TestWrapper>
    );
    
    card = screen.getByText('Service card');
    expect(card).toHaveClass('card-service');
  });

  it('applies correct size classes', () => {
    const { rerender } = render(
      <TestWrapper>
        <Card size="sm">Small card</Card>
      </TestWrapper>
    );
    
    let card = screen.getByText('Small card');
    expect(card).toHaveClass('p-4');

    rerender(
      <TestWrapper>
        <Card size="lg">Large card</Card>
      </TestWrapper>
    );
    
    card = screen.getByText('Large card');
    expect(card).toHaveClass('p-8');
  });

  it('handles clickable cards', () => {
    const handleClick = jest.fn();
    
    render(
      <TestWrapper>
        <Card clickable onClick={handleClick}>Clickable card</Card>
      </TestWrapper>
    );
    
    const card = screen.getByText('Clickable card');
    expect(card).toHaveClass('cursor-pointer');
    
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies hoverable styles', () => {
    render(
      <TestWrapper>
        <Card hoverable>Hoverable card</Card>
      </TestWrapper>
    );
    
    const card = screen.getByText('Hoverable card');
    expect(card).toHaveClass('hover:shadow-card-hover');
  });

  it('shows loading state', () => {
    render(
      <TestWrapper>
        <Card loading>Loading card</Card>
      </TestWrapper>
    );
    
    const card = screen.getByText('Loading card').parentElement;
    expect(card).toHaveAttribute('data-card-loading', 'true');
  });

  it('includes correlation data attributes', () => {
    render(
      <TestWrapper>
        <Card>Test card</Card>
      </TestWrapper>
    );
    
    const card = screen.getByText('Test card');
    expect(card).toHaveAttribute('data-correlation-id');
    expect(card).toHaveAttribute('data-card-variant');
  });
});

describe('Card Sub-components', () => {
  it('renders CardHeader correctly', () => {
    render(
      <TestWrapper>
        <Card>
          <CardHeader>Header content</CardHeader>
        </Card>
      </TestWrapper>
    );
    
    const header = screen.getByText('Header content');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('mb-4');
  });

  it('renders CardTitle with correct heading level', () => {
    const { rerender } = render(
      <TestWrapper>
        <Card>
          <CardTitle level={2}>Title Level 2</CardTitle>
        </Card>
      </TestWrapper>
    );
    
    let title = screen.getByRole('heading', { level: 2 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveClass('text-2xl', 'font-bold');

    rerender(
      <TestWrapper>
        <Card>
          <CardTitle level={4}>Title Level 4</CardTitle>
        </Card>
      </TestWrapper>
    );
    
    title = screen.getByRole('heading', { level: 4 });
    expect(title).toHaveClass('text-lg', 'font-semibold');
  });

  it('renders CardContent with correct styling', () => {
    render(
      <TestWrapper>
        <Card>
          <CardContent>Content text</CardContent>
        </Card>
      </TestWrapper>
    );
    
    const content = screen.getByText('Content text');
    expect(content).toHaveClass('text-text-secondary');
  });

  it('renders CardFooter correctly', () => {
    render(
      <TestWrapper>
        <Card>
          <CardFooter>Footer content</CardFooter>
        </Card>
      </TestWrapper>
    );
    
    const footer = screen.getByText('Footer content');
    expect(footer).toHaveClass('mt-6');
  });

  it('renders CardActions with correct alignment', () => {
    const { rerender } = render(
      <TestWrapper>
        <Card>
          <CardActions alignment="left">
            <button>Action 1</button>
            <button>Action 2</button>
          </CardActions>
        </Card>
      </TestWrapper>
    );
    
    let actions = screen.getByRole('button', { name: 'Action 1' }).parentElement;
    expect(actions).toHaveClass('justify-start');

    rerender(
      <TestWrapper>
        <Card>
          <CardActions alignment="center">
            <button>Action 1</button>
            <button>Action 2</button>
          </CardActions>
        </Card>
      </TestWrapper>
    );
    
    actions = screen.getByRole('button', { name: 'Action 1' }).parentElement;
    expect(actions).toHaveClass('justify-center');
  });
});

describe('Specialized Card Components', () => {
  it('renders PetCard with correct variant and hoverable', () => {
    render(
      <TestWrapper>
        <PetCard>Pet card content</PetCard>
      </TestWrapper>
    );
    
    const card = screen.getByText('Pet card content');
    expect(card).toHaveClass('card-pet');
    expect(card).toHaveClass('hover:shadow-card-hover');
  });

  it('renders ServiceCard with correct variant and hoverable', () => {
    render(
      <TestWrapper>
        <ServiceCard>Service card content</ServiceCard>
      </TestWrapper>
    );
    
    const card = screen.getByText('Service card content');
    expect(card).toHaveClass('card-service');
    expect(card).toHaveClass('hover:shadow-card-hover');
  });

  it('renders FeatureCard with correct variant', () => {
    render(
      <TestWrapper>
        <FeatureCard>Feature card content</FeatureCard>
      </TestWrapper>
    );
    
    const card = screen.getByText('Feature card content');
    expect(card).toHaveClass('bg-gradient-to-br');
  });
});

describe('CardGrid Component', () => {
  it('renders with default grid layout', () => {
    render(
      <TestWrapper>
        <CardGrid>
          <Card>Card 1</Card>
          <Card>Card 2</Card>
          <Card>Card 3</Card>
        </CardGrid>
      </TestWrapper>
    );
    
    const grid = screen.getByText('Card 1').parentElement;
    expect(grid).toHaveClass('grid');
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-3');
  });

  it('applies correct column classes for different column counts', () => {
    const { rerender } = render(
      <TestWrapper>
        <CardGrid columns={2}>
          <Card>Card 1</Card>
          <Card>Card 2</Card>
        </CardGrid>
      </TestWrapper>
    );
    
    let grid = screen.getByText('Card 1').parentElement;
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2');

    rerender(
      <TestWrapper>
        <CardGrid columns={4}>
          <Card>Card 1</Card>
          <Card>Card 2</Card>
        </CardGrid>
      </TestWrapper>
    );
    
    grid = screen.getByText('Card 1').parentElement;
    expect(grid).toHaveClass('grid-cols-1', 'md:grid-cols-2', 'lg:grid-cols-4');
  });

  it('applies correct gap classes', () => {
    const { rerender } = render(
      <TestWrapper>
        <CardGrid gap="sm">
          <Card>Card 1</Card>
        </CardGrid>
      </TestWrapper>
    );
    
    let grid = screen.getByText('Card 1').parentElement;
    expect(grid).toHaveClass('gap-3');

    rerender(
      <TestWrapper>
        <CardGrid gap="xl">
          <Card>Card 1</Card>
        </CardGrid>
      </TestWrapper>
    );
    
    grid = screen.getByText('Card 1').parentElement;
    expect(grid).toHaveClass('gap-10');
  });
});

describe('StatsCard Component', () => {
  it('renders stats information correctly', () => {
    render(
      <TestWrapper>
        <StatsCard
          label="Total Adoptions"
          value={42}
        />
      </TestWrapper>
    );
    
    expect(screen.getByText('Total Adoptions')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays change information with correct styling', () => {
    const { rerender } = render(
      <TestWrapper>
        <StatsCard
          label="Revenue"
          value="$1,234"
          change={{ value: '+12%', type: 'increase' }}
        />
      </TestWrapper>
    );
    
    let changeElement = screen.getByText('+12%');
    expect(changeElement).toHaveClass('text-success');

    rerender(
      <TestWrapper>
        <StatsCard
          label="Errors"
          value={5}
          change={{ value: '-3%', type: 'decrease' }}
        />
      </TestWrapper>
    );
    
    changeElement = screen.getByText('-3%');
    expect(changeElement).toHaveClass('text-error');
  });

  it('displays icon when provided', () => {
    const TestIcon = () => <span data-testid="stats-icon">Icon</span>;
    
    render(
      <TestWrapper>
        <StatsCard
          label="Test Metric"
          value={100}
          icon={<TestIcon />}
        />
      </TestWrapper>
    );
    
    expect(screen.getByTestId('stats-icon')).toBeInTheDocument();
  });
});