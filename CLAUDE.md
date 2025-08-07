# Pet Love Community - Enterprise Web Client Development Guide

## Project Overview  
Enterprise-grade responsive web application for Pet Love Community using React 18+, TypeScript, Tailwind CSS, and Redux Toolkit with comprehensive .NET SignalR integration, idempotency management, correlation ID tracing, and transaction-level duplicate prevention.

## Standard Workflow
1. **Analysis & Planning**: Think through problems, review API integration, write plan to `tasks/todo.md`
2. **Task Management**: Create detailed todo items that can be checked off as completed
3. **Approval Process**: Check in for plan verification before implementation  
4. **Implementation**: Work on todo items, marking complete as you go
5. **Progress Updates**: Provide high-level summaries of changes made
6. **Simplicity First**: Make minimal, focused changes impacting as little code as possible
7. **Documentation**: Add review section to todo.md with summary and relevant information

## Enterprise Technology Stack
- **Framework**: Next.js 14 (React 18+ compatible)
- **UI Library**: React 18+ 
- **Language**: TypeScript 5.3+
- **Styling**: Tailwind CSS (Mobile-First approach)
- **State Management**: Redux Toolkit + RTK Query
- **Real-time**: @microsoft/signalr for .NET SignalR integration
- **Authentication**: NextAuth.js + Redux integration
- **Enterprise Features**: Idempotency, Correlation IDs, Transaction Management
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library + Playwright
- **Performance**: Code splitting, lazy loading, image optimization
- **Deployment**: Vercel

## Enterprise Architecture Requirements

### .NET SignalR Real-Time Integration
```typescript
// SignalR Hub Connection with enterprise reliability
import { HubConnectionBuilder, HubConnection, LogLevel } from '@microsoft/signalr'

const hubConnection = new HubConnectionBuilder()
  .withUrl(`${process.env.NEXT_PUBLIC_API_URL}/hubs/petLove`)
  .withAutomaticReconnect([0, 2000, 10000, 30000])
  .configureLogging(LogLevel.Information)
  .build()

// Real-time event handlers
hubConnection.on('PetAdoptionStatusChanged', (petId, status) => {
  store.dispatch(petApi.util.invalidateTags(['Pet']))
})
```

### Idempotency & Duplicate Prevention
```typescript
// Transaction-level idempotency management
interface Transaction {
  id: string                    // Unique transaction identifier
  correlationId: string        // Request tracing
  idempotencyKey: string      // Duplicate prevention
  type: TransactionType       // Operation classification
  status: TransactionStatus   // Current state
  retryCount: number         // Retry attempts
}

// Prevent duplicate submissions
const executeWithIdempotency = async (operation: () => Promise<any>) => {
  const idempotencyKey = generateIdempotencyKey(operation)
  return idempotencyService.executeIdempotent(idempotencyKey, operation)
}
```

### Correlation ID Request Tracing
```typescript
// Every request includes correlation context
interface CorrelationContext {
  correlationId: string       // Unique request identifier
  parentCorrelationId?: string // Parent request (for nested calls)
  userId?: string            // User context
  sessionId: string         // Session context
  timestamp: number         // Request timestamp
}

// RTK Query integration with correlation headers
prepareHeaders: (headers, { getState }) => {
  const context = getCorrelationContext(getState())
  headers.set('X-Correlation-ID', context.correlationId)
  headers.set('X-Transaction-ID', generateTransactionId())
  return headers
}
```

## Key Features - ENTERPRISE FOCUS
- **Responsive Web Interface**: Mobile-first design with Tailwind breakpoints
- **Social Features**: Community posts, comments, user interactions
- **Pet Discovery**: Advanced search, filtering, swipeable galleries
- **Event Management**: Community events, RSVP system, calendar integration
- **Real-time Updates**: .NET SignalR integration for live data
- **Enterprise Reliability**: Idempotency, correlation tracing, transaction management

## Development Phases - ENTERPRISE INTEGRATION

