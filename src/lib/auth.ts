import { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { correlationService } from './services/CorrelationService';
import { transactionManager } from './services/TransactionManager';
import { authApiService } from './services/AuthApiService';

// Extended user type for Pet Love Community
interface PetLoveCommunityUser extends User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'volunteer' | 'admin';
  adoptionHistory: string[];
  volunteeredEvents: string[];
  correlationId: string;
  createdAt: string;
  lastLogin: string;
}

// User data is now managed by UserService - no hardcoded users here

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Pet Love Community',
      credentials: {
        email: { 
          label: 'Email', 
          type: 'email', 
          placeholder: 'your.email@example.com' 
        },
        password: { 
          label: 'Password', 
          type: 'password' 
        }
      },
      async authorize(credentials, req): Promise<PetLoveCommunityUser | null> {
        try {
          if (!credentials?.email || !credentials?.password) {
            console.log('[Auth] Missing credentials');
            return null;
          }

          // Generate correlation context for auth operation
          const correlationContext = correlationService.createContext(undefined, undefined);
          const correlationId = correlationContext.correlationId;

          // Log authentication attempt
          const authData = { 
            email: credentials.email,
            timestamp: Date.now(),
            userAgent: req?.headers?.['user-agent'] || 'unknown'
          };

          console.log(`[Auth] Authentication attempt for ${credentials.email}`, {
            correlationId,
            timestamp: new Date().toISOString(),
          });

          // Use AuthApiService to validate credentials against backend
          const user = await authApiService.validateUser({
            email: credentials.email,
            password: credentials.password
          });
          
          if (!user) {
            console.log('[Auth] Invalid credentials');
            return null;
          }

          // Update correlation context with user ID
          correlationService.updateContext(correlationContext.correlationId, { userId: user.id });

          console.log(`[Auth] Authentication successful for ${user.email}`, {
            correlationId,
            userId: user.id,
            role: user.role,
          });

          // Return user with correlation context
          const authenticatedUser: PetLoveCommunityUser = {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`.trim(),
            role: user.role === 'Free' ? 'user' : user.role.toLowerCase(), // Map backend role to frontend role
            adoptionHistory: [], // Backend API user may not have these fields initially
            volunteeredEvents: [], // Will be populated from backend if available
            correlationId,
            createdAt: user.createdAt,
            lastLogin: user.lastLoginAt || new Date().toISOString(),
          };

          return authenticatedUser;

        } catch (error) {
          console.error('[Auth] Authentication error:', error);
          
          // Error already logged
          
          return null;
        }
      }
    })
  ],
  
  callbacks: {
    async jwt({ token, user, account }) {
      // Include correlation ID and user data in JWT
      if (user) {
        const petUser = user as PetLoveCommunityUser;
        token.id = petUser.id;
        token.role = petUser.role;
        token.adoptionHistory = petUser.adoptionHistory;
        token.volunteeredEvents = petUser.volunteeredEvents;
        token.correlationId = petUser.correlationId;
        token.createdAt = petUser.createdAt;
        token.lastLogin = petUser.lastLogin;
      }
      return token;
    },
    
    async session({ session, token }) {
      // Include user data and correlation context in session
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.adoptionHistory = token.adoptionHistory as string[];
        session.user.volunteeredEvents = token.volunteeredEvents as string[];
        session.user.correlationId = token.correlationId as string;
        session.user.createdAt = token.createdAt as string;
        session.user.lastLogin = token.lastLogin as string;

        // Update correlation context with user session
        const existingContext = correlationService.getContext(session.user.correlationId);
        if (existingContext) {
          correlationService.updateContext(session.user.correlationId, {
            userId: session.user.id,
            timestampMs: Date.now(),
          });
        } else {
          // Create new context if it doesn't exist
          const newContext = correlationService.createContext(session.user.id, undefined);
          session.user.correlationId = newContext.correlationId;
        }
      }
      
      return session;
    },

    async signIn({ user, account, profile }) {
      try {
        const correlationId = user.correlationId || correlationService.generateCorrelationId();
        
        console.log('[Auth] SignIn callback', {
          correlationId,
          userId: user.id,
          email: user.email,
          provider: account?.provider,
          timestamp: new Date().toISOString(),
        });

        return true;
      } catch (error) {
        console.error('[Auth] SignIn callback error:', error);
        return false;
      }
    },

    async signOut({ session, token }) {
      try {
        const correlationId = session?.user?.correlationId || token?.correlationId || 
                            correlationService.generateCorrelationId();
        
        console.log('[Auth] SignOut callback', {
          correlationId,
          userId: session?.user?.id || token?.id,
          timestamp: new Date().toISOString(),
        });

        return true;
      } catch (error) {
        console.error('[Auth] SignOut callback error:', error);
        return true; // Always allow sign out
      }
    }
  },

  pages: {
    signIn: '/auth/login',
    signUp: '/auth/register',
    error: '/auth/error',
  },

  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
    updateAge: 24 * 60 * 60, // 24 hours
  },

  jwt: {
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      const correlationId = user.correlationId || correlationService.generateCorrelationId();
      
      console.log('[Auth Event] User signed in', {
        correlationId,
        userId: user.id,
        email: user.email,
        provider: account?.provider,
        isNewUser,
        timestamp: new Date().toISOString(),
      });

      // In production, you would log this to your analytics/monitoring system
    },

    async signOut({ session, token }) {
      const correlationId = session?.user?.correlationId || token?.correlationId ||
                          correlationService.generateCorrelationId();
      
      console.log('[Auth Event] User signed out', {
        correlationId,
        userId: session?.user?.id || token?.id,
        timestamp: new Date().toISOString(),
      });
    },

    async session({ session, token }) {
      // Update correlation context on session check
      if (session.user?.id && session.user?.correlationId) {
        const existingContext = correlationService.getContext(session.user.correlationId);
        if (existingContext) {
          correlationService.updateContext(session.user.correlationId, { 
            userId: session.user.id,
            timestampMs: Date.now(),
          });
        }
      }
    }
  },

  debug: process.env.NODE_ENV === 'development',
  
  // Security configuration
  useSecureCookies: process.env.NODE_ENV === 'production',
  secret: process.env.NEXTAUTH_SECRET || 'petlovecommunity-dev-secret-key',
};

// Helper functions for authentication status
export const isAuthenticated = (session: any): boolean => {
  return !!session?.user?.id;
};

export const hasRole = (session: any, role: string): boolean => {
  return session?.user?.role === role;
};

export const hasAnyRole = (session: any, roles: string[]): boolean => {
  return roles.includes(session?.user?.role);
};

export const isAdmin = (session: any): boolean => {
  return hasRole(session, 'admin');
};

export const isVolunteer = (session: any): boolean => {
  return hasAnyRole(session, ['volunteer', 'admin']);
};