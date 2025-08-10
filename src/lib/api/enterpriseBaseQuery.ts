import { fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { RootState } from '../store';
import { correlationService } from '../services/CorrelationService';
import { TransactionManager } from '../services/TransactionManager';
import { IdempotencyService } from '../services/IdempotencyService';
import { loggingService, LogCategory } from '../services/LoggingService';
import { TransactionType } from '../../types/enterprise';

// Enhanced error type with enterprise context
interface EnterpriseError extends FetchBaseQueryError {
  correlationId?: string;
  transactionId?: string;
  retryable?: boolean;
}

// Transaction-aware base query configuration
interface EnterpriseBaseQueryConfig {
  baseUrl: string;
  enableTransactions?: boolean;
  enableIdempotency?: boolean;
  enableRetry?: boolean;
  maxRetryAttempts?: number;
  retryDelayMs?: number;
}

// Create enterprise-grade base query with transaction awareness
export function createEnterpriseBaseQuery(config: EnterpriseBaseQueryConfig): BaseQueryFn<
  string | FetchArgs,
  unknown,
  EnterpriseError
> {
  const {
    baseUrl,
    enableTransactions = true,
    enableIdempotency = true,
    enableRetry = true,
    maxRetryAttempts = 3,
    retryDelayMs = 2000,
  } = config;

  const baseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState, endpoint, type, forced }) => {
      const state = getState() as RootState;
      const currentContext = state.correlation.currentContext;
      
      // Enhanced correlation tracking for nested requests
      let contextToUse = currentContext;
      
      // For mutation operations, create child context to track the operation
      if (type === 'mutation' && endpoint) {
        try {
          contextToUse = correlationService.createChildContext(
            currentContext.correlationId, 
            currentContext.userId
          );
        } catch (error) {
          console.warn('Failed to create child correlation context, using current:', error);
        }
      }
      
      // Use enhanced correlation service for header generation
      const correlationHeaders = correlationService.getRequestHeaders(contextToUse.correlationId);
      
      // Apply all correlation headers
      Object.entries(correlationHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });
      
      // Add RTK Query specific headers
      headers.set('X-Query-Endpoint', endpoint || 'unknown');
      headers.set('X-Query-Type', type || 'unknown');
      
      if (forced) {
        headers.set('X-Forced-Refetch', 'true');
      }

      // Add environment-based configuration headers
      headers.set('X-Enterprise-Client', 'PetLoveCommunity-Web');
      headers.set('X-Enterprise-Version', process.env.npm_package_version || '0.1.0');
      
      return headers;
    },
  });

  // Transaction manager and services
  const transactionManager = TransactionManager.getInstance();
  const idempotencyService = IdempotencyService.getInstance();

  // Enhanced base query with enterprise features
  return async (args, api, extraOptions) => {
    const { endpoint, type } = api;
    const state = api.getState() as RootState;
    const correlationId = state.correlation.currentContext.correlationId;

    // Determine transaction type based on operation
    const getTransactionType = (endpoint?: string, type?: string): TransactionType => {
      if (type === 'mutation') {
        if (endpoint?.includes('adopt') || endpoint?.includes('favorite')) return 'pet_adoption';
        if (endpoint?.includes('booking') || endpoint?.includes('service')) return 'service_booking';
        if (endpoint?.includes('event') || endpoint?.includes('rsvp')) return 'event_rsvp';
        if (endpoint?.includes('post') || endpoint?.includes('comment') || endpoint?.includes('like')) return 'social_interaction';
        return 'api_mutation';
      }
      return 'api_query';
    };

    const transactionType = getTransactionType(endpoint, type);

    // For non-transaction operations (queries), use standard base query
    if (!enableTransactions || type !== 'mutation') {
      const startTime = Date.now();
      
      // Log API request
      const requestLogId = loggingService.logApiRequest(
        typeof args === 'string' ? 'GET' : args.method || 'GET',
        typeof args === 'string' ? args : args.url,
        undefined, // headers will be added by baseQuery
        typeof args === 'object' && 'body' in args ? args.body : undefined,
        startTime
      );
      
      let result = await baseQuery(args, api, extraOptions);
      const duration = Date.now() - startTime;
      
      // Log API response
      if (result.error) {
        loggingService.logApiResponse(
          requestLogId,
          typeof result.error.status === 'number' ? result.error.status : 500,
          'Error',
          undefined,
          result.error.data,
          duration
        );
      } else {
        loggingService.logApiResponse(
          requestLogId,
          200, // Assume success status
          'OK',
          undefined,
          result.data,
          duration
        );
      }
      
      // Add correlation context to successful responses
      if (result.data) {
        (result as any).meta = {
          ...((result as any).meta || {}),
          correlationId,
          transactionType,
        };
      }
      
      // Add enterprise context to errors
      if (result.error) {
        (result.error as EnterpriseError).correlationId = correlationId;
        (result.error as EnterpriseError).retryable = isRetryableError(result.error);
      }
      
      return result;
    }

    // Generate idempotency key for mutations
    const idempotencyKey = enableIdempotency 
      ? idempotencyService.generateIdempotencyKey(args, correlationId)
      : `${correlationId}_${Date.now()}`;

    // Execute mutation within transaction context
    try {
      // Log transaction start
      loggingService.logTransactionStart(
        `${correlationId}_${Date.now()}`, // Simple transaction ID
        transactionType,
        { 
          endpoint,
          idempotencyKey,
          args: typeof args === 'string' ? { url: args } : args
        }
      );
      
      const transactionStartTime = Date.now();
      
      const result = await transactionManager.executeTransaction(
        transactionType,
        correlationId,
        idempotencyKey,
        async () => {
          // Check for existing idempotent result
          if (enableIdempotency) {
            const existingResult = await idempotencyService.getExistingResult(idempotencyKey);
            if (existingResult) {
              loggingService.info(LogCategory.TRANSACTION, 
                `Returning cached idempotent result for key: ${idempotencyKey}`,
                { correlationId, idempotencyKey }
              );
              return existingResult;
            }
          }

          const startTime = Date.now();
          
          // Log API request
          const requestLogId = loggingService.logApiRequest(
            typeof args === 'string' ? 'POST' : args.method || 'POST',
            typeof args === 'string' ? args : args.url,
            undefined, // headers will be added by baseQuery
            typeof args === 'object' && 'body' in args ? args.body : undefined,
            startTime
          );

          // Execute the actual API call
          const apiResult = await baseQuery(args, api, extraOptions);
          const duration = Date.now() - startTime;
          
          // Handle API errors within transaction context
          if (apiResult.error) {
            const enterpriseError = apiResult.error as EnterpriseError;
            enterpriseError.correlationId = correlationId;
            enterpriseError.retryable = isRetryableError(apiResult.error);
            
            // Log API error response
            loggingService.logApiResponse(
              requestLogId,
              typeof enterpriseError.status === 'number' ? enterpriseError.status : 500,
              'Error',
              undefined,
              enterpriseError.data,
              duration
            );
            
            // Retry logic for retryable errors
            if (enableRetry && enterpriseError.retryable) {
              loggingService.warn(LogCategory.TRANSACTION, 
                `Retryable error detected, attempting retry`,
                { 
                  correlationId, 
                  error: enterpriseError.data,
                  status: enterpriseError.status
                }
              );
              
              return await executeWithRetry(
                () => baseQuery(args, api, extraOptions),
                maxRetryAttempts,
                retryDelayMs,
                correlationId
              );
            }
            
            throw new Error(`API Error: ${enterpriseError.status} - ${JSON.stringify(enterpriseError.data)}`);
          }

          // Log successful API response
          loggingService.logApiResponse(
            requestLogId,
            200, // Assume success status
            'OK',
            undefined,
            apiResult.data,
            duration
          );

          // Store successful result for idempotency
          if (enableIdempotency && apiResult.data) {
            await idempotencyService.storeResult(idempotencyKey, apiResult.data, correlationId);
          }

          return apiResult.data;
        }
      );
      
      const transactionDuration = Date.now() - transactionStartTime;
      
      // Log transaction completion
      loggingService.logTransactionEnd(
        `${correlationId}_${transactionStartTime}`,
        transactionType,
        'completed',
        transactionDuration,
        { 
          endpoint,
          idempotencyKey,
          resultSize: result ? JSON.stringify(result).length : 0
        }
      );

      // Return successful result with enterprise metadata
      return {
        data: result,
        meta: {
          correlationId,
          transactionType,
          idempotencyKey,
          fromCache: false,
        },
      };

    } catch (error) {
      // Log transaction failure
      loggingService.logTransactionEnd(
        `${correlationId}_${Date.now()}`,
        transactionType,
        'failed',
        undefined,
        { 
          endpoint,
          idempotencyKey,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      );
      
      // Log the error with full context
      loggingService.error(LogCategory.TRANSACTION, 
        `Transaction failed: ${transactionType}`,
        {
          correlationId,
          transactionType,
          idempotencyKey,
          endpoint,
          args: typeof args === 'string' ? { url: args } : args
        },
        error instanceof Error ? error : new Error(String(error))
      );
      
      // Enhanced error handling with enterprise context
      const enterpriseError: EnterpriseError = {
        status: 'CUSTOM_ERROR',
        error: 'Transaction failed',
        data: {
          message: error instanceof Error ? error.message : 'Unknown transaction error',
          correlationId,
          transactionType,
          idempotencyKey,
          timestamp: new Date().toISOString(),
        },
        correlationId,
        retryable: error instanceof Error && error.message.includes('retryable'),
      };

      return { error: enterpriseError };
    }
  };
}

