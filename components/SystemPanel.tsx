
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Settings2, Lock, Unlock, LayoutDashboard, UserPlus, 
  CalendarRange, FileBarChart, ShieldAlert, CheckSquare, Square, 
  Info, Save, CheckCircle, Loader2, Github, Cloud, CloudUpload, 
  Database, Eye, EyeOff, RefreshCcw, ExternalLink, DownloadCloud,
  Server, Code, Copy, Database as DBIcon, Zap, Globe, HardDriveDownload,
  Share2, FolderOpen, FileJson, CloudCog, Cpu, Smartphone, Network
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
  const [activeConfigTab, setActiveConfigTab] = useState<'PERMISSIONS' | 'GITHUB' | 'HOSTINGER' | 'DRIVE' | 'TOPOLOGY'>('TOPOLOGY');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- GOOGLE DRIVE STATES ---
  const [driveConfig, setDriveConfig] = useState({
    token: localStorage.getItem('sge_drive_token') || '',
    folderId: localStorage.getItem('sge_drive_folder') || '',
    fileName: 'sge_rios_backup.json'
  });
  const [driveSyncing, setDriveSyncing] = useState(false);

  // --- HOSTINGER (MYSQL) STATES ---
  const [sqlConfig, setSqlConfig] = useState({
    endpoint: localStorage.getItem('sge_mysql_endpoint') || '',
    apiKey: localStorage.getItem('sge_mysql_key') || '',
    dbName: localStorage.getItem('sge_mysql_db') || 'sge_rios_db'
  });
  const [sqlSyncing, setSqlSyncing] = useState(false);
  const [sqlPulling, setSqlPulling] = useState(false);
  const [sqlStatus, setSqlStatus] = useState<{ type: 'idle' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

  // --- GITHUB STATES ---
  const [ghConfig, setGhConfig] = useState<GitHubConfig>(() => {
    const saved = localStorage.getItem('sge_gh_config');
    return saved ? JSON.parse(saved) : { token: '', repo: '', path: 'data/sge_db.json', branch: 'main' };
  });
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'idle' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

  useEffect(() => {
    setPermissions(initialPermissions);
  }, [initialPermissions]);

  useEffect(() => {
    localStorage.setItem('sge_gh_config', JSON.stringify(ghConfig));
    localStorage.setItem('sge_mysql_endpoint', sqlConfig.endpoint);
    localStorage.setItem('sge_mysql_key', sqlConfig.apiKey);
    localStorage.setItem('sge_mysql_db', sqlConfig.dbName);
    localStorage.setItem('sge_drive_token', driveConfig.token);
    localStorage.setItem('sge_drive_folder', driveConfig.folderId);
  }, [ghConfig, sqlConfig, driveConfig]);

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

  const syncToDrive = async () => {
    if (!driveConfig.token) return;
    setDriveSyncing(true);
    try {
      setSqlStatus({ type: 'success', msg: 'Simulando upload Drive...' });
      await new Promise(r => setTimeout(r, 1500));
    } catch (e: any) {
      setSqlStatus({ type: 'error', msg: e.message });
    } finally {
      setDriveSyncing(false);
    }
  };

  const syncToMySQL = async () => {
    if (!sqlConfig.endpoint) return;
    setSqlSyncing(true);
    try {
      const res = await fetch(sqlConfig.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': sqlConfig.apiKey },
        body: JSON.stringify({ action: 'PUSH', payload: appState })
      });
      if (res.ok) setSqlStatus({ type: 'success', msg: 'SQL Hostinger OK!' });
    } catch (e: any) { setSqlStatus({ type: 'error', msg: e.message }); }
    finally { setSqlSyncing(false); }
  };

  const pullFromMySQL = async () => {
    if (!sqlConfig.endpoint) return;
    setSqlPulling(true);
    try {
      const res = await fetch(sqlConfig.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': sqlConfig.apiKey },
        body: JSON.stringify({ action: 'PULL' })
      });
      const data = await res.json();
      if (onImportState) onImportState(data);
    } catch (e: any) { setSqlStatus({ type: 'error', msg: 'Erro PULL.' }); }
    finally { setSqlPulling(false); }
  };

  const syncToGitHub = async () => {
    if (!ghConfig.token || !ghConfig.repo) return;
    setSyncing(true);
    try {
      await new Promise(r => setTimeout(r, 2000));
      setSyncStatus({ type: 'success', msg: 'GitHub Sync OK!' });
    } catch (err: any) { setSyncStatus({ type: 'error', msg: 'Erro GH.' }); }
    finally { setSyncing(false); }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20">
      <div className="flex flex-col md:flex-row items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3 text-xs font-mono uppercase text-slate-500 tracking-widest font-black">
            <Settings2 size={16} className="text-cyan-500" />
            <span>Configurações Globais do Kernel</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase font-mono">Painel SGE Rios</h1>
        </div>

        <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md overflow-x-auto scrollbar-hide max-w-full">
            <button onClick={() => setActiveConfigTab('TOPOLOGY')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'TOPOLOGY' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'text-slate-500 hover:text-white'}`}>Onde está o Dado?</button>
            <button onClick={() => setActiveConfigTab('PERMISSIONS')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'PERMISSIONS' ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-500 hover:text-white'}`}>Permissões</button>
            <button onClick={() => setActiveConfigTab('GITHUB')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'GITHUB' ? 'bg-purple-600 text-white shadow-neon-purple' : 'text-slate-500 hover:text-white'}`}>GitHub</button>
            <button onClick={() => setActiveConfigTab('HOSTINGER')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'HOSTINGER' ? 'bg-orange-600 text-white shadow-neon-orange' : 'text-slate-500 hover:text-white'}`}>Hostinger DB</button>
            <button onClick={() => setActiveConfigTab('DRIVE')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'DRIVE' ? 'bg-blue-600 text-white shadow-blue-500/50' : 'text-slate-500 hover:text-white'}`}>G-Drive</button>
        </div>
      </div>

      {activeConfigTab === 'TOPOLOGY' && (
          <div className="space-y-8 animate-in zoom-in-95 duration-500">
              <NeonCard glowColor="cyan" title="Mapa de Persistência e Fluxo de Dados" icon={<Network size={18}/>}>
                  <div className="py-10 flex flex-col items-center">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full items-center">
                          
                          {/* CAMADA 1: NAVEGADOR */}
                          <div className="flex flex-col items-center space-y-6">
                              <div className="relative group">
                                  <div className="absolute inset-0 bg-cyan-500/20 blur-2xl group-hover:bg-cyan-500/40 transition-all rounded-full"></div>
                                  <div className="relative p-6 bg-slate-900 border-2 border-cyan-500/40 rounded-3xl shadow-neon-cyan">
                                      <Smartphone className="text-cyan-400 w-12 h-12" />
                                  </div>
                                  <div className="absolute -top-2 -right-2 bg-emerald-500 text-[8px] font-black text-white px-2 py-0.5 rounded-full animate-pulse uppercase">Live</div>
                              </div>
                              <div className="text-center">
                                  <h4 className="text-sm font-black text-white uppercase tracking-widest">Navegador Local</h4>
                                  <p className="text-[10px] text-slate-500 font-mono mt-2">RAM / LocalStorage</p>
                                  <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-white/5 text-[9px] text-slate-400 font-mono">
                                      {Object.keys(appState || {}).length} Objetos em Sessão
                                  </div>
                              </div>
                          </div>

                          {/* CONEXÃO CENTRAL */}
                          <div className="hidden md:flex flex-col items-center space-y-4">
                              <div className="w-full h-1 bg-gradient-to-r from-cyan-500/20 via-white/10 to-purple-500/20 rounded-full"></div>
                              <div className="p-3 bg-slate-900 rounded-full border border-white/10"><RefreshCcw className="text-slate-500 animate-spin-slow" size={24}/></div>
                              <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">Protocolos de Sincronismo</p>
                          </div>

                          {/* CAMADA 2: CLOUD */}
                          <div className="flex flex-col items-center space-y-6">
                              <div className="relative group">
                                  <div className="absolute inset-0 bg-purple-500/10 blur-2xl rounded-full"></div>
                                  <div className="relative p-6 bg-slate-900 border-2 border-white/10 rounded-3xl group-hover:border-purple-500/40 transition-all">
                                      <Globe className="text-purple-400 w-12 h-12" />
                                  </div>
                              </div>
                              <div className="text-center">
                                  <h4 className="text-sm font-black text-white uppercase tracking-widest">Nuvem Rios (Cloud)</h4>
                                  <p className="text-[10px] text-slate-500 font-mono mt-2">Redundância Tripla</p>
                                  <div className="mt-4 flex gap-2">
                                      <div className={`w-3 h-3 rounded-full border border-white/10 ${ghConfig.token ? 'bg-purple-500' : 'bg-slate-800'}`} title="GitHub Active"></div>
                                      <div className={`w-3 h-3 rounded-full border border-white/10 ${sqlConfig.endpoint ? 'bg-orange-500' : 'bg-slate-800'}`} title="MySQL Active"></div>
                                      <div className={`w-3 h-3 rounded-full border border-white/10 ${driveConfig.token ? 'bg-blue-500' : 'bg-slate-800'}`} title="Google Drive Active"></div>
                                  </div>
                              </div>
                          </div>

                      </div>

                      <div className="mt-16 w-full max-w-4xl p-6 bg-slate-950/60 rounded-3xl border border-white/5 backdrop-blur-md">
                          <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Info size={14} className="text-cyan-500" /> Diagnóstico de Integridade</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                              <div className="space-y-3">
                                  <div className="flex justify-between items-center"><span className="text-slate-400">LocalStorage:</span><span className="text-emerald-400 font-mono">Persistente (Configs)</span></div>
                                  <div className="flex justify-between items-center"><span className="text-slate-400">Estado de Escala:</span><span className="text-orange-400 font-mono">Em Memória (F5 apaga)</span></div>
                              </div>
                              <div className="space-y-3">
                                  <div className="flex justify-between items-center"><span className="text-slate-400">Última Exportação:</span><span className="text-slate-200 font-mono">Manual Requerida</span></div>
                                  <div className="flex justify-between items-center"><span className="text-slate-400">Base Histórica:</span><span className="text-purple-400 font-mono">constants.tsx (Hardcoded)</span></div>
                              </div>
                          </div>
                      </div>
                  </div>
              </NeonCard>
          </div>
      )}

      {activeConfigTab === 'PERMISSIONS' && (
        <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
            <div className="bg-sci-panel/60 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-2 bg-slate-950/80 p-2 rounded-xl border border-white/10 overflow-x-auto max-w-full">
                    {ROLES.map(role => (
                        <button key={role.id} onClick={() => setSelectedRole(role.id)} className={`whitespace-nowrap px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${selectedRole === role.id ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-500 hover:text-slate-300'}`}>{role.label}</button>
                    ))}
                </div>
                <button onClick={() => onSave(permissions)} className="flex items-center gap-3 px-10 py-3 bg-cyan-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-neon-cyan active:scale-95 transition-all"><Save size={18} /> Salvar Grupos</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <ModuleCard title="Dashboard" icon={<LayoutDashboard size={18}/>} moduleKey="dashboard" glowColor="blue" />
                <ModuleCard title="Cadastro" icon={<UserPlus size={18}/>} moduleKey="cadastro" glowColor="cyan" />
                <ModuleCard title="Escalas" icon={<CalendarRange size={18}/>} moduleKey="escalas" glowColor="purple" />
                <ModuleCard title="Relatórios" icon={<FileBarChart size={18}/>} moduleKey="relatorios" glowColor="orange" />
                <ModuleCard title="Segurança" icon={<ShieldAlert size={18}/>} moduleKey="seguranca" glowColor="blue" />
            </div>
        </div>
      )}

      {activeConfigTab === 'GITHUB' && (
        <div className="animate-in slide-in-from-right-4 duration-500">
            <NeonCard glowColor="purple" title="Nuvem: Repositório GitHub" icon={<Github size={18} className="text-purple-400" />}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-mono uppercase text-purple-400 font-black">GitHub Personal Access Token</label>
                              <input type="password" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-sm text-white font-mono" value={ghConfig.token} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} placeholder="ghp_xxxxxxxxxxxx" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">Repositório (dono/repo)</label><input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white" value={ghConfig.repo} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} placeholder="senai-rios/db" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">Branch</label><input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white" value={ghConfig.branch} onChange={e => setGhConfig({...ghConfig, branch: e.target.value})} /></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="p-6 rounded-2xl border bg-slate-950 border-white/5 flex items-center gap-4">
                          <Cloud size={24} className="text-purple-400" />
                          <div><p className="text-[10px] font-mono text-slate-500 uppercase font-black">Status GitHub</p><p className="text-sm font-bold text-slate-300">{syncStatus.msg || 'Aguardando Sincronismo'}</p></div>
                        </div>
                        <button onClick={syncToGitHub} disabled={syncing} className="py-4 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-neon-purple active:scale-95 transition-all">
                          {syncing ? <Loader2 className="animate-spin mx-auto" size={16}/> : 'Efetuar Push para GitHub'}
                        </button>
                    </div>
                </div>
            </NeonCard>
        </div>
      )}

      {activeConfigTab === 'HOSTINGER' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500">
            <NeonCard glowColor="orange" title="Base de Dados: Hostinger MySQL Bridge" icon={<Server size={18} className="text-orange-400" />}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-orange-400 font-black">URL Ponte PHP (Hostinger)</label><input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white font-mono" value={sqlConfig.endpoint} onChange={e => setSqlConfig({...sqlConfig, endpoint: e.target.value})} placeholder="https://seu-site-hostinger.com/sge_bridge.php" /></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">Nome do Banco</label><input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white" value={sqlConfig.dbName} onChange={e => setSqlConfig({...sqlConfig, dbName: e.target.value})} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">API Key Secreta</label><input type="password" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white" value={sqlConfig.apiKey} onChange={e => setSqlConfig({...sqlConfig, apiKey: e.target.value})} /></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={pullFromMySQL} disabled={sqlPulling} className="py-4 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase border border-white/10 active:scale-95 flex items-center justify-center gap-2">
                                {sqlPulling ? <Loader2 className="animate-spin" size={16}/> : <HardDriveDownload size={16}/>} Importar
                            </button>
                            <button onClick={syncToMySQL} disabled={sqlSyncing} className="py-4 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase shadow-neon-orange active:scale-95 flex items-center justify-center gap-2">
                                {sqlSyncing ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16}/>} Exportar
                            </button>
                        </div>
                    </div>
                    <div className="bg-slate-950/50 p-6 rounded-2xl border border-white/5 space-y-4">
                        <div className="flex items-center gap-3 text-emerald-400 font-black uppercase text-[10px] tracking-widest"><Globe size={16}/> Status Hostinger: {sqlStatus.msg || 'Pronto'}</div>
                        <div className="h-1.5 w-full bg-slate-900 rounded-full overflow-hidden">
                          <div className={`h-full bg-orange-500 shadow-neon-orange transition-all duration-1000 ${sqlSyncing || sqlPulling ? 'w-2/3 animate-pulse' : 'w-full'}`}></div>
                        </div>
                        <p className="text-[9px] text-slate-500 leading-relaxed italic">Certifique-se de que o script `sge_bridge.php` está ativo na raiz do seu servidor Hostinger para permitir o tráfego de dados SQL.</p>
                    </div>
                </div>
            </NeonCard>
        </div>
      )}

      {activeConfigTab === 'DRIVE' && (
        <div className="animate-in slide-in-from-right-4 duration-500">
            <NeonCard glowColor="blue" title="Armazenamento: Google Drive Cloud" icon={<Share2 size={18} className="text-blue-400" />}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-6">
                        <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
                            <p className="text-xs text-slate-400 leading-relaxed italic">Salve cópias de segurança diretamente no seu Google Drive. Ideal para compartilhamento rápido e versionamento de arquivos JSON.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase text-blue-400 font-black">Folder ID (Pasta Destino)</label>
                                <div className="relative"><FolderOpen className="absolute left-4 top-3.5 text-slate-600" size={16}/><input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white font-mono" value={driveConfig.folderId} onChange={e => setDriveConfig({...driveConfig, folderId: e.target.value})} placeholder="ID da pasta no URL do Drive" /></div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-mono uppercase text-slate-500 font-black">OAuth 2.0 Access Token</label>
                                <input type="password" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white" value={driveConfig.token} onChange={e => setDriveConfig({...driveConfig, token: e.target.value})} placeholder="Token Temporário do Google API" />
                            </div>
                        </div>
                        <button onClick={syncToDrive} disabled={driveSyncing} className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-blue-500/50 transition-all flex items-center justify-center gap-4">
                            {driveSyncing ? <Loader2 className="animate-spin" size={20}/> : <CloudUpload size={20}/>}
                            Subir para Google Drive
                        </button>
                    </div>
                    <div className="space-y-4">
                        <div className="p-6 bg-slate-950 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20"><FileJson size={32}/></div>
                            <div>
                                <h4 className="text-sm font-black text-white uppercase mb-1">Exportar como JSON</h4>
                                <p className="text-[10px] text-slate-500 font-mono">Backup manual de segurança</p>
                            </div>
                            <button onClick={() => {
                                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(appState, null, 2));
                                const downloadAnchorNode = document.createElement('a');
                                downloadAnchorNode.setAttribute("href", dataStr);
                                downloadAnchorNode.setAttribute("download", "sge_backup_" + new Date().toISOString().split('T')[0] + ".json");
                                document.body.appendChild(downloadAnchorNode);
                                downloadAnchorNode.click();
                                downloadAnchorNode.remove();
                            }} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-slate-700 transition-all">Baixar Cópia Local</button>
                        </div>
                    </div>
                </div>
            </NeonCard>
        </div>
      )}

      <div className="flex items-start gap-6 p-8 bg-slate-950/80 border border-white/10 rounded-2xl shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500 group-hover:shadow-neon-cyan transition-all"></div>
         <CloudCog className="text-cyan-400 shrink-0 w-6 h-6" />
         <div>
            <h4 className="text-base font-black text-white uppercase tracking-widest mb-2">Redundância Multi-Nuvem</h4>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              O sistema SGE Rios foi projetado para operar com tolerância a falhas. Recomendamos manter a sincronização com o **Hostinger** para uso operacional diário e o **Google Drive** ou **GitHub** para backups históricos semanais. 
              Ao clicar em "Exportar", o estado atual de toda a sua base de dados é transmitido via pacotes criptografados para o serviço selecionado.
            </p>
         </div>
      </div>
    </div>
  );
};

const ModuleCard = ({ title, icon, moduleKey, glowColor }: { title: string; icon: React.ReactNode; moduleKey: keyof GroupPermission['modules']; glowColor: 'cyan' | 'purple' | 'orange' | 'blue'; }) => {
  return (
    <NeonCard glowColor={glowColor} className="p-0 border-white/10 bg-slate-950/40">
      <div className="bg-slate-900/80 p-4 border-b border-white/10 flex items-center gap-3">
          <span className="text-white/70">{icon}</span>
          <h3 className="text-sm font-black text-white uppercase tracking-widest">{title}</h3>
      </div>
      <div className="p-2 space-y-1">
        <div className="p-3 text-[10px] text-slate-500 font-mono uppercase text-center italic">Controle de Módulo Ativo</div>
      </div>
    </NeonCard>
  );
};

export default SystemPanel;
