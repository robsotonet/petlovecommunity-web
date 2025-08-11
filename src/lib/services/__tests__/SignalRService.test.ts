import { describe, it, expect, beforeEach, afterEach, vi, Mock } from 'vitest';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { SignalRService, createSignalRService } from '../SignalRService';
import { CorrelationService } from '../CorrelationService';
import { CorrelationContext } from '../../../types/enterprise';
import { SignalREventType, PetAdoptionStatusChangedEvent } from '../../../types/signalr';

// Mock @microsoft/signalr
vi.mock('@microsoft/signalr', () => ({
  HubConnectionBuilder: vi.fn(),
  HubConnectionState: {
    Disconnected: 'Disconnected',
    Connecting: 'Connecting',
    Connected: 'Connected',
    Disconnecting: 'Disconnecting',
    Reconnecting: 'Reconnecting',
  },
  LogLevel: {
    Trace: 'Trace',
    Debug: 'Debug',
    Information: 'Information',
    Warning: 'Warning',
    Error: 'Error',
    Critical: 'Critical',
    None: 'None',
  },
}));

describe('SignalRService', () => {
  let signalRService: SignalRService;
  let mockCorrelationService: CorrelationService;
  let mockConnection: Partial<HubConnection>;
  let mockBuilder: Partial<HubConnectionBuilder>;
  let mockCorrelationContext: CorrelationContext;

  beforeEach(() => {
    // Setup mock correlation context
    mockCorrelationContext = {
      correlationId: 'test-correlation-123',
      sessionId: 'test-session-456',
      timestampMs: Date.now(),
      userId: 'test-user-789',
    };

    // Setup mock correlation service
    mockCorrelationService = {
      getCurrentContext: vi.fn().mockReturnValue(mockCorrelationContext),
      getCurrentCorrelationId: vi.fn().mockReturnValue('test-correlation-123'),
    } as any;

    // Setup mock connection
    mockConnection = {
      connectionId: 'test-connection-id',
      state: HubConnectionState.Disconnected,
      start: vi.fn().mockImplementation(async () => {
        mockConnection.state = HubConnectionState.Connected;
        return Promise.resolve();
      }),
      stop: vi.fn().mockImplementation(async () => {
        mockConnection.state = HubConnectionState.Disconnected;
        return Promise.resolve();
      }),
      invoke: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
      off: vi.fn(),
      onclose: vi.fn(),
      onreconnecting: vi.fn(),
      onreconnected: vi.fn(),
    };

    // Setup mock builder
    mockBuilder = {
      withUrl: vi.fn().mockReturnThis(),
      withAutomaticReconnect: vi.fn().mockReturnThis(),
      configureLogging: vi.fn().mockReturnThis(),
      build: vi.fn().mockReturnValue(mockConnection),
    };

    // Mock HubConnectionBuilder
    (HubConnectionBuilder as Mock).mockImplementation(() => mockBuilder);

    // Create service instance
    signalRService = new SignalRService({}, mockCorrelationService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should create connection with correct configuration', async () => {
      const config = {
        baseUrl: 'https://api.example.com',
        hubPath: '/custom-hub',
        logLevel: 'Debug' as const,
      };

      const service = new SignalRService(config, mockCorrelationService);
      
      // Access private method for testing
      await service.connect();

      expect(HubConnectionBuilder).toHaveBeenCalled();
      expect(mockBuilder.withUrl).toHaveBeenCalledWith(
        'https://api.example.com/custom-hub',
        expect.objectContaining({
          accessTokenFactory: expect.any(Function),
          headers: expect.objectContaining({
            'X-Correlation-ID': 'test-correlation-123',
            'X-Session-ID': 'test-session-456',
            'X-User-ID': 'test-user-789',
          }),
        })
      );
      expect(mockBuilder.configureLogging).toHaveBeenCalledWith(LogLevel.Debug);
    });

    it('should connect successfully', async () => {
      mockConnection.state = HubConnectionState.Connected;
      
      await signalRService.connect();
      
      expect(mockConnection.start).toHaveBeenCalled();
      expect(signalRService.isConnected()).toBe(true);
      expect(signalRService.getConnectionState()).toBe(HubConnectionState.Connected);
    });

    it('should handle connection errors', async () => {
      const connectionError = new Error('Connection failed');
      (mockConnection.start as Mock).mockRejectedValue(connectionError);
      
      await expect(signalRService.connect()).rejects.toThrow('Connection failed');
      expect(signalRService.isConnected()).toBe(false);
    });

    it('should disconnect gracefully', async () => {
      // First connect
      mockConnection.state = HubConnectionState.Connected;
      await signalRService.connect();
      
      // Then disconnect
      mockConnection.state = HubConnectionState.Disconnected;
      await signalRService.disconnect();
      
      expect(mockConnection.stop).toHaveBeenCalled();
      expect(signalRService.isConnected()).toBe(false);
    });

    it('should not attempt to connect if already connected', async () => {
      mockConnection.state = HubConnectionState.Connected;
      signalRService = new SignalRService({}, mockCorrelationService);
      
      // Mock the connection as already established
      (signalRService as any).connection = mockConnection;
      
      await signalRService.connect();
      
      // start should not be called again
      expect(mockConnection.start).not.toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    beforeEach(async () => {
      mockConnection.state = HubConnectionState.Connected;
      await signalRService.connect();
    });

    it('should register event handlers', () => {
      const handler = vi.fn();
      
      signalRService.on('PetAdoptionStatusChanged', handler);
      
      expect(mockConnection.on).toHaveBeenCalledWith('PetAdoptionStatusChanged', expect.any(Function));
    });

    it('should unregister specific event handler', () => {
      const handler = vi.fn();
      
      signalRService.on('PetAdoptionStatusChanged', handler);
      signalRService.off('PetAdoptionStatusChanged', handler);
      
      // Note: This tests the internal handler tracking, actual off call happens in registerServerEventHandlers
      expect(mockConnection.off).toHaveBeenCalled();
    });

    it('should clear all handlers for event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      signalRService.on('PetAdoptionStatusChanged', handler1);
      signalRService.on('PetAdoptionStatusChanged', handler2);
      signalRService.off('PetAdoptionStatusChanged');
      
      // Should have cleared internal handlers
      const handlers = (signalRService as any).eventHandlers.get('PetAdoptionStatusChanged');
      expect(handlers.size).toBe(0);
    });

    it('should execute event handlers when events are received', async () => {
      const handler = vi.fn();
      const testEvent: PetAdoptionStatusChangedEvent = {
        petId: 'pet-123',
        status: 'adopted',
        adopterId: 'adopter-456',
        timestampMs: Date.now(),
        correlationId: 'event-correlation-123',
      };
      
      signalRService.on('PetAdoptionStatusChanged', handler);
      
      // Simulate event reception by calling the handler directly
      const internalHandlers = (signalRService as any).eventHandlers.get('PetAdoptionStatusChanged');
      for (const internalHandler of internalHandlers) {
        await internalHandler(testEvent);
      }
      
      expect(handler).toHaveBeenCalledWith(testEvent);
    });
  });

  describe('Group Management', () => {
    beforeEach(async () => {
      mockConnection.state = HubConnectionState.Connected;
      await signalRService.connect();
    });

    it('should join group successfully', async () => {
      await signalRService.joinGroup('test-group');
      
      expect(mockConnection.invoke).toHaveBeenCalledWith(
        'JoinGroup',
        'test-group',
        'test-correlation-123'
      );
    });

    it('should leave group successfully', async () => {
      await signalRService.leaveGroup('test-group');
      
      expect(mockConnection.invoke).toHaveBeenCalledWith(
        'LeaveGroup',
        'test-group',
        'test-correlation-123'
      );
    });

    it('should throw error when joining group without connection', async () => {
      const disconnectedService = new SignalRService({}, mockCorrelationService);
      
      await expect(disconnectedService.joinGroup('test-group')).rejects.toThrow(
        'SignalR connection is not established'
      );
    });
  });

  describe('Server Communication', () => {
    beforeEach(async () => {
      mockConnection.state = HubConnectionState.Connected;
      await signalRService.connect();
    });

    it('should send messages to server', async () => {
      const args = ['arg1', 'arg2', 123];
      
      await signalRService.sendMessage('TestMethod', ...args);
      
      expect(mockConnection.invoke).toHaveBeenCalledWith(
        'TestMethod',
        ...args,
        'test-correlation-123'
      );
    });

    it('should throw error when sending message without connection', async () => {
      const disconnectedService = new SignalRService({}, mockCorrelationService);
      
      await expect(disconnectedService.sendMessage('TestMethod')).rejects.toThrow(
        'SignalR connection is not established'
      );
    });
  });

  describe('Correlation Context Management', () => {
    it('should set and get correlation context', () => {
      const newContext: CorrelationContext = {
        correlationId: 'new-correlation-123',
        sessionId: 'new-session-456',
        timestampMs: Date.now(),
        userId: 'new-user-789',
      };
      
      signalRService.setCorrelationContext(newContext);
      
      expect(signalRService.getCorrelationContext()).toEqual(newContext);
    });

    it('should return null when no correlation context is set', () => {
      const service = new SignalRService({}, mockCorrelationService);
      
      expect(service.getCorrelationContext()).toBe(null);
    });
  });

  describe('Service Factory', () => {
    it('should create singleton instance', () => {
      const service1 = createSignalRService({}, mockCorrelationService);
      const service2 = createSignalRService({}, mockCorrelationService);
      
      expect(service1).toBe(service2);
    });

    it('should throw error when creating service without correlation service', () => {
      expect(() => createSignalRService()).toThrow(
        'SignalRService requires CorrelationService instance'
      );
    });
  });

  describe('Connection State Monitoring', () => {
    it('should handle connection close events', async () => {
      mockConnection.state = HubConnectionState.Connected;
      await signalRService.connect();
      
      // Simulate connection close
      const onCloseHandler = (mockConnection.onclose as Mock).mock.calls[0][0];
      const error = new Error('Connection lost');
      
      onCloseHandler(error);
      
      // Should log the error (we can't directly test console.error, but ensure no exceptions)
      expect(signalRService.getCorrelationContext()).toBe(null);
    });

    it('should handle reconnection events', async () => {
      mockConnection.state = HubConnectionState.Connected;
      await signalRService.connect();
      
      // Simulate reconnection
      const onReconnectedHandler = (mockConnection.onreconnected as Mock).mock.calls[0][0];
      
      onReconnectedHandler('new-connection-id');
      
      // Should update correlation context
      expect(signalRService.getCorrelationContext()).toEqual(mockCorrelationContext);
    });
  });
});