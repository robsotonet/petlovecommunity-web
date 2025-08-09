// Enterprise correlation and transaction types
export interface CorrelationContext {
  correlationId: string;
  parentCorrelationId?: string;
  userId?: string;
  sessionId: string;
  timestampMs: number;
}

export interface Transaction {
  id: string;
  correlationId: string;
  idempotencyKey: string;
  type: TransactionType;
  status: TransactionStatus;
  retryCount: number;
  createdAtMs: number;
  updatedAtMs: number;
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
  createdAtMs: number;
  expiresAtMs: number;
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
  timestampMs: number;
  success: boolean;
  errors?: string[];
}