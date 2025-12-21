import React, { useState, useRef, useEffect } from 'react';
import { 
  UserPlus, Save, Shield, User, Briefcase, Lock, Key, 
  CheckCircle2, AlertCircle, Loader2, Mail, Phone, 
  Camera, Upload, ChevronRight, List, Search, Filter, 
  Settings2, Download, CheckCircle, Edit2, Trash2, MoreHorizontal, X, TriangleAlert, EyeOff, Eye, FileSpreadsheet, Users, UserX
} from 'lucide-react';
import NeonCard from './NeonCard';
import { Employee, UserRole } from '../types';
import { registerUser } from '../services/authService';

interface RegistrationPanelProps {
  onRegisterEmployee: (employee: Employee) => void;
  onUpdateEmployee: (employee: Employee) => void;
  onDeleteEmployee: (id: string) => void;
  employees: Employee[];
}

const RegistrationPanel: React.FC<RegistrationPanelProps> = ({ 
  onRegisterEmployee, 
  onUpdateEmployee,
  onDeleteEmployee,
  employees 
}) => {
  const [view, setView] = useState<'list' | 'form'>('list');
  const [showInactive, setShowInactive] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    role: 'TEACHER' as UserRole,
    jobTitle: 'Técnico',
    avatarPreview: '' as string,
    active: true
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatarPreview: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = (emp: Employee) => {
      setEditingId(emp.id);
      setFormData({
          name: emp.name,
          email: emp.email || '',
          phone: emp.phone || '',
          username: emp.name.toLowerCase().replace(/\s/g, '.'),
          password: '', 
          role: 'TEACHER' as UserRole,
          jobTitle: emp.role,
          avatarPreview: emp.avatarUrl,
          active: emp.active
      });
      setView('form');
  };

  const confirmDelete = () => {
    if (deleteConfirmId) {
      onDeleteEmployee(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const exportToExcel = () => {
    const headers = ["ID", "Nome", "Cargo", "Email", "Telefone", "Status"];
    const rows = employees.map(emp => [
      emp.id,
      emp.name,
      emp.role,
      emp.email || 'N/A',
      emp.phone || 'N/A',
      emp.active ? "Ativo" : "Inativo"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `colaboradores_rios_${new Date().toLocaleDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsActionsOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    try {
        if (editingId) {
            const updatedEmployee: Employee = {
                id: editingId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: formData.jobTitle,
                avatarUrl: formData.avatarPreview || `https://ui-avatars.com/api/?name=${formData.name}&background=random&color=fff`,
                active: formData.active
            };
            onUpdateEmployee(updatedEmployee);
            setStatus('success');
            setMessage(`Colaborador atualizado com sucesso!`);
        } else {
            const maxId = employees.length > 0 ? Math.max(...employees.map(e => parseInt(e.id) || 0)) : 0;
            const newId = (maxId + 1).toString();
            
            const finalAvatarUrl = formData.avatarPreview || `https://ui-avatars.com/api/?name=${formData.name}&background=random&color=fff`;

            const success = await registerUser({
                username: formData.username,
                name: formData.name,
                role: formData.role,
                employeeId: formData.role === 'TEACHER' ? newId : undefined
            }, formData.password);

            if (!success) {
                throw new Error('Nome de usuário já existe no sistema.');
            }

            if (formData.role === 'TEACHER') {
                const newEmployee: Employee = {
                    id: newId,
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    role: formData.jobTitle,
                    avatarUrl: finalAvatarUrl,
                    active: formData.active
                };
                onRegisterEmployee(newEmployee);
            }
            setStatus('success');
            setMessage(`Usuário ${formData.username} cadastrado com sucesso!`);
        }

        setTimeout(() => {
            setView('list');
            setStatus('idle');
            setEditingId(null);
            setFormData({
              name: '', email: '', phone: '', username: '', password: '', 
              role: 'TEACHER' as UserRole, jobTitle: 'Técnico', avatarPreview: '', active: true
            });
        }, 1500);

    } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Erro ao processar cadastro.');
    } finally {
        setLoading(false);
    }
  };

  const renderEmptyState = () => (
    <NeonCard glowColor="none" className="min-h-[400px] flex flex-col items-center justify-center py-16 px-8">
        <div className="flex flex-col items-center text-center max-w-lg space-y-6">
            <div className="w-24 h-24 rounded-full bg-slate-900 border-2 border-white/5 flex items-center justify-center">
                <Users size={32} className="text-slate-700" />
            </div>
            <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Nenhum colaborador {showInactive ? 'inativo' : ''}</h2>
                <p className="text-slate-500 text-sm">
                    {showInactive 
                      ? 'Não há registros de colaboradores desativados no momento.' 
                      : 'Comece adicionando novos membros à sua equipe técnica.'}
                </p>
            </div>
            {!showInactive && (
                <button 
                    onClick={() => setView('form')}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg"
                >
                    Cadastrar Agora
                </button>
            )}
        </div>
    </NeonCard>
  );

  const renderTableView = () => (
    <NeonCard glowColor="none" className="overflow-hidden border-white/5 bg-sci-panel/40 p-0">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/10 text-[10px] text-slate-500 font-mono uppercase tracking-widest bg-slate-900/50">
                        <th className="p-4">Colaborador</th>
                        <th className="p-4">E-mail / Contato</th>
                        <th className="p-4 text-center">ID</th>
                        <th className="p-4 text-center">Status</th>
                        <th className="p-4 text-center">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredEmployees.map((emp) => (
                        <tr key={emp.id} className={`hover:bg-white/5 transition-colors group ${!emp.active ? 'opacity-60 bg-red-500/5' : ''}`}>
                            <td className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-slate-800 ${!emp.active ? 'grayscale' : ''}`}>
                                        <img src={emp.avatarUrl} alt="" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{emp.name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-mono">{emp.role}</p>
                                    </div>
                                </div>
                            </td>
                            <td className="p-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                                        <Mail size={12} className="text-slate-600" />
                                        {emp.email || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                                        <Phone size={12} className="text-slate-600" />
                                        {emp.phone || 'N/A'}
                                    </div>
                                </div>
                            </td>
                            <td className="p-4 text-center">
                                <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/20">
                                    #{emp.id}
                                </span>
                            </td>
                            <td className="p-4 text-center">
                                {emp.active ? (
                                    <span className="text-[9px] font-bold uppercase text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Ativo</span>
                                ) : (
                                    <span className="text-[9px] font-bold uppercase text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">Inativo</span>
                                )}
                            </td>
                            <td className="p-4">
                                <div className="flex items-center justify-center gap-2">
                                    <button 
                                        onClick={() => handleEdit(emp)}
                                        className="p-2 bg-slate-800 hover:bg-cyan-600/20 text-slate-400 hover:text-cyan-400 rounded-lg transition-all border border-white/5" 
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button 
                                        onClick={() => setDeleteConfirmId(emp.id)}
                                        className="p-2 bg-slate-800 hover:bg-red-600/20 text-slate-400 hover:text-red-400 rounded-lg transition-all border border-white/5" 
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </NeonCard>
  );

  const renderListView = () => {
    return (
      <div className="space-y-6">
        {/* Modal de confirmação de exclusão */}
        {deleteConfirmId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-sci-bg/80 backdrop-blur-sm p-4">
                <div className="w-full max-w-sm p-6 bg-sci-panel border border-red-500/30 rounded-2xl shadow-2xl text-center space-y-4">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
                        <TriangleAlert className="text-red-500 w-8 h-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Confirmar Exclusão?</h3>
                        <p className="text-slate-400 text-xs">Esta ação é irreversível.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setDeleteConfirmId(null)} className="flex-1 py-2 bg-slate-800 text-white rounded-lg font-bold">Cancelar</button>
                        <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold">Excluir</button>
                    </div>
                </div>
            </div>
        )}

        {/* Toolbar Superior */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-sci-panel/40 p-3 rounded-xl border border-white/5">
           <div className="flex items-center gap-2 w-full md:w-auto">
              <button 
                onClick={() => { setEditingId(null); setView('form'); }}
                className="flex-1 md:flex-none bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all"
              >
                <UserPlus size={16} /> Novo
              </button>
              
              <div className="relative" ref={actionsRef}>
                <button 
                  onClick={() => setIsActionsOpen(!isActionsOpen)}
                  className={`bg-slate-800 text-slate-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold border border-white/10 hover:bg-slate-700 transition-all`}
                >
                  Mais ações <ChevronRight size={14} className={isActionsOpen ? '-rotate-90' : 'rotate-90'} />
                </button>
                
                {isActionsOpen && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-sci-panel border border-white/10 rounded-xl shadow-2xl z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-2 space-y-1">
                      <div className="px-3 py-1 text-[10px] font-mono text-slate-500 uppercase">Ações de Lista</div>
                      <button 
                        onClick={() => { setShowInactive(!showInactive); setIsActionsOpen(false); }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                            {showInactive ? <CheckCircle size={14} className="text-emerald-400"/> : <EyeOff size={14} className="text-red-400"/>}
                            {showInactive ? 'Ver Colaboradores Ativos' : 'Listar Colaboradores Inativos'}
                        </div>
                        <span className="text-[10px] bg-slate-800 px-1.5 rounded">{showInactive ? activeCount : inactiveCount}</span>
                      </button>
                      <button 
                        onClick={exportToExcel}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 rounded-lg"
                      >
                        <FileSpreadsheet size={14} className="text-emerald-400" /> Exportar Planilha
                      </button>
                    </div>
                  </div>
                )}
              </div>
           </div>

           {/* Tab Switcher de Status (Mais visível) */}
           <div className="flex p-1 bg-slate-950 rounded-lg border border-white/5">
                <button 
                    onClick={() => setShowInactive(false)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${!showInactive ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <Users size={14} /> Ativos ({activeCount})
                </button>
                <button 
                    onClick={() => setShowInactive(true)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${showInactive ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'text-slate-500 hover:text-slate-400'}`}
                >
                    <UserX size={14} /> Inativos ({inactiveCount})
                </button>
           </div>

           <div className="relative w-full md:w-64">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="Filtrar por nome..."
                    className="w-full bg-slate-900 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
           </div>
        </div>

        {filteredEmployees.length === 0 ? renderEmptyState() : renderTableView()}
      </div>
    );
  };

  const renderFormView = () => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
                <NeonCard glowColor="cyan" title={editingId ? "Editar Colaborador" : "Novo Cadastro"} icon={<UserPlus size={16}/>}>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="flex justify-between items-center border-b border-white/5 pb-4">
                            <button 
                                type="button"
                                onClick={() => { setEditingId(null); setView('list'); }}
                                className="text-cyan-400 text-xs font-mono uppercase hover:underline"
                            >
                                &lt; Voltar para a lista
                            </button>

                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-mono text-slate-500 mr-2">Status:</span>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, active: true})}
                                    className={`px-3 py-1 rounded text-[10px] font-bold ${formData.active ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-slate-600'}`}
                                >
                                    ATIVO
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setFormData({...formData, active: false})}
                                    className={`px-3 py-1 rounded text-[10px] font-bold ${!formData.active ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-900 text-slate-600'}`}
                                >
                                    INATIVO
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-20 h-20 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center cursor-pointer hover:border-cyan-500 transition-colors overflow-hidden"
                            >
                                {formData.avatarPreview ? (
                                    <img src={formData.avatarPreview} className="w-full h-full object-cover" alt="" />
                                ) : (
                                    <Camera className="text-slate-600" />
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-bold text-white">Avatar do Colaborador</h4>
                                <p className="text-xs text-slate-500">Formato recomendado: Quadrado (PNG/JPG)</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-mono uppercase text-slate-500">Nome Completo</label>
                                <input required type="text" className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-cyan-500/50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-mono uppercase text-slate-500">E-mail Corporativo</label>
                                <input type="email" className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-mono uppercase text-slate-500">Telefone / WhatsApp</label>
                                <input type="tel" className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-mono uppercase text-slate-500">Cargo Operacional</label>
                                <input required type="text" className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none" value={formData.jobTitle} onChange={e => setFormData({...formData, jobTitle: e.target.value})} />
                            </div>
                            {!editingId && (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-mono uppercase text-slate-500">Nível de Acesso</label>
                                    <select className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                                        <option value="TEACHER">Técnico / Docente</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {!editingId && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/5">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-mono uppercase text-slate-500">Usuário de Login</label>
                                    <input required type="text" className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-mono uppercase text-slate-500">Senha Padrão</label>
                                    <input required type="password" className="w-full bg-slate-950 border border-white/10 rounded-lg py-2 px-4 text-white focus:outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                </div>
                            </div>
                        )}

                        {status !== 'idle' && (
                            <div className={`p-3 rounded-lg text-xs font-bold border ${status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {message}
                            </div>
                        )}

                        <div className="flex gap-2">
                             <button type="button" onClick={() => { setEditingId(null); setView('list'); }} className="flex-1 bg-slate-800 text-white font-bold py-3 rounded-lg">Cancelar</button>
                            <button type="submit" disabled={loading} className="flex-[2] bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
                                {loading && <Loader2 className="animate-spin w-4 h-4" />}
                                {editingId ? 'Salvar Alterações' : 'Concluir Cadastro'}
                            </button>
                        </div>
                    </form>
                </NeonCard>
            </div>

            <div className="space-y-6">
                <NeonCard glowColor="purple" title="Instruções" icon={<Shield size={16}/>}>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Colaboradores marcados como <strong className="text-red-400">Inativos</strong> não aparecem na grade de escalas nem nos relatórios financeiros mensais, mas seus dados históricos permanecem no banco de dados para auditoria.
                    </p>
                </NeonCard>
            </div>
        </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in duration-500 pb-12">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-2">
                    <span>Admin</span>
                    <ChevronRight size={10} />
                    <span className="text-cyan-400">Gestão de Equipe</span>
                </div>
                <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                   <Users className="text-cyan-500" size={32} /> Colaboradores
                </h1>
            </div>
            
            <div className="text-right">
                <p className="text-[10px] font-mono text-slate-500 uppercase">Capacidade Atual</p>
                <p className="text-xl font-bold text-white">{activeCount} / {employees.length}</p>
            </div>
        </div>

        {view === 'list' ? renderListView() : renderFormView()}
    </div>
  );
};

export default RegistrationPanel;