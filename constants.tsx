import { Employee, ShiftType } from "./types";
import { User, Shield, Zap, Database, Activity } from 'lucide-react';
import React from 'react';

export const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Ana Silva', role: 'Engenheira Sênior', avatarUrl: 'https://picsum.photos/100/100?random=1' },
  { id: '2', name: 'Carlos Mendes', role: 'Técnico Líder', avatarUrl: 'https://picsum.photos/100/100?random=2' },
  { id: '3', name: 'Marina Costa', role: 'Analista de Dados', avatarUrl: 'https://picsum.photos/100/100?random=3' },
  { id: '4', name: 'João Santos', role: 'Operador T1', avatarUrl: 'https://picsum.photos/100/100?random=4' },
  { id: '5', name: 'Beatriz Lima', role: 'Planejamento', avatarUrl: 'https://picsum.photos/100/100?random=5' },
];

export const SHIFT_COLORS: Record<ShiftType, string> = {
  [ShiftType.T1]: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]', // VERDE
  [ShiftType.Q1]: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]', // AZUL
  [ShiftType.PLAN]: 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]', // LARANJA
  [ShiftType.FINAL]: 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.9)] font-bold', // BRANCO
  [ShiftType.OFF]: 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_5px_rgba(239,68,68,0.1)]', // VERMELHO
};

export const MENU_ITEMS = [
  { label: 'Dashboard', icon: <Activity className="w-5 h-5" /> },
  { label: 'Escalas', icon: <User className="w-5 h-5" /> },
  { label: 'Relatórios', icon: <Database className="w-5 h-5" /> },
  { label: 'Segurança', icon: <Shield className="w-5 h-5" /> },
  { label: 'Sistema', icon: <Zap className="w-5 h-5" /> },
];

// Feriados Fixos (Nacionais + Porto Velho/RO)
// Formato: MM-DD
export const PORTO_VELHO_HOLIDAYS = [
  '01-01', // Confraternização Universal
  '01-04', // Instalação do Estado de Rondônia
  '01-24', // Instalação do Município de Porto Velho
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência do Brasil
  '10-02', // Criação do Município de Porto Velho
  '10-12', // Nossa Sra. Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '12-25', // Natal
];

// Turnos de 4 horas
export const SHIFT_SLOTS = {
  MORNING: { id: 'M', label: 'Manhã', start: '07:30', end: '11:30' },
  AFTERNOON: { id: 'T', label: 'Tarde', start: '13:30', end: '17:30' },
  NIGHT: { id: 'N', label: 'Noite', start: '18:30', end: '22:30' }
};