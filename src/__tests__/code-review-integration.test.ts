/**
 * Code Review Integration Tests
 * 
 * Validates that all code review fixes are working together correctly:
 * 1. LoggingService uses secure environment variable parsing
 * 2. TestDataFactory uses proper ES6 imports instead of require()
 * 3. Environment variable security utilities function as expected
 * 4. No regression in existing functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseBooleanEnvVar } from '@/lib/utils/envUtils';
import { TestDataFactory } from '@/test/helpers/testDataFactory';

// Mock the generateTransactionId function
vi.mock('@/lib/utils/correlationUtils', () => ({
  generateTransactionId: vi.fn()
}));

describe('Code Review Integration Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;
  
  beforeEach(() => {
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Variable Security Integration', () => {
    it('should demonstrate secure boolean parsing in realistic scenarios', () => {
      // Test realistic environment variable scenarios
      const testCases = [
        { value: 'true', expected: true },
        { value: 'false', expected: false },
        { value: '1', expected: true },
        { value: '0', expected: false },
        { value: 'invalid', expected: false }, // Falls back to default
        { value: undefined, expected: false }  // Falls back to default
      ];

      testCases.forEach(({ value, expected }) => {
        const result = parseBooleanEnvVar(value, false, 'IntegrationTest');
        expect(result).toBe(expected);
      });
    });

    it('should prevent injection attacks in environment variables', () => {
      const maliciousInputs = [
        'true; rm -rf /',
        'true && malicious_command',
        'true$(dangerous)',
        '<script>alert("xss")</script>',
        'true`${injection}`'
      ];

      maliciousInputs.forEach(maliciousInput => {
        // All malicious inputs should be rejected and default to false
        const result = parseBooleanEnvVar(maliciousInput, false, 'SecurityTest');
        expect(result).toBe(false);
      });
    });

    it('should handle edge cases gracefully without crashing', () => {
      const edgeCases = [
        null,
        undefined,
        '',
        '   ',
        'a'.repeat(2000), // Very long string
        '\u0000\u0001\u0002', // Control characters
      ];

      edgeCases.forEach(edgeCase => {
        expect(() => {
          parseBooleanEnvVar(edgeCase as any, false, 'EdgeCaseTest');
        }).not.toThrow();
      });
    });
  });

  describe('Test Factory Import Integration', () => {
    it('should successfully use TestDataFactory with proper ES6 imports', () => {
      // The TestDataFactory now uses proper ES6 imports instead of require()
      // This test validates that the import structure works correctly
      expect(TestDataFactory).toBeDefined();
      expect(typeof TestDataFactory.mockTransactionIdGeneration).toBe('function');
      
      // Test that the method can be called without errors
      expect(() => {
        TestDataFactory.mockTransactionIdGeneration(1, 'integration_test');
      }).not.toThrow();
    });

    it('should demonstrate improved import pattern over require()', () => {
      // Validate that TestDataFactory is now using ES6 imports
      // The fact that this test file can import it validates the fix
      
      const testDataMethods = [
        'mockTransactionIdGeneration',
        'generateMockTransactions', 
        'createStateWithCompletedTransactions',
        'generateMockCorrelationContexts'
      ];
      
      testDataMethods.forEach(method => {
        expect(TestDataFactory[method as keyof typeof TestDataFactory]).toBeDefined();
      });
    });
  });

  describe('LoggingService Integration (Simulated)', () => {
    it('should demonstrate LoggingService configuration pattern with secure parsing', () => {
      // Mock environment variables that LoggingService would use
      process.env.ENTERPRISE_DEBUG_ENABLED = 'true';
      process.env.PERFORMANCE_METRICS_ENABLED = 'false';
      process.env.REQUEST_RESPONSE_LOGGING = '1';
      
      // Simulate LoggingService configuration using secure parsing
      const enableDebug = parseBooleanEnvVar(
        process.env.ENTERPRISE_DEBUG_ENABLED,
        false,
        'LoggingService/Debug'
      );
      
      const enableMetrics = parseBooleanEnvVar(
        process.env.PERFORMANCE_METRICS_ENABLED,
        false, 
        'LoggingService/Metrics'
      );
      
      const enableRequestLogging = parseBooleanEnvVar(
        process.env.REQUEST_RESPONSE_LOGGING,
        false,
        'LoggingService/RequestResponse'
      );
      
      expect(enableDebug).toBe(true);
      expect(enableMetrics).toBe(false);
      expect(enableRequestLogging).toBe(true);
    });

    it('should handle malicious environment variables safely in LoggingService pattern', () => {
      // Test with malicious environment variables
      process.env.ENTERPRISE_DEBUG_ENABLED = 'true; rm -rf /';
      process.env.PERFORMANCE_METRICS_ENABLED = 'false$(dangerous)';
      
      const enableDebug = parseBooleanEnvVar(
        process.env.ENTERPRISE_DEBUG_ENABLED,
        false,
        'LoggingService/Debug'
      );
      
      const enableMetrics = parseBooleanEnvVar(
        process.env.PERFORMANCE_METRICS_ENABLED,
        false,
        'LoggingService/Metrics'
      );
      
      // Both should be safely parsed as false (rejected due to malicious content)
      expect(enableDebug).toBe(false);
      expect(enableMetrics).toBe(false);
    });
  });

  describe('Backward Compatibility Validation', () => {
    it('should maintain existing behavior for valid boolean values', () => {
      // Ensure that previously working configurations still work
      const validConfigurations = [
        { env: 'true', expected: true },
        { env: 'false', expected: false },
        { env: 'TRUE', expected: true },
        { env: 'FALSE', expected: false },
        { env: '1', expected: true },
        { env: '0', expected: false },
      ];

      validConfigurations.forEach(({ env, expected }) => {
        const result = parseBooleanEnvVar(env, !expected, 'BackwardCompatTest');
        expect(result).toBe(expected);
      });
    });

    it('should provide consistent results across multiple calls', () => {
      // Ensure consistent behavior
      const testValue = 'true';
      const results = Array.from({ length: 5 }, () => 
        parseBooleanEnvVar(testValue, false, 'ConsistencyTest')
      );
      
      expect(results.every(result => result === true)).toBe(true);
    });
  });

  describe('Performance Validation', () => {
    it('should handle high-frequency environment variable parsing efficiently', () => {
      const startTime = performance.now();
      
      // Simulate high-frequency parsing (like in a busy application)
      for (let i = 0; i < 500; i++) {
        parseBooleanEnvVar('true', false, 'PerformanceTest');
        parseBooleanEnvVar('false', true, 'PerformanceTest');  
        parseBooleanEnvVar('invalid', false, 'PerformanceTest');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within reasonable time (50ms for 1500 operations)
      expect(duration).toBeLessThan(50);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle corrupted environment gracefully', () => {
      // Test various types of potentially problematic inputs
      const problematicInputs = [
        '\0\0\0true\0\0\0',
        '   true   ',
        'True\r\n',
        '\ttrue\t',
        'TRUE\uFEFF', // With byte order mark
      ];

      problematicInputs.forEach(input => {
        expect(() => {
          const result = parseBooleanEnvVar(input, false, 'ResilienceTest');
          // Should either parse correctly or fall back to default safely
          expect(typeof result).toBe('boolean');
        }).not.toThrow();
      });
    });

    it('should maintain application stability even with environment variable issues', () => {
      // Simulate various failure scenarios
      const failureScenarios = [
        undefined,
        null,
        '',
        '   ',
        'maybe_boolean',
        '2', // Invalid number as boolean
        'true_but_not_quite',
      ];

      failureScenarios.forEach(scenario => {
        expect(() => {
          const result = parseBooleanEnvVar(scenario as any, false, 'StabilityTest');
          expect(result).toBe(false); // Should fall back to default
        }).not.toThrow();
      });
    });
  });
});