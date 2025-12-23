
import React, { useMemo, useState, useCallback } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell } from 'recharts';
import NeonCard from './NeonCard';
import { UserCheck, Activity, Clock, Wallet, TrendingUp, DollarSign, Calendar, Info, CheckCircle, ChevronLeft, ChevronRight, Calculator, MinusCircle, ShieldCheck, Trash2, Wand2, Loader2, Zap, Hourglass, Coffee, BarChart3, Target, Briefcase, Settings, Landmark, ArrowUpRight, ArrowDownRight, PieChart as PieIcon } from 'lucide-react';
import { Employee, Schedule, ShiftType, Shift } from '../types';
import { ANNUAL_CR_2025, PORTO_VELHO_HOLIDAYS } from '../constants';

interface StatsPanelProps {
  isAdmin: boolean;
  employees: Employee[];
  schedules: Schedule[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  hourlyRate: number;
  deductions: any;
  onClearSchedule?: () => void;
  onGenerateAI?: () => Promise<void>;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ 
    isAdmin,
    employees, 
    schedules, 
    selectedDate, 
    onDateChange, 
    hourlyRate, 
    deductions,
    onClearSchedule,
    onGenerateAI
}) => {
  const viewedYear = selectedDate.getFullYear();
  const viewedMonth = selectedDate.getMonth();
  const [isGenerating, setIsGenerating] = useState(false);

  const isBusinessDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return !PORTO_VELHO_HOLIDAYS.includes(`${mm}-${dd}`);
  };

  const checkActiveAssignment = useCallback((empId: string, dateStr: string, slotKey: 'MORNING' | 'AFTERNOON' | 'NIGHT', currentSchedulesList: Schedule[]) => {
    const empSchedule = currentSchedulesList.find(s => s.employeeId === empId);
    if (!empSchedule) return null;

    const directShift = empSchedule.shifts[dateStr];
    if (directShift && directShift.activeSlots?.includes(slotKey)) {
        return { type: directShift.type };
    }

    for (const shift of Object.values(empSchedule.shifts) as Shift[]) {
        const detail = shift.slotDetails?.[slotKey];
        if (detail && detail.startDateStr && detail.endDateStr) {
            if (dateStr >= detail.startDateStr && dateStr <= detail.endDateStr) {
                return { type: shift.type };
            }
        }
    }
    return null;
  }, []);

  const getStatsForMonth = (month: number, year: number) => {
    let h40 = 0;
    let h20 = 0;
    let producedHours = 0;
    let hT1 = 0;
    let hQ1 = 0;
    let hPLAN = 0;
    let hasShiftsInMonth = false;

    const targetEmployees = isAdmin ? employees : employees.filter(e => schedules.some(s => s.employeeId === e.id));
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    targetEmployees.forEach(emp => {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        
        const m = checkActiveAssignment(emp.id, dateStr, 'MORNING', schedules);
        const t = checkActiveAssignment(emp.id, dateStr, 'AFTERNOON', schedules);
        const n = checkActiveAssignment(emp.id, dateStr, 'NIGHT', schedules);

        if (m || t || n) hasShiftsInMonth = true;

        if (!isWeekend) {
          if (m && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(m.type)) {
             h40 += 4; producedHours += 4;
             if (m.type === ShiftType.T1) hT1 += 4; else if (m.type === ShiftType.Q1) hQ1 += 4; else hPLAN += 4;
          }
          if (t && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(t.type)) {
             h40 += 4; producedHours += 4;
             if (t.type === ShiftType.T1) hT1 += 4; else if (t.type === ShiftType.Q1) hQ1 += 4; else hPLAN += 4;
          }
          if (n && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(n.type)) {
             h20 += 4; producedHours += 4;
             if (n.type === ShiftType.T1) hT1 += 4; else if (n.type === ShiftType.Q1) hQ1 += 4; else hPLAN += 4;
          }
        }
      }
    });

    const g40 = h40 * hourlyRate;
    const g20 = h20 * hourlyRate;
    const totalGross = g40 + g20;

    let businessDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        if (isBusinessDay(new Date(year, month, d))) businessDays++;
    }
    
    const totalPotentialHours = businessDays * 12 * (isAdmin ? employees.length : 1);
    const idleHours = Math.max(0, totalPotentialHours - producedHours);

    const ir = isAdmin && totalGross > 0 ? (deductions['40H'].ir + deductions['20H'].ir) : 0;
    const inss = isAdmin && totalGross > 0 ? (deductions['40H'].inss + deductions['20H'].inss) : 0;
    const taxes = ir + inss;
    const unimed = isAdmin && totalGross > 0 ? (deductions['40H'].unimed + deductions['20H'].unimed) : 0;

    return { 
      totalGross, g40, g20, h40, h20, 
      producedHours, hT1, hQ1, hPLAN,
      idleHours, totalPotentialHours,
      taxes, ir, inss, unimed, hasShifts: hasShiftsInMonth,
      totalReal: Math.max(0, totalGross - taxes - unimed)
    };
  };

  const integratedData = useMemo(() => {
    return ANNUAL_CR_2025.map(historyItem => {
      const live = getStatsForMonth(historyItem.month, viewedYear);
      if (live.hasShifts) {
        return {
          ...historyItem,
          g40: live.g40, g20: live.g20, totalReal: live.totalReal,
          totalDeductions: live.taxes, unimed: live.unimed,
          source: 'REAL' as const
        };
      }
      if (!isAdmin) return { ...historyItem, g40: 0, g20: 0, totalReal: 0, totalDeductions: 0, unimed: 0, source: 'INDIVIDUAL' as const };
      return { ...historyItem, source: 'PREVISÃO' as const };
    });
  }, [schedules, viewedYear, hourlyRate, deductions, isAdmin, employees]);

  const monthPerformance = useMemo(() => getStatsForMonth(viewedMonth, viewedYear), [schedules, viewedMonth, viewedYear, hourlyRate, deductions, employees, isAdmin]);

  const totalAnnualReal = useMemo(() => integratedData.reduce((acc, curr) => acc + curr.totalReal, 0), [integratedData]);
  const totalAnnualTaxes = useMemo(() => integratedData.reduce((acc, curr) => acc + curr.totalDeductions, 0), [integratedData]);
  const totalAnnualUnimed = useMemo(() => integratedData.reduce((acc, curr) => acc + curr.unimed, 0), [integratedData]);
  
  const formatCurrency = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-sci-panel/40 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Activity className="text-cyan-400 animate-pulse w-7 h-7" />
              </div>
              <div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white uppercase font-mono tracking-tight">{isAdmin ? 'Análise Consolidada' : 'Meu Painel Financeiro'}</h2>
                    <div className="flex items-center bg-slate-950 border border-white/10 rounded-xl p-1 shadow-inner">
                        <button onClick={() => onDateChange(new Date(selectedDate.setFullYear(viewedYear - 1)))} className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded transition-colors"><ChevronLeft size={20} /></button>
                        <span className="px-5 text-lg font-mono font-bold text-cyan-400">{viewedYear}</span>
                        <button onClick={() => onDateChange(new Date(selectedDate.setFullYear(viewedYear + 1)))} className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded transition-colors"><ChevronRight size={20} /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded border border-emerald-400/20 uppercase font-bold tracking-wider">
                          <CheckCircle className="w-4 h-4" /> {isAdmin ? 'Inteligência de Rede' : 'Extrato de Conta'}
                      </span>
                      <span className="text-xs font-mono text-slate-600">|</span>
                      <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Base: {formatCurrency(hourlyRate)}/h</span>
                  </div>
              </div>
          </div>
          <div className="flex items-center gap-6">
              <div className="hidden xl:block text-right">
                <p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Saldo Líquido Anual</p>
                <p className="text-3xl font-bold text-white font-mono leading-none">{formatCurrency(totalAnnualReal)}</p>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <NeonCard glowColor="cyan" className="bg-cyan-500/5">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-cyan-500/10 rounded-2xl text-cyan-400"><DollarSign size={32} /></div>
                  <div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Receita Real {viewedYear}</p><p className="text-2xl font-bold text-white font-mono">{formatCurrency(totalAnnualReal)}</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="purple" className="bg-purple-500/5">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400"><Calculator size={32} /></div>
                  <div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Faturamento Bruto</p><p className="text-2xl font-bold text-white font-mono">{formatCurrency(integratedData.reduce((a,c) => a + c.g40 + c.g20, 0))}</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="orange" className="bg-red-500/5 border-red-500/10">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-red-500/10 rounded-2xl text-red-400"><MinusCircle size={32} /></div>
                  <div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Deduções Fiscais</p><p className="text-2xl font-bold text-red-400 font-mono">{formatCurrency(totalAnnualTaxes)}</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="none" className="bg-blue-500/5 border-blue-500/10">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400"><ShieldCheck size={32} /></div>
                  <div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Plano Unimed</p><p className="text-2xl font-bold text-blue-400 font-mono">{formatCurrency(totalAnnualUnimed)}</p></div>
              </div>
          </NeonCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-sci-panel/60 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-2xl relative overflow-hidden h-full group">
                <div className="relative z-10 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20"><Landmark className="w-6 h-6" /></div>
                        <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">Fluxo Financeiro Mensal ({selectedDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase()})</h3>
                        </div>
                    </div>
                    <div className="space-y-5">
                        <div className="flex items-center justify-between p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl">
                            <div className="flex items-center gap-5">
                                <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><ArrowUpRight size={24}/></div>
                                <div>
                                    <p className="text-xs font-mono text-slate-500 uppercase font-black tracking-widest">Ganhos Brutos do Período</p>
                                    <p className="text-lg font-black text-white">{monthPerformance.producedHours} Horas Faturadas</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-emerald-400 font-mono">+{formatCurrency(monthPerformance.totalGross)}</p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-950 rounded-2xl border-2 border-cyan-500/30 flex items-center justify-between shadow-neon-cyan/10">
                            <div>
                                <p className="text-sm font-black text-cyan-400 uppercase tracking-widest">Net Mensal Estimado</p>
                            </div>
                            <p className="text-4xl font-black text-white font-mono tracking-tighter">{formatCurrency(monthPerformance.totalReal)}</p>
                        </div>
                    </div>
                </div>
            </div>
          </div>
          <div className="lg:col-span-1">
              <div className="bg-sci-panel/60 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-2xl h-full flex flex-col group">
                  <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20"><PieIcon size={24} /></div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">Composição</h3>
                  </div>
                  <div className="flex-1 h-64 min-h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={[
                                      { name: 'Líquido', value: monthPerformance.totalReal, color: '#00f3ff' },
                                      { name: 'Impostos', value: monthPerformance.taxes, color: '#ef4444' },
                                      { name: 'Unimed', value: monthPerformance.unimed, color: '#3b82f6' }
                                  ]}
                                  innerRadius={70}
                                  outerRadius={95}
                                  paddingAngle={5}
                                  dataKey="value"
                              >
                                  <Cell fill="#00f3ff" />
                                  <Cell fill="#ef4444" />
                                  <Cell fill="#3b82f6" />
                              </Pie>
                              <Tooltip 
                                  contentStyle={{ backgroundColor: '#0b1221', borderColor: '#1e293b', borderRadius: '12px' }}
                                  formatter={(value: number) => [formatCurrency(value), '']}
                              />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>
          </div>
      </div>

      <div className="bg-sci-panel/60 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-2xl relative overflow-hidden group">
          <div className="relative z-10 space-y-10">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20"><Hourglass className="w-6 h-6" /></div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">Equilíbrio Operacional do Mês</h3>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                  <div className="space-y-6">
                      <div className="flex justify-between items-end">
                          <div>
                              <p className="text-xs font-mono text-slate-500 uppercase font-black tracking-widest mb-1">Horas Produzidas (Total)</p>
                              <p className="text-5xl font-black text-emerald-400 font-mono tracking-tighter">{monthPerformance.producedHours} <small className="text-sm opacity-60">H</small></p>
                          </div>
                      </div>
                      <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-1 shadow-inner relative">
                          <div className="h-full bg-gradient-to-r from-emerald-600 to-cyan-400 rounded-full shadow-neon-cyan transition-all duration-1000" style={{ width: `${(monthPerformance.producedHours / (monthPerformance.totalPotentialHours || 1)) * 100}%` }}></div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 pt-4">
                          <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl">
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">T1</span>
                              <p className="text-xl font-black text-white font-mono">{monthPerformance.hT1}h</p>
                          </div>
                          <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-xl">
                              <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Q1</span>
                              <p className="text-xl font-black text-white font-mono">{monthPerformance.hQ1}h</p>
                          </div>
                          <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl">
                              <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">PLAN</span>
                              <p className="text-xl font-black text-white font-mono">{monthPerformance.hPLAN}h</p>
                          </div>
                      </div>
                  </div>
                  <div className="space-y-6">
                      <div className="flex justify-between items-end">
                          <div>
                              <p className="text-xs font-mono text-slate-500 uppercase font-black tracking-widest mb-1">Horas Ociosas</p>
                              <p className="text-5xl font-black text-red-500 font-mono tracking-tighter">{monthPerformance.idleHours} <small className="text-sm opacity-60">H</small></p>
                          </div>
                      </div>
                      <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-1 shadow-inner relative">
                          <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full shadow-neon-orange transition-all duration-1000" style={{ width: `${(monthPerformance.idleHours / (monthPerformance.totalPotentialHours || 1)) * 100}%` }}></div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default StatsPanel;
