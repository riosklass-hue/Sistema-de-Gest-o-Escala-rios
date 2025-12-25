
import React, { useState, useRef, useEffect } from 'react';
import { 
  UserPlus, Shield, Camera, Upload, ChevronRight, Search, 
  CheckCircle, Edit2, Trash2, X, TriangleAlert, EyeOff, 
  FileSpreadsheet, Users, UserX, MessageCircle, BookOpen, 
  GraduationCap, CheckSquare, Square, Folder, UserCircle, Plus, 
  BookCheck, School, Building, Loader2, Mail, Phone, Lock, Eye,
  CalendarDays, Hash, Fingerprint, Info, CalendarClock, FileBarChart,
  PieChart as PieIcon, Activity, AlertCircle, Cake, Gift, User, 
  PlusCircle, LayoutList, Tag, CalendarRange, Filter, ChevronDown, Layers,
  Save
} from 'lucide-react';
import NeonCard from './NeonCard';
import { Employee, UserRole, ModulePermission, ClassGroup, CourseGroup } from '../types';
import { registerUser } from '../services/authService';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

interface RegistrationPanelProps {
  onRegisterEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee, newPassword?: string) => void;
  onDeleteEmployee: (id: string) => void;
  employees: Employee[];
  availableCourses: string[];
  onUpdateCourses: (courses: string[]) => void;
  schools: string[];
  onUpdateSchools: (schools: string[]) => void;
  classes: ClassGroup[];
  onUpdateClasses: (classes: ClassGroup[]) => void;
  courseGroups: CourseGroup[];
  onUpdateCourseGroups: (groups: CourseGroup[]) => void;
  permission: ModulePermission; 
}

