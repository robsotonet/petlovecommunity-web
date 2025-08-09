import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { HubConnectionState, LogLevel } from '@microsoft/signalr'
import { useSignalR } from '../useSignalR'
import {
  createMockSignalRConnection,
  createMockSignalRConnectionBuilder,
  createMockCorrelationContext,
  mockTimers,
} from '../../test/utils'

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
    Information: 1,
    Warning: 2,
    Error: 3,
    None: 6,
  },
}))

// Mock useCorrelation hook
vi.mock('../useCorrelation', () => ({
  useCorrelation: vi.fn(),
}))

const { HubConnectionBuilder } = await import('@microsoft/signalr')
const { useCorrelation } = await import('../useCorrelation')

describe('useSignalR Hook Integration Tests', () => {
  const mockContext = createMockCorrelationContext({
    correlationId: 'plc_signalr_test_correlation',
    sessionId: 'sess_signalr_test_session',
  })

  let mockConnection: any
  let mockBuilder: any

  beforeEach(() => {
    vi.clearAllMocks()
    
    mockConnection = createMockSignalRConnection()
    mockBuilder = createMockSignalRConnectionBuilder()
    
    // Mock HubConnectionBuilder
    vi.mocked(HubConnectionBuilder).mockImplementation(() => mockBuilder as any)
    
    // Ensure builder returns the mock connection
    vi.mocked(mockBuilder.build).mockReturnValue(mockConnection)
    
    // Mock useCorrelation hook
    vi.mocked(useCorrelation).mockReturnValue({
      currentContext: mockContext,
      history: [mockContext],
      createContext: vi.fn(),
      createChild: vi.fn(),
      updateUserId: vi.fn(),
      getRequestHeaders: vi.fn(() => ({
        'X-Correlation-ID': mockContext.correlationId,
        'X-Session-ID': mockContext.sessionId,
      })),
      getContext: vi.fn(),
      getContextHistory: vi.fn(),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Hook Initialization', () => {
    it('should initialize with default options and disconnected state', () => {
      const { result } = renderHook(() => useSignalR())

      expect(result.current.connection).toBeNull()
      expect(result.current.connectionState).toBe('Disconnected')
      expect(result.current.isConnected).toBe(false)
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.lastError).toBeNull()
    })

    it('should provide all expected methods', () => {
      const { result } = renderHook(() => useSignalR())

      expect(result.current).toHaveProperty('connection')
      expect(result.current).toHaveProperty('connectionState')
      expect(result.current).toHaveProperty('isConnected')
      expect(result.current).toHaveProperty('isConnecting')
      expect(result.current).toHaveProperty('connect')
      expect(result.current).toHaveProperty('disconnect')
      expect(result.current).toHaveProperty('reconnect')
      expect(result.current).toHaveProperty('sendMessage')
      expect(result.current).toHaveProperty('on')
      expect(result.current).toHaveProperty('off')
      expect(result.current).toHaveProperty('invoke')
      expect(result.current).toHaveProperty('lastError')
    })

    it('should initialize with custom options', () => {
      const customOptions = {
        url: 'http://custom-url/hubs/test',
        automaticReconnect: false,
        logLevel: LogLevel.Error,
        eventHandlers: {
          onPetAdoptionStatusChanged: vi.fn(),
        },
      }

      const { result } = renderHook(() => useSignalR(customOptions))

      expect(result.current.connection).toBeNull()
      expect(result.current.connectionState).toBe('Disconnected')
    })

    it('should integrate with useCorrelation hook', () => {
      renderHook(() => useSignalR())

      expect(useCorrelation).toHaveBeenCalled()
    })
  })

  describe('Connection Management', () => {
    it('should connect to SignalR hub with correlation headers', async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      expect(HubConnectionBuilder).toHaveBeenCalled()
      expect(mockBuilder.withUrl).toHaveBeenCalledWith(
        expect.stringContaining('/hubs/petLove'),
        expect.objectContaining({
          headers: {
            'X-Correlation-ID': mockContext.correlationId,
            'X-Session-ID': mockContext.sessionId,
          },
        })
      )
      expect(mockBuilder.withAutomaticReconnect).toHaveBeenCalledWith([0, 2000, 10000, 30000])
      expect(mockBuilder.configureLogging).toHaveBeenCalledWith(LogLevel.Information)
      expect(mockBuilder.build).toHaveBeenCalled()
      expect(mockConnection.start).toHaveBeenCalled()
    })

    it('should handle connection success', async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.connection).toBe(mockConnection)
      expect(result.current.connectionState).toBe('Connected')
      expect(result.current.isConnected).toBe(true)
      expect(result.current.isConnecting).toBe(false)
      expect(result.current.lastError).toBeNull()
    })

    it('should handle connection failure', async () => {
      const connectionError = new Error('Connection failed')
      vi.mocked(mockConnection.start).mockRejectedValue(connectionError)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await expect(result.current.connect()).rejects.toThrow('Connection failed')
      })

      expect(result.current.connection).toBeNull()
      expect(result.current.connectionState).toBe('Disconnected')
      expect(result.current.isConnected).toBe(false)
      expect(result.current.lastError).toEqual(connectionError)

      consoleErrorSpy.mockRestore()
    })

    it('should not connect when already connected', async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      vi.clearAllMocks()

      await act(async () => {
        await result.current.connect()
      })

      // Should not call start again
      expect(mockConnection.start).not.toHaveBeenCalled()
    })

    it('should disconnect from SignalR hub', async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      vi.mocked(mockConnection.stop).mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      await act(async () => {
        await result.current.disconnect()
      })

      expect(mockConnection.stop).toHaveBeenCalled()
      expect(result.current.connection).toBeNull()
      expect(result.current.connectionState).toBe('Disconnected')
      expect(result.current.isConnected).toBe(false)
    })

    it('should handle disconnect failure', async () => {
      const disconnectError = new Error('Disconnect failed')
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      vi.mocked(mockConnection.stop).mockRejectedValue(disconnectError)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      await act(async () => {
        await expect(result.current.disconnect()).rejects.toThrow('Disconnect failed')
      })

      expect(result.current.lastError).toEqual(disconnectError)
      consoleErrorSpy.mockRestore()
    })

    it('should reconnect to SignalR hub', async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      vi.mocked(mockConnection.stop).mockResolvedValue(undefined)

      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      vi.clearAllMocks()
      vi.mocked(mockBuilder.build).mockReturnValue(createMockSignalRConnection())

      await act(async () => {
        await result.current.reconnect()
      })

      expect(mockConnection.stop).toHaveBeenCalled()
      expect(HubConnectionBuilder).toHaveBeenCalled()
    })
  })

  describe('Message Handling', () => {
    beforeEach(async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
    })

    it('should send message to hub', async () => {
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      await act(async () => {
        await result.current.sendMessage('TestMethod', 'arg1', 'arg2')
      })

      expect(mockConnection.send).toHaveBeenCalledWith('TestMethod', 'arg1', 'arg2')
    })

    it('should handle send message failure when not connected', async () => {
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await expect(
          result.current.sendMessage('TestMethod', 'arg1')
        ).rejects.toThrow('SignalR connection is not established')
      })
    })

    it('should invoke hub method and return result', async () => {
      const mockResult = { success: true, data: 'test' }
      vi.mocked(mockConnection.invoke).mockResolvedValue(mockResult)

      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      let invokeResult: any
      await act(async () => {
        invokeResult = await result.current.invoke('GetTestData', 'param1')
      })

      expect(mockConnection.invoke).toHaveBeenCalledWith('GetTestData', 'param1')
      expect(invokeResult).toEqual(mockResult)
    })

    it('should handle invoke failure when not connected', async () => {
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await expect(
          result.current.invoke('TestMethod')
        ).rejects.toThrow('SignalR connection is not established')
      })
    })
  })

  describe('Event Handling', () => {
    beforeEach(async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
    })

    it('should register event handler', async () => {
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      const eventHandler = vi.fn()
      result.current.on('CustomEvent', eventHandler)

      expect(mockConnection.on).toHaveBeenCalledWith('CustomEvent', eventHandler)
    })

    it('should unregister specific event handler', async () => {
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      const eventHandler = vi.fn()
      result.current.off('CustomEvent', eventHandler)

      expect(mockConnection.off).toHaveBeenCalledWith('CustomEvent', eventHandler)
    })

    it('should unregister all handlers for event', async () => {
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      result.current.off('CustomEvent')

      expect(mockConnection.off).toHaveBeenCalledWith('CustomEvent')
    })

    it('should handle event registration when not connected', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const { result } = renderHook(() => useSignalR())

      const eventHandler = vi.fn()
      result.current.on('CustomEvent', eventHandler)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Cannot register event handler'),
        expect.objectContaining({
          correlationId: mockContext.correlationId,
          eventName: 'CustomEvent',
        })
      )

      consoleWarnSpy.mockRestore()
    })

    it('should setup default enterprise event handlers', async () => {
      const eventHandlers = {
        onPetAdoptionStatusChanged: vi.fn(),
        onServiceAvailabilityChanged: vi.fn(),
        onEventCapacityChanged: vi.fn(),
        onCommunityPostCreated: vi.fn(),
        onUserNotification: vi.fn(),
      }

      const { result } = renderHook(() => useSignalR({ eventHandlers }))

      await act(async () => {
        await result.current.connect()
      })

      expect(mockConnection.on).toHaveBeenCalledWith('PetAdoptionStatusChanged', expect.any(Function))
      expect(mockConnection.on).toHaveBeenCalledWith('ServiceAvailabilityChanged', expect.any(Function))
      expect(mockConnection.on).toHaveBeenCalledWith('EventCapacityChanged', expect.any(Function))
      expect(mockConnection.on).toHaveBeenCalledWith('CommunityPostCreated', expect.any(Function))
      expect(mockConnection.on).toHaveBeenCalledWith('UserNotification', expect.any(Function))
    })
  })

  describe('Connection State Management', () => {
    it('should handle connection close event', async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      // Simulate connection close
      const onCloseHandler = vi.mocked(mockConnection.onclose).mock.calls[0][0]
      
      act(() => {
        onCloseHandler(new Error('Connection lost'))
      })

      expect(result.current.connectionState).toBe('Disconnected')
      expect(result.current.isConnected).toBe(false)
    })

    it('should handle reconnecting event', async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      // Simulate reconnecting
      const onReconnectingHandler = vi.mocked(mockConnection.onreconnecting).mock.calls[0][0]
      
      act(() => {
        onReconnectingHandler(new Error('Connection lost'))
      })

      expect(result.current.connectionState).toBe('Reconnecting')
      expect(result.current.isConnected).toBe(false)
    })

    it('should handle reconnected event', async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      // Simulate reconnected
      const onReconnectedHandler = vi.mocked(mockConnection.onreconnected).mock.calls[0][0]
      
      act(() => {
        onReconnectedHandler('new-connection-id')
      })

      expect(result.current.connectionState).toBe('Connected')
      expect(result.current.isConnected).toBe(true)
      expect(result.current.lastError).toBeNull()
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle connection builder creation failure', async () => {
      const builderError = new Error('Builder creation failed')
      vi.mocked(HubConnectionBuilder).mockImplementation(() => {
        throw builderError
      })
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await expect(result.current.connect()).rejects.toThrow()
      })

      expect(result.current.lastError).toBeDefined()
      consoleErrorSpy.mockRestore()
    })

    it('should handle missing correlation context gracefully', async () => {
      vi.mocked(useCorrelation).mockReturnValue({
        currentContext: undefined as any,
        history: [],
        createContext: vi.fn(),
        createChild: vi.fn(),
        updateUserId: vi.fn(),
        getRequestHeaders: vi.fn(() => ({})),
        getContext: vi.fn(),
        getContextHistory: vi.fn(),
      })

      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      expect(mockBuilder.withUrl).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: {},
        })
      )
    })

    it('should handle send message service errors', async () => {
      const sendError = new Error('Send failed')
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      vi.mocked(mockConnection.send).mockRejectedValue(sendError)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      await act(async () => {
        await expect(
          result.current.sendMessage('TestMethod', 'arg1')
        ).rejects.toThrow('Send failed')
      })

      expect(result.current.lastError).toEqual(sendError)
      consoleErrorSpy.mockRestore()
    })

    it('should handle invoke service errors', async () => {
      const invokeError = new Error('Invoke failed')
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      vi.mocked(mockConnection.invoke).mockRejectedValue(invokeError)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      await act(async () => {
        await expect(
          result.current.invoke('TestMethod')
        ).rejects.toThrow('Invoke failed')
      })

      expect(result.current.lastError).toEqual(invokeError)
      consoleErrorSpy.mockRestore()
    })
  })

  describe('Performance and Memory', () => {
    it('should cleanup connection on unmount', async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      vi.mocked(mockConnection.stop).mockResolvedValue(undefined)

      const { result, unmount } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      unmount()

      expect(mockConnection.stop).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      const stopError = new Error('Stop failed')
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      vi.mocked(mockConnection.stop).mockRejectedValue(stopError)
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { result, unmount } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      // Unmount and wait for async promise rejection to be handled
      await act(async () => {
        unmount()
        // Wait for the promise rejection to be processed
        await new Promise(resolve => setTimeout(resolve, 0))
      })

      // Should not throw during cleanup
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error stopping SignalR connection during cleanup'),
        expect.any(Object)
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle concurrent connection attempts', async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        // Start multiple connect attempts simultaneously
        const promises = [
          result.current.connect(),
          result.current.connect(),
          result.current.connect(),
        ]
        await Promise.all(promises)
      })

      // Should only call start once
      expect(mockConnection.start).toHaveBeenCalledTimes(1)
      expect(result.current.isConnected).toBe(true)
    })

    it('should handle rapid event handler updates', async () => {
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)

      const initialHandlers = {
        onPetAdoptionStatusChanged: vi.fn(),
      }

      const { result, rerender } = renderHook(
        ({ eventHandlers }) => useSignalR({ eventHandlers }),
        { initialProps: { eventHandlers: initialHandlers } }
      )

      await act(async () => {
        await result.current.connect()
      })

      // Update handlers multiple times rapidly
      const updatedHandlers1 = {
        onPetAdoptionStatusChanged: vi.fn(),
        onServiceAvailabilityChanged: vi.fn(),
      }

      const updatedHandlers2 = {
        onPetAdoptionStatusChanged: vi.fn(),
        onUserNotification: vi.fn(),
      }

      rerender({ eventHandlers: updatedHandlers1 })
      rerender({ eventHandlers: updatedHandlers2 })

      // Should handle rapid updates without errors
      expect(result.current.isConnected).toBe(true)
    })

    it('should handle connection state changes efficiently', async () => {
      const timers = mockTimers()
      vi.mocked(mockConnection.start).mockResolvedValue(undefined)
      
      const { result } = renderHook(() => useSignalR())

      await act(async () => {
        await result.current.connect()
      })

      // Simulate rapid state changes
      const onCloseHandler = vi.mocked(mockConnection.onclose).mock.calls[0][0]
      const onReconnectingHandler = vi.mocked(mockConnection.onreconnecting).mock.calls[0][0]
      const onReconnectedHandler = vi.mocked(mockConnection.onreconnected).mock.calls[0][0]

      act(() => {
        onCloseHandler(new Error('Connection lost'))
        timers.advanceTime(100)
        onReconnectingHandler(new Error('Reconnecting'))
        timers.advanceTime(100)
        onReconnectedHandler('new-connection-id')
      })

      expect(result.current.connectionState).toBe('Connected')
      expect(result.current.isConnected).toBe(true)

      timers.restore()
    })
  })
})