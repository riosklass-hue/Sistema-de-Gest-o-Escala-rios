import React, { useState, useRef } from 'react';
import { UserPlus, Save, Shield, User, Briefcase, Lock, Key, CheckCircle2, AlertCircle, Loader2, Mail, Phone, Camera, Upload } from 'lucide-react';
import NeonCard from './NeonCard';
import { Employee, UserRole } from '../types';
import { registerUser } from '../services/authService';

interface RegistrationPanelProps {
  onRegisterEmployee: (employee: Employee) => void;
}

const RegistrationPanel: React.FC<RegistrationPanelProps> = ({ onRegisterEmployee }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    username: '',
    password: '',
    role: 'TEACHER' as UserRole,
    jobTitle: 'Técnico',
    avatarPreview: '' as string
  });
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    try {
        // 1. Generate IDs and Data
        const employeeId = Math.random().toString(36).substr(2, 9);
        
        // Use uploaded image or generate default avatar
        const finalAvatarUrl = formData.avatarPreview || `https://ui-avatars.com/api/?name=${formData.name}&background=random&color=fff`;

        // 2. Register in Auth System
        const success = await registerUser({
            username: formData.username,
            name: formData.name,
            role: formData.role,
            employeeId: formData.role === 'TEACHER' ? employeeId : undefined
        }, formData.password);

        if (!success) {
            throw new Error('Nome de usuário já existe no sistema.');
        }

        // 3. If Teacher, add to Employee List with new fields
        if (formData.role === 'TEACHER') {
            const newEmployee: Employee = {
                id: employeeId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                role: formData.jobTitle,
                avatarUrl: finalAvatarUrl
            };
            onRegisterEmployee(newEmployee);
        }

        setStatus('success');
        setMessage(`Usuário ${formData.username} cadastrado com sucesso!`);
        
        // Reset form
        setFormData({
            name: '',
            email: '',
            phone: '',
            username: '',
            password: '',
            role: 'TEACHER',
            jobTitle: 'Técnico',
            avatarPreview: ''
        });

    } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Erro ao processar cadastro.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <UserPlus className="text-cyan-400" />
                Novo Cadastro
            </h2>
            <p className="text-slate-400">Adicione novos administradores ou membros da equipe ao sistema Rios.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="lg:col-span-2">
                <NeonCard glowColor="cyan" className="h-full">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        {/* Photo Upload Section */}
                        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-900/40 rounded-xl border border-white/5">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="relative group cursor-pointer"
                            >
                                <div className={`w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center overflow-hidden transition-all ${formData.avatarPreview ? 'border-cyan-500' : 'border-slate-600 hover:border-cyan-400'}`}>
                                    {formData.avatarPreview ? (
                                        <img src={formData.avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Camera className="text-slate-500 group-hover:text-cyan-400 w-8 h-8" />
                                    )}
                                </div>
                                <div className="absolute bottom-0 right-0 bg-cyan-600 rounded-full p-1.5 border-2 border-slate-900 shadow-lg group-hover:bg-cyan-500 transition-colors">
                                    <Upload size={12} className="text-white" />
                                </div>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleImageChange}
                                    accept="image/*"
                                    className="hidden" 
                                />
                            </div>
                            <div className="flex-1 text-center sm:text-left">
                                <h3 className="text-sm font-bold text-white mb-1">Foto do Perfil</h3>
                                <p className="text-xs text-slate-400 mb-2">Recomendado: .jpg ou .png, min 200x200px.</p>
                                <button 
                                    type="button" 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 px-3 py-1.5 rounded border border-white/10 transition-colors"
                                >
                                    Selecionar Arquivo
                                </button>
                            </div>
                        </div>

                        {/* Personal Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-xs font-mono uppercase text-slate-500">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-slate-600 w-4 h-4" />
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-cyan-500/50 focus:outline-none transition-colors placeholder:text-slate-600"
                                        placeholder="Ex: João da Silva"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-mono uppercase text-slate-500">E-mail Corporativo</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 text-slate-600 w-4 h-4" />
                                    <input 
                                        type="email" 
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-cyan-500/50 focus:outline-none transition-colors placeholder:text-slate-600"
                                        placeholder="nome@empresa.com"
                                        value={formData.email}
                                        onChange={e => setFormData({...formData, email: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-mono uppercase text-slate-500">Telefone / WhatsApp</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 text-slate-600 w-4 h-4" />
                                    <input 
                                        type="tel" 
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-cyan-500/50 focus:outline-none transition-colors placeholder:text-slate-600"
                                        placeholder="(XX) 99999-9999"
                                        value={formData.phone}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Professional Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                <label className="text-xs font-mono uppercase text-slate-500">Tipo de Colaborador</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-3 text-slate-600 w-4 h-4" />
                                    <select 
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-cyan-500/50 focus:outline-none transition-colors appearance-none cursor-pointer"
                                        value={formData.role}
                                        onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                                    >
                                        <option value="TEACHER">Professor / Colaborador</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>
                                    {/* Arrow */}
                                    <div className="absolute right-4 top-4 pointer-events-none border-t-4 border-t-slate-500 border-x-4 border-x-transparent w-0 h-0"></div>
                                </div>
                            </div>

                            {formData.role === 'TEACHER' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-xs font-mono uppercase text-slate-500">Cargo / Título</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-3 text-slate-600 w-4 h-4" />
                                        <input 
                                            required
                                            type="text" 
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-cyan-500/50 focus:outline-none transition-colors placeholder:text-slate-600"
                                            placeholder="Ex: Engenheiro Pleno"
                                            value={formData.jobTitle}
                                            onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4"></div>

                        {/* Access Credentials */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-mono uppercase text-slate-500">Usuário de Login</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-3 text-slate-600 w-4 h-4" />
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-purple-500/50 focus:outline-none transition-colors placeholder:text-slate-600"
                                        placeholder="usuario.sistema"
                                        value={formData.username}
                                        onChange={e => setFormData({...formData, username: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-mono uppercase text-slate-500">Senha Provisória</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3 text-slate-600 w-4 h-4" />
                                    <input 
                                        required
                                        type="password" 
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-purple-500/50 focus:outline-none transition-colors placeholder:text-slate-600"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {status !== 'idle' && (
                            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border animate-in zoom-in-95 ${
                                status === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                            }`}>
                                {status === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                {message}
                            </div>
                        )}

                        <div className="pt-2">
                            <button 
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5 group-hover:scale-110 transition-transform" />}
                                {loading ? 'Processando...' : 'Confirmar Cadastro'}
                            </button>
                        </div>

                    </form>
                </NeonCard>
            </div>

            {/* Info Column */}
            <div className="space-y-6">
                <NeonCard glowColor="purple" title="Diretrizes" icon={<Shield size={16}/>}>
                    <ul className="space-y-3 text-sm text-slate-400">
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 shrink-0"></span>
                            Administradores possuem acesso total ao sistema, incluindo configurações e segurança.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5 shrink-0"></span>
                            Professores/Colaboradores visualizam apenas suas próprias escalas e relatórios.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5 shrink-0"></span>
                            O campo e-mail será utilizado para recuperação de senha e notificações de escala.
                        </li>
                    </ul>
                </NeonCard>

                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center opacity-70">
                     <div className="w-16 h-16 rounded-full bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center mb-3">
                        <UserPlus className="text-slate-600" />
                     </div>
                     <p className="text-xs text-slate-500">
                         Novos colaboradores serão sincronizados automaticamente com o módulo de gestão de escalas.
                     </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default RegistrationPanel;