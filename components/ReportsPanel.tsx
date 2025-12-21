import React, { useMemo, useState, useEffect } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Cell } from 'recharts';
import NeonCard from './NeonCard';
import { Employee, Schedule, ShiftType, Shift } from '../types';
import { DollarSign, Clock, TrendingUp, Wallet, Download, Activity, Database, FileText, Calendar, ListFilter, Users, Filter, Coffee, MinusCircle, PlusCircle, AlertCircle, Save, CheckCircle } from 'lucide-react';

const HOURLY_RATE = 32.00;

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
}

const ReportsPanel: React.FC<ReportsPanelProps> = ({ 
    filterEmployeeId, 
    employees, 
    schedules, 
    initialDeductions,
    onSaveDeductions 
}) => {
  const [internalFilterId, setInternalFilterId] = useState<string>('ALL');
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  const [deductions, setDeductions] = useState<Record<string, DeductionState>>(initialDeductions || {
    '40H': { ir: 0, inss: 0, unimed: 0 },
    '20H': { ir: 0, inss: 0, unimed: 0 }
  });

  // Sync with initialDeductions if they change from parent
  useEffect(() => {
    if (initialDeductions) {
        setDeductions(initialDeductions);
    }
  }, [initialDeductions]);

  const activeFilterId = filterEmployeeId || (internalFilterId === 'ALL' ? null : internalFilterId);
  
  const data = useMemo(() => {
    let targetEmployees = employees;
    if (activeFilterId) {
        targetEmployees = employees.filter(e => e.id === activeFilterId);
    }

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    return targetEmployees.map(emp => {
        const empSchedule = schedules.find(s => s.employeeId === emp.id);
        const shiftsMap = empSchedule?.shifts || {};

        let paidHours40 = 0; 
        let paidHours20 = 0; 
        let totalHoursReference = 0;
        let folgaCount = 0;

        for (let d = 1; d <= daysInMonth; d++) {
            const dateObj = new Date(currentYear, currentMonth, d);
            const dayOfWeek = dateObj.getDay(); 
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const shift = shiftsMap[dateStr];
            
            if (shift) {
                const slots = shift.activeSlots || [];
                
                if (!isWeekend && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(shift.type)) {
                    totalHoursReference += slots.length * 4;
                    slots.forEach(slot => {
                        if (slot === 'MORNING' || slot === 'AFTERNOON') {
                            paidHours40 += 4;
                        } else if (slot === 'NIGHT') {
                            paidHours20 += 4;
                        }
                    });
                }

                if (!isWeekend) {
                    if (![ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(shift.type)) {
                        folgaCount++;
                    } else if (slots.length === 0) {
                        folgaCount++;
                    }
                }
            } else {
                if (!isWeekend) {
                    folgaCount++;
                }
            }
        }

        const totalValue = (paidHours40 + paidHours20) * HOURLY_RATE;

        return {
            ...emp,
            paidHours40,
            paidHours20,
            paidHours: paidHours40 + paidHours20,
            totalHoursReference,
            totalValue,
            folgaCount
        };
    });
  }, [activeFilterId, employees, schedules]);

  const summaryTotals = useMemo(() => {
    let h40 = 0;
    let h20 = 0;
    let totalFolgas = 0;

    data.forEach(d => {
        h40 += d.paidHours40;
        h20 += d.paidHours20;
        totalFolgas += d.folgaCount;
    });

    const g40 = h40 * HOURLY_RATE;
    const g20 = h20 * HOURLY_RATE;

    const r40 = g40 - (deductions['40H'].ir + deductions['40H'].inss + deductions['40H'].unimed);
    const r20 = g20 - (deductions['20H'].ir + deductions['20H'].inss + deductions['20H'].unimed);

    return {
        h40, h20, g40, g20, r40, r20,
        totalHours: h40 + h20,
        totalNet: r40 + r20,
        totalFolgas
    };
  }, [data, deductions]);

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

  if (!schedules || schedules.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-in fade-in">
              <div className="p-4 bg-slate-800/50 rounded-full border border-white/10">
                  <Database className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-xl font-bold text-white">Sem dados de escala</h3>
              <p className="text-slate-400 text-sm max-w-xs">Os relatórios financeiros e de carga horária serão ativados após o salvamento das primeiras escalas.</p>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {!filterEmployeeId && (
        <div className="flex justify-between items-center bg-sci-panel/40 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-mono uppercase tracking-widest">
                <Filter size={14} className="text-cyan-400" />
                Filtros Analíticos
            </div>
            <select 
                value={internalFilterId}
                onChange={(e) => setInternalFilterId(e.target.value)}
                className="bg-slate-900 border border-white/10 rounded-lg text-xs text-white px-4 py-2 focus:outline-none focus:border-cyan-500/50 min-w-[200px]"
            >
                <option value="ALL">Todos os Colaboradores</option>
                {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
            </select>
        </div>
      )}

      {/* BLOCO: RESUMO DO MÊS */}
      <NeonCard glowColor="cyan" className="bg-[#0b1221]/80 border-white/5" title="Resumo Consolidado do Período" icon={<Calendar size={16} />}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-[#050b14] p-4 rounded-xl border border-white/5">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">Carga 40H (Úteis)</p>
                <p className="text-2xl font-bold text-white">{summaryTotals.h40} h</p>
            </div>
            <div className="bg-[#050b14] p-4 rounded-xl border border-white/5">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">Carga 20H (Úteis)</p>
                <p className="text-2xl font-bold text-white">{summaryTotals.h20} h</p>
            </div>
            <div className="bg-[#050b14] p-4 rounded-xl border border-white/5">
                <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">Total Remunerado</p>
                <p className="text-2xl font-bold text-white">{summaryTotals.totalHours} h</p>
            </div>
            <div className="bg-red-900/10 p-4 rounded-xl border border-red-500/20">
                <p className="text-[10px] font-mono text-red-400 uppercase tracking-tighter">Total Folgas Úteis</p>
                <div className="flex items-center gap-2">
                    <Coffee size={14} className="text-red-400" />
                    <p className="text-2xl font-bold text-white">{summaryTotals.totalFolgas} d</p>
                </div>
            </div>
            <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <p className="text-[10px] font-mono text-blue-400 uppercase tracking-tighter">Líquido Estimado</p>
                <p className="text-2xl font-bold text-white font-mono">{formatCurrency(summaryTotals.totalNet)}</p>
            </div>
        </div>

        <div className="overflow-x-auto mb-6">
            <table className="w-full text-[10px] font-mono border-collapse">
                <thead>
                    <tr className="text-slate-500 uppercase border-b border-white/10">
                        <th className="p-3 text-left">CATEGORIA (DIAS ÚTEIS)</th>
                        <th className="p-3 text-center">HORAS TRAB.</th>
                        <th className="p-3 text-right">VALOR BRUTO</th>
                        <th className="p-3 text-right">DESC. IR</th>
                        <th className="p-3 text-right">DESC. INSS</th>
                        <th className="p-3 text-right">DESC. UNIMED</th>
                        <th className="p-3 text-right">TOTAL LÍQUIDO</th>
                    </tr>
                </thead>
                <tbody className="text-slate-300">
                    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-white">CONTRATO 40H (M/T)</td>
                        <td className="p-4 text-center">{summaryTotals.h40} h</td>
                        <td className="p-4 text-right text-slate-400">{summaryTotals.g40.toFixed(2)}</td>
                        <td className="p-4 text-right">
                            <input 
                                type="number" 
                                className="bg-slate-900 border border-white/10 rounded px-2 py-1 w-20 text-right text-red-400 focus:outline-none focus:border-red-500/50"
                                value={deductions['40H'].ir || ''}
                                onChange={(e) => handleDeductionChange('40H', 'ir', e.target.value)}
                            />
                        </td>
                        <td className="p-4 text-right">
                             <input 
                                type="number" 
                                className="bg-slate-900 border border-white/10 rounded px-2 py-1 w-20 text-right text-red-400 focus:outline-none focus:border-red-500/50"
                                value={deductions['40H'].inss || ''}
                                onChange={(e) => handleDeductionChange('40H', 'inss', e.target.value)}
                            />
                        </td>
                        <td className="p-4 text-right">
                             <input 
                                type="number" 
                                className="bg-slate-900 border border-white/10 rounded px-2 py-1 w-20 text-right text-red-400 focus:outline-none focus:border-red-500/50"
                                value={deductions['40H'].unimed || ''}
                                onChange={(e) => handleDeductionChange('40H', 'unimed', e.target.value)}
                            />
                        </td>
                        <td className="p-4 text-right font-bold text-white">R$ {summaryTotals.r40.toFixed(2)}</td>
                    </tr>
                    <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-4 font-bold text-white">CONTRATO 20H (N)</td>
                        <td className="p-4 text-center">{summaryTotals.h20} h</td>
                        <td className="p-4 text-right text-slate-400">{summaryTotals.g20.toFixed(2)}</td>
                        <td className="p-4 text-right">
                            <input 
                                type="number" 
                                className="bg-slate-900 border border-white/10 rounded px-2 py-1 w-20 text-right text-red-400 focus:outline-none focus:border-red-500/50"
                                value={deductions['20H'].ir || ''}
                                onChange={(e) => handleDeductionChange('20H', 'ir', e.target.value)}
                            />
                        </td>
                        <td className="p-4 text-right">
                             <input 
                                type="number" 
                                className="bg-slate-900 border border-white/10 rounded px-2 py-1 w-20 text-right text-red-400 focus:outline-none focus:border-red-500/50"
                                value={deductions['20H'].inss || ''}
                                onChange={(e) => handleDeductionChange('20H', 'inss', e.target.value)}
                            />
                        </td>
                        <td className="p-4 text-right">
                             <input 
                                type="number" 
                                className="bg-slate-900 border border-white/10 rounded px-2 py-1 w-20 text-right text-red-400 focus:outline-none focus:border-red-500/50"
                                value={deductions['20H'].unimed || ''}
                                onChange={(e) => handleDeductionChange('20H', 'unimed', e.target.value)}
                            />
                        </td>
                        <td className="p-4 text-right font-bold text-white">R$ {summaryTotals.r20.toFixed(2)}</td>
                    </tr>
                </tbody>
                <tfoot>
                    <tr className="bg-slate-900/50 font-bold">
                        <td className="p-4 text-white uppercase">Totais Gerais (Úteis)</td>
                        <td className="p-4 text-center text-white">{summaryTotals.totalHours} h</td>
                        <td className="p-4 text-right text-white">R$ {(summaryTotals.g40 + summaryTotals.g20).toFixed(2)}</td>
                        <td className="p-4 text-right text-red-500">- R$ {(deductions['40H'].ir + deductions['20H'].ir).toFixed(2)}</td>
                        <td className="p-4 text-right text-red-500">- R$ {(deductions['40H'].inss + deductions['20H'].inss).toFixed(2)}</td>
                        <td className="p-4 text-right text-red-500">- R$ {(deductions['40H'].unimed + deductions['20H'].unimed).toFixed(2)}</td>
                        <td className="p-4 text-right text-emerald-400 font-bold text-base">R$ {summaryTotals.totalNet.toFixed(2)}</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* Botão Salvar Deduções - Mais visível */}
        <div className="flex justify-end pt-6 border-t border-white/5">
            <button 
                onClick={handleSave}
                className={`
                    flex items-center gap-3 px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-widest transition-all shadow-lg
                    ${saveSuccess 
                        ? 'bg-emerald-600 text-white shadow-neon-emerald' 
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-neon-cyan border border-white/10'}
                `}
            >
                {saveSuccess ? <CheckCircle size={18} /> : <Save size={18} />}
                {saveSuccess ? 'Dados Financeiros Registrados' : 'Salvar Alterações Financeiras'}
            </button>
        </div>
      </NeonCard>

      {/* Tabela Individual Detalhada */}
      <NeonCard title="Monitoramento Financeiro e de Disponibilidade" glowColor="none" icon={<Wallet size={16} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] text-slate-500 font-mono uppercase">
                <th className="p-4">Colaborador / Perfil</th>
                <th className="p-4 text-center">Folgas (Dias Úteis)</th>
                <th className="p-4 text-center">Horas Remuneradas</th>
                <th className="p-4 text-center">Carga Útil (40h/20h)</th>
                <th className="p-4 text-right">Bruto Útil (R$ 32/h)</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-slate-700 p-0.5 group-hover:border-cyan-500/50 transition-colors">
                            <img src={row.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-200 text-sm">{row.name}</p>
                            <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">{row.role}</p>
                        </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                        <span className={`text-sm font-bold flex items-center gap-1.5 ${row.folgaCount > 0 ? 'text-red-400' : 'text-slate-500'}`}>
                            <Coffee size={12} /> {row.folgaCount} dias
                        </span>
                        <span className="text-[9px] text-slate-600 font-mono uppercase">Dias úteis s/ turno</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-block px-3 py-1 bg-purple-500/10 text-purple-300 rounded-md text-sm font-bold border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
                        {row.paidHours}h
                    </span>
                  </td>
                  <td className="p-4 text-center text-[10px] font-mono text-slate-400">
                    <div className="space-x-2">
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded">{row.paidHours40}h (MT)</span>
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded">{row.paidHours20}h (N)</span>
                    </div>
                  </td>
                  <td className="p-4 text-right font-mono text-emerald-400 font-bold text-sm">
                    {formatCurrency(row.totalValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeonCard>

      {/* Alerta de Política de Folgas */}
      <div className="bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl flex items-start gap-4 animate-pulse">
          <AlertCircle className="text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
              <h4 className="text-xs font-bold text-blue-300 uppercase tracking-widest">Política de Cálculo e Remuneração</h4>
              <p className="text-[10px] text-blue-400/80 leading-relaxed">
                  Conforme diretriz: <strong>Finais de semana (Sábados e Domingos) não são contabilizados</strong> para fins de horas trabalhadas ou remuneração financeira, mesmo se houver turnos marcados. 
                  O valor da hora-aula é fixado em <strong>R$ 32,00</strong>. Horas nos turnos Manhã e Tarde (M/T) compõem a carga de 40h, enquanto o turno Noite (N) compõe a carga de 20h, exclusivamente em dias úteis.
              </p>
          </div>
      </div>
    </div>
  );
};

export default ReportsPanel;