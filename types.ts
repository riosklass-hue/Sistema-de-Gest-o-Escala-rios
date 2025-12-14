export enum ShiftType {
  T1 = 'T1',       // TÉCNICO (Technician)
  PLAN = 'PLAN',   // PLANEJAMENTO (Planning)
  FINAL = 'FINAL', // FINAL DE SEMANA (Weekend)
  OFF = 'OFF'      // FOLGA (Day off)
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
  role: string;
  avatarUrl: string;
}

export interface Shift {
  date: string; // YYYY-MM-DD
  type: ShiftType;
  courseName?: string; // Nome do curso ou atividade
  startTime?: string;  // Ex: "08:00" - Mantido para compatibilidade, mas activeSlots tem prioridade visual
  endTime?: string;    // Ex: "17:00"
  totalCourseHours?: number; // Carga horária total do curso
  activeSlots?: ('MORNING' | 'AFTERNOON' | 'NIGHT')[]; // Lista de turnos ativos no dia
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