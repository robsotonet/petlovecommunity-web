import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: 'user' | 'volunteer' | 'admin';
      adoptionHistory: string[];
      volunteeredEvents: string[];
      correlationId: string;
      createdAt: string;
      lastLogin: string;
    };
  }

  interface User {
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
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'user' | 'volunteer' | 'admin';
    adoptionHistory: string[];
    volunteeredEvents: string[];
    correlationId: string;
    createdAt: string;
    lastLogin: string;
  }
}