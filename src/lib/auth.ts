import { NextAuthOptions, User } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { correlationService } from './services/CorrelationService';
import { transactionManager } from './services/TransactionManager';

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

// Mock user database - in production, this would be replaced with actual database
const users = [
  {
    id: '1',
    email: 'demo@petlovecommunity.com',
    name: 'Demo User',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBSh8X8l8D8D8D', // 'password'
    role: 'user' as const,
    adoptionHistory: ['pet-1', 'pet-2'],
    volunteeredEvents: ['event-1'],
    createdAt: new Date('2024-01-01').toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: '2', 
    email: 'volunteer@petlovecommunity.com',
    name: 'Jane Volunteer',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBSh8X8l8D8D8D', // 'password'
    role: 'volunteer' as const,
    adoptionHistory: [],
    volunteeredEvents: ['event-1', 'event-2', 'event-3'],
    createdAt: new Date('2024-02-01').toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: '3',
    email: 'admin@petlovecommunity.com', 
    name: 'Admin User',
    password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBSh8X8l8D8D8D', // 'password'
    role: 'admin' as const,
    adoptionHistory: [],
    volunteeredEvents: [],
    createdAt: new Date('2024-01-01').toISOString(),
    lastLogin: new Date().toISOString(),
  }
];

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
          const correlationId = correlationService.generateCorrelationId();
          correlationService.setContext({
            correlationId,
            sessionId: correlationService.generateSessionId(),
            timestamp: Date.now(),
            userId: undefined, // Will be set after successful auth
            requestId: correlationService.generateRequestId(),
          });

          // Create transaction for authentication
          const transactionId = transactionManager.generateTransactionId();
          const transaction = await transactionManager.startTransaction({
            id: transactionId,
            correlationId,
            type: 'authentication',
            status: 'pending',
            data: { 
              email: credentials.email,
              timestamp: Date.now(),
              userAgent: req?.headers?.['user-agent'] || 'unknown'
            },
            retryCount: 0,
          });

          console.log(`[Auth] Authentication attempt for ${credentials.email}`, {
            correlationId,
            transactionId,
            timestamp: new Date().toISOString(),
          });

          // Find user by email
          const user = users.find(u => u.email === credentials.email);
          
          if (!user) {
            console.log('[Auth] User not found');
            await transactionManager.completeTransaction(transactionId, 'failed', {
              error: 'User not found',
            });
            return null;
          }

          // Verify password
          const isValidPassword = await bcrypt.compare(credentials.password, user.password);
          
          if (!isValidPassword) {
            console.log('[Auth] Invalid password');
            await transactionManager.completeTransaction(transactionId, 'failed', {
              error: 'Invalid password',
            });
            return null;
          }

          // Update correlation context with user ID
          correlationService.updateContext({ userId: user.id });

          // Complete authentication transaction
          await transactionManager.completeTransaction(transactionId, 'completed', {
            userId: user.id,
            email: user.email,
            role: user.role,
          });

          // Update last login time (in production, this would update the database)
          user.lastLogin = new Date().toISOString();

          console.log(`[Auth] Authentication successful for ${user.email}`, {
            correlationId,
            transactionId,
            userId: user.id,
            role: user.role,
          });

          // Return user with correlation context
          const authenticatedUser: PetLoveCommunityUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            adoptionHistory: user.adoptionHistory,
            volunteeredEvents: user.volunteeredEvents,
            correlationId,
            createdAt: user.createdAt,
            lastLogin: user.lastLogin,
          };

          return authenticatedUser;

        } catch (error) {
          console.error('[Auth] Authentication error:', error);
          
          // Try to complete transaction with error
          try {
            const correlationContext = correlationService.getCurrentContext();
            if (correlationContext) {
              await transactionManager.completeTransaction(
                correlationContext.correlationId, 
                'failed', 
                { 
                  error: error instanceof Error ? error.message : 'Unknown auth error' 
                }
              );
            }
          } catch (transactionError) {
            console.error('[Auth] Failed to complete failed transaction:', transactionError);
          }
          
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
        correlationService.setContext({
          correlationId: session.user.correlationId,
          sessionId: correlationService.generateSessionId(),
          timestamp: Date.now(),
          userId: session.user.id,
          requestId: correlationService.generateRequestId(),
        });
      }
      
      return session;
    },

    async signIn({ user, account, profile }) {
      try {
        const correlationId = correlationService.getCurrentContext()?.correlationId || 
                            correlationService.generateCorrelationId();
        
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
        const correlationId = correlationService.getCurrentContext()?.correlationId ||
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
      const correlationId = correlationService.getCurrentContext()?.correlationId ||
                          correlationService.generateCorrelationId();
      
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
      const correlationId = correlationService.getCurrentContext()?.correlationId ||
                          correlationService.generateCorrelationId();
      
      console.log('[Auth Event] User signed out', {
        correlationId,
        userId: session?.user?.id || token?.id,
        timestamp: new Date().toISOString(),
      });
    },

    async session({ session, token }) {
      // Update correlation context on session check
      if (session.user?.id) {
        correlationService.updateContext({ 
          userId: session.user.id,
          timestamp: Date.now(),
        });
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