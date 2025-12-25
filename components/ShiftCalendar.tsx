
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Employee, ShiftType, Schedule, Shift, ModulePermission, ClassGroup } from '../types';
import { SHIFT_COLORS, PORTO_VELHO_HOLIDAYS, SHIFT_SLOTS } from '../constants';
import { 
  ChevronLeft, ChevronRight, Wand2, Loader2, Calendar as CalendarIcon, 
  Save, Calculator, Wallet, Clock, Info, CheckCircle, CheckSquare, 
  Square, DollarSign, CalendarDays, Zap, School, UserMinus, X, 
  BookOpen, Building, Calendar as CalendarDaysIcon, ArrowRight, Timer,
  Ban, RotateCcw, Lock, Unlock, Rocket, Activity, AlertTriangle, LayoutList,
  GraduationCap
} from 'lucide-react';
import NeonCard from './NeonCard';
import { generateSmartSchedule } from '../services/geminiService';

interface ShiftCalendarProps {
    filterEmployeeId?: string | null;
    employees: Employee[];
    onSave?: (schedules: Schedule[]) => void;
    currentSchedules?: Schedule[];
    deductions?: any;
    externalDate?: Date;
    onDateChange?: (date: Date) => void;
    hourlyRate: number;
    onHourlyRateChange: (rate: number) => void;
    availableCourses: string[];
    schools: string[];
    classes: ClassGroup[];
    permission: ModulePermission; 
    isAdmin?: boolean;
}

interface SlotConfig {
    active: boolean;
    courseName: string; 
    turmaName: string;
    schoolName: string;
    startDateStr: string;
    totalHours: number;
    endDateStr: string;
    isCancelled: boolean;
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

const ShiftCalendar: React.FC<ShiftCalendarProps> = ({ 
    filterEmployeeId, 
    employees, 
    onSave, 
    currentSchedules, 
    deductions,
    externalDate,
    onDateChange,
    hourlyRate,
    onHourlyRateChange,
    availableCourses,
    schools,
    classes,
    permission,
    isAdmin = false
}) => {
  const [internalDate, setInternalDate] = useState(new Date());
  const currentDate = externalDate || internalDate;
  
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editingState, setEditingState] = useState<EditingShiftState | null>(null);

