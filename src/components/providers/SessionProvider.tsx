'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import { useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { correlationService } from '@/lib/services/CorrelationService';

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider>
      <SessionIntegrator>
        {children}
      </SessionIntegrator>
    </NextAuthSessionProvider>
  );
}

// Component to integrate NextAuth session with enterprise services
function SessionIntegrator({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    // Update correlation context when session changes
    if (session?.user) {
      // Set current correlation ID if user has one, or create new context
      if (session.user.correlationId) {
        correlationService.setCurrentCorrelationId(session.user.correlationId);
        
        // Update existing context with user ID
        correlationService.updateContext(session.user.correlationId, {
          userId: session.user.id,
          timestampMs: Date.now(),
        });
      } else {
        // Create new correlation context for user session
        const newContext = correlationService.createContext(session.user.id, undefined);
        console.log('[SessionProvider] Created new correlation context for user session', {
          correlationId: newContext.correlationId,
          userId: session.user.id,
        });
      }

      console.log('[SessionProvider] Session integrated with correlation context', {
        userId: session.user.id,
        correlationId: session.user.correlationId,
        role: session.user.role,
        status,
      });
    } else if (status !== 'loading') {
      // Clear user context when not authenticated, but keep correlation context
      const currentContext = correlationService.getCurrentContext();
      if (currentContext) {
        correlationService.updateContext(currentContext.correlationId, {
          userId: undefined,
          timestampMs: Date.now(),
        });
      }

      console.log('[SessionProvider] User context cleared from correlation', {
        status,
        hasCurrentContext: !!currentContext,
      });
    }
  }, [session, status]);

  // Log session status changes for debugging
  useEffect(() => {
    console.log('[SessionProvider] Session status changed', {
      status,
      hasSession: !!session,
      userId: session?.user?.id,
      timestamp: new Date().toISOString(),
    });
  }, [status, session?.user?.id]);

  return <>{children}</>;
}

// Hook for accessing Pet Love Community session data
export function usePetLoveCommunitySession() {
  const { data: session, status, update } = useSession();

  return {
    user: session?.user || null,
    isLoading: status === 'loading',
    isAuthenticated: !!session?.user,
    isAdmin: session?.user?.role === 'admin',
    isVolunteer: session?.user?.role === 'volunteer' || session?.user?.role === 'admin',
    hasAdoptionHistory: (session?.user?.adoptionHistory?.length || 0) > 0,
    hasVolunteerHistory: (session?.user?.volunteeredEvents?.length || 0) > 0,
    correlationId: session?.user?.correlationId,
    status,
    update,
  };
}

// Hook for checking specific permissions
export function usePermissions() {
  const { isAuthenticated, isAdmin, isVolunteer } = usePetLoveCommunitySession();

  const hasPermission = (permission: string): boolean => {
    if (!isAuthenticated) return false;

    switch (permission) {
      case 'adopt_pets':
        return isAuthenticated;
      case 'volunteer_events':
        return isAuthenticated;
      case 'manage_events':
        return isVolunteer;
      case 'manage_users':
        return isAdmin;
      case 'access_admin':
        return isAdmin;
      case 'view_analytics':
        return isVolunteer;
      case 'edit_services':
        return isAdmin;
      default:
        return false;
    }
  };

  const checkMultiplePermissions = (permissions: string[]): boolean => {
    return permissions.some(permission => hasPermission(permission));
  };

  const requireAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(permission => hasPermission(permission));
  };

  return {
    hasPermission,
    checkMultiplePermissions,
    requireAllPermissions,
    canAdoptPets: hasPermission('adopt_pets'),
    canVolunteer: hasPermission('volunteer_events'),
    canManageEvents: hasPermission('manage_events'),
    canManageUsers: hasPermission('manage_users'),
    canAccessAdmin: hasPermission('access_admin'),
    canViewAnalytics: hasPermission('view_analytics'),
    canEditServices: hasPermission('edit_services'),
  };
}

// Component for protecting content based on authentication
interface ProtectedContentProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
  requireRole?: 'user' | 'volunteer' | 'admin';
  requirePermission?: string;
}

export function ProtectedContent({
  children,
  fallback = null,
  requireAuth = true,
  requireRole,
  requirePermission,
}: ProtectedContentProps) {
  const { isAuthenticated, isLoading, user } = usePetLoveCommunitySession();
  const { hasPermission } = usePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
      </div>
    );
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return fallback;
  }

  // Check role requirement
  if (requireRole && user?.role !== requireRole) {
    // Special case: volunteers can access volunteer content, admins can access all
    if (requireRole === 'volunteer' && user?.role === 'admin') {
      // Admin can access volunteer content
    } else {
      return fallback;
    }
  }

  // Check permission requirement
  if (requirePermission && !hasPermission(requirePermission)) {
    return fallback;
  }

  return <>{children}</>;
}