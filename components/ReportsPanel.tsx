
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell, PieChart, Pie, Legend } from 'recharts';
import NeonCard from './NeonCard';
import { Employee, Schedule, ShiftType, Shift, ClassGroup, CourseGroup, FinancialRecord } from '../types';
import { 
  DollarSign, Clock, Activity, Calculator, ShieldCheck, 
  Target, Settings, ArrowDownRight, ArrowUpRight, 
  Landmark, Filter, MinusCircle, AlertCircle, Save, CheckCircle,
  BookOpen, CheckCircle2, XCircle, School, Info, Receipt, TrendingUp,
  Users, User, Search, ChevronDown, Timer, Calendar, Ban,
  Gift, Cake, CalendarDays, Award, GraduationCap, ClipboardList,
  ArrowRight, Building2, MapPin, Tag, FileText, Table, ChevronLeft, ChevronRight,
  LayoutList, Layers, FileUp, Loader2, Sparkles, AlertTriangle
} from 'lucide-react';
import { PORTO_VELHO_HOLIDAYS, ANNUAL_CR_2025 } from '../constants';
import { parseFinancialDocument } from '../services/geminiService';

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
    importedRecords?: Record<string, FinancialRecord[]>;
    onSaveImportedRecords?: (empId: string, records: FinancialRecord[]) => void;
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
    courseGroups = [],
    importedRecords = {},
    onSaveImportedRecords
}) => {
  const [activeTab, setActiveTab] = useState<'FINANCE' | 'COURSES' | 'HR'>('FINANCE');
  const [coursesSubTab, setCoursesSubTab] = useState<'ANALYTIC' | 'GROUPS'>('ANALYTIC');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [localFilterId, setLocalFilterId] = useState<string | 'ALL'>('ALL');
  const [annualReportYear, setAnnualReportYear] = useState(2025);
  const [auditStatusFilter, setAuditStatusFilter] = useState<string>('ALL');
  
  // IA Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rawOcrText, setRawOcrText] = useState('');

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

  const handleImportIA = async () => {
    if (!rawOcrText.trim() || localFilterId === 'ALL') return;
    setImporting(true);
    try {
        const result = await parseFinancialDocument(rawOcrText);
        if (result && result.length > 0) {
            const formattedRecords: FinancialRecord[] = result.map(r => ({
                ...r,
                source: 'AI_IMPORT',
                timestamp: new Date().toISOString()
            }));
            if (onSaveImportedRecords) {
                onSaveImportedRecords(localFilterId, formattedRecords);
            }
            setShowImportModal(false);
            setRawOcrText('');
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        }
    } catch (e) {
        console.error("AI Import fail", e);
    } finally {
        setImporting(false);
    }
  };

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
      const diffEnd = Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
      const diffStart = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
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
        netByContract: { '40H': net40, '20H': net20 }
    };
  }, [financeData, deductions]);

  const synchronizedAnnualData = useMemo(() => {
    const isFiltered = localFilterId !== 'ALL';
    const totalEmployees = employees.length || 1;
    const currentMonthIdx = selectedDate.getMonth();
    const records = isFiltered ? (importedRecords[localFilterId] || []) : [];

    return Array.from({ length: 12 }, (_, idx) => {
        const label = ANNUAL_CR_2025[idx].label;
        const histItem = ANNUAL_CR_2025[idx];
        const imported = records.find(r => r.month === idx && r.year === annualReportYear);

        if (imported) {
            return {
                label,
                g40: imported.gross * 0.7,
                g20: imported.gross * 0.3,
                ir: imported.ir,
                inss: imported.inss,
                totalDeductions: imported.ir + imported.inss,
                unimed: imported.unimed || 0,
                totalReal: imported.net,
                source: 'AI_IMPORT'
            };
        }

        if (annualReportYear === 2025 && idx === currentMonthIdx) {
            return {
                ...histItem,
                g40: isFiltered ? summaryTotals.totalGross * 0.7 : histItem.g40,
                g20: isFiltered ? summaryTotals.totalGross * 0.3 : histItem.g20,
                ir: summaryTotals.totalIR,
                inss: summaryTotals.totalINSS,
                totalDeductions: summaryTotals.totalTaxes,
                unimed: summaryTotals.totalUnimed,
                totalReal: summaryTotals.totalNet,
                source: 'LIVE'
            };
        }

        const scale = isFiltered ? (1 / totalEmployees) : 1;
        return {
            ...histItem,
            g40: histItem.g40 * scale,
            g20: histItem.g20 * scale,
            totalDeductions: histItem.totalDeductions * scale,
            unimed: histItem.unimed * scale,
            totalReal: histItem.totalReal * scale,
            source: 'HISTORIC'
        };
    });
  }, [localFilterId, employees, summaryTotals, annualReportYear, selectedDate, importedRecords]);

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

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* MODAL IMPORTAÇÃO IA */}
      {showImportModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xl p-6">
              <div className="w-full max-w-2xl bg-sci-panel border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6 animate-in zoom-in-95">
                  <div className="flex items-center gap-4">
                      <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400"><FileUp size={24}/></div>
                      <div>
                          <h3 className="text-xl font-black text-white uppercase tracking-tight">Smart Fiscal Import</h3>
                          <p className="text-xs text-slate-500 font-mono">Extração de dados via OCR inteligente e Gemini AI</p>
                      </div>
                  </div>
                  <div className="space-y-2">
                      <label className="text-[10px] font-mono text-cyan-400 uppercase font-black">Cole o texto extraído do PDF/Foto aqui:</label>
                      <textarea 
                        className="w-full h-64 bg-slate-950 border border-white/10 rounded-2xl p-4 text-xs font-mono text-slate-300 focus:outline-none focus:border-cyan-500" 
                        placeholder="Ex: Funcionário: 300174987... VENCIMENTO Jan: 3.328,00..."
                        value={rawOcrText}
                        onChange={(e) => setRawOcrText(e.target.value)}
                      />
                  </div>
                  <div className="flex gap-4">
                      <button onClick={() => setShowImportModal(false)} className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-black text-xs uppercase border border-white/10">Abortar</button>
                      <button onClick={handleImportIA} disabled={importing || !rawOcrText} className="flex-1 py-4 bg-cyan-600 text-white rounded-xl font-black text-xs uppercase shadow-neon-cyan flex items-center justify-center gap-3">
                          {importing ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                          Efetuar Processamento
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-sci-panel/40 p-5 rounded-2xl border border-white/10 backdrop-blur-md shadow-lg">
          <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20"><Filter size={20} /></div>
              <div>
                  <h3 className="text-xs font-mono font-black text-slate-500 uppercase tracking-widest">Filtro de Relatório</h3>
                  <div className="flex items-center gap-2 text-white"><span className="text-sm font-bold">{localFilterId === 'ALL' ? 'Todos os Colaboradores' : employees.find(e => e.id === localFilterId)?.name}</span></div>
              </div>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
              <div className="relative flex-1 md:w-80">
                  <Users className="absolute left-4 top-3.5 text-slate-500 w-4 h-4" /><select disabled={!!filterEmployeeId} value={localFilterId} onChange={(e) => setLocalFilterId(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-cyan-500/50 font-bold shadow-inner appearance-none cursor-pointer disabled:opacity-50">
                      {!filterEmployeeId && <option value="ALL">Consolidado Geral</option>}
                      {employees.map(emp => (<option key={emp.id} value={emp.id}>{emp.name}</option>))}
                  </select>{!filterEmployeeId && <ChevronDown className="absolute right-4 top-4 text-slate-500 pointer-events-none w-4 h-4" />}
              </div>
              {localFilterId !== 'ALL' && (
                  <button onClick={() => setShowImportModal(true)} className="px-6 py-3.5 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-neon-purple flex items-center gap-2 hover:scale-105 transition-all">
                      <FileUp size={16}/> Importar PDF
                  </button>
              )}
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

            <NeonCard glowColor="none" className="p-0 border-emerald-500/20 bg-emerald-500/5" title={`Resumo Geral Anual (Ciclo Fiscal Performance)`} icon={<Table className="text-emerald-400" size={20} />}>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-b border-emerald-500/20 bg-emerald-950/20">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-mono text-emerald-500/70 uppercase font-black">Ciclo Fiscal:</span>
                        <div className="flex items-center bg-slate-950 border border-emerald-500/30 rounded-lg p-0.5">
                            <button onClick={() => setAnnualReportYear(y => y - 1)} className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded transition-colors"><ChevronLeft size={14}/></button>
                            <span className="px-4 text-xs font-mono font-black text-white">{annualReportYear}</span>
                            <button onClick={() => setAnnualReportYear(y => y + 1)} className="p-1.5 hover:bg-emerald-500/10 text-emerald-500 rounded transition-colors"><ChevronRight size={14}/></button>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-[8px] font-mono bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30 font-black"><CheckCircle2 size={10}/> IA IMPORTADO</span>
                        <span className="flex items-center gap-1.5 text-[8px] font-mono bg-cyan-600/20 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 font-black"><Activity size={10}/> CÁLCULO LIVE</span>
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
                                <tr key={idx} className={`hover:bg-emerald-500/10 transition-colors ${item.source === 'AI_IMPORT' ? 'bg-purple-900/10' : ''}`}>
                                    <td className="p-4 font-black text-emerald-200 uppercase border-r border-emerald-500/20 bg-emerald-950/40 flex items-center justify-between">
                                        <span>{item.label}</span>
                                        {item.source === 'AI_IMPORT' && <Sparkles className="text-purple-400 animate-pulse" size={10}/>}
                                        {item.source === 'LIVE' && <Activity className="text-cyan-400" size={10}/>}
                                    </td>
                                    <td className="p-4 text-right text-emerald-100/80 border-r border-emerald-500/20">{formatCurrency(item.g40)}</td>
                                    <td className="p-4 text-right text-emerald-100/80 border-r border-emerald-500/20">{formatCurrency(item.g20)}</td>
                                    <td className="p-4 text-right text-red-300/80 border-r border-emerald-500/20">{formatCurrency(item.ir || 0)}</td>
                                    <td className="p-4 text-right text-red-300/80 border-r border-emerald-500/20">{formatCurrency(item.inss || 0)}</td>
                                    <td className="p-4 text-right text-blue-300 border-r border-emerald-500/20">{formatCurrency(item.unimed)}</td>
                                    <td className={`p-4 text-right font-black border-r border-emerald-500/20 ${item.source === 'AI_IMPORT' ? 'text-purple-300' : 'text-emerald-400'}`}>{formatCurrency(item.totalReal)}</td>
                                </tr>
                            ))}
                            <tr className="bg-emerald-900/60 font-black text-emerald-400 border-t-2 border-emerald-500/40">
                                <td className="p-5 text-right uppercase tracking-widest border border-emerald-500/30">Consolidado Anual</td>
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
      {/* ... tabs COURSES e HR permanecem inalteradas ... */}
    </div>
  );
};

export default ReportsPanel;
