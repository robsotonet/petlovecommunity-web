'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardActions } from '@/components/ui/Card';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error');

  const getErrorInfo = (errorCode: string | null) => {
    switch (errorCode) {
      case 'Configuration':
        return {
          title: 'Authentication Configuration Error',
          description: 'There is a problem with the server configuration. Our technical team has been notified.',
          icon: '⚙️',
          suggestions: [
            'Try again in a few minutes',
            'Contact support if the problem persists',
          ],
        };
      
      case 'AccessDenied':
        return {
          title: 'Access Denied',
          description: 'You do not have permission to access this resource.',
          icon: '🚫',
          suggestions: [
            'Make sure you have the correct permissions',
            'Contact an administrator if you believe this is an error',
          ],
        };
      
      case 'Verification':
        return {
          title: 'Verification Required',
          description: 'Please verify your email address to continue.',
          icon: '✉️',
          suggestions: [
            'Check your email for a verification link',
            'Check your spam folder',
            'Request a new verification email',
          ],
        };
      
      case 'Signin':
      case 'CredentialsSignin':
        return {
          title: 'Sign In Failed',
          description: 'Invalid credentials or account not found.',
          icon: '🔐',
          suggestions: [
            'Double-check your email and password',
            'Reset your password if you forgot it',
            'Create a new account if you don&apos;t have one',
          ],
        };
      
      case 'SessionRequired':
        return {
          title: 'Sign In Required',
          description: 'You need to be signed in to access this page.',
          icon: '👤',
          suggestions: [
            'Sign in with your existing account',
            'Create a new account to get started',
          ],
        };
      
      case 'Callback':
        return {
          title: 'Authentication Error',
          description: 'There was an error during the authentication process.',
          icon: '⚠️',
          suggestions: [
            'Try signing in again',
            'Clear your browser cache and cookies',
            'Contact support if the problem continues',
          ],
        };
      
      default:
        return {
          title: 'Authentication Error',
          description: 'An unexpected error occurred during authentication.',
          icon: '❌',
          suggestions: [
            'Try signing in again',
            'Clear your browser cache and cookies',
            'Contact support if the problem persists',
          ],
        };
    }
  };

  const errorInfo = getErrorInfo(error);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <Card variant="default" className="max-w-2xl w-full">
        <CardHeader className="text-center pb-6">
          {/* Error Icon */}
          <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl" role="img" aria-label="Error">
              {errorInfo.icon}
            </span>
          </div>
          
          <CardTitle level={1} className="text-2xl md:text-3xl text-error mb-4">
            {errorInfo.title}
          </CardTitle>
          <p className="text-xl text-text-secondary leading-relaxed max-w-lg mx-auto">
            {errorInfo.description}
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error Details */}
          {error && (
            <div className="bg-error/5 border border-error/20 rounded-lg p-4">
              <h3 className="text-error font-semibold mb-2">Technical Details</h3>
              <p className="text-sm text-text-secondary font-mono">
                Error Code: {error}
              </p>
            </div>
          )}

          {/* What to try */}
          <div>
            <h3 className="text-lg font-semibold text-midnight mb-4">What you can try:</h3>
            <ul className="space-y-3">
              {errorInfo.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <svg className="w-5 h-5 text-coral mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-text-secondary">{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Additional Help */}
          <div className="bg-teal-bg border border-teal/20 rounded-lg p-4">
            <h3 className="text-teal font-semibold mb-2">Need Help?</h3>
            <p className="text-sm text-text-secondary">
              If you continue to experience problems, please contact our support team. 
              Include the error code and describe what you were trying to do when the error occurred.
            </p>
          </div>
        </CardContent>

        <CardActions alignment="center" className="pt-4 pb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/auth/login">
              <Button variant="adoption" size="lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                Try Sign In Again
              </Button>
            </Link>
            
            <Link href="/">
              <Button variant="secondary" size="lg">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Return Home
              </Button>
            </Link>
          </div>
        </CardActions>

        {/* Additional Links */}
        <div className="border-t border-gray-200 pt-6 pb-4 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <Link href="/auth/register" className="text-teal hover:text-teal-accent transition-colors">
              Create Account
            </Link>
            <Link href="/auth/forgot-password" className="text-teal hover:text-teal-accent transition-colors">
              Reset Password
            </Link>
            <Link href="/contact" className="text-teal hover:text-teal-accent transition-colors">
              Contact Support
            </Link>
            <Link href="/help" className="text-teal hover:text-teal-accent transition-colors">
              Help Center
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}