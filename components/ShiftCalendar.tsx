import React, { useState, useEffect, useCallback } from 'react';
import { Employee, ShiftType, Schedule, Shift } from '../types';
import { SHIFT_COLORS, PORTO_VELHO_HOLIDAYS, SHIFT_SLOTS } from '../constants';
import { ChevronLeft, ChevronRight, Wand2, Loader2, Calendar as CalendarIcon, Save, BookOpen, Calculator, CalendarDays, ArrowRight, Sun, Sunset, Moon, CheckSquare, Square } from 'lucide-react';
import NeonCard from './NeonCard';
import { generateSmartSchedule } from '../services/geminiService';

interface ShiftCalendarProps {
    filterEmployeeId?: string | null;
    employees: Employee[];
}

// Configuração individual para cada turno dentro do modal
interface SlotConfig {
    active: boolean;
    startDateStr: string;
    totalHours: number;
    endDateStr: string; // Calculada
}

interface EditingShiftState {
    employeeId: string;
    baseDateStr: string; // A data que foi clicada (referência)
    type: ShiftType;
    courseName: string;
    
    // Configurações independentes para cada turno
    slots: {
        MORNING: SlotConfig;
        AFTERNOON: SlotConfig;
        NIGHT: SlotConfig;
    };
}

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ filterEmployeeId, employees }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal State
  const [editingState, setEditingState] = useState<EditingShiftState | null>(null);

  // Filter logic
  const displayedEmployees = filterEmployeeId 
    ? employees.filter(e => e.id === filterEmployeeId)
    : employees;

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  // --- Helpers defined before useEffect ---

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

  const isNonWorkingDay = useCallback((date: Date): boolean => {
    const dayOfWeek = date.getDay(); // 0 = Sun, 6 = Sat
    if (dayOfWeek === 0 || dayOfWeek === 6) return true;

    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const key = `${mm}-${dd}`;

    return PORTO_VELHO_HOLIDAYS.includes(key);
  }, []);

  const formatDateStr = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
  };

  const parseDateStr = (dateStr: string): Date => {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  };

  // --- Automatic Schedule Initialization ---
  useEffect(() => {
    setSchedules(prev => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInCurrentMonth = getDaysInMonth(year, month);
        
        const newSchedules = employees.map(emp => {
            const existingSchedule = prev.find(s => s.employeeId === emp.id);
            const shifts = existingSchedule ? { ...existingSchedule.shifts } : {};

            for (let day = 1; day <= daysInCurrentMonth; day++) {
                const dateObj = new Date(year, month, day);
                const dateStr = formatDateStr(dateObj);

                if (isNonWorkingDay(dateObj)) {
                    shifts[dateStr] = {
                        date: dateStr,
                        type: ShiftType.FINAL,
                        activeSlots: ['MORNING', 'AFTERNOON', 'NIGHT'],
                        courseName: 'Final de Semana / Feriado'
                    };
                } else {
                    if (!shifts[dateStr]) {
                       // Keep empty for manual/AI filling
                    }
                }
            }

            return {
                employeeId: emp.id,
                shifts: shifts
            };
        });
        
        return newSchedules;
    });
  }, [employees, currentDate, isNonWorkingDay]);

  const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const calculateWorkingDates = (startDateStr: string, totalHours: number): string[] => {
      if (!startDateStr) return [];
      if (totalHours <= 0) return [startDateStr];

      const durationInDays = Math.ceil(totalHours / 4); 
      const validDates: string[] = [];
      
      let currentDateIterator = parseDateStr(startDateStr);
      let safetyCounter = 0;

      while (validDates.length < durationInDays && safetyCounter < 365) {
          if (!isNonWorkingDay(currentDateIterator)) {
              validDates.push(formatDateStr(currentDateIterator));
          }
          currentDateIterator.setDate(currentDateIterator.getDate() + 1);
          safetyCounter++;
      }

      return validDates;
  };

  const handleGenerateAI = async () => {
    setLoading(true);
    try {
      const aiData = await generateSmartSchedule(
        displayedEmployees, 
        currentDate.getFullYear(), 
        currentDate.getMonth() + 1
      );

      if (aiData && aiData.length > 0) {
        setSchedules(prev => {
            const newSchedules = [...prev];
            displayedEmployees.forEach(emp => {
                const empAiData = aiData.find((d: any) => d.employeeName === emp.name) || aiData.find((d:any) => d.employeeId === emp.id);
                
                if (empAiData && empAiData.shifts) {
                     const shifts: Record<string, any> = {};
                     const existingEmpShifts = prev.find(s => s.employeeId === emp.id)?.shifts || {};
                     Object.assign(shifts, existingEmpShifts);

                     empAiData.shifts.forEach((s: any) => {
                        const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
                        const type = s.type as ShiftType;
                        
                        let defaultSlots: ('MORNING'|'AFTERNOON'|'NIGHT')[] = [];
                        
                        if (type === ShiftType.FINAL) {
                            defaultSlots = ['MORNING', 'AFTERNOON', 'NIGHT'];
                        } else if (type === ShiftType.T1 || type === ShiftType.Q1) {
                            defaultSlots = ['MORNING', 'AFTERNOON'];
                        } else if (type === ShiftType.PLAN) {
                            defaultSlots = ['MORNING'];
                        }
                        
                        shifts[dayStr] = {
                           date: dayStr,
                           type: type,
                           activeSlots: type === ShiftType.OFF ? [] : defaultSlots
                        };
                     });
                     
                     const index = newSchedules.findIndex(s => s.employeeId === emp.id);
                     if (index !== -1) {
                         newSchedules[index] = { ...newSchedules[index], shifts };
                     }
                }
            });
            return newSchedules;
        });
      }
    } catch (e) {
      console.error(e);
      alert('Falha ao gerar escala com IA. Verifique a chave de API.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFile = () => {
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

  const getShift = (empId: string, day: number): Shift | undefined => {
    const schedule = schedules.find(s => s.employeeId === empId);
    if (!schedule) return undefined;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return schedule.shifts[dateStr];
  };

  const openShiftEditor = (empId: string, day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existingShift = schedules.find(s => s.employeeId === empId)?.shifts[dateStr];

    const currentSlots = existingShift?.activeSlots || [];

    setEditingState({
        employeeId: empId,
        baseDateStr: dateStr,
        type: existingShift?.type || ShiftType.T1,
        courseName: existingShift?.courseName || '',
        slots: {
            MORNING: {
                active: currentSlots.includes('MORNING'),
                startDateStr: dateStr,
                totalHours: 0,
                endDateStr: dateStr
            },
            AFTERNOON: {
                active: currentSlots.includes('AFTERNOON'),
                startDateStr: dateStr,
                totalHours: 0,
                endDateStr: dateStr
            },
            NIGHT: {
                active: currentSlots.includes('NIGHT'),
                startDateStr: dateStr,
                totalHours: 0,
                endDateStr: dateStr
            }
        }
    });
  };

  const saveShiftDetails = () => {
      if (!editingState) return;

      setSchedules(prev => prev.map(sch => {
          if (sch.employeeId !== editingState.employeeId) return sch;

          const updatedShifts = { ...sch.shifts };

          const addSlotToDay = (dateStr: string, slot: 'MORNING' | 'AFTERNOON' | 'NIGHT') => {
              if (!updatedShifts[dateStr]) {
                  updatedShifts[dateStr] = {
                      date: dateStr,
                      type: editingState.type, 
                      courseName: editingState.courseName,
                      activeSlots: []
                  };
              } else {
                  updatedShifts[dateStr].type = editingState.type;
                  updatedShifts[dateStr].courseName = editingState.courseName;
              }
              
              const slots = updatedShifts[dateStr].activeSlots || [];
              if (!slots.includes(slot)) {
                  slots.push(slot);
              }
              updatedShifts[dateStr].activeSlots = slots;
          };

          if (editingState.slots.MORNING.active) {
              const dates = calculateWorkingDates(editingState.slots.MORNING.startDateStr, editingState.slots.MORNING.totalHours || 4);
              dates.forEach(d => addSlotToDay(d, 'MORNING'));
          }

          if (editingState.slots.AFTERNOON.active) {
              const dates = calculateWorkingDates(editingState.slots.AFTERNOON.startDateStr, editingState.slots.AFTERNOON.totalHours || 4);
              dates.forEach(d => addSlotToDay(d, 'AFTERNOON'));
          }

          if (editingState.slots.NIGHT.active) {
              const dates = calculateWorkingDates(editingState.slots.NIGHT.startDateStr, editingState.slots.NIGHT.totalHours || 4);
              dates.forEach(d => addSlotToDay(d, 'NIGHT'));
          }

          // Case: User selected OFF, we must create the record even if no slots active
          if (editingState.type === ShiftType.OFF && 
              !editingState.slots.MORNING.active && 
              !editingState.slots.AFTERNOON.active && 
              !editingState.slots.NIGHT.active) {
                
             const dateStr = editingState.baseDateStr;
             updatedShifts[dateStr] = {
                date: dateStr,
                type: ShiftType.OFF,
                courseName: 'Folga',
                activeSlots: []
             };
          }

          return {
              ...sch,
              shifts: updatedShifts
          };
      }));
      setEditingState(null);
  };

  const updateSlotConfig = (slotName: 'MORNING' | 'AFTERNOON' | 'NIGHT', field: keyof SlotConfig, value: any) => {
      if (!editingState) return;

      const currentSlotConfig = editingState.slots[slotName];
      let newConfig = { ...currentSlotConfig, [field]: value };

      if (field === 'startDateStr' || field === 'totalHours') {
          const startDate = field === 'startDateStr' ? value : currentSlotConfig.startDateStr;
          const hours = field === 'totalHours' ? Number(value) : currentSlotConfig.totalHours;
          
          const dates = calculateWorkingDates(startDate, hours);
          const newEndDate = dates.length > 0 ? dates[dates.length - 1] : startDate;
          newConfig.endDateStr = newEndDate;
      }

      setEditingState({
          ...editingState,
          slots: {
              ...editingState.slots,
              [slotName]: newConfig
          }
      });
  };

  const toggleSlot = (slotName: 'MORNING' | 'AFTERNOON' | 'NIGHT') => {
      if (!editingState) return;
      updateSlotConfig(slotName, 'active', !editingState.slots[slotName].active);
  };

  // Helper to determine slot color based on type
  const getSlotColor = (type: ShiftType) => {
      switch (type) {
          case ShiftType.FINAL: return 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'; // BRANCO
          case ShiftType.T1: return 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]'; // VERDE (Novo)
          case ShiftType.Q1: return 'bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.6)]'; // AZUL (Novo)
          case ShiftType.PLAN: return 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.6)]'; // LARANJA
          case ShiftType.OFF: return 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.6)]'; // VERMELHO
          default: return 'bg-slate-700';
      }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      
      {/* Modal Overlay */}
      {editingState && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-2xl mx-4">
                  <NeonCard glowColor="cyan" className="shadow-2xl" title="Gestão de Turnos & Escala">
                      <div className="space-y-6">
                          
                          {/* Top: Shift Type Selector */}
                          <div className="grid grid-cols-5 gap-2">
                              {Object.values(ShiftType).map((type) => (
                                  <button
                                      key={type}
                                      onClick={() => setEditingState({...editingState, type})}
                                      className={`
                                          p-2 rounded border text-xs font-bold transition-all
                                          ${editingState.type === type 
                                              ? SHIFT_COLORS[type] + ' ring-2 ring-white/20 scale-105' 
                                              : 'bg-slate-900 border-white/10 text-slate-500 hover:bg-slate-800'}
                                      `}
                                  >
                                      {type}
                                  </button>
                              ))}
                          </div>

                          <div className="space-y-2">
                              <label className="text-xs font-mono uppercase text-slate-400 flex items-center gap-2">
                                  <BookOpen size={14} className="text-cyan-400" />
                                  Nome do Curso / Atividade
                              </label>
                              <input 
                                  type="text"
                                  value={editingState.courseName}
                                  onChange={(e) => setEditingState({...editingState, courseName: e.target.value})}
                                  placeholder="Ex: Treinamento NR-10"
                                  className="w-full bg-slate-950 border border-white/10 rounded p-3 text-white focus:border-cyan-500 focus:outline-none focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all"
                              />
                          </div>

                          {/* Multi-Shift Configuration Grid */}
                          <div className="space-y-3">
                              <div className="flex items-center gap-2 text-xs font-mono uppercase text-slate-500 pb-1 border-b border-white/10">
                                  <span className="w-24">Turno</span>
                                  <span className="flex-1">Início da Escala</span>
                                  <span className="w-24">Carga (h)</span>
                                  <span className="flex-1 text-right">Fim Previsto</span>
                              </div>

                              {/* Morning Row */}
                              <div className={`grid grid-cols-[100px_1fr_90px_1fr] items-center gap-4 p-3 rounded-lg border transition-all ${editingState.slots.MORNING.active ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-900/50 border-white/5 opacity-60'}`}>
                                  <div 
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() => toggleSlot('MORNING')}
                                  >
                                      {editingState.slots.MORNING.active ? <CheckSquare size={16} className="text-emerald-400"/> : <Square size={16} className="text-slate-500"/>}
                                      <span className="font-bold text-sm text-white">Manhã</span>
                                  </div>
                                  <input 
                                      type="date" 
                                      value={editingState.slots.MORNING.startDateStr}
                                      disabled={!editingState.slots.MORNING.active}
                                      onChange={(e) => updateSlotConfig('MORNING', 'startDateStr', e.target.value)}
                                      className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30"
                                  />
                                  <input 
                                      type="number" step="4" min="0"
                                      value={editingState.slots.MORNING.totalHours || ''}
                                      disabled={!editingState.slots.MORNING.active}
                                      onChange={(e) => updateSlotConfig('MORNING', 'totalHours', e.target.value)}
                                      placeholder="Hrs"
                                      className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30 w-full"
                                  />
                                  <div className="text-right text-xs font-mono font-bold text-emerald-300">
                                      {editingState.slots.MORNING.active && editingState.slots.MORNING.endDateStr.split('-').reverse().join('/')}
                                  </div>
                              </div>

                              {/* Afternoon Row */}
                              <div className={`grid grid-cols-[100px_1fr_90px_1fr] items-center gap-4 p-3 rounded-lg border transition-all ${editingState.slots.AFTERNOON.active ? 'bg-orange-500/5 border-orange-500/30' : 'bg-slate-900/50 border-white/5 opacity-60'}`}>
                                  <div 
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() => toggleSlot('AFTERNOON')}
                                  >
                                      {editingState.slots.AFTERNOON.active ? <CheckSquare size={16} className="text-orange-400"/> : <Square size={16} className="text-slate-500"/>}
                                      <span className="font-bold text-sm text-white">Tarde</span>
                                  </div>
                                  <input 
                                      type="date" 
                                      value={editingState.slots.AFTERNOON.startDateStr}
                                      disabled={!editingState.slots.AFTERNOON.active}
                                      onChange={(e) => updateSlotConfig('AFTERNOON', 'startDateStr', e.target.value)}
                                      className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30"
                                  />
                                  <input 
                                      type="number" step="4" min="0"
                                      value={editingState.slots.AFTERNOON.totalHours || ''}
                                      disabled={!editingState.slots.AFTERNOON.active}
                                      onChange={(e) => updateSlotConfig('AFTERNOON', 'totalHours', e.target.value)}
                                      placeholder="Hrs"
                                      className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30 w-full"
                                  />
                                  <div className="text-right text-xs font-mono font-bold text-orange-300">
                                      {editingState.slots.AFTERNOON.active && editingState.slots.AFTERNOON.endDateStr.split('-').reverse().join('/')}
                                  </div>
                              </div>

                              {/* Night Row */}
                              <div className={`grid grid-cols-[100px_1fr_90px_1fr] items-center gap-4 p-3 rounded-lg border transition-all ${editingState.slots.NIGHT.active ? 'bg-purple-500/5 border-purple-500/30' : 'bg-slate-900/50 border-white/5 opacity-60'}`}>
                                  <div 
                                    className="flex items-center gap-2 cursor-pointer"
                                    onClick={() => toggleSlot('NIGHT')}
                                  >
                                      {editingState.slots.NIGHT.active ? <CheckSquare size={16} className="text-purple-400"/> : <Square size={16} className="text-slate-500"/>}
                                      <span className="font-bold text-sm text-white">Noite</span>
                                  </div>
                                  <input 
                                      type="date" 
                                      value={editingState.slots.NIGHT.startDateStr}
                                      disabled={!editingState.slots.NIGHT.active}
                                      onChange={(e) => updateSlotConfig('NIGHT', 'startDateStr', e.target.value)}
                                      className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30"
                                  />
                                  <input 
                                      type="number" step="4" min="0"
                                      value={editingState.slots.NIGHT.totalHours || ''}
                                      disabled={!editingState.slots.NIGHT.active}
                                      onChange={(e) => updateSlotConfig('NIGHT', 'totalHours', e.target.value)}
                                      placeholder="Hrs"
                                      className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30 w-full"
                                  />
                                  <div className="text-right text-xs font-mono font-bold text-purple-300">
                                      {editingState.slots.NIGHT.active && editingState.slots.NIGHT.endDateStr.split('-').reverse().join('/')}
                                  </div>
                              </div>
                          </div>

                          <div className="flex gap-3 pt-2">
                              <button 
                                  onClick={() => setEditingState(null)}
                                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg font-bold transition-colors"
                              >
                                  Cancelar
                              </button>
                              <button 
                                  onClick={saveShiftDetails}
                                  className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3 rounded-lg font-bold shadow-lg hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2"
                              >
                                  <Save size={16} /> Aplicar Escala
                              </button>
                          </div>
                      </div>
                  </NeonCard>
              </div>
          </div>
      )}

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
                onClick={handleSaveFile}
                className="flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm tracking-wider uppercase bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all hover:text-white"
             >
                <Save className="w-4 h-4" />
                Salvar
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
                  <th key={day} className="p-2 min-w-[50px] text-center border-b border-white/10 bg-sci-bg/50">
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
                    const shift = getShift(emp.id, day);
                    const shiftType = shift?.type || ShiftType.OFF;
                    // Check slots
                    const hasMorning = shift?.activeSlots?.includes('MORNING');
                    const hasAfternoon = shift?.activeSlots?.includes('AFTERNOON');
                    const hasNight = shift?.activeSlots?.includes('NIGHT');
                    
                    const isOff = shiftType === ShiftType.OFF;
                    const cellBg = isOff ? 'bg-red-500/10 border-red-500/20' : '';
                    
                    // Colors based on ShiftType
                    const colorClass = getSlotColor(shiftType);
                    
                    return (
                      <td 
                        key={`${emp.id}-${day}`} 
                        onClick={() => openShiftEditor(emp.id, day)}
                        className={`p-1 border-b border-white/5 cursor-pointer relative ${cellBg} hover:bg-white/5`}
                      >
                         <div className="w-full h-10 flex flex-col justify-between py-0.5 gap-[1px]">
                           {/* Morning Slot Indicator */}
                           <div className={`h-full w-full rounded-sm transition-all ${hasMorning ? colorClass : 'bg-slate-800/50'}`}></div>
                           
                           {/* Afternoon Slot Indicator */}
                           <div className={`h-full w-full rounded-sm transition-all ${hasAfternoon ? colorClass : 'bg-slate-800/50'}`}></div>
                           
                           {/* Night Slot Indicator */}
                           <div className={`h-full w-full rounded-sm transition-all ${hasNight ? colorClass : 'bg-slate-800/50'}`}></div>
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
      <div className="flex flex-wrap gap-6 px-4 items-center">
         <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-emerald-500 rounded-sm shadow-[0_0_5px_rgba(16,185,129,0.6)]"></div>
             <span className="text-xs text-slate-400 font-mono">T1 (Técnico - Verde)</span>
         </div>
         <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-cyan-500 rounded-sm shadow-[0_0_5px_rgba(6,182,212,0.6)]"></div>
             <span className="text-xs text-slate-400 font-mono">Q1 (Qualidade/TI - Azul)</span>
         </div>
         <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-orange-500 rounded-sm shadow-[0_0_5px_rgba(249,115,22,0.6)]"></div>
             <span className="text-xs text-slate-400 font-mono">PLAN (Planejamento - Laranja)</span>
         </div>
         <div className="flex items-center gap-2">
             <div className="w-3 h-3 bg-red-500 rounded-sm shadow-[0_0_5px_rgba(239,68,68,0.6)]"></div>
             <span className="text-xs text-slate-400 font-mono">FOLGA (Vermelho)</span>
         </div>
         <div className="flex items-center gap-2 border-l border-white/10 pl-6">
             <div className="w-3 h-3 bg-white rounded-sm shadow-[0_0_5px_rgba(255,255,255,0.8)]"></div>
             <span className="text-xs text-slate-300 font-mono font-bold">FINAL (Sáb/Dom/Feriado)</span>
         </div>
      </div>
    </div>
  );
};

export default ShiftCalendar;