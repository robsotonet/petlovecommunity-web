export const generateCorrelationId = (): string => {
  return `plc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

export const generateSessionId = (): string => {
  return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

export const generateTransactionId = (): string => {
  return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

export const generateIdempotencyKey = (operation: string, params: any = {}): string => {
  const paramString = JSON.stringify(params);
  const hash = btoa(paramString).replace(/[^a-zA-Z0-9]/g, '');
  return `idem_${operation}_${hash}_${Date.now()}`;
};