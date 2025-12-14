import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Cell } from 'recharts';
import NeonCard from './NeonCard';
import { Employee, Schedule, ShiftType } from '../types';
import { DollarSign, Clock, TrendingUp, Wallet, Download, Activity, Database, FileText, Calendar, ListFilter, Users, Filter } from 'lucide-react';

// Configuração de Valores (Simulação de Regras de Negócio)
const RATES: Record<string, number> = {
  'Engenheira Sênior': 120.00,
  'Técnico Líder': 85.00,
  'Analista de Dados': 70.00,
  'Operador T1': 45.00,
  'Planejamento': 60.00
};

interface ReportsPanelProps {
    filterEmployeeId?: string | null;
    employees: Employee[];
    schedules: Schedule[]; // Dados reais recebidos do App/Calendar
}

const ReportsPanel: React.FC<ReportsPanelProps> = ({ filterEmployeeId, employees, schedules }) => {
  const [internalFilterId, setInternalFilterId] = useState<string>('ALL');

  // Determina qual filtro usar: O obrigatório (props) ou o selecionado (state)
  const activeFilterId = filterEmployeeId || (internalFilterId === 'ALL' ? null : internalFilterId);
  
  // 1. Dados Agregados (Financeiro e Horas Totais)
  const data = useMemo(() => {
    let targetEmployees = employees;
    if (activeFilterId) {
        targetEmployees = employees.filter(e => e.id === activeFilterId);
    }

    return targetEmployees.map(emp => {
        const empSchedule = schedules.find(s => s.employeeId === emp.id);
        const shifts = empSchedule ? Object.values(empSchedule.shifts) : [];

        let t1Count = 0;
        let q1Count = 0;
        let planCount = 0;
        let finalCount = 0;
        let totalHours = 0;
        const activitiesSet = new Set<string>();

        shifts.forEach(shift => {
             if (shift.type === ShiftType.T1) t1Count++;
             else if (shift.type === ShiftType.Q1) q1Count++;
             else if (shift.type === ShiftType.PLAN) planCount++;
             else if (shift.type === ShiftType.FINAL) finalCount++;

             const slots = shift.activeSlots || [];
             totalHours += (slots.length * 4);

             if (shift.type !== ShiftType.FINAL && shift.type !== ShiftType.OFF) {
                 // Prioridade: Detalhe Específico do Slot
                 if (shift.slotDetails) {
                     Object.values(shift.slotDetails).forEach(detail => {
                         if (detail.courseName && detail.courseName.trim() !== '') {
                             activitiesSet.add(detail.courseName);
                         }
                     });
                 }
                 
                 // Fallback: Nome Genérico
                 if (shift.courseName && shift.courseName.trim() !== '') {
                     if (!Array.from(activitiesSet).includes(shift.courseName)) {
                        activitiesSet.add(shift.courseName);
                     }
                 }
             }
        });

        const hourlyRate = RATES[emp.role] || 50;
        const baseValue = totalHours * hourlyRate;
        const bonus = finalCount * (hourlyRate * 0.5 * 12); 
        const totalValue = baseValue + bonus;

        return {
            ...emp,
            t1Count,
            q1Count,
            planCount,
            finalCount,
            totalHours,
            hourlyRate,
            totalValue,
            efficiency: totalHours > 0 ? Math.floor(Math.random() * 10) + 90 : 0,
            recentActivities: Array.from(activitiesSet).slice(0, 5)
        };
    });
  }, [activeFilterId, employees, schedules]);

  // 2. Dados Detalhados por Turno (Novo Relatório)
  const detailedActivities = useMemo(() => {
    const list: any[] = [];
    const targetEmployees = activeFilterId 
        ? employees.filter(e => e.id === activeFilterId) 
        : employees;

    targetEmployees.forEach(emp => {
        const sch = schedules.find(s => s.employeeId === emp.id);
        if (!sch) return;

        // Ordenar datas
        const sortedDates = Object.keys(sch.shifts).sort();

        sortedDates.forEach(dateStr => {
            const shift = sch.shifts[dateStr];
            
            // Ignorar se não tiver slots ativos ou for folga total
            if (!shift.activeSlots || shift.activeSlots.length === 0) return;

            shift.activeSlots.forEach(slotKey => {
                // Recuperar nome do curso específico do slot
                const detail = shift.slotDetails?.[slotKey];
                
                let courseName = detail?.courseName;

                if (!courseName || courseName.trim() === '') {
                    courseName = shift.courseName;
                }

                if (!courseName || courseName.trim() === '') {
                    courseName = `Atividade Padrão (${shift.type})`; 
                }

                // Formatar labels
                let slotLabel = '';
                let slotColor = '';
                
                if (slotKey === 'MORNING') { slotLabel = 'Manhã (07:30 - 11:30)'; slotColor = 'text-emerald-400'; }
                else if (slotKey === 'AFTERNOON') { slotLabel = 'Tarde (13:30 - 17:30)'; slotColor = 'text-orange-400'; }
                else if (slotKey === 'NIGHT') { slotLabel = 'Noite (18:30 - 22:30)'; slotColor = 'text-purple-400'; }

                list.push({
                    id: `${emp.id}-${dateStr}-${slotKey}`,
                    date: dateStr.split('-').reverse().join('/'), // DD/MM/YYYY
                    rawDate: dateStr,
                    empName: emp.name,
                    empAvatar: emp.avatarUrl,
                    empRole: emp.role,
                    slotLabel,
                    slotColor,
                    courseName, 
                    hours: 4
                });
            });
        });
    });
    
    // Ordenar final: Data ASC -> Colaborador -> Turno
    return list.sort((a, b) => {
        if (a.rawDate !== b.rawDate) return a.rawDate.localeCompare(b.rawDate);
        return a.empName.localeCompare(b.empName);
    });
  }, [activeFilterId, employees, schedules]);

  const totalBudget = data.reduce((acc, curr) => acc + curr.totalValue, 0);
  const totalHours = data.reduce((acc, curr) => acc + curr.totalHours, 0);
  const avgEfficiency = data.length > 0 ? Math.round(data.reduce((acc, curr) => acc + curr.efficiency, 0) / data.length) : 0;

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (!schedules || schedules.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-in fade-in">
              <div className="p-4 bg-slate-800/50 rounded-full border border-white/10">
                  <Database className="w-8 h-8 text-slate-500" />
              </div>
              <div>
                  <h3 className="text-xl font-bold text-white">Sem dados de escala</h3>
                  <p className="text-slate-400">Salve uma escala no módulo "Escalas" para gerar relatórios.</p>
              </div>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Filter Bar - Only visible if user is ADMIN (no fixed filter prop) */}
      {!filterEmployeeId && (
        <div className="flex justify-between items-center bg-sci-panel/40 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Filter size={16} className="text-cyan-400" />
                <span className="font-mono uppercase tracking-wider">Filtros de Visualização</span>
            </div>
            <div className="relative group">
                <Users className="absolute left-3 top-2.5 text-slate-500 w-4 h-4 group-hover:text-cyan-400 transition-colors" />
                <select 
                    value={internalFilterId}
                    onChange={(e) => setInternalFilterId(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-slate-900 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-cyan-500/50 appearance-none min-w-[250px] cursor-pointer hover:bg-slate-800 transition-colors"
                >
                    <option value="ALL">Todos os Colaboradores</option>
                    {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} - {emp.role}</option>
                    ))}
                </select>
                {/* Custom arrow indicator */}
                <div className="absolute right-3 top-3 pointer-events-none">
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-slate-400"></div>
                </div>
            </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeonCard glowColor="cyan" className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-mono uppercase mb-1">
                {activeFilterId ? 'Projeção de Ganhos (Filtrado)' : 'Custo Total Projetado'}
            </p>
            <h3 className="text-2xl font-bold text-cyan-400 font-mono">{formatCurrency(totalBudget)}</h3>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
            <DollarSign className="w-6 h-6 text-cyan-400" />
          </div>
        </NeonCard>

        <NeonCard glowColor="purple" className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-mono uppercase mb-1">Total de Horas</p>
            <h3 className="text-2xl font-bold text-purple-400 font-mono">{totalHours}h</h3>
          </div>
          <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
            <Clock className="w-6 h-6 text-purple-400" />
          </div>
        </NeonCard>

        <NeonCard glowColor="orange" className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-mono uppercase mb-1">Índice de Eficiência</p>
            <h3 className="text-2xl font-bold text-orange-400 font-mono">{avgEfficiency}%</h3>
          </div>
          <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/20">
            <TrendingUp className="w-6 h-6 text-orange-400" />
          </div>
        </NeonCard>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeonCard title="Valor Consolidado" glowColor="blue">
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="#64748b" fontSize={10} tickFormatter={(val) => `R$${val/1000}k`} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} width={100} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#0b1221', borderColor: '#1e293b', color: '#f8fafc' }}
                  formatter={(value: number) => [formatCurrency(value), 'Valor']}
                />
                <Bar dataKey="totalValue" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20}>
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#2266ff' : '#00f3ff'} />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </NeonCard>

        <NeonCard title="Distribuição de Horas" glowColor="none">
             <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#bc13fe" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#bc13fe" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} tick={false} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                    contentStyle={{ backgroundColor: '#0b1221', borderColor: '#1e293b', color: '#f8fafc' }}
                />
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <Area type="monotone" dataKey="totalHours" stroke="#bc13fe" fillOpacity={1} fill="url(#colorHours)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </NeonCard>
      </div>

      {/* NEW: Detailed Course/Shift Report */}
      <NeonCard title="Relatório Analítico de Atividades (Cursos & Turnos)" glowColor="cyan" icon={<ListFilter size={16} />}>
        <div className="max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-sci-panel/95 backdrop-blur z-10">
              <tr className="border-b border-white/10 text-xs text-slate-500 font-mono uppercase">
                <th className="p-3 w-32">Data</th>
                <th className="p-3">Colaborador</th>
                <th className="p-3 w-48">Turno</th>
                <th className="p-3">Curso / Atividade</th>
                <th className="p-3 text-center">Carga</th>
              </tr>
            </thead>
            <tbody>
              {detailedActivities.length > 0 ? (
                  detailedActivities.map((row) => (
                    <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors group">
                      <td className="p-3 text-slate-400 font-mono text-xs">
                          <div className="flex items-center gap-2">
                             <Calendar size={12} />
                             {row.date}
                          </div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                            <img src={row.empAvatar} className="w-6 h-6 rounded-full border border-slate-600" alt="" />
                            <span className="text-sm font-semibold text-slate-200">{row.empName}</span>
                        </div>
                      </td>
                      <td className={`p-3 text-xs font-bold ${row.slotColor}`}>
                          {row.slotLabel}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                            <FileText size={14} className="text-slate-500" />
                            <span className="text-sm text-white group-hover:text-cyan-300 transition-colors">
                                {row.courseName}
                            </span>
                        </div>
                      </td>
                      <td className="p-3 text-center text-xs font-mono text-slate-500">
                          {row.hours}h
                      </td>
                    </tr>
                  ))
              ) : (
                  <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 italic">
                          {activeFilterId 
                              ? "Nenhuma atividade encontrada para este colaborador."
                              : "Nenhuma atividade registrada no período selecionado."}
                      </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </NeonCard>

      {/* Original Aggregated Table */}
      <NeonCard title="Resumo Financeiro Consolidado" glowColor="none" icon={<Wallet size={16} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-500 font-mono uppercase">
                <th className="p-4">Colaborador</th>
                <th className="p-4">Resumo de Atividades</th>
                <th className="p-4 text-center">Horas Totais</th>
                <th className="p-4 text-right">Valor Bruto</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                        <img src={row.avatarUrl} className="w-8 h-8 rounded-full border border-slate-600" alt="" />
                        <div>
                            <p className="font-bold text-slate-200 text-sm">{row.name}</p>
                            <p className="text-[10px] text-cyan-400">{row.role}</p>
                        </div>
                    </div>
                  </td>
                  <td className="p-4">
                     <div className="flex flex-wrap gap-1">
                         {row.recentActivities.length > 0 ? (
                             row.recentActivities.map((act, idx) => (
                                 <span key={idx} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] border border-white/10">
                                     {act}
                                 </span>
                             ))
                         ) : (
                             <span className="text-slate-600 text-[10px] italic">Nenhuma atividade reg.</span>
                         )}
                     </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-block px-2 py-1 bg-purple-500/10 text-purple-300 rounded text-xs font-bold border border-purple-500/20">
                        {row.totalHours}h
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-emerald-400 font-bold">
                    {formatCurrency(row.totalValue)}
                  </td>
                  <td className="p-4 text-center">
                    <button className="p-2 hover:bg-cyan-500/20 rounded-lg text-cyan-400 transition-colors">
                        <Download size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeonCard>
    </div>
  );
};

export default ReportsPanel;