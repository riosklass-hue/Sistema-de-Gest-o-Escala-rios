import { User } from "../types";

// Mock Database of Users
// Changed to 'let' to allow runtime updates
let MOCK_USERS: Record<string, User & { password: string }> = {
  'admin': {
    username: 'admin',
    password: '123', 
    name: 'Administrador Nexus',
    role: 'ADMIN'
  },
  'professor': {
    username: 'professor',
    password: '123',
    name: 'Ana Silva',
    role: 'TEACHER',
    employeeId: '1' // Matches ID in constants.tsx for Ana Silva
  },
  'carlos': {
    username: 'carlos',
    password: '123',
    name: 'Carlos Mendes',
    role: 'TEACHER',
    employeeId: '2'
  }
};

export const login = async (username: string, password: string): Promise<User | null> => {
  // Simulate network delay for sci-fi effect
  await new Promise(resolve => setTimeout(resolve, 800));

  const user = MOCK_USERS[username];
  
  if (user && user.password === password) {
    // Return user without password
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
  
  return null;
};

export const registerUser = async (user: User, password: string): Promise<boolean> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  if (MOCK_USERS[user.username]) {
    return false; // User already exists
  }

  MOCK_USERS[user.username] = {
    ...user,
    password
  };

  return true;
};