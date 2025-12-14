import React, { useState } from 'react';
import { UserPlus, Save, Shield, User, Briefcase, Lock, Key, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import NeonCard from './NeonCard';
import { Employee, UserRole } from '../types';
import { registerUser } from '../services/authService';

interface RegistrationPanelProps {
  onRegisterEmployee: (employee: Employee) => void;
}

const RegistrationPanel: React.FC<RegistrationPanelProps> = ({ onRegisterEmployee }) => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'TEACHER' as UserRole,
    jobTitle: 'Técnico'
  });
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus('idle');

    try {
        // 1. Generate IDs and Data
        const employeeId = Math.random().toString(36).substr(2, 9);
        const avatarUrl = `https://ui-avatars.com/api/?name=${formData.name}&background=random&color=fff`;

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

        // 3. If Teacher, add to Employee List
        if (formData.role === 'TEACHER') {
            const newEmployee: Employee = {
                id: employeeId,
                name: formData.name,
                role: formData.jobTitle,
                avatarUrl: avatarUrl
            };
            onRegisterEmployee(newEmployee);
        }

        setStatus('success');
        setMessage(`Usuário ${formData.username} cadastrado com sucesso!`);
        
        // Reset form
        setFormData({
            name: '',
            username: '',
            password: '',
            role: 'TEACHER',
            jobTitle: 'Técnico'
        });

    } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'Erro ao processar cadastro.');
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <UserPlus className="text-cyan-400" />
                Novo Cadastro
            </h2>
            <p className="text-slate-400">Adicione novos administradores ou membros da equipe ao sistema Nexus.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Form Column */}
            <div className="md:col-span-2">
                <NeonCard glowColor="cyan" className="h-full">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-mono uppercase text-slate-500">Nome Completo</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 text-slate-600 w-4 h-4" />
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-cyan-500/50 focus:outline-none transition-colors"
                                        placeholder="Ex: João da Silva"
                                        value={formData.name}
                                        onChange={e => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-mono uppercase text-slate-500">Função no Sistema</label>
                                <div className="relative">
                                    <Shield className="absolute left-3 top-3 text-slate-600 w-4 h-4" />
                                    <select 
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-cyan-500/50 focus:outline-none transition-colors appearance-none"
                                        value={formData.role}
                                        onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                                    >
                                        <option value="TEACHER">Professor / Colaborador</option>
                                        <option value="ADMIN">Administrador</option>
                                    </select>
                                </div>
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
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-cyan-500/50 focus:outline-none transition-colors"
                                        placeholder="Ex: Engenheiro Pleno"
                                        value={formData.jobTitle}
                                        onChange={e => setFormData({...formData, jobTitle: e.target.value})}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="h-px bg-white/10 my-4"></div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-mono uppercase text-slate-500">Usuário de Login</label>
                                <div className="relative">
                                    <Key className="absolute left-3 top-3 text-slate-600 w-4 h-4" />
                                    <input 
                                        required
                                        type="text" 
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-purple-500/50 focus:outline-none transition-colors"
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
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-2.5 pl-10 pr-4 text-white focus:border-purple-500/50 focus:outline-none transition-colors"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        {status !== 'idle' && (
                            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm border ${
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
                                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />}
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
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5"></span>
                            Administradores possuem acesso total ao sistema, incluindo configurações e segurança.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full mt-1.5"></span>
                            Professores/Colaboradores visualizam apenas suas próprias escalas e relatórios.
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-1.5"></span>
                            A senha deve ser alterada no primeiro acesso (Feature em desenvolvimento).
                        </li>
                    </ul>
                </NeonCard>

                <div className="bg-slate-900/50 border border-white/5 rounded-xl p-6 flex flex-col items-center justify-center text-center opacity-70">
                     <div className="w-16 h-16 rounded-full bg-gradient-to-b from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center mb-3">
                        <UserPlus className="text-slate-600" />
                     </div>
                     <p className="text-xs text-slate-500">
                         Novos colaboradores serão adicionados automaticamente à grade de escalas.
                     </p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default RegistrationPanel;