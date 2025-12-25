
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import NeonCard from './NeonCard';
import { Employee, Schedule, ShiftType, Shift, ClassGroup, CourseGroup } from '../types';
import { 
  DollarSign, Clock, Activity, Calculator, ShieldCheck, 
  Target, Settings, ArrowDownRight, ArrowUpRight, 
  Landmark, Filter, MinusCircle, AlertCircle, Save, CheckCircle,
  BookOpen, CheckCircle2, XCircle, School, Info, Receipt, TrendingUp,
  Users, User, Search, ChevronDown, Timer, Calendar, Ban,
  Gift, Cake, CalendarDays, Award, GraduationCap, ClipboardList,
  ArrowRight, Building2, MapPin, Tag, FileText, Table, ChevronLeft, ChevronRight,
  LayoutList, Layers
} from 'lucide-react';
import { PORTO_VELHO_HOLIDAYS, ANNUAL_CR_2025 } from '../constants';

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
    classes?: ClassGroup[];
    courseGroups?: CourseGroup[];
}

const ReportsPanel: React.FC<ReportsPanelProps> = ({ 
    filterEmployeeId, 
    employees, 
    schedules, 
    initialDeductions,
    onSaveDeductions,
    hourlyRate,
    selectedDate,
    classes = [],
    courseGroups = []
}) => {
  const [activeTab, setActiveTab] = useState<'FINANCE' | 'COURSES' | 'HR'>('FINANCE');
  const [coursesSubTab, setCoursesSubTab] = useState<'ANALYTIC' | 'GROUPS'>('ANALYTIC');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [localFilterId, setLocalFilterId] = useState<string | 'ALL'>('ALL');
  const [annualReportYear, setAnnualReportYear] = useState(2025);
  
  const [deductions, setDeductions] = useState<Record<string, DeductionState>>(initialDeductions || {
    '40H': { ir: 0, inss: 0, unimed: 0 },
    '20H': { ir: 0, inss: 0, unimed: 0 }
  });

  useEffect(() => {
    if (filterEmployeeId) {
        setLocalFilterId(filterEmployeeId);
    }
  }, [filterEmployeeId]);

  useEffect(() => {
    if (initialDeductions) {
        setDeductions(initialDeductions);
    }
  }, [initialDeductions]);

  const formattedMonthYear = selectedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  
  const isBusinessDay = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return !PORTO_VELHO_HOLIDAYS.includes(`${mm}-${dd}`);
  };

  const getCourseStatus = useCallback((startStr: string, endStr: string, cancelled: boolean): 'open' | 'ongoing' | 'completed' | 'cancelled' => {
      if (cancelled) return 'cancelled';
      
      const now = new Date();
      now.setHours(0,0,0,0);
      const start = new Date(startStr + 'T12:00:00');
      const end = new Date(endStr + 'T12:00:00');
      
      const diffStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const diffEnd = Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));

      if (diffEnd >= 1) return 'completed'; 
      if (diffStart >= 4) return 'ongoing';   
      if (diffStart >= 0) return 'open';      
      return 'open'; 
  }, []);

  const checkActiveAssignment = useCallback((empId: string, dateStr: string, slotKey: 'MORNING' | 'AFTERNOON' | 'NIGHT', currentSchedulesList: Schedule[]) => {
    const empSchedule = currentSchedulesList.find(s => s.employeeId === empId);
    if (!empSchedule) return null;
    const directShift = empSchedule.shifts[dateStr];
    if (directShift && directShift.activeSlots?.includes(slotKey)) {
        return { 
          type: directShift.type, 
          courseName: directShift.slotDetails?.[slotKey]?.courseName || directShift.courseName,
          turmaName: directShift.slotDetails?.[slotKey]?.turmaName,
          schoolName: directShift.slotDetails?.[slotKey]?.schoolName,
          startDateStr: directShift.slotDetails?.[slotKey]?.startDateStr || dateStr,
          endDateStr: directShift.slotDetails?.[slotKey]?.endDateStr || dateStr,
          isCancelled: directShift.slotDetails?.[slotKey]?.isCancelled || false
        };
    }
    for (const shift of Object.values(empSchedule.shifts) as Shift[]) {
        const detail = shift.slotDetails?.[slotKey];
        if (detail && detail.startDateStr && detail.endDateStr) {
            if (dateStr >= detail.startDateStr && dateStr <= detail.endDateStr) {
                return { 
                  type: shift.type, 
                  courseName: detail.courseName,
                  turmaName: detail.turmaName,
                  schoolName: detail.schoolName,
                  startDateStr: detail.startDateStr,
                  endDateStr: detail.endDateStr,
                  isCancelled: detail.isCancelled || false
                };
            }
        }
    }
    return null;
  }, []);

  const currentTargetEmployees = useMemo(() => {
    if (localFilterId === 'ALL') return employees;
    return employees.filter(e => e.id === localFilterId);
  }, [localFilterId, employees]);

  // ANIVERSARIANTES DO MÊS
  const birthdays = useMemo(() => {
    const targetMonth = selectedDate.getMonth();
    return employees.filter(emp => {
      if (!emp.birthDate) return false;
      const bDate = new Date(emp.birthDate + 'T12:00:00');
      return bDate.getMonth() === targetMonth;
    }).sort((a, b) => {
      const dayA = new Date(a.birthDate! + 'T12:00:00').getDate();
      const dayB = new Date(b.birthDate! + 'T12:00:00').getDate();
      return dayA - dayB;
    });
  }, [employees, selectedDate]);

  const financeData = useMemo(() => {
    const month = selectedDate.getMonth();
    const year = selectedDate.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return currentTargetEmployees.map(emp => {
        let h40 = 0, h20 = 0;
        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(year, month, d);
            if (!isBusinessDay(dateObj)) continue;
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            (['MORNING', 'AFTERNOON', 'NIGHT'] as const).forEach(slot => {
                const asgn = checkActiveAssignment(emp.id, dateStr, slot, schedules);
                if (asgn && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(asgn.type) && !asgn.isCancelled) {
                    if (slot === 'NIGHT') h20 += 4; else h40 += 4;
                }
            });
        }
        return { ...emp, h40, h20, totalHours: h40 + h20, gross40: h40 * hourlyRate, gross20: h20 * hourlyRate, totalGross: (h40 + h20) * hourlyRate };
    });
  }, [currentTargetEmployees, schedules, hourlyRate, selectedDate, checkActiveAssignment]);

  const summaryTotals = useMemo(() => {
    let totalGross40 = 0, totalGross20 = 0, totalHours = 0;
    financeData.forEach(d => {
        totalGross40 += d.gross40;
        totalGross20 += d.gross20;
        totalHours += d.totalHours;
    });

    const net40 = totalGross40 - (deductions['40H']?.ir || 0) - (deductions['40H']?.inss || 0) - (deductions['40H']?.unimed || 0);
    const net20 = totalGross20 - (deductions['20H']?.ir || 0) - (deductions['20H']?.inss || 0) - (deductions['20H']?.unimed || 0);

    const totalIR = (deductions['40H']?.ir || 0) + (deductions['20H']?.ir || 0);
    const totalINSS = (deductions['40H']?.inss || 0) + (deductions['20H']?.inss || 0);
    const totalTaxes = totalIR + totalINSS;
    const totalUnimed = (deductions['40H']?.unimed || 0) + (deductions['20H']?.unimed || 0);
    
    return { 
        totalGross: totalGross40 + totalGross20, 
        totalHours, 
        totalIR,
        totalINSS,
        totalTaxes, 
        totalUnimed, 
        totalNet: net40 + net20,
        netByContract: {
            '40H': net40,
            '20H': net20
        }
    };
  }, [financeData, deductions]);

  // SINCRONIZAÇÃO ANUAL COM O FILTRO
  const synchronizedAnnualData = useMemo(() => {
    const isFiltered = localFilterId !== 'ALL';
    const totalEmployees = employees.length || 1;
    const currentMonthIdx = selectedDate.getMonth();

    return ANNUAL_CR_2025.map((item, idx) => {
        if (annualReportYear === 2025 && idx === currentMonthIdx) {
            return {
                ...item,
                g40: isFiltered ? summaryTotals.totalGross * 0.7 : item.g40,
                g20: isFiltered ? summaryTotals.totalGross * 0.3 : item.g20,
                ir: summaryTotals.totalIR,
                inss: summaryTotals.totalINSS,
                totalDeductions: summaryTotals.totalTaxes,
                unimed: summaryTotals.totalUnimed,
                totalReal: summaryTotals.totalNet
            };
        }

        const scale = isFiltered ? (1 / totalEmployees) : 1;
        const yearScale = annualReportYear === 2025 ? 1 : 0; 

        return {
            ...item,
            g40: item.g40 * scale * yearScale,
            g20: item.g20 * scale * yearScale,
            ir: ((item as any).ir || (item.totalDeductions * 0.4)) * scale * yearScale,
            inss: ((item as any).inss || (item.totalDeductions * 0.6)) * scale * yearScale,
            totalDeductions: item.totalDeductions * scale * yearScale,
            unimed: item.unimed * scale * yearScale,
            totalReal: item.totalReal * scale * yearScale
        };
    });
  }, [localFilterId, employees, summaryTotals, annualReportYear, selectedDate]);

  const annualSummaryTotals = useMemo(() => {
    return synchronizedAnnualData.reduce((acc, curr) => ({
      g40: acc.g40 + curr.g40,
      g20: acc.g20 + curr.g20,
      ir: acc.ir + (curr.ir || 0),
      inss: acc.inss + (curr.inss || 0),
      deductions: acc.deductions + curr.totalDeductions,
      unimed: acc.unimed + curr.unimed,
      real: acc.real + curr.totalReal
    }), { g40: 0, g20: 0, ir: 0, inss: 0, deductions: 0, unimed: 0, real: 0 });
  }, [synchronizedAnnualData]);

  const courseStats = useMemo(() => {
    const stats = {
      total: 0, open: 0, ongoing: 0, completed: 0, cancelled: 0,
      detailed: [] as any[],
      t1Courses: new Set<string>(),
      q1Courses: new Set<string>(),
      schoolsAttended: new Set<string>(),
    };
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const processedCourses = new Set<string>();

    currentTargetEmployees.forEach(emp => {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        (['MORNING', 'AFTERNOON', 'NIGHT'] as const).forEach(slot => {
          const asgn = checkActiveAssignment(emp.id, dateStr, slot, schedules);
          if (asgn && asgn.courseName && asgn.courseName !== 'Fim de Semana') {
            const courseKey = `${emp.id}-${asgn.courseName}-${asgn.startDateStr}-${asgn.endDateStr}-${slot}`;
            if (!processedCourses.has(courseKey)) {
              processedCourses.add(courseKey);
              const status = getCourseStatus(asgn.startDateStr!, asgn.endDateStr!, asgn.isCancelled);
              stats.total++;
              stats[status]++;
              if (asgn.type === ShiftType.T1) stats.t1Courses.add(asgn.courseName);
              else if (asgn.type === ShiftType.Q1) stats.q1Courses.add(asgn.courseName);
              if (asgn.schoolName && !asgn.isCancelled) stats.schoolsAttended.add(asgn.schoolName);
              stats.detailed.push({
                courseName: asgn.courseName,
                instructor: emp.name,
                school: asgn.schoolName,
                status,
                start: asgn.startDateStr,
                end: asgn.endDateStr,
                type: asgn.type
              });
            }
          }
        });
      }
    });
    return stats;
  }, [currentTargetEmployees, schedules, selectedDate, checkActiveAssignment, getCourseStatus]);

  // Auditoria por Grupo de Cursos
  const courseGroupAudit = useMemo(() => {
    return classes.map(cls => {
      const group = courseGroups.find(g => g.name === cls.courseGroupName);
      const groupCourses = group ? group.courses : [];
      const auditDetails = groupCourses.map(courseName => {
        let isMinistrado = false;
        let instructors = new Set<string>();
        let minDate: string | null = null;
        let maxDate: string | null = null;

        // Varre todos os schedules para encontrar registros desta turma e curso
        schedules.forEach(sch => {
          const emp = employees.find(e => e.id === sch.employeeId);
          Object.values(sch.shifts).forEach((s: any) => {
            (['MORNING', 'AFTERNOON', 'NIGHT'] as const).forEach(slot => {
              const detail = s.slotDetails?.[slot];
              if (detail && detail.turmaName === cls.name && detail.courseName === courseName && !detail.isCancelled) {
                isMinistrado = true;
                if (emp) instructors.add(emp.name);
                if (!minDate || detail.startDateStr < minDate) minDate = detail.startDateStr;
                if (!maxDate || detail.endDateStr > maxDate) maxDate = detail.endDateStr;
              }
            });
          });
        });

        return {
          name: courseName,
          isMinistrado,
          instructors: Array.from(instructors),
          start: minDate,
          end: maxDate
        };
      });

      const totalCourses = auditDetails.length;
      const ministradosCount = auditDetails.filter(d => d.isMinistrado).length;
      const pendingCount = totalCourses - ministradosCount;

      return {
        turma: cls.name,
        group: cls.courseGroupName || 'Sem Grupo',
        total: totalCourses,
        ministrados: ministradosCount,
        pendentes: pendingCount,
        details: auditDetails
      };
    }).filter(a => a.total > 0);
  }, [classes, courseGroups, schedules, employees]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-sci-panel/40 p-5 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20"><Filter size={20} /></div>
              <div>
                  <h3 className="text-xs font-mono font-black text-slate-500 uppercase tracking-widest">Filtro de Relatório</h3>
                  <div className="flex items-center gap-2 text-white"><span className="text-sm font-bold">{localFilterId === 'ALL' ? 'Todos os Colaboradores' : employees.find(e => e.id === localFilterId)?.name}</span></div>
              </div>
          </div>
          <div className="relative w-full md:w-80">
              <Users className="absolute left-4 top-3.5 text-slate-500 w-4 h-4" /><select disabled={!!filterEmployeeId} value={localFilterId} onChange={(e) => setLocalFilterId(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-cyan-500/50 font-bold shadow-inner appearance-none cursor-pointer disabled:opacity-50">
                  {!filterEmployeeId && <option value="ALL">Consolidado Geral</option>}
                  {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
              </select>{!filterEmployeeId && <ChevronDown className="absolute right-4 top-4 text-slate-500 pointer-events-none w-4 h-4" />}
          </div>
      </div>

      <div className="flex bg-sci-panel/60 p-1 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg sticky top-0 z-[40] overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('FINANCE')} className={`flex-1 min-w-[150px] flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'FINANCE' ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-400 hover:text-slate-300'}`}><Calculator size={18} /> Financeiro</button>
          <button onClick={() => setActiveTab('COURSES')} className={`flex-1 min-w-[150px] flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'COURSES' ? 'bg-purple-600 text-white shadow-neon-purple' : 'text-slate-400 hover:text-slate-300'}`}><BookOpen size={18} /> Auditoria Cursos</button>
          <button onClick={() => setActiveTab('HR')} className={`flex-1 min-w-[150px] flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-black uppercase tracking-widest transition-all ${activeTab === 'HR' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-slate-400 hover:text-slate-300'}`}><Gift size={18} /> Recursos Humanos</button>
      </div>

      {activeTab === 'FINANCE' && (
        <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <NeonCard glowColor="cyan" className="bg-cyan-500/5"><div className="flex items-center gap-5"><div className="p-4 bg-cyan-500/10 rounded-2xl text-cyan-400"><DollarSign size={32} /></div><div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Receita Real Mês</p><p className="text-2xl font-bold text-white font-mono">{formatCurrency(summaryTotals.totalNet)}</p></div></div></NeonCard>
                <NeonCard glowColor="purple" className="bg-purple-500/5"><div className="flex items-center gap-5"><div className="p-4 bg-purple-500/10 rounded-2xl text-purple-400"><TrendingUp size={32} /></div><div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Faturamento Bruto</p><p className="text-2xl font-bold text-white font-mono">{formatCurrency(summaryTotals.totalGross)}</p></div></div></NeonCard>
                <NeonCard glowColor="orange" className="bg-red-500/5 border-red-500/10"><div className="flex items-center gap-5"><div className="p-4 bg-red-500/10 rounded-2xl text-red-400"><MinusCircle size={32} /></div><div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Deduções Fiscais</p><p className="text-2xl font-bold text-red-400 font-mono">{formatCurrency(summaryTotals.totalTaxes)}</p></div></div></NeonCard>
                <NeonCard glowColor="none" className="bg-blue-500/5 border-blue-500/10"><div className="flex items-center gap-5"><div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400"><ShieldCheck size={32} /></div><div><p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold mb-1">Plano Unimed</p><p className="text-2xl font-bold text-blue-400 font-mono">{formatCurrency(summaryTotals.totalUnimed)}</p></div></div></NeonCard>
            </div>
            
            <NeonCard glowColor="cyan" title={`Calculadora de Deduções - ${formattedMonthYear}`} icon={<Receipt size={20} />}><div className="overflow-x-auto mb-8"><table className="w-full text-sm font-mono border-collapse"><thead><tr className="text-slate-500 uppercase border-b border-white/20 font-black"><th className="p-4 text-left">CONTRATO</th><th className="p-4 text-right">I.R.</th><th className="p-4 text-right">INSS</th><th className="p-4 text-right">UNIMED</th><th className="p-4 text-right text-emerald-400">LÍQUIDO TOTAL</th></tr></thead><tbody>{(['40H', '20H'] as const).map(type => (<tr key={type} className="border-b border-white/10 hover:bg-white/5 transition-colors"><td className="p-5 font-black text-white uppercase text-xs">Contrato {type}</td><td className="p-5 text-right"><input type="number" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 w-28 text-right text-red-400 focus:outline-none focus:border-red-500/50 font-bold" value={deductions[type]?.ir || ''} onChange={(e) => setDeductions(prev => ({...prev, [type]: {...prev[type], ir: parseFloat(e.target.value) || 0}}))} /></td><td className="p-5 text-right"><input type="number" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 w-28 text-right text-red-400 focus:outline-none focus:border-red-500/50 font-bold" value={deductions[type]?.inss || ''} onChange={(e) => setDeductions(prev => ({...prev, [type]: {...prev[type], inss: parseFloat(e.target.value) || 0}}))} /></td><td className="p-5 text-right"><input type="number" className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 w-28 text-right text-red-400 focus:outline-none focus:border-red-500/50 font-bold" value={deductions[type]?.unimed || ''} onChange={(e) => setDeductions(prev => ({...prev, [type]: {...prev[type], unimed: parseFloat(e.target.value) || 0}}))} /></td><td className="p-5 text-right font-black text-white">{formatCurrency(summaryTotals.netByContract[type])}</td></tr>))}</tbody></table></div><div className="flex justify-end pt-6 border-t border-white/10"><button onClick={() => { if(onSaveDeductions) onSaveDeductions(deductions); setSaveSuccess(true); setTimeout(()=>setSaveSuccess(false), 3000); }} className={`flex items-center gap-4 px-10 py-4 rounded-xl font-black text-sm uppercase transition-all shadow-2xl ${saveSuccess ? 'bg-emerald-600' : 'bg-cyan-600'}`}>{saveSuccess ? <CheckCircle size={24} /> : <Save size={24} />} {saveSuccess ? 'Registros Salvos' : 'Efetivar Balanço Mensal'}</button></div></NeonCard>

            <NeonCard glowColor="none" className="p-0 border-emerald-500/20 bg-emerald-500/5" title={`Resumo Geral Anual (Performance CR ${annualReportYear})`} icon={<Table className="text-emerald-400" size={20} />}>
                <div className="flex items-center gap-4 p-4 border-b border-emerald-500/20 bg-emerald-950/20">
                    <span className="text-[10px] font-mono text-emerald-500/70 uppercase font-black">Ciclo Fiscal:</span>
                    <div className="flex items-center bg-slate-950 border border-emerald-500/30 rounded-lg p-0.5">
                        <button onClick={() => setAnnualReportYear(y => y - 1)} className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded transition-colors"><ChevronLeft size={14}/></button>
                        <span className="px-4 text-xs font-mono font-black text-white">{annualReportYear}</span>
                        <button onClick={() => setAnnualReportYear(y => y + 1)} className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded transition-colors"><ChevronRight size={14}/></button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] md:text-xs font-mono border-collapse bg-[#0b1b1b]/60">
                        <thead>
                            <tr className="bg-emerald-900/40 text-emerald-300 font-black uppercase tracking-widest italic">
                                <th className="p-4 text-left border border-emerald-500/30">Mês / Período</th>
                                <th className="p-4 text-right border border-emerald-500/30">Ganho 40H</th>
                                <th className="p-4 text-right border border-emerald-500/30">Ganho 20H</th>
                                <th className="p-4 text-right border border-emerald-500/30">I. Renda</th>
                                <th className="p-4 text-right border border-emerald-500/30">INSS</th>
                                <th className="p-4 text-right border border-emerald-500/30">Unimed</th>
                                <th className="p-4 text-right border border-emerald-500/30 text-emerald-400">Receita Real</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-emerald-500/20">
                            {synchronizedAnnualData.map((item, idx) => (
                                <tr key={idx} className={`hover:bg-emerald-500/10 transition-colors ${idx === selectedDate.getMonth() && annualReportYear === 2025 ? 'bg-emerald-500/5' : ''}`}>
                                    <td className="p-4 font-black text-emerald-200 uppercase border-r border-emerald-500/20 bg-emerald-950/40">
                                        {item.label}
                                        {idx === selectedDate.getMonth() && annualReportYear === 2025 && <span className="ml-2 text-[8px] bg-cyan-600 px-1 rounded text-white font-black animate-pulse">LIVE</span>}
                                    </td>
                                    <td className="p-4 text-right text-emerald-100/80 border-r border-emerald-500/20">{formatCurrency(item.g40)}</td>
                                    <td className="p-4 text-right text-emerald-100/80 border-r border-emerald-500/20">{formatCurrency(item.g20)}</td>
                                    <td className="p-4 text-right text-emerald-100/80 border-r border-emerald-500/20">{formatCurrency((item as any).ir || (item.totalDeductions * 0.4))}</td>
                                    <td className="p-4 text-right text-emerald-100/80 border-r border-emerald-500/20">{formatCurrency((item as any).inss || (item.totalDeductions * 0.6))}</td>
                                    <td className="p-4 text-right text-blue-300 border-r border-emerald-500/20">{formatCurrency(item.unimed)}</td>
                                    <td className="p-4 text-right font-black text-emerald-400 shadow-[inset_0_0_10px_rgba(52,211,153,0.05)]">{formatCurrency(item.totalReal)}</td>
                                </tr>
                            ))}
                            <tr className="bg-emerald-900/60 font-black text-emerald-400 border-t-2 border-emerald-500/40">
                                <td className="p-5 text-right uppercase tracking-widest border border-emerald-500/30">Total Anual {annualReportYear}</td>
                                <td className="p-5 text-right border border-emerald-500/30">{formatCurrency(annualSummaryTotals.g40)}</td>
                                <td className="p-5 text-right border border-emerald-500/30">{formatCurrency(annualSummaryTotals.g20)}</td>
                                <td className="p-5 text-right border border-emerald-500/30">{formatCurrency(annualSummaryTotals.ir)}</td>
                                <td className="p-5 text-right border border-emerald-500/30">{formatCurrency(annualSummaryTotals.inss)}</td>
                                <td className="p-5 text-right border border-emerald-500/30 text-blue-200">{formatCurrency(annualSummaryTotals.unimed)}</td>
                                <td className="p-5 text-right text-emerald-200 bg-emerald-700/40 border border-emerald-500/30 shadow-neon-emerald">{formatCurrency(annualSummaryTotals.real)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </NeonCard>
        </div>
      )}

      {activeTab === 'COURSES' && (
        <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
            {/* SUBMENU AUDITORIA */}
            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5 w-fit">
                <button onClick={() => setCoursesSubTab('ANALYTIC')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${coursesSubTab === 'ANALYTIC' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-500 hover:text-slate-400'}`}>Analítico Individual</button>
                <button onClick={() => setCoursesSubTab('GROUPS')} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${coursesSubTab === 'GROUPS' ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30' : 'text-slate-500 hover:text-slate-400'}`}>Progresso por Turma</button>
            </div>

            {coursesSubTab === 'ANALYTIC' ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <NeonCard glowColor="cyan" className="bg-cyan-500/5"><div className="flex items-center gap-4"><div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400"><ClipboardList size={24} /></div><div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black mb-1">Total Mês</p><p className="text-xl font-black text-white font-mono">{courseStats.total}</p></div></div></NeonCard>
                    </div>
                    
                    <NeonCard title="Analítico de Turmas" icon={<GraduationCap size={20}/>}>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-white/10 text-[10px] text-slate-500 font-mono uppercase font-black bg-slate-900/40">
                                        <th className="p-4">Curso / Eixo</th>
                                        <th className="p-4">Instrutor</th>
                                        <th className="p-4">Unidade</th>
                                        <th className="p-4 text-center">Início</th>
                                        <th className="p-4 text-center">Término</th>
                                        <th className="p-4 text-center">Status Auditoria</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courseStats.detailed.map((course, idx) => (
                                        <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                            <td className="p-4 flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${course.type === ShiftType.T1 ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                                                    <BookOpen size={14} />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-200 uppercase">{course.courseName}</p>
                                                </div>
                                            </td>
                                            <td className="p-4 text-xs font-bold text-slate-400">{course.instructor}</td>
                                            <td className="p-4 text-xs font-bold text-slate-500 uppercase">{course.school}</td>
                                            <td className="p-4 text-center text-[10px] font-mono font-black text-cyan-400">{course.start?.split('-').reverse().join('/')}</td>
                                            <td className="p-4 text-center text-[10px] font-mono font-black text-purple-400">{course.end?.split('-').reverse().join('/')}</td>
                                            <td className="p-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                                    course.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10' :
                                                    course.status === 'ongoing' ? 'text-purple-400 bg-purple-500/10' :
                                                    course.status === 'cancelled' ? 'text-red-400 bg-red-500/10' :
                                                    'text-blue-400 bg-blue-500/10'
                                                }`}>
                                                    {course.status.toUpperCase()}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </NeonCard>
                </>
            ) : (
                <div className="space-y-6">
                    {courseGroupAudit.length > 0 ? courseGroupAudit.map((audit, idx) => (
                        <NeonCard key={idx} title={`Turma: ${audit.turma} - ${audit.group}`} icon={<LayoutList size={20} className="text-purple-400" />}>
                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                                <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                                    <p className="text-[10px] font-mono text-slate-500 uppercase font-black mb-1">Total do Grupo</p>
                                    <p className="text-2xl font-black text-white">{audit.total} <span className="text-xs text-slate-600">Cursos</span></p>
                                </div>
                                <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                    <p className="text-[10px] font-mono text-emerald-500/70 uppercase font-black mb-1">Ministrados</p>
                                    <p className="text-2xl font-black text-emerald-400">{audit.ministrados}</p>
                                </div>
                                <div className="p-4 bg-red-500/5 rounded-2xl border border-red-500/10">
                                    <p className="text-[10px] font-mono text-red-500/70 uppercase font-black mb-1">Pendentes</p>
                                    <p className="text-2xl font-black text-red-400">{audit.pendentes}</p>
                                </div>
                                <div className="p-4 bg-purple-500/5 rounded-2xl border border-purple-500/10">
                                    <p className="text-[10px] font-mono text-purple-500/70 uppercase font-black mb-1">Progresso</p>
                                    <div className="flex items-end gap-3">
                                        <p className="text-2xl font-black text-purple-400">{Math.round((audit.ministrados / audit.total) * 100)}%</p>
                                        <div className="flex-1 h-2 bg-slate-900 rounded-full mb-2 overflow-hidden">
                                            <div className="h-full bg-purple-500 shadow-neon-purple" style={{ width: `${(audit.ministrados / audit.total) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] text-slate-500 font-mono uppercase font-black border-b border-white/10">
                                            <th className="p-4">Status</th>
                                            <th className="p-4">Curso do Grupo</th>
                                            <th className="p-4">Período Letivo</th>
                                            <th className="p-4">Professores Envolvidos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {audit.details.map((course, cIdx) => (
                                            <tr key={cIdx} className={`transition-colors ${course.isMinistrado ? 'bg-emerald-500/5' : 'hover:bg-white/5'}`}>
                                                <td className="p-4">
                                                    {course.isMinistrado ? (
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400 shadow-neon-emerald">
                                                            <CheckCircle2 size={20} />
                                                        </div>
                                                    ) : (
                                                        <div className="w-8 h-8 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-center text-slate-600">
                                                            <div className="w-4 h-4 rounded-full border-2 border-slate-700" />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <p className={`text-xs font-black uppercase ${course.isMinistrado ? 'text-white' : 'text-slate-500'}`}>{course.name}</p>
                                                </td>
                                                <td className="p-4">
                                                    {course.isMinistrado ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-mono font-bold text-cyan-400">{course.start?.split('-').reverse().join('/')}</span>
                                                            <span className="text-[10px] font-mono font-bold text-purple-400">{course.end?.split('-').reverse().join('/')}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-mono text-slate-700 italic">Cronograma pendente</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-2">
                                                        {course.instructors.length > 0 ? course.instructors.map((ins, iIdx) => (
                                                            <span key={iIdx} className="px-2 py-0.5 bg-slate-800 border border-white/10 rounded text-[9px] font-black text-slate-300 uppercase">
                                                                {ins}
                                                            </span>
                                                        )) : (
                                                            <span className="text-[10px] text-slate-700 italic">Sem atribuição</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </NeonCard>
                    )) : (
                        <div className="p-20 text-center bg-slate-900/20 rounded-3xl border border-dashed border-white/10">
                            <Layers className="mx-auto w-12 h-12 text-slate-700 mb-4" />
                            <p className="text-slate-500 font-mono font-black uppercase tracking-widest">Nenhuma turma com grupo vinculado detectada</p>
                        </div>
                    )}
                </div>
            )}
        </div>
      )}

      {activeTab === 'HR' && (
        <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {birthdays.map(emp => (
                    <NeonCard key={emp.id} glowColor="cyan" className="group">
                        <div className="flex flex-col items-center text-center space-y-4">
                            <img src={emp.avatarUrl} className="w-16 h-16 rounded-full border-2 border-emerald-500/30 p-1" />
                            <div>
                                <p className="text-sm font-black text-white uppercase tracking-tight">{emp.name}</p>
                                <p className="text-lg font-black text-emerald-400 font-mono">DIA {new Date(emp.birthDate! + 'T12:00:00').getDate()}</p>
                            </div>
                        </div>
                    </NeonCard>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};

export default ReportsPanel;
