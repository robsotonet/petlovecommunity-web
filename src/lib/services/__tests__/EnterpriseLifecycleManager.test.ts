import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnterpriseLifecycleManager, enterpriseLifecycleManager } from '../EnterpriseLifecycleManager';
import { MockTimeUtils, TEST_CONSTANTS } from '../../../test/helpers/testDataFactory';

// Mock the dependencies
vi.mock('../IdempotencyService', () => ({
  idempotencyService: {
    getStats: vi.fn(() => ({
      totalRecords: 10,
      activeRecords: 5,
      expiredRecords: 5,
    })),
    cleanup: vi.fn(),
  },
  idempotencyServiceLifecycle: {
    start: vi.fn(),
    stop: vi.fn(),
    isRunning: vi.fn(() => true),
  },
}));

vi.mock('../TransactionManager', () => ({
  transactionManager: {
    getActiveTimeoutCount: vi.fn(() => 3),
    shutdown: vi.fn(),
    clearAllTimeouts: vi.fn(),
  },
}));

vi.mock('../../store/middleware/idempotencyMiddleware', () => ({
  idempotencyCleanup: {
    start: vi.fn(),
    stop: vi.fn(),
    forceClean: vi.fn(() => 2),
  },
}));

describe('EnterpriseLifecycleManager', () => {
  let manager: EnterpriseLifecycleManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = EnterpriseLifecycleManager.getInstance();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Reset singleton state for proper test isolation
    EnterpriseLifecycleManager.resetForTesting();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance on multiple calls', () => {
      const instance1 = EnterpriseLifecycleManager.getInstance();
      const instance2 = EnterpriseLifecycleManager.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(manager);
    });

    it('should export singleton instance', () => {
      expect(enterpriseLifecycleManager).toBe(EnterpriseLifecycleManager.getInstance());
    });
  });

  describe('Service Lifecycle Management', () => {
    it('should start all services', async () => {
      await manager.startServices();
      
      const health = manager.getHealthStatus();
      expect(health.summary.running).toBe(3);
      expect(health.summary.stopped).toBe(0);
      expect(health.overall).toBe('healthy');
    });

    it('should stop all services', async () => {
      // First start services
      await manager.startServices();
      expect(manager.getHealthStatus().summary.running).toBe(3);
      
      // Then stop them
      await manager.stopServices();
      
      const health = manager.getHealthStatus();
      expect(health.summary.stopped).toBe(3);
      expect(health.summary.running).toBe(0);
      expect(health.overall).toBe('degraded');
    });

    it('should restart all services', async () => {
      await manager.restartServices();
      
      const health = manager.getHealthStatus();
      expect(health.summary.running).toBe(3);
      expect(health.overall).toBe('healthy');
    });

    it('should prevent starting services during shutdown', async () => {
      // Start shutdown process (but don't await it immediately)
      const shutdownPromise = manager.stopServices();
      
      // Try to start services during shutdown
      await expect(manager.startServices()).rejects.toThrow('Cannot start services during shutdown');
      
      // Wait for shutdown to complete
      await shutdownPromise;
    });
  });

  describe('Health Monitoring', () => {
    it('should return health status with all services stopped initially', () => {
      const health = manager.getHealthStatus();
      
      expect(health.overall).toBe('degraded');
      expect(health.summary.total).toBe(3);
      expect(health.summary.stopped).toBe(3);
      expect(health.summary.running).toBe(0);
      expect(health.summary.errors).toBe(0);
      
      expect(health.services).toHaveLength(3);
      expect(health.services.map(s => s.name)).toContain('IdempotencyService');
      expect(health.services.map(s => s.name)).toContain('TransactionManager');
      expect(health.services.map(s => s.name)).toContain('IdempotencyMiddleware');
    });

    it('should return healthy status when all services are running', async () => {
      await manager.startServices();
      
      const health = manager.getHealthStatus();
      expect(health.overall).toBe('healthy');
      expect(health.summary.running).toBe(3);
    });

    it('should track service start times', async () => {
      const startTime = Date.now();
      await manager.startServices();
      
      const idempotencyService = manager.getService('IdempotencyService');
      expect(idempotencyService?.status).toBe('running');
      expect(idempotencyService?.lastStarted).toBeGreaterThanOrEqual(startTime);
    });

    it('should track service stop times', async () => {
      await manager.startServices();
      const stopTime = Date.now();
      await manager.stopServices();
      
      const idempotencyService = manager.getService('IdempotencyService');
      expect(idempotencyService?.status).toBe('stopped');
      expect(idempotencyService?.lastStopped).toBeGreaterThanOrEqual(stopTime);
    });
  });

  describe('Metrics Collection', () => {
    it('should collect metrics from all services', async () => {
      await manager.startServices();
      
      const metrics = manager.getMetrics();
      
      expect(metrics).toHaveProperty('idempotency');
      expect(metrics.idempotency).toEqual({
        totalRecords: 10,
        activeRecords: 5,
        expiredRecords: 5,
      });
      
      expect(metrics).toHaveProperty('transactions');
      expect(metrics.transactions.activeTimeouts).toBe(3);
      
      expect(metrics).toHaveProperty('uptime');
      expect(Object.keys(metrics.uptime)).toHaveLength(3);
    });

    it('should calculate uptime correctly', async () => {
      // Use controlled time for reliable, fast testing
      const startTime = MockTimeUtils.getMockTime();
      const dateNowSpy = vi.spyOn(Date, 'now')
        .mockReturnValue(startTime); // Initial time for service start
      
      await manager.startServices();
      
      // Advance mock time to simulate elapsed duration
      const elapsedTime = startTime + TEST_CONSTANTS.UPTIME_CALCULATION_DELAY_MS;
      dateNowSpy.mockReturnValue(elapsedTime); // Later time for metrics calculation
      
      const metrics = manager.getMetrics();
      
      expect(metrics.uptime.IdempotencyService).toBeGreaterThan(0);
      expect(metrics.uptime.TransactionManager).toBeGreaterThan(0);
      expect(metrics.uptime.IdempotencyMiddleware).toBeGreaterThan(0);
      
      // Verify uptime matches the expected duration
      expect(metrics.uptime.IdempotencyService).toBe(TEST_CONSTANTS.UPTIME_CALCULATION_DELAY_MS);
      expect(metrics.uptime.TransactionManager).toBe(TEST_CONSTANTS.UPTIME_CALCULATION_DELAY_MS);
      expect(metrics.uptime.IdempotencyMiddleware).toBe(TEST_CONSTANTS.UPTIME_CALCULATION_DELAY_MS);
      
      dateNowSpy.mockRestore();
    });

    it('should return zero uptime for stopped services', () => {
      const metrics = manager.getMetrics();
      
      expect(metrics.uptime.IdempotencyService).toBe(0);
      expect(metrics.uptime.TransactionManager).toBe(0);
      expect(metrics.uptime.IdempotencyMiddleware).toBe(0);
    });
  });

  describe('Emergency Operations', () => {
    it('should force cleanup all services', async () => {
      await manager.forceCleanup();
      
      // Verify cleanup methods were called on all services
      const { idempotencyService } = await import('../IdempotencyService');
      const { transactionManager } = await import('../TransactionManager');
      const { idempotencyCleanup } = await import('../../store/middleware/idempotencyMiddleware');
      
      expect(idempotencyService.cleanup).toHaveBeenCalledOnce();
      expect(transactionManager.clearAllTimeouts).toHaveBeenCalledOnce();
      expect(idempotencyCleanup.forceClean).toHaveBeenCalledOnce();
    });

    it('should handle cleanup errors gracefully', async () => {
      // Mock one service to throw an error
      const { idempotencyService } = await import('../IdempotencyService');
      vi.mocked(idempotencyService.cleanup).mockImplementationOnce(() => {
        throw new Error('Cleanup failed');
      });
      
      await expect(manager.forceCleanup()).rejects.toThrow('Cleanup failed');
    });
  });

  describe('Service Management', () => {
    it('should check if manager is ready', () => {
      expect(manager.isReady()).toBe(true);
    });

    it('should get individual service status', async () => {
      await manager.startServices();
      
      const idempotencyService = manager.getService('IdempotencyService');
      expect(idempotencyService).toBeDefined();
      expect(idempotencyService?.name).toBe('IdempotencyService');
      expect(idempotencyService?.status).toBe('running');
    });

    it('should return undefined for non-existent service', () => {
      const nonExistent = manager.getService('NonExistentService');
      expect(nonExistent).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle service start errors', async () => {
      // Mock a service to throw an error during start
      const { idempotencyServiceLifecycle } = await import('../IdempotencyService');
      vi.mocked(idempotencyServiceLifecycle.start).mockImplementationOnce(() => {
        throw new Error('Start failed');
      });
      
      await expect(manager.startServices()).rejects.toThrow('Start failed');
      
      const idempotencyService = manager.getService('IdempotencyService');
      expect(idempotencyService?.status).toBe('error');
      expect(idempotencyService?.errorMessage).toBe('Start failed');
    });

    it('should handle service stop errors', async () => {
      await manager.startServices();
      
      // Mock a service to throw an error during stop
      const { transactionManager } = await import('../TransactionManager');
      vi.mocked(transactionManager.shutdown).mockImplementationOnce(() => {
        throw new Error('Stop failed');
      });
      
      // stopServices should not throw, but should mark service as error
      await manager.stopServices();
      
      const transactionManagerService = manager.getService('TransactionManager');
      expect(transactionManagerService?.status).toBe('error');
      expect(transactionManagerService?.errorMessage).toBe('Stop failed');
    });

    it('should mark overall health as unhealthy when services have errors', async () => {
      // Create an error state
      const { idempotencyServiceLifecycle } = await import('../IdempotencyService');
      vi.mocked(idempotencyServiceLifecycle.start).mockImplementationOnce(() => {
        throw new Error('Start failed');
      });
      
      await expect(manager.startServices()).rejects.toThrow();
      
      const health = manager.getHealthStatus();
      expect(health.overall).toBe('unhealthy');
      expect(health.summary.errors).toBeGreaterThan(0);
    });
  });

  describe('Console Logging', () => {
    it('should log service operations in development', async () => {
      // Mock NODE_ENV to simulate development environment
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Reset manager to pick up new environment
      EnterpriseLifecycleManager.resetForTesting();
      manager = EnterpriseLifecycleManager.getInstance();
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await manager.startServices();
      await manager.stopServices();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[EnterpriseLifecycle]')
      );
      
      consoleSpy.mockRestore();
      
      // Restore original NODE_ENV
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock a service to throw an error
      const { idempotencyServiceLifecycle } = await import('../IdempotencyService');
      vi.mocked(idempotencyServiceLifecycle.start).mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      await expect(manager.startServices()).rejects.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[EnterpriseLifecycle] Failed to start services:',
        expect.any(Error)
      );
      
      consoleErrorSpy.mockRestore();
    });
  });
});