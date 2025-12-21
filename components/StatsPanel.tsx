import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import NeonCard from './NeonCard';
import { BarChart3, PieChart as PieChartIcon, Users, UserCheck, Coffee, Search, Activity, Clock, CalendarDays, ClipboardList } from 'lucide-react';
import { Employee, Schedule, ShiftType, Shift } from '../types';

interface StatsPanelProps {
  employees: Employee[];
  schedules: Schedule[];
}

const StatsPanel: React.FC<StatsPanelProps> = ({ employees, schedules }) => {
  const isIndividual = employees.length === 1;

  // Dados de Monitoramento "HOJE"
  const todayStatus = useMemo(() => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    const groups: Record<string, Employee[]> = {
        [ShiftType.T1]: [],
        [ShiftType.Q1]: [],
        [ShiftType.PLAN]: [],
        [ShiftType.OFF]: [],
        [ShiftType.FINAL]: [],
        'IDLE': []
    };

    employees.forEach(emp => {
        const schedule = schedules.find(s => s.employeeId === emp.id);
        const shiftToday = schedule?.shifts[dateStr];

        if (shiftToday) {
            groups[shiftToday.type].push(emp);
        } else {
            groups['IDLE'].push(emp);
        }
    });

    return groups;
  }, [employees, schedules]);

  // Dados de Resumo Mensal por Colaborador
  const monthlySummary = useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return employees.map(emp => {
      const schedule = schedules.find(s => s.employeeId === emp.id);
      const stats = {
        ti: 0,
        qi: 0,
        plan: 0,
        folga: 0,
        final: 0,
        hours40: 0,
        hours20: 0
      };

      if (schedule) {
        Object.entries(schedule.shifts).forEach(([dateStr, shift]: [string, Shift]) => {
          const date = new Date(dateStr + 'T00:00:00');
          if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            if (shift.type === ShiftType.T1) stats.ti++;
            else if (shift.type === ShiftType.Q1) stats.qi++;
            else if (shift.type === ShiftType.PLAN) stats.plan++;
            else if (shift.type === ShiftType.OFF) stats.folga++;
            else if (shift.type === ShiftType.FINAL) stats.final++;

            // Soma de horas para gráficos reais
            if (!isWeekend && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(shift.type)) {
              shift.activeSlots?.forEach(slot => {
                if (slot === 'MORNING' || slot === 'AFTERNOON') stats.hours40 += 4;
                else if (slot === 'NIGHT') stats.hours20 += 4;
              });
            }
          }
        });
      }

      return {
        ...emp,
        ...stats
      };
    });
  }, [employees, schedules]);

  // Dados para o Gráfico de Barras (Horas por Semana) - Agregado dos funcionários filtrados
  const weeklyChartData = useMemo(() => {
    const today = new Date();
    const month = today.getMonth();
    const year = today.getFullYear();
    
    const weeks = [
      { name: 'Sem 1', hours: 0 },
      { name: 'Sem 2', hours: 0 },
      { name: 'Sem 3', hours: 0 },
      { name: 'Sem 4', hours: 0 },
    ];

    employees.forEach(emp => {
      const schedule = schedules.find(s => s.employeeId === emp.id);
      if (schedule) {
        Object.entries(schedule.shifts).forEach(([dateStr, shift]: [string, Shift]) => {
          const date = new Date(dateStr + 'T00:00:00');
          if (date.getMonth() === month && date.getFullYear() === year) {
            const day = date.getDate();
            const weekIdx = Math.min(3, Math.floor((day - 1) / 7));
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;
            
            if (!isWeekend && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(shift.type)) {
               weeks[weekIdx].hours += (shift.activeSlots?.length || 0) * 4;
            }
          }
        });
      }
    });

    return weeks;
  }, [employees, schedules]);

  // Dados para o Gráfico de Pizza (Distribuição de Contratos/Horas)
  const contractDistribution = useMemo(() => {
    let h40 = 0;
    let h20 = 0;
    monthlySummary.forEach(s => {
      h40 += s.hours40;
      h20 += s.hours20;
    });
    
    // Fallback para não quebrar o gráfico se não houver dados
    if (h40 === 0 && h20 === 0) return [
      { name: 'Carga 40h', value: 1, color: '#00f3ff' },
      { name: 'Carga 20h', value: 0, color: '#bc13fe' },
    ];

    return [
      { name: 'Carga 40h', value: h40, color: '#00f3ff' },
      { name: 'Carga 20h', value: h20, color: '#bc13fe' },
    ];
  }, [monthlySummary]);

  const renderGroup = (type: string, label: string, colorClass: string, icon: React.ReactNode) => {
    const list = todayStatus[type] || [];
    if (list.length === 0) return null;

    return (
        <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 space-y-4 hover:border-white/10 transition-all">
            <div className={`flex items-center justify-between border-b border-white/5 pb-2`}>
                <div className={`flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest ${colorClass}`}>
                    {icon}
                    {label}
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorClass.replace('text-', 'bg-').replace('-400', '-500/20')} ${colorClass}`}>
                    {list.length}
                </span>
            </div>
            <div className="flex flex-wrap gap-3">
                {list.map(emp => (
                    <div key={emp.id} className="group relative">
                        <div className={`w-12 h-12 rounded-full border-2 p-0.5 transition-all group-hover:scale-110 group-hover:shadow-lg ${colorClass.replace('text-', 'border-')}`}>
                            <img 
                                src={emp.avatarUrl} 
                                alt={emp.name}
                                className="w-full h-full rounded-full object-cover"
                            />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-sci-panel rounded-full flex items-center justify-center border border-white/10">
                            <div className={`w-2 h-2 rounded-full animate-pulse ${colorClass.replace('text-', 'bg-')}`}></div>
                        </div>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-900 text-[10px] text-white rounded border border-white/10 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                            {emp.name}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* SEÇÃO 1: MONITORAMENTO EM TEMPO REAL */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 ml-1">
            <Activity className="text-cyan-400 w-5 h-5" />
            <h2 className="text-xl font-bold text-white tracking-tight uppercase font-mono">
              {isIndividual ? 'Meu Status Hoje' : 'Status Operacional Hoje'}
            </h2>
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-500/30 to-transparent"></div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Tempo Real</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {renderGroup(ShiftType.T1, 'Técnico (TI)', 'text-emerald-400', <UserCheck size={14}/>)}
            {renderGroup(ShiftType.Q1, 'Qualidade (QI)', 'text-cyan-400', <Search size={14}/>)}
            {renderGroup(ShiftType.PLAN, 'Planejamento', 'text-orange-400', <Clock size={14}/>)}
            {renderGroup(ShiftType.FINAL, 'Plantão', 'text-white', <Users size={14}/>)}
            {renderGroup(ShiftType.OFF, 'Folga', 'text-red-400', <Coffee size={14}/>)}
        </div>
      </div>

      {/* SEÇÃO 2: RESUMO MENSAL POR COLABORADOR */}
      <NeonCard title={isIndividual ? "Meu Resumo Mensal de Atividades" : "Resumo Mensal de Equipe"} glowColor="purple" icon={<ClipboardList size={16} />}>
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/10 text-[10px] text-slate-500 font-mono uppercase tracking-widest bg-slate-900/30">
                        <th className="p-4">Colaborador</th>
                        <th className="p-4 text-center">TI (T1)</th>
                        <th className="p-4 text-center">QI (Q1)</th>
                        <th className="p-4 text-center">PLAN</th>
                        <th className="p-4 text-center">FOLGAS</th>
                        <th className="p-4 text-center">PLANTÕES</th>
                        <th className="p-4 text-right">EFICIÊNCIA</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {monthlySummary.map((row) => {
                        const totalActiveDays = row.ti + row.qi + row.plan;
                        // Estimativa baseada em 20 dias úteis
                        const efficiency = Math.min(100, (totalActiveDays / 20) * 100).toFixed(0);
                        
                        return (
                            <tr key={row.id} className="hover:bg-white/5 transition-colors group">
                                <td className="p-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full border border-white/10 overflow-hidden shadow-inner">
                                            <img src={row.avatarUrl} className="w-full h-full object-cover" alt="" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{row.name}</p>
                                            <p className="text-[10px] text-slate-500 uppercase font-mono tracking-tighter">{row.role}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded border border-emerald-400/20">{row.ti}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded border border-cyan-400/20">{row.qi}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="text-xs font-mono font-bold text-orange-400 bg-orange-400/10 px-2 py-1 rounded border border-orange-400/20">{row.plan}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="text-xs font-mono font-bold text-red-400 bg-red-400/10 px-2 py-1 rounded border border-red-400/20">{row.folga}</span>
                                </td>
                                <td className="p-4 text-center">
                                    <span className="text-xs font-mono font-bold text-slate-300 bg-white/5 px-2 py-1 rounded border border-white/10">{row.final}</span>
                                </td>
                                <td className="p-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                            <div 
                                                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                                                style={{ width: `${efficiency}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400">{efficiency}%</span>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
      </NeonCard>

      {/* SEÇÃO 3: GRÁFICOS ANALÍTICOS DINÂMICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeonCard title={isIndividual ? "Minha Carga Horária Semanal" : "Carga Horária da Equipe"} glowColor="blue" icon={<BarChart3 size={16} />}>
          <div className="h-[250px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0b1221', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                  itemStyle={{ color: '#00f3ff' }}
                  cursor={{fill: 'rgba(255,255,255,0.03)'}}
                />
                <Bar dataKey="hours" name="Horas" fill="#2266ff" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </NeonCard>

        <NeonCard title={isIndividual ? "Minha Distribuição de Carga" : "Distribuição de Contratos"} glowColor="purple" icon={<PieChartIcon size={16} />}>
          <div className="h-[250px] w-full flex items-center justify-center relative pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contractDistribution}
                  innerRadius={70}
                  outerRadius={95}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {contractDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0b1221', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-3xl font-bold text-white tracking-tighter">RIOS</span>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Analytics</span>
            </div>
          </div>
        </NeonCard>
      </div>
    </div>
  );
};

export default StatsPanel;