const RegistrationPanel: React.FC<RegistrationPanelProps> = ({ 
  onRegisterEmployee, 
  onUpdateEmployee,
  onDeleteEmployee,
  employees,
  availableCourses,
  onUpdateCourses,
  schools,
  onUpdateSchools,
  classes,
  onUpdateClasses,
  courseGroups,
  onUpdateCourseGroups,
  permission
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'EMPLOYEES' | 'CLASSES' | 'COURSES' | 'SCHOOLS' | 'REPORTS'>('EMPLOYEES');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [formTab, setFormTab] = useState<'BASIC' | 'ID' | 'ACCESS' | 'SKILLS'>('BASIC');
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  
  // Courses Internal Tabs
  const [coursesViewMode, setCoursesViewMode] = useState<'INDIVIDUAL' | 'GROUPS'>('INDIVIDUAL');

  // States for Class Filtering
  const [classTypeFilter, setClassTypeFilter] = useState<'ALL' | 'Técnico' | 'Qualificação'>('ALL');
  const [classDateFilter, setClassDateFilter] = useState('');

  // States for new entries
  const [newCourseName, setNewCourseName] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  
  // States for Group Management
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedCoursesForGroup, setSelectedCoursesForGroup] = useState<string[]>([]);
  
  // State for Class Form
  const [classFormData, setClassFormData] = useState<Partial<ClassGroup>>({
    name: '', type: 'Técnico', courseGroupName: '', startDate: '', endDate: ''
  });
  const [editingClassId, setEditingClassId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', username: '', password: '',
    registration: '', birthDate: '', contractExpiration: '',
    role: 'TEACHER' as UserRole, jobTitle: 'Técnico', avatarPreview: '',
    active: true, skills: [] as string[], qualifications: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const inactiveCount = employees.filter(e => !e.active).length;
  const activeCount = employees.filter(e => e.active).length;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredEmployees = employees.filter(emp => emp.active === !showInactive);

  // Relatório Data
  const roleDistribution = [
    { name: 'Admins', value: employees.filter(e => e.userRole === 'ADMIN').length, color: '#bc13fe' },
    { name: 'Coord.', value: employees.filter(e => e.userRole === 'COORDINATOR').length, color: '#00f3ff' },
    { name: 'Superv.', value: employees.filter(e => e.userRole === 'SUPERVISOR').length, color: '#f59e0b' },
    { name: 'Profs.', value: employees.filter(e => e.userRole === 'TEACHER').length, color: '#10b981' },
  ];

  const expiringSoon = employees.filter(e => {
    if (!e.contractExpiration) return false;
    const expDate = new Date(e.contractExpiration);
    const limit = new Date();
    limit.setMonth(limit.getMonth() + 6);
    return expDate < limit;
  }).sort((a,b) => new Date(a.contractExpiration!).getTime() - new Date(b.contractExpiration!).getTime());

  const handleEdit = (emp: Employee) => {
      setEditingId(emp.id);
      setFormData({
          name: emp.name, email: emp.email || '', phone: emp.phone || '',
          registration: emp.registration || '', birthDate: emp.birthDate || '',
          contractExpiration: emp.contractExpiration || '',
          username: emp.username || emp.name.toLowerCase().replace(/\s/g, '.'),
          password: '', role: emp.userRole || 'TEACHER', jobTitle: emp.role,
          avatarPreview: emp.avatarUrl, active: emp.active, skills: emp.skills || [],
          qualifications: emp.qualifications || ''
      });
      setFormTab('BASIC');
      setView('form');
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteEmployee(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleAddCourse = () => {
    if (newCourseName.trim() && !availableCourses.includes(newCourseName)) {
      onUpdateCourses([...availableCourses, newCourseName.trim()]);
      setNewCourseName('');
    }
  };

  const handleRemoveCourse = (course: string) => {
    onUpdateCourses(availableCourses.filter(c => c !== course));
  };

  const handleAddCourseGroup = () => {
    if (newGroupName.trim()) {
        if (editingGroupId) {
            onUpdateCourseGroups(courseGroups.map(g => g.id === editingGroupId ? { ...g, name: newGroupName.trim(), courses: selectedCoursesForGroup } : g));
            setEditingGroupId(null);
        } else {
            const newGroup: CourseGroup = {
                id: `group-${Date.now()}`,
                name: newGroupName.trim(),
                courses: selectedCoursesForGroup
            };
            onUpdateCourseGroups([...courseGroups, newGroup]);
        }
        setNewGroupName('');
        setSelectedCoursesForGroup([]);
    }
  };

  const handleEditCourseGroup = (group: CourseGroup) => {
    setEditingGroupId(group.id);
    setNewGroupName(group.name);
    setSelectedCoursesForGroup(group.courses);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRemoveCourseGroup = (id: string) => {
    onUpdateCourseGroups(courseGroups.filter(g => g.id !== id));
    if (editingGroupId === id) {
        setEditingGroupId(null);
        setNewGroupName('');
        setSelectedCoursesForGroup([]);
    }
  };

  const handleAddSchool = () => {
    if (newSchoolName.trim() && !schools.includes(newSchoolName)) {
      onUpdateSchools([...schools, newSchoolName.trim()]);
      setNewSchoolName('');
    }
  };

  const handleRemoveSchool = (school: string) => {
    onUpdateSchools(schools.filter(s => s !== school));
  };

  const handleClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClassId) {
      onUpdateClasses(classes.map(c => c.id === editingClassId ? { ...c, ...classFormData } as ClassGroup : c));
      setEditingClassId(null);
    } else {
      const newClass: ClassGroup = {
        id: `class-${Date.now()}`,
        name: classFormData.name || '',
        type: classFormData.type as any || 'Técnico',
        courseGroupName: classFormData.courseGroupName || '',
        startDate: classFormData.startDate || '',
        endDate: classFormData.endDate || ''
      };
      onUpdateClasses([...classes, newClass]);
    }
    setClassFormData({ name: '', type: 'Técnico', courseGroupName: '', startDate: '', endDate: '' });
    setView('list');
  };

  const handleEditClass = (cls: ClassGroup) => {
    setEditingClassId(cls.id);
    setClassFormData({ ...cls });
    setView('form');
  };

  const handleDeleteClass = (id: string) => {
    onUpdateClasses(classes.filter(c => c.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId && !permission.edit) return;
    if (!editingId && !permission.add) return;
    setLoading(true);
    setStatus('idle');
    try {
        if (editingId) {
            onUpdateEmployee({
                id: editingId, name: formData.name, registration: formData.registration,
                birthDate: formData.birthDate, contractExpiration: formData.contractExpiration,
                username: formData.username, email: formData.email, phone: formData.phone,
                role: formData.jobTitle, userRole: formData.role,
                avatarUrl: formData.avatarPreview || `https://ui-avatars.com/api/?name=${formData.name}&background=random&color=fff`,
                active: formData.active, skills: formData.skills, qualifications: formData.qualifications
            }, formData.password.trim() || undefined);
            setStatus('success');
            setMessage(`Colaborador atualizado com sucesso!`);
        } else {
            const maxId = employees.length > 0 ? Math.max(...employees.map(e => parseInt(e.id) || 0)) : 0;
            const newId = (maxId + 1).toString();
            await registerUser({ username: formData.username, name: formData.name, role: formData.role, employeeId: newId }, formData.password || '123');
            onRegisterEmployee({
                id: newId, name: formData.name, registration: formData.registration, birthDate: formData.birthDate,
                contractExpiration: formData.contractExpiration, username: formData.username, email: formData.email,
                phone: formData.phone, role: formData.jobTitle, userRole: formData.role,
                avatarUrl: formData.avatarPreview || `https://ui-avatars.com/api/?name=${formData.name}&background=random&color=fff`,
                active: formData.active, skills: formData.skills, qualifications: formData.qualifications
            });
            setStatus('success');
            setMessage(`Usuário cadastrado com sucesso!`);
        }
        setTimeout(() => { setView('list'); setStatus('idle'); setEditingId(null); }, 1500);
    } catch (err: any) { setStatus('error'); setMessage(err.message || 'Erro no processo.'); } 
    finally { setLoading(false); }
  };

  const renderReportsView = () => (
    <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <NeonCard glowColor="blue" className="bg-blue-500/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><Users size={24}/></div>
                    <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black">Ativos</p><p className="text-xl md:text-2xl font-black text-white leading-none">{activeCount}</p></div>
                </div>
            </NeonCard>
            <NeonCard glowColor="purple" className="bg-purple-500/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><BookOpen size={24}/></div>
                    <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black">Cursos</p><p className="text-xl md:text-2xl font-black text-white leading-none">{availableCourses.length}</p></div>
                </div>
            </NeonCard>
            <NeonCard glowColor="cyan" className="bg-cyan-500/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400"><Building size={24}/></div>
                    <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black">Escolas</p><p className="text-xl md:text-2xl font-black text-white leading-none">{schools.length}</p></div>
                </div>
            </NeonCard>
            <NeonCard glowColor="orange" className="bg-orange-500/5">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-500/10 rounded-xl text-orange-400"><AlertCircle size={24}/></div>
                    <div><p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black">Vencimentos</p><p className="text-xl md:text-2xl font-black text-white leading-none">{expiringSoon.length}</p></div>
                </div>
            </NeonCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            <div className="lg:col-span-2">
                <NeonCard title="Integridade de Contratos" icon={<CalendarClock size={18}/>}>
                    <div className="overflow-x-auto mt-4 -mx-4 md:mx-0">
                        <table className="w-full text-left min-w-[500px]">
                            <thead className="bg-slate-900/50 border-b border-white/10 text-[10px] font-mono text-slate-500 uppercase font-black">
                                <tr>
                                    <th className="p-4">Colaborador</th>
                                    <th className="p-4">Matrícula</th>
                                    <th className="p-4">Vencimento</th>
                                    <th className="p-4">Risco</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {expiringSoon.map(emp => (
                                    <tr key={emp.id} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 flex items-center gap-3">
                                            <img src={emp.avatarUrl} className="w-8 h-8 rounded-full border border-white/10" />
                                            <span className="text-xs font-bold text-slate-200 truncate max-w-[120px]">{emp.name}</span>
                                        </td>
                                        <td className="p-4 text-xs font-mono text-slate-400">{emp.registration}</td>
                                        <td className="p-4 text-xs font-black text-cyan-400">{new Date(emp.contractExpiration!).toLocaleDateString('pt-BR')}</td>
                                        <td className="p-4">
                                            <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden min-w-[60px]">
                                                <div className="h-full bg-orange-500" style={{ width: '70%' }}></div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </NeonCard>
            </div>
            <div className="lg:col-span-1">
                <NeonCard title="Perfil de Acesso" icon={<PieIcon size={18}/>}>
                    <div className="h-[250px] md:h-[300px] mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={roleDistribution} dataKey="value" innerRadius={50} outerRadius={70} paddingAngle={10}>
                                    {roleDistribution.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#0b1221', border: '1px solid #1e293b', borderRadius: '12px' }} />
                                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </NeonCard>
            </div>
        </div>
    </div>
  );

  const renderCoursesView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <NeonCard glowColor="purple" title="Gestão Educacional" icon={<BookOpen size={18}/>}>
            <div className="flex bg-slate-950/60 p-1.5 rounded-2xl border border-white/5 mb-8 w-full max-w-md mx-auto">
                <button 
                    onClick={() => { setCoursesViewMode('INDIVIDUAL'); setEditingGroupId(null); }}
                    className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${coursesViewMode === 'INDIVIDUAL' ? 'bg-purple-600 text-white shadow-neon-purple' : 'text-slate-500 hover:text-white'}`}
                >
                    Individual (Eixos)
                </button>
                <button 
                    onClick={() => setCoursesViewMode('GROUPS')}
                    className={`flex-1 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${coursesViewMode === 'GROUPS' ? 'bg-purple-600 text-white shadow-neon-purple' : 'text-slate-500 hover:text-white'}`}
                >
                    Grupos de Curso
                </button>
            </div>

            {coursesViewMode === 'INDIVIDUAL' ? (
                <div className="space-y-8">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <BookOpen className="absolute left-4 top-3.5 text-slate-500 w-5 h-5" />
                            <input 
                                type="text" 
                                placeholder="Nome do novo curso..." 
                                className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white font-bold placeholder:text-slate-600 focus:border-purple-500 transition-all"
                                value={newCourseName}
                                onChange={(e) => setNewCourseName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCourse()}
                            />
                        </div>
                        <button 
                            onClick={handleAddCourse}
                            className="px-8 py-3.5 bg-purple-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-neon-purple flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <PlusCircle size={18}/> Adicionar
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {availableCourses.map(course => (
                            <div key={course} className="flex items-center justify-between p-4 bg-slate-900/50 border border-white/5 rounded-2xl group hover:border-purple-500/30 transition-all">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><GraduationCap size={16}/></div>
                                    <span className="text-xs font-black text-slate-200 uppercase tracking-tight">{course}</span>
                                </div>
                                <button 
                                    onClick={() => handleRemoveCourse(course)}
                                    className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="space-y-8">
                    <div className="bg-slate-900/40 p-6 rounded-2xl border border-white/5 space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-mono uppercase text-purple-400 font-black tracking-widest">{editingGroupId ? 'Modo de Edição Ativo' : 'Novo Painel de Grupo'}</h4>
                            {editingGroupId && (
                                <button onClick={() => { setEditingGroupId(null); setNewGroupName(''); setSelectedCoursesForGroup([]); }} className="text-[10px] font-black text-red-400 hover:text-red-300 uppercase underline">Cancelar Edição</button>
                            )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase text-slate-500 font-black">Nome do Grupo</label>
                                <input 
                                    type="text" 
                                    placeholder="Ex: Eixo Elétrica, Nível Superior..." 
                                    className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold focus:border-purple-500 transition-all"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase text-slate-500 font-black">Cursos Selecionados (Clique para vincular)</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-950 border border-white/10 rounded-xl scrollbar-hide">
                                    {availableCourses.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => {
                                                setSelectedCoursesForGroup(prev => 
                                                    prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
                                                );
                                            }}
                                            className={`px-3 py-2 rounded-lg text-[9px] font-bold uppercase transition-all border text-left flex items-center gap-2 ${
                                                selectedCoursesForGroup.includes(c) 
                                                    ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-neon-purple/20' 
                                                    : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/20'
                                            }`}
                                        >
                                            <div className={`w-2 h-2 rounded-full ${selectedCoursesForGroup.includes(c) ? 'bg-purple-400 animate-pulse' : 'bg-slate-800'}`}></div>
                                            <span className="truncate">{c}</span>
                                        </button>
                                    ))}
                                </div>
                                <p className="text-[9px] text-slate-600 mt-2 italic">Você pode clicar livremente em qualquer curso para compor o grupo.</p>
                            </div>
                        </div>
                        <button 
                            onClick={handleAddCourseGroup}
                            disabled={!newGroupName || selectedCoursesForGroup.length === 0}
                            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-neon-purple active:scale-95 transition-all flex items-center justify-center gap-3 ${
                                !newGroupName || selectedCoursesForGroup.length === 0 
                                ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50' 
                                : 'bg-purple-600 text-white'
                            }`}
                        >
                            {editingGroupId ? <Save size={18}/> : <Plus size={18}/>}
                            {editingGroupId ? 'Atualizar Grupo de Cursos' : 'Criar Grupo de Cursos'}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {courseGroups.map(group => (
                            <div key={group.id} className={`bg-slate-950 border rounded-2xl overflow-hidden group hover:border-purple-500/40 transition-all ${editingGroupId === group.id ? 'border-purple-500 ring-1 ring-purple-500/30' : 'border-white/10'}`}>
                                <div className="bg-slate-900/60 p-4 border-b border-white/10 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <Layers className="text-purple-400 w-5 h-5" />
                                        <h4 className="text-sm font-black text-white uppercase tracking-tighter">{group.name}</h4>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleEditCourseGroup(group)}
                                            className="p-2 text-slate-600 hover:text-cyan-400 transition-colors"
                                            title="Editar Grupo"
                                        >
                                            <Edit2 size={16}/>
                                        </button>
                                        <button 
                                            onClick={() => handleRemoveCourseGroup(group.id)}
                                            className="p-2 text-slate-600 hover:text-red-400 transition-colors"
                                            title="Excluir Grupo"
                                        >
                                            <Trash2 size={16}/>
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 flex flex-wrap gap-2">
                                    {group.courses.map(c => (
                                        <span key={c} className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black rounded-md uppercase">
                                            {c}
                                        </span>
                                    ))}
                                    {group.courses.length === 0 && <span className="text-[10px] text-slate-600 italic">Sem cursos vinculados</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </NeonCard>
    </div>
  );

  const renderClassesView = () => {
    const filteredClasses = classes.filter(c => {
      const matchesType = classTypeFilter === 'ALL' || c.type === classTypeFilter;
      const matchesDate = !classDateFilter || c.startDate.includes(classDateFilter) || c.endDate.includes(classDateFilter);
      return matchesType && matchesDate;
    });

    if (view === 'form') return (
      <div className="animate-in zoom-in-95 duration-300">
        <NeonCard glowColor="cyan" title={editingClassId ? "Editar Turma" : "Nova Turma"} icon={<LayoutList size={18}/>}>
          <form onSubmit={handleClassSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-black">Identificação da Turma</label>
                <input required type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold" value={classFormData.name} onChange={e => setClassFormData({...classFormData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-black">Tipo de Turma</label>
                <select required className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold appearance-none" value={classFormData.type} onChange={e => setClassFormData({...classFormData, type: e.target.value as any})}>
                  <option value="Técnico">Técnico</option>
                  <option value="Qualificação">Qualificação</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-black">Grupo de Curso</label>
                <select className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold appearance-none" value={classFormData.courseGroupName} onChange={e => setClassFormData({...classFormData, courseGroupName: e.target.value})}>
                  <option value="">Selecione um Grupo (Opcional)</option>
                  {courseGroups.map(g => <option key={g.id} value={g.name}>{g.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-black">Data Início</label>
                <input required type="date" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold" value={classFormData.startDate} onChange={e => setClassFormData({...classFormData, startDate: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase text-slate-500 font-black">Data Fim</label>
                <input required type="date" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold" value={classFormData.endDate} onChange={e => setClassFormData({...classFormData, endDate: e.target.value})} />
              </div>
            </div>
            <div className="flex gap-4 pt-6">
              <button type="button" onClick={() => { setView('list'); setEditingClassId(null); }} className="flex-1 py-3.5 bg-slate-800 text-white rounded-xl text-xs font-black uppercase">Cancelar</button>
              <button type="submit" className="flex-[2] py-3.5 bg-cyan-600 text-white rounded-xl text-xs font-black uppercase shadow-neon-cyan">Salvar Turma</button>
            </div>
          </form>
        </NeonCard>
      </div>
    );

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-sci-panel/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
          <div className="flex gap-2 w-full lg:w-auto">
            <button onClick={() => { setEditingClassId(null); setView('form'); }} className="px-6 py-3 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-neon-cyan flex items-center justify-center gap-2">
              <Plus size={16}/> Nova Turma
            </button>
          </div>
          <div className="flex flex-wrap gap-4 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-48">
              <Filter className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
              <select 
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white appearance-none"
                value={classTypeFilter}
                onChange={e => setClassTypeFilter(e.target.value as any)}
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="Técnico">Técnico</option>
                <option value="Qualificação">Qualificação</option>
              </select>
            </div>
            <div className="relative flex-1 lg:w-48">
              <CalendarRange className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
              <input 
                type="month" 
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs text-white" 
                value={classDateFilter}
                onChange={e => setClassDateFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        <NeonCard className="p-0 overflow-hidden" glowColor="none">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-900/50 border-b border-white/10 text-[10px] font-mono text-slate-500 uppercase font-black">
                <tr>
                  <th className="p-4">Identificação</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4">Grupo de Curso</th>
                  <th className="p-4">Período</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClasses.length > 0 ? filteredClasses.map(cls => (
                  <tr key={cls.id} className="hover:bg-cyan-500/5 transition-all">
                    <td className="p-4 text-sm font-black text-slate-200 uppercase">{cls.name}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${cls.type === 'Técnico' ? 'text-emerald-400 bg-emerald-400/10' : 'text-purple-400 bg-purple-400/10'}`}>
                        {cls.type}
                      </span>
                    </td>
                    <td className="p-4">
                      {cls.courseGroupName ? (
                        <span className="px-2 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[9px] font-black rounded-md uppercase">
                          {cls.courseGroupName}
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-600 italic">Sem grupo</span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-mono text-slate-400">
                      {new Date(cls.startDate).toLocaleDateString('pt-BR')} até {new Date(cls.endDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEditClass(cls)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 border border-white/5 transition-all"><Edit2 size={16}/></button>
                        <button onClick={() => handleDeleteClass(cls.id)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/5 transition-all"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-600 uppercase font-bold text-xs">Nenhuma turma encontrada</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </NeonCard>
      </div>
    );
  };

  const renderSchoolsView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
        <NeonCard glowColor="cyan" title="Gestão de Unidades e Polos" icon={<School size={18}/>}>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Building className="absolute left-4 top-3.5 text-slate-500 w-5 h-5" />
                        <input 
                            type="text" 
                            placeholder="Nome da unidade ou polo..." 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white font-bold placeholder:text-slate-600 focus:border-cyan-500 transition-all"
                            value={newSchoolName}
                            onChange={(e) => setNewSchoolName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddSchool()}
                        />
                    </div>
                    <button 
                        onClick={handleAddSchool}
                        className="px-8 py-3.5 bg-cyan-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-neon-cyan flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <PlusCircle size={18}/> Vincular
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {schools.map(school => (
                        <div key={school} className="flex items-center justify-between p-5 bg-slate-900/50 border border-white/5 rounded-2xl group hover:border-cyan-500/30 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 shadow-inner"><Building size={20}/></div>
                                <span className="text-sm font-black text-slate-200 uppercase tracking-tighter">{school}</span>
                            </div>
                            <button 
                                onClick={() => handleRemoveSchool(school)}
                                className="p-2 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                                <Trash2 size={20}/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </NeonCard>
    </div>
  );

  const renderFormView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <div className="lg:col-span-2">
            <NeonCard glowColor="cyan" title={editingId ? "Ficha do Colaborador" : "Novo Ingresso"}>
                <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-white/10 pb-6 gap-4">
                        <button type="button" onClick={() => { setEditingId(null); setView('list'); }} className="text-cyan-400 text-sm font-black uppercase tracking-widest hover:text-cyan-300 flex items-center gap-2">
                            <ChevronRight className="rotate-180 w-4 h-4" /> Voltar
                        </button>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button type="button" onClick={() => setFormData({...formData, active: true})} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black transition-all ${formData.active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-900 text-slate-600'}`}>ATIVO</button>
                            <button type="button" onClick={() => setFormData({...formData, active: false})} className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black transition-all ${!formData.active ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-slate-900 text-slate-600'}`}>INATIVO</button>
                        </div>
                    </div>

                    <div className="flex flex-nowrap overflow-x-auto gap-2 bg-slate-950/50 p-1.5 rounded-2xl border border-white/5 scrollbar-hide">
                        {(['BASIC', 'ID', 'ACCESS', 'SKILLS'] as const).map(tab => (
                            <button key={tab} type="button" onClick={() => setFormTab(tab)} className={`whitespace-nowrap flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formTab === tab ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-500 hover:bg-white/5'}`}>
                                {tab === 'BASIC' ? <UserCircle size={14}/> : tab === 'ID' ? <Fingerprint size={14}/> : tab === 'ACCESS' ? <Shield size={14}/> : <BookCheck size={14}/>}
                                <span className="hidden sm:inline">{tab === 'BASIC' ? 'Básicos' : tab === 'ID' ? 'Matrícula' : tab === 'ACCESS' ? 'Acesso' : 'Skills'}</span>
                            </button>
                        ))}
                    </div>

                    <div className="min-h-[300px] animate-in fade-in duration-300">
                        {formTab === 'BASIC' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-2 md:col-span-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">Nome Completo</label><input required type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">Cargo Operacional</label><input required type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">Grupo de Acesso</label><select className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-bold appearance-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}><option value="ADMIN">Admin</option><option value="COORDINATOR">Coordenador</option><option value="SUPERVISOR">Supervisor</option><option value="TEACHER">Professor</option></select></div>
                            </div>
                        )}
                        {formTab === 'ID' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-cyan-400 font-black">Matrícula</label><input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-mono" value={formData.registration} onChange={e => setFormData({...formData, registration: e.target.value})} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-orange-400 font-black">Vencimento Contrato</label><input type="date" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white" value={formData.contractExpiration} onChange={e => setFormData({...formData, contractExpiration: e.target.value})} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">Data Nascimento</label><input type="date" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">WhatsApp</label><input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div>
                            </div>
                        )}
                        {formTab === 'ACCESS' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-cyan-500 font-black">Login</label><input required type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-mono" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-purple-500 font-black">Senha</label><input type="password" placeholder="••••••••" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-white font-mono" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
                            </div>
                        )}
                        {formTab === 'SKILLS' && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {availableCourses.map(course => (
                                    <button key={course} type="button" onClick={() => {
                                        const newSkills = formData.skills.includes(course) ? formData.skills.filter(s => s !== course) : [...formData.skills, course];
                                        setFormData({...formData, skills: newSkills});
                                    }} className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all ${formData.skills.includes(course) ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400' : 'bg-slate-900 border-white/5 text-slate-500'}`}>
                                        {formData.skills.includes(course) ? <CheckSquare size={14}/> : <Square size={14}/>}
                                        <span className="text-[10px] font-bold uppercase truncate">{course}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-white/10">
                        <button type="button" onClick={() => setView('list')} className="w-full sm:flex-1 py-3.5 bg-slate-800 text-white rounded-xl text-xs font-black uppercase">Cancelar</button>
                        <button type="submit" className="w-full sm:flex-[2] py-3.5 bg-cyan-600 text-white rounded-xl text-xs font-black uppercase shadow-neon-cyan">Salvar Registro</button>
                    </div>
                </form>
            </NeonCard>
        </div>
        <div className="lg:col-span-1 hidden lg:block">
            <NeonCard glowColor="purple" title="Info de Segurança" icon={<Fingerprint size={18}/>}>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">Os dados de matrícula e vencimento de contrato são integrados ao módulo de escalas para cálculo automático de carga horária e auditoria financeira.</p>
            </NeonCard>
        </div>
    </div>
  );

  const renderEmployeeList = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
        {/* DELETE CONFIRMATION OVERLAY */}
        {deleteConfirmId && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-sci-bg/90 backdrop-blur-md p-6">
                <div className="w-full max-w-md p-8 bg-sci-panel border border-red-500/40 rounded-3xl shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-500/20">
                        <TriangleAlert className="text-red-500 w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Confirmar Exclusão?</h3>
                        <p className="text-slate-400 text-sm font-medium">Esta ação é irreversível e removerá o vínculo do colaborador ID: <span className="text-red-400 font-mono font-black">#{deleteConfirmId}</span> do sistema.</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-black text-sm uppercase border border-white/10">Cancelar</button>
                        <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-sm uppercase shadow-[0_0_15px_rgba(239,68,68,0.4)]">Excluir</button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-sci-panel/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="flex gap-2 w-full lg:w-auto">
                {permission.add && (
                    <button onClick={() => { setEditingId(null); setView('form'); }} className="flex-1 lg:flex-none px-6 py-3 bg-cyan-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-neon-cyan flex items-center justify-center gap-2">
                        <Plus size={16}/> Novo
                    </button>
                )}
                <button onClick={() => setShowInactive(!showInactive)} className={`flex-1 lg:flex-none px-6 py-3 rounded-xl text-[10px] font-black uppercase border transition-all ${showInactive ? 'bg-red-500/20 text-red-400 border-red-500/40' : 'bg-slate-900 text-slate-500 border-white/10'}`}>
                    {showInactive ? 'Inativos' : 'Ativos'}
                </button>
            </div>
            <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-2.5 text-slate-500 w-4 h-4" />
                <input type="text" placeholder="Buscar por nome..." className="w-full bg-slate-950 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
            </div>
        </div>

        <NeonCard className="p-0 overflow-hidden" glowColor="none">
            <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                    <thead className="bg-slate-900/50 border-b border-white/10 text-[10px] font-mono text-slate-500 uppercase font-black">
                        <tr>
                            <th className="p-4">Colaborador</th>
                            <th className="p-4">Matrícula</th>
                            <th className="p-4">Grupo</th>
                            <th className="p-4 text-center">Status</th>
                            <th className="p-4 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredEmployees.map(emp => (
                            <tr key={emp.id} className="hover:bg-cyan-500/5 transition-all group">
                                <td className="p-4">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10 shrink-0"><img src={emp.avatarUrl} className="w-full h-full object-cover"/></div>
                                            <div>
                                                <p className="text-sm font-black text-slate-200">{emp.name}</p>
                                                <p className="text-[10px] text-slate-500 font-mono font-bold uppercase">{emp.role}</p>
                                            </div>
                                        </div>
                                        {/* SEÇÃO DE TURMAS ABAIXO DO NOME NO CADASTRO */}
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {emp.skills && emp.skills.length > 0 ? emp.skills.map(skill => (
                                                <span key={skill} className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[8px] font-black rounded-md uppercase flex items-center gap-1">
                                                    <Tag size={8} /> {skill}
                                                </span>
                                            )) : (
                                                <span className="text-[8px] font-bold text-slate-600 uppercase italic">Sem turmas vinculadas</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="p-4 text-xs font-mono text-slate-400">{emp.registration}</td>
                                <td className="p-4"><span className="px-3 py-1 bg-slate-800 rounded-lg text-[10px] font-black text-slate-400 border border-white/5">{emp.userRole}</span></td>
                                <td className="p-4 text-center"><span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${emp.active ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>{emp.active ? 'Ativo' : 'Inativo'}</span></td>
                                <td className="p-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => handleEdit(emp)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 border border-white/5 transition-all" title="Editar"><Edit2 size={16}/></button>
                                        {permission.edit && (
                                          <button onClick={() => setDeleteConfirmId(emp.id)} className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-white/5 transition-all" title="Excluir"><Trash2 size={16}/></button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </NeonCard>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-10 pb-20">
        <div className="flex flex-col gap-2">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-4 uppercase"><Folder className="text-cyan-500 w-8 md:w-10 h-8 md:h-10" /> Cadastros</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
            <aside className="w-full lg:w-44">
                <div className="bg-sci-panel/40 border border-white/10 rounded-2xl p-2 md:p-3 shadow-xl backdrop-blur-md flex flex-row lg:flex-col overflow-x-auto lg:overflow-visible gap-2 scrollbar-hide">
                    {[
                        { id: 'EMPLOYEES', label: 'Colaborador', icon: <UserCircle size={18}/> },
                        { id: 'CLASSES', label: 'Turmas', icon: <LayoutList size={18}/> },
                        { id: 'COURSES', label: 'Cursos', icon: <BookOpen size={18}/> },
                        { id: 'SCHOOLS', label: 'Escolas', icon: <School size={18}/> },
                        { id: 'REPORTS', label: 'Relatório', icon: <FileBarChart size={18}/> }
                    ].map(item => (
                        <button key={item.id} onClick={() => { setActiveSubTab(item.id as any); setView('list'); }} className={`whitespace-nowrap flex-1 lg:w-full flex items-center gap-2 px-3 py-3 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest ${activeSubTab === item.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}>
                            {item.icon} <span className="inline lg:inline">{item.label}</span>
                        </button>
                    ))}
                </div>
            </aside>

            <div className="flex-1">
                {activeSubTab === 'EMPLOYEES' ? (view === 'list' ? renderEmployeeList() : renderFormView()) : 
                 activeSubTab === 'CLASSES' ? renderClassesView() :
                 activeSubTab === 'COURSES' ? renderCoursesView() :
                 activeSubTab === 'SCHOOLS' ? renderSchoolsView() :
                 activeSubTab === 'REPORTS' ? renderReportsView() :
                 <div className="p-10 text-center"><p className="text-slate-500 font-mono text-xs uppercase font-black">Módulo em Desenvolvimento</p></div>}
            </div>
        </div>
    </div>
  );
};

export default RegistrationPanel;
