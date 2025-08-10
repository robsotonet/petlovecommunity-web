import { 
  HubConnection, 
  HubConnectionBuilder, 
  HubConnectionState, 
  LogLevel,
  IRetryPolicy 
} from '@microsoft/signalr';
import { 
  ISignalRService,
  SignalRConfig,
  SignalREventType,
  SignalREventHandler,
  SignalREvent,
  SignalRError
} from '@/types/signalr';
import { CorrelationContext } from '@/types/enterprise';
import { CorrelationService } from './CorrelationService';

// Enterprise retry policy with exponential backoff
class EnterpriseRetryPolicy implements IRetryPolicy {
  constructor(private correlationService: CorrelationService) {}

  nextRetryDelayInMilliseconds(retryContext: any): number | null {
    const { elapsedMilliseconds, previousRetryCount } = retryContext;
    
    // Log retry attempt with correlation
    const correlationId = this.correlationService.getCurrentCorrelationId();
    console.warn(`[SignalR] Retry attempt ${previousRetryCount + 1} (correlation: ${correlationId})`);
    
    // Maximum 5 retry attempts
    if (previousRetryCount >= 5) {
      return null;
    }
    
    // Exponential backoff: 0, 2s, 10s, 30s, 60s, 120s
    const delays = [0, 2000, 10000, 30000, 60000, 120000];
    return delays[previousRetryCount] || 120000;
  }
}

export class SignalRService implements ISignalRService {
  private connection: HubConnection | null = null;
  private correlationContext: CorrelationContext | null = null;
  private eventHandlers: Map<SignalREventType, Set<SignalREventHandler>> = new Map();
  private config: SignalRConfig;
  private correlationService: CorrelationService;

  constructor(
    config: Partial<SignalRConfig> = {},
    correlationService: CorrelationService
  ) {
    this.correlationService = correlationService;
    
    // Default configuration
    this.config = {
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
      hubPath: '/hubs/petLove',
      automaticReconnect: true,
      reconnectDelaysMs: [0, 2000, 10000, 30000, 60000],
      logLevel: 'Information',
      ...config
    };

    this.initializeEventHandlers();
  }

  private initializeEventHandlers(): void {
    // Initialize handler sets for each event type
    const eventTypes: SignalREventType[] = [
      'PetAdoptionStatusChanged',
      'ServiceBookingStatusChanged', 
      'EventRSVPChanged',
      'SocialInteractionReceived',
      'UserStatusChanged',
      'NotificationReceived'
    ];

    eventTypes.forEach(eventType => {
      this.eventHandlers.set(eventType, new Set());
    });
  }

  public async connect(): Promise<void> {
    if (this.connection && this.connection.state === HubConnectionState.Connected) {
      console.log('[SignalR] Already connected');
      return;
    }

    try {
      // Get current correlation context
      this.correlationContext = this.correlationService.getCurrentContext();
      
      const hubUrl = `${this.config.baseUrl}${this.config.hubPath}`;
      
      // Build connection with enterprise features
      const builder = new HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: this.getAccessToken.bind(this),
          headers: this.buildHeaders()
        })
        .configureLogging(this.mapLogLevel(this.config.logLevel));

      // Add automatic reconnect with custom retry policy
      if (this.config.automaticReconnect) {
        builder.withAutomaticReconnect(new EnterpriseRetryPolicy(this.correlationService));
      }

      this.connection = builder.build();

      // Set up connection event handlers
      this.setupConnectionEventHandlers();
      
      // Register server event handlers
      this.registerServerEventHandlers();

      // Start connection
      await this.connection.start();
      
      console.log(`[SignalR] Connected successfully (correlation: ${this.correlationContext?.correlationId})`);
      
