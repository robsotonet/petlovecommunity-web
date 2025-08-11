'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import { useSignalR, UseSignalRReturn } from '@/hooks/useSignalR';
import { useCorrelation } from '@/hooks/useCorrelation';
import { 
  SignalREventHandler,
  PetAdoptionStatusChangedEvent,
  ServiceBookingStatusChangedEvent,
  EventRSVPChangedEvent,
  SocialInteractionReceivedEvent,
  UserStatusChangedEvent,
  NotificationReceivedEvent
} from '@/types/signalr';

// Enterprise SignalR context
interface SignalRContextValue extends UseSignalRReturn {
  // Enterprise event handlers
  onPetAdoptionStatusChanged: (handler: SignalREventHandler<PetAdoptionStatusChangedEvent>) => () => void;
  onServiceBookingStatusChanged: (handler: SignalREventHandler<ServiceBookingStatusChangedEvent>) => () => void;
  onEventRSVPChanged: (handler: SignalREventHandler<EventRSVPChangedEvent>) => () => void;
  onSocialInteractionReceived: (handler: SignalREventHandler<SocialInteractionReceivedEvent>) => () => void;
  onUserStatusChanged: (handler: SignalREventHandler<UserStatusChangedEvent>) => () => void;
  onNotificationReceived: (handler: SignalREventHandler<NotificationReceivedEvent>) => () => void;
  
  // Group management
  joinUserGroup: () => Promise<void>;
  leaveUserGroup: () => Promise<void>;
  joinPetGroup: (petId: string) => Promise<void>;
  leavePetGroup: (petId: string) => Promise<void>;
  joinEventGroup: (eventId: string) => Promise<void>;
  leaveEventGroup: (eventId: string) => Promise<void>;
  
  // Connection status
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: Error | null;
  
  // Metrics
  messageCount: number;
  reconnectCount: number;
  lastMessageTimestamp: number | null;
}

const SignalRContext = createContext<SignalRContextValue | null>(null);

// Provider props
interface SignalRProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  url?: string;
}

