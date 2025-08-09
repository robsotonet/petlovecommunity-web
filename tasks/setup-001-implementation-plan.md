# SETUP-001: Enterprise Foundation Implementation Plan
## Detailed Step-by-Step Execution Guide

### **Current State Analysis**
- **✅ Dependencies:** All enterprise packages installed (@microsoft/signalr, @reduxjs/toolkit, etc.)
- **📁 Structure:** Default Next.js app structure only
- **🎨 Styling:** Basic Tailwind config (needs Pet Love Community colors)
- **🏪 State:** No Redux store setup
- **🔌 Services:** No enterprise services implemented
- **📡 Real-time:** No SignalR integration

---

## **Implementation Phases Overview**

### **Phase A: Design System Foundation** (Day 1) ⚡ HIGH PRIORITY
### **Phase B: Enterprise Architecture** (Day 2) 
### **Phase C: Redux & State Management** (Day 3-4)
### **Phase D: Enterprise Services** (Day 5-6) 
### **Phase E: SignalR Integration** (Day 7)

---

## **Phase A: Design System Foundation** (Day 1)

### **A1: Tailwind Configuration with Pet Love Community Colors**
*Duration: 30-45 minutes*

#### **File: `tailwind.config.ts`**
```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pet Love Community Brand Colors
        coral: {
          DEFAULT: '#FF6B6B',
          light: '#FF8E8E',
          dark: '#E55555',
        },
        teal: {
          DEFAULT: '#4ECDC4',
          light: '#6ED4CC', 
          dark: '#3BB5B0',
          bg: '#E8F8F7',
        },
        midnight: '#1A535C',
        beige: '#F7FFF7',
        
        // Extended palette
        'text-secondary': '#2C6B73',
        'text-tertiary': '#6C757D',
        
        // Semantic colors
        success: '#00B894',
        warning: '#FDCB6E',
        error: '#E74C3C',
        info: '#74B9FF',
        
        // Component colors
        white: '#FFFFFF',
        border: '#E8F8F7',
        
        // Legacy support
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      boxShadow: {
        card: '0 2px 8px rgba(26, 83, 92, 0.08)',
        'card-hover': '0 4px 16px rgba(26, 83, 92, 0.12)',
        button: '0 2px 4px rgba(26, 83, 92, 0.1)',
        fab: '0 8px 24px rgba(255, 107, 107, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
```

#### **A2: CSS Custom Properties Integration**
*Duration: 15-20 minutes*

#### **File: `src/app/globals.css`** (Update existing file)
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Pet Love Community Design System Colors */
  --color-coral: #FF6B6B;
  --color-coral-light: #FF8E8E;
  --color-coral-dark: #E55555;
  --color-teal: #4ECDC4;
  --color-teal-light: #6ED4CC;
  --color-teal-dark: #3BB5B0;
  --color-teal-bg: #E8F8F7;
  --color-beige: #F7FFF7;
  --color-midnight: #1A535C;
  
  /* Text hierarchy */
  --color-text-secondary: #2C6B73;
  --color-text-tertiary: #6C757D;
  
  /* Semantic colors */
  --color-success: #00B894;
  --color-warning: #FDCB6E;
  --color-error: #E74C3C;
  --color-info: #74B9FF;
  
  /* Component colors */
  --color-white: #FFFFFF;
  --color-border: #E8F8F7;
  --color-shadow: rgba(26, 83, 92, 0.08);
  
  /* Legacy variables */
  --background: #F7FFF7;
  --foreground: #1A535C;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-beige: #1A1A1A;
    --color-midnight: #FFFFFF;
    --color-border: #333333;
    /* Coral and teal remain unchanged for brand consistency */
  }
}

/* Base styles */
body {
  color: var(--color-midnight);
  background: var(--color-beige);
  font-feature-settings: "rlig" 1, "calt" 1;
}

/* Utility classes */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
  
  .transition-brand {
    transition: all 0.3s ease;
  }
}

