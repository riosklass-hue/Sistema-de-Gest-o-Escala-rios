import React, { useState } from 'react';
import NeonCard from './NeonCard';
import { Shield, Search, Calendar, History, Globe, User as UserIcon, Filter, ExternalLink, Terminal, ArrowUpRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface UserLog {
  id: string;
  user: string;
  description: string;
  module: string;
  action: string;
  ip: string;
  timestamp: string;
}

const MOCK_LOGS: UserLog[] = [
  { id: '1', user: 'doctor lab', description: 'Logou no sistema', module: 'Usuários', action: 'Logar', ip: '45.190.142.239', timestamp: '19/12/2025 15:49:26' },
  { id: '2', user: 'doctor lab', description: 'Logou no sistema', module: 'Usuários', action: 'Logar', ip: '177.0.53.183', timestamp: '14/12/2025 15:04:11' },
  { id: '3', user: 'admin', description: 'Alterou escala mensal', module: 'Escalas', action: 'Editar', ip: '192.168.1.45', timestamp: '20/12/2025 10:22:15' },
  { id: '4', user: 'professor', description: 'Visualizou relatório financeiro', module: 'Relatórios', action: 'Visualizar', ip: '187.12.33.101', timestamp: '20/12/2025 09:15:00' },
  { id: '5', user: 'admin', description: 'Novo colaborador cadastrado', module: 'Cadastro', action: 'Criar', ip: '192.168.1.45', timestamp: '18/12/2025 14:30:44' },
];

const SecurityPanel: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header e Filtros */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase text-slate-500 tracking-wider mb-2">
                <Shield size={12} className="text-cyan-500" />
                <span>Segurança de Dados</span>
            </div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
               Logs de Usuários
            </h1>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex items-center bg-slate-900 border border-white/10 rounded-lg p-1">
                <button 
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                
                <div className="px-4 py-1.5 text-xs text-white font-medium flex items-center gap-2 min-w-[140px] justify-center capitalize">
                    <Calendar size={14} className="text-purple-400" />
                    {monthName}
                </div>

                <button 
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-white/5 text-slate-400 hover:text-white rounded transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
            
            <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold shadow-lg shadow-cyan-500/20 transition-all">
                <Search size={14} />
                Busca avançada
            </button>
        </div>
      </div>

      <NeonCard glowColor="blue" className="p-0 overflow-hidden border-white/5 bg-sci-panel/40">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/10 text-[10px] text-slate-500 font-mono uppercase tracking-widest bg-slate-900/50">
                        <th className="p-5 font-bold">Usuário</th>
                        <th className="p-5 font-bold">Descrição</th>
                        <th className="p-5 font-bold">Módulo</th>
                        <th className="p-5 font-bold">Ação</th>
                        <th className="p-5 font-bold">IP de Origem</th>
                        <th className="p-5 font-bold text-right">Data/Hora</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {MOCK_LOGS.map((log) => (
                        <tr key={log.id} className="hover:bg-cyan-500/5 transition-all group border-l-2 border-transparent hover:border-cyan-500">
                            <td className="p-5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center text-cyan-400 group-hover:shadow-neon-cyan transition-all">
                                        <UserIcon size={14} />
                                    </div>
                                    <span className="text-sm font-bold text-slate-200 group-hover:text-white">{log.user}</span>
                                </div>
                            </td>
                            <td className="p-5">
                                <span className="text-xs text-slate-400 group-hover:text-slate-300 transition-colors">{log.description}</span>
                            </td>
                            <td className="p-5">
                                <span className="text-[10px] font-mono text-purple-400 bg-purple-500/5 px-2 py-1 rounded border border-purple-500/20 uppercase">
                                    {log.module}
                                </span>
                            </td>
                            <td className="p-5">
                                <span className={`text-[10px] font-bold uppercase ${
                                    log.action === 'Logar' ? 'text-emerald-400' : 
                                    log.action === 'Editar' ? 'text-cyan-400' : 'text-orange-400'
                                }`}>
                                    {log.action}
                                </span>
                            </td>
                            <td className="p-5">
                                <div className="flex items-center gap-2 font-mono text-xs text-slate-500 group-hover:text-cyan-500/80">
                                    <Globe size={12} className="opacity-50" />
                                    {log.ip}
                                </div>
                            </td>
                            <td className="p-5 text-right font-mono text-xs text-slate-500 group-hover:text-white">
                                {log.timestamp}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </NeonCard>

      {/* Ticker de Integridade */}
      <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-xl border border-white/5">
          <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Status da Auditoria: <span className="text-emerald-400 font-bold">Integridade Verificada</span></p>
          </div>
          <p className="text-[10px] font-mono text-slate-600 italic">ID de Sessão: RIOS-SEC-{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
      </div>
    </div>
  );
};

export default SecurityPanel;