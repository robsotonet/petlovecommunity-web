/**
 * Comprehensive Security Tests for Environment Variable Utilities
 * 
 * This test suite validates the secure parsing and validation of environment variables
 * to prevent injection attacks and ensure consistent handling across the application.
 * 
 * Test Coverage:
 * - Valid boolean parsing with various formats
 * - Security validation against injection attacks  
 * - Edge case handling (null, undefined, empty strings)
 * - Malicious input detection and sanitization
 * - Performance validation for large-scale operations
 * - Default value behavior and logging
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  parseBooleanEnvVar, 
  parseNumberEnvVar, 
  parseStringEnvVar,
  validateBooleanEnvVars,
  listBooleanEnvVars
} from '@/lib/utils/envUtils';

describe('Environment Variable Security Utilities', () => {
  let consoleSpy: any;
  let consoleWarnSpy: any;
  let consoleDebugSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleDebugSpy.mockRestore();
  });

  describe('parseBooleanEnvVar - Core Boolean Parsing', () => {
    describe('Valid Truthy Values', () => {
      it('should parse standard truthy values correctly', () => {
        expect(parseBooleanEnvVar('true', false)).toBe(true);
        expect(parseBooleanEnvVar('TRUE', false)).toBe(true);
        expect(parseBooleanEnvVar('True', false)).toBe(true);
        expect(parseBooleanEnvVar('1', false)).toBe(true);
        expect(parseBooleanEnvVar('yes', false)).toBe(true);
        expect(parseBooleanEnvVar('YES', false)).toBe(true);
        expect(parseBooleanEnvVar('on', false)).toBe(true);
        expect(parseBooleanEnvVar('enabled', false)).toBe(true);
      });

      it('should handle whitespace correctly', () => {
        expect(parseBooleanEnvVar('  true  ', false)).toBe(true);
        expect(parseBooleanEnvVar('\ttrue\n', false)).toBe(true);
        expect(parseBooleanEnvVar(' 1 ', false)).toBe(true);
      });
    });

    describe('Valid Falsy Values', () => {
      it('should parse standard falsy values correctly', () => {
        expect(parseBooleanEnvVar('false', true)).toBe(false);
        expect(parseBooleanEnvVar('FALSE', true)).toBe(false);
        expect(parseBooleanEnvVar('False', true)).toBe(false);
        expect(parseBooleanEnvVar('0', true)).toBe(false);
        expect(parseBooleanEnvVar('no', true)).toBe(false);
        expect(parseBooleanEnvVar('NO', true)).toBe(false);
        expect(parseBooleanEnvVar('off', true)).toBe(false);
        expect(parseBooleanEnvVar('disabled', true)).toBe(false);
        expect(parseBooleanEnvVar('', true)).toBe(false);
      });
    });

    describe('Default Value Handling', () => {
      it('should return default for undefined values', () => {
        expect(parseBooleanEnvVar(undefined, true)).toBe(true);
        expect(parseBooleanEnvVar(undefined, false)).toBe(false);
      });

      it('should return default for null values', () => {
        expect(parseBooleanEnvVar(null as any, true)).toBe(true);
        expect(parseBooleanEnvVar(null as any, false)).toBe(false);
      });

      it('should return default for unrecognized values', () => {
        expect(parseBooleanEnvVar('maybe', true)).toBe(true);
        expect(parseBooleanEnvVar('invalid', false)).toBe(false);
        expect(parseBooleanEnvVar('2', false)).toBe(false);
      });
    });
  });

  describe('Security Validation Tests', () => {
    describe('Injection Attack Prevention', () => {
      it('should reject values with script injection patterns', () => {
        const maliciousInputs = [
          '<script>alert("xss")</script>',
          'true && rm -rf /',
          '$(malicious command)',
          'true; DROP TABLE users;',
          'true`${malicious_code}`',
          'true"<script>',
          "true'$(danger)",
          'true|rm -rf',
          'true&malicious',
          'true*wildcard',
          'true?query',
          'true~home',
          'true^control',
          'true[array]',
          'true{object}',
          'true\\escape'
        ];

        maliciousInputs.forEach(input => {
          expect(parseBooleanEnvVar(input, false, 'SecurityTest')).toBe(false);
          expect(consoleWarnSpy).toHaveBeenCalledWith(
            expect.stringContaining('suspicious characters'),
          );
        });
      });

      it('should reject excessively long values to prevent buffer attacks', () => {
        const longValue = 'true'.repeat(500); // Creates a 2000 character string
        expect(parseBooleanEnvVar(longValue, false, 'SecurityTest')).toBe(false);
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('exceeds maximum length'),
        );
      });

      it('should handle unicode and special characters safely', () => {
        const unicodeInputs = [
          'true\u0000invalid', // null byte with invalid suffix
          'true\u0001test', // control character with suffix
          'tru\u200be', // zero-width space creating invalid word
          'maybe\uFEFF', // byte order mark with non-boolean word
        ];

        unicodeInputs.forEach(input => {
          // These all contain characters that make them unrecognized boolean values
          const result = parseBooleanEnvVar(input, false, 'UnicodeTest');
          expect(result).toBe(false);
        });
        
        // All calls should have generated warnings for unrecognized values
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringContaining('Unrecognized boolean value')
        );
      });
    });

    describe('Context Logging Validation', () => {
      it('should include context in debug logs during development', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'development';

        parseBooleanEnvVar('true', false, 'TestService');
        expect(consoleDebugSpy).toHaveBeenCalledWith(
          expect.stringContaining('[EnvUtils/TestService]')
        );

        process.env.NODE_ENV = originalEnv;
      });

      it('should not log debug messages in production', () => {
        const originalEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';

        parseBooleanEnvVar('true', false, 'TestService');
        expect(consoleDebugSpy).not.toHaveBeenCalled();

        process.env.NODE_ENV = originalEnv;
      });
    });
  });

  describe('parseNumberEnvVar - Numeric Environment Variables', () => {
    it('should parse valid numbers correctly', () => {
      expect(parseNumberEnvVar('123', 0)).toBe(123);
      expect(parseNumberEnvVar('0', 999)).toBe(0);
      expect(parseNumberEnvVar('-456', 0)).toBe(-456);
      expect(parseNumberEnvVar('123.456', 0)).toBe(123.456);
    });

    it('should handle invalid numbers with defaults', () => {
      expect(parseNumberEnvVar('abc', 100)).toBe(100);
      expect(parseNumberEnvVar('123abc', 50)).toBe(50);
      expect(parseNumberEnvVar('', 25)).toBe(25);
      expect(parseNumberEnvVar(undefined, 10)).toBe(10);
    });

    it('should reject malicious numeric inputs', () => {
      expect(parseNumberEnvVar('123<script>', 100)).toBe(100);
      expect(parseNumberEnvVar('123$(rm -rf)', 100)).toBe(100);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('suspicious characters')
      );
    });

    it('should handle edge numeric cases', () => {
      expect(parseNumberEnvVar('Infinity', 100)).toBe(100);
      expect(parseNumberEnvVar('-Infinity', 100)).toBe(100);
      expect(parseNumberEnvVar('NaN', 100)).toBe(100);
    });
  });

  describe('parseStringEnvVar - String Environment Variables', () => {
    it('should parse valid strings correctly', () => {
      expect(parseStringEnvVar('hello', 'default')).toBe('hello');
      expect(parseStringEnvVar('  world  ', 'default')).toBe('world');
    });

    it('should validate against allowed values', () => {
      const allowedLevels = ['debug', 'info', 'warn', 'error'];
      
      expect(parseStringEnvVar('info', 'warn', allowedLevels)).toBe('info');
      expect(parseStringEnvVar('invalid', 'warn', allowedLevels)).toBe('warn');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Invalid value: "invalid"')
      );
    });

    it('should reject malicious string inputs', () => {
      expect(parseStringEnvVar('value<script>', 'safe')).toBe('safe');
      expect(parseStringEnvVar('value$(danger)', 'safe')).toBe('safe');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('suspicious characters')
      );
    });
  });

  describe('validateBooleanEnvVars - Batch Validation', () => {
    it('should validate multiple environment variables', () => {
      const mockEnv = {
        TEST_DEBUG: 'true',
        TEST_METRICS: 'false',
        TEST_LOGGING: '1'
      };

      // Mock process.env for this test
      const originalEnv = process.env;
      process.env = { ...originalEnv, ...mockEnv };

      const config = validateBooleanEnvVars({
        TEST_DEBUG: false,
        TEST_METRICS: true,
        TEST_LOGGING: false,
        TEST_UNDEFINED: true
      }, 'BatchTest');

      expect(config.TEST_DEBUG).toBe(true);
      expect(config.TEST_METRICS).toBe(false);
      expect(config.TEST_LOGGING).toBe(true);
      expect(config.TEST_UNDEFINED).toBe(true); // Should use default

      process.env = originalEnv;
    });
  });

  describe('listBooleanEnvVars - Development Helper', () => {
    it('should only work in development environment', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const result = listBooleanEnvVars();
      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('should only be used in development')
      );

      process.env.NODE_ENV = originalEnv;
    });

    it('should list boolean-like environment variables in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // Mock some environment variables
      const testEnv = {
        ...process.env,
        TEST_ENABLE_FEATURE: 'true',
        TEST_DEBUG_MODE: 'false',
        REGULAR_STRING: 'hello',
        ANOTHER_ENABLE: '1'
      };
      process.env = testEnv;

      const result = listBooleanEnvVars(false);
      
      expect(result.length).toBeGreaterThan(0);
      expect(result.some(item => item.name === 'TEST_ENABLE_FEATURE')).toBe(true);
      expect(result.some(item => item.name === 'TEST_DEBUG_MODE')).toBe(true);
      expect(result.some(item => item.name === 'ANOTHER_ENABLE')).toBe(true);
      
      // Should not include values when includeValues is false
      result.forEach(item => {
        expect(item.value).toBeUndefined();
      });

      process.env = originalEnv;
    });
  });

  describe('Performance and Scalability Tests', () => {
    it('should handle large numbers of environment variable parses efficiently', () => {
      const startTime = performance.now();
      
      // Perform 1000 environment variable parses
      for (let i = 0; i < 1000; i++) {
        parseBooleanEnvVar('true', false, 'PerformanceTest');
        parseBooleanEnvVar('false', true, 'PerformanceTest');
        parseBooleanEnvVar('invalid', false, 'PerformanceTest');
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 100ms for 3000 operations (very generous threshold)
      expect(duration).toBeLessThan(100);
      console.log(`[Performance] 3000 environment variable parses completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle malicious input detection efficiently', () => {
      const startTime = performance.now();
      
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'true && rm -rf /',
        '$(malicious command)',
        'true; DROP TABLE users;',
        'true`${malicious_code}`'
      ];
      
      // Test 200 iterations of malicious input detection
      for (let i = 0; i < 200; i++) {
        maliciousInputs.forEach(input => {
          parseBooleanEnvVar(input, false, 'SecurityTest');
        });
      }
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 50ms for 1000 security validations
      expect(duration).toBeLessThan(50);
      console.log(`[Security] 1000 malicious input validations completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Integration with LoggingService Pattern', () => {
    it('should work correctly with typical LoggingService usage patterns', () => {
      // Simulate LoggingService configuration pattern
      const enableMetrics = parseBooleanEnvVar(
        'true', 
        false, 
        'LoggingService'
      );
      
      const enableDebug = parseBooleanEnvVar(
        undefined, 
        false, 
        'LoggingService/Debug'
      );
      
      const enableRequestLogging = parseBooleanEnvVar(
        'false', 
        false, 
        'LoggingService/RequestResponse'
      );
      
      expect(enableMetrics).toBe(true);
      expect(enableDebug).toBe(false);
      expect(enableRequestLogging).toBe(false);
    });

    it('should maintain consistent behavior across multiple calls', () => {
      // Ensure consistent results for the same inputs
      for (let i = 0; i < 10; i++) {
        expect(parseBooleanEnvVar('true', false, 'ConsistencyTest')).toBe(true);
        expect(parseBooleanEnvVar('false', true, 'ConsistencyTest')).toBe(false);
        expect(parseBooleanEnvVar('invalid', true, 'ConsistencyTest')).toBe(true);
      }
    });
  });

  describe('Error Recovery and Graceful Degradation', () => {
    it('should handle corrupted environment gracefully', () => {
      // Test with unusual but technically valid inputs
      expect(parseBooleanEnvVar('0000000', false)).toBe(false);
      expect(parseBooleanEnvVar('1111111', false)).toBe(false); // Should fall back to default
      expect(parseBooleanEnvVar('true true', false)).toBe(false); // Should fall back to default
    });

    it('should provide helpful warnings for common mistakes', () => {
      // Test common configuration mistakes
      parseBooleanEnvVar('True ', false, 'MistakeTest'); // Extra space - should work
      parseBooleanEnvVar('TRUE', false, 'MistakeTest'); // All caps - should work
      parseBooleanEnvVar('yes', false, 'MistakeTest'); // Alternative - should work
      
      // These should trigger warnings but not crash
      parseBooleanEnvVar('truth', false, 'MistakeTest');
      parseBooleanEnvVar('enable', false, 'MistakeTest');
      
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unrecognized boolean value')
      );
    });
  });
});