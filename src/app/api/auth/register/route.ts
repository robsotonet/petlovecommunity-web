import { NextRequest, NextResponse } from 'next/server';
import { correlationService } from '@/lib/services/CorrelationService';
import { authApiService } from '@/lib/services/AuthApiService';

export async function POST(request: NextRequest) {
  try {
    // Generate correlation context for registration
    const correlationContext = correlationService.createContext(undefined, undefined);
    const correlationId = correlationContext.correlationId;

    console.log('[Registration API] Registration attempt started', {
      correlationId,
      timestamp: new Date().toISOString(),
    });

    const body = await request.json();
    const { firstName, lastName, email, password, role = 'user' } = body;

    // Validation
    if (!firstName || !lastName || !email || !password) {
      console.log('[Registration API] Missing required fields', { 
        correlationId, 
        email: email || 'none',
        hasFirstName: !!firstName,
        hasLastName: !!lastName 
      });
      return NextResponse.json(
        { error: 'First name, last name, email, and password are required' },
        { status: 400, headers: { 'X-Correlation-ID': correlationId } }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('[Registration API] Invalid email format', { correlationId, email });
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400, headers: { 'X-Correlation-ID': correlationId } }
      );
    }

    // Password validation
    if (password.length < 6) {
      console.log('[Registration API] Password too short', { correlationId, email });
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400, headers: { 'X-Correlation-ID': correlationId } }
      );
    }

    // Register user using backend API
    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email,
      password,
      confirmPassword: password, // Backend expects confirmPassword field
    };

    const apiResponse = await authApiService.registerUser(userData);

    if (!apiResponse.success || !apiResponse.data) {
      console.log('[Registration API] Backend registration failed', {
        correlationId,
        email,
        error: apiResponse.error,
      });

      // Determine appropriate error status
      const isConflict = apiResponse.error?.includes('already exists') || apiResponse.error?.includes('exists');
      const statusCode = isConflict ? 409 : 400;

      return NextResponse.json(
        { error: apiResponse.error || 'Registration failed' },
        { status: statusCode, headers: { 'X-Correlation-ID': correlationId } }
      );
    }

    const authResponse = apiResponse.data;
    const newUser = authResponse.user;

    // Update correlation context with new user ID
    correlationService.updateContext(correlationId, { userId: newUser.id });

    console.log('[Registration API] Registration successful', {
      correlationId,
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role,
      timestamp: new Date().toISOString(),
    });

    // Return success response (without sensitive token information)
    return NextResponse.json(
      { 
        message: apiResponse.message || 'Registration successful', 
        user: newUser 
      },
      { 
        status: 201, 
        headers: { 'X-Correlation-ID': correlationId } 
      }
    );

  } catch (error) {
    const correlationId = correlationService.generateCorrelationId();
    console.error('[Registration API] Registration error:', error, { correlationId });
    
    // Handle various error types (network, backend, etc.)
    let errorMessage = 'An unexpected error occurred during registration';
    
    if (error instanceof Error) {
      errorMessage = error.message.includes('network') || error.message.includes('fetch')
        ? 'Unable to connect to registration service. Please try again.'
        : error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500, headers: { 'X-Correlation-ID': correlationId } }
    );
  }
}