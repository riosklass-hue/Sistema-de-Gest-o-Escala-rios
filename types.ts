
export enum ShiftType {
  T1 = 'T1',       // TÉCNICO (Technician) - VERDE
  Q1 = 'Q1',       // TÉCNICO Q1 - AZUL
  PLAN = 'PLAN',   // PLANEJAMENTO (Planning) - LARANJA
  FINAL = 'FINAL', // FINAL DE SEMANA (Weekend) - BRANCO
  OFF = 'OFF'      // FOLGA (Day off) - VERMELHO
}

export type UserRole = 'ADMIN' | 'TEACHER' | 'COORDINATOR' | 'SUPERVISOR';

export interface User {
  username: string;
  name: string;
  role: UserRole;
  employeeId?: string; // Linked to the employee ID for teachers
}

export interface Employee {
  id: string;
  name: string;
  username?: string; // Linked system login
  email?: string;
  phone?: string;
  role: string; // Job Title
  userRole?: UserRole; // Access Group (Permissões)
  avatarUrl: string;
  active: boolean; 
  skills?: string[]; // Cursos que domina
  qualifications?: string; // Titulações e formações
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

export interface Shift {
  date: string; // YYYY-MM-DD
  type: ShiftType;
  courseName?: string; // Mantido para compatibilidade (Resumo)
  slotDetails?: Record<string, { 
    courseName?: string;
    schoolName?: string; // Unidade de ensino
    startDateStr?: string;
    endDateStr?: string;
    totalHours?: number;
  }>; // Detalhes específicos por slot (MORNING, etc)
  startTime?: string;
  endTime?: string;
  totalCourseHours?: number;
  activeSlots?: ('MORNING' | 'AFTERNOON' | 'NIGHT')[]; 
  notes?: string;
}

export interface Schedule {
  employeeId: string;
  shifts: Record<string, Shift>; // Key is date YYYY-MM-DD
}

export interface MonthlyStats {
  totalHours: number;
  shiftDistribution: { name: string; value: number; color: string }[];
  efficiency: number;
}
