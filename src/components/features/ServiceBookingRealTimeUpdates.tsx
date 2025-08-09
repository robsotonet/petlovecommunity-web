'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useServiceBookingEvents, useSignalRGroups } from '@/components/enterprise';
import { ServiceBookingStatusChangedEvent } from '@/types/signalr';
import { useCorrelation } from '@/hooks/useCorrelation';

// Animation duration constant for consistency across the component
const STATUS_UPDATE_ANIMATION_DURATION_MS = 1000;

// Service booking status update component
interface ServiceBookingRealTimeUpdatesProps {
  bookingId: string;
  userId?: string;
  onStatusChange?: (event: ServiceBookingStatusChangedEvent) => void;
  onBookingUpdate?: (event: ServiceBookingStatusChangedEvent) => void;
}

export function ServiceBookingRealTimeUpdates({
  bookingId,
  userId,
  onStatusChange,
  onBookingUpdate,
}: ServiceBookingRealTimeUpdatesProps) {
  const [, setLastUpdate] = useState<ServiceBookingStatusChangedEvent | null>(null);
  const { currentContext } = useCorrelation();
  const { joinUserGroup, leaveUserGroup } = useSignalRGroups();

  // Handle service booking status changes
  const handleServiceBookingStatusChanged = useCallback((event: ServiceBookingStatusChangedEvent) => {
    console.log(`[ServiceBooking] Real-time update for booking ${event.bookingId}:`, {
      correlationId: event.correlationId,
      status: event.status,
      serviceId: event.serviceId,
      userId: event.userId,
    });

    // Only process updates for the specific booking or user
    const isRelevant = event.bookingId === bookingId || 
                      (userId && event.userId === userId) ||
                      event.userId === currentContext?.userId;

    if (isRelevant) {
      setLastUpdate(event);
      
      // Call external handlers
      onStatusChange?.(event);
      onBookingUpdate?.(event);
      
      // Log enterprise metrics
      console.log(`[ServiceBooking] Status changed for booking ${event.bookingId}:`, {
        correlationId: event.correlationId,
        newStatus: event.status,
        timestamp: event.timestampMs,
        userContext: currentContext?.userId,
      });
    }
  }, [bookingId, userId, onStatusChange, onBookingUpdate, currentContext]);

  // Subscribe to service booking events
  useServiceBookingEvents(handleServiceBookingStatusChanged);

  // Join user group for booking notifications
  useEffect(() => {
    const targetUserId = userId || currentContext?.userId;
    if (!targetUserId) return;

    const manageUserGroup = async () => {
      try {
        await joinUserGroup();
        console.log(`[ServiceBooking] Joined user group for user ${targetUserId} (correlation: ${currentContext?.correlationId})`);
      } catch (error) {
        console.error(`[ServiceBooking] Failed to join user group:`, {
          correlationId: currentContext?.correlationId,
          userId: targetUserId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    manageUserGroup();

    return () => {
      leaveUserGroup().catch((error) => {
        console.error(`[ServiceBooking] Failed to leave user group:`, {
          correlationId: currentContext?.correlationId,
          userId: targetUserId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    };
  }, [userId, currentContext, joinUserGroup, leaveUserGroup]);

  return null;
}

// Service booking status indicator with real-time updates
interface ServiceBookingStatusIndicatorProps {
  bookingId: string;
  initialStatus: string;
  userId?: string;
  showProgressBar?: boolean;
  className?: string;
}

export function ServiceBookingStatusIndicator({
  bookingId,
  initialStatus,
  userId,
  showProgressBar = false,
  className = '',
}: ServiceBookingStatusIndicatorProps) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = useCallback((event: ServiceBookingStatusChangedEvent) => {
    if (event.bookingId === bookingId) {
      setIsUpdating(true);
      setCurrentStatus(event.status);
      setLastUpdateTime(event.timestampMs);
      
      // Remove updating indicator after animation
      setTimeout(() => setIsUpdating(false), STATUS_UPDATE_ANIMATION_DURATION_MS);
    }
  }, [bookingId]);

  // Status progression mapping
  const getStatusProgress = (status: string) => {
    switch (status) {
      case 'pending': return { progress: 25, color: 'yellow' };
      case 'confirmed': return { progress: 50, color: 'teal' };
      case 'completed': return { progress: 100, color: 'coral' };
      case 'cancelled': return { progress: 0, color: 'gray' };
      default: return { progress: 0, color: 'gray' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'confirmed':
        return 'text-teal-600 bg-teal-100 border-teal-200';
      case 'completed':
        return 'text-coral-600 bg-coral-100 border-coral-200';
      case 'cancelled':
        return 'text-gray-600 bg-gray-100 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const statusProgress = getStatusProgress(currentStatus);

  return (
    <>
      <ServiceBookingRealTimeUpdates
        bookingId={bookingId}
        userId={userId}
        onStatusChange={handleStatusChange}
      />
      
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center space-x-2">
          <span className={`
            inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
            border transition-all duration-300 ${getStatusColor(currentStatus)}
            ${isUpdating ? 'animate-pulse ring-2 ring-coral-200' : ''}
          `}>
            {formatStatus(currentStatus)}
          </span>
          
          {isUpdating && (
            <span className="text-xs text-coral-500 font-medium animate-pulse">
              ● Live Update
            </span>
          )}
        </div>
        
        {showProgressBar && currentStatus !== 'cancelled' && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-500 ${
                statusProgress.color === 'yellow' ? 'bg-yellow-400' :
                statusProgress.color === 'teal' ? 'bg-teal-400' :
                statusProgress.color === 'coral' ? 'bg-coral-400' : 'bg-gray-400'
              }`}
              style={{ width: `${statusProgress.progress}%` }}
            />
          </div>
        )}
        
        {lastUpdateTime && (
          <span className="text-xs text-text-light">
            Last updated: {new Date(lastUpdateTime).toLocaleString()}
          </span>
        )}
      </div>
    </>
  );
}

// Service booking notifications dashboard
interface ServiceBookingNotificationsDashboardProps {
  userId?: string;
  maxNotifications?: number;
  onNotification?: (event: ServiceBookingStatusChangedEvent) => void;
  className?: string;
}

export function ServiceBookingNotificationsDashboard({
  userId,
  maxNotifications = 10,
  onNotification,
  className = '',
}: ServiceBookingNotificationsDashboardProps) {
  const [notifications, setNotifications] = useState<ServiceBookingStatusChangedEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { currentContext } = useCorrelation();

  const handleServiceBookingStatusChanged = useCallback((event: ServiceBookingStatusChangedEvent) => {
    // Filter notifications for specific user if provided
    const isRelevant = !userId || event.userId === userId || event.userId === currentContext?.userId;
    
    if (isRelevant) {
      setNotifications(prev => {
        const updated = [event, ...prev].slice(0, maxNotifications);
        return updated;
      });
      
      setUnreadCount(prev => prev + 1);
      onNotification?.(event);
      
      console.log(`[ServiceBooking] New notification for booking ${event.bookingId}:`, {
        status: event.status,
        correlationId: event.correlationId,
        serviceId: event.serviceId,
      });
    }
  }, [userId, currentContext, maxNotifications, onNotification]);

  useServiceBookingEvents(handleServiceBookingStatusChanged);

  const markAsRead = useCallback(() => {
    setUnreadCount(0);
  }, []);

  const getNotificationIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return '✓';
      case 'completed': return '🎉';
      case 'cancelled': return '❌';
      default: return '⏱️';
    }
  };

  const getNotificationMessage = (event: ServiceBookingStatusChangedEvent) => {
    switch (event.status) {
      case 'confirmed':
        return `Your service booking has been confirmed`;
      case 'completed':
        return `Your service has been completed`;
      case 'cancelled':
        return `Your service booking has been cancelled`;
      default:
        return `Your service booking status has been updated to ${event.status}`;
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-text-dark">
          Service Booking Updates
        </h3>
        {unreadCount > 0 && (
          <span 
            className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-coral-500 rounded-full cursor-pointer hover:bg-coral-600"
            onClick={markAsRead}
            title="Mark as read"
          >
            {unreadCount}
          </span>
        )}
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {notifications.map((notification, index) => (
          <div 
            key={`${notification.bookingId}-${notification.timestampMs}`}
            className={`flex items-start space-x-3 p-2 rounded-md transition-colors ${
              index < unreadCount ? 'bg-coral-50 border-l-2 border-coral-400' : 'bg-gray-50'
            }`}
          >
            <span className="text-lg">
              {getNotificationIcon(notification.status)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-dark">
                {getNotificationMessage(notification)}
              </p>
              <p className="text-xs text-text-light mt-1">
                {new Date(notification.timestampMs).toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}