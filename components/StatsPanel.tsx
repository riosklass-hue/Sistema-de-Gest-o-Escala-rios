
import React, { useMemo, useState, useCallback } from 'react';
import { ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import NeonCard from './NeonCard';
import { 
  UserCheck, Activity, Clock, Wallet, TrendingUp, DollarSign, Calendar, Info, 
  CheckCircle, ChevronLeft, ChevronRight, Calculator, MinusCircle, ShieldCheck, 
  Trash2, Wand2, Loader2, Zap, Hourglass, Coffee, BarChart3, Target, 
  Briefcase, Settings, Landmark, ArrowUpRight, ArrowDownRight, 
  PieChart as PieIcon, BookOpen, Ban, GraduationCap, Cpu
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

    const startM = viewMode === 'YEAR' ? 0 : viewedMonth;
    const endM = viewMode === 'YEAR' ? 11 : viewedMonth;

    for (let m = startM; m <= endM; m++) {
        const daysInMonth = new Date(viewedYear, m + 1, 0).getDate();
        employees.forEach(emp => {
            for (let d = 1; d <= daysInMonth; d++) {
                const dateStr = `${viewedYear}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const dateObj = new Date(viewedYear, m, d);
                const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

                (['MORNING', 'AFTERNOON', 'NIGHT'] as const).forEach(slot => {
                    const asgn = checkActiveAssignment(emp.id, dateStr, slot, schedules);
                    if (asgn && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(asgn.type)) {
                        if (asgn.isCancelled) {
                            hCancelled += 4;
                        } else if (!isWeekend) {
                            if (slot === 'NIGHT') h20 += 4; else h40 += 4;
                            producedHours += 4;
                            if (asgn.type === ShiftType.T1) hT1 += 4; 
                            else if (asgn.type === ShiftType.Q1) hQ1 += 4; 
                            else hPLAN += 4;
                        }
                    }
                });
            }
        });
    }

    totalGross = (h40 + h20) * hourlyRate;
    const taxes = producedHours > 0 ? (deductions['40H'].ir + deductions['20H'].ir + deductions['40H'].inss + deductions['20H'].inss) : 0;
    const unimed = producedHours > 0 ? (deductions['40H'].unimed + deductions['20H'].unimed) : 0;

    return { 
      totalGross, h40, h20, producedHours, hT1, hQ1, hPLAN, hCancelled, 
      lossPotential: hCancelled * hourlyRate,
      taxes, unimed, totalReal: Math.max(0, totalGross - taxes - unimed)
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
            (['MORNING', 'AFTERNOON', 'NIGHT'] as const).forEach(slot => {
              const asgn = checkActiveAssignment(emp.id, dStr, slot, schedules);
              if (asgn && !asgn.isCancelled && (new Date(viewedYear, m.month, d).getDay() !== 0 && new Date(viewedYear, m.month, d).getDay() !== 6)) {
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
      {/* HEADER DE CONTROLE RESPONSIVE */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-sci-panel/40 p-5 md:p-6 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-center gap-4 md:gap-6 text-center sm:text-left">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                  <Activity className="text-cyan-400 animate-pulse w-6 h-6 md:w-7 md:h-7" />
              </div>
              <div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4">
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase font-mono tracking-tight">
                        {viewMode === 'YEAR' ? `Análise Real ${viewedYear}` : `Análise Mensal Real`}
                    </h2>
                    <div className="flex items-center bg-slate-950 border border-white/10 rounded-xl p-1 shadow-inner">
                        <button onClick={() => onDateChange(new Date(selectedDate.setFullYear(viewedYear - 1)))} className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded transition-colors"><ChevronLeft size={18} /></button>
                        <span className="px-4 text-base font-mono font-bold text-cyan-400">{viewedYear}</span>
                        <button onClick={() => onDateChange(new Date(selectedDate.setFullYear(viewedYear + 1)))} className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded transition-colors"><ChevronRight size={18} /></button>
                    </div>
                  </div>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-2">
                      <span className="flex items-center gap-1.5 text-[9px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20 uppercase font-black tracking-wider">
                          <CheckCircle className="w-3.5 h-3.5" /> SINC: ESCALA
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black hidden sm:inline">AUDITORIA ATIVA</span>
                  </div>
              </div>
          </div>
          
          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md w-full lg:w-auto">
            <button onClick={() => setViewMode('MONTH')} className={`flex-1 lg:flex-none px-6 md:px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'MONTH' ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-500 hover:text-slate-300'}`}>Mensal</button>
            <button onClick={() => setViewMode('YEAR')} className={`flex-1 lg:flex-none px-6 md:px-10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'YEAR' ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-500 hover:text-slate-300'}`}>Anual</button>
          </div>
      </div>

      {/* CARDS KPI RESPONSIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <NeonCard glowColor="cyan" className="bg-cyan-500/5">
              <div className="flex items-center gap-4 md:gap-5">
                  <div className="p-3 md:p-4 bg-cyan-500/10 rounded-2xl text-cyan-400"><DollarSign size={28} /></div>
                  <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold mb-0.5 truncate">Receita Real</p><p className="text-xl md:text-2xl font-bold text-white font-mono">{formatCurrency(performance.totalReal)}</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="purple" className="bg-purple-500/5">
              <div className="flex items-center gap-4 md:gap-5">
                  <div className="p-3 md:p-4 bg-purple-500/10 rounded-2xl text-purple-400"><TrendingUp size={28} /></div>
                  <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold mb-0.5 truncate">Bruto Estimado</p><p className="text-xl md:text-2xl font-bold text-white font-mono">{formatCurrency(performance.totalGross)}</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="none" className="bg-red-500/5 border-red-500/10">
              <div className="flex items-center gap-4 md:gap-5">
                  <div className="p-3 md:p-4 bg-red-500/10 rounded-2xl text-red-400"><MinusCircle size={28} /></div>
                  <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold mb-0.5 truncate">Tributação</p><p className="text-xl md:text-2xl font-bold text-red-400 font-mono">{formatCurrency(performance.taxes)}</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="none" className="bg-blue-500/5 border-blue-500/10">
              <div className="flex items-center gap-4 md:gap-5">
                  <div className="p-3 md:p-4 bg-blue-500/10 rounded-2xl text-blue-400"><ShieldCheck size={28} /></div>
                  <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold mb-0.5 truncate">Assistência Médica</p><p className="text-xl md:text-2xl font-bold text-blue-400 font-mono">{formatCurrency(performance.unimed)}</p></div>
              </div>
          </NeonCard>
      </div>

      {/* DASHBOARDS DYNAMIC GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          <div className="lg:col-span-2">
            <NeonCard title="Matriz Educacional (Real)" glowColor="cyan" icon={<Cpu size={18} />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-2 md:py-4">
                    <div className="space-y-4 md:space-y-6">
                        <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase text-cyan-400 tracking-widest">Técnico (T1)</span>
                                <span className="text-xs font-bold text-white font-mono">{Math.round(performance.hT1)}H</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-cyan-500 shadow-neon-cyan" style={{ width: `${(performance.hT1 / (performance.producedHours || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                        <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[9px] font-black uppercase text-purple-400 tracking-widest">Qualidade (Q1)</span>
                                <span className="text-xs font-bold text-white font-mono">{Math.round(performance.hQ1)}H</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500 shadow-neon-purple" style={{ width: `${(performance.hQ1 / (performance.producedHours || 1)) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="h-48 md:h-64 flex items-center justify-center">
                        {courseData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={courseData} innerRadius={45} outerRadius={70} paddingAngle={5} dataKey="value">
                                        {courseData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#0b1221', border: '1px solid #1e293b', borderRadius: '12px' }} />
                                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="text-center space-y-2 opacity-50">
                                <Info size={24} className="mx-auto text-slate-600" />
                                <p className="text-[9px] font-mono text-slate-500 uppercase font-black tracking-widest">Aguardando Lançamentos</p>
                            </div>
                        )}
                    </div>
                </div>
            </NeonCard>
          </div>
          
          <div className="lg:col-span-1">
              <NeonCard title="Status de Ocupação" glowColor="orange" icon={<Ban size={18} />}>
                  <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8 py-4 md:py-6 text-center">
                      <div className="relative">
                          <div className={`absolute inset-0 blur-2xl rounded-full animate-pulse ${performance.hCancelled > 0 ? 'bg-red-500/10' : 'bg-slate-500/5'}`}></div>
                          <div className={`relative w-32 h-32 md:w-40 md:h-40 rounded-full border-2 flex flex-col items-center justify-center ${performance.hCancelled > 0 ? 'border-red-500/30' : 'border-white/5'}`}>
                              <span className={`text-3xl md:text-4xl font-black font-mono tracking-tighter ${performance.hCancelled > 0 ? 'text-red-500' : 'text-slate-700'}`}>{performance.hCancelled}h</span>
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Inativas</span>
                          </div>
                      </div>
                      <div className="w-full space-y-3">
                          <div className="flex justify-between items-center p-3.5 bg-slate-900 border border-white/5 rounded-xl">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Oportunidade Perdida</span>
                              <span className={`text-xs md:text-sm font-black font-mono ${performance.lossPotential > 0 ? 'text-red-400' : 'text-slate-600'}`}>{formatCurrency(performance.lossPotential)}</span>
                          </div>
                          <p className="text-[9px] text-slate-600 font-medium leading-relaxed italic px-2">
                            Auditoria baseada em turmas canceladas ou ociosas detectadas via escala.
                          </p>
                      </div>
                  </div>
              </NeonCard>
          </div>
      </div>

      {/* HISTORIC CHART RESPONSIVE */}
      <NeonCard title="Tendência de Produção (Real vs Histórico)" icon={<BarChart3 size={18} />}>
          <div className="h-64 md:h-80 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 9, fontWeight: 700 }} />
                      <YAxis hide />
                      <Tooltip 
                        cursor={{ fill: '#ffffff05' }} 
                        contentStyle={{ backgroundColor: '#0b1221', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '9px', marginBottom: '10px' }} />
                      <Bar dataKey="real" name="Produção Real" fill="#00f3ff" radius={[4, 4, 0, 0]} barSize={20} />
                      <Bar dataKey="hist" name="Histórico Ref." fill="#1e293b" radius={[4, 4, 0, 0]} opacity={0.5} barSize={20} />
                  </BarChart>
              </ResponsiveContainer>
          </div>
      </NeonCard>
    </div>
  );
};

export default StatsPanel;