### Phase 1: Enterprise Foundation (Weeks 1-2)
**SETUP-001: Enterprise Project Setup**
- [ ] Next.js 14 + React 18+ + TypeScript initialization
- [ ] Redux Toolkit + RTK Query with enterprise middleware
- [ ] SignalR client integration (@microsoft/signalr)
- [ ] Correlation ID service implementation
- [ ] Transaction management system setup
- [ ] Idempotency service configuration

**SETUP-002: API Integration & Reliability**
- [ ] Enhanced RTK Query with correlation headers
- [ ] Transaction-aware API client
- [ ] SignalR hub connection management
- [ ] Retry logic with exponential backoff
- [ ] Error boundary integration
- [ ] Request/response logging with correlation IDs

### Phase 2: Authentication UI (Weeks 3-4)  
**AUTH-001: Enterprise Authentication**
- [ ] NextAuth.js + Redux store integration
- [ ] Correlation ID context for auth flows
- [ ] Idempotent login/register operations
- [ ] Session management with transaction tracking
- [ ] Protected routes with correlation context
- [ ] Authentication state synchronization via SignalR

### Phase 3: Pet Adoption Features (Weeks 5-8)
**PET-001: Enterprise Pet Discovery**  
- [ ] Real-time pet availability updates via SignalR
- [ ] Idempotent favorite/unfavorite operations
- [ ] Transaction-tracked adoption applications
- [ ] Correlation-traced search operations
- [ ] Duplicate prevention for adoption inquiries
- [ ] Pet viewing analytics with correlation IDs

**PET-002: Adoption Transaction Management**
- [ ] Adoption application with transaction IDs
- [ ] Duplicate application prevention
- [ ] Real-time adoption status updates
- [ ] Correlation-traced adoption workflow
- [ ] Retry logic for failed operations
- [ ] Adoption confirmation with idempotency

### Phase 4: Events (Weeks 9-10)
**EVENT-001: Enterprise Event Management**
- [ ] Real-time event updates via SignalR
- [ ] Idempotent RSVP operations
- [ ] Transaction-tracked event bookings
- [ ] Duplicate RSVP prevention
- [ ] Event capacity management with real-time updates
- [ ] Correlation-traced event interactions

### Phase 5: Social Features (Weeks 11-12)
**SOCIAL-001: Enterprise Social Platform**
- [ ] Real-time post updates and notifications
- [ ] Idempotent like/comment operations
- [ ] Transaction-tracked social interactions
- [ ] Duplicate content prevention
- [ ] Real-time user activity feeds
- [ ] Correlation-traced social analytics

## Mobile-First Responsive Design
```javascript
// Tailwind breakpoint system with touch optimization
'xs': '475px',    // Mobile large (touch-optimized)
'sm': '640px',    // Small tablets  
'md': '768px',    // Tablets
'lg': '1024px',   // Small desktops
'xl': '1280px',   // Large desktops

// Mobile-first component with enterprise features
<div className="
  flex flex-col space-y-4                    // Mobile: Stack
  sm:flex-row sm:space-y-0 sm:space-x-4    // Tablet+: Horizontal
  lg:grid lg:grid-cols-3                    // Desktop: Grid
" 
  data-correlation-id={correlationContext.correlationId}
  data-transaction-id={transactionId}
>
```

## Performance & Reliability
### Enterprise Performance Targets
- **First Contentful Paint**: < 1.2s
- **Largest Contentful Paint**: < 2.0s  
- **Cumulative Layout Shift**: < 0.1
- **Bundle Size**: < 180KB initial load
- **SignalR Connection**: < 500ms establishment
- **Transaction Processing**: < 200ms average

### Code Splitting & Optimization
```typescript
// Enterprise-grade lazy loading
const PetDetailPage = dynamic(() => import('@/app/pets/[id]/page'), {
  loading: () => <PetDetailSkeleton />,
  ssr: true,
})

// SignalR connection optimization
const useSignalRConnection = () => {
  const [connection, setConnection] = useState<HubConnection | null>(null)
  
  useEffect(() => {
    const connect = async () => {
      const hubConnection = new HubConnectionBuilder()
        .withUrl('/hubs/petLove')
        .withAutomaticReconnect()
        .build()
      
      await hubConnection.start()
      setConnection(hubConnection)
    }
    
    connect()
    return () => connection?.stop()
  }, [])
  
  return connection
}
```

