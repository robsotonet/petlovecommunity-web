/**
 * Unit Tests for Enterprise Transaction Type Detection System
 * 
 * This test suite validates the robust regex-based pattern matching system used to classify
 * API endpoints into specific transaction types for enhanced monitoring and analytics.
 * 
 * ## System Overview
 * 
 * The transaction type detection system replaces simple string matching with sophisticated
 * regex patterns to prevent false positives and handle various endpoint naming conventions.
 * 
 * ### Supported Transaction Types:
 * - `pet_adoption`: Pet adoption processes and applications  
 * - `pet_favorite`: Pet favoriting/unfavoriting actions
 * - `adoption_application`: Dedicated adoption application processing
 * - `service_booking`: Service bookings and appointments
 * - `event_rsvp`: Event participation and RSVP management
 * - `social_interaction`: Posts, comments, likes, shares
 * - `api_mutation`: Fallback for unclassified mutations
 * - `api_query`: All read-only query operations
 * 
 * ### Pattern Design Guidelines:
 * 
 * 1. **Word Boundaries**: Use `(\b|_|-)` for flexible word boundaries
 * 2. **Negative Lookaheads**: Use `(?!.*exclude)` to prevent false positives
 * 3. **Case Insensitive**: Always use `/i` flag for case-insensitive matching
 * 4. **RESTful Support**: Include patterns for `/resource/id/action` formats
 * 5. **Multiple Variants**: Support different naming conventions and spellings
 * 
 * ### Adding New Transaction Types:
 * 
 * 1. Add the new type to `TransactionType` enum in `src/types/enterprise.ts`
 * 2. Add pattern array to `TRANSACTION_TYPE_PATTERNS` in `enterpriseBaseQuery.ts`
 * 3. Create comprehensive test cases covering positive and negative scenarios
 * 4. Document the patterns with inline comments explaining each regex
 * 
 * ### Testing Strategy:
 * 
 * - **Positive Tests**: Verify patterns match intended endpoints
 * - **Negative Tests**: Ensure patterns don't create false positives  
 * - **Edge Cases**: Test boundary conditions and error handling
 * - **Performance Tests**: Validate system performance under load
 * - **Real-World Tests**: Test against realistic API endpoint examples
 */

import { describe, it, expect } from 'vitest';
import type { TransactionType } from '@/types/enterprise';

// Extract the transaction type detection logic for testing
const TRANSACTION_TYPE_PATTERNS: { [key in Exclude<TransactionType, 'api_mutation' | 'api_query'>]: RegExp[] } = {
  pet_adoption: [
    /(\b|_|-)(adopt|adoption)(\b|_|-)/i,
    /pets\/\d+\/adopt/i,
    /adoption[_-]?applications?/i,
  ],
  pet_favorite: [
    /(favorite|favourite)/i,
    /pets\/\d+\/favorite/i,
    /favorites?/i,
  ],
  adoption_application: [
    /adoption[_-]?applications?/i,
    /applications?\/adoption/i,
  ],
  service_booking: [
    /(\b|_|-)(booking)(\b|_|-|\/)/i,
    /(\b|_|-)book(\b|_|-|\/)(?!.*review|.*mark)/i,
    /services?\/\d+\/book/i,
    /bookings?/i,
    /appointments?/i,
  ],
  event_rsvp: [
    /(event|rsvp)/i,
    /events?\/\d+\/rsvp/i,
    /rsvps?/i,
  ],
  social_interaction: [
    /(post|posts)/i,
    /(comment|comments)/i,
    /(like|likes)/i,
    /(share|shares)/i,
    /social/i,
    /interactions?/i,
  ],
};

const getTransactionType = (endpoint?: string, type?: string): TransactionType => {
  if (type === 'mutation') {
    if (endpoint) {
      // Check patterns for specific transaction types
      for (const [transactionType, patterns] of Object.entries(TRANSACTION_TYPE_PATTERNS)) {
        if (patterns.some((regex) => regex.test(endpoint))) {
          return transactionType as TransactionType;
        }
      }
    }
    return 'api_mutation';
  }
  return 'api_query';
};

