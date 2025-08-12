'use client';

import { useState, useEffect } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardActions } from '@/components/ui/Card';
import { Input } from '@/components/forms/Input';
import { usePetLoveCommunitySession } from '@/components/providers/SessionProvider';
import { correlationService } from '@/lib/services/CorrelationService';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading: sessionLoading } = usePetLoveCommunitySession();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Redirect URL after login
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const errorParam = searchParams.get('error');

  // Set error from URL parameter
  useEffect(() => {
    if (errorParam) {
      switch (errorParam) {
        case 'CredentialsSignin':
          setError('Invalid email or password. Please try again.');
          break;
        case 'Configuration':
          setError('Authentication service error. Please try again later.');
          break;
        default:
          setError('An error occurred during login. Please try again.');
      }
    }
  }, [errorParam]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      router.replace(callbackUrl);
    }
  }, [isAuthenticated, sessionLoading, router, callbackUrl]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create correlation context for login attempt
      const correlationContext = correlationService.createContext(undefined, undefined);

      console.log('[Login] Attempting login', {
        correlationId: correlationContext.correlationId,
        email: formData.email,
        timestamp: new Date().toISOString(),
      });

      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.ok) {
        console.log('[Login] Login successful', {
          correlationId: correlationContext.correlationId,
          email: formData.email,
        });

        // Get updated session to ensure user data is loaded
        await getSession();
        
        // Redirect to callback URL
        router.replace(callbackUrl);
      } else {
        console.error('[Login] Login failed', {
          correlationId: correlationContext.correlationId,
          error: result?.error,
          email: formData.email,
        });

        setError('Invalid email or password. Please check your credentials and try again.');
      }
    } catch (error) {
      console.error('[Login] Login error:', error);
      setError('An unexpected error occurred. Please try again.');
      
      // Error already logged above
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading if session is being checked
  if (sessionLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coral"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <Card variant="default" className="max-w-md w-full">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center pb-6">
            {/* Pet Love Community Logo */}
            <div className="w-16 h-16 bg-coral rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            
            <CardTitle level={1} className="text-2xl md:text-3xl text-midnight">
              Welcome Back
            </CardTitle>
            <p className="text-text-secondary">
              Sign in to your Pet Love Community account
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <div className="bg-error/10 border border-error/20 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-error mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-error">{error}</p>
                </div>
              </div>
            )}

            <Input
              type="email"
              label="Email Address"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
              required
              disabled={isLoading}
              autoComplete="email"
            />

            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                label="Password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={(value) => handleInputChange('password', value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
              
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-text-tertiary hover:text-text-primary transition-colors"
                disabled={isLoading}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Demo Credentials */}
            <div className="bg-teal-bg border border-teal/20 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-teal mb-2">Demo Credentials</h3>
              <div className="text-xs text-text-secondary space-y-1">
                <p><strong>User:</strong> demo@petlovecommunity.com</p>
                <p><strong>Volunteer:</strong> volunteer@petlovecommunity.com</p>
                <p><strong>Admin:</strong> admin@petlovecommunity.com</p>
                <p><strong>Password:</strong> password (for all accounts)</p>
              </div>
            </div>
          </CardContent>

          <CardActions alignment="center" className="pt-4 pb-6">
            <div className="w-full space-y-4">
              <Button
                type="submit"
                variant="adoption"
                size="lg"
                className="w-full"
                loading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Signing In...' : 'Sign In'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-text-secondary">
                  Don&apos;t have an account?{' '}
                  <Link 
                    href="/auth/register" 
                    className="text-coral hover:text-coral-accent font-medium transition-colors"
                  >
                    Join our community
                  </Link>
                </p>
              </div>

              <div className="text-center">
                <Link 
                  href="/auth/forgot-password" 
                  className="text-sm text-text-tertiary hover:text-text-primary transition-colors"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>
          </CardActions>
        </form>
      </Card>
    </div>
  );
}