/* Component base styles */
@layer components {
  .btn-adoption {
    @apply bg-coral hover:bg-coral-light active:bg-coral-dark;
    @apply text-white font-medium;
    @apply px-6 py-3 rounded-lg;
    @apply transition-brand;
    @apply shadow-button hover:shadow-card;
  }
  
  .btn-service {
    @apply bg-teal hover:bg-teal-light active:bg-teal-dark;
    @apply text-white font-medium;
    @apply px-6 py-3 rounded-lg;
    @apply transition-brand;
    @apply shadow-button hover:shadow-card;
  }
  
  .card-pet {
    @apply bg-white border-l-4 border-l-coral;
    @apply rounded-xl p-6;
    @apply shadow-card hover:shadow-card-hover;
    @apply transition-brand;
  }
  
  .card-service {
    @apply bg-white border border-teal-bg;
    @apply rounded-xl p-6;
    @apply shadow-card hover:shadow-card-hover;
    @apply transition-brand;
  }
}
```

#### **A3: Design System Validation**
*Duration: 10 minutes*

#### **Test File: `src/app/design-system-test/page.tsx`** (Create for validation)
```typescript
export default function DesignSystemTest() {
  return (
    <div className="p-8 space-y-8 bg-beige min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-midnight mb-8">
          Pet Love Community Design System Test
        </h1>
        
        {/* Color Palette Test */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-midnight">Brand Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-coral rounded-lg">
              <div className="text-white font-medium">Coral</div>
              <div className="text-white/80 text-sm">#FF6B6B</div>
            </div>
            <div className="p-4 bg-teal rounded-lg">
              <div className="text-white font-medium">Teal</div>
              <div className="text-white/80 text-sm">#4ECDC4</div>
            </div>
            <div className="p-4 bg-midnight rounded-lg">
              <div className="text-white font-medium">Midnight</div>
              <div className="text-white/80 text-sm">#1A535C</div>
            </div>
            <div className="p-4 bg-beige border border-border rounded-lg">
              <div className="text-midnight font-medium">Beige</div>
              <div className="text-text-secondary text-sm">#F7FFF7</div>
            </div>
          </div>
        </section>
        
        {/* Button Test */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-midnight">Buttons</h2>
          <div className="flex flex-wrap gap-4">
            <button className="btn-adoption">❤️ Adopt Me</button>
            <button className="btn-service">📅 Book Service</button>
            <button className="bg-transparent border-2 border-teal text-teal hover:bg-teal hover:text-white px-6 py-3 rounded-lg transition-brand">
              Learn More
            </button>
          </div>
        </section>
        
        {/* Card Test */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-midnight">Cards</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card-pet">
              <h3 className="text-xl font-semibold text-midnight mb-2">Buddy</h3>
              <p className="text-text-secondary mb-4">
                A friendly golden retriever looking for a loving home.
              </p>
              <button className="btn-adoption">❤️ Adopt Me</button>
            </div>
            <div className="card-service">
              <h3 className="text-xl font-semibold text-midnight mb-2">Pet Grooming</h3>
              <p className="text-text-secondary mb-4">
                Professional grooming services for your beloved pet.
              </p>
              <button className="btn-service">📅 Book Service</button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
```

---

## **Phase B: Enterprise File Structure** (Day 2)

### **B1: Create Enterprise Folder Structure**
*Duration: 20-30 minutes*

#### **Commands to Execute:**
```bash
# Create enterprise folder structure
mkdir -p src/lib/{store,services,api,utils}
mkdir -p src/hooks
mkdir -p src/types
mkdir -p src/components/{ui,enterprise,features}
mkdir -p src/app/api
```

### **B2: TypeScript Type Definitions**
*Duration: 30-45 minutes*

#### **File: `src/types/enterprise.ts`**
```typescript
// Enterprise correlation and transaction types
export interface CorrelationContext {
  correlationId: string;
  parentCorrelationId?: string;
  userId?: string;
  sessionId: string;
  timestamp: number;
}

export interface Transaction {
  id: string;
  correlationId: string;
  idempotencyKey: string;
  type: TransactionType;
  status: TransactionStatus;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionType = 
  | 'pet_favorite' 
  | 'adoption_application'
  | 'service_booking'
  | 'event_rsvp'
  | 'social_interaction';

export type TransactionStatus = 
  | 'pending'
  | 'processing' 
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface IdempotencyRecord {
  key: string;
  correlationId: string;
  result: any;
  createdAt: Date;
  expiresAt: Date;
}

// Enterprise API types
export interface EnterpriseApiRequest {
  correlationId: string;
  transactionId?: string;
  idempotencyKey?: string;
  userId?: string;
  sessionId: string;
}

export interface EnterpriseApiResponse<T = any> {
  data: T;
  correlationId: string;
  transactionId?: string;
  timestamp: number;
  success: boolean;
  errors?: string[];
}
```

#### **File: `src/types/design-system.ts`**
```typescript
// Design system component types
export type ButtonVariant = 'adoption' | 'service' | 'secondary' | 'outline';
export type CardVariant = 'pet' | 'service' | 'event' | 'default';
export type ColorScheme = 'coral' | 'teal' | 'midnight' | 'beige';

export interface ComponentWithCorrelation {
  correlationId?: string;
}

export interface DesignSystemProps extends ComponentWithCorrelation {
  className?: string;
  children?: React.ReactNode;
}

// Pet Love Community specific component props
export interface PetCardProps extends DesignSystemProps {
  pet: {
    id: string;
    name: string;
    breed: string;
    age: string;
    description: string;
    imageUrl: string;
    isUrgent?: boolean;
  };
  onAdopt?: (petId: string) => void;
  onFavorite?: (petId: string) => void;
}

export interface ServiceCardProps extends DesignSystemProps {
  service: {
    id: string;
    title: string;
    provider: string;
    description: string;
    price: string;
    availability: string;
  };
  onBook?: (serviceId: string) => void;
}
```

#### **File: `src/types/signalr.ts`**
```typescript
import { HubConnection } from '@microsoft/signalr';

// SignalR hub types
export interface SignalRContextType {
  connection: HubConnection | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
}

export interface SignalREventHandlers {
  onPetAdoptionStatusChanged?: (petId: string, status: string) => void;
  onServiceAvailabilityChanged?: (serviceId: string, availability: boolean) => void;
  onEventCapacityChanged?: (eventId: string, capacity: number) => void;
  onCommunityPostCreated?: (post: any) => void;
  onUserNotification?: (notification: any) => void;
}

export interface SignalRMessage {
  correlationId: string;
  timestamp: number;
  type: string;
  payload: any;
}
```

---

## **Phase C: Redux & State Management** (Day 3-4)

### **C1: Redux Store Configuration**
*Duration: 45-60 minutes*

#### **File: `src/lib/store/index.ts`**
```typescript
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { correlationMiddleware } from './middleware/correlationMiddleware';
import { transactionMiddleware } from './middleware/transactionMiddleware';
import { idempotencyMiddleware } from './middleware/idempotencyMiddleware';
import { signalRMiddleware } from './middleware/signalRMiddleware';
import { petApi } from '../api/petApi';
import { serviceApi } from '../api/serviceApi';
import correlationSlice from './slices/correlationSlice';
import transactionSlice from './slices/transactionSlice';

export const store = configureStore({
  reducer: {
    correlation: correlationSlice,
    transaction: transactionSlice,
    [petApi.reducerPath]: petApi.reducer,
    [serviceApi.reducerPath]: serviceApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['signalr/connected', 'signalr/disconnected'],
      },
    })
      .concat(correlationMiddleware)
      .concat(transactionMiddleware)
      .concat(idempotencyMiddleware)
      .concat(signalRMiddleware)
      .concat(petApi.middleware)
      .concat(serviceApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

setupListeners(store.dispatch);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

#### **File: `src/lib/store/slices/correlationSlice.ts`**
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CorrelationContext } from '../../../types/enterprise';
import { generateCorrelationId, generateSessionId } from '../../utils/correlationUtils';

interface CorrelationState {
  currentContext: CorrelationContext;
  history: CorrelationContext[];
}

const initialContext: CorrelationContext = {
  correlationId: generateCorrelationId(),
  sessionId: generateSessionId(),
  timestamp: Date.now(),
};

const initialState: CorrelationState = {
  currentContext: initialContext,
  history: [initialContext],
};

const correlationSlice = createSlice({
  name: 'correlation',
  initialState,
  reducers: {
    setCorrelationContext: (state, action: PayloadAction<Partial<CorrelationContext>>) => {
      const newContext: CorrelationContext = {
        ...state.currentContext,
        ...action.payload,
        timestamp: Date.now(),
      };
      state.currentContext = newContext;
      state.history.push(newContext);
      
      // Keep only last 100 correlation contexts
      if (state.history.length > 100) {
        state.history = state.history.slice(-100);
      }
    },
    
    createChildCorrelation: (state, action: PayloadAction<{ userId?: string }>) => {
      const childContext: CorrelationContext = {
        correlationId: generateCorrelationId(),
        parentCorrelationId: state.currentContext.correlationId,
        sessionId: state.currentContext.sessionId,
        userId: action.payload.userId || state.currentContext.userId,
        timestamp: Date.now(),
      };
      state.currentContext = childContext;
      state.history.push(childContext);
    },
    
    setUserId: (state, action: PayloadAction<string>) => {
      state.currentContext.userId = action.payload;
    },
  },
});

export const { setCorrelationContext, createChildCorrelation, setUserId } = correlationSlice.actions;
export default correlationSlice.reducer;
```

#### **File: `src/lib/store/slices/transactionSlice.ts`**
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Transaction, TransactionType, TransactionStatus } from '../../../types/enterprise';
import { generateTransactionId } from '../../utils/transactionUtils';

interface TransactionState {
  activeTransactions: Record<string, Transaction>;
  completedTransactions: Transaction[];
}

const initialState: TransactionState = {
  activeTransactions: {},
  completedTransactions: [],
};

const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    startTransaction: (state, action: PayloadAction<{
      type: TransactionType;
      correlationId: string;
      idempotencyKey: string;
    }>) => {
      const { type, correlationId, idempotencyKey } = action.payload;
      const transaction: Transaction = {
        id: generateTransactionId(),
        correlationId,
        idempotencyKey,
        type,
        status: 'pending',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      state.activeTransactions[transaction.id] = transaction;
    },
    
    updateTransactionStatus: (state, action: PayloadAction<{
      transactionId: string;
      status: TransactionStatus;
      retryCount?: number;
    }>) => {
      const { transactionId, status, retryCount } = action.payload;
      const transaction = state.activeTransactions[transactionId];
      
      if (transaction) {
        transaction.status = status;
        transaction.updatedAt = new Date();
        
        if (retryCount !== undefined) {
          transaction.retryCount = retryCount;
        }
        
        // Move completed/failed/cancelled transactions to history
        if (['completed', 'failed', 'cancelled'].includes(status)) {
          state.completedTransactions.push(transaction);
          delete state.activeTransactions[transactionId];
          
          // Keep only last 500 completed transactions
          if (state.completedTransactions.length > 500) {
            state.completedTransactions = state.completedTransactions.slice(-500);
          }
        }
      }
    },
  },
});

export const { startTransaction, updateTransactionStatus } = transactionSlice.actions;
export default transactionSlice.reducer;
```

### **C2: Redux Provider Setup**
*Duration: 15-20 minutes*

#### **File: `src/lib/store/StoreProvider.tsx`**
```typescript
'use client';

import { Provider } from 'react-redux';
import { store } from './index';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
```

#### **Update: `src/app/layout.tsx`**
```typescript
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { StoreProvider } from "@/lib/store/StoreProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Pet Love Community",
  description: "Enterprise pet adoption and community platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <StoreProvider>
          {children}
        </StoreProvider>
      </body>
    </html>
  );
}
```

---

## **Phase D: Enterprise Services** (Day 5-6)

### **D1: Correlation Service**
*Duration: 45-60 minutes*

#### **File: `src/lib/services/CorrelationService.ts`**
```typescript
import { CorrelationContext } from '../../types/enterprise';

export class CorrelationService {
  private static instance: CorrelationService;
  private contexts: Map<string, CorrelationContext> = new Map();

  static getInstance(): CorrelationService {
    if (!CorrelationService.instance) {
      CorrelationService.instance = new CorrelationService();
    }
    return CorrelationService.instance;
  }

  generateCorrelationId(): string {
    return `plc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  createContext(userId?: string, parentCorrelationId?: string): CorrelationContext {
    const context: CorrelationContext = {
      correlationId: this.generateCorrelationId(),
      parentCorrelationId,
      userId,
      sessionId: parentCorrelationId ? 
        this.contexts.get(parentCorrelationId)?.sessionId || this.generateSessionId() :
        this.generateSessionId(),
      timestamp: Date.now(),
    };

    this.contexts.set(context.correlationId, context);
    return context;
  }

  getContext(correlationId: string): CorrelationContext | undefined {
    return this.contexts.get(correlationId);
  }

  updateContext(correlationId: string, updates: Partial<CorrelationContext>): void {
    const existing = this.contexts.get(correlationId);
    if (existing) {
      const updated = {
        ...existing,
        ...updates,
        timestamp: Date.now(),
      };
      this.contexts.set(correlationId, updated);
    }
  }

  getRequestHeaders(correlationId: string): Record<string, string> {
    const context = this.contexts.get(correlationId);
    if (!context) {
      throw new Error(`Correlation context not found: ${correlationId}`);
    }

    const headers: Record<string, string> = {
      'X-Correlation-ID': context.correlationId,
      'X-Session-ID': context.sessionId,
      'X-Timestamp': context.timestamp.toString(),
    };

    if (context.parentCorrelationId) {
      headers['X-Parent-Correlation-ID'] = context.parentCorrelationId;
    }

    if (context.userId) {
      headers['X-User-ID'] = context.userId;
    }

    return headers;
  }

  cleanup(): void {
    // Remove contexts older than 1 hour
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    for (const [correlationId, context] of this.contexts) {
      if (context.timestamp < oneHourAgo) {
        this.contexts.delete(correlationId);
      }
    }
  }
}

// Utility functions
export const correlationService = CorrelationService.getInstance();

export const generateCorrelationId = () => correlationService.generateCorrelationId();
export const generateSessionId = () => correlationService.generateSessionId();
export const createCorrelationContext = (userId?: string, parentId?: string) => 
  correlationService.createContext(userId, parentId);
```

#### **File: `src/lib/utils/correlationUtils.ts`**
```typescript
export const generateCorrelationId = (): string => {
  return `plc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

export const generateSessionId = (): string => {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

export const generateTransactionId = (): string => {
  return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

export const generateIdempotencyKey = (operation: string, params: any = {}): string => {
  const paramString = JSON.stringify(params);
  const hash = btoa(paramString).replace(/[^a-zA-Z0-9]/g, '');
  return `idem_${operation}_${hash}_${Date.now()}`;
};
```

### **D2: Transaction Management Service**
*Duration: 45-60 minutes*

#### **File: `src/lib/services/TransactionManager.ts`**
```typescript
import { Transaction, TransactionType, TransactionStatus } from '../../types/enterprise';
import { generateTransactionId } from '../utils/correlationUtils';

export class TransactionManager {
  private static instance: TransactionManager;
  private transactions: Map<string, Transaction> = new Map();
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): TransactionManager {
    if (!TransactionManager.instance) {
      TransactionManager.instance = new TransactionManager();
    }
    return TransactionManager.instance;
  }

  async executeTransaction<T>(
    type: TransactionType,
    correlationId: string,
    idempotencyKey: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const transactionId = generateTransactionId();
    
    // Create transaction record
    const transaction: Transaction = {
      id: transactionId,
      correlationId,
      idempotencyKey,
      type,
      status: 'pending',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.transactions.set(transactionId, transaction);

    try {
      // Update status to processing
      this.updateTransactionStatus(transactionId, 'processing');
      
      // Execute the operation
      const result = await operation();
      
      // Mark as completed
      this.updateTransactionStatus(transactionId, 'completed');
      
      return result;
    } catch (error) {
      // Mark as failed and potentially retry
      this.updateTransactionStatus(transactionId, 'failed');
      
      if (this.shouldRetry(transaction)) {
        return this.scheduleRetry(transaction, operation);
      }
      
      throw error;
    }
  }

  private updateTransactionStatus(transactionId: string, status: TransactionStatus): void {
    const transaction = this.transactions.get(transactionId);
    if (transaction) {
      transaction.status = status;
      transaction.updatedAt = new Date();
      this.transactions.set(transactionId, transaction);
    }
  }

  private shouldRetry(transaction: Transaction): boolean {
    const maxRetries = this.getMaxRetries(transaction.type);
    return transaction.retryCount < maxRetries;
  }

  private getMaxRetries(type: TransactionType): number {
    const retryConfig = {
      pet_favorite: 3,
      adoption_application: 5,
      service_booking: 5,
      event_rsvp: 3,
      social_interaction: 2,
    };
    return retryConfig[type] || 3;
  }

  private async scheduleRetry<T>(
    transaction: Transaction, 
    operation: () => Promise<T>
  ): Promise<T> {
    const retryDelay = this.calculateRetryDelay(transaction.retryCount);
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(async () => {
        try {
          transaction.retryCount++;
          transaction.status = 'processing';
          transaction.updatedAt = new Date();
          
          const result = await operation();
          this.updateTransactionStatus(transaction.id, 'completed');
          
          this.retryQueue.delete(transaction.id);
          resolve(result);
        } catch (error) {
          if (this.shouldRetry(transaction)) {
            // Schedule another retry
            resolve(this.scheduleRetry(transaction, operation));
          } else {
            this.updateTransactionStatus(transaction.id, 'failed');
            this.retryQueue.delete(transaction.id);
            reject(error);
          }
        }
      }, retryDelay);

      this.retryQueue.set(transaction.id, timeoutId);
    });
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s
    return Math.min(1000 * Math.pow(2, retryCount), 30000);
  }

  getTransaction(transactionId: string): Transaction | undefined {
    return this.transactions.get(transactionId);
  }

  getTransactionsByCorrelationId(correlationId: string): Transaction[] {
    return Array.from(this.transactions.values())
      .filter(t => t.correlationId === correlationId);
  }

  cancelTransaction(transactionId: string): boolean {
    const transaction = this.transactions.get(transactionId);
    if (transaction && transaction.status === 'pending') {
      this.updateTransactionStatus(transactionId, 'cancelled');
      
      // Cancel retry if scheduled
      const retryTimeout = this.retryQueue.get(transactionId);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
        this.retryQueue.delete(transactionId);
      }
      
      return true;
    }
    return false;
  }

  cleanup(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [transactionId, transaction] of this.transactions) {
      if (transaction.updatedAt < oneDayAgo && 
          ['completed', 'failed', 'cancelled'].includes(transaction.status)) {
        this.transactions.delete(transactionId);
      }
    }
  }
}

export const transactionManager = TransactionManager.getInstance();
```

### **D3: Idempotency Service**
*Duration: 30-45 minutes*

#### **File: `src/lib/services/IdempotencyService.ts`**
```typescript
import { IdempotencyRecord } from '../../types/enterprise';

export class IdempotencyService {
  private static instance: IdempotencyService;
  private records: Map<string, IdempotencyRecord> = new Map();

  static getInstance(): IdempotencyService {
    if (!IdempotencyService.instance) {
      IdempotencyService.instance = new IdempotencyService();
    }
    return IdempotencyService.instance;
  }

  async executeIdempotent<T>(
    idempotencyKey: string,
    correlationId: string,
    operation: () => Promise<T>,
    expirationMinutes: number = 60
  ): Promise<T> {
    // Check if we already have a result for this key
    const existing = this.records.get(idempotencyKey);
    
    if (existing && existing.expiresAt > new Date()) {
      // Return cached result
      return existing.result;
    }

    try {
      // Execute the operation
      const result = await operation();
      
      // Cache the result
      const record: IdempotencyRecord = {
        key: idempotencyKey,
        correlationId,
        result,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + expirationMinutes * 60 * 1000),
      };
      
      this.records.set(idempotencyKey, record);
      
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  }

  hasRecord(idempotencyKey: string): boolean {
    const record = this.records.get(idempotencyKey);
    return record !== undefined && record.expiresAt > new Date();
  }

  getRecord(idempotencyKey: string): IdempotencyRecord | undefined {
    const record = this.records.get(idempotencyKey);
    return record && record.expiresAt > new Date() ? record : undefined;
  }

  invalidateRecord(idempotencyKey: string): void {
    this.records.delete(idempotencyKey);
  }

  cleanup(): void {
    const now = new Date();
    
    for (const [key, record] of this.records) {
      if (record.expiresAt <= now) {
        this.records.delete(key);
      }
    }
  }
}

export const idempotencyService = IdempotencyService.getInstance();
```

---

## **Phase E: SignalR Integration** (Day 7)

### **E1: SignalR Service Setup**
*Duration: 60-90 minutes*

#### **File: `src/lib/services/SignalRService.ts`**
```typescript
import { HubConnection, HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { SignalREventHandlers } from '../../types/signalr';
import { correlationService } from './CorrelationService';

export class SignalRService {
  private static instance: SignalRService;
  private connection: HubConnection | null = null;
  private eventHandlers: SignalREventHandlers = {};
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  static getInstance(): SignalRService {
    if (!SignalRService.instance) {
      SignalRService.instance = new SignalRService();
    }
    return SignalRService.instance;
  }

  async connect(): Promise<void> {
    if (this.connection?.state === 'Connected') {
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    this.connection = new HubConnectionBuilder()
      .withUrl(`${apiUrl}/hubs/petLove`, {
        headers: this.getCorrelationHeaders(),
      })
      .withAutomaticReconnect([0, 2000, 10000, 30000])
      .configureLogging(LogLevel.Information)
      .build();

    this.setupEventHandlers();
    this.setupConnectionEvents();

    try {
      await this.connection.start();
      console.log('SignalR connection established');
      this.reconnectAttempts = 0;
    } catch (error) {
      console.error('SignalR connection failed:', error);
      this.handleConnectionError();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Pet-related events
    this.connection.on('PetAdoptionStatusChanged', (petId: string, status: string) => {
      const correlationId = correlationService.generateCorrelationId();
      console.log(`Pet ${petId} adoption status changed to ${status}`, { correlationId });
      this.eventHandlers.onPetAdoptionStatusChanged?.(petId, status);
    });

    // Service-related events
    this.connection.on('ServiceAvailabilityChanged', (serviceId: string, availability: boolean) => {
      const correlationId = correlationService.generateCorrelationId();
      console.log(`Service ${serviceId} availability changed to ${availability}`, { correlationId });
      this.eventHandlers.onServiceAvailabilityChanged?.(serviceId, availability);
    });

    // Event-related events
    this.connection.on('EventCapacityChanged', (eventId: string, capacity: number) => {
      const correlationId = correlationService.generateCorrelationId();
      console.log(`Event ${eventId} capacity changed to ${capacity}`, { correlationId });
      this.eventHandlers.onEventCapacityChanged?.(eventId, capacity);
    });

    // Community events
    this.connection.on('CommunityPostCreated', (post: any) => {
      const correlationId = correlationService.generateCorrelationId();
      console.log('New community post created', { correlationId, postId: post.id });
      this.eventHandlers.onCommunityPostCreated?.(post);
    });

    // User notifications
    this.connection.on('UserNotification', (notification: any) => {
      const correlationId = correlationService.generateCorrelationId();
      console.log('User notification received', { correlationId, notificationId: notification.id });
      this.eventHandlers.onUserNotification?.(notification);
    });
  }

  private setupConnectionEvents(): void {
    if (!this.connection) return;

    this.connection.onreconnecting(() => {
      console.log('SignalR reconnecting...');
    });

    this.connection.onreconnected((connectionId) => {
      console.log('SignalR reconnected:', connectionId);
      this.reconnectAttempts = 0;
    });

    this.connection.onclose((error) => {
      console.log('SignalR connection closed:', error);
      this.handleConnectionError();
    });
  }

  private handleConnectionError(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      setTimeout(() => {
        this.connect().catch(console.error);
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  private getCorrelationHeaders(): Record<string, string> {
    const context = correlationService.createContext();
    return correlationService.getRequestHeaders(context.correlationId);
  }

  setEventHandlers(handlers: SignalREventHandlers): void {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  async sendMessage(method: string, ...args: any[]): Promise<void> {
    if (this.connection?.state === 'Connected') {
      const correlationId = correlationService.generateCorrelationId();
      await this.connection.invoke(method, correlationId, ...args);
    } else {
      throw new Error('SignalR connection not established');
    }
  }

  get connectionState(): string {
    return this.connection?.state || 'Disconnected';
  }

  get isConnected(): boolean {
    return this.connection?.state === 'Connected';
  }
}

export const signalRService = SignalRService.getInstance();
```

#### **File: `src/hooks/useSignalR.ts`**
```typescript
'use client';

import { useEffect, useState } from 'react';
import { signalRService } from '../lib/services/SignalRService';
import { SignalREventHandlers } from '../types/signalr';

export function useSignalR(eventHandlers?: SignalREventHandlers) {
  const [connectionState, setConnectionState] = useState<string>('Disconnected');
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    const connect = async () => {
      try {
        if (eventHandlers) {
          signalRService.setEventHandlers(eventHandlers);
        }
        
        await signalRService.connect();
        setConnectionState(signalRService.connectionState);
        setIsConnected(signalRService.isConnected);
      } catch (error) {
        console.error('Failed to connect to SignalR:', error);
      }
    };

    connect();

    // Set up polling to update connection state
    const interval = setInterval(() => {
      setConnectionState(signalRService.connectionState);
      setIsConnected(signalRService.isConnected);
    }, 1000);

    return () => {
      clearInterval(interval);
      signalRService.disconnect();
    };
  }, [eventHandlers]);

  const sendMessage = async (method: string, ...args: any[]) => {
    return signalRService.sendMessage(method, ...args);
  };

  return {
    connectionState,
    isConnected,
    sendMessage,
  };
}
```

---

## **Testing & Validation Plan**

### **Manual Testing Checklist**
- [ ] **Design System Test:** Visit `/design-system-test` to verify colors and components
- [ ] **Redux DevTools:** Check state management in browser DevTools
- [ ] **Console Logs:** Verify correlation IDs in browser console
- [ ] **Network Tab:** Check correlation headers in API requests
- [ ] **SignalR Connection:** Verify connection in Network/WebSocket tab

### **Automated Testing Setup**
```bash
# Add to package.json scripts
"test:design-system": "echo 'Design system validation'",
"test:enterprise": "echo 'Enterprise patterns validation'",
"validate:setup": "npm run build && npm run lint && npm run type-check"
```

---

## **Implementation Timeline Summary**

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| A | Day 1 (4-6 hours) | Design system integration, Tailwind config, CSS properties |
| B | Day 2 (3-4 hours) | Enterprise folder structure, TypeScript types |
| C | Day 3-4 (8-10 hours) | Redux store, middleware, slices, provider setup |
| D | Day 5-6 (8-12 hours) | Enterprise services (correlation, transaction, idempotency) |
| E | Day 7 (4-6 hours) | SignalR integration, connection management |

### **Total Estimated Time: 27-42 hours (5-7 working days)**

---

## **Ready for Implementation**
This plan provides step-by-step implementation of all SETUP-001 tasks. Each phase builds on the previous one, ensuring a solid enterprise foundation for Pet Love Community.