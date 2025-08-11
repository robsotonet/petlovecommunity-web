# Security Guidelines - Environment Variable Handling

## Overview

This document outlines the secure handling of environment variables to prevent injection attacks and ensure consistent parsing across the Pet Love Community application.

## Security Requirements

### Environment Variable Security Policy

All environment variable parsing MUST use the secure utilities provided in `src/lib/utils/envUtils.ts`. Direct usage of `process.env.VARIABLE === 'value'` patterns is **prohibited** in production code.

### Approved Parsing Methods

#### Boolean Environment Variables
```typescript
import { parseBooleanEnvVar } from '@/lib/utils/envUtils';

// ✅ CORRECT - Secure parsing with validation
const debugEnabled = parseBooleanEnvVar(
  process.env.DEBUG_MODE, 
  false, 
  'ServiceName'
);

// ❌ INCORRECT - Direct comparison without validation  
const debugEnabled = process.env.DEBUG_MODE === 'true';
```

#### Numeric Environment Variables
```typescript
import { parseNumberEnvVar } from '@/lib/utils/envUtils';

// ✅ CORRECT - Secure parsing with bounds checking
const maxConnections = parseNumberEnvVar(
  process.env.MAX_CONNECTIONS, 
  100, 
  'DatabaseService'
);
```

#### String Environment Variables
```typescript
import { parseStringEnvVar } from '@/lib/utils/envUtils';

// ✅ CORRECT - Secure parsing with allowlist validation
const logLevel = parseStringEnvVar(
  process.env.LOG_LEVEL, 
  'info',
  ['debug', 'info', 'warn', 'error'],
  'LoggingService'
);
```

## Security Features

### Input Validation
- Maximum length limits (1000 characters) prevent buffer overflow attacks
- Malicious pattern detection blocks common injection vectors
- Unicode and control character handling prevents bypass attempts

### Injection Attack Prevention
The utility automatically detects and blocks:
- Script injection: `<script>`, `$(command)`, backticks
- Shell injection: `&&`, `||`, `;`, `|`
- Path traversal: `../`, `..\\`
- Control characters: null bytes, Unicode exploits

### Default Value Safety
- Always provide secure defaults
- Graceful degradation when parsing fails
- Comprehensive logging in development mode

## Implementation Examples

### LoggingService Pattern
```typescript
// Example from LoggingService.ts
private configureFromEnvironment(): void {
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
  
  if (process.env.NODE_ENV === 'development' && enableDebug) {
    this.enabledLevels.add(LogLevel.DEBUG);
  }
}
```

### Batch Validation Pattern
```typescript
// Validate multiple environment variables at startup
import { validateBooleanEnvVars } from '@/lib/utils/envUtils';

const config = validateBooleanEnvVars({
  ENABLE_DEBUG: false,
  PERFORMANCE_METRICS_ENABLED: false,
  REQUEST_RESPONSE_LOGGING: false
}, 'ApplicationStartup');
```

## Development Guidelines

### Context Logging
Always provide a context string for better debugging:
```typescript
// ✅ GOOD - Includes service context
parseBooleanEnvVar(process.env.DEBUG, false, 'UserService');

// ❌ POOR - No context for debugging
parseBooleanEnvVar(process.env.DEBUG, false);
```

### Testing Considerations
When writing tests for environment variable behavior:
```typescript
// Mock environment variables properly
const originalEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'development';

// ... test code ...

// Always restore original environment
process.env.NODE_ENV = originalEnv;
```

## Code Review Checklist

When reviewing code, check for:
- [ ] No direct `process.env.VAR === 'value'` comparisons
- [ ] All environment variable parsing uses secure utilities
- [ ] Context strings provided for debugging
- [ ] Appropriate default values specified
- [ ] Test coverage for environment variable parsing

## Security Testing

All environment variable parsing is covered by comprehensive security tests:
- Injection attack prevention
- Unicode and special character handling
- Edge case validation
- Performance under load
- Malicious input detection

See `src/__tests__/envUtils.test.ts` for complete test coverage.

## Migration Guide

### Updating Existing Code
Replace direct environment variable comparisons:

```typescript
// Before
private enableMetrics = process.env.PERFORMANCE_METRICS === 'true';

// After  
private enableMetrics = parseBooleanEnvVar(
  process.env.PERFORMANCE_METRICS,
  false,
  'ServiceName'
);
```

### Import Statement
```typescript
import { 
  parseBooleanEnvVar,
  parseNumberEnvVar, 
  parseStringEnvVar 
} from '@/lib/utils/envUtils';
```

## Reporting Security Issues

If you discover security vulnerabilities in environment variable handling:
1. Do not commit the vulnerable code
2. Report the issue through secure channels
3. Follow responsible disclosure practices
4. Update this documentation if patterns change

---

**Last Updated:** [Current Date]  
**Review Cycle:** Quarterly security review required