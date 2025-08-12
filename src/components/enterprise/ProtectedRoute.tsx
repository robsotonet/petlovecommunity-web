'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePetLoveCommunitySession } from '@/components/providers/SessionProvider';
import { correlationService } from '@/lib/services/CorrelationService';
import { transactionManager } from '@/lib/services/TransactionManager';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'user' | 'volunteer' | 'admin';
  redirectTo?: string;
  fallback?: React.ReactNode;
  requireEmailVerification?: boolean;
}

export function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/auth/login',
  fallback,
  requireEmailVerification = false,
}: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = usePetLoveCommunitySession();
  const [accessGranted, setAccessGranted] = useState(false);
  const [correlationId, setCorrelationId] = useState<string>('');

  useEffect(() => {
    // Create correlation context for protected route access
    const correlationContext = correlationService.createContext(user?.id, undefined);
    setCorrelationId(correlationContext.correlationId);

    console.log('[ProtectedRoute] Access control check', {
      correlationId: correlationContext.correlationId,
      userId: user?.id,
      userRole: user?.role,
      requiredRole,
      isAuthenticated,
      isLoading,
      requireEmailVerification,
      timestamp: new Date().toISOString(),
    });

    if (isLoading) {
      return; // Wait for session loading
    }

    if (!isAuthenticated || !user) {
      console.log('[ProtectedRoute] Unauthorized access attempt', {
        correlationId: correlationContext.correlationId,
        requiredRole,
        redirectTo,
        timestamp: new Date().toISOString(),
      });

      // Create transaction for unauthorized access tracking
      const transaction = transactionManager.createTransaction(
        'route-access',
        correlationContext.correlationId,
        { route: window.location.pathname, requiredRole }
      );

      transactionManager.markTransactionFailed(
        transaction.id,
        'Unauthorized access - user not authenticated'
      );

      router.replace(`${redirectTo}?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    // Check role requirements
    if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
      console.log('[ProtectedRoute] Insufficient role permissions', {
        correlationId: correlationContext.correlationId,
        userId: user.id,
        userRole: user.role,
        requiredRole,
        timestamp: new Date().toISOString(),
      });

      // Create transaction for insufficient role tracking
      const transaction = transactionManager.createTransaction(
        'route-access',
        correlationContext.correlationId,
        { route: window.location.pathname, requiredRole, userRole: user.role }
      );

      transactionManager.markTransactionFailed(
        transaction.id,
        `Insufficient role - required: ${requiredRole}, user: ${user.role}`
      );

      setAccessGranted(false);
      return;
    }

    // Check email verification if required
    if (requireEmailVerification && !user.isEmailVerified) {
      console.log('[ProtectedRoute] Email verification required', {
        correlationId: correlationContext.correlationId,
        userId: user.id,
        isEmailVerified: user.isEmailVerified,
        timestamp: new Date().toISOString(),
      });

      setAccessGranted(false);
      return;
    }

    // Access granted
    console.log('[ProtectedRoute] Access granted', {
      correlationId: correlationContext.correlationId,
      userId: user.id,
      userRole: user.role,
      requiredRole,
      timestamp: new Date().toISOString(),
    });

    // Create successful transaction for route access
    const transaction = transactionManager.createTransaction(
      'route-access',
      correlationContext.correlationId,
      { route: window.location.pathname, requiredRole, userRole: user.role }
    );

    transactionManager.markTransactionComplete(transaction.id);

    setAccessGranted(true);

  }, [isAuthenticated, isLoading, user, requiredRole, requireEmailVerification, router, redirectTo]);

  // Helper function to check role hierarchy
  const hasRequiredRole = (userRole: string, requiredRole: string): boolean => {
    const roleHierarchy = {
      user: 0,
      volunteer: 1,
      admin: 2,
    };

    const userLevel = roleHierarchy[userRole as keyof typeof roleHierarchy] ?? -1;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] ?? 999;

    return userLevel >= requiredLevel;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" data-correlation-id={correlationId}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-coral mx-auto"></div>
          <p className="text-text-secondary">Verifying access permissions...</p>
        </div>
      </div>
    );
  }

  // Unauthorized - not logged in
  if (!isAuthenticated || !user) {
    return fallback || (
      <div className="min-h-[60vh] flex items-center justify-center px-4" data-correlation-id={correlationId}>
        <Card variant="default" className="max-w-md w-full text-center">
          <CardContent className="space-y-6 pt-8">
            <div className="w-16 h-16 bg-coral/10 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-midnight">Authentication Required</h2>
              <p className="text-text-secondary">
                Please sign in to access this area of Pet Love Community.
              </p>
            </div>

            <Button
              variant="adoption"
              size="lg"
              onClick={() => router.push(`${redirectTo}?callbackUrl=${encodeURIComponent(window.location.pathname)}`)}
              className="w-full"
            >
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Insufficient role permissions
  if (requiredRole && !hasRequiredRole(user.role, requiredRole)) {
    return fallback || (
      <div className="min-h-[60vh] flex items-center justify-center px-4" data-correlation-id={correlationId}>
        <Card variant="default" className="max-w-md w-full text-center">
          <CardContent className="space-y-6 pt-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-midnight">Access Restricted</h2>
              <p className="text-text-secondary">
                This area requires {requiredRole} privileges. Your current role is {user.role}.
              </p>
            </div>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => router.push('/')}
              className="w-full"
            >
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email verification required
  if (requireEmailVerification && !user.isEmailVerified) {
    return fallback || (
      <div className="min-h-[60vh] flex items-center justify-center px-4" data-correlation-id={correlationId}>
        <Card variant="default" className="max-w-md w-full text-center">
          <CardContent className="space-y-6 pt-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-midnight">Email Verification Required</h2>
              <p className="text-text-secondary">
                Please verify your email address to access this feature.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                variant="adoption"
                size="lg"
                onClick={() => {
                  // TODO: Implement resend verification email
                  console.log('Resend verification email requested', { correlationId, userId: user.id });
                }}
                className="w-full"
              >
                Resend Verification Email
              </Button>
              
              <Button
                variant="secondary"
                size="md"
                onClick={() => router.push('/')}
                className="w-full"
              >
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Access granted - render protected content
  if (accessGranted) {
    return <div data-correlation-id={correlationId}>{children}</div>;
  }

  // Default loading state while checking access
  return (
    <div className="min-h-[60vh] flex items-center justify-center" data-correlation-id={correlationId}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
    </div>
  );
}

// Higher-order component for easy route protection
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  protectionConfig?: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...protectionConfig}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Hook for checking access permissions in components
export function useRouteAccess(requiredRole?: string) {
  const { user, isAuthenticated, isLoading } = usePetLoveCommunitySession();

  const hasAccess = () => {
    if (isLoading || !isAuthenticated || !user) return false;
    if (!requiredRole) return true;

    const roleHierarchy = {
      user: 0,
      volunteer: 1,
      admin: 2,
    };

    const userLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] ?? -1;
    const requiredLevel = roleHierarchy[requiredRole as keyof typeof roleHierarchy] ?? 999;

    return userLevel >= requiredLevel;
  };

  return {
    hasAccess: hasAccess(),
    user,
    isAuthenticated,
    isLoading,
  };
}