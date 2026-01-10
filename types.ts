
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

export interface GitHubConfig {
  token: string;
  repo: string; // owner/repo
  path: string; // e.g., data/db.json
  branch: string;
}

export interface Employee {
  id: string;
  name: string;
  registration?: string; // Número de Matrícula
  birthDate?: string;    // Data de Nascimento
  contractExpiration?: string; // Vencimento do Contrato
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

export interface ClassGroup {
  id: string;
  name: string;
  type: 'Técnico' | 'Qualificação';
  courseGroupName?: string; // Vínculo com o Grupo de Curso
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

export interface Shift {
  date: string; // YYYY-MM-DD
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
  shifts: Record<string, Shift>; // Key is date YYYY-MM-DD
}

export interface MonthlyStats {
  totalHours: number;
  shiftDistribution: { name: string; value: number; color: string }[];
  efficiency: number;
}
