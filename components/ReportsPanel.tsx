
import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import NeonCard from './NeonCard';
import { Employee, Schedule, ShiftType, Shift } from '../types';
import { DollarSign, Clock, TrendingUp, Wallet, Download, Activity, Database, FileText, Calendar, ListFilter, Users, Filter, Coffee, MinusCircle, PlusCircle, AlertCircle, Save, CheckCircle, Calculator, ShieldCheck, Hourglass, Target, Settings, Briefcase, BarChart3, Receipt, Scale, ArrowDownRight, ArrowUpRight, Landmark } from 'lucide-react';
import { PORTO_VELHO_HOLIDAYS } from '../constants';

interface DeductionState {
    ir: number;
    inss: number;
    unimed: number;
}

interface ReportsPanelProps {
    filterEmployeeId?: string | null;
    employees: Employee[];
    schedules: Schedule[];
    initialDeductions?: Record<string, DeductionState>;
    onSaveDeductions?: (deductions: Record<string, DeductionState>) => void;
    hourlyRate: number;
    selectedDate: Date;
}

const ReportsPanel: React.FC<ReportsPanelProps> = ({ 
    filterEmployeeId, 
    employees, 
    schedules, 
    initialDeductions,
    onSaveDeductions,
    hourlyRate,
    selectedDate
}) => {
  const [internalFilterId, setInternalFilterId] = useState<string>('ALL');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [deductions, setDeductions] = useState<Record<string, DeductionState>>(initialDeductions || {
    '40H': { ir: 0, inss: 0, unimed: 0 },
    '20H': { ir: 0, inss: 0, unimed: 0 }
  });

  useEffect(() => {
    if (initialDeductions) {
        setDeductions(initialDeductions);
    }
  }, [initialDeductions]);

  const activeFilterId = filterEmployeeId || (internalFilterId === 'ALL' ? null : internalFilterId);
  const formattedMonthYear = selectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  
  const isBusinessDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return !PORTO_VELHO_HOLIDAYS.includes(`${mm}-${dd}`);
  };

  const data = useMemo(() => {
    let targetEmployees = employees;
    if (activeFilterId) {
        targetEmployees = employees.filter(e => e.id === activeFilterId);
    }

    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    return targetEmployees.map(emp => {
        const empSchedule = schedules.find(s => s.employeeId === emp.id);
        const shiftsMap = empSchedule?.shifts || {};

        let paidHours40 = 0; 
        let paidHours20 = 0; 
        let hT1 = 0;
        let hQ1 = 0;
        let hPLAN = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(currentYear, currentMonth, d);
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const shift = shiftsMap[dateStr];
            
            if (shift && !isWeekend) {
                const slots = shift.activeSlots || [];
                const hoursInDay = slots.length * 4;
                
                if (shift.type === ShiftType.T1) hT1 += hoursInDay;
                else if (shift.type === ShiftType.Q1) hQ1 += hoursInDay;
                else if (shift.type === ShiftType.PLAN) hPLAN += hoursInDay;

                if ([ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(shift.type)) {
                    slots.forEach(slot => {
                        if (slot === 'MORNING' || slot === 'AFTERNOON') paidHours40 += 4;
                        else if (slot === 'NIGHT') paidHours20 += 4;
                    });
                }
            }
        }

        const totalValue = (paidHours40 + paidHours20) * hourlyRate;

        return {
            ...emp,
            paidHours40,
            paidHours20,
            paidHours: paidHours40 + paidHours20,
            hT1, hQ1, hPLAN,
            totalValue
        };
    });
  }, [activeFilterId, employees, schedules, hourlyRate, selectedDate]);

  const summaryTotals = useMemo(() => {
    let h40 = 0;
    let h20 = 0;
    let hT1 = 0;
    let hQ1 = 0;
    let hPLAN = 0;

    data.forEach(d => {
        h40 += d.paidHours40;
        h20 += d.paidHours20;
        hT1 += d.hT1;
        hQ1 += d.hQ1;
        hPLAN += d.hPLAN;
    });

    const g40 = h40 * hourlyRate;
    const g20 = h20 * hourlyRate;

    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    let businessDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        if (isBusinessDay(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d))) businessDays++;
    }
    
    const viewEmployeeCount = activeFilterId ? 1 : employees.length;
    const totalPotentialHours = businessDays * 12 * viewEmployeeCount;
    const producedHours = h40 + h20;
    const idleHours = Math.max(0, totalPotentialHours - producedHours);

    const totalIR = deductions['40H'].ir + deductions['20H'].ir;
    const totalINSS = deductions['40H'].inss + deductions['20H'].inss;
    const totalUnimed = deductions['40H'].unimed + deductions['20H'].unimed;
    const totalDeductions = totalIR + totalINSS + totalUnimed;

    const r40 = g40 - (deductions['40H'].ir + deductions['40H'].inss + deductions['40H'].unimed);
    const r20 = g20 - (deductions['20H'].ir + deductions['20H'].inss + deductions['20H'].unimed);
    const totalNet = r40 + r20;

    return {
        h40, h20, g40, g20, r40, r20,
        hT1, hQ1, hPLAN,
        producedHours, idleHours, totalPotentialHours,
        totalHours: h40 + h20,
        totalGross: g40 + g20,
        totalNet,
        totalIR, totalINSS, totalUnimed, totalDeductions,
        totalTaxes: totalIR + totalINSS
    };
  }, [data, deductions, hourlyRate, selectedDate, activeFilterId, employees]);

  // Tax ratio for estimating individual Net
  const netRatio = summaryTotals.totalGross > 0 ? summaryTotals.totalNet / summaryTotals.totalGross : 0;

  const handleDeductionChange = (contract: string, field: keyof DeductionState, value: string) => {
    const numValue = parseFloat(value) || 0;
    setDeductions(prev => ({
        ...prev,
        [contract]: {
            ...prev[contract],
            [field]: numValue
        }
    }));
  };

  const handleSave = () => {
    if (onSaveDeductions) {
        onSaveDeductions(deductions);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      
      {/* HEADER DE FILTRO */}
      {!filterEmployeeId && (
        <div className="flex justify-between items-center bg-sci-panel/40 p-6 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg">
            <div className="flex items-center gap-4 text-slate-400 text-sm font-mono uppercase tracking-widest font-black">
                <Filter size={20} className="text-cyan-400" />
                Inteligência Analítica | {formattedMonthYear}
            </div>
            <select 
                value={internalFilterId}
                onChange={(e) => setInternalFilterId(e.target.value)}
                className="bg-slate-950 border border-white/20 rounded-xl text-sm text-white px-6 py-3 focus:outline-none focus:border-cyan-500/50 min-w-[280px] font-bold shadow-inner"
            >
                <option value="ALL">Todos os Colaboradores</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
        </div>
      )}

      {/* BLOCO: KPI FINANCEIROS - ESPELHANDO DASHBOARD */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <NeonCard glowColor="cyan" className="bg-cyan-500/5">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-cyan-500/10 rounded-2xl text-cyan-400"><DollarSign size={32} /></div>
                  <div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Receita Real Mês</p><p className="text-2xl font-bold text-white font-mono">{formatCurrency(summaryTotals.totalNet)}</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="purple" className="bg-purple-500/5">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400"><Calculator size={32} /></div>
                  <div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Faturamento Bruto</p><p className="text-2xl font-bold text-white font-mono">{formatCurrency(summaryTotals.totalGross)}</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="orange" className="bg-red-500/5 border-red-500/10">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-red-500/10 rounded-2xl text-red-400"><MinusCircle size={32} /></div>
                  <div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Deduções Fiscais</p><p className="text-2xl font-bold text-red-400 font-mono">{formatCurrency(summaryTotals.totalTaxes)}</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="none" className="bg-blue-500/5 border-blue-500/10">
              <div className="flex items-center gap-5">
                  <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400"><ShieldCheck size={32} /></div>
                  <div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Plano Unimed</p><p className="text-2xl font-bold text-blue-400 font-mono">{formatCurrency(summaryTotals.totalUnimed)}</p></div>
              </div>
          </NeonCard>
      </div>

      {/* BLOCO: FLUXO FINANCEIRO DO MÊS (ACESSOR SOLICITADO) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-sci-panel/60 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-2xl relative overflow-hidden h-full">
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20"><Landmark className="w-6 h-6" /></div>
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Fluxo Financeiro do Mês</h3>
                        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-black">Detalhamento de Proventos e Descontos</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Item: Bruto */}
                    <div className="flex items-center justify-between p-5 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl group hover:bg-emerald-500/10 transition-all">
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><ArrowUpRight size={24}/></div>
                            <div>
                                <p className="text-xs font-mono text-slate-500 uppercase font-black tracking-widest">Ganhos Brutos (Total Horas)</p>
                                <p className="text-lg font-black text-white">{summaryTotals.totalHours} Horas Produzidas</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-black text-emerald-400 font-mono">+{formatCurrency(summaryTotals.totalGross)}</p>
                        </div>
                    </div>

                    {/* Item: Impostos Separados (IR/INSS) */}
                    <div className="flex items-center justify-between p-5 bg-red-500/5 border border-red-500/20 rounded-2xl group hover:bg-red-500/10 transition-all">
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-red-500/10 rounded-xl text-red-400"><ArrowDownRight size={24}/></div>
                            <div>
                                <p className="text-xs font-mono text-slate-500 uppercase font-black tracking-widest">Deduções Fiscais (IR + INSS)</p>
                                <p className="text-lg font-black text-white">Encargos Obrigatórios</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-red-400 font-mono">-{formatCurrency(summaryTotals.totalTaxes)}</p>
                            <div className="flex gap-2 justify-end mt-1">
                                <span className="text-[10px] font-mono font-black text-slate-500 uppercase">IR: {formatCurrency(summaryTotals.totalIR)}</span>
                                <span className="text-[10px] font-mono font-black text-slate-500 uppercase">INSS: {formatCurrency(summaryTotals.totalINSS)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Item: Unimed */}
                    <div className="flex items-center justify-between p-5 bg-blue-500/5 border border-blue-500/20 rounded-2xl group hover:bg-blue-500/10 transition-all">
                        <div className="flex items-center gap-5">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><ShieldCheck size={24}/></div>
                            <div>
                                <p className="text-xs font-mono text-slate-500 uppercase font-black tracking-widest">Plano de Saúde (UNIMED)</p>
                                <p className="text-lg font-black text-white">Coparticipação e Mensalidade</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xl font-black text-blue-400 font-mono">-{formatCurrency(summaryTotals.totalUnimed)}</p>
                        </div>
                    </div>

                    {/* Resultado Líquido */}
                    <div className="mt-8 p-6 bg-slate-950 rounded-2xl border-2 border-cyan-500/30 flex items-center justify-between shadow-neon-cyan/20">
                        <div className="space-y-1">
                            <p className="text-sm font-black text-cyan-400 uppercase tracking-widest">Saldo Líquido Disponível</p>
                            <p className="text-xs text-slate-500 font-medium">Balanço final após todas as retenções do período</p>
                        </div>
                        <div className="text-right">
                            <p className="text-4xl font-black text-white font-mono tracking-tighter">{formatCurrency(summaryTotals.totalNet)}</p>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <div className="lg:col-span-1">
              <div className="bg-sci-panel/60 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-2xl h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20"><PieChart size={24} /></div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Composição</h3>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={[
                                        { name: 'Líquido', value: summaryTotals.totalNet, color: '#00f3ff' },
                                        { name: 'Impostos', value: summaryTotals.totalTaxes, color: '#ef4444' },
                                        { name: 'Unimed', value: summaryTotals.totalUnimed, color: '#3b82f6' }
                                    ]}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {[
                                        { color: '#00f3ff' },
                                        { color: '#ef4444' },
                                        { color: '#3b82f6' }
                                    ].map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#0b1221', borderColor: '#1e293b', borderRadius: '12px' }}
                                    formatter={(value: number) => [formatCurrency(value), '']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-4 mt-4">
                         <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-cyan-400"></div><span className="text-xs font-mono font-black text-slate-400 uppercase">Líquido</span></div>
                             <span className="text-xs font-mono text-white font-black">{((summaryTotals.totalNet / summaryTotals.totalGross) * 100).toFixed(1)}%</span>
                         </div>
                         <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400"></div><span className="text-xs font-mono font-black text-slate-400 uppercase">Impostos</span></div>
                             <span className="text-xs font-mono text-white font-black">{((summaryTotals.totalTaxes / summaryTotals.totalGross) * 100).toFixed(1)}%</span>
                         </div>
                         <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-400"></div><span className="text-xs font-mono font-black text-slate-400 uppercase">Unimed</span></div>
                             <span className="text-xs font-mono text-white font-black">{((summaryTotals.totalUnimed / summaryTotals.totalGross) * 100).toFixed(1)}%</span>
                         </div>
                    </div>
                  </div>
              </div>
          </div>
      </div>

      {/* BLOCO: EQUILÍBRIO OPERACIONAL MENSAL - DETALHADO POR T1/Q1/PLAN */}
      <div className="bg-sci-panel/60 backdrop-blur-md rounded-2xl border border-white/10 p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity"><BarChart3 size={120} /></div>
          <div className="relative z-10 space-y-10">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20"><Hourglass className="w-6 h-6" /></div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight">Equilíbrio Operacional do Mês</h3>
                  </div>
                  <div className="text-right">
                      <p className="text-[10px] font-mono text-slate-500 uppercase font-black tracking-widest mb-1">Base de Cálculo Mensal</p>
                      <p className="text-xl font-black text-white">PRODUÇÃO {formattedMonthYear}</p>
                  </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
                  {/* COLUNA: HORAS PRODUZIDAS COM BREAKDOWN T1/Q1/PLAN */}
                  <div className="space-y-6">
                      <div className="flex justify-between items-end">
                          <div>
                              <p className="text-xs font-mono text-slate-500 uppercase font-black tracking-widest mb-1">Horas Produzidas (Total)</p>
                              <p className="text-5xl font-black text-emerald-400 font-mono tracking-tighter">{summaryTotals.producedHours} <small className="text-sm opacity-60">H</small></p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs font-mono text-slate-500 uppercase font-black tracking-widest mb-1">Aproveitamento</p>
                              <p className="text-2xl font-black text-white">{((summaryTotals.producedHours / (summaryTotals.totalPotentialHours || 1)) * 100).toFixed(1)}%</p>
                          </div>
                      </div>
                      
                      <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-1 shadow-inner relative">
                          <div className="h-full bg-gradient-to-r from-emerald-600 to-cyan-400 rounded-full shadow-neon-cyan transition-all duration-1000" style={{ width: `${(summaryTotals.producedHours / (summaryTotals.totalPotentialHours || 1)) * 100}%` }}></div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4">
                          <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl">
                              <div className="flex items-center gap-2 text-emerald-400 mb-1"><Target size={14} /><span className="text-[10px] font-black uppercase tracking-widest">T1 (Técnico)</span></div>
                              <p className="text-xl font-black text-white font-mono">{summaryTotals.hT1}h</p>
                          </div>
                          <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-xl">
                              <div className="flex items-center gap-2 text-cyan-400 mb-1"><Settings size={14} /><span className="text-[10px] font-black uppercase tracking-widest">Q1 (Qualidade)</span></div>
                              <p className="text-xl font-black text-white font-mono">{summaryTotals.hQ1}h</p>
                          </div>
                          <div className="bg-orange-500/5 border border-orange-500/20 p-4 rounded-xl">
                              <div className="flex items-center gap-2 text-orange-400 mb-1"><Briefcase size={14} /><span className="text-[10px] font-black uppercase tracking-widest">PLAN (Gestão)</span></div>
                              <p className="text-xl font-black text-white font-mono">{summaryTotals.hPLAN}h</p>
                          </div>
                      </div>
                  </div>

                  {/* COLUNA: HORAS OCIOSAS */}
                  <div className="space-y-6">
                      <div className="flex justify-between items-end">
                          <div>
                              <p className="text-xs font-mono text-slate-500 uppercase font-black tracking-widest mb-1">Horas Ociosas (Folgas)</p>
                              <p className="text-5xl font-black text-red-500 font-mono tracking-tighter">{summaryTotals.idleHours} <small className="text-sm opacity-60">H</small></p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs font-mono text-slate-500 uppercase font-black tracking-widest mb-1">Indisponibilidade</p>
                              <p className="text-2xl font-black text-white">{((summaryTotals.idleHours / (summaryTotals.totalPotentialHours || 1)) * 100).toFixed(1)}%</p>
                          </div>
                      </div>
                      <div className="h-4 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5 p-1 shadow-inner relative">
                          <div className="h-full bg-gradient-to-r from-red-600 to-orange-500 rounded-full shadow-neon-orange transition-all duration-1000" style={{ width: `${(summaryTotals.idleHours / (summaryTotals.totalPotentialHours || 1)) * 100}%` }}></div>
                      </div>
                      
                      <div className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-center justify-between">
                         <div className="flex items-center gap-4">
                            <Coffee className="text-red-400" />
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status Recarga</p>
                                <p className="text-sm font-bold text-white uppercase">Recuperação de Capacidade</p>
                            </div>
                         </div>
                         <div className="text-right">
                             <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Capacidade Máxima</p>
                             <p className="text-sm font-bold text-slate-400">{summaryTotals.totalPotentialHours}h</p>
                         </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* CALCULADORA DE DEDUÇÕES - DETALHAMENTO MENSAL */}
      <NeonCard glowColor="cyan" title={`Calculadora de Deduções - ${formattedMonthYear}`} icon={<Scale size={20} />}>
        <div className="overflow-x-auto mb-10">
            <table className="w-full text-sm font-mono border-collapse">
                <thead>
                    <tr className="text-slate-500 uppercase border-b border-white/20 font-black">
                        <th className="p-4 text-left">CONTRATO</th>
                        <th className="p-4 text-center">CARGA</th>
                        <th className="p-4 text-right">BRUTO (ESTIMADO)</th>
                        <th className="p-4 text-right">I.R.</th>
                        <th className="p-4 text-right">INSS</th>
                        <th className="p-4 text-right">UNIMED</th>
                        <th className="p-4 text-right text-emerald-400">RECEBIMENTO LÍQUIDO</th>
                    </tr>
                </thead>
                <tbody className="text-slate-200">
                    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="p-5 font-black text-white uppercase text-xs">Contrato 40H (M/T)</td>
                        <td className="p-5 text-center font-bold">{summaryTotals.h40}h</td>
                        <td className="p-5 text-right text-slate-400">{summaryTotals.g40.toFixed(2)}</td>
                        <td className="p-5 text-right"><input type="number" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 w-28 text-right text-red-400 focus:outline-none focus:border-red-500/50 font-bold" value={deductions['40H'].ir || ''} onChange={(e) => handleDeductionChange('40H', 'ir', e.target.value)} /></td>
                        <td className="p-5 text-right"><input type="number" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 w-28 text-right text-red-400 focus:outline-none focus:border-red-500/50 font-bold" value={deductions['40H'].inss || ''} onChange={(e) => handleDeductionChange('40H', 'inss', e.target.value)} /></td>
                        <td className="p-5 text-right"><input type="number" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 w-28 text-right text-red-400 focus:outline-none focus:border-red-500/50 font-bold" value={deductions['40H'].unimed || ''} onChange={(e) => handleDeductionChange('40H', 'unimed', e.target.value)} /></td>
                        <td className="p-5 text-right font-black text-white">{formatCurrency(summaryTotals.r40)}</td>
                    </tr>
                    <tr className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="p-5 font-black text-white uppercase text-xs">Contrato 20H (N)</td>
                        <td className="p-5 text-center font-bold">{summaryTotals.h20}h</td>
                        <td className="p-5 text-right text-slate-400">{summaryTotals.g20.toFixed(2)}</td>
                        <td className="p-5 text-right"><input type="number" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 w-28 text-right text-red-400 focus:outline-none focus:border-red-500/50 font-bold" value={deductions['20H'].ir || ''} onChange={(e) => handleDeductionChange('20H', 'ir', e.target.value)} /></td>
                        <td className="p-5 text-right"><input type="number" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 w-28 text-right text-red-400 focus:outline-none focus:border-red-500/50 font-bold" value={deductions['20H'].inss || ''} onChange={(e) => handleDeductionChange('20H', 'inss', e.target.value)} /></td>
                        <td className="p-5 text-right"><input type="number" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 w-28 text-right text-red-400 focus:outline-none focus:border-red-500/50 font-bold" value={deductions['20H'].unimed || ''} onChange={(e) => handleDeductionChange('20H', 'unimed', e.target.value)} /></td>
                        <td className="p-5 text-right font-black text-white">{formatCurrency(summaryTotals.r20)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr className="bg-slate-950/80 font-black shadow-lg">
                        <td className="p-6 text-white uppercase tracking-widest text-xs">Soma do Mês</td>
                        <td className="p-6 text-center text-white">{summaryTotals.totalHours}h</td>
                        <td className="p-6 text-right text-white">{formatCurrency(summaryTotals.totalGross)}</td>
                        <td colSpan={3} className="p-6 text-right text-red-400">- {formatCurrency(summaryTotals.totalTaxes + summaryTotals.totalUnimed)}</td>
                        <td className="p-6 text-right text-emerald-400 font-black text-xl">{formatCurrency(summaryTotals.totalNet)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        <div className="flex justify-end pt-8 border-t border-white/10">
            <button onClick={handleSave} className={`flex items-center gap-4 px-10 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl ${saveSuccess ? 'bg-emerald-600 shadow-neon-emerald' : 'bg-cyan-600 hover:bg-cyan-500 shadow-neon-cyan border border-white/20'}`}>
                {saveSuccess ? <CheckCircle size={24} /> : <Save size={24} />}
                {saveSuccess ? 'Registros Salvos' : 'Efetivar Balanço Mensal'}
            </button>
        </div>
      </NeonCard>

      {/* RASTREABILIDADE POR COLABORADOR - DETALHANDO HORAS E RECEBIMENTOS */}
      <NeonCard title="Rastreabilidade & Proventos Individuais" glowColor="none" icon={<Receipt size={20} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-500 font-mono uppercase font-black tracking-widest bg-slate-900/40">
                <th className="p-6">Docente / Especialista</th>
                <th className="p-6 text-center">Produção (T1/Q1/PLAN)</th>
                <th className="p-6 text-center">Carga Mensal</th>
                <th className="p-6 text-right">Bruto</th>
                <th className="p-6 text-right text-emerald-400">Líquido Estimado</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-all group">
                  <td className="p-6">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-full border-2 border-slate-700 p-0.5 group-hover:border-cyan-500/50 transition-all shadow-inner">
                            <img src={row.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                        </div>
                        <div>
                            <p className="font-black text-slate-200 text-base group-hover:text-white transition-colors tracking-tight">{row.name}</p>
                            <p className="text-xs text-cyan-400 font-mono uppercase tracking-widest font-bold">{row.role}</p>
                        </div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20" title="Turno Técnico (T1)">{row.hT1}h</span>
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20" title="Qualidade (Q1)">{row.hQ1}h</span>
                        <span className="text-[10px] font-mono text-orange-400 bg-orange-400/10 px-2 py-1 rounded border border-orange-400/20" title="Planejamento (PLAN)">{row.hPLAN}h</span>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    <span className="inline-block px-4 py-2 bg-purple-500/10 text-purple-300 rounded-xl text-base font-black border border-purple-500/20">
                        {row.paidHours}h
                    </span>
                  </td>
                  <td className="p-6 text-right font-mono text-slate-400 font-bold">
                    {formatCurrency(row.totalValue)}
                  </td>
                  <td className="p-6 text-right font-mono text-emerald-400 font-black text-lg">
                    {formatCurrency(row.totalValue * netRatio)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeonCard>

      <div className="bg-sci-panel/80 border border-white/10 p-6 rounded-2xl flex items-start gap-5 shadow-2xl">
          <AlertCircle className="text-cyan-400 shrink-0 w-6 h-6 mt-1" />
          <div className="space-y-2">
              <h4 className="text-sm font-black text-white uppercase tracking-widest">Informação de Conformidade</h4>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Este relatório apresenta o fechamento mensal individualizado. O <strong className="text-emerald-400">Líquido Estimado</strong> é calculado proporcionalmente com base nas deduções globais informadas na calculadora acima. Para relatórios anuais consolidados e previsões de longo prazo, consulte o <strong className="text-purple-400">Dashboard de Gestão</strong>.
              </p>
          </div>
      </div>
    </div>
  );
};

export default ReportsPanel;
