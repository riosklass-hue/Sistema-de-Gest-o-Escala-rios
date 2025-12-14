import React, { useState } from 'react';
import { Hexagon, Lock, User, ArrowRight, Loader2, AlertCircle, Terminal } from 'lucide-react';
import { login } from '../services/authService';
import { User as UserType } from '../types';

interface LoginScreenProps {
  onLogin: (user: UserType) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

                <div className="flex flex-col items-center mb-8">
                    <div className="relative mb-4">
                        <div className="absolute inset-0 bg-cyan-500/30 blur-xl rounded-full"></div>
                        <Hexagon className="text-cyan-400 w-12 h-12 relative z-10 animate-spin-slow" />
                    </div>
                    <h1 className="text-3xl font-bold text-white font-mono tracking-wider">S.G.E. NEXUS</h1>
                    <p className="text-slate-400 text-sm mt-2">Identifique-se para prosseguir</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-mono uppercase text-cyan-500/80 ml-1">Usuário / ID</label>
                        <div className="relative group">
                            <User className="absolute left-3 top-3 text-slate-500 w-5 h-5 group-focus-within:text-cyan-400 transition-colors" />
                            <input 
                                type="text" 
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(6,182,212,0.1)] transition-all"
                                placeholder="Digite seu usuário..."
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-mono uppercase text-purple-500/80 ml-1">Senha de Acesso</label>
                        <div className="relative group">
                            <Lock className="absolute left-3 top-3 text-slate-500 w-5 h-5 group-focus-within:text-purple-400 transition-colors" />
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-slate-900/50 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 focus:shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 bg-red-900/20 p-3 rounded-lg border border-red-500/20 text-sm animate-in fade-in slide-in-from-top-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-neon-cyan transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
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

                <div className="mt-8 pt-4 border-t border-white/5">
                    <div className="bg-slate-900/80 p-3 rounded border border-white/5 text-[10px] font-mono text-slate-500 flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-cyan-500/70 mb-1">
                            <Terminal size={12} />
                            <span>CREDENCIAIS DE TESTE</span>
                        </div>
                        <div className="flex justify-between">
                             <span>Admin:</span>
                             <span className="text-white">admin / 123</span>
                        </div>
                        <div className="flex justify-between">
                             <span>Professor:</span>
                             <span className="text-white">professor / 123</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default LoginScreen;