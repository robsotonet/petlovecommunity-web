import { idempotencyService, idempotencyServiceLifecycle } from './IdempotencyService';
import { transactionManager } from './TransactionManager';
import { idempotencyCleanup } from '../store/middleware/idempotencyMiddleware';

export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  lastStarted?: number;
  lastStopped?: number;
  errorMessage?: string;
}

export class EnterpriseLifecycleManager {
  private static instance: EnterpriseLifecycleManager;
  private services: Map<string, ServiceStatus> = new Map();
  private isShuttingDown: boolean = false;

  private constructor() {
    this.initializeServices();
  }

  static getInstance(): EnterpriseLifecycleManager {
    if (!EnterpriseLifecycleManager.instance) {
      EnterpriseLifecycleManager.instance = new EnterpriseLifecycleManager();
    }
    return EnterpriseLifecycleManager.instance;
  }

  private initializeServices(): void {
    // Initialize service status tracking
    this.services.set('IdempotencyService', {
      name: 'IdempotencyService',
      status: 'stopped'
    });

    this.services.set('TransactionManager', {
      name: 'TransactionManager', 
      status: 'stopped'
    });

    this.services.set('IdempotencyMiddleware', {
      name: 'IdempotencyMiddleware',
      status: 'stopped'
    });

    if (process.env.NODE_ENV === 'development') {
      console.log('[EnterpriseLifecycle] Service registry initialized');
    }
  }

  /**
   * Start all enterprise services
   */
  async startServices(): Promise<void> {
    if (this.isShuttingDown) {
      throw new Error('Cannot start services during shutdown');
    }

    try {
      // Start IdempotencyService cleanup
      await this.startService('IdempotencyService', () => {
        idempotencyServiceLifecycle.start();
      });

      // TransactionManager is singleton - just mark as running
      await this.startService('TransactionManager', () => {
        // TransactionManager starts automatically as singleton
        // No explicit start needed
      });

      // Start IdempotencyMiddleware cleanup
      await this.startService('IdempotencyMiddleware', () => {
        idempotencyCleanup.start();
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[EnterpriseLifecycle] All enterprise services started successfully');
      }
    } catch (error) {
      console.error('[EnterpriseLifecycle] Failed to start services:', error);
      throw error;
    }
  }

  /**
   * Stop all enterprise services gracefully
   */
  async stopServices(): Promise<void> {
    this.isShuttingDown = true;

    try {
      // Stop IdempotencyMiddleware cleanup
      await this.stopService('IdempotencyMiddleware', () => {
        idempotencyCleanup.stop();
      });

      // Stop TransactionManager
      await this.stopService('TransactionManager', () => {
        transactionManager.shutdown();
      });

      // Stop IdempotencyService cleanup
      await this.stopService('IdempotencyService', () => {
        idempotencyServiceLifecycle.stop();
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('[EnterpriseLifecycle] All enterprise services stopped successfully');
      }
    } catch (error) {
      console.error('[EnterpriseLifecycle] Error during service shutdown:', error);
    } finally {
      this.isShuttingDown = false;
    }
  }

  /**
   * Restart all services
   */
  async restartServices(): Promise<void> {
    await this.stopServices();
    await this.startServices();
  }

  /**
   * Get health status of all services
   */
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: ServiceStatus[];
    summary: {
      total: number;
      running: number;
      stopped: number;
      errors: number;
    };
  } {
    const services = Array.from(this.services.values());
    const running = services.filter(s => s.status === 'running').length;
    const stopped = services.filter(s => s.status === 'stopped').length;
    const errors = services.filter(s => s.status === 'error').length;

    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (errors > 0) {
      overall = 'unhealthy';
    } else if (stopped > 0) {
      overall = 'degraded';
    } else {
      overall = 'healthy';
    }

    return {
      overall,
      services,
      summary: {
        total: services.length,
        running,
        stopped,
        errors
      }
    };
  }

  /**
   * Get detailed metrics for monitoring
   */
  getMetrics(): {
    idempotency: {
      cacheSize: number;
      activeRecords: number;
      expiredRecords: number;
    };
    transactions: {
      activeTimeouts: number;
    };
    uptime: {
      [serviceName: string]: number;
    };
  } {
    const now = Date.now();
    const uptime: { [serviceName: string]: number } = {};

    for (const [name, service] of this.services) {
      if (service.status === 'running' && service.lastStarted) {
        uptime[name] = now - service.lastStarted;
      } else {
        uptime[name] = 0;
      }
    }

    return {
      idempotency: idempotencyService.getStats(),
      transactions: {
        activeTimeouts: transactionManager.getActiveTimeoutCount(),
      },
      uptime,
    };
  }

  /**
   * Force cleanup of all services (emergency cleanup)
   */
  async forceCleanup(): Promise<void> {
    try {
      // Force clean IdempotencyService
      idempotencyService.cleanup();
      
      // Force clean TransactionManager timeouts
      transactionManager.clearAllTimeouts();
      
      // Force clean IdempotencyMiddleware
      idempotencyCleanup.forceClean();

      if (process.env.NODE_ENV === 'development') {
        console.log('[EnterpriseLifecycle] Force cleanup completed');
      }
    } catch (error) {
      console.error('[EnterpriseLifecycle] Error during force cleanup:', error);
      throw error;
    }
  }

  private async startService(serviceName: string, startFn: () => void): Promise<void> {
    try {
      startFn();
      
      this.services.set(serviceName, {
        name: serviceName,
        status: 'running',
        lastStarted: Date.now()
      });
    } catch (error) {
      this.services.set(serviceName, {
        name: serviceName,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  private async stopService(serviceName: string, stopFn: () => void): Promise<void> {
    try {
      stopFn();
      
      const current = this.services.get(serviceName);
      this.services.set(serviceName, {
        ...current!,
        status: 'stopped',
        lastStopped: Date.now()
      });
    } catch (error) {
      this.services.set(serviceName, {
        name: serviceName,
        status: 'error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Check if lifecycle manager is ready
   */
  isReady(): boolean {
    return !this.isShuttingDown && this.services.size > 0;
  }

  /**
   * Get service by name
   */
  getService(serviceName: string): ServiceStatus | undefined {
    return this.services.get(serviceName);
  }

  /**
   * Reset singleton state - for testing purposes only
   * @internal
   */
  static resetForTesting(): void {
    if (EnterpriseLifecycleManager.instance) {
      EnterpriseLifecycleManager.instance.services.clear();
      EnterpriseLifecycleManager.instance.isShuttingDown = false;
      EnterpriseLifecycleManager.instance.initializeServices();
    }
  }
}

// Export singleton instance
export const enterpriseLifecycleManager = EnterpriseLifecycleManager.getInstance();

// Auto-start services in production, manual start in development
if (process.env.NODE_ENV === 'production') {
  enterpriseLifecycleManager.startServices().catch(error => {
    console.error('[EnterpriseLifecycle] Failed to auto-start services:', error);
  });
}

// Hot module replacement cleanup for development
if (typeof module !== 'undefined' && module.hot) {
  module.hot.dispose(() => {
    enterpriseLifecycleManager.stopServices();
  });
}