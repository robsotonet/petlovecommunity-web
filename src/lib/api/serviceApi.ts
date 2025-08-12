import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../store';

export const serviceApi = createApi({
  reducerPath: 'serviceApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api/services` : 'http://localhost:5248/api/services',
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState;
      const correlationId = state.correlation.currentContext.correlationId;
      const sessionId = state.correlation.currentContext.sessionId;
      
      // Add enterprise headers
      headers.set('X-Correlation-ID', correlationId);
      headers.set('X-Session-ID', sessionId);
      headers.set('X-Timestamp', Date.now().toString());
      
      if (state.correlation.currentContext.userId) {
        headers.set('X-User-ID', state.correlation.currentContext.userId);
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