// Helper function to determine if an error is retryable
function isRetryableError(error: FetchBaseQueryError): boolean {
  if (typeof error.status === 'number') {
    // Retry on 5xx server errors and specific 4xx errors
    return error.status >= 500 || 
           error.status === 408 || // Request Timeout
           error.status === 409 || // Conflict
           error.status === 429;   // Too Many Requests
  }
  
  if (error.status === 'FETCH_ERROR' || error.status === 'TIMEOUT_ERROR') {
    return true;
  }
  
  return false;
}

// Retry logic with exponential backoff
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  maxAttempts: number,
  baseDelayMs: number,
  correlationId: string
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        console.error(`[Enterprise] All retry attempts failed for correlation: ${correlationId}`, error);
        break;
      }
      
      // Exponential backoff with jitter
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      const jitteredDelay = delay + Math.random() * 1000; // Add up to 1s jitter
      
      console.warn(`[Enterprise] Retry attempt ${attempt}/${maxAttempts} after ${jitteredDelay}ms (correlation: ${correlationId})`);
      
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw lastError;
}

// Pre-configured enterprise base queries for common use cases
export const createPetApiBaseQuery = () => 
  createEnterpriseBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/pets` : '/api/pets',
    enableTransactions: true,
    enableIdempotency: true,
    enableRetry: true,
    maxRetryAttempts: 3,
    retryDelayMs: 2000,
  });

export const createServiceApiBaseQuery = () => 
  createEnterpriseBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/services` : '/api/services',
    enableTransactions: true,
    enableIdempotency: true,
    enableRetry: true,
    maxRetryAttempts: 3,
    retryDelayMs: 2000,
  });