'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { HubConnection, HubConnectionBuilder, LogLevel, HubConnectionState } from '@microsoft/signalr';
import { useCorrelation } from './useCorrelation';
import type { SignalREventHandlers, SignalRMessage } from '../types/signalr';

export interface UseSignalROptions {
  url?: string;
  automaticReconnect?: boolean;
  reconnectIntervals?: number[];
  logLevel?: LogLevel;
  eventHandlers?: SignalREventHandlers;
}

export interface UseSignalRReturn {
  connection: HubConnection | null;
  connectionState: HubConnectionState;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<void>;
  sendMessage: (methodName: string, ...args: any[]) => Promise<void>;
  on: (eventName: string, handler: (...args: any[]) => void) => void;
  off: (eventName: string, handler?: (...args: any[]) => void) => void;
  invoke: <T = any>(methodName: string, ...args: any[]) => Promise<T>;
  lastError: Error | null;
}

const DEFAULT_RECONNECT_INTERVALS = [0, 2000, 10000, 30000];
const DEFAULT_URL = process.env.NEXT_PUBLIC_API_URL 
  ? `${process.env.NEXT_PUBLIC_API_URL}/hubs/petLove`
  : 'http://localhost:5000/hubs/petLove';

export function useSignalR(options: UseSignalROptions = {}): UseSignalRReturn {
  const {
    url = DEFAULT_URL,
    automaticReconnect = true,
    reconnectIntervals = DEFAULT_RECONNECT_INTERVALS,
    logLevel = LogLevel.Information,
    eventHandlers = {},
  } = options;

  const [connection, setConnection] = useState<HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<HubConnectionState>(HubConnectionState.Disconnected);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const { currentContext, getRequestHeaders } = useCorrelation();
  const eventHandlersRef = useRef(eventHandlers);
  const isConnectedRef = useRef(false);
  const connectingPromiseRef = useRef<Promise<void> | null>(null);

  // Update event handlers ref when they change
  useEffect(() => {
    eventHandlersRef.current = eventHandlers;
  }, [eventHandlers]);

  // Derived state
  const isConnected = connectionState === HubConnectionState.Connected;
  const isConnecting = connectionState === HubConnectionState.Connecting;

  // Create and configure connection
  const createConnection = useCallback(() => {
    try {
      const newConnection = new HubConnectionBuilder()
        .withUrl(url, {
          headers: currentContext ? getRequestHeaders() : {},
        })
        .withAutomaticReconnect(automaticReconnect ? reconnectIntervals : [])
        .configureLogging(logLevel)
        .build();

      // Set up connection state monitoring
      newConnection.onclose((error) => {
        setConnectionState(HubConnectionState.Disconnected);
        isConnectedRef.current = false;
        if (error) {
          setLastError(error);
          console.error('SignalR connection closed with error:', {
            correlationId: currentContext?.correlationId,
            error: error.message,
          });
        } else {
          console.log('SignalR connection closed gracefully', {
            correlationId: currentContext?.correlationId,
          });
        }
      });

      newConnection.onreconnecting((error) => {
        setConnectionState(HubConnectionState.Reconnecting);
        isConnectedRef.current = false;
        if (error) {
          setLastError(error);
          console.warn('SignalR attempting to reconnect:', {
            correlationId: currentContext?.correlationId,
            error: error.message,
          });
        }
      });

      newConnection.onreconnected((connectionId) => {
        setConnectionState(HubConnectionState.Connected);
        isConnectedRef.current = true;
        setLastError(null);
        console.log('SignalR reconnected successfully:', {
          correlationId: currentContext?.correlationId,
          connectionId,
        });
      });

      return newConnection;
    } catch (error) {
      const signalRError = error instanceof Error ? error : new Error('Failed to create SignalR connection');
      setLastError(signalRError);
      console.error('Failed to create SignalR connection:', {
        correlationId: currentContext?.correlationId,
        error: signalRError.message,
      });
      return null;
    }
  }, [url, automaticReconnect, reconnectIntervals, logLevel, currentContext, getRequestHeaders]);

  // Setup event handlers
  const setupEventHandlers = useCallback((conn: HubConnection) => {
    // Default enterprise event handlers with correlation tracking
    conn.on('PetAdoptionStatusChanged', (petId: string, status: string) => {
      const message: SignalRMessage = {
        correlationId: currentContext?.correlationId || 'unknown',
        timestamp: Date.now(),
        type: 'PetAdoptionStatusChanged',
        payload: { petId, status },
      };
      
      console.log('SignalR: Pet adoption status changed', message);
      eventHandlersRef.current.onPetAdoptionStatusChanged?.(petId, status);
    });

    conn.on('ServiceAvailabilityChanged', (serviceId: string, availability: boolean) => {
      const message: SignalRMessage = {
        correlationId: currentContext?.correlationId || 'unknown',
        timestamp: Date.now(),
        type: 'ServiceAvailabilityChanged',
        payload: { serviceId, availability },
      };
      
      console.log('SignalR: Service availability changed', message);
      eventHandlersRef.current.onServiceAvailabilityChanged?.(serviceId, availability);
    });

    conn.on('EventCapacityChanged', (eventId: string, capacity: number) => {
      const message: SignalRMessage = {
        correlationId: currentContext?.correlationId || 'unknown',
        timestamp: Date.now(),
        type: 'EventCapacityChanged',
        payload: { eventId, capacity },
      };
      
      console.log('SignalR: Event capacity changed', message);
      eventHandlersRef.current.onEventCapacityChanged?.(eventId, capacity);
    });

    conn.on('CommunityPostCreated', (post: any) => {
      const message: SignalRMessage = {
        correlationId: currentContext?.correlationId || 'unknown',
        timestamp: Date.now(),
        type: 'CommunityPostCreated',
        payload: post,
      };
      
      console.log('SignalR: Community post created', message);
      eventHandlersRef.current.onCommunityPostCreated?.(post);
    });

    conn.on('UserNotification', (notification: any) => {
      const message: SignalRMessage = {
        correlationId: currentContext?.correlationId || 'unknown',
        timestamp: Date.now(),
        type: 'UserNotification',
        payload: notification,
      };
      
      console.log('SignalR: User notification received', message);
      eventHandlersRef.current.onUserNotification?.(notification);
    });
  }, [currentContext]);

  // Connect to hub
  const connect = useCallback(async () => {
    // If already connected, return immediately
    if (isConnectedRef.current) {
      return;
    }

    // If already connecting, await the existing connection attempt
    if (connectingPromiseRef.current) {
      return connectingPromiseRef.current;
    }

    // Create new connection promise to prevent concurrent connections
    const connectionPromise = (async () => {
      try {
        setConnectionState(HubConnectionState.Connecting);
        setLastError(null);

        const newConnection = createConnection();
        if (!newConnection) {
          throw new Error('Failed to create SignalR connection');
        }

        setupEventHandlers(newConnection);
        
        await newConnection.start();
        
        setConnection(newConnection);
        setConnectionState(HubConnectionState.Connected);
        isConnectedRef.current = true;
        
        console.log('SignalR connected successfully:', {
          correlationId: currentContext?.correlationId,
          connectionId: newConnection.connectionId,
        });
      } catch (error) {
        const signalRError = error instanceof Error ? error : new Error('SignalR connection failed');
        setLastError(signalRError);
        setConnectionState(HubConnectionState.Disconnected);
        isConnectedRef.current = false;
        
        console.error('Failed to connect to SignalR hub:', {
          correlationId: currentContext?.correlationId,
          error: signalRError.message,
        });
        
        throw signalRError;
      } finally {
        // Clear the connecting promise when connection attempt is complete
        connectingPromiseRef.current = null;
      }
    })();

    // Store the connection promise to prevent concurrent connections
    connectingPromiseRef.current = connectionPromise;
    
    return connectionPromise;
  }, [connectionState, createConnection, setupEventHandlers, currentContext]);

  // Disconnect from hub
  const disconnect = useCallback(async () => {
    if (!connection || connectionState === HubConnectionState.Disconnected) {
      return;
    }

    try {
      await connection.stop();
      setConnection(null);
      setConnectionState(HubConnectionState.Disconnected);
      isConnectedRef.current = false;
      setLastError(null);
      
      console.log('SignalR disconnected successfully:', {
        correlationId: currentContext?.correlationId,
      });
    } catch (error) {
      const signalRError = error instanceof Error ? error : new Error('SignalR disconnection failed');
      setLastError(signalRError);
      
      console.error('Failed to disconnect from SignalR hub:', {
        correlationId: currentContext?.correlationId,
        error: signalRError.message,
      });
      
      throw signalRError;
    }
  }, [connection, connectionState, currentContext]);

  // Reconnect to hub
  const reconnect = useCallback(async () => {
    await disconnect();
    await connect();
  }, [disconnect, connect]);

  // Send message to hub
  const sendMessage = useCallback(async (methodName: string, ...args: any[]) => {
    if (!connection || !isConnected) {
      throw new Error('SignalR connection is not established');
    }

    try {
      await connection.send(methodName, ...args);
      console.log('SignalR message sent:', {
        correlationId: currentContext?.correlationId,
        methodName,
        args,
      });
    } catch (error) {
      const signalRError = error instanceof Error ? error : new Error('Failed to send SignalR message');
      setLastError(signalRError);
      
      console.error('Failed to send SignalR message:', {
        correlationId: currentContext?.correlationId,
        methodName,
        error: signalRError.message,
      });
      
      throw signalRError;
    }
  }, [connection, isConnected, currentContext]);

  // Register event handler
  const on = useCallback((eventName: string, handler: (...args: any[]) => void) => {
    if (!connection) {
      console.warn('Cannot register event handler: SignalR connection not established', {
        correlationId: currentContext?.correlationId,
        eventName,
      });
      return;
    }

    connection.on(eventName, handler);
    console.log('SignalR event handler registered:', {
      correlationId: currentContext?.correlationId,
      eventName,
    });
  }, [connection, currentContext]);

  // Unregister event handler
  const off = useCallback((eventName: string, handler?: (...args: any[]) => void) => {
    if (!connection) {
      return;
    }

    if (handler) {
      connection.off(eventName, handler);
    } else {
      connection.off(eventName);
    }
    
    console.log('SignalR event handler unregistered:', {
      correlationId: currentContext?.correlationId,
      eventName,
    });
  }, [connection, currentContext]);

  // Invoke hub method and wait for result
  const invoke = useCallback(async <T = any>(methodName: string, ...args: any[]): Promise<T> => {
    if (!connection || !isConnected) {
      throw new Error('SignalR connection is not established');
    }

    try {
      const result = await connection.invoke<T>(methodName, ...args);
      console.log('SignalR method invoked:', {
        correlationId: currentContext?.correlationId,
        methodName,
        args,
        result,
      });
      return result;
    } catch (error) {
      const signalRError = error instanceof Error ? error : new Error('Failed to invoke SignalR method');
      setLastError(signalRError);
      
      console.error('Failed to invoke SignalR method:', {
        correlationId: currentContext?.correlationId,
        methodName,
        error: signalRError.message,
      });
      
      throw signalRError;
    }
  }, [connection, isConnected, currentContext]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connection && typeof connection.stop === 'function') {
        // Attempt to stop the connection during cleanup
        try {
          const stopPromise = connection.stop();
          // Handle promise rejection if stop() returns a promise
          stopPromise?.catch?.((error) => {
            console.error('Error stopping SignalR connection during cleanup:', {
              correlationId: currentContext?.correlationId,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          });
        } catch (error) {
          // Handle synchronous errors from stop() call
          console.error('Error stopping SignalR connection during cleanup:', {
            correlationId: currentContext?.correlationId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    };
  }, [connection, currentContext]);

  return {
    connection,
    connectionState,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    reconnect,
    sendMessage,
    on,
    off,
    invoke,
    lastError,
  };
}