export function SignalRProvider({ 
  children, 
  autoConnect = true, 
  url 
}: SignalRProviderProps) {
  const { currentContext } = useCorrelation();
  const [messageCount, setMessageCount] = useState(0);
  const [reconnectCount, setReconnectCount] = useState(0);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number | null>(null);

  // Enterprise SignalR hook with correlation context
  const signalR = useSignalR({
    url,
    automaticReconnect: true,
    reconnectIntervals: [0, 2000, 10000, 30000, 60000],
    eventHandlers: {
      // Legacy event handlers are handled by useSignalR
      onPetAdoptionStatusChanged: () => {
        setMessageCount(prev => prev + 1);
        setLastMessageTimestamp(Date.now());
      },
      onServiceAvailabilityChanged: () => {
        setMessageCount(prev => prev + 1);
        setLastMessageTimestamp(Date.now());
      },
      onEventCapacityChanged: () => {
        setMessageCount(prev => prev + 1);
        setLastMessageTimestamp(Date.now());
      },
      onCommunityPostCreated: () => {
        setMessageCount(prev => prev + 1);
        setLastMessageTimestamp(Date.now());
      },
      onUserNotification: () => {
        setMessageCount(prev => prev + 1);
        setLastMessageTimestamp(Date.now());
      },
    },
  });

  // Track reconnection events
  useEffect(() => {
    if (signalR.connectionState === HubConnectionState.Reconnecting) {
      setReconnectCount(prev => prev + 1);
    }
  }, [signalR.connectionState]);

  // Auto-connect on mount if enabled and user is authenticated
  useEffect(() => {
    if (autoConnect && currentContext?.userId && !signalR.isConnected && !signalR.isConnecting) {
      signalR.connect().catch((error) => {
        console.error('[SignalRProvider] Auto-connect failed:', {
          correlationId: currentContext.correlationId,
          error: error.message,
        });
      });
    }
  }, [autoConnect, currentContext, signalR.isConnected, signalR.isConnecting, signalR.connect]);

  // Enhanced event subscription methods
  const onPetAdoptionStatusChanged = useCallback((handler: SignalREventHandler<PetAdoptionStatusChangedEvent>) => {
    const wrappedHandler = (event: PetAdoptionStatusChangedEvent) => {
      setMessageCount(prev => prev + 1);
      setLastMessageTimestamp(Date.now());
      handler(event);
    };
    
    signalR.on('PetAdoptionStatusChanged', wrappedHandler);
    
    // Return unsubscribe function
    return () => signalR.off('PetAdoptionStatusChanged', wrappedHandler);
  }, [signalR]);

  const onServiceBookingStatusChanged = useCallback((handler: SignalREventHandler<ServiceBookingStatusChangedEvent>) => {
    const wrappedHandler = (event: ServiceBookingStatusChangedEvent) => {
      setMessageCount(prev => prev + 1);
      setLastMessageTimestamp(Date.now());
      handler(event);
    };
    
    signalR.on('ServiceBookingStatusChanged', wrappedHandler);
    
    return () => signalR.off('ServiceBookingStatusChanged', wrappedHandler);
  }, [signalR]);

  const onEventRSVPChanged = useCallback((handler: SignalREventHandler<EventRSVPChangedEvent>) => {
    const wrappedHandler = (event: EventRSVPChangedEvent) => {
      setMessageCount(prev => prev + 1);
      setLastMessageTimestamp(Date.now());
      handler(event);
    };
    
    signalR.on('EventRSVPChanged', wrappedHandler);
    
    return () => signalR.off('EventRSVPChanged', wrappedHandler);
  }, [signalR]);

  const onSocialInteractionReceived = useCallback((handler: SignalREventHandler<SocialInteractionReceivedEvent>) => {
    const wrappedHandler = (event: SocialInteractionReceivedEvent) => {
      setMessageCount(prev => prev + 1);
      setLastMessageTimestamp(Date.now());
      handler(event);
    };
    
    signalR.on('SocialInteractionReceived', wrappedHandler);
    
    return () => signalR.off('SocialInteractionReceived', wrappedHandler);
  }, [signalR]);

  const onUserStatusChanged = useCallback((handler: SignalREventHandler<UserStatusChangedEvent>) => {
    const wrappedHandler = (event: UserStatusChangedEvent) => {
      setMessageCount(prev => prev + 1);
      setLastMessageTimestamp(Date.now());
      handler(event);
    };
    
    signalR.on('UserStatusChanged', wrappedHandler);
    
    return () => signalR.off('UserStatusChanged', wrappedHandler);
  }, [signalR]);

  const onNotificationReceived = useCallback((handler: SignalREventHandler<NotificationReceivedEvent>) => {
    const wrappedHandler = (event: NotificationReceivedEvent) => {
      setMessageCount(prev => prev + 1);
      setLastMessageTimestamp(Date.now());
      handler(event);
    };
    
    signalR.on('NotificationReceived', wrappedHandler);
    
    return () => signalR.off('NotificationReceived', wrappedHandler);
  }, [signalR]);

  // Group management methods
  const joinUserGroup = useCallback(async () => {
    if (!currentContext?.userId) {
      throw new Error('User ID is required to join user group');
    }
    
    return signalR.invoke('JoinGroup', `user_${currentContext.userId}`);
  }, [signalR, currentContext]);

  const leaveUserGroup = useCallback(async () => {
    if (!currentContext?.userId) {
      throw new Error('User ID is required to leave user group');
    }
    
    return signalR.invoke('LeaveGroup', `user_${currentContext.userId}`);
  }, [signalR, currentContext]);

  const joinPetGroup = useCallback(async (petId: string) => {
    return signalR.invoke('JoinGroup', `pet_${petId}`);
  }, [signalR]);

  const leavePetGroup = useCallback(async (petId: string) => {
    return signalR.invoke('LeaveGroup', `pet_${petId}`);
  }, [signalR]);

  const joinEventGroup = useCallback(async (eventId: string) => {
    return signalR.invoke('JoinGroup', `event_${eventId}`);
  }, [signalR]);

  const leaveEventGroup = useCallback(async (eventId: string) => {
    return signalR.invoke('LeaveGroup', `event_${eventId}`);
  }, [signalR]);

  // Context value
  const contextValue: SignalRContextValue = {
    ...signalR,
    
    // Enhanced event handlers
    onPetAdoptionStatusChanged,
    onServiceBookingStatusChanged,
    onEventRSVPChanged,
    onSocialInteractionReceived,
    onUserStatusChanged,
    onNotificationReceived,
    
    // Group management
    joinUserGroup,
    leaveUserGroup,
    joinPetGroup,
    leavePetGroup,
    joinEventGroup,
    leaveEventGroup,
    
    // Connection status
    connectionError: signalR.lastError,
    
    // Metrics
    messageCount,
    reconnectCount,
    lastMessageTimestamp,
  };

  return (
    <SignalRContext.Provider value={contextValue}>
      {children}
    </SignalRContext.Provider>
  );
}

