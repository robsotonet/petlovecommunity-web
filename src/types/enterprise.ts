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