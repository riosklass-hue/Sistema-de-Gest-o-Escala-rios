

export enum ShiftType {
  T1 = 'T1',       
  Q1 = 'Q1',       
  PLAN = 'PLAN',   
  FINAL = 'FINAL', 
  OFF = 'OFF'      
}

export type UserRole = 'ADMIN' | 'TEACHER' | 'COORDINATOR' | 'SUPERVISOR';

export interface User {
  username: string;
  name: string;
  role: UserRole;
  employeeId?: string; 
}

export interface FinancialRecord {
  month: number; // 0-11
  year: number;
  gross: number;
  ir: number;
  inss: number;
  net: number;
  unimed?: number;
  source: 'MANUAL' | 'AI_IMPORT';
  timestamp: string;
}

export interface Employee {
  id: string;
  name: string;
  registration?: string; 
  birthDate?: string;    
  contractExpiration?: string; 
  username?: string; 
  email?: string;
  phone?: string;
  role: string; 
  userRole?: UserRole; 
  avatarUrl: string;
  active: boolean; 
  skills?: string[]; 
  qualifications?: string; 
}

export interface ClassGroup {
  id: string;
  name: string;
  type: 'Técnico' | 'Qualificação';
  courseGroupName?: string; 
  startDate: string;
  endDate: string;
}

export interface CourseGroup {
  id: string;
  name: string;
  courses: string[];
}

export interface SystemLog {
  id: string;
  user: string;
  description: string;
  module: string;
  action: string;
  ip: string;
  entryTime: string;
  exitTime?: string;
  active: boolean;
}

export interface ModulePermission {
  visualize: boolean;
  list: boolean;
  add: boolean;
  edit: boolean;
  reports: boolean;
}

export interface GroupPermission {
  role: UserRole;
  modules: {
    dashboard: ModulePermission;
    cadastro: ModulePermission;
    escalas: ModulePermission;
    relatorios: ModulePermission;
    seguranca: ModulePermission;
  }
}

// Fix: Added missing GitHubConfig interface used in SystemPanel.tsx
export interface GitHubConfig {
  token: string;
  repo: string;
  path: string;
  branch: string;
}

export interface Shift {
  date: string; 
  type: ShiftType;
  courseName?: string; 
  slotDetails?: Record<string, { 
    courseName?: string;
    turmaName?: string;
    schoolName?: string; 
    startDateStr?: string;
    endDateStr?: string;
    totalHours?: number;
    isCancelled?: boolean;
  }>;
  startTime?: string;
  endTime?: string;
  totalCourseHours?: number;
  activeSlots?: ('MORNING' | 'AFTERNOON' | 'NIGHT')[]; 
  notes?: string;
}

export interface Schedule {
  employeeId: string;
  shifts: Record<string, Shift>; 
}

export interface MonthlyStats {
  totalHours: number;
  shiftDistribution: { name: string; value: number; color: string }[];
  efficiency: number;
}
