import { HubConnection } from '@microsoft/signalr';

// SignalR hub types
export interface SignalRContextType {
  connection: HubConnection | null;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'reconnecting';
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
}

export interface SignalREventHandlers {
  onPetAdoptionStatusChanged?: (petId: string, status: string) => void;
  onServiceAvailabilityChanged?: (serviceId: string, availability: boolean) => void;
  onEventCapacityChanged?: (eventId: string, capacity: number) => void;
  onCommunityPostCreated?: (post: any) => void;
  onUserNotification?: (notification: any) => void;
}

export interface SignalRMessage {
  correlationId: string;
  timestamp: number;
  type: string;
  payload: any;
}