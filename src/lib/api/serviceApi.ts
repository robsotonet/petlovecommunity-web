import { createApi } from '@reduxjs/toolkit/query/react';
import { createServiceApiBaseQuery } from './enterpriseBaseQuery';
import type {
  Service,
  ServiceBooking,
  GetServicesParams,
  ServiceSearchParams,
  ServiceSearchResponse,
  CreateServiceBookingRequest,
  UpdateServiceBookingRequest,
  GetServiceBookingsParams,
} from '@/types/api';

export const serviceApi = createApi({
  reducerPath: 'serviceApi',
  baseQuery: createServiceApiBaseQuery(),
  tagTypes: ['Service', 'Booking', 'Provider'],
  endpoints: (builder) => ({
    // Service Discovery Endpoints
    getServices: builder.query<Service[], GetServicesParams>({
      query: (params) => ({
        url: '',
        params: {
          category: params.category,
          location: params.location,
          date: params.date,
          minPrice: params.minPrice,
          maxPrice: params.maxPrice,
          rating: params.rating,
          page: params.page || 1,
          limit: params.limit || 20,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Service' as const, id })),
              { type: 'Service', id: 'LIST' },
            ]
          : [{ type: 'Service', id: 'LIST' }],
    }),

    getServiceById: builder.query<Service, string>({
      query: (id) => `/${id}`,
      providesTags: (result, error, id) => [{ type: 'Service', id }],
    }),

    // Search services with advanced filtering
    searchServices: builder.query<ServiceSearchResponse, ServiceSearchParams>({
      query: (params) => ({
        url: '/search',
        params: {
          q: params.query,
          filters: JSON.stringify(params.filters),
          sort: params.sort || 'relevance',
          page: params.page || 1,
          limit: params.limit || 20,
        },
      }),
      providesTags: [{ type: 'Service', id: 'SEARCH' }],
    }),

    // Service availability check
    checkServiceAvailability: builder.query<
      { available: boolean; availableSlots: string[] },
      { serviceId: string; date: string }
    >({
      query: ({ serviceId, date }) => ({
        url: `/${serviceId}/availability`,
        params: { date },
      }),
    }),

    // Service Booking Endpoints (Mutations with Transactions)
    createServiceBooking: builder.mutation<ServiceBooking, CreateServiceBookingRequest>({
      query: (booking) => ({
        url: `/bookings`,
        method: 'POST',
        body: {
          serviceId: booking.serviceId,
          petInfo: booking.petInfo,
          scheduledDate: booking.scheduledDate,
          scheduledTime: booking.scheduledTime,
          specialInstructions: booking.specialInstructions,
          paymentMethodId: booking.paymentMethodId,
        },
      }),
      invalidatesTags: (result, error, { serviceId }) => [
        { type: 'Service', id: serviceId },
        { type: 'Booking', id: 'LIST' },
      ],
    }),

    updateServiceBooking: builder.mutation<ServiceBooking, UpdateServiceBookingRequest>({
      query: ({ bookingId, updates }) => ({
        url: `/bookings/${bookingId}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { bookingId }) => [
        { type: 'Booking', id: bookingId },
        { type: 'Booking', id: 'LIST' },
      ],
    }),

    cancelServiceBooking: builder.mutation<void, { bookingId: string; reason: string }>({
      query: ({ bookingId, reason }) => ({
        url: `/bookings/${bookingId}/cancel`,
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { bookingId }) => [
        { type: 'Booking', id: bookingId },
        { type: 'Booking', id: 'LIST' },
      ],
    }),

    confirmServiceBooking: builder.mutation<ServiceBooking, string>({
      query: (bookingId) => ({
        url: `/bookings/${bookingId}/confirm`,
        method: 'POST',
      }),
      invalidatesTags: (result, error, bookingId) => [
        { type: 'Booking', id: bookingId },
        { type: 'Booking', id: 'LIST' },
      ],
    }),

    // Booking Management
    getServiceBookings: builder.query<ServiceBooking[], GetServiceBookingsParams>({
      query: (params) => ({
        url: '/bookings',
        params: {
          status: params.status,
          serviceCategory: params.serviceCategory,
          startDate: params.startDate,
          endDate: params.endDate,
          page: params.page || 1,
          limit: params.limit || 20,
        },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: 'Booking' as const, id })),
              { type: 'Booking', id: 'LIST' },
            ]
          : [{ type: 'Booking', id: 'LIST' }],
    }),

    getServiceBookingById: builder.query<ServiceBooking, string>({
      query: (id) => `/bookings/${id}`,
      providesTags: (result, error, id) => [{ type: 'Booking', id }],
    }),

    // Payment and pricing
    calculateServicePrice: builder.query<
      { basePrice: number; taxes: number; fees: number; totalPrice: number },
      { serviceId: string; date: string; duration?: number }
    >({
      query: ({ serviceId, date, duration }) => ({
        url: `/${serviceId}/price`,
        params: { date, duration },
      }),
    }),

    processServicePayment: builder.mutation<
      { paymentId: string; status: 'success' | 'failed'; receiptUrl?: string },
      { bookingId: string; paymentMethodId: string; amount: number }
    >({
      query: ({ bookingId, paymentMethodId, amount }) => ({
        url: `/bookings/${bookingId}/payment`,
        method: 'POST',
        body: { paymentMethodId, amount },
      }),
      invalidatesTags: (result, error, { bookingId }) => [
        { type: 'Booking', id: bookingId },
      ],
    }),

    // Service provider ratings and reviews
    rateService: builder.mutation<
      void,
      { bookingId: string; rating: number; review: string; photos?: string[] }
    >({
      query: ({ bookingId, rating, review, photos }) => ({
        url: `/bookings/${bookingId}/review`,
        method: 'POST',
        body: { rating, review, photos },
      }),
      invalidatesTags: (result, error, { bookingId }) => [
        { type: 'Booking', id: bookingId },
        { type: 'Service', id: 'LIST' }, // Rating affects service listing
      ],
    }),

    // Get service reviews
    getServiceReviews: builder.query<
      {
        reviews: Array<{
          id: string;
          rating: number;
          review: string;
          reviewerName: string;
          createdAt: string;
          photos?: string[];
        }>;
        averageRating: number;
        totalReviews: number;
      },
      { serviceId: string; page?: number; limit?: number }
    >({
      query: ({ serviceId, page, limit }) => ({
        url: `/${serviceId}/reviews`,
        params: { page: page || 1, limit: limit || 10 },
      }),
    }),

    // Emergency booking for urgent services
    createEmergencyBooking: builder.mutation<
      ServiceBooking,
      {
        location: string;
        petInfo: any;
        urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
        description: string;
        contactPhone: string;
      }
    >({
      query: (emergencyRequest) => ({
        url: '/bookings/emergency',
        method: 'POST',
        body: emergencyRequest,
      }),
      invalidatesTags: [{ type: 'Booking', id: 'LIST' }],
    }),

    // Service provider management (for providers using the app)
    updateServiceProviderProfile: builder.mutation<
      void,
      { providerId: string; updates: any }
    >({
      query: ({ providerId, updates }) => ({
        url: `/providers/${providerId}`,
        method: 'PATCH',
        body: updates,
      }),
      invalidatesTags: (result, error, { providerId }) => [
        { type: 'Provider', id: providerId },
      ],
    }),

    updateServiceAvailability: builder.mutation<
      void,
      { serviceId: string; availability: any }
    >({
      query: ({ serviceId, availability }) => ({
        url: `/${serviceId}/availability`,
        method: 'PUT',
        body: availability,
      }),
      invalidatesTags: (result, error, { serviceId }) => [
        { type: 'Service', id: serviceId },
      ],
    }),
  }),
});

// Export hooks for components
export const {
  // Queries
  useGetServicesQuery,
  useGetServiceByIdQuery,
  useSearchServicesQuery,
  useCheckServiceAvailabilityQuery,
  useGetServiceBookingsQuery,
  useGetServiceBookingByIdQuery,
  useCalculateServicePriceQuery,
  useGetServiceReviewsQuery,
  
  // Mutations
  useCreateServiceBookingMutation,
  useUpdateServiceBookingMutation,
  useCancelServiceBookingMutation,
  useConfirmServiceBookingMutation,
  useProcessServicePaymentMutation,
  useRateServiceMutation,
  useCreateEmergencyBookingMutation,
  useUpdateServiceProviderProfileMutation,
  useUpdateServiceAvailabilityMutation,
  
  // Utilities
  util: serviceApiUtil,
} = serviceApi;