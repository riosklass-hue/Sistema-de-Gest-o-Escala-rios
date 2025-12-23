
import React, { useState } from 'react';
import { Hexagon, Lock, User, ArrowRight, Loader2, AlertCircle, Terminal, Mail, ChevronLeft, CheckCircle } from 'lucide-react';
import { login, recoverPassword } from '../services/authService';
import { User as UserType } from '../types';

interface LoginScreenProps {
  onLogin: (user: UserType) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [view, setView] = useState<'LOGIN' | 'RECOVER'>('LOGIN');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login(username, password);
      if (user) {
        onLogin(user);
      } else {
        setError('Credenciais inválidas. Tente novamente.');
      }
    } catch (err) {
      setError('Erro de conexão com o servidor central.');
    } finally {
      setLoading(false);
    }
  };

  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const ok = await recoverPassword(recoveryEmail);
      if (ok) {
        setSuccess('Instruções de recuperação enviadas para o seu e-mail cadastrado.');
        setTimeout(() => setView('LOGIN'), 5000);
      } else {
        setError('E-mail não localizado em nossa base de dados.');
      }
    } catch (err) {
      setError('Falha na comunicação com o servidor de e-mail.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sci-bg flex items-center justify-center relative overflow-hidden font-sans">
        {/* Background Effects */}
        <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-900/20 rounded-full blur-[120px] animate-pulse"></div>
             <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-cyan-900/20 rounded-full blur-[120px] animate-pulse" style={{animationDelay: '1s'}}></div>
             <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
        </div>

        <div className="w-full max-w-md z-10 p-6">
            <div className="bg-sci-panel/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                {/* Decorator Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-cyan-500"></div>

                {view === 'LOGIN' ? (
                  <>
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative mb-4">
                            <div className="absolute inset-0 bg-cyan-500/30 blur-xl rounded-full"></div>
                            <Hexagon className="text-cyan-400 w-12 h-12 relative z-10 animate-spin-slow" />
                        </div>
                        <h1 className="text-3xl font-bold text-white font-mono tracking-wider">S.G.E. RIOS</h1>
                        <p className="text-slate-400 text-sm mt-2">Identifique-se para prosseguir</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase text-cyan-500/80 ml-1 font-black tracking-widest">Usuário / ID</label>
                            <div className="relative group">
                                <User className="absolute left-3 top-3.5 text-slate-500 w-5 h-5 group-focus-within:text-cyan-400 transition-colors" />
                                <input 
                                    type="text" 
                                    value={username}
                                    autoFocus
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all font-medium"
                                    placeholder="Digite seu usuário..."
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between items-center ml-1">
                              <label className="text-xs font-mono uppercase text-purple-500/80 font-black tracking-widest">Senha de Acesso</label>
                              <button 
                                type="button" 
                                onClick={() => { setView('RECOVER'); setError(''); setSuccess(''); }}
                                className="text-[10px] font-black uppercase text-slate-500 hover:text-cyan-400 transition-colors tracking-tighter"
                              >
                                Esqueceu a senha?
                              </button>
                            </div>
                            <div className="relative group">
                                <Lock className="absolute left-3 top-3.5 text-slate-500 w-5 h-5 group-focus-within:text-purple-400 transition-colors" />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all font-medium"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/20 text-xs font-bold animate-in fade-in slide-in-from-top-2">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin w-5 h-5" /> Autenticando...
                                </>
                            ) : (
                                <>
                                    Acessar Sistema <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => { setView('LOGIN'); setError(''); setSuccess(''); }}
                      className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-6"
                    >
                      <ChevronLeft size={16} /> Voltar ao Login
                    </button>

                    <div className="flex flex-col items-center mb-8">
                        <div className="p-4 bg-purple-500/10 rounded-full border border-purple-500/20 mb-4 shadow-neon-purple/20">
                            <Mail className="text-purple-400 w-8 h-8" />
                        </div>
                        <h2 className="text-2xl font-bold text-white font-mono tracking-tight uppercase">Recuperar Acesso</h2>
                        <p className="text-slate-400 text-sm mt-2 text-center px-4">Informe seu e-mail cadastrado para receber as instruções de reset.</p>
                    </div>

                    <form onSubmit={handleRecover} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase text-purple-500/80 ml-1 font-black tracking-widest">E-mail Corporativo</label>
                            <div className="relative group">
                                <Mail className="absolute left-3 top-3.5 text-slate-500 w-5 h-5 group-focus-within:text-purple-400 transition-colors" />
                                <input 
                                    type="email" 
                                    required
                                    value={recoveryEmail}
                                    onChange={(e) => setRecoveryEmail(e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-xl py-3.5 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all font-medium"
                                    placeholder="exemplo@rios.com.br"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-4 rounded-xl border border-red-500/20 text-xs font-bold">
                                <AlertCircle size={16} />
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-2 text-emerald-400 bg-emerald-900/20 p-4 rounded-xl border border-emerald-500/20 text-xs font-bold">
                                <CheckCircle size={16} />
                                {success}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading || !!success}
                            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest py-4 rounded-xl shadow-lg hover:shadow-neon-purple transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="animate-spin w-5 h-5" /> Processando...
                                </>
                            ) : success ? (
                              'E-mail Enviado'
                            ) : (
                                <>
                                    Enviar Link de Recuperação <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>
                  </>
                )}
            </div>
        </div>
    </div>
  );
};

export default LoginScreen;