## Enterprise File Structure
```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication routes
│   ├── (main)/                   # Main application routes
│   └── api/                      # BFF API routes
├── components/                   # Component library
│   ├── ui/                       # Base components
│   ├── forms/                    # Form components
│   ├── enterprise/               # Enterprise components
│   │   ├── CorrelationProvider.tsx
│   │   ├── TransactionWrapper.tsx
│   │   └── IdempotencyGuard.tsx
│   └── features/                 # Feature components
├── lib/                         # Enterprise utilities
│   ├── store/                    # Redux Toolkit configuration
│   │   ├── index.ts             # Enterprise store setup
│   │   ├── middleware/          # Custom middleware
│   │   └── slices/              # Redux slices
│   ├── services/                # Enterprise services
│   │   ├── SignalRService.ts    # SignalR integration
│   │   ├── CorrelationService.ts # Request tracing
│   │   ├── TransactionManager.ts # Transaction handling
│   │   └── IdempotencyService.ts # Duplicate prevention
│   ├── api/                     # RTK Query slices
│   └── utils/                   # Helper functions
├── hooks/                       # Custom React hooks
│   ├── useSignalR.ts           # SignalR integration
│   ├── useCorrelation.ts       # Correlation context
│   └── useTransaction.ts       # Transaction management
└── types/                       # TypeScript definitions
    ├── enterprise.ts           # Enterprise type definitions
    ├── signalr.ts             # SignalR types
    └── transactions.ts        # Transaction types
```

## API Integration - ENTERPRISE READY
**Base URL**: `http://localhost:5000/api`
**SignalR Hub**: `http://localhost:5000/hubs/petLove`
**Documentation**: `http://localhost:5000/swagger`

### Enterprise Headers (All Requests)
```typescript
{
  'X-Correlation-ID': correlationId,      // Request tracing
  'X-Transaction-ID': transactionId,      // Transaction tracking  
  'X-Idempotency-Key': idempotencyKey,   // Duplicate prevention
  'Authorization': `Bearer ${jwtToken}`,   // Authentication
  'X-User-ID': userId,                    // User context
  'X-Session-ID': sessionId               // Session tracking
}
```

## Development Environment Setup
```bash
# Enterprise dependencies
npm install @reduxjs/toolkit react-redux @microsoft/signalr
npm install next-auth react-hook-form zod uuid
npm install framer-motion @headlessui/react

# Development dependencies
npm install -D @types/uuid @types/node vitest
npm install -D @testing-library/react @testing-library/jest-dom
```

## Enterprise Development Commands
```bash
npm run dev                    # Development with SignalR
npm run build                  # Production build with optimization
npm run start                  # Production server
npm run lint                   # Code quality checks
npm run test                   # Unit tests with enterprise mocks
npm run test:integration       # Integration tests with SignalR
npm run test:e2e              # End-to-end enterprise flows
npm run analyze               # Bundle analysis with enterprise metrics
```

## Claude Code Integration - ENTERPRISE USAGE
Run `claude-code` for enterprise tasks like:
- "Implement SignalR real-time pet adoption updates"
- "Add idempotency to event RSVP operations"
- "Create correlation ID tracing for user authentication"
- "Build transaction management for adoption applications"
- "Add duplicate prevention to social post creation"

## Enterprise Quality Assurance
- **Unit Tests**: 90%+ coverage including enterprise features
- **Integration Tests**: SignalR, idempotency, transaction management
- **E2E Tests**: Complete user flows with enterprise reliability
- **Load Testing**: Concurrent users with real-time features
- **Security Testing**: Enterprise-grade authentication and authorization

---
*This enterprise guide ensures Pet Love Community web client meets production-grade reliability requirements with .NET SignalR integration, comprehensive duplicate prevention, and enterprise-level request tracing.*