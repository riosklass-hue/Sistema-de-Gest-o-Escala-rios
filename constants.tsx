
import { Employee, ShiftType } from "./types";
import { User, Shield, Zap, Database, Activity } from 'lucide-react';
import React from 'react';

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Ana Silva', registration: '2025001', birthDate: '1990-05-15', contractExpiration: '2026-12-31', username: 'ana.silva', role: 'Engenheira Sênior', userRole: 'TEACHER', avatarUrl: 'https://picsum.photos/100/100?random=1', active: true, phone: '(69) 99200-1122', email: 'ana.silva@rios.com.br' },
  { id: '2', name: 'Carlos Mendes', registration: '2025002', birthDate: '1985-11-20', contractExpiration: '2026-06-30', username: 'carlos.mendes', role: 'Técnico Líder', userRole: 'COORDINATOR', avatarUrl: 'https://picsum.photos/100/100?random=2', active: true, phone: '(69) 99200-3344', email: 'carlos.mendes@rios.com.br' },
  { id: '3', name: 'Marina Costa', registration: '2025003', birthDate: '1992-03-10', contractExpiration: '2027-01-15', username: 'marina.costa', role: 'Analista de Dados', userRole: 'SUPERVISOR', avatarUrl: 'https://picsum.photos/100/100?random=3', active: true, phone: '(69) 99200-5566', email: 'marina.costa@rios.com.br' },
  { id: '4', name: 'João Santos', registration: '2025004', birthDate: '1988-07-25', contractExpiration: '2025-12-20', username: 'joao.santos', role: 'Operador T1', userRole: 'TEACHER', avatarUrl: 'https://picsum.photos/100/100?random=4', active: true, phone: '(69) 99200-7788', email: 'joao.santos@rios.com.br' },
  { id: '5', name: 'Beatriz Lima', registration: '2025005', birthDate: '1995-12-30', contractExpiration: '2026-10-10', username: 'beatriz.lima', role: 'Planejamento', userRole: 'ADMIN', avatarUrl: 'https://picsum.photos/100/100?random=5', active: true, phone: '(69) 99200-9900', email: 'beatriz.lima@rios.com.br' },
];

// DADOS CONSOLIDADOS DA PLANILHA "2025 CR"
export const ANNUAL_CR_2025 = [
  { month: 0, label: 'JAN', g40: 4864.00, g20: 1024.00, totalReal: 4279.91, totalDeductions: 907.95, unimed: 700.14 },
  { month: 1, label: 'FEV', g40: 5120.00, g20: 2560.00, totalReal: 5588.09, totalDeductions: 1503.47, unimed: 883.78 },
  { month: 2, label: 'MAR', g40: 3328.00, g20: 2304.00, totalReal: 4381.81, totalDeductions: 840.97, unimed: 634.37 },
  { month: 3, label: 'ABR', g40: 3712.00, g20: 1920.00, totalReal: 5134.30, totalDeductions: 497.70, unimed: 733.80 },
  { month: 4, label: 'MAI', g40: 5120.00, g20: 1920.00, totalReal: 5125.14, totalDeductions: 1316.91, unimed: 828.35 },
  { month: 5, label: 'JUN', g40: 5120.00, g20: 2432.00, totalReal: 5637.14, totalDeductions: 1316.91, unimed: 828.35 },
  { month: 6, label: 'JUL', g40: 4608.00, g20: 2304.00, totalReal: 5441.63, totalDeductions: 1193.83, unimed: 553.08 },
  { month: 7, label: 'AGO', g40: 2432.00, g20: 2432.00, totalReal: 2949.14, totalDeductions: 1311.28, unimed: 4575.37 },
  { month: 8, label: 'SET', g40: 2816.00, g20: 640.00, totalReal: 1157.14, totalDeductions: 1062.98, unimed: 4575.37 },
  { month: 9, label: 'OUT', g40: 768.00, g20: 1280.00, totalReal: 1797.14, totalDeductions: 1311.28, unimed: 4575.37 },
  { month: 10, label: 'NOV', g40: 2304.00, g20: 2560.00, totalReal: 3077.14, totalDeductions: 1311.28, unimed: 4575.37 },
  { month: 11, label: 'DEZ', g40: 3840.00, g20: 1664.00, totalReal: 2181.14, totalDeductions: 1311.28, unimed: 2667.48 },
];

export const SHIFT_COLORS: Record<ShiftType, string> = {
  [ShiftType.T1]: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
  [ShiftType.Q1]: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
  [ShiftType.PLAN]: 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
  [ShiftType.FINAL]: 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.9)] font-bold',
  [ShiftType.OFF]: 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_5px_rgba(239,68,68,0.1)]',
};

export const MENU_ITEMS = [
  { label: 'Dashboard', icon: <Activity className="w-5 h-5" /> },
  { label: 'Escalas', icon: <User className="w-5 h-5" /> },
  { label: 'Relatórios', icon: <Database className="w-5 h-5" /> },
  { label: 'Segurança', icon: <Shield className="w-5 h-5" /> },
  { label: 'Sistema', icon: <Zap className="w-5 h-5" /> },
];

export const PORTO_VELHO_HOLIDAYS = [
  '01-01', '01-04', '01-24', '04-21', '05-01', '09-07', '10-02', '10-12', '11-02', '11-15', '12-25',
];

export const SHIFT_SLOTS = {
  MORNING: { id: 'M', label: 'Manhã', start: '07:30', end: '11:30' },
  AFTERNOON: { id: 'T', label: 'Tarde', start: '13:30', end: '17:30' },
  NIGHT: { id: 'N', label: 'Noite', start: '18:30', end: '22:30' }
};
