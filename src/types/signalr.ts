import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { CorrelationContext } from './enterprise';

// SignalR connection configuration
export interface SignalRConfig {
  baseUrl: string;
  hubPath: string;
  automaticReconnect: boolean;
  reconnectDelaysMs: number[];
  logLevel: 'Trace' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Critical' | 'None';
}

// Enhanced SignalR connection context
export interface SignalRConnectionContext {
  connection: HubConnection | null;
  connectionState: HubConnectionState;
  correlationContext: CorrelationContext;
  isConnected: boolean;
  isConnecting: boolean;
  lastError?: Error;
}

// Legacy interface for backward compatibility
export interface SignalRContextType {
  connection: HubConnection | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
}

// Real-time event types for Pet Love Community
export type SignalREventType = 
  | 'PetAdoptionStatusChanged'
  | 'ServiceBookingStatusChanged'
  | 'EventRSVPChanged'
  | 'SocialInteractionReceived'
  | 'UserStatusChanged'
  | 'NotificationReceived';

// Pet adoption events
export interface PetAdoptionStatusChangedEvent {
  petId: string;
  status: 'available' | 'pending' | 'adopted' | 'unavailable';
  adopterId?: string;
  timestampMs: number;
  correlationId: string;
}

// Service booking events
export interface ServiceBookingStatusChangedEvent {
  bookingId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  serviceId: string;
  userId: string;
  timestampMs: number;
  correlationId: string;
}

// Event RSVP events
export interface EventRSVPChangedEvent {
  eventId: string;
  userId: string;
  rsvpStatus: 'attending' | 'not_attending' | 'maybe';
  timestampMs: number;
  correlationId: string;
}

// Social interaction events
export interface SocialInteractionReceivedEvent {
  type: 'like' | 'comment' | 'share' | 'follow';
  targetUserId: string;
  sourceUserId: string;
  contentId?: string;
  message?: string;
  timestampMs: number;
  correlationId: string;
}

// User status events
export interface UserStatusChangedEvent {
  userId: string;
  status: 'online' | 'offline' | 'busy';
  timestampMs: number;
  correlationId: string;
}

// Notification events
export interface NotificationReceivedEvent {
  notificationId: string;
  userId: string;
  type: 'adoption_update' | 'service_reminder' | 'event_reminder' | 'social_interaction';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  timestampMs: number;
  correlationId: string;
}

// Legacy event handlers for backward compatibility
export interface SignalREventHandlers {
  onPetAdoptionStatusChanged?: (petId: string, status: string) => void;
  onServiceAvailabilityChanged?: (serviceId: string, availability: boolean) => void;
  onEventCapacityChanged?: (eventId: string, capacity: number) => void;
  onCommunityPostCreated?: (post: any) => void;
  onUserNotification?: (notification: any) => void;
}

// Union type for all events
export type SignalREvent = 
  | PetAdoptionStatusChangedEvent
  | ServiceBookingStatusChangedEvent
  | EventRSVPChangedEvent
  | SocialInteractionReceivedEvent
  | UserStatusChangedEvent
  | NotificationReceivedEvent;

// Event handler type
export type SignalREventHandler<T = SignalREvent> = (event: T) => void | Promise<void>;

// Enhanced SignalR message with enterprise features
export interface SignalRMessage {
  correlationId: string;
  timestampMs: number;
  type: string;
  payload: any;
  transactionId?: string;
  userId?: string;
}

// SignalR service interface
export interface ISignalRService {
  // Connection management
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getConnectionState(): HubConnectionState;
  isConnected(): boolean;
  
  // Event subscription
  on<T extends SignalREvent>(eventType: SignalREventType, handler: SignalREventHandler<T>): void;
  off(eventType: SignalREventType, handler?: SignalREventHandler): void;
  
  // Server methods
  joinGroup(groupName: string): Promise<void>;
  leaveGroup(groupName: string): Promise<void>;
  sendMessage(method: string, ...args: any[]): Promise<void>;
  
  // Enterprise features
  setCorrelationContext(context: CorrelationContext): void;
  getCorrelationContext(): CorrelationContext | null;
}

// SignalR error types
export interface SignalRError {
  type: 'connection' | 'authentication' | 'timeout' | 'unknown';
  message: string;
  correlationId?: string;
  timestampMs: number;
  originalError?: Error;
}