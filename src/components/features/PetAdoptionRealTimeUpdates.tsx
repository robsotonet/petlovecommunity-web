'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { usePetAdoptionEvents, useSignalRGroups } from '@/components/enterprise';
import { PetAdoptionStatusChangedEvent } from '@/types/signalr';
import { useCorrelation } from '@/hooks/useCorrelation';

// Animation duration constant for consistency across the component
const STATUS_UPDATE_ANIMATION_DURATION_MS = 1000;

// Pet adoption status update component
interface PetAdoptionRealTimeUpdatesProps {
  petId: string;
  currentStatus?: string;
  onStatusChange?: (newStatus: string, petId: string) => void;
  onAdoptionUpdate?: (event: PetAdoptionStatusChangedEvent) => void;
}

export function PetAdoptionRealTimeUpdates({
  petId,
  currentStatus,
  onStatusChange,
  onAdoptionUpdate,
}: PetAdoptionRealTimeUpdatesProps) {
  const [, setLastUpdate] = useState<PetAdoptionStatusChangedEvent | null>(null);
  const [, setUpdateCount] = useState(0);
  const { currentContext } = useCorrelation();
  const { joinPetGroup, leavePetGroup } = useSignalRGroups();

  // Handle pet adoption status changes
  const handlePetAdoptionStatusChanged = useCallback((event: PetAdoptionStatusChangedEvent) => {
    console.log(`[PetAdoption] Real-time update for pet ${event.petId}:`, {
      correlationId: event.correlationId,
      status: event.status,
      adopterId: event.adopterId,
    });

    // Only process updates for the specific pet
    if (event.petId === petId) {
      setLastUpdate(event);
      setUpdateCount(prev => prev + 1);
      
      // Call external handlers
      onStatusChange?.(event.status, event.petId);
      onAdoptionUpdate?.(event);
      
      // Log enterprise metrics
      console.log(`[PetAdoption] Status changed for pet ${petId}:`, {
        correlationId: event.correlationId,
        previousStatus: currentStatus,
        newStatus: event.status,
        timestamp: event.timestampMs,
        userContext: currentContext?.userId,
      });
    }
  }, [petId, currentStatus, onStatusChange, onAdoptionUpdate, currentContext]);

  // Subscribe to pet adoption events
  usePetAdoptionEvents(handlePetAdoptionStatusChanged);

  // Join/leave pet-specific groups
  useEffect(() => {
    const managePetGroup = async () => {
      try {
        await joinPetGroup(petId);
        console.log(`[PetAdoption] Joined group for pet ${petId} (correlation: ${currentContext?.correlationId})`);
      } catch (error) {
        console.error(`[PetAdoption] Failed to join group for pet ${petId}:`, {
          correlationId: currentContext?.correlationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    managePetGroup();

    // Cleanup: leave pet group on unmount
    return () => {
      leavePetGroup(petId).catch((error) => {
        console.error(`[PetAdoption] Failed to leave group for pet ${petId}:`, {
          correlationId: currentContext?.correlationId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      });
    };
  }, [petId, joinPetGroup, leavePetGroup, currentContext]);

  // Don't render anything - this is a logic-only component
  return null;
}

// Pet adoption status indicator with real-time updates
interface PetAdoptionStatusIndicatorProps {
  petId: string;
  initialStatus: string;
  showLastUpdate?: boolean;
  className?: string;
}

export function PetAdoptionStatusIndicator({
  petId,
  initialStatus,
  showLastUpdate = false,
  className = '',
}: PetAdoptionStatusIndicatorProps) {
  const [currentStatus, setCurrentStatus] = useState(initialStatus);
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = useCallback((newStatus: string, updatedPetId: string) => {
    if (updatedPetId === petId) {
      setIsUpdating(true);
      setCurrentStatus(newStatus);
      setLastUpdateTime(Date.now());
      
      // Remove updating indicator after animation
      setTimeout(() => setIsUpdating(false), STATUS_UPDATE_ANIMATION_DURATION_MS);
    }
  }, [petId]);

  // Status color mapping
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-teal-500 bg-teal-50';
      case 'pending':
        return 'text-yellow-500 bg-yellow-50';
      case 'adopted':
        return 'text-coral-500 bg-coral-50';
      case 'unavailable':
        return 'text-gray-500 bg-gray-50';
      default:
        return 'text-gray-500 bg-gray-50';
    }
  };

  const formatStatus = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatLastUpdate = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) { // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) { // Less than 1 hour
      return `${Math.floor(diff / 60000)} min ago`;
    } else {
      return new Date(timestamp).toLocaleTimeString();
    }
  };

  return (
    <>
      <PetAdoptionRealTimeUpdates
        petId={petId}
        currentStatus={currentStatus}
        onStatusChange={handleStatusChange}
      />
      
      <div className={`flex items-center space-x-2 ${className}`}>
        <span className={`
          inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
          transition-all duration-300 ${getStatusColor(currentStatus)}
          ${isUpdating ? 'animate-pulse ring-2 ring-coral-200' : ''}
        `}>
          {formatStatus(currentStatus)}
        </span>
        
        {showLastUpdate && lastUpdateTime && (
          <span className="text-xs text-text-light">
            Updated {formatLastUpdate(lastUpdateTime)}
          </span>
        )}
        
        {isUpdating && (
          <span className="text-xs text-coral-500 font-medium animate-pulse">
            ● Live
          </span>
        )}
      </div>
    </>
  );
}

// Pet adoption notifications component
interface PetAdoptionNotificationsProps {
  userId?: string;
  showToast?: boolean;
  onNotification?: (event: PetAdoptionStatusChangedEvent) => void;
}

export function PetAdoptionNotifications({
  userId,
  showToast = true,
  onNotification,
}: PetAdoptionNotificationsProps) {
  const [, setNotifications] = useState<PetAdoptionStatusChangedEvent[]>([]);
  const { currentContext } = useCorrelation();

  const handleAdoptionStatusChanged = useCallback((event: PetAdoptionStatusChangedEvent) => {
    // Only show notifications for the current user's activities or general updates
    const isRelevant = !userId || event.adopterId === userId || event.adopterId === currentContext?.userId;
    
    if (isRelevant) {
      setNotifications(prev => [event, ...prev.slice(0, 4)]); // Keep last 5 notifications
      onNotification?.(event);
      
      if (showToast) {
        // This would integrate with your toast notification system
        console.log(`[PetAdoption] Toast notification for pet ${event.petId}:`, {
          status: event.status,
          correlationId: event.correlationId,
        });
      }
    }
  }, [userId, currentContext, showToast, onNotification]);

  usePetAdoptionEvents(handleAdoptionStatusChanged);

  // Don't render anything - this is a logic-only component
  // In a real implementation, you might render toast notifications here
  return null;
}