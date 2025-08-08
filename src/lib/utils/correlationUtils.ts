// Cryptographically secure ID generation
const generateSecureId = (): string => {
  // Use crypto.randomUUID() for cryptographically secure generation
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '');
  }
  
  // Fallback for environments without crypto.randomUUID (should not happen in modern browsers/Node)
  console.warn('crypto.randomUUID() not available, falling back to less secure generation');
  return `${Date.now()}_${Math.random().toString(36).substring(2, 15)}_${Math.random().toString(36).substring(2, 15)}`;
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