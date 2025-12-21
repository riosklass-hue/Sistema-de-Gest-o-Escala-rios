import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Employee, ShiftType, Schedule, Shift } from '../types';
import { SHIFT_COLORS, PORTO_VELHO_HOLIDAYS, SHIFT_SLOTS } from '../constants';
import { ChevronLeft, ChevronRight, Wand2, Loader2, Calendar as CalendarIcon, Save, BookOpen, Calculator, CalendarDays, ArrowRight, Sun, Sunset, Moon, CheckSquare, Square, CheckCircle, Wallet, Clock, Info } from 'lucide-react';
import NeonCard from './NeonCard';
import { generateSmartSchedule } from '../services/geminiService';

const HOURLY_RATE = 32.00;

interface ShiftCalendarProps {
    filterEmployeeId?: string | null;
    employees: Employee[];
    onSave?: (schedules: Schedule[]) => void;
    currentSchedules?: Schedule[];
    deductions?: any;
}

interface SlotConfig {
    active: boolean;
    startDateStr: string;
    totalHours: number;
    endDateStr: string; 
    courseName: string; 
}

interface EditingShiftState {
    employeeId: string;
    baseDateStr: string; 
    type: ShiftType;
    slots: {
        MORNING: SlotConfig;
        AFTERNOON: SlotConfig;
        NIGHT: SlotConfig;
    };
}

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ filterEmployeeId, employees, onSave, currentSchedules, deductions }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingState, setEditingState] = useState<EditingShiftState | null>(null);

  const displayedEmployees = filterEmployeeId 
    ? employees.filter(e => e.id === filterEmployeeId)
    : employees;

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  // --- Helpers ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

  const isNonWorkingDay = useCallback((date: Date): boolean => {
    const dayOfWeek = date.getDay(); 
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

  // --- Cálculos de Resumo em Tempo Real (Sincronizado com Relatório) ---
  const calendarTotals = useMemo(() => {
    let h40 = 0;
    let h20 = 0;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    schedules.forEach(sch => {
        if (filterEmployeeId && sch.employeeId !== filterEmployeeId) return;

        Object.entries(sch.shifts).forEach(([dateStr, shift]: [string, Shift]) => {
            const dateObj = new Date(dateStr + 'T00:00:00');
            if (dateObj.getMonth() !== month || dateObj.getFullYear() !== year) return;
            
            // Regra idêntica ao relatório: Somente dias úteis e tipos remuneráveis
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
            const isPaidType = [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(shift.type);

            if (!isWeekend && isPaidType) {
                shift.activeSlots?.forEach(slot => {
                    if (slot === 'MORNING' || slot === 'AFTERNOON') h40 += 4;
                    else if (slot === 'NIGHT') h20 += 4;
                });
            }
        });
    });

    const g40 = h40 * HOURLY_RATE;
    const g20 = h20 * HOURLY_RATE;
    const totalGross = g40 + g20;

    // Cálculo do líquido usando as deduções globais (se houver)
    let totalNet = totalGross;
    if (deductions) {
        const d40 = (deductions['40H']?.ir || 0) + (deductions['40H']?.inss || 0) + (deductions['40H']?.unimed || 0);
        const d20 = (deductions['20H']?.ir || 0) + (deductions['20H']?.inss || 0) + (deductions['20H']?.unimed || 0);
        totalNet = totalGross - (d40 + d20);
    }

    return { 
        h40, 
        h20, 
        totalHours: h40 + h20, 
        totalGross,
        totalNet 
    };
  }, [schedules, currentDate, filterEmployeeId, deductions]);

  // --- Inicialização Automática ---
  useEffect(() => {
    const baseSchedules = (currentSchedules && currentSchedules.length > 0) 
        ? currentSchedules 
        : schedules;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInCurrentMonth = getDaysInMonth(year, month);
    
    const newSchedules = employees.map(emp => {
        const existingSchedule = baseSchedules.find(s => s.employeeId === emp.id);
        const shifts = existingSchedule ? { ...existingSchedule.shifts } : {};

        for (let day = 1; day <= daysInCurrentMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dateStr = formatDateStr(dateObj);
            if (!shifts[dateStr]) {
                if (isNonWorkingDay(dateObj)) {
                    shifts[dateStr] = {
                        date: dateStr,
                        type: ShiftType.FINAL,
                        activeSlots: ['MORNING', 'AFTERNOON', 'NIGHT'],
                        courseName: 'Final de Semana / Feriado'
                    };
                }
            }
        }
        return { employeeId: emp.id, shifts: shifts };
    });
    setSchedules(newSchedules);
  }, [employees, currentDate, isNonWorkingDay, currentSchedules]); 

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
      const aiData = await generateSmartSchedule(displayedEmployees, currentDate.getFullYear(), currentDate.getMonth() + 1);
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
                        if (type === ShiftType.FINAL) defaultSlots = ['MORNING', 'AFTERNOON', 'NIGHT'];
                        else if (type === ShiftType.T1 || type === ShiftType.Q1) defaultSlots = ['MORNING', 'AFTERNOON'];
                        else if (type === ShiftType.PLAN) defaultSlots = ['MORNING'];
                        shifts[dayStr] = { date: dayStr, type: type, activeSlots: type === ShiftType.OFF ? [] : defaultSlots };
                     });
                     const index = newSchedules.findIndex(s => s.employeeId === emp.id);
                     if (index !== -1) newSchedules[index] = { ...newSchedules[index], shifts };
                }
            });
            return newSchedules;
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSystem = () => {
    if (onSave) onSave(schedules);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
    const getCourse = (slot: string) => existingShift?.slotDetails?.[slot]?.courseName || existingShift?.courseName || '';

    setEditingState({
        employeeId: empId, baseDateStr: dateStr, type: existingShift?.type || ShiftType.T1,
        slots: {
            MORNING: { active: currentSlots.includes('MORNING'), startDateStr: dateStr, totalHours: 0, endDateStr: dateStr, courseName: getCourse('MORNING') },
            AFTERNOON: { active: currentSlots.includes('AFTERNOON'), startDateStr: dateStr, totalHours: 0, endDateStr: dateStr, courseName: getCourse('AFTERNOON') },
            NIGHT: { active: currentSlots.includes('NIGHT'), startDateStr: dateStr, totalHours: 0, endDateStr: dateStr, courseName: getCourse('NIGHT') }
        }
    });
  };

  const saveShiftDetails = () => {
      if (!editingState) return;
      setSchedules(prev => prev.map(sch => {
          if (sch.employeeId !== editingState.employeeId) return sch;
          const updatedShifts = { ...sch.shifts };
          const addSlotToDay = (dateStr: string, slot: 'MORNING' | 'AFTERNOON' | 'NIGHT', courseName: string) => {
              if (!updatedShifts[dateStr]) {
                  updatedShifts[dateStr] = { date: dateStr, type: editingState.type, activeSlots: [], slotDetails: {} };
              } else { updatedShifts[dateStr].type = editingState.type; }
              const slots = updatedShifts[dateStr].activeSlots || [];
              if (!slots.includes(slot)) slots.push(slot);
              updatedShifts[dateStr].activeSlots = slots;
              updatedShifts[dateStr].slotDetails = { ...updatedShifts[dateStr].slotDetails, [slot]: { courseName } };
              updatedShifts[dateStr].courseName = courseName; 
          };
          const baseDate = editingState.baseDateStr;
          if (!updatedShifts[baseDate]) {
              updatedShifts[baseDate] = { date: baseDate, type: editingState.type, activeSlots: [], slotDetails: {} };
          } else {
              updatedShifts[baseDate].type = editingState.type;
              updatedShifts[baseDate].activeSlots = []; 
              updatedShifts[baseDate].slotDetails = {};
          }
          if (editingState.slots.MORNING.active) {
              addSlotToDay(baseDate, 'MORNING', editingState.slots.MORNING.courseName);
              if (editingState.slots.MORNING.totalHours > 4) {
                  const dates = calculateWorkingDates(editingState.slots.MORNING.startDateStr, editingState.slots.MORNING.totalHours);
                  dates.filter(d => d !== baseDate).forEach(d => addSlotToDay(d, 'MORNING', editingState.slots.MORNING.courseName));
              }
          }
          if (editingState.slots.AFTERNOON.active) {
              addSlotToDay(baseDate, 'AFTERNOON', editingState.slots.AFTERNOON.courseName);
              if (editingState.slots.AFTERNOON.totalHours > 4) {
                  const dates = calculateWorkingDates(editingState.slots.AFTERNOON.startDateStr, editingState.slots.AFTERNOON.totalHours);
                  dates.filter(d => d !== baseDate).forEach(d => addSlotToDay(d, 'AFTERNOON', editingState.slots.AFTERNOON.courseName));
              }
          }
          if (editingState.slots.NIGHT.active) {
              addSlotToDay(baseDate, 'NIGHT', editingState.slots.NIGHT.courseName);
              if (editingState.slots.NIGHT.totalHours > 4) {
                  const dates = calculateWorkingDates(editingState.slots.NIGHT.startDateStr, editingState.slots.NIGHT.totalHours);
                  dates.filter(d => d !== baseDate).forEach(d => addSlotToDay(d, 'NIGHT', editingState.slots.NIGHT.courseName));
              }
          }
          if (editingState.type === ShiftType.OFF) {
             updatedShifts[baseDate] = { date: baseDate, type: ShiftType.OFF, courseName: 'Folga', activeSlots: [] };
          }
          return { ...sch, shifts: updatedShifts };
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
          newConfig.endDateStr = dates.length > 0 ? dates[dates.length - 1] : startDate;
      }
      setEditingState({ ...editingState, slots: { ...editingState.slots, [slotName]: newConfig } });
  };

  const toggleSlot = (slotName: 'MORNING' | 'AFTERNOON' | 'NIGHT') => {
      if (!editingState) return;
      updateSlotConfig(slotName, 'active', !editingState.slots[slotName].active);
  };

  const getSlotColor = (type: ShiftType) => {
      switch (type) {
          case ShiftType.FINAL: return 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]';
          case ShiftType.T1: return 'bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]';
          case ShiftType.Q1: return 'bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.6)]';
          case ShiftType.PLAN: return 'bg-orange-500 shadow-[0_0_5px_rgba(249,115,22,0.6)]';
          case ShiftType.OFF: return 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.6)]';
          default: return 'bg-slate-700';
      }
  };

  return (
    <div className="flex flex-col gap-6 relative">
      
      {/* Resumo Financeiro Sincronizado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
          <NeonCard glowColor="blue" className="bg-[#0b1221]/80 border-blue-500/20">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <Clock size={18} />
                  </div>
                  <div>
                      <p className="text-[10px] font-mono uppercase text-slate-500 tracking-tighter">Carga 40h (M/T)</p>
                      <p className="text-xl font-bold text-white">{calendarTotals.h40} h</p>
                  </div>
              </div>
          </NeonCard>
          <NeonCard glowColor="purple" className="bg-[#0b1221]/80 border-purple-500/20">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400">
                      <Clock size={18} />
                  </div>
                  <div>
                      <p className="text-[10px] font-mono uppercase text-slate-500 tracking-tighter">Carga 20h (N)</p>
                      <p className="text-xl font-bold text-white">{calendarTotals.h20} h</p>
                  </div>
              </div>
          </NeonCard>
          <NeonCard glowColor="cyan" className="bg-[#0b1221]/80 border-cyan-500/20">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg text-cyan-400">
                      <Calculator size={18} />
                  </div>
                  <div>
                      <p className="text-[10px] font-mono uppercase text-slate-500 tracking-tighter">Total Remunerado</p>
                      <p className="text-xl font-bold text-white">{calendarTotals.totalHours} h</p>
                  </div>
              </div>
          </NeonCard>
          <NeonCard glowColor="orange" className="bg-emerald-900/10 border-emerald-500/30">
              <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                      <Wallet size={18} />
                  </div>
                  <div className="flex-1">
                      <p className="text-[10px] font-mono uppercase text-emerald-500/70 tracking-tighter">Líquido Estimado</p>
                      <p className="text-xl font-bold text-emerald-400 font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calendarTotals.totalNet)}
                      </p>
                      <p className="text-[8px] text-slate-500 font-mono italic">Bruto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calendarTotals.totalGross)}</p>
                  </div>
              </div>
          </NeonCard>
      </div>

      <div className="bg-blue-900/10 border border-blue-500/20 p-3 rounded-lg flex items-center gap-3">
          <Info size={16} className="text-blue-400 shrink-0" />
          <p className="text-[10px] text-blue-300/80 leading-none">
            <strong>Regra de Sincronização:</strong> Turnos M/T/N apenas em dias úteis com tipos T1, Q1 ou PLAN são contabilizados. Turnos de finais de semana são exibidos mas não remunerados.
          </p>
      </div>

      {/* Modal Editor */}
      {editingState && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="w-full max-w-4xl mx-4">
                  <NeonCard glowColor="cyan" className="shadow-2xl" title="Gestão de Turnos & Atividades">
                      <div className="space-y-6">
                          <div className="grid grid-cols-5 gap-2">
                              {Object.values(ShiftType).map((type) => (
                                  <button key={type} onClick={() => setEditingState({...editingState, type})} className={`p-2 rounded border text-xs font-bold transition-all ${editingState.type === type ? SHIFT_COLORS[type] + ' ring-2 ring-white/20 scale-105' : 'bg-slate-900 border-white/10 text-slate-500 hover:bg-slate-800'}`}>{type}</button>
                              ))}
                          </div>
                          <div className="space-y-3">
                              <div className="grid grid-cols-[90px_105px_60px_90px_1fr] gap-3 items-center text-xs font-mono uppercase text-slate-500 pb-1 border-b border-white/10">
                                  <span>Turno</span><span>Início</span><span>Carga</span><span className="text-right">Fim Prev.</span><span>Nome do Curso / Atividade</span>
                              </div>
                              <div className={`grid grid-cols-[90px_105px_60px_90px_1fr] items-center gap-3 p-3 rounded-lg border transition-all ${editingState.slots.MORNING.active ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-slate-900/50 border-white/5 opacity-60'}`}>
                                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSlot('MORNING')}>{editingState.slots.MORNING.active ? <CheckSquare size={16} className="text-emerald-400"/> : <Square size={16} className="text-slate-500"/>}<span className="font-bold text-sm text-white">Manhã</span></div>
                                  <input type="date" value={editingState.slots.MORNING.startDateStr} disabled={!editingState.slots.MORNING.active} onChange={(e) => updateSlotConfig('MORNING', 'startDateStr', e.target.value)} className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30 w-full" />
                                  <input type="number" step="4" min="0" value={editingState.slots.MORNING.totalHours || ''} disabled={!editingState.slots.MORNING.active} onChange={(e) => updateSlotConfig('MORNING', 'totalHours', e.target.value)} placeholder="Hrs" className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30 w-full" />
                                  <div className="text-right text-xs font-mono font-bold text-emerald-300">{editingState.slots.MORNING.active && editingState.slots.MORNING.endDateStr.split('-').reverse().join('/')}</div>
                                  <input type="text" disabled={!editingState.slots.MORNING.active} value={editingState.slots.MORNING.courseName} onChange={(e) => updateSlotConfig('MORNING', 'courseName', e.target.value)} placeholder="Ex: NR-10 Manhã" className="w-full bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none disabled:opacity-30" />
                              </div>
                              <div className={`grid grid-cols-[90px_105px_60px_90px_1fr] items-center gap-3 p-3 rounded-lg border transition-all ${editingState.slots.AFTERNOON.active ? 'bg-orange-500/5 border-orange-500/30' : 'bg-slate-900/50 border-white/5 opacity-60'}`}>
                                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSlot('AFTERNOON')}>{editingState.slots.AFTERNOON.active ? <CheckSquare size={16} className="text-orange-400"/> : <Square size={16} className="text-slate-500"/>}<span className="font-bold text-sm text-white">Tarde</span></div>
                                  <input type="date" value={editingState.slots.AFTERNOON.startDateStr} disabled={!editingState.slots.AFTERNOON.active} onChange={(e) => updateSlotConfig('AFTERNOON', 'startDateStr', e.target.value)} className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30 w-full" />
                                  <input type="number" step="4" min="0" value={editingState.slots.AFTERNOON.totalHours || ''} disabled={!editingState.slots.AFTERNOON.active} onChange={(e) => updateSlotConfig('AFTERNOON', 'totalHours', e.target.value)} placeholder="Hrs" className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30 w-full" />
                                  <div className="text-right text-xs font-mono font-bold text-orange-300">{editingState.slots.AFTERNOON.active && editingState.slots.AFTERNOON.endDateStr.split('-').reverse().join('/')}</div>
                                  <input type="text" disabled={!editingState.slots.AFTERNOON.active} value={editingState.slots.AFTERNOON.courseName} onChange={(e) => updateSlotConfig('AFTERNOON', 'courseName', e.target.value)} placeholder="Ex: NR-35 Tarde" className="w-full bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white focus:border-orange-500 focus:outline-none disabled:opacity-30" />
                              </div>
                              <div className={`grid grid-cols-[90px_105px_60px_90px_1fr] items-center gap-3 p-3 rounded-lg border transition-all ${editingState.slots.NIGHT.active ? 'bg-purple-500/5 border-purple-500/30' : 'bg-slate-900/50 border-white/5 opacity-60'}`}>
                                  <div className="flex items-center gap-2 cursor-pointer" onClick={() => toggleSlot('NIGHT')}>{editingState.slots.NIGHT.active ? <CheckSquare size={16} className="text-purple-400"/> : <Square size={16} className="text-slate-500"/>}<span className="font-bold text-sm text-white">Noite</span></div>
                                  <input type="date" value={editingState.slots.NIGHT.startDateStr} disabled={!editingState.slots.NIGHT.active} onChange={(e) => updateSlotConfig('NIGHT', 'startDateStr', e.target.value)} className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30 w-full" />
                                  <input type="number" step="4" min="0" value={editingState.slots.NIGHT.totalHours || ''} disabled={!editingState.slots.NIGHT.active} onChange={(e) => updateSlotConfig('NIGHT', 'totalHours', e.target.value)} placeholder="Hrs" className="bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white disabled:opacity-30 w-full" />
                                  <div className="text-right text-xs font-mono font-bold text-purple-300">{editingState.slots.NIGHT.active && editingState.slots.NIGHT.endDateStr.split('-').reverse().join('/')}</div>
                                  <input type="text" disabled={!editingState.slots.NIGHT.active} value={editingState.slots.NIGHT.courseName} onChange={(e) => updateSlotConfig('NIGHT', 'courseName', e.target.value)} placeholder="Ex: Supervisão Noite" className="w-full bg-slate-950 border border-white/10 rounded p-1.5 text-xs text-white focus:border-purple-500 focus:outline-none disabled:opacity-30" />
                              </div>
                          </div>
                          <div className="flex gap-3 pt-2">
                              <button onClick={() => setEditingState(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg font-bold transition-colors">Cancelar</button>
                              <button onClick={saveShiftDetails} className="flex-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3 rounded-lg font-bold shadow-lg hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2"><Save size={16} /> Aplicar Escala</button>
                          </div>
                      </div>
                  </NeonCard>
              </div>
          </div>
      )}

      {/* Calendário Controles */}
      <NeonCard className="p-0" glowColor="cyan">
        <div className="flex flex-col md:flex-row justify-between items-center p-4 gap-4">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20"><CalendarIcon className="text-cyan-400 w-6 h-6" /></div>
            <div><h2 className="text-xl font-bold text-white tracking-wide uppercase font-mono">{monthName}</h2><p className="text-xs text-slate-400">{filterEmployeeId ? 'Visualização Individual' : 'Planejamento Geral de Equipe'}</p></div>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ChevronLeft className="text-slate-300" /></button>
             <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ChevronRight className="text-slate-300" /></button>
          </div>
          <div className="flex gap-3">
             <button onClick={handleGenerateAI} disabled={loading} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm tracking-wider uppercase transition-all ${loading ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-neon-purple'}`}>{loading ? <Loader2 className="animate-spin w-4 h-4" /> : <Wand2 className="w-4 h-4" />}{loading ? 'IA Process...' : 'Gerar Escala (IA)'}</button>
             <button onClick={handleSaveSystem} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-sm tracking-wider uppercase transition-all ${saveSuccess ? 'bg-green-600 text-white border-green-500' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 hover:text-white'}`}>{saveSuccess ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}{saveSuccess ? 'Salvo!' : 'Salvar'}</button>
          </div>
        </div>
      </NeonCard>

      {/* Grid Principal */}
      <NeonCard className="overflow-hidden p-0" glowColor="none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 z-20 bg-sci-bg p-4 text-left border-b border-r border-white/10 min-w-[200px]"><span className="text-xs font-mono text-slate-500 uppercase">Colaborador</span></th>
                {daysArray.map(day => (
                  <th key={day} className="p-2 min-w-[50px] text-center border-b border-white/10 bg-sci-bg/50">
                    <div className="flex flex-col items-center"><span className="text-[10px] text-slate-500 font-mono">{new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('pt-BR', { weekday: 'narrow' })}</span><span className="text-sm font-bold text-slate-300">{day}</span></div>
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
                        <img src={emp.avatarUrl} alt={emp.name} className="w-10 h-10 rounded-full border-2 border-slate-700 group-hover:border-cyan-500/50 transition-colors" />
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
                    const hasMorning = shift?.activeSlots?.includes('MORNING');
                    const hasAfternoon = shift?.activeSlots?.includes('AFTERNOON');
                    const hasNight = shift?.activeSlots?.includes('NIGHT');
                    const isOff = shiftType === ShiftType.OFF;
                    const cellBg = isOff ? 'bg-red-500/10 border-red-500/20' : '';
                    const colorClass = getSlotColor(shiftType);
                    return (
                      <td key={`${emp.id}-${day}`} onClick={() => openShiftEditor(emp.id, day)} className={`p-1 border-b border-white/5 cursor-pointer relative ${cellBg} hover:bg-white/5`}>
                         <div className="w-full h-12 flex flex-col justify-between py-0.5 gap-[1px]">
                           <div className={`h-full w-full rounded-sm transition-all ${hasMorning ? colorClass : 'bg-slate-800/50'}`}></div>
                           <div className={`h-full w-full rounded-sm transition-all ${hasAfternoon ? colorClass : 'bg-slate-800/50'}`}></div>
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
    </div>
  );
};

export default ShiftCalendar;