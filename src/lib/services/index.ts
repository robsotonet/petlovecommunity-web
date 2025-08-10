// Enterprise Services Integration
// This file provides a centralized way to access and manage all enterprise services

export { idempotencyService } from './IdempotencyService';
export { transactionManager } from './TransactionManager';
export { enterpriseLifecycleManager } from './EnterpriseLifecycleManager';
export { SignalRService, createSignalRService, getSignalRService } from './SignalRService';
export { LoggingService, loggingService, LogLevel, LogCategory } from './LoggingService';

export type { ServiceStatus } from './EnterpriseLifecycleManager';
export type { Transaction, TransactionType, TransactionStatus } from '../../types/enterprise';
export type { IdempotencyRecord } from '../../types/enterprise';

// Re-export lifecycle management functions for easy access
export const enterpriseServices = {
  // Lifecycle management
  start: () => enterpriseLifecycleManager.startServices(),
  stop: () => enterpriseLifecycleManager.stopServices(),
  restart: () => enterpriseLifecycleManager.restartServices(),
  
  // Health monitoring
  health: () => enterpriseLifecycleManager.getHealthStatus(),
  metrics: () => enterpriseLifecycleManager.getMetrics(),
  
  // Emergency operations
  forceCleanup: () => enterpriseLifecycleManager.forceCleanup(),
  
  // Service access
  idempotency: idempotencyService,
  transactions: transactionManager,
  lifecycle: enterpriseLifecycleManager,
  signalR: () => getSignalRService(),
  logging: loggingService,
};

// Development helper for manual service management
if (process.env.NODE_ENV === 'development') {
  // Make enterprise services available globally for debugging
  if (typeof globalThis !== 'undefined') {
    (globalThis as any).__enterpriseServices = enterpriseServices;
  }
  
  console.log('[EnterpriseServices] Services available globally as __enterpriseServices for debugging');
}