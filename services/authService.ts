
import { User, UserRole } from "../types";

// Mock Database of Users - Sincronizado com INITIAL_EMPLOYEES
let MOCK_USERS: Record<string, User & { password: string, email?: string }> = {
  'admin': {
    username: 'admin',
    password: '123', 
    name: 'Administrador Rios',
    role: 'ADMIN',
    email: 'admin@rios.com.br'
  },
  'ana.silva': {
    username: 'ana.silva',
    password: '123',
    name: 'Ana Silva',
    role: 'TEACHER',
    employeeId: '1',
    email: 'ana.silva@rios.com.br'
  },
  'carlos.mendes': {
    username: 'carlos.mendes',
    password: '123',
    name: 'Carlos Mendes',
    role: 'COORDINATOR',
    employeeId: '2',
    email: 'carlos.mendes@rios.com.br'
  },
  'marina.costa': {
    username: 'marina.costa',
    password: '123',
    name: 'Marina Costa',
    role: 'SUPERVISOR',
    employeeId: '3',
    email: 'marina.costa@rios.com.br'
  },
  'joao.santos': {
    username: 'joao.santos',
    password: '123',
    name: 'João Santos',
    role: 'TEACHER',
    employeeId: '4',
    email: 'joao.santos@rios.com.br'
  },
  'beatriz.lima': {
    username: 'beatriz.lima',
    password: '123',
    name: 'Beatriz Lima',
    role: 'ADMIN',
    employeeId: '5',
    email: 'beatriz.lima@rios.com.br'
  }
};

export const login = async (username: string, password: string): Promise<User | null> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const user = MOCK_USERS[username];
  if (user && user.password === password) {
    const { password: _, ...safeUser } = user;
    return safeUser;
  }
  return null;
};

export const registerUser = async (user: User, password: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  if (MOCK_USERS[user.username]) return false;
  MOCK_USERS[user.username] = { ...user, password };
  return true;
};

/**
 * Sincroniza os dados do Colaborador com a conta de acesso do SGE
 */
export const syncUserRecord = async (
  username: string, 
  data: { name: string; role: UserRole; password?: string }
): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  if (!MOCK_USERS[username]) {
    // Se o usuário não existe no auth mas existe no cadastro, criamos com senha padrão
    MOCK_USERS[username] = {
      username,
      name: data.name,
      role: data.role,
      password: data.password || '123'
    };
    return true;
  }

  // Atualiza perfil
  MOCK_USERS[username].name = data.name;
  MOCK_USERS[username].role = data.role;
  
  // Atualiza senha se fornecida
  if (data.password) {
    MOCK_USERS[username].password = data.password;
  }

  return true;
};

export const updateUserPassword = async (username: string, newPassword: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  if (!MOCK_USERS[username]) return false;
  MOCK_USERS[username].password = newPassword;
  return true;
};

export const recoverPassword = async (email: string): Promise<boolean> => {
  await new Promise(resolve => setTimeout(resolve, 1200));
  return email.includes('@');
};
