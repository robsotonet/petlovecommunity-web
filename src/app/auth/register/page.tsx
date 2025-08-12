'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent, CardActions } from '@/components/ui/Card';
import { Input } from '@/components/forms/Input';
import { Select } from '@/components/forms/Select';
import { usePetLoveCommunitySession } from '@/components/providers/SessionProvider';
import { correlationService } from '@/lib/services/CorrelationService';

export default function RegisterPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: sessionLoading } = usePetLoveCommunitySession();
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    interests: [] as string[],
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const roleOptions = [
    { value: 'user', label: 'Pet Lover - Looking to adopt or learn' },
    { value: 'volunteer', label: 'Volunteer - Want to help pets and community' },
  ];

  // Redirect if already authenticated
  useEffect(() => {
    if (!sessionLoading && isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, sessionLoading, router]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError(''); // Clear error when user starts typing
    if (success) setSuccess(''); // Clear success when user starts typing
  };

  const validateForm = (): string | null => {
    if (!formData.firstName.trim()) {
      return 'Please enter your first name';
    }
    
    if (!formData.lastName.trim()) {
      return 'Please enter your last name';
    }
    
    if (!formData.email.trim()) {
      return 'Please enter your email address';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      return 'Please enter a valid email address';
    }
    
    if (!formData.password) {
      return 'Please enter a password';
    }
    
    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    
    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }
    
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Create correlation context for registration attempt
      const correlationContext = correlationService.createContext(undefined, undefined);

      console.log('[Register] Attempting registration', {
        correlationId: correlationContext.correlationId,
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
        timestamp: new Date().toISOString(),
      });

      // Call the registration API endpoint
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationContext.correlationId,
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Registration failed');
      }

      console.log('[Register] Registration successful', {
        correlationId: correlationContext.correlationId,
        email: formData.email,
        role: formData.role,
        userId: result.user.id,
      });

      // Show success message
      setSuccess('Account created successfully! You can now sign in with your credentials.');
      
      // Clear form
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'user',
        interests: [],
      });

      // Redirect to login after short delay
      setTimeout(() => {
        router.push('/auth/login?message=registration_success');
      }, 2000);

    } catch (error) {
      console.error('[Register] Registration error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred during registration';
      setError(errorMessage);
      
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
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <Card variant="default" className="max-w-lg w-full">
        <form onSubmit={handleSubmit}>
          <CardHeader className="text-center pb-6">
            {/* Pet Love Community Logo */}
            <div className="w-16 h-16 bg-coral rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
            
            <CardTitle level={1} className="text-2xl md:text-3xl text-midnight">
              Join Our Community
            </CardTitle>
            <p className="text-text-secondary">
              Create your Pet Love Community account and start making a difference
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

            {success && (
              <div className="bg-teal/10 border border-teal/20 rounded-lg p-4">
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-teal mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-teal">{success}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="text"
                label="First Name"
                placeholder="Enter your first name"
                value={formData.firstName}
                onChange={(value) => handleInputChange('firstName', value)}
                required
                disabled={isLoading}
                autoComplete="given-name"
              />
              <Input
                type="text"
                label="Last Name"
                placeholder="Enter your last name"
                value={formData.lastName}
                onChange={(value) => handleInputChange('lastName', value)}
                required
                disabled={isLoading}
                autoComplete="family-name"
              />
            </div>

            <Input
              type="email"
              label="Email Address"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(value) => handleInputChange('email', value)}
              required
              disabled={isLoading}
              autoComplete="email"
              hint="We'll use this to send you important updates about pets and events"
            />

            <Select
              label="How would you like to participate?"
              options={roleOptions}
              value={formData.role}
              onChange={(value) => handleInputChange('role', value)}
              required
              disabled={isLoading}
              hint="You can change this later in your profile settings"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(value) => handleInputChange('password', value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  hint="At least 6 characters"
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

              <div className="relative">
                <Input
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm Password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(value) => handleInputChange('confirmPassword', value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  error={formData.confirmPassword && formData.password !== formData.confirmPassword ? 'Passwords do not match' : undefined}
                />
                
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-9 text-text-tertiary hover:text-text-primary transition-colors"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? (
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
            </div>

            {/* Terms and Privacy */}
            <div className="bg-beige border border-gray-200 rounded-lg p-4 text-sm">
              <p className="text-text-secondary">
                By creating an account, you agree to our{' '}
                <Link href="/terms" className="text-coral hover:text-coral-accent font-medium">
                  Terms of Service
                </Link>
                {' '}and{' '}
                <Link href="/privacy" className="text-coral hover:text-coral-accent font-medium">
                  Privacy Policy
                </Link>
                . We&apos;re committed to protecting your privacy and using your information 
                only to connect you with pets and community events.
              </p>
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
                {isLoading ? 'Creating Account...' : 'Join Pet Love Community'}
              </Button>

              <div className="text-center">
                <p className="text-sm text-text-secondary">
                  Already have an account?{' '}
                  <Link 
                    href="/auth/login" 
                    className="text-coral hover:text-coral-accent font-medium transition-colors"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            </div>
          </CardActions>
        </form>
      </Card>
    </div>
  );
}