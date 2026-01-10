
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Settings2, 
  Lock, 
  Unlock, 
  LayoutDashboard, 
  UserPlus, 
  CalendarRange, 
  FileBarChart, 
  ShieldAlert,
  CheckSquare,
  Square,
  ChevronRight,
  Info,
  Save,
  CheckCircle,
  Loader2,
  Github,
  Cloud,
  CloudUpload,
  Database,
  Eye,
  EyeOff,
  RefreshCcw,
  AlertTriangle,
  ExternalLink,
  DownloadCloud
} from 'lucide-react';
import NeonCard from './NeonCard';
import { GroupPermission, UserRole, ModulePermission, GitHubConfig } from '../types';

const ROLES: { id: UserRole; label: string }[] = [
  { id: 'ADMIN', label: 'Administradores' },
  { id: 'COORDINATOR', label: 'Coordenadores' },
  { id: 'SUPERVISOR', label: 'Supervisores' },
  { id: 'TEACHER', label: 'Professores' },
];

interface SystemPanelProps {
  initialPermissions: Record<UserRole, GroupPermission>;
  onSave: (permissions: Record<UserRole, GroupPermission>) => void;
  appState?: any; 
  onImportState?: (state: any) => void;
}

const SystemPanel: React.FC<SystemPanelProps> = ({ initialPermissions, onSave, appState, onImportState }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('TEACHER');
  const [permissions, setPermissions] = useState<Record<UserRole, GroupPermission>>(initialPermissions);
  const [mode, setMode] = useState<'BASIC' | 'ADVANCED'>('BASIC');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // GitHub Sync States
  const [ghConfig, setGhConfig] = useState<GitHubConfig>(() => {
    const saved = localStorage.getItem('sge_gh_config');
    return saved ? JSON.parse(saved) : { token: '', repo: '', path: 'data/sge_db.json', branch: 'main' };
  });
  const [showToken, setShowToken] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'idle' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

  useEffect(() => {
    setPermissions(initialPermissions);
  }, [initialPermissions]);

  useEffect(() => {
    localStorage.setItem('sge_gh_config', JSON.stringify(ghConfig));
  }, [ghConfig]);

  const handleToggle = (module: keyof GroupPermission['modules'], field: keyof ModulePermission) => {
    setPermissions(prev => ({
      ...prev,
      [selectedRole]: {
        ...prev[selectedRole],
        modules: {
          ...prev[selectedRole].modules,
          [module]: {
            ...prev[selectedRole].modules[module],
            [field]: !prev[selectedRole].modules[module][field]
          }
        }
      }
    }));
  };

  const handleGlobalAction = (allow: boolean) => {
    setPermissions(prev => {
      const newModules = { ...prev[selectedRole].modules };
      Object.keys(newModules).forEach(modKey => {
        const key = modKey as keyof GroupPermission['modules'];
        newModules[key] = {
          visualize: allow,
          list: allow,
          add: allow,
          edit: allow,
          reports: allow
        };
      });
      return {
        ...prev,
        [selectedRole]: {
          ...prev[selectedRole],
          modules: newModules
        }
      };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    onSave(permissions);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Helper para codificar UTF-8 corretamente para Base64 (GitHub API requer isso)
  const utf8_to_b64 = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));
  const b64_to_utf8 = (str: string) => decodeURIComponent(Array.prototype.map.call(atob(str), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));

  const syncToGitHub = async () => {
    if (!ghConfig.token || !ghConfig.repo || !ghConfig.path) {
      setSyncStatus({ type: 'error', msg: 'Configure os dados do repositório primeiro.' });
      return;
    }

    setSyncing(true);
    setSyncStatus({ type: 'idle', msg: 'Estabelecendo conexão segura...' });

    try {
      const baseUrl = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const headers = {
        'Authorization': `token ${ghConfig.token}`,
        'Accept': 'application/vnd.github.v3+json'
      };

      let sha: string | undefined;
      try {
        const res = await fetch(`${baseUrl}?ref=${ghConfig.branch}`, { headers });
        if (res.ok) {
          const data = await res.json();
          sha = data.sha;
        }
      } catch (e) {}

      const content = utf8_to_b64(JSON.stringify(appState, null, 2));
      const payload = {
        message: `SGE Sync: Atualização automática de dados - ${new Date().toLocaleString()}`,
        content,
        sha,
        branch: ghConfig.branch
      };

      const updateRes = await fetch(baseUrl, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (updateRes.ok) {
        setSyncStatus({ type: 'success', msg: 'Dados salvos com sucesso no GitHub!' });
        localStorage.setItem('sge_last_sync', new Date().toISOString());
      } else {
        const errData = await updateRes.json();
        throw new Error(errData.message || 'Erro ao atualizar repositório.');
      }
    } catch (err: any) {
      setSyncStatus({ type: 'error', msg: `Falha no Push: ${err.message}` });
    } finally {
      setSyncing(false);
    }
  };

  const pullFromGitHub = async () => {
    if (!ghConfig.token || !ghConfig.repo || !ghConfig.path) {
      setSyncStatus({ type: 'error', msg: 'Configurações insuficientes.' });
      return;
    }

    setPulling(true);
    setSyncStatus({ type: 'idle', msg: 'Buscando dados no servidor...' });

    try {
      const baseUrl = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}?ref=${ghConfig.branch}`;
      const headers = {
        'Authorization': `token ${ghConfig.token}`,
        'Accept': 'application/vnd.github.v3+json'
      };

      const res = await fetch(baseUrl, { headers });
      if (!res.ok) throw new Error('Arquivo não encontrado ou erro de permissão.');

      const data = await res.json();
      const decodedContent = b64_to_utf8(data.content);
      const importedState = JSON.parse(decodedContent);

      if (onImportState) {
        onImportState(importedState);
        setSyncStatus({ type: 'success', msg: 'Conexão estabelecida! Dados importados com sucesso.' });
      }
    } catch (err: any) {
      setSyncStatus({ type: 'error', msg: `Falha no Pull: ${err.message}` });
    } finally {
      setPulling(false);
    }
  };

  const activePerms = permissions[selectedRole];

  const PermissionRow = ({ label, isChecked, onClick }: { label: string; isChecked: boolean; onClick: () => void }) => (
    <div 
      onClick={onClick}
      className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/10 group"
    >
      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{label}</span>
      {isChecked ? (
        <div className="w-5 h-5 bg-cyan-500/20 border border-cyan-500 rounded flex items-center justify-center text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]">
          <CheckSquare size={14} />
        </div>
      ) : (
        <div className="w-5 h-5 border border-slate-700 rounded bg-slate-900 group-hover:border-slate-500 transition-colors" />
      )}
    </div>
  );

  const ModuleCard = ({ 
    title, 
    icon, 
    moduleKey, 
    glowColor 
  }: { 
    title: string; 
    icon: React.ReactNode; 
    moduleKey: keyof GroupPermission['modules'];
    glowColor: 'cyan' | 'purple' | 'orange' | 'blue';
  }) => {
    const mod = activePerms.modules[moduleKey];
    return (
      <NeonCard glowColor={glowColor} className="p-0 border-white/10 bg-slate-950/40">
        <div className="bg-slate-900/80 p-4 border-b border-white/10 flex items-center justify-between">
           <div className="flex items-center gap-3">
              <span className="text-white/70">{icon}</span>
              <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
           </div>
           <div className={`w-3 h-3 rounded-full border border-white/10 ${mod.visualize ? 'bg-cyan-500 shadow-neon-cyan' : 'bg-slate-800'}`}></div>
        </div>
        <div className="p-2 space-y-1">
          <PermissionRow label="Visualizar" isChecked={mod.visualize} onClick={() => handleToggle(moduleKey, 'visualize')} />
          <PermissionRow label="Listar" isChecked={mod.list} onClick={() => handleToggle(moduleKey, 'list')} />
          <PermissionRow label="Adicionar" isChecked={mod.add} onClick={() => handleToggle(moduleKey, 'add')} />
          <PermissionRow label="Editar" isChecked={mod.edit} onClick={() => handleToggle(moduleKey, 'edit')} />
          <PermissionRow label="Gerar relatórios" isChecked={mod.reports} onClick={() => handleToggle(moduleKey, 'reports')} />
        </div>
      </NeonCard>
    );
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="flex flex-col md:flex-row items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 text-xs font-mono uppercase text-slate-500 tracking-widest font-black mb-3">
            <Settings2 size={16} className="text-cyan-500" />
            <span>Configurações Globais do Sistema</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-mono flex items-center gap-4">
            Permissões de Grupo
            <div className="relative group">
              <div className="absolute inset-0 bg-cyan-500/20 blur-md rounded-full group-hover:bg-cyan-500/30 transition-all"></div>
              <span className="relative text-cyan-400 bg-cyan-500/10 px-6 py-2 rounded-full border border-cyan-500/40 text-lg shadow-neon-cyan">
                ({ROLES.find(r => r.id === selectedRole)?.label})
              </span>
            </div>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-950/80 p-2 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
          {ROLES.map(role => (
            <button 
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                selectedRole === role.id 
                  ? 'bg-cyan-600 text-white shadow-neon-cyan scale-105' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {role.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-sci-panel/60 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full bg-cyan-500/5 skew-x-12 translate-x-32 pointer-events-none"></div>
        
        <div className="flex flex-wrap gap-4 relative z-10">
           <button 
             onClick={() => handleGlobalAction(true)}
             className="flex items-center gap-3 px-8 py-4 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 group"
           >
              <Unlock size={18} className="group-hover:rotate-12 transition-transform" /> Liberar todas
           </button>
           <button 
             onClick={() => handleGlobalAction(false)}
             className="flex items-center gap-3 px-8 py-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/40 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 group"
           >
              <Lock size={18} className="group-hover:-rotate-12 transition-transform" /> Bloquear todas
           </button>
           
           <div className="h-12 w-px bg-white/10 hidden lg:block mx-2"></div>
           
           <button 
             onClick={handleSave}
             disabled={isSaving}
             className={`flex items-center gap-4 px-12 py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl active:scale-95 relative overflow-hidden ${
               saveSuccess 
                 ? 'bg-green-600 text-white shadow-neon-emerald' 
                 : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-neon-cyan border border-cyan-400/30'
             }`}
           >
              {isSaving ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Sincronizando...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle size={20} />
                  Grupo Liberado!
                </>
              ) : (
                <>
                  <Save size={20} />
                  Salvar Alterações
                </>
              )}
           </button>
        </div>

        <div className="flex bg-slate-950/80 p-2 rounded-xl border border-white/10 shadow-inner relative z-10">
           <button 
             onClick={() => setMode('BASIC')}
             className={`px-10 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
               mode === 'BASIC' ? 'bg-slate-800 text-cyan-400 shadow-lg' : 'text-slate-500 hover:text-slate-400'
             }`}
           >
             Modo básico
           </button>
           <button 
             onClick={() => setMode('ADVANCED')}
             className={`px-10 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
               mode === 'ADVANCED' ? 'bg-slate-800 text-cyan-400 shadow-lg' : 'text-slate-500 hover:text-slate-400'
             }`}
           >
             Modo avançado
           </button>
        </div>
      </div>

      {/* MÓDULO: GITHUB CLOUD SYNC */}
      <NeonCard glowColor="purple" title="Conexão Cloud: GitHub Repository" icon={<Github size={18} className="text-purple-400" />}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              <div className="space-y-6">
                  <div className="bg-purple-500/5 p-4 rounded-xl border border-purple-500/20">
                    <p className="text-xs text-slate-400 leading-relaxed italic">
                        Mantenha os dados do S.G.E. centralizados em nuvem. A "Conceção" permite que você salve (Push) o estado atual ou recupere (Pull) a base de dados de um repositório Git.
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="space-y-2">
                          <label className="text-[10px] font-mono uppercase text-purple-400 font-black">Personal Access Token (PAT)</label>
                          <div className="relative">
                              <input 
                                type={showToken ? "text" : "password"} 
                                className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-sm text-white font-mono placeholder:text-slate-700"
                                value={ghConfig.token}
                                onChange={e => setGhConfig({...ghConfig, token: e.target.value})}
                                placeholder="ghp_seu_token_aqui"
                              />
                              <button onClick={() => setShowToken(!showToken)} className="absolute right-4 top-3.5 text-slate-500 hover:text-white transition-colors">
                                  {showToken ? <EyeOff size={18}/> : <Eye size={18}/>}
                              </button>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase text-slate-500 font-black">Repositório (dono/repo)</label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
                              value={ghConfig.repo}
                              onChange={e => setGhConfig({...ghConfig, repo: e.target.value})}
                              placeholder="ex: senai-rios/sge-db"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-mono uppercase text-slate-500 font-black">Ramo (Branch)</label>
                            <input 
                              type="text" 
                              className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
                              value={ghConfig.branch}
                              onChange={e => setGhConfig({...ghConfig, branch: e.target.value})}
                            />
                        </div>
                      </div>

                      <div className="space-y-2">
                          <label className="text-[10px] font-mono uppercase text-slate-500 font-black">Caminho do Arquivo JSON</label>
                          <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white"
                            value={ghConfig.path}
                            onChange={e => setGhConfig({...ghConfig, path: e.target.value})}
                          />
                      </div>
                  </div>
              </div>

              <div className="flex flex-col h-full justify-between gap-4">
                  <div className={`p-6 rounded-2xl border transition-all ${syncStatus.type === 'error' ? 'bg-red-500/5 border-red-500/20' : syncStatus.type === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-950 border-white/5'}`}>
                      <div className="flex items-center gap-4 mb-4">
                          <div className={`p-3 rounded-xl ${syncStatus.type === 'error' ? 'bg-red-500/10 text-red-500' : syncStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-900 text-slate-500'}`}>
                              {syncing || pulling ? <RefreshCcw className="animate-spin" size={24}/> : <Cloud size={24}/>}
                          </div>
                          <div>
                              <p className="text-[10px] font-mono text-slate-500 uppercase font-black">Auditoria de Conexão</p>
                              <p className={`text-sm font-bold ${syncStatus.type === 'error' ? 'text-red-400' : syncStatus.type === 'success' ? 'text-emerald-400' : 'text-slate-400'}`}>
                                  {syncing ? 'Efetuando Commit...' : pulling ? 'Baixando Dados...' : (syncStatus.msg || 'Aguardando ação do operador...')}
                              </p>
                          </div>
                      </div>
                      <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-700 ${syncing || pulling ? 'w-2/3 bg-purple-500 animate-pulse' : syncStatus.type === 'success' ? 'w-full bg-emerald-500' : 'w-0'}`}></div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <button 
                        onClick={pullFromGitHub}
                        disabled={pulling || syncing || !ghConfig.token}
                        className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                          {pulling ? <Loader2 className="animate-spin" size={16}/> : <DownloadCloud size={16}/>}
                          Importar (Pull)
                      </button>
                      <button 
                        onClick={syncToGitHub}
                        disabled={syncing || pulling || !ghConfig.token}
                        className="py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-neon-purple active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                      >
                          {syncing ? <Loader2 className="animate-spin" size={16}/> : <CloudUpload size={16}/>}
                          Exportar (Push)
                      </button>
                  </div>
                  
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[9px] font-mono text-slate-600 uppercase font-bold">
                        Último Sync: {localStorage.getItem('sge_last_sync') ? new Date(localStorage.getItem('sge_last_sync')!).toLocaleTimeString() : 'NUNCA'}
                    </span>
                    <a 
                        href={ghConfig.repo ? `https://github.com/${ghConfig.repo}/blob/${ghConfig.branch}/${ghConfig.path}` : '#'} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[10px] font-mono text-slate-500 hover:text-purple-400 uppercase tracking-widest font-black flex items-center gap-2 transition-colors"
                    >
                        Abrir no Repo <ExternalLink size={12}/>
                    </a>
                  </div>
              </div>
          </div>
      </NeonCard>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        <ModuleCard title="Dashboard" icon={<LayoutDashboard size={18}/>} moduleKey="dashboard" glowColor="blue" />
        <ModuleCard title="Cadastro" icon={<UserPlus size={18}/>} moduleKey="cadastro" glowColor="cyan" />
        <ModuleCard title="Escalas" icon={<CalendarRange size={18}/>} moduleKey="escalas" glowColor="purple" />
        <ModuleCard title="Relatórios" icon={<FileBarChart size={18}/>} moduleKey="relatorios" glowColor="orange" />
        <ModuleCard title="Segurança" icon={<ShieldAlert size={18}/>} moduleKey="seguranca" glowColor="blue" />
      </div>

      <div className="flex items-start gap-6 p-8 bg-slate-950/80 border border-white/10 rounded-2xl shadow-2xl relative group overflow-hidden">
         <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500 group-hover:shadow-neon-cyan transition-all"></div>
         <Info className="text-cyan-400 shrink-0 w-6 h-6" />
         <div>
            <h4 className="text-base font-black text-white uppercase tracking-widest mb-2">Nota de Segurança Operacional</h4>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              As alterações feitas neste painel são aplicadas em tempo real a todos os usuários vinculados ao grupo <strong className="text-cyan-400">{ROLES.find(r => r.id === selectedRole)?.label}</strong> após o salvamento. 
              Módulos marcados como inativos em <strong className="text-slate-300">Visualizar</strong> serão automaticamente removidos do menu de navegação lateral para garantir a conformidade de acesso.
            </p>
         </div>
      </div>
    </div>
  );
};

export default SystemPanel;
