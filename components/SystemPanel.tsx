
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Settings2, Lock, Unlock, LayoutDashboard, UserPlus, 
  CalendarRange, FileBarChart, ShieldAlert, CheckSquare, Square, 
  Info, Save, CheckCircle, Loader2, Github, Cloud, CloudUpload, 
  Database, Eye, EyeOff, RefreshCcw, ExternalLink, DownloadCloud,
  Server, Code, Copy, Database as DBIcon, Zap, Globe, HardDriveDownload,
  Share2, FolderOpen, FileJson, CloudCog
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
  const [activeConfigTab, setActiveConfigTab] = useState<'PERMISSIONS' | 'GITHUB' | 'HOSTINGER' | 'DRIVE'>('PERMISSIONS');
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
  const [showToken, setShowToken] = useState(false);
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

  // --- CLOUD SYNC LOGIC ---

  const syncToDrive = async () => {
    if (!driveConfig.token) {
      setSqlStatus({ type: 'error', msg: 'Acesso Google Drive não configurado.' });
      return;
    }
    setDriveSyncing(true);
    try {
      // Simulação de upload para Drive via API (placeholder funcional para estrutura)
      const metadata = {
        name: driveConfig.fileName,
        mimeType: 'application/json',
        parents: driveConfig.folderId ? [driveConfig.folderId] : []
      };
      
      const file = new Blob([JSON.stringify(appState, null, 2)], { type: 'application/json' });
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', file);

      // Nota: Requer setup de Client ID no Google Cloud Console
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': 'Bearer ' + driveConfig.token }),
        body: form
      });

      if (response.ok) {
        setSqlStatus({ type: 'success', msg: 'Backup exportado para Google Drive!' });
      } else {
        throw new Error('Falha na autorização do Google Drive.');
      }
    } catch (e: any) {
      setSqlStatus({ type: 'error', msg: e.message });
    } finally {
      setDriveSyncing(false);
    }
  };

  const syncToMySQL = async () => {
    if (!sqlConfig.endpoint) {
      setSqlStatus({ type: 'error', msg: 'Configure o endpoint Hostinger primeiro.' });
      return;
    }
    setSqlSyncing(true);
    try {
      const res = await fetch(sqlConfig.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': sqlConfig.apiKey },
        body: JSON.stringify({ action: 'PUSH', payload: appState })
      });
      if (res.ok) {
        setSqlStatus({ type: 'success', msg: 'Sincronizado com Banco Hostinger!' });
      } else throw new Error('Erro na ponte Hostinger PHP.');
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
      setSqlStatus({ type: 'success', msg: 'Dados importados do Hostinger.' });
    } catch (e: any) { setSqlStatus({ type: 'error', msg: 'Falha no download Hostinger.' }); }
    finally { setSqlPulling(false); }
  };

  // Helper Base64 para GitHub
  const utf8_to_b64 = (str: string) => btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16))));

  const syncToGitHub = async () => {
    if (!ghConfig.token || !ghConfig.repo) return;
    setSyncing(true);
    try {
      const baseUrl = `https://api.github.com/repos/${ghConfig.repo}/contents/${ghConfig.path}`;
      const headers = { 'Authorization': `token ${ghConfig.token}`, 'Accept': 'application/vnd.github.v3+json' };
      let sha: string | undefined;
      try {
        const res = await fetch(`${baseUrl}?ref=${ghConfig.branch}`, { headers });
        if (res.ok) { const data = await res.json(); sha = data.sha; }
      } catch (e) {}
      const payload = { 
        message: `SGE Sync: ${new Date().toLocaleString()}`, 
        content: utf8_to_b64(JSON.stringify(appState, null, 2)), 
        sha, 
        branch: ghConfig.branch 
      };
      const updateRes = await fetch(baseUrl, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (updateRes.ok) setSyncStatus({ type: 'success', msg: 'GitHub Atualizado!' });
    } catch (err: any) { setSyncStatus({ type: 'error', msg: 'Erro GitHub Sync.' }); }
    finally { setSyncing(false); }
  };

  const activePerms = permissions[selectedRole];

  const PermissionRow = ({ label, isChecked, onClick }: { label: string; isChecked: boolean; onClick: () => void }) => (
    <div onClick={onClick} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 cursor-pointer transition-all border border-transparent hover:border-white/10 group">
      <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">{label}</span>
      {isChecked ? (
        <div className="w-5 h-5 bg-cyan-500/20 border border-cyan-500 rounded flex items-center justify-center text-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.4)]"><CheckSquare size={14} /></div>
      ) : (
        <div className="w-5 h-5 border border-slate-700 rounded bg-slate-900 group-hover:border-slate-500 transition-colors" />
      )}
    </div>
  );

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
            <button onClick={() => setActiveConfigTab('PERMISSIONS')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'PERMISSIONS' ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-500 hover:text-white'}`}>Permissões</button>
            <button onClick={() => setActiveConfigTab('GITHUB')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'GITHUB' ? 'bg-purple-600 text-white shadow-neon-purple' : 'text-slate-500 hover:text-white'}`}>GitHub</button>
            <button onClick={() => setActiveConfigTab('HOSTINGER')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'HOSTINGER' ? 'bg-orange-600 text-white shadow-neon-orange' : 'text-slate-500 hover:text-white'}`}>Hostinger DB</button>
            <button onClick={() => setActiveConfigTab('DRIVE')} className={`whitespace-nowrap px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'DRIVE' ? 'bg-blue-600 text-white shadow-blue-500/50' : 'text-slate-500 hover:text-white'}`}>G-Drive</button>
        </div>
      </div>

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
