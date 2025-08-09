// Enterprise-grade cryptographically secure ID generation
const generateSecureId = (): string => {
  // Require crypto.randomUUID() for enterprise security
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '');
  }
  
  // No fallbacks allowed in enterprise environment - this is a critical security requirement
  throw new Error(
    'CRITICAL SECURITY ERROR: crypto.randomUUID() is not available. ' +
    'Enterprise correlation IDs require cryptographically secure generation using Web Crypto API. ' +
    'This environment does not meet enterprise security requirements. ' +
    'Please ensure your environment supports crypto.randomUUID() (available in modern browsers and Node.js 19+).'
  );
};

export const generateCorrelationId = (): string => {
  return `plc_${generateSecureId()}`;
};

export const generateSessionId = (): string => {
  return `sess_${generateSecureId()}`;
};

export const generateTransactionId = (): string => {
  return `txn_${generateSecureId()}`;
};

export const generateIdempotencyKey = (operation: string, params: any = {}): string => {
  const paramString = JSON.stringify(params);
  const hash = btoa(paramString).replace(/[^a-zA-Z0-9]/g, '');
  return `idem_${operation}_${hash}_${Date.now()}`;
};