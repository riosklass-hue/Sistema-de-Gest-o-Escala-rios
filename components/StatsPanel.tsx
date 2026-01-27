
import React, { useMemo, useState, useCallback } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import NeonCard from './NeonCard';
import { 
  UserCheck, Activity, Clock, Wallet, TrendingUp, DollarSign, Calendar, Info, 
  CheckCircle, ChevronLeft, ChevronRight, Calculator, MinusCircle, ShieldCheck, 
  Trash2, Wand2, Loader2, Zap, Hourglass, Coffee, BarChart3, Target, 
  Briefcase, Settings, Landmark, ArrowUpRight, ArrowDownRight, 
  PieChart as PieIcon, BookOpen, Ban, GraduationCap, Cpu, Users, UserX, AlertTriangle
} from 'lucide-react';
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
    deductions
}) => {
  const viewedYear = selectedDate.getFullYear();
  const viewedMonth = selectedDate.getMonth();
  const [viewMode, setViewMode] = useState<'MONTH' | 'YEAR'>('MONTH');

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
        return { 
          type: directShift.type, 
          isCancelled: directShift.slotDetails?.[slotKey]?.isCancelled || false 
        };
    }

    for (const shift of Object.values(empSchedule.shifts) as Shift[]) {
        const detail = shift.slotDetails?.[slotKey];
        if (detail && detail.startDateStr && detail.endDateStr) {
            if (dateStr >= detail.startDateStr && dateStr <= detail.endDateStr) {
                return { 
                  type: shift.type, 
                  isCancelled: detail.isCancelled || false 
                };
            }
        }
    }
    return null;
  }, []);

  const performance = useMemo(() => {
    let h40 = 0, h20 = 0, hT1 = 0, hQ1 = 0, hPLAN = 0, hCancelled = 0;
    let producedHours = 0;
    let totalGross = 0;
    const idleBreakdown: { id: string; name: string; idle: number; worked: number; potential: number; role: string; avatar: string }[] = [];

    const startM = viewMode === 'YEAR' ? 0 : viewedMonth;
    const endM = viewMode === 'YEAR' ? 11 : viewedMonth;

    employees.forEach(emp => {
        let empWorked = 0;
        let empPotential = 0;

        for (let m = startM; m <= endM; m++) {
            const daysInMonth = new Date(viewedYear, m + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                const dateObj = new Date(viewedYear, m, d);
                if (!isBusinessDay(dateObj)) continue;
                
                empPotential += 12; // 3 slots of 4h
                const dateStr = `${viewedYear}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

                (['MORNING', 'AFTERNOON', 'NIGHT'] as const).forEach(slot => {
                    const asgn = checkActiveAssignment(emp.id, dateStr, slot, schedules);
                    if (asgn && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(asgn.type)) {
                        if (asgn.isCancelled) {
                            if (emp.id === employees[0].id) hCancelled += 4; 
                        } else {
                            empWorked += 4;
                            if (slot === 'NIGHT') h20 += 4; else h40 += 4;
                            producedHours += 4;
                            if (asgn.type === ShiftType.T1) hT1 += 4; 
                            else if (asgn.type === ShiftType.Q1) hQ1 += 4; 
                            else hPLAN += 4;
                        }
                    }
                });
            }
        }
        
        idleBreakdown.push({
            id: emp.id,
            name: emp.name,
            role: emp.role,
            avatar: emp.avatarUrl,
            idle: Math.max(0, empPotential - empWorked),
            worked: empWorked,
            potential: empPotential
        });
    });

    totalGross = (h40 + h20) * hourlyRate;
    const taxes = producedHours > 0 ? (deductions['40H'].ir + deductions['20H'].ir + deductions['40H'].inss + deductions['20H'].inss) : 0;
    const unimed = producedHours > 0 ? (deductions['40H'].unimed + deductions['20H'].unimed) : 0;

    return { 
      totalGross, h40, h20, producedHours, hT1, hQ1, hPLAN, hCancelled, 
      lossPotential: hCancelled * hourlyRate,
      taxes, unimed, totalReal: Math.max(0, totalGross - taxes - unimed),
      idleBreakdown: idleBreakdown.sort((a, b) => b.idle - a.idle)
    };
  }, [schedules, viewedMonth, viewedYear, hourlyRate, deductions, employees, viewMode, checkActiveAssignment]);

  const formatCurrency = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  const courseData = [
    { name: 'Ensino Técnico (T1)', value: performance.hT1, color: '#00f3ff' },
    { name: 'Qualificações (Q1)', value: performance.hQ1, color: '#bc13fe' },
    { name: 'Planejamento', value: performance.hPLAN, color: '#ff9900' }
  ].filter(d => d.value > 0);

  const chartData = useMemo(() => {
    if (viewMode === 'YEAR') {
      return ANNUAL_CR_2025.map(m => {
        let monthlyReal = 0;
        const days = new Date(viewedYear, m.month + 1, 0).getDate();
        employees.forEach(emp => {
          for (let d = 1; d <= days; d++) {
            const dStr = `${viewedYear}-${String(m.month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            if (!isBusinessDay(new Date(viewedYear, m.month, d))) continue;
            (['MORNING', 'AFTERNOON', 'NIGHT'] as const).forEach(slot => {
              const asgn = checkActiveAssignment(emp.id, dStr, slot, schedules);
              if (asgn && !asgn.isCancelled) {
                monthlyReal += 4 * hourlyRate;
              }
            });
          }
        });
        return {
          label: m.label,
          hist: m.g40 + m.g20,
          real: monthlyReal
        };
      });
    }
    return [{ 
      label: selectedDate.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(), 
      real: performance.totalGross,
      hist: ANNUAL_CR_2025.find(m => m.month === viewedMonth)?.g40 || 0 
    }];
  }, [viewMode, viewedYear, schedules, employees, checkActiveAssignment, hourlyRate, selectedDate, viewedMonth]);

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700 pb-10">
      {/* HEADER DE CONTROLE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-slate-900/40 p-6 rounded-2xl border border-white/5 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="w-14 h-14 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-neon-cyan">
                  <Activity className="text-cyan-400 animate-pulse w-7 h-7" />
              </div>
              <div className="text-center sm:text-left">
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <h2 className="text-2xl font-black text-white uppercase font-mono tracking-widest">
                        {viewMode === 'YEAR' ? `Auditoria Anual ${viewedYear}` : `Performance Mensal Real`}
                    </h2>
                    <div className="flex items-center bg-slate-950 border border-white/10 rounded-xl p-1 shadow-inner">
                        <button onClick={() => onDateChange(new Date(selectedDate.setFullYear(viewedYear - 1)))} className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-white rounded transition-colors"><ChevronLeft size={18} /></button>
                        <span className="px-4 text-sm font-mono font-bold text-cyan-400">{viewedYear}</span>
                        <button onClick={() => onDateChange(new Date(selectedDate.setFullYear(viewedYear + 1)))} className="p-1.5 hover:bg-white/5 text-slate-500 hover:text-white rounded transition-colors"><ChevronRight size={18} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                      <span className="text-[9px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20 uppercase font-black tracking-widest">
                         Sincronismo Ativo
                      </span>
                  </div>
              </div>
          </div>
          
          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 shadow-2xl w-full lg:w-auto">
            <button onClick={() => setViewMode('MONTH')} className={`flex-1 lg:flex-none px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'MONTH' ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-500 hover:text-slate-300'}`}>Mensal</button>
            <button onClick={() => setViewMode('YEAR')} className={`flex-1 lg:flex-none px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'YEAR' ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-500 hover:text-slate-300'}`}>Anual</button>
          </div>
      </div>

      {/* CARDS KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <NeonCard glowColor="cyan" className="bg-cyan-500/5">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-cyan-500/10 rounded-2xl text-cyan-400"><DollarSign size={32} /></div>
                  <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black mb-1">Receita Real</p><p className="text-2xl font-black text-white font-mono">{formatCurrency(performance.totalReal)}</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="purple" className="bg-purple-500/5">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400"><TrendingUp size={32} /></div>
                  <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black mb-1">Bruto Estimado</p><p className="text-2xl font-black text-white font-mono">{formatCurrency(performance.totalGross)}</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="orange" className="bg-orange-500/5 border-orange-500/10">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-400"><Calculator size={32} /></div>
                  <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black mb-1">Total Horas</p><p className="text-2xl font-black text-orange-400 font-mono">{performance.producedHours}h</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="none" className="bg-red-500/5 border-red-500/10">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-red-500/10 rounded-2xl text-red-400"><Ban size={32} /></div>
                  <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black mb-1">Horas Canceladas</p><p className="text-2xl font-black text-red-400 font-mono">{performance.hCancelled}h</p></div>
              </div>
          </NeonCard>
      </div>

      {/* DASHBOARDS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2">
            <NeonCard title="Matriz Educacional (Real)" glowColor="cyan" icon={<Cpu size={18} />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                    <div className="space-y-6">
                        <div className="p-5 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase text-cyan-400 tracking-widest">Ensino Técnico (T1)</span>
                                <span className="text-sm font-bold text-white font-mono">{performance.hT1}H</span>
                            </div>
                            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 shadow-[0_0_10px_#00f3ff]" style={{ width: `${(performance.hT1 / (performance.producedHours || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="p-5 bg-purple-500/5 border border-purple-500/10 rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase text-purple-400 tracking-widest">Qualificação (Q1)</span>
                                <span className="text-sm font-bold text-white font-mono">{performance.hQ1}H</span>
                            </div>
                            <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 shadow-[0_0_10px_#bc13fe]" style={{ width: `${(performance.hQ1 / (performance.producedHours || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="h-64 flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={courseData} innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value">
                                    {courseData.map((entry, index) => <Cell key={index} fill={entry.color} stroke="none" />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }} />
                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', color: '#94a3b8' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </NeonCard>
          </div>
          
          <div className="lg:col-span-1">
              <NeonCard title="Status de Ociosidade" glowColor="orange" icon={<Ban size={18} />}>
                  <div className="flex flex-col items-center justify-center space-y-8 py-6 text-center">
                      <div className="relative">
                          <div className={`absolute inset-0 blur-3xl rounded-full ${performance.hCancelled > 0 ? 'bg-red-500/20 animate-pulse' : 'bg-slate-500/5'}`}></div>
                          <div className={`relative w-40 h-40 rounded-full border-4 flex flex-col items-center justify-center ${performance.hCancelled > 0 ? 'border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5'}`}>
                              <span className={`text-4xl font-black font-mono tracking-tighter ${performance.hCancelled > 0 ? 'text-red-500' : 'text-slate-700'}`}>{performance.hCancelled}h</span>
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Horas Perdidas</span>
                          </div>
                      </div>
                      <div className="w-full space-y-4">
                          <div className="flex justify-between items-center p-4 bg-slate-950 border border-white/5 rounded-2xl shadow-inner">
                              <span className="text-[10px] font-black text-slate-500 uppercase">Impacto Financeiro</span>
                              <span className="text-sm font-black font-mono text-red-400">{formatCurrency(performance.lossPotential)}</span>
                          </div>
                      </div>
                  </div>
              </NeonCard>
          </div>
      </div>

      {/* TREND CHART */}
      <NeonCard title="Histórico de Produção" icon={<BarChart3 size={18} />}>
          <div className="h-80 w-full mt-6">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: '#ffffff05' }} 
                        contentStyle={{ backgroundColor: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '10px' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '10px', marginBottom: '20px' }} />
                      <Bar dataKey="real" name="Real" fill="#00f3ff" radius={[6, 6, 0, 0]} barSize={25} />
                      <Bar dataKey="hist" name="Histórico" fill="#334155" radius={[6, 6, 0, 0]} barSize={25} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
      </NeonCard>
    </div>
  );
};

export default StatsPanel;
