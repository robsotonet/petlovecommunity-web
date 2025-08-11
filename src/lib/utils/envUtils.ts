/**
 * Enterprise Environment Variable Utilities
 * 
 * Provides secure parsing and validation of environment variables to prevent
 * injection attacks and ensure consistent handling across the application.
 * 
 * Security Features:
 * - Input validation and sanitization
 * - Protection against injection attacks
 * - Safe default handling
 * - Comprehensive logging of parsing attempts
 * 
 * @example
 * ```typescript
 * // Secure boolean parsing with default
 * const debugMode = parseBooleanEnvVar(process.env.DEBUG_ENABLED, false);
 * 
 * // With validation logging
 * const metrics = parseBooleanEnvVar(process.env.METRICS_ENABLED, false, 'MetricsService');
 * ```
 */

/**
 * Supported truthy values for boolean environment variables
 * Case-insensitive matching with common boolean representations
 */
const TRUTHY_VALUES = new Set(['true', '1', 'yes', 'on', 'enabled']);

/**
 * Supported falsy values for boolean environment variables  
 * Case-insensitive matching with common boolean representations
 */
const FALSY_VALUES = new Set(['false', '0', 'no', 'off', 'disabled', '']);

/**
 * Maximum allowed length for environment variable values to prevent
 * potential buffer overflow or injection attacks
 */
const MAX_ENV_VALUE_LENGTH = 1000;

/**
 * Pattern to detect potentially malicious content in environment variables
 * Blocks common injection patterns and suspicious characters
 */
