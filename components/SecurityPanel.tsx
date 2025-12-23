
import React, { useState } from 'react';
import NeonCard from './NeonCard';
import { 
  Shield, Search, Calendar, Globe, User as UserIcon, 
  ChevronLeft, ChevronRight, LogIn, LogOut, Clock, 
  Terminal, ShieldCheck, Zap, MoreHorizontal, MousePointer2 
} from 'lucide-react';
import { SystemLog } from '../types';

interface SecurityPanelProps {
  logs: SystemLog[];
}

const SecurityPanel: React.FC<SecurityPanelProps> = ({ logs }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState('');

  const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
  };

  const filteredLogs = logs.filter(log => 
    log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.module.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      
      {/* Header e Filtros - Estilo Imagem */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-6">
        <div className="space-y-2">
            <div className="flex items-center gap-3 text-xs font-mono uppercase text-slate-500 tracking-widest font-black">
                <Shield size={16} className="text-cyan-500" />
                <span>Protocolos de Proteção</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-mono">
               Histórico de Auditoria
            </h1>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex items-center bg-slate-950/80 border border-white/10 rounded-2xl p-1 shadow-inner backdrop-blur-md">
                <button 
                  onClick={handlePrevMonth}
                  className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all"
                >
                    <ChevronLeft size={20} />
                </button>
                
                <div className="px-6 py-2 text-sm text-white font-black flex items-center gap-3 min-w-[180px] justify-center capitalize font-mono">
                    <Calendar size={18} className="text-purple-400 opacity-50" />
                    {monthName}
                </div>

                <button 
                  onClick={handleNextMonth}
                  className="p-2 hover:bg-white/5 text-slate-500 hover:text-white rounded-xl transition-all"
                >
                    <ChevronRight size={20} />
                </button>
            </div>

            <button className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest shadow-neon-cyan flex items-center gap-3 transition-all">
                <Search size={18} /> Investigar
            </button>
        </div>
      </div>

      <NeonCard glowColor="none" className="p-0 overflow-hidden border-white/10 bg-sci-panel/40 shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="border-b border-white/10 text-[10px] text-slate-500 font-mono uppercase tracking-widest bg-slate-900/60 font-black">
                        <th className="p-6">Operador</th>
                        <th className="p-6">Descrição do Evento</th>
                        <th className="p-6">Módulo</th>
                        <th className="p-6">Ação</th>
                        <th className="p-6">Terminal IP</th>
                        <th className="p-6 text-right">Data / Cronometragem</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {filteredLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-cyan-500/5 transition-all group border-l-4 border-transparent hover:border-cyan-500/50">
                            <td className="p-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center bg-slate-900 text-cyan-400 group-hover:shadow-neon-cyan transition-all shadow-inner">
                                        <UserIcon size={18} />
                                    </div>
                                    <span className="text-sm font-black text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{log.user}</span>
                                </div>
                            </td>
                            <td className="p-6">
                                <span className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors font-medium">{log.description}</span>
                            </td>
                            <td className="p-6">
                                <span className="text-[10px] font-mono text-purple-400 bg-purple-500/10 px-4 py-1.5 rounded-full border border-purple-500/30 font-black uppercase tracking-widest">
                                    {log.module}
                                </span>
                            </td>
                            <td className="p-6">
                                <span className="text-[10px] font-black uppercase text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded border border-cyan-500/30 tracking-widest">
                                    {log.action}
                                </span>
                            </td>
                            <td className="p-6">
                                <div className="flex items-center gap-3 font-mono text-xs text-slate-500 font-bold">
                                    <Globe size={14} className="opacity-30" />
                                    {log.ip}
                                </div>
                            </td>
                            <td className="p-6 text-right">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-mono text-slate-400 font-bold">{log.entryTime}</span>
                                    {log.exitTime && (
                                        <span className="text-[9px] font-mono text-red-500/60 font-bold">Saída: {log.exitTime}</span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </NeonCard>

      {/* Footer Status Bar - Estilo Imagem */}
      <div className="flex items-center justify-between p-6 bg-slate-950/80 rounded-2xl border border-white/10 shadow-inner backdrop-blur-md">
          <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)]"></div>
                  <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-black">Status do Perímetro:</p>
              </div>
              <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-black">Integridade Nominal Verificada</p>
          </div>
          
          <div className="flex items-center gap-8">
              <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-slate-600 uppercase font-black">ID SESSÃO:</span>
                  <span className="text-[10px] font-mono text-slate-400 font-black">SEC-Q0FWGKYF59</span>
              </div>
              <div className="h-4 w-px bg-white/10"></div>
              <div className="flex items-center gap-4">
                  <span className="text-[10px] font-mono text-slate-600 uppercase font-black">Ativos:</span>
                  <span className="text-sm font-black text-cyan-400 font-mono">{logs.filter(l => l.active).length}</span>
              </div>
          </div>
      </div>
    </div>
  );
};

export default SecurityPanel;
