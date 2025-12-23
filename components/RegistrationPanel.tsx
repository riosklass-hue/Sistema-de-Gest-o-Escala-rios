
import React, { useState, useRef, useEffect } from 'react';
import { 
  UserPlus, Shield, Camera, Upload, ChevronRight, Search, 
  CheckCircle, Edit2, Trash2, X, TriangleAlert, EyeOff, 
  FileSpreadsheet, Users, UserX, MessageCircle, BookOpen, 
  GraduationCap, CheckSquare, Square, Folder, UserCircle, Plus, 
  BookCheck, School, Building, Loader2, Mail, Phone, Lock, Eye
} from 'lucide-react';
import NeonCard from './NeonCard';
import { Employee, UserRole, ModulePermission } from '../types';
import { registerUser } from '../services/authService';

interface RegistrationPanelProps {
  onRegisterEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee, newPassword?: string) => void;
  onDeleteEmployee: (id: string) => void;
  employees: Employee[];
  availableCourses: string[];
  onUpdateCourses: (courses: string[]) => void;
  schools: string[];
  onUpdateSchools: (schools: string[]) => void;
  permission: ModulePermission; // Nova prop para controle de acesso
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
  permission
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'EMPLOYEES' | 'COURSES' | 'SCHOOLS'>('EMPLOYEES');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [newSchoolName, setNewSchoolName] = useState('');
  
  const [editingSchoolIndex, setEditingSchoolIndex] = useState<number | null>(null);
  const [editedSchoolValue, setEditedSchoolValue] = useState('');
  
  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', username: '', password: '',
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

  const handleEdit = (emp: Employee) => {
      setEditingId(emp.id);
      setFormData({
          name: emp.name,
          email: emp.email || '',
          phone: emp.phone || '',
          username: emp.username || emp.name.toLowerCase().replace(/\s/g, '.'),
          password: '', 
          role: emp.userRole || 'TEACHER',
          jobTitle: emp.role,
          avatarPreview: emp.avatarUrl,
          active: emp.active,
          skills: emp.skills || [],
          qualifications: emp.qualifications || ''
      });
      setView('form');
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteEmployee(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const toggleSkill = (skill: string) => {
    if (!permission.edit && editingId) return;
    if (!permission.add && !editingId) return;

    setFormData(prev => {
      const newSkills = prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill];
      return { ...prev, skills: newSkills };
    });
  };

  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permission.add) return;
    if (newCourseName.trim() && !availableCourses.includes(newCourseName.trim())) {
        onUpdateCourses([...availableCourses, newCourseName.trim()]);
        setNewCourseName('');
    }
  };

  const handleAddSchool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!permission.add) return;
    if (newSchoolName.trim() && !schools.includes(newSchoolName.trim())) {
        onUpdateSchools([...schools, newSchoolName.trim()]);
        setNewSchoolName('');
    }
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
                id: editingId,
                name: formData.name,
                username: formData.username,
                email: formData.email,
                phone: formData.phone,
                role: formData.jobTitle,
                userRole: formData.role,
                avatarUrl: formData.avatarPreview || `https://ui-avatars.com/api/?name=${formData.name}&background=random&color=fff`,
                active: formData.active,
                skills: formData.skills,
                qualifications: formData.qualifications
            }, formData.password.trim() || undefined);
            setStatus('success');
            setMessage(`Colaborador atualizado com sucesso!`);
        } else {
            const maxId = employees.length > 0 ? Math.max(...employees.map(e => parseInt(e.id) || 0)) : 0;
            const newId = (maxId + 1).toString();
            // Tenta registrar o usuário no sistema de login
            const registered = await registerUser({ username: formData.username, name: formData.name, role: formData.role, employeeId: newId }, formData.password || '123');
            
            onRegisterEmployee({
                id: newId, name: formData.name, username: formData.username, email: formData.email, phone: formData.phone,
                role: formData.jobTitle, userRole: formData.role, avatarUrl: formData.avatarPreview || `https://ui-avatars.com/api/?name=${formData.name}&background=random&color=fff`,
                active: formData.active, skills: formData.skills, qualifications: formData.qualifications
            });
            setStatus('success');
            setMessage(`Usuário cadastrado com sucesso!`);
        }
        setTimeout(() => { setView('list'); setStatus('idle'); setEditingId(null); }, 1500);
    } catch (err: any) { setStatus('error'); setMessage(err.message || 'Erro no processo.'); } 
    finally { setLoading(false); }
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'COORDINATOR': return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'SUPERVISOR': return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      default: return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
  };

  const renderEmployeeListView = () => (
    <div className="space-y-8">
        {deleteConfirmId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-sci-bg/90 backdrop-blur-md p-6">
                <div className="w-full max-w-md p-8 bg-sci-panel border border-red-500/40 rounded-3xl shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
                    <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto ring-4 ring-red-500/20">
                        <TriangleAlert className="text-red-500 w-10 h-10" />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">Confirmar Exclusão?</h3>
                        <p className="text-slate-400 text-sm font-medium">Esta ação é irreversível.</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-4 bg-slate-800 text-white rounded-xl font-black text-sm uppercase border border-white/10">Cancelar</button>
                        <button onClick={confirmDelete} className="flex-1 py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-sm uppercase">Excluir</button>
                    </div>
                </div>
            </div>
        )}

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-sci-panel/40 p-4 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md">
           <div className="flex items-center gap-4 w-full md:w-auto">
              {permission.add && (
                <button onClick={() => { setEditingId(null); setView('form'); }} className="flex-1 md:flex-none bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3.5 rounded-xl flex items-center justify-center gap-3 text-sm font-black uppercase tracking-widest shadow-neon-cyan transition-all">
                  <UserPlus size={20} /> Novo Cadastro
                </button>
              )}
              
              <div className="relative" ref={actionsRef}>
                <button onClick={() => setIsActionsOpen(!isActionsOpen)} className="bg-slate-900 text-slate-300 px-6 py-3.5 rounded-xl flex items-center gap-3 text-sm font-black uppercase border border-white/10 hover:bg-slate-800 transition-all">
                  Gestão <ChevronRight size={18} className={isActionsOpen ? '-rotate-90' : 'rotate-90'} />
                </button>
                {isActionsOpen && (
                  <div className="absolute top-full left-0 mt-3 w-72 bg-sci-panel border border-white/10 rounded-2xl shadow-2xl z-[110] overflow-hidden">
                    <div className="p-3 space-y-1">
                      <button onClick={() => { setShowInactive(!showInactive); setIsActionsOpen(false); }} className="w-full flex items-center justify-between px-4 py-3 text-sm text-slate-300 hover:bg-cyan-500/10 hover:text-cyan-400 rounded-xl">
                        <div className="flex items-center gap-3 font-bold">{showInactive ? <Eye size={18} className="text-emerald-400"/> : <EyeOff size={18} className="text-red-400"/>} {showInactive ? 'Listar Ativos' : 'Listar Inativos'}</div>
                        <span className="text-xs bg-slate-800 px-2 py-0.5 rounded-lg font-black">{showInactive ? activeCount : inactiveCount}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
           </div>

           <div className="relative w-full md:w-80">
                <Search size={18} className="absolute left-4 top-3.5 text-slate-500" />
                <input type="text" placeholder="Filtrar por nome..." className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-sm text-white focus:outline-none focus:border-cyan-500/50 font-medium shadow-inner" />
           </div>
        </div>

        <NeonCard glowColor="none" className="overflow-hidden border-white/10 bg-sci-panel/40 p-0 shadow-2xl">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-white/10 text-xs text-slate-500 font-mono uppercase tracking-widest bg-slate-900/70 font-black">
                            <th className="p-6">Colaborador</th>
                            <th className="p-6">Login</th>
                            <th className="p-6">Grupo</th>
                            <th className="p-6 text-center">ID</th>
                            <th className="p-6 text-center">Status</th>
                            <th className="p-6 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {filteredEmployees.map((emp) => (
                            <tr key={emp.id} className={`hover:bg-cyan-500/5 transition-all group ${!emp.active ? 'opacity-50' : ''}`}>
                                <td className="p-6">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-full border-2 border-white/10 overflow-hidden bg-slate-800"><img src={emp.avatarUrl} alt="" className="w-full h-full object-cover" /></div>
                                        <div>
                                            <p className="text-base font-black text-slate-200 group-hover:text-cyan-400 transition-colors tracking-tight">{emp.name}</p>
                                            <p className="text-xs text-slate-500 uppercase font-mono font-bold">{emp.role}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-6 text-xs font-mono text-slate-400">{emp.username || '-'}</td>
                                <td className="p-6">
                                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-lg border ${getRoleBadgeColor(emp.userRole || 'TEACHER')}`}>
                                      {emp.userRole}
                                    </span>
                                </td>
                                <td className="p-6 text-center text-xs font-mono text-cyan-400">#{emp.id}</td>
                                <td className="p-6 text-center">
                                    <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full border ${emp.active ? 'text-emerald-400 bg-emerald-400/10' : 'text-red-400 bg-red-400/10'}`}>
                                        {emp.active ? 'Ativo' : 'Inativo'}
                                    </span>
                                </td>
                                <td className="p-6">
                                    <div className="flex items-center justify-center gap-3">
                                        {permission.edit ? (
                                            <button onClick={() => handleEdit(emp)} className="p-2.5 bg-slate-800 hover:bg-cyan-600/30 text-slate-300 hover:text-cyan-400 rounded-xl transition-all border border-white/10" title="Editar"><Edit2 size={16}/></button>
                                        ) : (
                                            <button onClick={() => handleEdit(emp)} className="p-2.5 bg-slate-800/40 text-slate-600 rounded-xl border border-white/5" title="Ver Detalhes"><Eye size={16}/></button>
                                        )}
                                        {permission.edit && emp.phone && <a href={`https://wa.me/${emp.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-slate-800 hover:bg-emerald-600/30 text-slate-300 hover:text-emerald-400 rounded-xl transition-all border border-white/10" title="WhatsApp"><MessageCircle size={16}/></a>}
                                        {permission.edit && (
                                            <button onClick={() => setDeleteConfirmId(emp.id)} className="p-2.5 bg-slate-800 hover:bg-red-600/30 text-slate-300 hover:text-red-400 rounded-xl transition-all border border-white/10" title="Excluir"><Trash2 size={16}/></button>
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

  const renderFormView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
            <NeonCard glowColor="cyan" title={editingId ? (permission.edit ? "Editar Colaborador" : "Detalhes do Colaborador") : "Novo Ingresso"}>
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="flex justify-between items-center border-b border-white/10 pb-6">
                        <button type="button" onClick={() => { setEditingId(null); setView('list'); }} className="text-cyan-400 text-sm font-black uppercase tracking-widest hover:text-cyan-300 flex items-center gap-2">
                            <ChevronRight className="rotate-180 w-4 h-4" /> Voltar
                        </button>
                        <div className="flex items-center gap-3">
                            <button type="button" disabled={editingId ? !permission.edit : !permission.add} onClick={() => setFormData({...formData, active: true})} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${formData.active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-900 text-slate-600'}`}>ATIVO</button>
                            <button type="button" disabled={editingId ? !permission.edit : !permission.add} onClick={() => setFormData({...formData, active: false})} className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${!formData.active ? 'bg-red-500/20 text-red-400 border border-red-500/40' : 'bg-slate-900 text-slate-600'}`}>INATIVO</button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-xs font-mono uppercase text-slate-500 font-black">Nome Completo</label>
                            <input readOnly={editingId ? !permission.edit : !permission.add} required type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 px-6 text-white focus:outline-none focus:border-cyan-500/50 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase text-slate-500 font-black">Cargo Operacional</label>
                            <input readOnly={editingId ? !permission.edit : !permission.add} required type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 px-6 text-white focus:outline-none focus:border-cyan-500/50 font-bold" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase text-slate-500 font-black">Grupo de Acesso (SGE)</label>
                            <select disabled={editingId ? !permission.edit : !permission.add} className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 px-6 text-white focus:outline-none font-bold" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                                <option value="ADMIN">Administrador</option>
                                <option value="COORDINATOR">Coordenador</option>
                                <option value="SUPERVISOR">Supervisor</option>
                                <option value="TEACHER">Professor / Técnico</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/10">
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase text-cyan-500 font-black">Usuário / ID (Login)</label>
                            <div className="relative">
                                <UserCircle size={18} className="absolute left-4 top-4 text-slate-500" />
                                <input readOnly={editingId ? !permission.edit : !permission.add} required type="text" placeholder="ex: jose.silva" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-white focus:outline-none focus:border-cyan-500/50 font-mono" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase text-purple-500 font-black">Senha de Acesso</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-4 top-4 text-slate-500" />
                                <input readOnly={editingId ? !permission.edit : !permission.add} type="password" placeholder={editingId ? "Deixe em branco para manter" : "Senha inicial"} className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 pl-12 pr-6 text-white focus:outline-none focus:border-purple-500/50 font-mono" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 pt-8 border-t border-white/10">
                        <h3 className="text-sm font-black text-white uppercase flex items-center gap-3"><BookCheck className="text-cyan-400" /> Habilidades & Disciplinas</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {availableCourses.map(course => (
                                <button key={course} type="button" onClick={() => toggleSkill(course)} className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${formData.skills.includes(course) ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-slate-950 border-white/5 text-slate-500'}`}>
                                    {formData.skills.includes(course) ? <CheckSquare size={16} /> : <Square size={16} />}<span className="text-[10px] font-bold uppercase">{course}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {status !== 'idle' && (
                        <div className={`p-5 rounded-2xl text-sm font-black uppercase border ${status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>{message}</div>
                    )}

                    <div className="flex gap-4">
                        <button type="button" onClick={() => { setEditingId(null); setView('list'); }} className="flex-1 bg-slate-800 text-white font-black py-4 rounded-xl text-sm uppercase border border-white/10">Cancelar</button>
                        {(editingId ? permission.edit : permission.add) && (
                            <button type="submit" disabled={loading} className="flex-[2] bg-cyan-600 hover:bg-cyan-500 text-white font-black py-4 rounded-xl text-sm uppercase shadow-neon-cyan transition-all flex items-center justify-center gap-3">{loading && <Loader2 className="animate-spin w-5 h-5" />}{editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}</button>
                        )}
                    </div>
                </form>
            </NeonCard>
        </div>
        <div className="space-y-8">
          <NeonCard glowColor="purple" title="Diretrizes de Acesso" icon={<Shield size={20}/>}>
            <div className="space-y-4">
                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                  As credenciais de login são vinculadas ao **SGE Rios**. O campo de usuário deve ser único.
                </p>
                <div className="p-4 bg-slate-950/50 rounded-xl border border-white/5 space-y-2">
                    <p className="text-[10px] font-mono text-slate-500 uppercase font-black">Nota do Kernel:</p>
                    <p className="text-[11px] text-slate-400">Em modo de edição, a senha só será alterada se o campo for preenchido.</p>
                </div>
            </div>
          </NeonCard>
        </div>
    </div>
  );

  const renderCoursesView = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-sci-panel/40 p-6 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                  <BookOpen size={24} />
              </div>
              <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Matriz Curricular</h3>
                  <p className="text-xs text-slate-500 font-mono font-bold uppercase tracking-widest">Gestão de Disciplinas e Cursos</p>
              </div>
           </div>

           {permission.add && (
              <form onSubmit={handleAddCourse} className="flex gap-3 w-full md:w-auto">
                  <input 
                      type="text" 
                      placeholder="Nova disciplina..." 
                      value={newCourseName}
                      onChange={(e) => setNewCourseName(e.target.value)}
                      className="flex-1 md:w-64 bg-slate-950 border border-white/10 rounded-xl px-6 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 font-bold shadow-inner"
                  />
                  <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-xl transition-all shadow-neon-cyan active:scale-95">
                      <Plus size={20} />
                  </button>
              </form>
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableCourses.map((course, idx) => (
                <NeonCard key={idx} glowColor="none" className="bg-slate-900/40 border-white/5 group hover:border-cyan-500/30 transition-all p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-cyan-500 group-hover:shadow-neon-cyan transition-all">
                                <BookCheck size={20} />
                            </div>
                            <span className="text-sm font-black text-slate-300 group-hover:text-white transition-colors uppercase tracking-tight">{course}</span>
                        </div>
                        {permission.edit && (
                            <button 
                                onClick={() => onUpdateCourses(availableCourses.filter((_, i) => i !== idx))}
                                className="p-2 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-400/10"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>
                </NeonCard>
            ))}
        </div>
    </div>
  );

  const renderSchoolsView = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-sci-panel/40 p-6 rounded-2xl border border-white/10 shadow-lg backdrop-blur-md">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 border border-purple-500/20">
                  <School size={24} />
              </div>
              <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tight">Unidades Operacionais</h3>
                  <p className="text-xs text-slate-500 font-mono font-bold uppercase tracking-widest">Escolas, Polos e Campi</p>
              </div>
           </div>

           {permission.add && (
              <form onSubmit={handleAddSchool} className="flex gap-3 w-full md:w-auto">
                  <input 
                      type="text" 
                      placeholder="Nova unidade..." 
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                      className="flex-1 md:w-64 bg-slate-950 border border-white/10 rounded-xl px-6 py-3 text-sm text-white focus:outline-none focus:border-purple-500/50 font-bold shadow-inner"
                  />
                  <button type="submit" className="bg-purple-600 hover:bg-purple-500 text-white p-3 rounded-xl transition-all shadow-neon-purple active:scale-95">
                      <Plus size={20} />
                  </button>
              </form>
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {schools.map((school, idx) => (
                <NeonCard key={idx} glowColor="none" className="bg-slate-900/40 border-white/5 group hover:border-purple-500/30 transition-all p-5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center text-purple-500 group-hover:shadow-neon-purple transition-all">
                                <Building size={24} />
                            </div>
                            <div>
                                <span className="text-sm font-black text-slate-300 group-hover:text-white transition-colors uppercase tracking-tight block">{school}</span>
                                <span className="text-[10px] text-slate-500 font-mono font-bold">UNIDADE ATIVA</span>
                            </div>
                        </div>
                        {permission.edit && (
                            <button 
                                onClick={() => onUpdateSchools(schools.filter((_, i) => i !== idx))}
                                className="p-2.5 text-slate-600 hover:text-red-400 transition-colors rounded-xl hover:bg-red-400/10 border border-transparent hover:border-red-500/20"
                            >
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </NeonCard>
            ))}
        </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-16">
        <div className="mb-10">
            <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-5 uppercase"><Folder className="text-cyan-500 w-10 h-10" /> Cadastros</h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full lg:w-72 space-y-4">
                <div className="bg-sci-panel/40 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md">
                    <nav className="space-y-1">
                        <button onClick={() => { setActiveSubTab('EMPLOYEES'); setView('list'); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all text-sm font-bold uppercase tracking-widest ${activeSubTab === 'EMPLOYEES' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'}`}><UserCircle size={18} /> Colaborador</button>
                        <button onClick={() => { setActiveSubTab('COURSES'); setView('list'); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all text-sm font-bold uppercase tracking-widest ${activeSubTab === 'COURSES' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'}`}><BookOpen size={18} /> Cursos</button>
                        <button onClick={() => { setActiveSubTab('SCHOOLS'); setView('list'); }} className={`w-full flex items-center gap-4 px-6 py-4 rounded-xl transition-all text-sm font-bold uppercase tracking-widest ${activeSubTab === 'SCHOOLS' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400'}`}><School size={18} /> Escolas</button>
                    </nav>
                </div>
            </aside>

            <div className="flex-1">
                {activeSubTab === 'EMPLOYEES' ? (
                    view === 'list' ? renderEmployeeListView() : renderFormView()
                ) : activeSubTab === 'COURSES' ? (
                    renderCoursesView()
                ) : (
                    renderSchoolsView()
                )}
            </div>
        </div>
    </div>
  );
};

export default RegistrationPanel;
