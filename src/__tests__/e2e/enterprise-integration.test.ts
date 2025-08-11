/**
 * End-to-End Enterprise Integration Tests
 * Tests the complete enterprise stack including:
 * - Transaction-aware API calls
 * - Idempotency handling
 * - Error recovery scenarios  
 * - Correlation tracking
 * - Logging and metrics
 * - Error boundaries
 */

import { beforeAll, afterAll, describe, it, expect, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';

import { 
  petApi, 
  serviceApi,
  useCreateAdoptionApplicationMutation,
  useCreateServiceBookingMutation,
} from '@/lib/api';
import { store as defaultStore } from '@/lib/store';
import { 
  correlationService,
  loggingService,
  TransactionManager,
  IdempotencyService,
} from '@/lib/services';
import { LogCategory, LogLevel } from '@/lib/services/LoggingService';
import type { 
  CreateAdoptionApplicationRequest,
  CreateServiceBookingRequest,
  AdoptionApplication,
  ServiceBooking,
} from '@/types/api';

// Mock server for API responses
const server = setupServer();

// Test wrapper component
const createTestWrapper = (testStore = defaultStore) => {
  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(Provider, { store: testStore }, children);
  };
};

// Helper to create isolated store for each test
const createTestStore = () => {
  return configureStore({
    reducer: {
      correlation: defaultStore.getState().correlation,
      transaction: defaultStore.getState().transaction,
      [petApi.reducerPath]: petApi.reducer,
      [serviceApi.reducerPath]: serviceApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware()
        .concat(petApi.middleware)
        .concat(serviceApi.middleware),
  });
};

describe('Enterprise Integration E2E Tests', () => {
  let testStore: ReturnType<typeof createTestStore>;
  let transactionManager: TransactionManager;
  let idempotencyService: IdempotencyService;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    transactionManager = TransactionManager.getInstance();
    idempotencyService = IdempotencyService.getInstance();
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    server.resetHandlers();
    testStore = createTestStore();
    
    // Clear services state
    correlationService.cleanup();
    loggingService.cleanup();
  });

  describe('Pet Adoption Transaction Flow', () => {
    it('should handle successful adoption application with full enterprise features', async () => {
      // Setup mock API response
      const mockApplication: AdoptionApplication = {
        id: 'app-123',
        petId: 'pet-456',
        applicantInfo: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-0123',
          address: {
            city: 'Test City',
            state: 'TC',
            zipCode: '12345',
          },
          dateOfBirth: '1990-01-01',
          occupation: 'Software Engineer',
          emergencyContact: {
            name: 'Jane Doe',
            phone: '555-0124',
            relationship: 'Spouse',
          },
        },
        livingSituation: {
          housingType: 'house',
          ownsOrRents: 'owns',
          hasYard: true,
          yardFenced: true,
          householdMembers: [],
          otherPets: [],
          petAllergies: false,
          hoursAloneDaily: 4,
        },
        experience: {
          previousPets: [],
          experienceLevel: 'intermediate',
          trainingPlan: 'Positive reinforcement training',
        },
        references: [],
        message: 'I would love to adopt this pet!',
        status: 'pending',
        submittedAt: new Date().toISOString(),
      };

      server.use(
        http.post('http://localhost:5000/api/pets/:petId/adopt', async ({ request, params }) => {
          const body = await request.json() as any;
          
          // Validate enterprise headers
          expect(request.headers.get('X-Correlation-ID')).toBeTruthy();
          expect(request.headers.get('X-Session-ID')).toBeTruthy();
          expect(request.headers.get('X-Enterprise-Client')).toBe('PetLoveCommunity-Web');
          
          return HttpResponse.json(mockApplication);
        })
      );

      // Create correlation context
      const correlationContext = correlationService.createContext('user-123');
      
      // Render hook with mutation
      const { result } = renderHook(
        () => useCreateAdoptionApplicationMutation(),
        { wrapper: createTestWrapper(testStore) }
      );

      const [createApplication] = result.current;

      // Execute adoption application
      const applicationRequest: CreateAdoptionApplicationRequest = {
        petId: 'pet-456',
        applicantInfo: mockApplication.applicantInfo,
        livingSituation: mockApplication.livingSituation,
        experience: mockApplication.experience,
        references: [],
        message: 'I would love to adopt this pet!',
      };

      const response = await createApplication(applicationRequest).unwrap();

      // Verify response
      expect(response).toEqual(mockApplication);

      // Wait for async operations
      await waitFor(() => {
        // Verify correlation tracking
        const logs = loggingService.getLogs({
          correlationId: correlationContext.correlationId,
          category: LogCategory.API,
        });
        expect(logs.length).toBeGreaterThan(0);
        
        // Verify transaction logging
        const transactionLogs = loggingService.getLogs({
          correlationId: correlationContext.correlationId,
          category: LogCategory.TRANSACTION,
        });
        expect(transactionLogs.length).toBeGreaterThan(0);

        // Verify idempotency tracking (should have stored result)
        const metrics = loggingService.getMetrics();
        expect(metrics.requests.successful).toBeGreaterThan(0);
      });
    });

    it('should handle API errors with retry and correlation tracking', async () => {
      let attemptCount = 0;
      
      server.use(
        http.post('http://localhost:5000/api/pets/:petId/adopt', async ({ request }) => {
          attemptCount++;
          
          // Validate correlation headers are present on retries
          expect(request.headers.get('X-Correlation-ID')).toBeTruthy();
          
          if (attemptCount < 3) {
            // Return retryable error for first 2 attempts
            return new HttpResponse(null, { 
              status: 503,
              statusText: 'Service Temporarily Unavailable'
            });
          } else {
            // Return success on 3rd attempt
            return HttpResponse.json({
              id: 'app-retry-123',
              petId: 'pet-456',
              status: 'pending',
            });
          }
        })
      );

      const correlationContext = correlationService.createContext('user-retry-123');
      
      const { result } = renderHook(
        () => useCreateAdoptionApplicationMutation(),
        { wrapper: createTestWrapper(testStore) }
      );

      const [createApplication] = result.current;

      const response = await createApplication({
        petId: 'pet-456',
        applicantInfo: {} as any,
        livingSituation: {} as any,
        experience: {} as any,
        references: [],
        message: 'Retry test',
      }).unwrap();

      // Verify successful response after retries
      expect(response.id).toBe('app-retry-123');
      expect(attemptCount).toBe(3);

      await waitFor(() => {
        // Verify retry attempts were logged
        const logs = loggingService.getLogs({
          correlationId: correlationContext.correlationId,
          level: LogLevel.WARN,
        });
        
        const retryLogs = logs.filter(log => 
          log.message.includes('retry') || log.message.includes('Retry')
        );
        expect(retryLogs.length).toBeGreaterThan(0);
      });
    });

    it('should prevent duplicate submissions with idempotency', async () => {
      let requestCount = 0;
      const mockResponse = {
        id: 'app-idempotent-123',
        petId: 'pet-789',
        status: 'pending',
      };

      server.use(
        http.post('http://localhost:5000/api/pets/:petId/adopt', async ({ request }) => {
          requestCount++;
          
          // Validate idempotency headers
          expect(request.headers.get('X-Correlation-ID')).toBeTruthy();
          expect(request.headers.get('X-Idempotency-Key')).toBeTruthy();
          
          return HttpResponse.json(mockResponse);
        })
      );

      const correlationContext = correlationService.createContext('user-idempotent-123');
      
      const { result } = renderHook(
        () => useCreateAdoptionApplicationMutation(),
        { wrapper: createTestWrapper(testStore) }
      );

      const [createApplication] = result.current;

      const applicationRequest: CreateAdoptionApplicationRequest = {
        petId: 'pet-789',
        applicantInfo: {} as any,
        livingSituation: {} as any,
        experience: {} as any,
        references: [],
        message: 'Idempotency test',
      };

      // Make the same request twice rapidly
      const [response1, response2] = await Promise.all([
        createApplication(applicationRequest).unwrap(),
        createApplication(applicationRequest).unwrap(),
      ]);

      // Both should return the same result
      expect(response1).toEqual(mockResponse);
      expect(response2).toEqual(mockResponse);

      await waitFor(() => {
        // Verify idempotency was used
        const logs = loggingService.getLogs({
          correlationId: correlationContext.correlationId,
          category: LogCategory.TRANSACTION,
        });
        
        const idempotentLogs = logs.filter(log => 
          log.message.includes('idempotent') || log.message.includes('cached')
        );
        expect(idempotentLogs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Service Booking Transaction Flow', () => {
    it('should handle complex service booking with payment processing', async () => {
      const mockBooking: ServiceBooking = {
        id: 'booking-123',
        serviceId: 'service-456',
        customerId: 'user-789',
        petInfo: {
          name: 'Buddy',
          type: 'dog',
          breed: 'Golden Retriever',
          age: 36,
          weight: 65,
          specialNeeds: [],
          vaccinated: true,
          medications: [],
          emergencyContact: {
            name: 'John Doe',
            phone: '555-0123',
          },
        },
        scheduledDate: '2024-01-15',
        scheduledTime: '14:00',
        duration: 60,
        totalPrice: 85.00,
        status: 'confirmed',
        bookedAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        paymentStatus: 'paid',
      };

      server.use(
        http.post('http://localhost:5000/api/services/bookings', async ({ request }) => {
          const body = await request.json() as any;
          
          // Validate enterprise headers and transaction context
          expect(request.headers.get('X-Correlation-ID')).toBeTruthy();
          expect(request.headers.get('X-Transaction-ID')).toBeTruthy();
          expect(request.headers.get('X-Idempotency-Key')).toBeTruthy();
          
          // Validate request structure
          expect(body.serviceId).toBe('service-456');
          expect(body.petInfo).toBeDefined();
          expect(body.paymentMethodId).toBeTruthy();
          
          return HttpResponse.json(mockBooking);
        })
      );

      const correlationContext = correlationService.createContext('user-booking-123');
      
      const { result } = renderHook(
        () => useCreateServiceBookingMutation(),
        { wrapper: createTestWrapper(testStore) }
      );

      const [createBooking] = result.current;

      const bookingRequest: CreateServiceBookingRequest = {
        serviceId: 'service-456',
        petInfo: mockBooking.petInfo,
        scheduledDate: '2024-01-15',
        scheduledTime: '14:00',
        specialInstructions: 'Please be gentle, first-time grooming',
        paymentMethodId: 'pm_test_123',
      };

      const response = await createBooking(bookingRequest).unwrap();

      expect(response).toEqual(mockBooking);

      await waitFor(() => {
        // Verify comprehensive logging
        const apiLogs = loggingService.getLogs({
          correlationId: correlationContext.correlationId,
          category: LogCategory.API,
        });
        expect(apiLogs.length).toBeGreaterThan(0);

        const transactionLogs = loggingService.getLogs({
          correlationId: correlationContext.correlationId,
          category: LogCategory.TRANSACTION,
        });
        expect(transactionLogs.length).toBeGreaterThan(0);

        // Verify metrics collection
        const metrics = loggingService.getMetrics();
        expect(metrics.transactions.total).toBeGreaterThan(0);
        expect(metrics.transactions.successful).toBeGreaterThan(0);
      });
    });

    it('should handle transaction rollback on payment failure', async () => {
      server.use(
        http.post('http://localhost:5000/api/services/bookings', async ({ request }) => {
          // Simulate payment processing failure
          return new HttpResponse(
            JSON.stringify({
              error: 'Payment declined',
              code: 'payment_failed',
              details: 'Insufficient funds',
            }),
            { 
              status: 402,
              statusText: 'Payment Required'
            }
          );
        })
      );

      const correlationContext = correlationService.createContext('user-payment-fail');
      
      const { result } = renderHook(
        () => useCreateServiceBookingMutation(),
        { wrapper: createTestWrapper(testStore) }
      );

      const [createBooking] = result.current;

      const bookingRequest: CreateServiceBookingRequest = {
        serviceId: 'service-fail',
        petInfo: {
          name: 'Max',
          type: 'dog',
          breed: 'Labrador',
          age: 24,
          weight: 70,
          specialNeeds: [],
          vaccinated: true,
          medications: [],
          emergencyContact: {
            name: 'Jane Doe',
            phone: '555-0124',
          },
        },
        scheduledDate: '2024-01-16',
        scheduledTime: '10:00',
        paymentMethodId: 'pm_fail_123',
      };

      // Expect the mutation to reject
      await expect(
        createBooking(bookingRequest).unwrap()
      ).rejects.toThrow();

      await waitFor(() => {
        // Verify error logging
        const errorLogs = loggingService.getLogs({
          correlationId: correlationContext.correlationId,
          level: LogLevel.ERROR,
        });
        expect(errorLogs.length).toBeGreaterThan(0);

        // Verify transaction failure logging
        const transactionLogs = loggingService.getLogs({
          correlationId: correlationContext.correlationId,
          category: LogCategory.TRANSACTION,
        });
        
        const failureLogs = transactionLogs.filter(log =>
          log.message.includes('failed') || log.metadata?.status === 'failed'
        );
        expect(failureLogs.length).toBeGreaterThan(0);

        // Verify metrics reflect the failure
        const metrics = loggingService.getMetrics();
        expect(metrics.transactions.failed).toBeGreaterThan(0);
        expect(metrics.errors.total).toBeGreaterThan(0);
      });
    });
  });

  describe('Cross-Service Transaction Coordination', () => {
    it('should maintain correlation across multiple service calls', async () => {
      const correlationId = correlationService.createContext('user-multi-123').correlationId;
      let capturedCorrelationIds: string[] = [];

      server.use(
        http.get('http://localhost:5000/api/pets', async ({ request }) => {
          const correlationHeader = request.headers.get('X-Correlation-ID');
          if (correlationHeader) {
            capturedCorrelationIds.push(correlationHeader);
          }
          return HttpResponse.json([]);
        }),
        http.get('http://localhost:5000/api/services', async ({ request }) => {
          const correlationHeader = request.headers.get('X-Correlation-ID');
          if (correlationHeader) {
            capturedCorrelationIds.push(correlationHeader);
          }
          return HttpResponse.json([]);
        })
      );

      const { result: petResult } = renderHook(
        () => petApi.useGetPetsQuery({}),
        { wrapper: createTestWrapper(testStore) }
      );

      const { result: serviceResult } = renderHook(
        () => serviceApi.useGetServicesQuery({}),
        { wrapper: createTestWrapper(testStore) }
      );

      await waitFor(() => {
        expect(petResult.current.isSuccess || petResult.current.isLoading).toBe(true);
        expect(serviceResult.current.isSuccess || serviceResult.current.isLoading).toBe(true);
      });

      // All requests should have correlation IDs from the same context family
      expect(capturedCorrelationIds.length).toBeGreaterThan(0);
      capturedCorrelationIds.forEach(id => {
        expect(id).toContain('plc_');
      });
    });

    it('should handle network failures gracefully with correlation tracking', async () => {
      server.use(
        http.post('http://localhost:5000/api/pets/:petId/adopt', async () => {
          // Simulate network error
          return new HttpResponse(null, { status: 0 });
        })
      );

      const correlationContext = correlationService.createContext('user-network-fail');
      
      const { result } = renderHook(
        () => useCreateAdoptionApplicationMutation(),
        { wrapper: createTestWrapper(testStore) }
      );

      const [createApplication] = result.current;

      await expect(
        createApplication({
          petId: 'pet-network-fail',
          applicantInfo: {} as any,
          livingSituation: {} as any,
          experience: {} as any,
          references: [],
          message: 'Network test',
        }).unwrap()
      ).rejects.toThrow();

      await waitFor(() => {
        // Verify network error logging
        const logs = loggingService.getLogs({
          correlationId: correlationContext.correlationId,
        });
        
        const networkErrorLogs = logs.filter(log =>
          log.level === LogLevel.ERROR &&
          (log.message.includes('network') || log.message.includes('failed'))
        );
        expect(networkErrorLogs.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Performance and Metrics Validation', () => {
    it('should collect comprehensive performance metrics', async () => {
      // Clear existing metrics
      loggingService.cleanup();

      server.use(
        http.get('http://localhost:5000/api/pets', async () => {
          // Simulate various response times
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
          return HttpResponse.json([{ id: 'pet-perf-1', name: 'Test Pet' }]);
        })
      );

      // Make multiple requests to generate metrics
      const requests = Array.from({ length: 5 }, (_, i) =>
        renderHook(() => petApi.useGetPetsQuery({ page: i + 1 }), {
          wrapper: createTestWrapper(testStore)
        })
      );

      await waitFor(() => {
        requests.forEach(({ result }) => {
          expect(result.current.isSuccess || result.current.isLoading).toBe(true);
        });
      });

      // Wait for metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = loggingService.getMetrics();
      
      // Verify performance metrics
      expect(metrics.requests.total).toBeGreaterThan(0);
      expect(metrics.requests.averageResponseTime).toBeGreaterThanOrEqual(0);
      expect(metrics.correlations.active).toBeGreaterThanOrEqual(0);
    });

    it('should provide detailed error analytics', async () => {
      server.use(
        http.post('http://localhost:5000/api/pets/:petId/adopt', async () => {
          return new HttpResponse(null, { status: 400, statusText: 'Bad Request' });
        }),
        http.post('http://localhost:5000/api/services/bookings', async () => {
          return new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' });
        })
      );

      const correlationContext = correlationService.createContext('user-analytics');
      
      const { result: petResult } = renderHook(
        () => useCreateAdoptionApplicationMutation(),
        { wrapper: createTestWrapper(testStore) }
      );

      const { result: serviceResult } = renderHook(
        () => useCreateServiceBookingMutation(),
        { wrapper: createTestWrapper(testStore) }
      );

      const [createApplication] = petResult.current;
      const [createBooking] = serviceResult.current;

      // Generate different types of errors
      await Promise.allSettled([
        createApplication({
          petId: 'pet-error-400',
          applicantInfo: {} as any,
          livingSituation: {} as any,
          experience: {} as any,
          references: [],
          message: 'Error test 400',
        }),
        createBooking({
          serviceId: 'service-error-500',
          petInfo: {} as any,
          scheduledDate: '2024-01-01',
          scheduledTime: '10:00',
          paymentMethodId: 'pm_error',
        }),
      ]);

      await waitFor(() => {
        const metrics = loggingService.getMetrics();
        
        // Verify error categorization
        expect(metrics.errors.total).toBeGreaterThan(0);
        expect(metrics.errors.byCategory[LogCategory.API]).toBeGreaterThan(0);
        expect(metrics.errors.byCategory[LogCategory.TRANSACTION]).toBeGreaterThan(0);
        expect(metrics.requests.failed).toBeGreaterThan(0);
      });
    });
  });

  describe('Enterprise Service Integration', () => {
    it('should integrate all enterprise services in a complete workflow', async () => {
      const correlationContext = correlationService.createContext('user-integration-test');
      const startTime = Date.now();

      // Mock successful adoption application
      server.use(
        http.post('http://localhost:5000/api/pets/:petId/adopt', async ({ request }) => {
          // Validate all enterprise headers
          expect(request.headers.get('X-Correlation-ID')).toBe(correlationContext.correlationId);
          expect(request.headers.get('X-Session-ID')).toBe(correlationContext.sessionId);
          expect(request.headers.get('X-Enterprise-Client')).toBe('PetLoveCommunity-Web');
          expect(request.headers.get('X-Transaction-ID')).toBeTruthy();
          expect(request.headers.get('X-Idempotency-Key')).toBeTruthy();
          
          return HttpResponse.json({
            id: 'app-integration-123',
            petId: 'pet-integration-456',
            status: 'pending',
            submittedAt: new Date().toISOString(),
          });
        })
      );

      const { result } = renderHook(
        () => useCreateAdoptionApplicationMutation(),
        { wrapper: createTestWrapper(testStore) }
      );

      const [createApplication] = result.current;

      const response = await createApplication({
        petId: 'pet-integration-456',
        applicantInfo: {
          firstName: 'Integration',
          lastName: 'Test',
          email: 'integration@test.com',
          phone: '555-INT-TEST',
          address: {
            city: 'Test City',
            state: 'TC',
            zipCode: '12345',
          },
          dateOfBirth: '1990-01-01',
          occupation: 'Tester',
          emergencyContact: {
            name: 'Emergency Contact',
            phone: '555-EMERGENCY',
            relationship: 'Friend',
          },
        },
        livingSituation: {
          housingType: 'apartment',
          ownsOrRents: 'rents',
          hasYard: false,
          householdMembers: [],
          otherPets: [],
          petAllergies: false,
          hoursAloneDaily: 6,
        },
        experience: {
          previousPets: [],
          experienceLevel: 'beginner',
          trainingPlan: 'Will take training classes',
        },
        references: [],
        message: 'Complete integration test application',
      }).unwrap();

      const endTime = Date.now();

      // Verify response
      expect(response.id).toBe('app-integration-123');
      expect(response.petId).toBe('pet-integration-456');

      await waitFor(() => {
        // Verify all enterprise services were engaged
        const logs = loggingService.getLogs({
          correlationId: correlationContext.correlationId,
        });

        // Should have API request/response logs
        const apiLogs = logs.filter(log => log.category === LogCategory.API);
        expect(apiLogs.length).toBeGreaterThanOrEqual(2); // request + response

        // Should have transaction logs
        const transactionLogs = logs.filter(log => log.category === LogCategory.TRANSACTION);
        expect(transactionLogs.length).toBeGreaterThan(0);

        // Verify performance tracking
        const performanceLogs = logs.filter(log => 
          log.performance && log.performance.duration
        );
        expect(performanceLogs.length).toBeGreaterThan(0);

        // Verify correlation context was maintained throughout
        logs.forEach(log => {
          expect(log.correlationId).toBe(correlationContext.correlationId);
          expect(log.correlationContext?.sessionId).toBe(correlationContext.sessionId);
        });

        // Verify metrics were collected
        const metrics = loggingService.getMetrics();
        expect(metrics.requests.total).toBeGreaterThan(0);
        expect(metrics.transactions.total).toBeGreaterThan(0);
        expect(metrics.transactions.successful).toBeGreaterThan(0);
        expect(metrics.correlations.active).toBeGreaterThan(0);
      });

      // Verify transaction was properly managed
      const activeTransactions = transactionManager.getActiveTransactions();
      const completedTransactions = transactionManager.getCompletedTransactions();
      
      expect(activeTransactions.length + completedTransactions.length).toBeGreaterThan(0);
    });
  });
});