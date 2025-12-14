import React, { useState, useEffect } from 'react';
import { Employee, ShiftType, Schedule } from '../types';
import { SHIFT_COLORS } from '../constants';
import { ChevronLeft, ChevronRight, Wand2, Loader2, Calendar as CalendarIcon, Save } from 'lucide-react';
import NeonCard from './NeonCard';
import { generateSmartSchedule } from '../services/geminiService';

interface ShiftCalendarProps {
    filterEmployeeId?: string | null;
    employees: Employee[];
}

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ filterEmployeeId, employees }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  // Removed local 'employees' state in favor of props
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  // Filter logic
  const displayedEmployees = filterEmployeeId 
    ? employees.filter(e => e.id === filterEmployeeId)
    : employees;

  // Helper to get days in month
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  // Sync schedules with employees list
  useEffect(() => {
    setSchedules(prev => {
        const newSchedules = [...prev];
        
        employees.forEach(emp => {
            // Check if employee already has a schedule
            if (!newSchedules.find(s => s.employeeId === emp.id)) {
                newSchedules.push({
                    employeeId: emp.id,
                    shifts: {}
                });
            }
        });
        return newSchedules;
    });
  }, [employees]);

  const handleGenerateAI = async () => {
    setLoading(true);
    try {
      // Use filtered employees for generation if a filter is active (individual process)
      const aiData = await generateSmartSchedule(
        displayedEmployees, 
        currentDate.getFullYear(), 
        currentDate.getMonth() + 1
      );

      // Map AI data back to our structure
      if (aiData && aiData.length > 0) {
        setSchedules(prev => {
            const newSchedules = [...prev];
            
            // Update only the returned employees
            displayedEmployees.forEach(emp => {
                const empAiData = aiData.find((d: any) => d.employeeName === emp.name) || aiData.find((d:any) => d.employeeId === emp.id);
                
                if (empAiData && empAiData.shifts) {
                     const shifts: Record<string, any> = {};
                     empAiData.shifts.forEach((s: any) => {
                        const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
                        shifts[dayStr] = {
                           date: dayStr,
                           type: s.type as ShiftType
                        };
                     });
                     
                     // Find index in main state
                     const index = newSchedules.findIndex(s => s.employeeId === emp.id);
                     if (index !== -1) {
                         newSchedules[index] = { ...newSchedules[index], shifts };
                     }
                }
            });
            return newSchedules;
        });
        setGenerated(true);
      }
    } catch (e) {
      console.error(e);
      alert('Falha ao gerar escala com IA. Verifique a chave de API.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    const fileName = `escala_rios_${currentDate.getFullYear()}_${String(currentDate.getMonth() + 1).padStart(2, '0')}.json`;
    const dataToSave = {
        month: currentDate.getMonth() + 1,
        year: currentDate.getFullYear(),
        schedules: schedules
    };
    const json = JSON.stringify(dataToSave, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getShiftType = (empId: string, day: number): ShiftType | undefined => {
    const schedule = schedules.find(s => s.employeeId === empId);
    if (!schedule) return undefined;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedule.shifts[dateStr]?.type;
  };

  const cycleShift = (empId: string, day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    setSchedules(prev => prev.map(sch => {
      if (sch.employeeId !== empId) return sch;
      
      const currentType = sch.shifts[dateStr]?.type || ShiftType.OFF;
      let nextType = ShiftType.OFF;

      switch(currentType) {
        case ShiftType.OFF: nextType = ShiftType.T1; break;
        case ShiftType.T1: nextType = ShiftType.PLAN; break;
        case ShiftType.PLAN: nextType = ShiftType.FINAL; break;
        case ShiftType.FINAL: nextType = ShiftType.OFF; break;
      }

      return {
        ...sch,
        shifts: {
          ...sch.shifts,
          [dateStr]: { date: dateStr, type: nextType }
        }
      };
    }));
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Calendar Controls */}
      <NeonCard className="p-0" glowColor="cyan">
        <div className="flex flex-col md:flex-row justify-between items-center p-4 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
              <CalendarIcon className="text-cyan-400 w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide uppercase font-mono">{monthName}</h2>
              <p className="text-xs text-slate-400">
                {filterEmployeeId ? 'Visualização Individual' : 'Planejamento Geral de Equipe'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <button 
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
             >
               <ChevronLeft className="text-slate-300" />
             </button>
             <button 
                onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
             >
               <ChevronRight className="text-slate-300" />
             </button>
          </div>

          <div className="flex gap-3">
             <button 
                onClick={handleGenerateAI}
                disabled={loading}
                className={`
                  flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm tracking-wider uppercase transition-all
                  ${loading 
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-neon-purple'}
                `}
             >
               {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Wand2 className="w-4 h-4" />}
               {loading ? 'IA Process...' : 'Gerar Escala (IA)'}
             </button>
             
             <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm tracking-wider uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all hover:text-white"
             >
                <Save className="w-4 h-4" />
                Salvar / Exportar
             </button>
          </div>
        </div>
      </NeonCard>

      {/* Main Grid */}
      <NeonCard className="overflow-hidden p-0" glowColor="none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-sci-bg p-4 text-left border-b border-r border-white/10 min-w-[200px]">
                  <span className="text-xs font-mono text-slate-500 uppercase">Colaborador</span>
                </th>
                {daysArray.map(day => (
                  <th key={day} className="p-2 min-w-[40px] text-center border-b border-white/10 bg-sci-bg/50">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('pt-BR', { weekday: 'narrow' })}
                      </span>
                      <span className="text-sm font-bold text-slate-300">{day}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedEmployees.map((emp) => (
                <tr key={emp.id} className="group hover:bg-white/5 transition-colors">
                  <td className="sticky left-0 z-10 p-3 border-r border-b border-white/10 bg-[#050b14] group-hover:bg-[#0b1221] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img 
                          src={emp.avatarUrl} 
                          alt={emp.name} 
                          className="w-10 h-10 rounded-full border-2 border-slate-700 group-hover:border-cyan-500/50 transition-colors" 
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#050b14]"></div>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-200">{emp.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono uppercase">{emp.role}</p>
                      </div>
                    </div>
                  </td>
                  {daysArray.map(day => {
                    const shiftType = getShiftType(emp.id, day) || ShiftType.OFF;
                    const styleClass = SHIFT_COLORS[shiftType];
                    
                    return (
                      <td 
                        key={`${emp.id}-${day}`} 
                        onClick={() => cycleShift(emp.id, day)}
                        className="p-1 border-b border-white/5 cursor-pointer relative"
                      >
                         <div className={`
                            w-full h-10 rounded flex items-center justify-center text-[10px] font-bold tracking-tighter transition-all duration-300
                            border
                            ${styleClass}
                            hover:scale-105 hover:z-10
                         `}>
                           {shiftType !== ShiftType.OFF && shiftType}
                         </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NeonCard>
      
      {/* Legend */}
      <div className="flex flex-wrap gap-4 px-4">
         {Object.values(ShiftType).map(type => {
            if (type === ShiftType.OFF) return null;
            return (
                <div key={type} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${SHIFT_COLORS[type].split(' ')[0]}`}></div>
                    <span className="text-xs text-slate-400 font-mono">{type}</span>
                </div>
            )
         })}
      </div>
    </div>
  );
};

export default ShiftCalendar;