      // Join user-specific group if authenticated
      if (this.correlationContext?.userId) {
        try {
          await this.joinGroup(`user_${this.correlationContext.userId}`);
          console.log(`[SignalR] Successfully joined user group: user_${this.correlationContext.userId}`);
        } catch (groupJoinError) {
          const signalRError: SignalRError = {
            type: 'group-join',
            message: `Connected, but failed to join user group: ${groupJoinError instanceof Error ? groupJoinError.message : 'Unknown error'}`,
            correlationId: this.correlationContext?.correlationId,
            timestampMs: Date.now(),
            originalError: groupJoinError instanceof Error ? groupJoinError : undefined
          };
          
          console.error('[SignalR] Group join failed:', signalRError);
          
          // Log the error for monitoring but don't fail the entire connection
          // User will still receive broadcast messages, just not user-specific ones
          console.warn('[SignalR] Connection established but user-specific features may be limited');
          
          // TODO: Consider emitting an event to notify UI of degraded functionality
          // this.emit('group-join-failed', signalRError);
        }
      }

    } catch (error) {
      const signalRError: SignalRError = {
        type: 'connection',
        message: `Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`,
        correlationId: this.correlationContext?.correlationId,
        timestampMs: Date.now(),
        originalError: error instanceof Error ? error : undefined
      };
      
      console.error('[SignalR] Connection failed:', signalRError);
      throw signalRError;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.connection) {
      return;
    }

    try {
      await this.connection.stop();
      console.log(`[SignalR] Disconnected (correlation: ${this.correlationContext?.correlationId})`);
    } catch (error) {
      console.error('[SignalR] Error during disconnect:', error);
    } finally {
      this.connection = null;
      this.correlationContext = null;
    }
  }

  public getConnectionState(): HubConnectionState {
    return this.connection?.state ?? HubConnectionState.Disconnected;
  }

  public isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }

  public on<T extends SignalREvent>(eventType: SignalREventType, handler: SignalREventHandler<T>): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      handlers.add(handler as SignalREventHandler);
      console.log(`[SignalR] Handler registered for ${eventType} (correlation: ${this.correlationContext?.correlationId})`);
    } else {
      console.warn(`[SignalR] Unknown event type: ${eventType}`);
    }
  }

  public off(eventType: SignalREventType, handler?: SignalREventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      if (handler) {
        handlers.delete(handler);
        console.log(`[SignalR] Handler unregistered for ${eventType}`);
      } else {
        handlers.clear();
        console.log(`[SignalR] All handlers cleared for ${eventType}`);
      }
      
      // Also call the connection's off method if connection exists
      if (this.connection) {
        if (handler) {
          // For specific handler removal, we call connection.off with the handler
          this.connection.off(eventType, handler as any);
        } else {
          // For clearing all handlers, we call connection.off without handler
          this.connection.off(eventType);
        }
      }
    }
  }

  public async joinGroup(groupName: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('SignalR connection is not established');
    }

    try {
      await this.connection!.invoke('JoinGroup', groupName, this.correlationContext?.correlationId);
      console.log(`[SignalR] Joined group: ${groupName} (correlation: ${this.correlationContext?.correlationId})`);
    } catch (error) {
      console.error(`[SignalR] Failed to join group ${groupName}:`, error);
      throw error;
    }
  }

  public async leaveGroup(groupName: string): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('SignalR connection is not established');
    }

    try {
      await this.connection!.invoke('LeaveGroup', groupName, this.correlationContext?.correlationId);
      console.log(`[SignalR] Left group: ${groupName} (correlation: ${this.correlationContext?.correlationId})`);
    } catch (error) {
      console.error(`[SignalR] Failed to leave group ${groupName}:`, error);
      throw error;
    }
  }

  public async sendMessage(method: string, ...args: any[]): Promise<void> {
    if (!this.isConnected()) {
      throw new Error('SignalR connection is not established');
    }

    try {
      // Add correlation context to all server calls
      const enhancedArgs = [...args, this.correlationContext?.correlationId];
      await this.connection!.invoke(method, ...enhancedArgs);
      console.log(`[SignalR] Invoked ${method} (correlation: ${this.correlationContext?.correlationId})`);
    } catch (error) {
      console.error(`[SignalR] Failed to invoke ${method}:`, error);
      throw error;
    }
  }

  public setCorrelationContext(context: CorrelationContext): void {
    this.correlationContext = context;
    console.log(`[SignalR] Correlation context updated: ${context.correlationId}`);
  }

  public getCorrelationContext(): CorrelationContext | null {
    return this.correlationContext;
  }

  private setupConnectionEventHandlers(): void {
    if (!this.connection) return;

    this.connection.onclose((error) => {
      console.error('[SignalR] Connection closed:', error);
      this.correlationContext = null;
    });

    this.connection.onreconnecting((error) => {
      console.warn('[SignalR] Attempting to reconnect:', error);
    });

    this.connection.onreconnected((connectionId) => {
      console.log(`[SignalR] Reconnected with connection ID: ${connectionId}`);
      // Re-establish correlation context after reconnection
      this.correlationContext = this.correlationService.getCurrentContext();
    });
  }

  private registerServerEventHandlers(): void {
    if (!this.connection) return;

    // Register handlers for each event type
    this.eventHandlers.forEach((handlers, eventType) => {
      this.connection!.on(eventType, async (event: SignalREvent) => {
        console.log(`[SignalR] Received ${eventType}:`, event);
        
        // Invoke all registered handlers with proper async handling
        const results = await Promise.allSettled(
          Array.from(handlers).map(async (handler) => {
            try {
              await handler(event);
            } catch (error) {
              console.error(`[SignalR] Error in ${eventType} handler:`, error);
              throw error; // Re-throw to be caught by Promise.allSettled
            }
          })
        );
        
        // Log any handler failures for monitoring
        const failedHandlers = results.filter(result => result.status === 'rejected');
        if (failedHandlers.length > 0) {
          console.warn(`[SignalR] ${failedHandlers.length} of ${handlers.size} handlers failed for ${eventType}`);
        }
      });
    });
  }

  private async getAccessToken(): Promise<string> {
    // This would typically integrate with your auth system
    // For now, return empty string or implement JWT token retrieval
    return '';
  }

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (this.correlationContext) {
      headers['X-Correlation-ID'] = this.correlationContext.correlationId;
      headers['X-Session-ID'] = this.correlationContext.sessionId;
      
      if (this.correlationContext.userId) {
        headers['X-User-ID'] = this.correlationContext.userId;
      }
    }
    
    return headers;
  }

  private mapLogLevel(level: string): LogLevel {
    switch (level) {
      case 'Trace': return LogLevel.Trace;
      case 'Debug': return LogLevel.Debug;
      case 'Information': return LogLevel.Information;
      case 'Warning': return LogLevel.Warning;
      case 'Error': return LogLevel.Error;
      case 'Critical': return LogLevel.Critical;
      case 'None': return LogLevel.None;
      default: return LogLevel.Information;
    }
  }
}

// Singleton instance
let signalRServiceInstance: SignalRService | null = null;

export const createSignalRService = (
  config?: Partial<SignalRConfig>,
  correlationService?: CorrelationService
): SignalRService => {
  // Always validate that correlationService is provided
  if (!correlationService) {
    throw new Error('SignalRService requires CorrelationService instance');
  }
  
  if (!signalRServiceInstance) {
    signalRServiceInstance = new SignalRService(config, correlationService);
  }
  
  return signalRServiceInstance;
};

export const getSignalRService = (): SignalRService | null => {
  return signalRServiceInstance;
};