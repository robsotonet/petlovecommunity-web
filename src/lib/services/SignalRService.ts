import { HubConnection, HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr';
import type { SignalRMessage, SignalREventHandlers } from '../../types/signalr';
import { correlationService } from './CorrelationService';
import { transactionManager } from './TransactionManager';

export interface SignalRServiceConfig {
  url: string;
  automaticReconnect: boolean;
  reconnectIntervals: number[];
  logLevel: LogLevel;
  maxRetries: number;
  heartbeatInterval: number;
}

export class SignalRService {
  private static instance: SignalRService;
  private connection: HubConnection | null = null;
  private config: SignalRServiceConfig;
  private eventHandlers: Map<string, Set<(...args: unknown[]) => void>> = new Map();
  private connectionState: HubConnectionState = HubConnectionState.Disconnected;
  private reconnectAttempts = 0;
  private heartbeatTimer?: NodeJS.Timeout;
  private lastHeartbeat?: number;
  private isReconnecting = false;

  private readonly DEFAULT_CONFIG: SignalRServiceConfig = {
    url: process.env.NEXT_PUBLIC_API_URL 
      ? `${process.env.NEXT_PUBLIC_API_URL}/hubs/petLove`
      : 'http://localhost:5000/hubs/petLove',
    automaticReconnect: true,
    reconnectIntervals: [0, 2000, 10000, 30000, 60000],
    logLevel: process.env.NODE_ENV === 'development' ? LogLevel.Information : LogLevel.Warning,
    maxRetries: 5,
    heartbeatInterval: 30000, // 30 seconds
  };

  private constructor(config?: Partial<SignalRServiceConfig>) {
    this.config = { ...this.DEFAULT_CONFIG, ...config };
  }

  static getInstance(config?: Partial<SignalRServiceConfig>): SignalRService {
    if (!SignalRService.instance) {
      SignalRService.instance = new SignalRService(config);
    }
    return SignalRService.instance;
  }

  /**
   * Initialize and start the SignalR connection
   */
  async connect(): Promise<void> {
    if (this.connection && this.connectionState !== HubConnectionState.Disconnected) {
      return;
    }

    try {
      this.connection = this.buildConnection();
      this.setupConnectionHandlers();
      this.setupEventHandlers();

      await this.connection.start();
      this.connectionState = HubConnectionState.Connected;
      this.reconnectAttempts = 0;
      this.startHeartbeat();

      console.log('[SignalRService] Connected successfully', {
        correlationId: correlationService.getCurrentContext()?.correlationId,
        url: this.config.url,
      });

    } catch (error) {
      console.error('[SignalRService] Connection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId: correlationService.getCurrentContext()?.correlationId,
      });
      
      if (this.config.automaticReconnect && this.reconnectAttempts < this.config.maxRetries) {
        await this.scheduleReconnect();
      }
      
      throw error;
    }
  }

  /**
   * Disconnect from the SignalR hub
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      this.stopHeartbeat();
      this.isReconnecting = false;
      
      try {
        await this.connection.stop();
        console.log('[SignalRService] Disconnected successfully');
      } catch (error) {
        console.error('[SignalRService] Disconnect error', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        this.connection = null;
        this.connectionState = HubConnectionState.Disconnected;
      }
    }
  }

  /**
   * Send a message to the hub with enterprise reliability
   */
  async sendMessage<T = unknown>(methodName: string, ...args: unknown[]): Promise<T> {
    if (!this.connection || this.connectionState !== HubConnectionState.Connected) {
      throw new Error('[SignalRService] Cannot send message: not connected');
    }

    const correlationId = correlationService.getCurrentContext()?.correlationId;
    const transactionId = transactionManager.generateTransactionId();

    try {
      // Wrap the message with correlation context
      const message: SignalRMessage = {
        correlationId: correlationId || 'unknown',
        timestamp: Date.now(),
        type: methodName,
        payload: args,
      };

      const result = await this.connection.invoke<T>(methodName, message);
      
      console.log('[SignalRService] Message sent', {
        method: methodName,
        correlationId,
        transactionId,
      });

      return result;
    } catch (error) {
      console.error('[SignalRService] Send message failed', {
        method: methodName,
        error: error instanceof Error ? error.message : 'Unknown error',
        correlationId,
        transactionId,
      });
      throw error;
    }
  }

  /**
   * Invoke a hub method with return value
   */
  async invoke<T = unknown>(methodName: string, ...args: unknown[]): Promise<T> {
    return this.sendMessage<T>(methodName, ...args);
  }

  /**
   * Subscribe to hub events
   */
  on(eventName: string, handler: (...args: unknown[]) => void): void {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, new Set());
    }
    
    const handlers = this.eventHandlers.get(eventName)!;
    handlers.add(handler);

    // Register with actual SignalR connection if available
    if (this.connection) {
      this.connection.on(eventName, handler);
    }
  }

  /**
   * Unsubscribe from hub events
   */
  off(eventName: string, handler?: (...args: unknown[]) => void): void {
    const handlers = this.eventHandlers.get(eventName);
    if (!handlers) return;

    if (handler) {
      handlers.delete(handler);
      if (this.connection) {
        this.connection.off(eventName, handler);
      }
    } else {
      // Remove all handlers for this event
      handlers.clear();
      if (this.connection) {
        this.connection.off(eventName);
      }
    }

    if (handlers.size === 0) {
      this.eventHandlers.delete(eventName);
    }
  }

  /**
   * Get current connection state
   */
  getConnectionState(): HubConnectionState {
    return this.connection?.state ?? HubConnectionState.Disconnected;
  }

  /**
   * Check if currently connected
   */
  isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  /**
   * Get connection statistics
   */
  getStats() {
    return {
      connectionState: this.connectionState,
      reconnectAttempts: this.reconnectAttempts,
      lastHeartbeat: this.lastHeartbeat,
      eventHandlerCount: Array.from(this.eventHandlers.values())
        .reduce((total, handlers) => total + handlers.size, 0),
      isReconnecting: this.isReconnecting,
    };
  }

  /**
   * Build the SignalR connection with enterprise configuration
   */
  private buildConnection(): HubConnection {
    const builder = new HubConnectionBuilder()
      .withUrl(this.config.url, {
        headers: correlationService.getRequestHeaders(),
      })
      .configureLogging(this.config.logLevel);

    if (this.config.automaticReconnect) {
      builder.withAutomaticReconnect(this.config.reconnectIntervals);
    }

    return builder.build();
  }

  /**
   * Setup connection event handlers
   */
  private setupConnectionHandlers(): void {
    if (!this.connection) return;

    this.connection.onclose((error) => {
      this.connectionState = HubConnectionState.Disconnected;
      console.log('[SignalRService] Connection closed', {
        error: error?.message,
        correlationId: correlationService.getCurrentContext()?.correlationId,
      });

      this.stopHeartbeat();

      if (error && this.config.automaticReconnect && !this.isReconnecting) {
        this.scheduleReconnect();
      }
    });

    this.connection.onreconnecting(() => {
      this.connectionState = HubConnectionState.Reconnecting;
      this.isReconnecting = true;
      console.log('[SignalRService] Reconnecting...');
    });

    this.connection.onreconnected(() => {
      this.connectionState = HubConnectionState.Connected;
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      console.log('[SignalRService] Reconnected successfully');
    });
  }

  /**
   * Setup event handlers for all registered events
   */
  private setupEventHandlers(): void {
    if (!this.connection) return;

    // Re-register all event handlers with the new connection
    for (const [eventName, handlers] of this.eventHandlers) {
      for (const handler of handlers) {
        this.connection.on(eventName, handler);
      }
    }

    // Setup default Pet Love Community event handlers
    this.setupPetLoveCommunityEvents();
  }

  /**
   * Setup Pet Love Community specific event handlers
   */
  private setupPetLoveCommunityEvents(): void {
    if (!this.connection) return;

    // Pet adoption status changes
    this.connection.on('PetAdoptionStatusChanged', (petId: string, status: string) => {
      console.log('[SignalRService] Pet adoption status changed', { petId, status });
      // Trigger store updates or other actions as needed
    });

    // Service availability changes
    this.connection.on('ServiceAvailabilityChanged', (serviceId: string, available: boolean) => {
      console.log('[SignalRService] Service availability changed', { serviceId, available });
    });

    // Event capacity changes
    this.connection.on('EventCapacityChanged', (eventId: string, capacity: number) => {
      console.log('[SignalRService] Event capacity changed', { eventId, capacity });
    });

    // Community post notifications
    this.connection.on('CommunityPostCreated', (post: unknown) => {
      console.log('[SignalRService] Community post created', { post });
    });

    // User notifications
    this.connection.on('UserNotification', (notification: unknown) => {
      console.log('[SignalRService] User notification received', { notification });
    });
  }

  /**
   * Schedule automatic reconnection
   */
  private async scheduleReconnect(): Promise<void> {
    if (this.isReconnecting || this.reconnectAttempts >= this.config.maxRetries) {
      return;
    }

    this.isReconnecting = true;
    const delay = this.config.reconnectIntervals[
      Math.min(this.reconnectAttempts, this.config.reconnectIntervals.length - 1)
    ];

    console.log(`[SignalRService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    setTimeout(async () => {
      try {
        this.reconnectAttempts++;
        await this.connect();
      } catch (error) {
        console.error('[SignalRService] Reconnection failed', {
          attempt: this.reconnectAttempts,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        
        if (this.reconnectAttempts < this.config.maxRetries) {
          await this.scheduleReconnect();
        } else {
          this.isReconnecting = false;
          console.error('[SignalRService] Max reconnection attempts reached');
        }
      }
    }, delay);
  }

  /**
   * Start heartbeat monitoring
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(async () => {
      try {
        if (this.isConnected()) {
          await this.sendMessage('Heartbeat');
          this.lastHeartbeat = Date.now();
        }
      } catch (error) {
        console.warn('[SignalRService] Heartbeat failed', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}

// Export singleton instance
export const signalRService = SignalRService.getInstance();