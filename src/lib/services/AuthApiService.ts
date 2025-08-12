import { correlationService } from './CorrelationService';

// API Base URL from environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5248';

export interface ApiUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  bio?: string;
  profilePictureUrl?: string;
  role: string; // Backend uses 'Free', 'Premium', etc.
  status: string; // Backend uses 'Active', etc.
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  expiresAt: string;
  user: ApiUser;
}

// ASP.NET Core Success Response Format
export interface BackendSuccessResponse<T = any> {
  isSuccess: true;
  data?: T;
  message?: string;
}

// Backend Error Response Format (business logic errors)
export interface BackendErrorResponse {
  isSuccess: false;
  data: null;
  message: string;
}

// ASP.NET Core Validation Error Response Format  
export interface BackendValidationErrorResponse {
  type: string;
  title: string;
  status: number;
  errors: Record<string, string[]>; // Field name -> array of error messages
  traceId: string;
}

// Combined response type
export type BackendApiResponse<T = any> = BackendSuccessResponse<T> | BackendErrorResponse | BackendValidationErrorResponse;

export interface RegisterUserData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  correlationId: string;
}

class AuthApiService {
  private static instance: AuthApiService;

  static getInstance(): AuthApiService {
    if (!AuthApiService.instance) {
      AuthApiService.instance = new AuthApiService();
    }
    return AuthApiService.instance;
  }

  private getFriendlyFieldName(fieldName: string): string {
    const fieldMapping: Record<string, string> = {
      'FirstName': 'First Name',
      'LastName': 'Last Name', 
      'Email': 'Email',
      'Password': 'Password',
      'ConfirmPassword': 'Confirm Password',
    };
    return fieldMapping[fieldName] || fieldName;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const correlationContext = correlationService.getCurrentContext() || 
                               correlationService.createContext();
    const correlationId = correlationContext.correlationId;

    const url = `${API_BASE_URL}${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Correlation-ID': correlationId,
      'X-Timestamp': Date.now().toString(),
    };

    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    console.log(`[AuthApiService] Making request to ${url}`, {
      correlationId,
      method: options.method || 'GET',
      timestamp: new Date().toISOString(),
    });

    try {
      const response = await fetch(url, requestOptions);
      const backendResponse: BackendApiResponse<T> = await response.json();

      // Type guard to check if this is a success response
      const isSuccessResponse = (resp: BackendApiResponse<T>): resp is BackendSuccessResponse<T> => {
        return 'isSuccess' in resp && resp.isSuccess === true;
      };

      // Type guard to check if this is a business logic error response
      const isBusinessErrorResponse = (resp: BackendApiResponse<T>): resp is BackendErrorResponse => {
        return 'isSuccess' in resp && resp.isSuccess === false && 'message' in resp;
      };

      // Type guard to check if this is a validation error response
      const isValidationErrorResponse = (resp: BackendApiResponse<T>): resp is BackendValidationErrorResponse => {
        return 'errors' in resp && typeof resp.errors === 'object' && resp.errors !== null;
      };

      console.log(`[AuthApiService] Response from ${url}`, {
        correlationId,
        status: response.status,
        isSuccess: isSuccessResponse(backendResponse),
        isBusinessError: isBusinessErrorResponse(backendResponse),
        hasValidationErrors: isValidationErrorResponse(backendResponse),
        timestamp: new Date().toISOString(),
      });

      if (!response.ok || !isSuccessResponse(backendResponse)) {
        let errorMessage = 'Request failed';

        if (isValidationErrorResponse(backendResponse)) {
          // Convert validation errors to user-friendly message
          const errorMessages: string[] = [];
          for (const [field, fieldErrors] of Object.entries(backendResponse.errors)) {
            // Map technical field names to user-friendly names
            const friendlyFieldName = this.getFriendlyFieldName(field);
            errorMessages.push(...fieldErrors.map(error => `${friendlyFieldName}: ${error}`));
          }
          errorMessage = errorMessages.join('. ') || backendResponse.title || errorMessage;
        } else if (isBusinessErrorResponse(backendResponse)) {
          // Business logic error (e.g., user already exists)
          errorMessage = backendResponse.message;
        } else if (isSuccessResponse(backendResponse) && backendResponse.message) {
          errorMessage = backendResponse.message;
        }
        
        return {
          success: false,
          error: errorMessage,
          correlationId,
        };
      }

      return {
        success: true,
        data: backendResponse.data,
        message: backendResponse.message,
        correlationId,
      };

    } catch (error) {
      console.error(`[AuthApiService] Network error for ${url}:`, error, {
        correlationId,
        timestamp: new Date().toISOString(),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
        correlationId,
      };
    }
  }

  async registerUser(userData: RegisterUserData): Promise<ApiResponse<AuthResponse>> {
    console.log('[AuthApiService] Registration attempt', {
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      timestamp: new Date().toISOString(),
    });

    return this.makeRequest<AuthResponse>('/api/Auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async loginUser(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    console.log('[AuthApiService] Login attempt', {
      email: credentials.email,
      timestamp: new Date().toISOString(),
    });

    return this.makeRequest<AuthResponse>('/api/Auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async validateUser(credentials: LoginCredentials): Promise<ApiUser | null> {
    const response = await this.loginUser(credentials);
    
    if (response.success && response.data?.user) {
      console.log('[AuthApiService] User validation successful', {
        userId: response.data.user.id,
        email: response.data.user.email,
        correlationId: response.correlationId,
      });
      return response.data.user;
    }

    console.log('[AuthApiService] User validation failed', {
      email: credentials.email,
      error: response.error,
      correlationId: response.correlationId,
    });
    
    return null;
  }

  async refreshUserProfile(userId: string): Promise<ApiResponse<ApiUser>> {
    console.log('[AuthApiService] Refreshing user profile', {
      userId,
      timestamp: new Date().toISOString(),
    });

    return this.makeRequest<ApiUser>(`/api/users/${userId}`, {
      method: 'GET',
    });
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/api/health', {
        method: 'GET',
      });
      return response.success;
    } catch (error) {
      console.error('[AuthApiService] Health check failed:', error);
      return false;
    }
  }
}

export const authApiService = AuthApiService.getInstance();