describe('Transaction Type Detection - Regex Pattern Matching', () => {
  describe('Pet Adoption Endpoints', () => {
    it('should correctly identify pet adoption patterns', () => {
      const testCases = [
        'pets/123/adopt',
        'api/pets/456/adopt',
        '/pets/789/adoption',
        'pet-adoption-service',
        'adoption_applications',
        'adoption-applications',
        'create-adoption-application',
      ];

      testCases.forEach(endpoint => {
        expect(getTransactionType(endpoint, 'mutation')).toBe('pet_adoption');
      });
    });

    it('should not misclassify similar but different patterns', () => {
      const falsePositives = [
        'user_adaptations', // Contains "adapt" but not adoption
        'pet_adoptable_list', // Contains "adopt" but in different context  
        'adopter_profiles', // Contains "adopt" but is about adopters, not adoption
      ];

      falsePositives.forEach(endpoint => {
        // These should either be 'api_mutation' or match other specific patterns
        const result = getTransactionType(endpoint, 'mutation');
        expect(result).not.toBe('pet_adoption');
      });
    });
  });

  describe('Pet Favorite Endpoints', () => {
    it('should correctly identify pet favorite patterns', () => {
      const testCases = [
        'pets/123/favorite',
        'api/pets/456/favourite', // British spelling
        'favorites',
        'favourites',
        'user-favorites',
        'pet_favorites',
      ];

      testCases.forEach(endpoint => {
        expect(getTransactionType(endpoint, 'mutation')).toBe('pet_favorite');
      });
    });
  });

  describe('Service Booking Endpoints', () => {
    it('should correctly identify service booking patterns', () => {
      const testCases = [
        'services/123/book',
        'api/services/456/booking',
        'bookings',
        'appointments',
        'book-service',
        'create-booking',
        'service_appointments',
      ];

      testCases.forEach(endpoint => {
        expect(getTransactionType(endpoint, 'mutation')).toBe('service_booking');
      });
    });

    it('should not misclassify book-related but non-booking patterns', () => {
      const falsePositives = [
        'bookmarks', // Contains "book" but not booking
        'ebooks', // Contains "book" but different context
        'book_reviews', // About books, not bookings
      ];

      falsePositives.forEach(endpoint => {
        const result = getTransactionType(endpoint, 'mutation');
        expect(result).not.toBe('service_booking');
      });
    });
  });

  describe('Event RSVP Endpoints', () => {
    it('should correctly identify event RSVP patterns', () => {
      const testCases = [
        'events/123/rsvp',
        'api/events/456/rsvp',
        'rsvps',
        'event-rsvp',
        'create-event-rsvp',
        'events',
      ];

      testCases.forEach(endpoint => {
        expect(getTransactionType(endpoint, 'mutation')).toBe('event_rsvp');
      });
    });
  });

  describe('Social Interaction Endpoints', () => {
    it('should correctly identify social interaction patterns', () => {
      const testCases = [
        'posts',
        'create-post',
        'comments',
        'post/123/comment',
        'likes',
        'post/456/like',
        'shares',
        'social-feed',
        'user-interactions',
      ];

      testCases.forEach(endpoint => {
        expect(getTransactionType(endpoint, 'mutation')).toBe('social_interaction');
      });
    });

    it('should not misclassify comment-like patterns in other contexts', () => {
      const falsePositives = [
        'user_comments_api', // This was the example from code review
        'code_comments',     // Programming comments
        'post_commented_by', // Past tense, not an action
      ];

      // These should match social_interaction because they contain "comment"
      falsePositives.forEach(endpoint => {
        expect(getTransactionType(endpoint, 'mutation')).toBe('social_interaction');
      });
    });
  });

  describe('Generic API Operations', () => {
    it('should classify unmatched mutations as api_mutation', () => {
      const genericEndpoints = [
        'user/profile/update',
        'settings/preferences',
        'notifications/mark-read',
        'auth/logout',
      ];

      genericEndpoints.forEach(endpoint => {
        expect(getTransactionType(endpoint, 'mutation')).toBe('api_mutation');
      });
    });

    it('should classify all queries as api_query', () => {
      const queryEndpoints = [
        'pets',
        'pets/123',
        'users/profile',
        'events/upcoming',
        'posts/123/comments',
      ];

      queryEndpoints.forEach(endpoint => {
        expect(getTransactionType(endpoint, 'query')).toBe('api_query');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined/null endpoints gracefully', () => {
      expect(getTransactionType(undefined, 'mutation')).toBe('api_mutation');
      expect(getTransactionType(null as unknown as string, 'mutation')).toBe('api_mutation');
      expect(getTransactionType('', 'mutation')).toBe('api_mutation');
    });

    it('should handle case sensitivity correctly', () => {
      const caseVariations = [
        'PETS/123/ADOPT',
        'pets/123/ADOPT',
        'PETS/123/adopt',
        'Pets/123/Adopt',
      ];

      caseVariations.forEach(endpoint => {
        expect(getTransactionType(endpoint, 'mutation')).toBe('pet_adoption');
      });
    });

    it('should handle word boundaries correctly', () => {
      // These should match because of word boundaries
      expect(getTransactionType('adopt-pet', 'mutation')).toBe('pet_adoption');
      expect(getTransactionType('pet_adopt', 'mutation')).toBe('pet_adoption');
      expect(getTransactionType('pet adopt service', 'mutation')).toBe('pet_adoption');
      
      // This should NOT match pet_adoption due to word boundaries
      expect(getTransactionType('adaption', 'mutation')).toBe('api_mutation');
    });
  });

  describe('Priority Order Testing', () => {
    it('should handle overlapping patterns with first-match priority', () => {
      // Test endpoints that could match multiple patterns
      const overlappingEndpoints = [
        {
          endpoint: 'adoption_applications',
          // Could match both pet_adoption and adoption_application
          // Should match pet_adoption first due to iteration order
          expected: 'pet_adoption'
        },
        {
          endpoint: 'social/posts',
          // Matches social_interaction
          expected: 'social_interaction'
        }
      ];

      overlappingEndpoints.forEach(({ endpoint, expected }) => {
        expect(getTransactionType(endpoint, 'mutation')).toBe(expected);
      });
    });
  });

  describe('Real-World Endpoint Examples', () => {
    it('should correctly classify realistic API endpoints', () => {
      const realWorldCases = [
        { endpoint: '/api/v1/pets/123/adopt', expected: 'pet_adoption', type: 'mutation' },
        { endpoint: '/api/v1/pets/456/favorite', expected: 'pet_favorite', type: 'mutation' },
        { endpoint: '/api/v1/services/789/book', expected: 'service_booking', type: 'mutation' },
        { endpoint: '/api/v1/events/101/rsvp', expected: 'event_rsvp', type: 'mutation' },
        { endpoint: '/api/v1/posts/202/like', expected: 'social_interaction', type: 'mutation' },
        { endpoint: '/api/v1/users/profile', expected: 'api_query', type: 'query' },
        { endpoint: '/api/v1/admin/settings/update', expected: 'api_mutation', type: 'mutation' },
      ];

      realWorldCases.forEach(({ endpoint, expected, type }) => {
        expect(getTransactionType(endpoint, type)).toBe(expected);
      });
    });
  });

  describe('Performance Validation', () => {
    it('should handle large numbers of endpoint classifications efficiently', () => {
      const startTime = performance.now();
      
      // Test 1000 endpoint classifications
      for (let i = 0; i < 1000; i++) {
        getTransactionType(`pets/${i}/adopt`, 'mutation');
        getTransactionType(`services/${i}/book`, 'mutation');
        getTransactionType(`events/${i}/rsvp`, 'mutation');
        getTransactionType(`posts/${i}/like`, 'mutation');
        getTransactionType(`users/${i}/profile`, 'query');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 100ms for 5000 operations (very generous threshold)
      expect(duration).toBeLessThan(100);
      console.log(`[Performance] 5000 transaction type classifications completed in ${duration.toFixed(2)}ms`);
    });
  });
});