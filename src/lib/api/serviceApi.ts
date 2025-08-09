import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';
import { correlationService } from '../services/CorrelationService';

export const serviceApi = createApi({
  reducerPath: 'serviceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/services` : '/api/services',
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
      
      return headers;
    },
  }),
  tagTypes: ['Service', 'Booking'],
  endpoints: (builder) => ({
    // Placeholder endpoints - will be implemented in service features
    getServices: builder.query<any[], void>({
      query: () => '',
      providesTags: ['Service'],
    }),
  }),
});