
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Employee, ShiftType, Schedule, Shift, ModulePermission } from '../types';
import { SHIFT_COLORS, PORTO_VELHO_HOLIDAYS, SHIFT_SLOTS } from '../constants';
import { ChevronLeft, ChevronRight, Wand2, Loader2, Calendar as CalendarIcon, Save, Calculator, Wallet, Clock, Info, CheckCircle, CheckSquare, Square, DollarSign, CalendarDays, Zap, School, UserMinus } from 'lucide-react';
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
    permission: ModulePermission; 
}

interface SlotConfig {
    active: boolean;
    startDateStr: string;
    totalHours: number;
    endDateStr: string; 
    courseName: string; 
    schoolName: string;
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
    permission
}) => {
  const [internalDate, setInternalDate] = useState(new Date());
  
  const currentDate = externalDate || internalDate;
  const setCurrentDate = (date: Date) => {
      if (onDateChange) onDateChange(date);
      else setInternalDate(date);
  };

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

  const calculateEndDate = useCallback((startDateStr: string, totalHours: number, capacityPerDay: number = 4): string => {
    if (!totalHours || totalHours <= 0) return startDateStr;
    const daysNeeded = Math.ceil(totalHours / capacityPerDay);
    let daysProcessed = 0;
    let currDate = new Date(startDateStr + 'T12:00:00');
    while (daysProcessed < daysNeeded) {
        if (isWorkingDay(currDate)) daysProcessed++;
        if (daysProcessed < daysNeeded) currDate.setDate(currDate.getDate() + 1);
    }
    return formatDateStr(currDate);
  }, [isWorkingDay]);

  const checkActiveAssignment = useCallback((empId: string, dateStr: string, slotKey: 'MORNING' | 'AFTERNOON' | 'NIGHT', currentSchedulesList: Schedule[]) => {
    const empSchedule = currentSchedulesList.find(s => s.employeeId === empId);
    if (!empSchedule) return null;
    const directShift = empSchedule.shifts[dateStr];
    if (directShift && directShift.activeSlots?.includes(slotKey)) {
        return { 
          type: directShift.type, 
          courseName: directShift.slotDetails?.[slotKey]?.courseName || directShift.courseName,
          schoolName: directShift.slotDetails?.[slotKey]?.schoolName 
        };
    }
    for (const shift of Object.values(empSchedule.shifts) as Shift[]) {
        const detail = shift.slotDetails?.[slotKey];
        if (detail && detail.startDateStr && detail.endDateStr) {
            if (dateStr >= detail.startDateStr && dateStr <= detail.endDateStr) {
                return { 
                  type: shift.type, 
                  courseName: detail.courseName,
                  schoolName: detail.schoolName 
                };
            }
        }
    }
    return null;
  }, []);

  // CÁLCULO DE OCIOSIDADE POR COLABORADOR
  const individualStats = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    let businessDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
        if (isWorkingDay(new Date(year, month, d))) businessDays++;
    }
    const potentialHours = businessDays * 12;

    const stats: Record<string, { worked: number; idle: number }> = {};

    displayedEmployees.forEach(emp => {
      let worked = 0;
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        if (!isWorkingDay(dateObj)) continue;
        
        const dateStr = formatDateStr(dateObj);
        const m = checkActiveAssignment(emp.id, dateStr, 'MORNING', schedules);
        const t = checkActiveAssignment(emp.id, dateStr, 'AFTERNOON', schedules);
        const n = checkActiveAssignment(emp.id, dateStr, 'NIGHT', schedules);

        if (m && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(m.type)) worked += 4;
        if (t && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(t.type)) worked += 4;
        if (n && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(n.type)) worked += 4;
      }
      stats[emp.id] = { worked, idle: Math.max(0, potentialHours - worked) };
    });

    return stats;
  }, [schedules, currentDate, displayedEmployees, checkActiveAssignment, isWorkingDay]);

  const calendarTotals = useMemo(() => {
    let h40 = 0;
    let h20 = 0;
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    displayedEmployees.forEach(emp => {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        if (!isWorkingDay(dateObj)) continue;
        const dateStr = formatDateStr(dateObj);
        const m = checkActiveAssignment(emp.id, dateStr, 'MORNING', schedules);
        const t = checkActiveAssignment(emp.id, dateStr, 'AFTERNOON', schedules);
        const n = checkActiveAssignment(emp.id, dateStr, 'NIGHT', schedules);
        if (m && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(m.type)) h40 += 4;
        if (t && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(t.type)) h40 += 4;
        if (n && [ShiftType.T1, ShiftType.Q1, ShiftType.PLAN].includes(n.type)) h20 += 4;
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
            if (!shifts[dateStr] && !isWorkingDay(dateObj)) {
                shifts[dateStr] = { date: dateStr, type: ShiftType.FINAL, activeSlots: ['MORNING', 'AFTERNOON', 'NIGHT'], courseName: 'Fim de Semana' };
            }
        }
        return { employeeId: emp.id, shifts: shifts };
    });
    setSchedules(newSchedules);
  }, [employees, currentDate, isWorkingDay, currentSchedules]);

  const handleGenerateAI = async () => {
    if (!permission.add) return;
    setLoading(true);
    try {
      const aiData = await generateSmartSchedule(displayedEmployees, currentDate.getFullYear(), currentDate.getMonth() + 1);
      if (aiData && aiData.length > 0) {
        setSchedules(prev => {
            const newSchedules = [...prev];
            displayedEmployees.forEach(emp => {
                const empAiData = aiData.find((d: any) => d.employeeName === emp.name) || aiData.find((d:any) => d.employeeId === emp.id);
                if (empAiData && empAiData.shifts) {
                     const shifts: Record<string, any> = { ...prev.find(s => s.employeeId === emp.id)?.shifts };
                     empAiData.shifts.forEach((s: any) => {
                        const dayStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(s.day).padStart(2, '0')}`;
                        shifts[dayStr] = { 
                          date: dayStr, 
                          type: s.type, 
                          activeSlots: s.type === ShiftType.OFF ? [] : ['MORNING', 'AFTERNOON', 'NIGHT'] 
                        };
                     });
                     const index = newSchedules.findIndex(s => s.employeeId === emp.id);
                     if (index !== -1) newSchedules[index] = { ...newSchedules[index], shifts };
                }
            });
            return newSchedules;
        });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSaveSystem = () => {
    if (!permission.edit) return;
    if (onSave) onSave(schedules);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const openShiftEditor = (empId: string, day: number) => {
    if (!permission.edit) return;
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existingShift = schedules.find(s => s.employeeId === empId)?.shifts[dateStr];
    setEditingState({
        employeeId: empId, baseDateStr: dateStr, type: existingShift?.type || ShiftType.T1,
        slots: {
            MORNING: { active: existingShift?.activeSlots?.includes('MORNING') || false, startDateStr: existingShift?.slotDetails?.['MORNING']?.startDateStr || dateStr, totalHours: existingShift?.slotDetails?.['MORNING']?.totalHours || 0, endDateStr: existingShift?.slotDetails?.['MORNING']?.endDateStr || dateStr, courseName: existingShift?.slotDetails?.['MORNING']?.courseName || '', schoolName: existingShift?.slotDetails?.['MORNING']?.schoolName || '' },
            AFTERNOON: { active: existingShift?.activeSlots?.includes('AFTERNOON') || false, startDateStr: existingShift?.slotDetails?.['AFTERNOON']?.startDateStr || dateStr, totalHours: existingShift?.slotDetails?.['AFTERNOON']?.totalHours || 0, endDateStr: existingShift?.slotDetails?.['AFTERNOON']?.endDateStr || dateStr, courseName: existingShift?.slotDetails?.['AFTERNOON']?.courseName || '', schoolName: existingShift?.slotDetails?.['AFTERNOON']?.schoolName || '' },
            NIGHT: { active: existingShift?.activeSlots?.includes('NIGHT') || false, startDateStr: existingShift?.slotDetails?.['NIGHT']?.startDateStr || dateStr, totalHours: existingShift?.slotDetails?.['NIGHT']?.totalHours || 0, endDateStr: existingShift?.slotDetails?.['NIGHT']?.endDateStr || dateStr, courseName: existingShift?.slotDetails?.['NIGHT']?.courseName || '', schoolName: existingShift?.slotDetails?.['NIGHT']?.schoolName || '' }
        }
    });
  };

  const saveShiftDetails = () => {
      if (!editingState || !permission.edit) return;
      setSchedules(prev => prev.map(sch => {
          if (sch.employeeId !== editingState.employeeId) return sch;
          const updatedShifts = { ...sch.shifts };
          const baseDate = editingState.baseDateStr;
          const activeSlots: ('MORNING' | 'AFTERNOON' | 'NIGHT')[] = [];
          const slotDetails: any = {};
          (['MORNING', 'AFTERNOON', 'NIGHT'] as const).forEach(slot => {
            const config = editingState.slots[slot];
            if (config.active) {
                activeSlots.push(slot);
                slotDetails[slot] = { courseName: config.courseName, schoolName: config.schoolName, startDateStr: config.startDateStr, endDateStr: config.endDateStr, totalHours: config.totalHours };
            }
          });
          updatedShifts[baseDate] = { date: baseDate, type: editingState.type, activeSlots, slotDetails, courseName: editingState.slots.MORNING.courseName || editingState.slots.AFTERNOON.courseName || editingState.slots.NIGHT.courseName };
          return { ...sch, shifts: updatedShifts };
      }));
      setEditingState(null);
  };

  return (
    <div className="flex flex-col gap-8 relative">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <NeonCard glowColor="blue" className="bg-[#0b1221]/80 border-blue-500/20">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><Clock size={24} /></div>
                  <div><p className="text-xs font-mono uppercase text-slate-500 tracking-wider font-bold mb-1">Carga 40H</p><p className="text-2xl font-bold text-white leading-none">{calendarTotals.h40} h</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="purple" className="bg-[#0b1221]/80 border-purple-500/20">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Clock size={24} /></div>
                  <div><p className="text-xs font-mono uppercase text-slate-500 tracking-wider font-bold mb-1">Carga 20H</p><p className="text-2xl font-bold text-white leading-none">{calendarTotals.h20} h</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="cyan" className="bg-[#0b1221]/80 border-cyan-500/20">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400"><Calculator size={24} /></div>
                  <div><p className="text-xs font-mono uppercase text-slate-500 tracking-wider font-bold mb-1">Horas Úteis</p><p className="text-2xl font-bold text-white leading-none">{calendarTotals.totalHours} h</p></div>
              </div>
          </NeonCard>
          <NeonCard glowColor="orange" className="bg-emerald-900/10 border-emerald-500/40 shadow-neon-emerald">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400"><Wallet size={24} /></div>
                  <div><p className="text-xs font-mono uppercase text-emerald-500/70 tracking-wider font-bold mb-1">Bruto Estimado</p><p className="text-2xl font-bold text-emerald-400 font-mono leading-none">{calendarTotals.totalNet.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
              </div>
          </NeonCard>
      </div>

      <NeonCard className="p-0" glowColor="cyan">
        <div className="flex flex-col md:flex-row justify-between items-center p-6 gap-6">
          <div className="flex items-center gap-6">
            <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20"><CalendarIcon className="text-cyan-400 w-8 h-8" /></div>
            <div>
                <h2 className="text-2xl font-bold text-white tracking-widest uppercase font-mono">{monthName}</h2>
                <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-widest font-bold">Valor Hora:</span>
                    <div className="flex items-center bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-2 shadow-inner">
                        <span className="text-sm text-cyan-500 font-mono mr-2 font-black">R$</span>
                        <input type="number" step="0.5" disabled={!permission.edit} value={hourlyRate} onChange={(e) => onHourlyRateChange(parseFloat(e.target.value) || 0)} className="bg-transparent border-none text-sm font-mono text-white w-16 focus:outline-none font-black disabled:opacity-50" />
                    </div>
                </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-3 hover:bg-white/10 rounded-xl transition-all border border-white/5"><ChevronLeft className="text-slate-300 w-6 h-6" /></button>
             <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-3 hover:bg-white/10 rounded-xl transition-all border border-white/5"><ChevronRight className="text-slate-300 w-6 h-6" /></button>
          </div>
          <div className="flex gap-4">
             {permission.add && <button onClick={handleGenerateAI} disabled={loading} className="flex items-center gap-3 px-8 py-3 rounded-xl font-black text-sm uppercase bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-lg shadow-purple-500/20">{loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Wand2 className="w-5 h-5" />} IA</button>}
             {permission.edit && <button onClick={handleSaveSystem} className={`flex items-center gap-3 px-8 py-3 rounded-xl font-black text-sm uppercase transition-all shadow-xl ${saveSuccess ? 'bg-green-600' : 'bg-slate-800 hover:bg-slate-700 border border-white/10'}`}>{saveSuccess ? <CheckCircle className="w-5 h-5" /> : <Save className="w-5 h-5" />} Salvar</button>}
          </div>
        </div>
      </NeonCard>

      {editingState && permission.edit && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-lg p-4 animate-in fade-in duration-300">
              <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                  <NeonCard glowColor="cyan" title="Configurador de Turnos e Prazos" icon={<Clock size={20}/>}>
                      <div className="space-y-10">
                          <div className="grid grid-cols-5 gap-4">{Object.values(ShiftType).map(type => (<button key={type} onClick={() => setEditingState({...editingState, type})} className={`py-4 px-2 rounded-xl text-sm font-black transition-all shadow-lg ${editingState.type === type ? SHIFT_COLORS[type] : 'bg-slate-900 text-slate-500 border border-white/5'}`}>{type}</button>))}</div>
                          <div className="space-y-6">{(['MORNING', 'AFTERNOON', 'NIGHT'] as const).map((slot) => (<div key={slot} className={`p-6 rounded-2xl border transition-all ${editingState.slots[slot].active ? 'border-cyan-500/40 bg-cyan-500/5 shadow-neon-cyan/5' : 'border-white/5 opacity-40 hover:opacity-70'}`}><div className="flex flex-col md:flex-row gap-6"><div className="flex items-center gap-4 min-w-[140px]"><button onClick={() => setEditingState({...editingState, slots: {...editingState.slots, [slot]: {...editingState.slots[slot], active: !editingState.slots[slot].active}}})} className="p-1 transition-transform hover:scale-110">{editingState.slots[slot].active ? <CheckSquare className="text-cyan-400 w-8 h-8"/> : <Square className="text-slate-600 w-8 h-8"/>}</button><span className="text-sm font-black text-white uppercase tracking-widest">{SHIFT_SLOTS[slot].label}</span></div><div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4"><div className="md:col-span-2 space-y-1"><label className="text-[10px] font-mono text-slate-500 uppercase font-black">Disciplina / Atividade</label><select value={editingState.slots[slot].courseName} onChange={e => setEditingState({...editingState, slots: {...editingState.slots, [slot]: {...editingState.slots[slot], courseName: e.target.value}}})} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold"><option value="">Selecione um curso...</option>{availableCourses.map(c => <option key={c} value={c}>{c}</option>)}</select></div><div className="md:col-span-2 space-y-1"><label className="text-[10px] font-mono text-slate-500 uppercase font-black flex items-center gap-2"><School size={12} className="text-cyan-500" /> Escola / Unidade</label><select value={editingState.slots[slot].schoolName} onChange={e => setEditingState({...editingState, slots: {...editingState.slots, [slot]: {...editingState.slots[slot], schoolName: e.target.value}}})} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-bold"><option value="">Selecione uma escola...</option>{schools.map(s => <option key={s} value={s}>{s}</option>)}</select></div><div className="space-y-1"><label className="text-[10px] font-mono text-slate-500 uppercase font-black">Data Início</label><input type="date" value={editingState.slots[slot].startDateStr} onChange={e => { const newStart = e.target.value; const newEnd = calculateEndDate(newStart, editingState.slots[slot].totalHours); setEditingState({...editingState, slots: {...editingState.slots, [slot]: {...editingState.slots[slot], startDateStr: newStart, endDateStr: newEnd}}}); }} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-[11px] text-white focus:outline-none focus:border-cyan-500 font-mono font-bold" /></div><div className="space-y-1"><label className="text-[10px] font-mono text-slate-500 uppercase font-black">Data Fim</label><div className="relative"><input type="date" value={editingState.slots[slot].endDateStr} className="w-full bg-slate-900/50 border border-cyan-500/20 rounded-xl p-3 text-[11px] text-cyan-400/70 focus:outline-none focus:border-cyan-500 font-mono font-bold cursor-not-allowed" readOnly /><Zap size={12} className="absolute right-3 top-4 text-cyan-500 animate-pulse" /></div></div><div className="space-y-1"><label className="text-[10px] font-mono text-slate-500 uppercase font-black">Carga Total (h)</label><div className="relative"><input type="number" placeholder="Ex: 60" value={editingState.slots[slot].totalHours || ''} onChange={e => { const hours = parseInt(e.target.value) || 0; const currentSlot = editingState.slots[slot]; const newEnd = calculateEndDate(currentSlot.startDateStr, hours); setEditingState({...editingState, slots: {...editingState.slots, [slot]: {...currentSlot, totalHours: hours, endDateStr: newEnd, active: hours > 0}}}); }} className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-black shadow-inner" /><span className="absolute right-3 top-3.5 text-[10px] text-slate-500 font-mono">h</span></div></div></div></div></div>))}</div>
                          <div className="flex gap-6 pt-6"><button onClick={() => setEditingState(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-5 rounded-2xl font-black text-base uppercase tracking-widest border border-white/10 transition-all">Cancelar</button><button onClick={saveShiftDetails} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-5 rounded-2xl font-black text-base uppercase tracking-widest shadow-neon-cyan transition-all">Confirmar Ajustes</button></div>
                      </div>
                  </NeonCard>
              </div>
          </div>
      )}

      <NeonCard className="overflow-hidden p-0" glowColor="none">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-900/70">
                <th className="sticky left-0 z-20 bg-sci-bg p-5 text-left border-b border-r border-white/10 min-w-[240px] shadow-xl"><span className="text-xs font-mono text-slate-500 uppercase tracking-widest font-black">Equipe Operacional</span></th>
                {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => (
                  <th key={day} className="p-3 min-w-[100px] text-center border-b border-white/10">
                    <div className="flex flex-col items-center">
                        <span className="text-[11px] text-slate-500 uppercase font-mono font-bold">{new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('pt-BR', { weekday: 'narrow' })}</span>
                        <span className="text-sm font-black text-slate-200">{day}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedEmployees.map((emp) => (
                <tr key={emp.id} className="group hover:bg-white/5 transition-colors">
                  <td className="sticky left-0 z-10 p-4 border-r border-b border-white/10 bg-[#050b14] group-hover:bg-[#0b1221] shadow-lg">
                    <div className="flex items-center gap-4 relative">
                        <img src={emp.avatarUrl} alt="" className="w-10 h-10 rounded-full border-2 border-slate-700 shadow-inner" />
                        <div className="flex flex-col truncate">
                            <span className="text-sm font-black text-slate-200 truncate max-w-[120px]">{emp.name}</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded border ${individualStats[emp.id]?.idle > 30 ? 'bg-red-500/10 text-red-500 border-red-500/30' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                                    {individualStats[emp.id]?.idle} h <small className="opacity-50 text-[8px]">ociosas</small>
                                </span>
                            </div>
                        </div>
                    </div>
                  </td>
                  {Array.from({ length: new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate() }, (_, i) => i + 1).map(day => {
                    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const morningAsgn = checkActiveAssignment(emp.id, dateStr, 'MORNING', schedules);
                    const afternoonAsgn = checkActiveAssignment(emp.id, dateStr, 'AFTERNOON', schedules);
                    const nightAsgn = checkActiveAssignment(emp.id, dateStr, 'NIGHT', schedules);
                    return (
                      <td key={day} onClick={() => openShiftEditor(emp.id, day)} className={`p-1 border-b border-white/5 transition-all min-w-[100px] ${permission.edit ? 'cursor-pointer hover:bg-cyan-500/15' : 'cursor-default'}`}>
                         <div className="w-full h-[90px] flex flex-col gap-[2px]">
                           {[morningAsgn, afternoonAsgn, nightAsgn].map((asgn, idx) => (
                             <div key={idx} className={`h-full w-full rounded-md transition-all flex flex-col justify-center px-2 overflow-hidden relative ${asgn ? SHIFT_COLORS[asgn.type] : 'bg-slate-800/30'}`}>
                                {asgn?.courseName && <span className="text-[9px] font-black uppercase tracking-tighter truncate text-white drop-shadow-md">{asgn.courseName}</span>}
                                {asgn?.schoolName && <span className="text-[7px] opacity-70 truncate text-white">{asgn.schoolName}</span>}
                             </div>
                           ))}
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