// Hook to use SignalR context
export function useSignalRContext(): SignalRContextValue {
  const context = useContext(SignalRContext);
  
  if (!context) {
    throw new Error('useSignalRContext must be used within a SignalRProvider');
  }
  
  return context;
}

// Convenience hooks for specific event types
export function usePetAdoptionEvents(handler: SignalREventHandler<PetAdoptionStatusChangedEvent>) {
  const { onPetAdoptionStatusChanged } = useSignalRContext();
  
  useEffect(() => {
    return onPetAdoptionStatusChanged(handler);
  }, [onPetAdoptionStatusChanged, handler]);
}

export function useServiceBookingEvents(handler: SignalREventHandler<ServiceBookingStatusChangedEvent>) {
  const { onServiceBookingStatusChanged } = useSignalRContext();
  
  useEffect(() => {
    return onServiceBookingStatusChanged(handler);
  }, [onServiceBookingStatusChanged, handler]);
}

export function useEventRSVPEvents(handler: SignalREventHandler<EventRSVPChangedEvent>) {
  const { onEventRSVPChanged } = useSignalRContext();
  
  useEffect(() => {
    return onEventRSVPChanged(handler);
  }, [onEventRSVPChanged, handler]);
}

export function useNotificationEvents(handler: SignalREventHandler<NotificationReceivedEvent>) {
  const { onNotificationReceived } = useSignalRContext();
  
  useEffect(() => {
    return onNotificationReceived(handler);
  }, [onNotificationReceived, handler]);
}

export function useSocialInteractionEvents(handler: SignalREventHandler<SocialInteractionReceivedEvent>) {
  const { onSocialInteractionReceived } = useSignalRContext();
  
  useEffect(() => {
    return onSocialInteractionReceived(handler);
  }, [onSocialInteractionReceived, handler]);
}

// Connection status hook
export function useSignalRConnectionStatus() {
  const { isConnected, isConnecting, connectionState, connectionError, reconnectCount } = useSignalRContext();
  
  return {
    isConnected,
    isConnecting,
    connectionState,
    connectionError,
    reconnectCount,
    isDisconnected: connectionState === HubConnectionState.Disconnected,
    isReconnecting: connectionState === HubConnectionState.Reconnecting,
  };
}

// Group management hook
export function useSignalRGroups() {
  const {
    joinUserGroup,
    leaveUserGroup,
    joinPetGroup,
    leavePetGroup,
    joinEventGroup,
    leaveEventGroup,
  } = useSignalRContext();
  
  return {
    joinUserGroup,
    leaveUserGroup,
    joinPetGroup,
    leavePetGroup,
    joinEventGroup,
    leaveEventGroup,
  };
}