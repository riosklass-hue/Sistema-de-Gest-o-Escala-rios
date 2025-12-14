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
  [ShiftType.T1]: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.2)]',
  [ShiftType.PLAN]: 'bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.2)]',
  [ShiftType.FINAL]: 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.2)]',
  [ShiftType.OFF]: 'bg-slate-800/30 text-slate-500 border-slate-700/30',
};

export const MENU_ITEMS = [
  { label: 'Dashboard', icon: <Activity className="w-5 h-5" /> },
  { label: 'Escalas', icon: <User className="w-5 h-5" /> },
  { label: 'Relatórios', icon: <Database className="w-5 h-5" /> },
  { label: 'Segurança', icon: <Shield className="w-5 h-5" /> },
  { label: 'Sistema', icon: <Zap className="w-5 h-5" /> },
];