const MALICIOUS_PATTERN = /[<>\"'`$(){}[\]\\;|&*?~^]/;

/**
 * Securely parse a boolean value from an environment variable
 * 
 * Provides comprehensive validation, sanitization, and protection against
 * injection attacks while supporting common boolean representations.
 * 
 * @param envValue - The environment variable value to parse (can be undefined)
 * @param defaultValue - Default value to return if parsing fails or value is invalid
 * @param context - Optional context for logging (e.g., service name, component)
 * @returns Parsed boolean value or the provided default
 * 
 * @example
 * ```typescript
 * // Basic usage with default
 * const debugEnabled = parseBooleanEnvVar(process.env.DEBUG, false);
 * 
 * // With context for better logging
 * const enableMetrics = parseBooleanEnvVar(
 *   process.env.PERFORMANCE_METRICS, 
 *   false, 
 *   'LoggingService'
 * );
 * 
 * // Handles various formats
 * parseBooleanEnvVar('true', false)     // → true
 * parseBooleanEnvVar('1', false)        // → true  
 * parseBooleanEnvVar('YES', false)      // → true
 * parseBooleanEnvVar('enabled', false)  // → true
 * parseBooleanEnvVar('false', true)     // → false
 * parseBooleanEnvVar('0', true)         // → false
 * parseBooleanEnvVar('invalid', false)  // → false (with warning)
 * ```
 */
export function parseBooleanEnvVar(
  envValue: string | undefined, 
  defaultValue: boolean = false,
  context?: string
): boolean {
  // Handle undefined or null values
  if (envValue === undefined || envValue === null) {
    if (context && process.env.NODE_ENV === 'development') {
      console.debug(`[EnvUtils${context ? `/${context}` : ''}] Environment variable is undefined, using default: ${defaultValue}`);
    }
    return defaultValue;
  }

  // Security validation: Check for excessive length
  if (envValue.length > MAX_ENV_VALUE_LENGTH) {
    console.warn(`[EnvUtils${context ? `/${context}` : ''}] Environment variable value exceeds maximum length (${MAX_ENV_VALUE_LENGTH}), using default: ${defaultValue}`);
    return defaultValue;
  }

  // Security validation: Check for malicious patterns
  if (MALICIOUS_PATTERN.test(envValue)) {
    console.warn(`[EnvUtils${context ? `/${context}` : ''}] Environment variable contains suspicious characters, using default: ${defaultValue}`);
    return defaultValue;
  }

  // Normalize the value for comparison (lowercase, trimmed)
  const normalizedValue = envValue.toString().toLowerCase().trim();

  // Check for truthy values
  if (TRUTHY_VALUES.has(normalizedValue)) {
    if (context && process.env.NODE_ENV === 'development') {
      console.debug(`[EnvUtils${context ? `/${context}` : ''}] Parsed environment variable as true: "${envValue}"`);
    }
    return true;
  }

  // Check for falsy values
  if (FALSY_VALUES.has(normalizedValue)) {
    if (context && process.env.NODE_ENV === 'development') {
      console.debug(`[EnvUtils${context ? `/${context}` : ''}] Parsed environment variable as false: "${envValue}"`);
    }
    return false;
  }

  // Handle unrecognized values  
  console.warn(
    `[EnvUtils${context ? `/${context}` : ''}] Unrecognized boolean value: "${envValue}". ` +
    `Expected: ${Array.from(TRUTHY_VALUES).join(', ')} (truthy) or ${Array.from(FALSY_VALUES).join(', ')} (falsy). ` +
    `Using default: ${defaultValue}`
  );

  return defaultValue;
}

/**
 * Securely parse a numeric value from an environment variable
 * 
 * @param envValue - The environment variable value to parse
 * @param defaultValue - Default value to return if parsing fails
 * @param context - Optional context for logging
 * @returns Parsed number or the provided default
 * 
 * @example
 * ```typescript
 * const maxConnections = parseNumberEnvVar(process.env.MAX_CONNECTIONS, 100, 'DatabaseService');
 * const timeout = parseNumberEnvVar(process.env.REQUEST_TIMEOUT_MS, 5000);
 * ```
 */
export function parseNumberEnvVar(
  envValue: string | undefined,
  defaultValue: number,
  context?: string
): number {
  if (envValue === undefined || envValue === null) {
    if (context && process.env.NODE_ENV === 'development') {
      console.debug(`[EnvUtils${context ? `/${context}` : ''}] Environment variable is undefined, using default: ${defaultValue}`);
    }
    return defaultValue;
  }

  // Security validation
  if (envValue.length > MAX_ENV_VALUE_LENGTH) {
    console.warn(`[EnvUtils${context ? `/${context}` : ''}] Environment variable value exceeds maximum length, using default: ${defaultValue}`);
    return defaultValue;
  }

  if (MALICIOUS_PATTERN.test(envValue)) {
    console.warn(`[EnvUtils${context ? `/${context}` : ''}] Environment variable contains suspicious characters, using default: ${defaultValue}`);
    return defaultValue;
  }

  const trimmedValue = envValue.trim();
  
  // Handle empty string explicitly
  if (trimmedValue === '') {
    if (context && process.env.NODE_ENV === 'development') {
      console.debug(`[EnvUtils${context ? `/${context}` : ''}] Empty string provided, using default: ${defaultValue}`);
    }
    return defaultValue;
  }
  
  const parsedValue = Number(trimmedValue);

  if (isNaN(parsedValue) || !isFinite(parsedValue)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[EnvUtils${context ? `/${context}` : ''}] Invalid numeric value: "${envValue}", using default: ${defaultValue}`);
    }
    return defaultValue;
  }

  if (context && process.env.NODE_ENV === 'development') {
    console.debug(`[EnvUtils${context ? `/${context}` : ''}] Parsed environment variable as number: ${parsedValue}`);
  }

  return parsedValue;
}

/**
 * Securely parse a string value from an environment variable with validation
 * 
 * @param envValue - The environment variable value to parse
 * @param defaultValue - Default value to return if validation fails
 * @param allowedValues - Optional array of allowed values for validation
 * @param context - Optional context for logging
 * @returns Validated string or the provided default
 * 
 * @example
 * ```typescript
 * const logLevel = parseStringEnvVar(
 *   process.env.LOG_LEVEL, 
 *   'info',
 *   ['debug', 'info', 'warn', 'error'],
 *   'LoggingService'
 * );
 * ```
 */
export function parseStringEnvVar(
  envValue: string | undefined,
  defaultValue: string,
  allowedValues?: string[],
  context?: string
): string {
  if (envValue === undefined || envValue === null) {
    if (context && process.env.NODE_ENV === 'development') {
      console.debug(`[EnvUtils${context ? `/${context}` : ''}] Environment variable is undefined, using default: "${defaultValue}"`);
    }
    return defaultValue;
  }

  // Security validation
  if (envValue.length > MAX_ENV_VALUE_LENGTH) {
    console.warn(`[EnvUtils${context ? `/${context}` : ''}] Environment variable value exceeds maximum length, using default: "${defaultValue}"`);
    return defaultValue;
  }

  if (MALICIOUS_PATTERN.test(envValue)) {
    console.warn(`[EnvUtils${context ? `/${context}` : ''}] Environment variable contains suspicious characters, using default: "${defaultValue}"`);
    return defaultValue;
  }

  const trimmedValue = envValue.trim();

  // Validate against allowed values if provided
  if (allowedValues && !allowedValues.includes(trimmedValue)) {
    console.warn(
      `[EnvUtils${context ? `/${context}` : ''}] Invalid value: "${envValue}". ` +
      `Allowed: [${allowedValues.join(', ')}]. Using default: "${defaultValue}"`
    );
    return defaultValue;
  }

  if (context && process.env.NODE_ENV === 'development') {
    console.debug(`[EnvUtils${context ? `/${context}` : ''}] Parsed environment variable as string: "${trimmedValue}"`);
  }

  return trimmedValue;
}

/**
 * Validates that the current environment has proper boolean-type environment variables
 * Can be used during application startup to validate configuration
 * 
 * @param requiredBooleanVars - Object mapping environment variable names to their default values
 * @param context - Context for logging
 * @returns Object with parsed boolean values
 * 
 * @example
 * ```typescript
 * const config = validateBooleanEnvVars({
 *   ENABLE_DEBUG: false,
 *   PERFORMANCE_METRICS_ENABLED: false,
 *   REQUEST_RESPONSE_LOGGING: false
 * }, 'ApplicationStartup');
 * ```
 */
export function validateBooleanEnvVars(
  requiredBooleanVars: Record<string, boolean>,
  context?: string
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  
  for (const [varName, defaultValue] of Object.entries(requiredBooleanVars)) {
    result[varName] = parseBooleanEnvVar(
      process.env[varName],
      defaultValue,
      context ? `${context}/${varName}` : varName
    );
  }
  
  return result;
}

/**
 * Development helper: Lists all environment variables that match boolean patterns
 * Useful for debugging and configuration validation
 * 
 * @param includeValues - Whether to include actual values (false for security in logs)
 * @returns Array of environment variable information
 */
export function listBooleanEnvVars(includeValues: boolean = false): Array<{
  name: string;
  value?: string;
  parsedValue: boolean;
  isValid: boolean;
}> {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('[EnvUtils] listBooleanEnvVars should only be used in development');
    return [];
  }

  const results: Array<{
    name: string;
    value?: string;
    parsedValue: boolean;
    isValid: boolean;
  }> = [];

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string' && value !== '') {
      const normalizedValue = value.toLowerCase().trim();
      const isValidBoolean = TRUTHY_VALUES.has(normalizedValue) || FALSY_VALUES.has(normalizedValue);
      
      if (isValidBoolean || key.includes('ENABLE') || key.includes('DEBUG') || key.includes('DISABLE')) {
        results.push({
          name: key,
          value: includeValues ? value : undefined,
          parsedValue: parseBooleanEnvVar(value, false),
          isValid: isValidBoolean
        });
      }
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}