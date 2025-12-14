import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Cell } from 'recharts';
import NeonCard from './NeonCard';
import { Employee, Schedule, ShiftType } from '../types';
import { DollarSign, Clock, TrendingUp, Wallet, Download, Activity, Database } from 'lucide-react';

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
  
  const data = useMemo(() => {
    let targetEmployees = employees;
    if (filterEmployeeId) {
        targetEmployees = employees.filter(e => e.id === filterEmployeeId);
    }

    return targetEmployees.map(emp => {
        // Encontrar escala do funcionário
        const empSchedule = schedules.find(s => s.employeeId === emp.id);
        const shifts = empSchedule ? Object.values(empSchedule.shifts) : [];

        // Calcular contadores reais
        let t1Count = 0;
        let q1Count = 0;
        let planCount = 0;
        let finalCount = 0;
        let totalHours = 0;
        const activitiesSet = new Set<string>();

        shifts.forEach(shift => {
             // Contagem de tipos
             if (shift.type === ShiftType.T1) t1Count++;
             else if (shift.type === ShiftType.Q1) q1Count++;
             else if (shift.type === ShiftType.PLAN) planCount++;
             else if (shift.type === ShiftType.FINAL) finalCount++;

             // Cálculo de horas (4h por slot ativo)
             const slots = shift.activeSlots || [];
             totalHours += (slots.length * 4);

             // Coletar atividades (excluindo vazios ou "Final de Semana")
             if (shift.courseName && shift.type !== ShiftType.FINAL && shift.type !== ShiftType.OFF) {
                 activitiesSet.add(shift.courseName);
             }
        });

        // Cálculos financeiros
        const hourlyRate = RATES[emp.role] || 50;
        const baseValue = totalHours * hourlyRate;
        const bonus = finalCount * (hourlyRate * 0.5 * 12); // Exemplo de bônus
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
            efficiency: totalHours > 0 ? Math.floor(Math.random() * 10) + 90 : 0, // Mock efficiency if active
            recentActivities: Array.from(activitiesSet).slice(0, 3) // Top 3 activities
        };
    });
  }, [filterEmployeeId, employees, schedules]);

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
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <NeonCard glowColor="cyan" className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-mono uppercase mb-1">
                {filterEmployeeId ? 'Projeção de Ganhos' : 'Custo Total Projetado'}
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

      {/* Detailed Table */}
      <NeonCard title="Detalhamento Financeiro e Atividades" glowColor="none" icon={<Wallet size={16} />}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-500 font-mono uppercase">
                <th className="p-4">Colaborador</th>
                <th className="p-4">Atividades Recentes</th>
                <th className="p-4 text-center">Horas</th>
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