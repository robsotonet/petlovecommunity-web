import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  name: string;
  password: string;
  role: 'user' | 'volunteer' | 'admin';
  adoptionHistory: string[];
  volunteeredEvents: string[];
  createdAt: string;
  lastLogin: string;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'volunteer' | 'admin';
}

class UserService {
  private static instance: UserService;
  private users: User[] = [
    {
      id: '1',
      email: 'demo@petlovecommunity.com',
      name: 'Demo User',
      password: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBSh8X8l8D8D8D', // 'password'
      role: 'user',
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
      role: 'volunteer',
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
      role: 'admin',
      adoptionHistory: [],
      volunteeredEvents: [],
      createdAt: new Date('2024-01-01').toISOString(),
      lastLogin: new Date().toISOString(),
    }
  ];

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  getAllUsers(): User[] {
    return [...this.users]; // Return copy to prevent direct mutation
  }

  findUserByEmail(email: string): User | undefined {
    return this.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  findUserById(id: string): User | undefined {
    return this.users.find(u => u.id === id);
  }

  async createUser(userData: CreateUserData): Promise<User> {
    // Check if user already exists
    if (this.findUserByEmail(userData.email)) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create new user
    const newUser: User = {
      id: (this.users.length + 1).toString(),
      email: userData.email.toLowerCase().trim(),
      name: userData.name.trim(),
      password: hashedPassword,
      role: userData.role,
      adoptionHistory: [],
      volunteeredEvents: [],
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    // Add to users array
    this.users.push(newUser);

    return newUser;
  }

  async validateCredentials(email: string, password: string): Promise<User | null> {
    const user = this.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    // Update last login time
    user.lastLogin = new Date().toISOString();

    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const userIndex = this.users.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return null;
    }

    // Prevent updating certain fields
    const { id: _, password: __, ...allowedUpdates } = updates;

    this.users[userIndex] = {
      ...this.users[userIndex],
      ...allowedUpdates,
    };

    return this.users[userIndex];
  }

  getUserCount(): number {
    return this.users.length;
  }
}

export const userService = UserService.getInstance();