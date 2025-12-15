
export enum ShiftType {
  T1 = 'T1',       // TÉCNICO (Technician) - VERDE
  Q1 = 'Q1',       // TÉCNICO Q1 - AZUL
  PLAN = 'PLAN',   // PLANEJAMENTO (Planning) - LARANJA
  FINAL = 'FINAL', // FINAL DE SEMANA (Weekend) - BRANCO
  OFF = 'OFF'      // FOLGA (Day off) - VERMELHO
}

export type UserRole = 'ADMIN' | 'TEACHER';

export interface User {
  username: string;
  name: string;
  role: UserRole;
  employeeId?: string; // Linked to the employee ID for teachers
}

export interface Employee {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  avatarUrl: string;
}

export interface Shift {
  date: string; // YYYY-MM-DD
  type: ShiftType;
  courseName?: string; // Mantido para compatibilidade (Resumo)
  slotDetails?: Record<string, { courseName?: string }>; // Detalhes específicos por slot (MORNING, etc)
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
