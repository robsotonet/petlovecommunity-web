'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardActions } from '@/components/ui/Card';
import { correlationService } from '@/lib/services/CorrelationService';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const correlationId = correlationService.getCurrentContext()?.correlationId || 'unknown';
  const timestamp = new Date().toISOString();

  useEffect(() => {
    // Log error with enterprise context
    const errorData = {
      message: error.message,
      stack: error.stack,
      digest: error.digest,
      correlationId,
      timestamp,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 [Global Error] Application Error');
      console.error('Error:', error);
      console.error('Full Error Data:', errorData);
      console.groupEnd();
    }

    // In production, you would send this to your error monitoring service
    if (typeof window !== 'undefined') {
      try {
        const errors = JSON.parse(localStorage.getItem('globalErrors') || '[]');
        errors.push(errorData);
        // Keep only last 5 errors
        if (errors.length > 5) {
          errors.splice(0, errors.length - 5);
        }
        localStorage.setItem('globalErrors', JSON.stringify(errors));
      } catch (storageError) {
        console.warn('Failed to store error in localStorage:', storageError);
      }
    }
  }, [error, correlationId, timestamp]);

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <Card variant="default" className="max-w-3xl w-full">
        <CardContent className="pt-12 pb-8">
          {/* Error illustration */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <CardHeader className="pb-4">
              <CardTitle level={1} className="text-3xl md:text-4xl text-error mb-4">
                Oops! Something Went Wrong
              </CardTitle>
              <p className="text-xl text-text-secondary leading-relaxed max-w-2xl mx-auto">
                Our pet care system encountered an unexpected error. Don&apos;t worry - 
                our technical team has been notified and we&apos;re working on a solution.
              </p>
            </CardHeader>
          </div>

          {/* Error details for development */}
          {isDevelopment && (
            <div className="mb-8 max-w-2xl mx-auto">
              <Card variant="default" className="bg-error/5 border border-error/20">
                <CardHeader>
                  <CardTitle level={3} className="text-error text-lg">
                    Development Error Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <strong className="text-error">Error Message:</strong>
                    <p className="text-sm text-text-secondary mt-1 font-mono bg-white p-2 rounded border">
                      {error.message}
                    </p>
                  </div>
                  
                  {error.digest && (
                    <div>
                      <strong className="text-error">Error Digest:</strong>
                      <p className="text-sm text-text-secondary mt-1 font-mono">
                        {error.digest}
                      </p>
                    </div>
                  )}
                  
                  <div>
                    <strong className="text-error">Correlation ID:</strong>
                    <p className="text-sm text-text-secondary mt-1 font-mono">
                      {correlationId}
                    </p>
                  </div>
                  
                  <div>
                    <strong className="text-error">Timestamp:</strong>
                    <p className="text-sm text-text-secondary mt-1 font-mono">
                      {timestamp}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Production error info */}
          {!isDevelopment && (
            <div className="mb-8 max-w-md mx-auto">
              <div className="bg-teal-bg border border-teal/20 rounded-lg p-4">
                <h3 className="text-teal font-semibold mb-2">Error Report</h3>
                <div className="text-sm space-y-1 text-text-secondary">
                  <div>
                    <strong>Reference ID:</strong> 
                    <span className="font-mono ml-2">{correlationId}</span>
                  </div>
                  <div>
                    <strong>Time:</strong> 
                    <span className="ml-2">{new Date(timestamp).toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-text-tertiary mt-3">
                  Please include this reference ID when contacting support.
                </p>
              </div>
            </div>
          )}

          {/* What happened section */}
          <div className="mb-8 text-left max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-midnight mb-4 text-center">
              What happened?
            </h3>
            <ul className="space-y-2 text-text-secondary">
              <li className="flex items-start">
                <svg className="w-5 h-5 text-coral mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Our system encountered an unexpected issue</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-coral mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>The error has been automatically reported</span>
              </li>
              <li className="flex items-start">
                <svg className="w-5 h-5 text-coral mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Our team is working on a solution</span>
              </li>
            </ul>
          </div>
        </CardContent>

        <CardActions alignment="center" className="pb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="adoption" size="lg" onClick={reset}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </Button>
            
            <Button variant="secondary" size="lg" onClick={handleReload}>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reload Page
            </Button>
          </div>
        </CardActions>

        {/* Additional help section */}
        <div className="border-t border-gray-200 pt-6 pb-4 text-center">
          <p className="text-sm text-text-tertiary mb-4">
            Need immediate assistance? Try these options:
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/" className="text-teal hover:text-teal-accent transition-colors">
              Return Home
            </Link>
            <Link href="/pets" className="text-teal hover:text-teal-accent transition-colors">
              Browse Pets
            </Link>
            <Link href="/services" className="text-teal hover:text-teal-accent transition-colors">
              Pet Services
            </Link>
            <Link href="/contact" className="text-teal hover:text-teal-accent transition-colors">
              Contact Support
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}