  const displayedEmployees = filterEmployeeId 
    ? employees.filter(e => e.id === filterEmployeeId)
    : employees;

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const formatDateStr = (date: Date): string => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
  };

  const isWorkingDay = useCallback((date: Date): boolean => {
    const dayOfWeek = date.getDay(); 
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return !PORTO_VELHO_HOLIDAYS.includes(`${mm}-${dd}`);
  }, []);

  const handlePrevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    if (onDateChange) onDateChange(d);
    else setInternalDate(d);
  };

  const handleNextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    if (onDateChange) onDateChange(d);
    else setInternalDate(d);
  };

  const calculateEndDate = useCallback((startDateStr: string, totalHours: number): string => {
    if (totalHours <= 0) return startDateStr;
    
    let hoursRemaining = totalHours;
    let current = new Date(startDateStr + 'T12:00:00');
    const hoursPerDay = 4;
    
    if (isWorkingDay(current)) {
      hoursRemaining -= hoursPerDay;
    }

    while (hoursRemaining > 0) {
      current.setDate(current.getDate() + 1);
      if (isWorkingDay(current)) {
        hoursRemaining -= hoursPerDay;
      }
    }
    
    return formatDateStr(current);
  }, [isWorkingDay]);

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
          isCancelled: directShift.slotDetails?.[slotKey]?.isCancelled || false
        };
    }

    for (const shift of Object.values(empSchedule.shifts) as Shift[]) {
        const detail = shift.slotDetails?.[slotKey];
        if (detail && detail.startDateStr && detail.endDateStr) {
            if (dateStr >= detail.startDateStr && dateStr <= detail.endDateStr) {
                const dateObj = new Date(dateStr + 'T12:00:00');
                if (isWorkingDay(dateObj)) {
                    return { 
                      type: shift.type, 
                      courseName: detail.courseName,
                      turmaName: detail.turmaName,
                      schoolName: detail.schoolName,
                      isCancelled: detail.isCancelled || false
                    };
                }
            }
        }
    }
    return null;
  }, [isWorkingDay]);

  const individualStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const stats: Record<string, { worked: number; idle: number; performance: number; courses: Set<string> }> = {};

    displayedEmployees.forEach(emp => {
      let worked = 0;
      let totalPotential = 0;
      const assignedCourses = new Set<string>();

      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        if (!isWorkingDay(dateObj)) continue;
        totalPotential += 12; 
        const dateStr = formatDateStr(dateObj);
        (['MORNING', 'AFTERNOON', 'NIGHT'] as const).forEach(slot => {
            const asgn = checkActiveAssignment(emp.id, dateStr, slot, schedules);
            if (asgn && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(asgn.type) && !asgn.isCancelled) {
                worked += 4;
                if (asgn.courseName && asgn.courseName !== 'Fim de Semana') {
                    assignedCourses.add(asgn.courseName);
                }
            }
        });
      }
      const idle = Math.max(0, totalPotential - worked);
      const performance = totalPotential > 0 ? (worked / totalPotential) * 100 : 0;
      stats[emp.id] = { worked, idle, performance, courses: assignedCourses };
    });
    return stats;
  }, [schedules, currentDate, displayedEmployees, checkActiveAssignment, isWorkingDay]);

  const calendarTotals = useMemo(() => {
    let h40 = 0, h20 = 0;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    displayedEmployees.forEach(emp => {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        if (!isWorkingDay(dateObj)) continue;
        const dateStr = formatDateStr(dateObj);
        (['MORNING', 'AFTERNOON', 'NIGHT'] as const).forEach(slot => {
            const asgn = checkActiveAssignment(emp.id, dateStr, slot, schedules);
            if (asgn && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(asgn.type) && !asgn.isCancelled) {
                if (slot === 'NIGHT') h20 += 4;
                else h40 += 4;
            }
        });
      }
    });
    const totalHours = h40 + h20;
    const totalNet = totalHours * hourlyRate;
    return { h40, h20, totalHours, totalNet };
  }, [schedules, currentDate, displayedEmployees, hourlyRate, checkActiveAssignment, isWorkingDay]);

  useEffect(() => {
    const baseSchedules = (currentSchedules && currentSchedules.length > 0) ? currentSchedules : schedules;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
    const newSchedules = employees.map(emp => {
        const existingSchedule = baseSchedules.find(s => s.employeeId === emp.id);
        const shifts = existingSchedule ? { ...existingSchedule.shifts } : {};
        for (let day = 1; day <= daysInCurrentMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dateStr = formatDateStr(dateObj);
            // Defaulting weekends/holidays to FINAL if not already set by AI or user
            if (!isWorkingDay(dateObj) && !shifts[dateStr]) {
                shifts[dateStr] = { date: dateStr, type: ShiftType.FINAL, activeSlots: [], courseName: 'Fim de Semana' };
            }
        }
        return { employeeId: emp.id, shifts: shifts };
    });
    setSchedules(newSchedules);
  }, [employees, currentDate, isWorkingDay]);

  const openShiftEditor = (empId: string, day: number) => {
    if (!permission.edit) return;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const empSch = schedules.find(s => s.employeeId === empId);
    const existingShift = empSch?.shifts[dateStr];
    
    const getSlotInitialConfig = (slot: 'MORNING' | 'AFTERNOON' | 'NIGHT'): SlotConfig => {
        const direct = existingShift?.slotDetails?.[slot];
        if (direct) return { 
            active: true, 
            courseName: direct.courseName || '', 
            turmaName: direct.turmaName || '',
            schoolName: direct.schoolName || '', 
            startDateStr: direct.startDateStr || dateStr,
            totalHours: direct.totalHours || 4,
            endDateStr: direct.endDateStr || dateStr,
            isCancelled: direct.isCancelled || false
        };

        if (empSch?.shifts) {
            for (const s of Object.values(empSch.shifts) as Shift[]) {
                const det = s.slotDetails?.[slot];
                if (det && det.startDateStr && det.endDateStr && dateStr >= det.startDateStr && dateStr <= det.endDateStr) {
                    return {
                        active: true,
                        courseName: det.courseName || '',
                        turmaName: det.turmaName || '',
                        schoolName: det.schoolName || '',
                        startDateStr: det.startDateStr,
                        totalHours: det.totalHours || 4,
                        endDateStr: det.endDateStr,
                        isCancelled: det.isCancelled || false
                    };
                }
            }
        }
        return { active: false, courseName: '', turmaName: '', schoolName: '', startDateStr: dateStr, totalHours: 4, endDateStr: dateStr, isCancelled: false };
    };

    setEditingState({
        employeeId: empId,
        baseDateStr: dateStr,
        type: existingShift?.type || ShiftType.T1,
        slots: {
            MORNING: getSlotInitialConfig('MORNING'),
            AFTERNOON: getSlotInitialConfig('AFTERNOON'),
            NIGHT: getSlotInitialConfig('NIGHT')
        }
    });
  };

  const handleSlotChange = (slot: keyof EditingShiftState['slots'], field: keyof SlotConfig, value: any) => {
    if (!editingState) return;
    const newSlots = { ...editingState.slots };
    const newSlotConfig = { ...newSlots[slot], [field]: value };
    if (field === 'startDateStr' || field === 'totalHours') {
        newSlotConfig.endDateStr = calculateEndDate(newSlotConfig.startDateStr, newSlotConfig.totalHours);
    }
    newSlots[slot] = newSlotConfig;
    setEditingState({ ...editingState, slots: newSlots });
  };

  const saveShiftDetails = () => {
      if (!editingState || !permission.edit) return;
      
      setSchedules(prev => prev.map(sch => {
          if (sch.employeeId !== editingState.employeeId) return sch;
          const updatedShifts = { ...sch.shifts };
          const baseEmpSch = prev.find(s => s.employeeId === editingState.employeeId);
          const baseShift = baseEmpSch?.shifts[editingState.baseDateStr];

          (['MORNING', 'AFTERNOON', 'NIGHT'] as const).forEach(slotKey => {
              const config = editingState.slots[slotKey];
              const prevDetail = baseShift?.slotDetails?.[slotKey];

              if (prevDetail?.startDateStr && prevDetail?.endDateStr) {
                  let current = new Date(prevDetail.startDateStr + 'T12:00:00');
                  const end = new Date(prevDetail.endDateStr + 'T12:00:00');
                  while (current <= end) {
                      const dStr = formatDateStr(current);
                      if (updatedShifts[dStr]) {
                          updatedShifts[dStr].activeSlots = updatedShifts[dStr].activeSlots?.filter(s => s !== slotKey) || [];
                          if (updatedShifts[dStr].slotDetails) {
                              delete updatedShifts[dStr].slotDetails[slotKey];
                          }
                      }
                      current.setDate(current.getDate() + 1);
                  }
              }

              if (config.active) {
                  let current = new Date(config.startDateStr + 'T12:00:00');
                  const end = new Date(config.endDateStr + 'T12:00:00');
                  
                  while (current <= end) {
                      if (isWorkingDay(current)) {
                          const dateStr = formatDateStr(current);
                          const existingDayShift = updatedShifts[dateStr] || { 
                              date: dateStr, 
                              type: editingState.type, 
                              activeSlots: [], 
                              slotDetails: {} 
                          };
                          
                          if (!existingDayShift.activeSlots) existingDayShift.activeSlots = [];
                          if (!existingDayShift.slotDetails) existingDayShift.slotDetails = {};
                          
                          if (!existingDayShift.activeSlots.includes(slotKey)) {
                              existingDayShift.activeSlots.push(slotKey);
                          }
                          
                          existingDayShift.slotDetails[slotKey] = {
                              courseName: config.courseName,
                              turmaName: config.turmaName,
                              schoolName: config.schoolName,
                              startDateStr: config.startDateStr,
                              endDateStr: config.endDateStr,
                              totalHours: config.totalHours,
                              isCancelled: config.isCancelled
                          };
                          
                          existingDayShift.type = editingState.type;
                          updatedShifts[dateStr] = existingDayShift;
                      }
                      current.setDate(current.getDate() + 1);
                  }
              }
          });
          
          return { ...sch, shifts: updatedShifts };
      }));
      setEditingState(null);
  };

  const handleGenerateAI = async () => {
    if (!permission.add) return;
    setLoading(true);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    try {
      // Pass the current state as context to help AI fill only gaps
      const aiData = await generateSmartSchedule(
          displayedEmployees, 
          year, 
          month + 1,
          schedules.map(s => ({ 
              empId: s.employeeId, 
              filledDays: Object.keys(s.shifts).filter(k => s.shifts[k].type !== ShiftType.FINAL) 
          }))
      );

      if (aiData && aiData.length > 0) {
        setSchedules(prev => {
            const newSchedules = [...prev];
            displayedEmployees.forEach(emp => {
                const empAiData = aiData.find((d: any) => d.employeeName === emp.name) || aiData.find((d:any) => d.employeeId === emp.id);
                const existingEmpSch = prev.find(s => s.employeeId === emp.id);
                const shifts: Record<string, any> = existingEmpSch ? { ...existingEmpSch.shifts } : {};

                // Loop through all days to apply AI suggestions to BLANK spaces
                for (let day = 1; day <= daysInMonth; day++) {
                    const dateObj = new Date(year, month, day);
                    const dayStr = formatDateStr(dateObj);
                    const isWd = isWorkingDay(dateObj);

                    // USER REQUEST: Maintain data already done
                    // Only fill if it's empty OR if it's the default FINAL type (which represents a placeholder)
                    const isBlank = !shifts[dayStr] || shifts[dayStr].type === ShiftType.FINAL;

                    if (isBlank) {
                        if (!isWd) {
                            // USER REQUEST: Weekend filled as Folga (OFF)
                            shifts[dayStr] = { date: dayStr, type: ShiftType.OFF, activeSlots: [], courseName: 'Folga FDS' };
                        } else {
                            // Working day - find AI suggestion
                            const aiDay = empAiData?.shifts?.find((s: any) => s.day === day);
                            if (aiDay) {
                                const defaultSlots: ('MORNING' | 'AFTERNOON' | 'NIGHT')[] = aiDay.type === ShiftType.OFF ? [] : ['MORNING', 'AFTERNOON'];
                                shifts[dayStr] = { 
                                    date: dayStr, 
                                    type: aiDay.type, 
                                    activeSlots: defaultSlots, 
                                    courseName: availableCourses[Math.floor(Math.random() * availableCourses.length)] 
                                };
                            }
                        }
                    }
                }

                const index = newSchedules.findIndex(s => s.employeeId === emp.id);
                if (index !== -1) newSchedules[index] = { ...newSchedules[index], shifts };
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
    if (!permission.edit) return;
    if (onSave) onSave(schedules);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 md:gap-8 relative pb-10">
      {editingState && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-sci-bg/95 backdrop-blur-xl p-4 overflow-y-auto">
            <div className="w-full max-w-6xl my-auto animate-in zoom-in-95 duration-300">
                <NeonCard glowColor="cyan" title={`EDITAR ESCALA INDIVIDUAL: ${editingState.baseDateStr}`} icon={<CalendarIcon size={20} />}>
                    <div className="space-y-6 md:space-y-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-950 p-4 rounded-2xl border border-white/5 gap-4">
                            <div><h4 className="text-xs font-mono uppercase text-slate-500 font-black mb-1">Tipo de Escala Global</h4><p className="text-[10px] text-slate-600 uppercase font-bold">Natureza dos turnos selecionados</p></div>
                            <div className="flex flex-wrap gap-2 bg-sci-bg p-1 rounded-xl border border-white/10 w-full sm:w-auto">
                                {[ShiftType.T1, ShiftType.Q1, ShiftType.PLAN, ShiftType.OFF].map(t => (
                                    <button key={t} onClick={() => setEditingState({...editingState, type: t})} className={`flex-1 sm:flex-none px-4 md:px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${editingState.type === t ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-500'}`}>{t}</button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {(['MORNING', 'AFTERNOON', 'NIGHT'] as const).map(slot => (
                                <div key={slot} className={`p-5 md:p-6 rounded-3xl border transition-all ${editingState.slots[slot].active ? 'bg-cyan-500/10 border-cyan-500/30 shadow-neon-cyan/5' : 'bg-slate-900 border-white/5 opacity-60'} ${editingState.slots[slot].isCancelled ? 'border-red-500/50 grayscale' : ''}`}>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex flex-col"><span className={`text-[10px] font-black uppercase mb-1 ${editingState.slots[slot].isCancelled ? 'text-red-500' : 'text-cyan-500'}`}>{slot === 'MORNING' ? 'Manhã' : slot === 'AFTERNOON' ? 'Tarde' : 'Noite'} {editingState.slots[slot].isCancelled && '(CANCELADO)'}</span><span className="text-xs font-bold text-white font-mono">{SHIFT_SLOTS[slot].start} - {SHIFT_SLOTS[slot].end}</span></div>
                                        <div className="flex gap-2">
                                            {editingState.slots[slot].active && (
                                                <button onClick={() => handleSlotChange(slot, 'isCancelled', !editingState.slots[slot].isCancelled)} className={`p-2 rounded-lg border transition-all ${editingState.slots[slot].isCancelled ? 'bg-red-500 border-red-400 text-white shadow-neon-orange' : 'bg-slate-800 border-white/10 text-slate-500'}`} title={editingState.slots[slot].isCancelled ? "Reativar" : "Cancelar Turma"}>{editingState.slots[slot].isCancelled ? <RotateCcw size={18} /> : <Ban size={18} />}</button>
                                            )}
                                            <button onClick={() => handleSlotChange(slot, 'active', !editingState.slots[slot].active)} className={`p-2 rounded-lg border transition-all ${editingState.slots[slot].active ? 'bg-cyan-500 border-cyan-400 text-white shadow-neon-cyan' : 'bg-slate-800 border-white/10 text-slate-600'}`}>{editingState.slots[slot].active ? <CheckSquare size={18} /> : <Square size={18} />}</button>
                                        </div>
                                    </div>
                                    
                                    {editingState.slots[slot].active && (
                                        <div className="space-y-6">
                                            <div className="space-y-4 bg-sci-bg/50 p-4 rounded-2xl border border-white/5">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-mono uppercase text-cyan-500 font-black flex items-center gap-2"><CalendarDaysIcon size={12}/> Início</label>
                                                    <input type="date" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-cyan-500 font-bold" value={editingState.slots[slot].startDateStr} onChange={e => handleSlotChange(slot, 'startDateStr', e.target.value)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-mono uppercase text-purple-500 font-black flex items-center gap-2"><Timer size={12}/> Carga (h)</label>
                                                    <input type="number" step="4" min="4" className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:border-purple-500 font-bold" value={editingState.slots[slot].totalHours} onChange={e => handleSlotChange(slot, 'totalHours', parseInt(e.target.value) || 0)} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-mono uppercase text-slate-500 font-black flex items-center gap-2"><ArrowRight size={12}/> Fim (Auto)</label>
                                                    <div className="w-full bg-slate-900 border border-white/5 rounded-xl px-4 py-2.5 text-[11px] text-cyan-400 font-black flex items-center justify-between">
                                                        {editingState.slots[slot].endDateStr}
                                                        <span className="text-[8px] font-black bg-cyan-500/10 px-2 py-0.5 rounded">ÚTIL</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-mono text-slate-500 uppercase font-black">Turma</label>
                                                    <select value={editingState.slots[slot].turmaName} onChange={(e) => handleSlotChange(slot, 'turmaName', e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold">
                                                        <option value="">Selecione a Turma...</option>
                                                        {classes.map(cls => <option key={cls.id} value={cls.name}>{cls.name} ({cls.type})</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-mono text-slate-500 uppercase font-black">Curso</label>
                                                    <select value={editingState.slots[slot].courseName} onChange={(e) => handleSlotChange(slot, 'courseName', e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold">
                                                        <option value="">Selecione o Curso...</option>
                                                        {availableCourses.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-mono text-slate-500 uppercase font-black">Unidade</label>
                                                    <select value={editingState.slots[slot].schoolName} onChange={(e) => handleSlotChange(slot, 'schoolName', e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-500 font-bold">
                                                        <option value="">Selecione...</option>
                                                        {schools.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/10">
                            <button onClick={() => setEditingState(null)} className="w-full sm:flex-1 py-4 bg-slate-800 text-white rounded-xl font-black text-xs uppercase border border-white/10">Cancelar</button>
                            <button onClick={saveShiftDetails} className="w-full sm:flex-[2] py-4 bg-cyan-600 text-white rounded-xl font-black text-sm uppercase shadow-neon-cyan">Confirmar e Atualizar</button>
                        </div>
                    </div>
                </NeonCard>
            </div>
        </div>
      )}

      {/* DASHBOARD KPI RESPONSIVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <NeonCard glowColor="blue" className="bg-[#0b1221]/80 border-blue-500/20"><div className="flex items-center gap-4"><div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><Clock size={24} /></div><div><p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold mb-1">Carga 40H</p><p className="text-xl md:text-2xl font-bold text-white leading-none">{calendarTotals.h40} h</p></div></div></NeonCard>
          <NeonCard glowColor="purple" className="bg-[#0b1221]/80 border-purple-500/20"><div className="flex items-center gap-4"><div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Clock size={24} /></div><div><p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold mb-1">Carga 20H</p><p className="text-xl md:text-2xl font-bold text-white leading-none">{calendarTotals.h20} h</p></div></div></NeonCard>
          <NeonCard glowColor="cyan" className="bg-[#0b1221]/80 border-cyan-500/20"><div className="flex items-center gap-4"><div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400"><Calculator size={24} /></div><div><p className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold mb-1">Horas Úteis</p><p className="text-xl md:text-2xl font-bold text-white leading-none">{calendarTotals.totalHours} h</p></div></div></NeonCard>
          <NeonCard glowColor="orange" className="bg-emerald-900/10 border-emerald-500/40 shadow-neon-emerald"><div className="flex items-center gap-4"><div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><Wallet size={24} /></div><div><p className="text-[10px] font-mono uppercase text-emerald-500/70 tracking-wider font-bold mb-1">Estimativa Bruta</p><p className="text-xl md:text-2xl font-bold text-emerald-400 font-mono leading-none">R$ {calendarTotals.totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div></div></NeonCard>
      </div>

      {/* HEADER CALENDAR RESPONSIVE */}
      <NeonCard className="p-0" glowColor="cyan">
        <div className="flex flex-col lg:flex-row justify-between items-center p-5 md:p-6 gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
            <div className="p-3 rounded-xl border bg-cyan-500/10 border-cyan-500/20 text-cyan-400 hidden sm:block"><CalendarIcon className="w-8 h-8" /></div>
            <div className="w-full sm:w-auto">
                <div className="flex items-center justify-between sm:justify-start gap-4 mb-3 sm:mb-2">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-all"><ChevronLeft size={24}/></button>
                    <h2 className="text-xl md:text-2xl font-black text-white tracking-widest uppercase font-mono truncate">{monthName}</h2>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-all"><ChevronRight size={24}/></button>
                </div>
                <div className="flex items-center gap-3"><span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest font-black hidden sm:inline">Base Produção:</span><div className="flex items-center bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-2 shadow-inner w-full sm:w-auto"><span className="text-sm text-cyan-500 font-mono mr-2 font-black">R$</span><input type="number" step="0.5" disabled={!permission.edit} value={hourlyRate} onChange={(e) => onHourlyRateChange(parseFloat(e.target.value) || 0)} className="bg-transparent border-none text-sm font-mono text-white w-full sm:w-16 focus:outline-none font-black disabled:opacity-50" /></div></div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
             {permission.add && <button onClick={handleGenerateAI} disabled={loading} className="flex-1 flex items-center justify-center gap-3 px-6 md:px-8 py-3.5 rounded-xl font-black text-[10px] md:text-xs uppercase bg-purple-600 text-white shadow-neon-purple active:scale-95 transition-all disabled:opacity-50">{loading ? <Loader2 className="animate-spin w-4 h-4 md:w-5 md:h-5" /> : <Wand2 className="w-4 h-4 md:w-5 md:h-5" />} IA Sincronizar</button>}
             {permission.edit && <button onClick={handleSaveSystem} className={`flex-1 flex items-center justify-center gap-3 px-6 md:px-8 py-3.5 rounded-xl font-black text-[10px] md:text-xs uppercase transition-all shadow-xl active:scale-95 ${saveSuccess ? 'bg-green-600 shadow-neon-emerald' : 'bg-slate-800 hover:bg-slate-700 border border-white/10'}`}>{saveSuccess ? <CheckCircle className="w-4 h-4 md:w-5 md:h-5" /> : <Save className="w-4 h-4 md:w-5 h-5" />} Efetivar Escala</button>}
          </div>
        </div>
      </NeonCard>

      {/* TABLE RESPONSIVE WRAPPER */}
      <NeonCard className="overflow-hidden p-0" glowColor="none">
        <div className="overflow-x-auto relative scrollbar-thin scrollbar-thumb-cyan-500/20">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/80">
                <th className="sticky left-0 z-20 bg-sci-bg p-4 md:p-6 text-left border-b border-r border-white/10 min-w-[240px] md:min-w-[320px] shadow-2xl">
                    <div className="flex items-center gap-2 md:gap-3"><UserMinus size={16} className="text-slate-500" /><span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black">Equipe Rios</span></div>
                </th>
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const isWd = isWorkingDay(d);
                    return (<th key={day} className={`p-3 md:p-4 min-w-[100px] md:min-w-[120px] text-center border-b border-white/10 ${!isWd ? 'bg-slate-950/40 opacity-30' : ''}`}><div className="flex flex-col items-center"><span className={`text-[9px] md:text-[10px] uppercase font-mono font-black ${isWd ? 'text-cyan-500/60' : 'text-slate-700'}`}>{d.toLocaleDateString('pt-BR', { weekday: 'narrow' })}</span><span className={`text-sm md:text-base font-black ${isWd ? 'text-slate-200' : 'text-slate-600'}`}>{String(day).padStart(2, '0')}</span></div></th>);
                })}
              </tr>
            </thead>
            <tbody>
              {displayedEmployees.map((emp) => {
                const stats = individualStats[emp.id];
                const activeCourses = Array.from(stats?.courses || []);
                
                return (
                <tr key={emp.id} className="group hover:bg-white/5 transition-colors">
                  <td className="sticky left-0 z-10 p-5 md:p-7 border-r border-b border-white/10 bg-[#050b14] group-hover:bg-[#0b1221] shadow-2xl transition-all">
                    <div className="flex items-center gap-4 md:gap-6 mb-4">
                        <div className="relative shrink-0">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <img src={emp.avatarUrl} alt="" className="w-12 h-12 md:w-16 md:h-16 rounded-full border-2 border-slate-700 shadow-inner group-hover:border-cyan-500 transition-all relative z-10" />
                            {stats?.performance > 90 && (
                                <div className="absolute -top-1 -right-1 bg-emerald-500 p-1 rounded-full border-2 border-sci-bg z-20 shadow-neon-emerald">
                                    <Zap size={10} className="text-white" />
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col truncate flex-1">
                            <span className="text-sm md:text-base font-black text-slate-200 truncate tracking-tight group-hover:text-white transition-colors uppercase font-mono">{emp.name}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase mb-2 truncate">{emp.role}</span>
                            
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between w-full">
                                    <span className={`text-[9px] font-black font-mono px-2 py-0.5 rounded border transition-all ${stats?.idle > 40 ? 'bg-red-500/10 text-red-500 border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-slate-800 text-slate-400 border-white/5'}`}>
                                        {stats?.idle}H OCIOSAS
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Activity size={10} className={stats?.performance > 50 ? 'text-emerald-400' : 'text-red-400'} />
                                        <span className="text-[9px] font-mono font-black text-slate-500">{Math.round(stats?.performance)}%</span>
                                    </div>
                                </div>
                                <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className={`h-full transition-all duration-1000 ${stats?.performance > 80 ? 'bg-emerald-500' : stats?.performance > 40 ? 'bg-cyan-500' : 'bg-red-500'}`}
                                        style={{ width: `${stats?.performance}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO DE TURMAS ABAIXO DO COLABORADOR */}
                    <div className="mt-2 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-2 text-[8px] font-mono text-slate-500 uppercase tracking-widest font-black">
                            <LayoutList size={10} className="text-cyan-500" />
                            Turmas Ativas
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-[60px] overflow-y-auto pr-1 scrollbar-hide">
                            {activeCourses.length > 0 ? activeCourses.map(course => (
                                <span key={course} className="px-2 py-0.5 bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-[8px] font-black rounded-md uppercase whitespace-nowrap">
                                    {course}
                                </span>
                            )) : (
                                <span className="text-[8px] font-bold text-slate-600 uppercase italic">Nenhuma turma alocada</span>
                            )}
                        </div>
                    </div>
                  </td>
                  {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                    const isWd = isWorkingDay(d);
                    const dateStr = formatDateStr(d);
                    const morningAsgn = checkActiveAssignment(emp.id, dateStr, 'MORNING', schedules);
                    const afternoonAsgn = checkActiveAssignment(emp.id, dateStr, 'AFTERNOON', schedules);
                    const nightAsgn = checkActiveAssignment(emp.id, dateStr, 'NIGHT', schedules);
                    return (<td key={day} onClick={() => isWd && openShiftEditor(emp.id, day)} className={`p-1 md:p-1.5 border-b border-white/5 transition-all min-w-[100px] md:min-w-[120px] ${isWd && permission.edit ? 'cursor-pointer hover:bg-cyan-500/10' : 'cursor-default'} ${!isWd ? 'bg-slate-950/20' : ''}`}><div className="w-full h-[100px] md:h-[110px] flex flex-col gap-[2px] md:gap-[3px]">{(['MORNING', 'AFTERNOON', 'NIGHT'] as const).map((slot, idx) => { const asgn = idx === 0 ? morningAsgn : idx === 1 ? afternoonAsgn : nightAsgn; return (<div key={idx} className={`h-full w-full rounded-lg transition-all flex flex-col justify-center px-2 md:px-3 overflow-hidden relative border ${asgn?.isCancelled ? 'bg-red-950/40 border-red-500/30 grayscale' : (asgn ? SHIFT_COLORS[asgn.type] : (isWd ? 'bg-slate-800/20 border-white/5' : 'bg-transparent border-dashed border-white/5'))}`}>{asgn && (<><div className="flex justify-between items-center mb-0.5"><span className="text-[7px] md:text-[8px] font-black uppercase tracking-tighter opacity-80">{SHIFT_SLOTS[slot].start}</span><span className="text-[7px] md:text-[8px] font-black uppercase text-white/50">{asgn.isCancelled ? 'CANCEL' : '4H'}</span></div>{asgn.courseName && asgn.courseName !== 'Fim de Semana' && (<span className={`text-[9px] md:text-[10px] font-black uppercase truncate leading-none mb-0.5 ${asgn.isCancelled ? 'text-red-400' : 'text-white'}`}>{asgn.courseName}</span>)}{asgn.schoolName && (<span className="text-[7px] font-bold opacity-60 truncate text-white uppercase">{asgn.schoolName}</span>)}</>)}{!isWd && idx === 1 && !asgn && <span className="text-[7px] text-slate-700 font-black uppercase text-center tracking-widest">FDS/FERIADO</span>}</div>); })}</div></td>);
                  })}
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </NeonCard>
    </div>
  );
};

export default ShiftCalendar;
