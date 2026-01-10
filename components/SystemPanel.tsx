
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Settings2, Lock, Unlock, LayoutDashboard, UserPlus, 
  CalendarRange, FileBarChart, ShieldAlert, CheckSquare, Square, 
  Info, Save, CheckCircle, Loader2, Github, Cloud, CloudUpload, 
  Database, Eye, EyeOff, RefreshCcw, ExternalLink, DownloadCloud,
  Server, Code, Copy, Database as DBIcon, Zap, Globe, HardDriveDownload
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
  const [activeConfigTab, setActiveConfigTab] = useState<'PERMISSIONS' | 'GITHUB' | 'MYSQL'>('PERMISSIONS');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // MySQL Connection States
  const [sqlConfig, setSqlConfig] = useState({
    endpoint: localStorage.getItem('sge_mysql_endpoint') || '',
    apiKey: localStorage.getItem('sge_mysql_key') || '',
    dbName: localStorage.getItem('sge_mysql_db') || 'sge_rios_db'
  });
  const [sqlSyncing, setSqlSyncing] = useState(false);
  const [sqlPulling, setSqlPulling] = useState(false);
  const [sqlStatus, setSqlStatus] = useState<{ type: 'idle' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' });

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
    localStorage.setItem('sge_mysql_endpoint', sqlConfig.endpoint);
    localStorage.setItem('sge_mysql_key', sqlConfig.apiKey);
    localStorage.setItem('sge_mysql_db', sqlConfig.dbName);
  }, [ghConfig, sqlConfig]);

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

  // MySQL SQL Schema Code (Expanded)
  const sqlSchema = `
-- 1. ESTRUTURA PARA ESTADO COMPLETO (Sincronismo Rápido)
CREATE TABLE sge_state (
    id INT PRIMARY KEY,
    content LONGTEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. ESTRUTURA RELACIONAL (Para queries complexas se necessário)
CREATE TABLE employees (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    registration VARCHAR(50),
    role VARCHAR(100),
    username VARCHAR(100) UNIQUE,
    email VARCHAR(150),
    active BOOLEAN DEFAULT TRUE
);

CREATE TABLE class_groups (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type ENUM('Técnico', 'Qualificação'),
    course_group VARCHAR(100),
    start_date DATE,
    end_date DATE
);
  `.trim();

  const syncToMySQL = async () => {
    if (!sqlConfig.endpoint) {
      setSqlStatus({ type: 'error', msg: 'Endpoint da API MySQL não configurado.' });
      return;
    }
    setSqlSyncing(true);
    setSqlStatus({ type: 'idle', msg: 'Transmitindo pacotes para o Hostinger...' });
    try {
      const res = await fetch(sqlConfig.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Key': sqlConfig.apiKey },
        body: JSON.stringify({ action: 'PUSH', database: sqlConfig.dbName, payload: appState })
      });
      if (res.ok) {
          setSqlStatus({ type: 'success', msg: 'Base de dados Hostinger/MySQL atualizada!' });
          localStorage.setItem('sge_last_mysql_sync', new Date().toISOString());
      } else throw new Error('Falha na autenticação ou conexão com o servidor PHP.');
    } catch (e: any) {
      setSqlStatus({ type: 'error', msg: e.message });
    } finally {
      setSqlSyncing(false);
    }
  };

  const pullFromMySQL = async () => {
    if (!sqlConfig.endpoint) {
        setSqlStatus({ type: 'error', msg: 'Endpoint ausente.' });
        return;
    }
    setSqlPulling(true);
    setSqlStatus({ type: 'idle', msg: 'Recuperando dados do MySQL...' });
    try {
        const res = await fetch(sqlConfig.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': sqlConfig.apiKey },
            body: JSON.stringify({ action: 'PULL', database: sqlConfig.dbName })
        });
        if (res.ok) {
            const data = await res.json();
            if (data.error) throw new Error(data.error);
            if (onImportState) {
                onImportState(data);
                setSqlStatus({ type: 'success', msg: 'Estado do sistema restaurado do MySQL.' });
            }
        } else throw new Error('Falha ao obter dados do banco.');
    } catch (e: any) {
        setSqlStatus({ type: 'error', msg: e.message });
    } finally {
        setSqlPulling(false);
    }
  };

  const handleGlobalAction = (allow: boolean) => {
    setPermissions(prev => {
      const newModules = { ...prev[selectedRole].modules };
      Object.keys(newModules).forEach(modKey => {
        const key = modKey as keyof GroupPermission['modules'];
        newModules[key] = { visualize: allow, list: allow, add: allow, edit: allow, reports: allow };
      });
      return { ...prev, [selectedRole]: { ...prev[selectedRole], modules: newModules } };
    });
  };

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
      const headers = { 'Authorization': `token ${ghConfig.token}`, 'Accept': 'application/vnd.github.v3+json' };
      let sha: string | undefined;
      try {
        const res = await fetch(`${baseUrl}?ref=${ghConfig.branch}`, { headers });
        if (res.ok) { const data = await res.json(); sha = data.sha; }
      } catch (e) {}
      const content = utf8_to_b64(JSON.stringify(appState, null, 2));
      const payload = { message: `SGE Sync: ${new Date().toLocaleString()}`, content, sha, branch: ghConfig.branch };
      const updateRes = await fetch(baseUrl, { method: 'PUT', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (updateRes.ok) {
        setSyncStatus({ type: 'success', msg: 'Dados salvos no GitHub!' });
        localStorage.setItem('sge_last_sync', new Date().toISOString());
      } else throw new Error('Erro ao atualizar repositório.');
    } catch (err: any) { setSyncStatus({ type: 'error', msg: `Falha: ${err.message}` }); }
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

  const ModuleCard = ({ title, icon, moduleKey, glowColor }: { title: string; icon: React.ReactNode; moduleKey: keyof GroupPermission['modules']; glowColor: 'cyan' | 'purple' | 'orange' | 'blue'; }) => {
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
            Painel de Kernel
          </h1>
        </div>

        <div className="flex bg-slate-950/80 p-1 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md">
            <button onClick={() => setActiveConfigTab('PERMISSIONS')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'PERMISSIONS' ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-500 hover:text-white'}`}>Permissões</button>
            <button onClick={() => setActiveConfigTab('GITHUB')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'GITHUB' ? 'bg-purple-600 text-white shadow-neon-purple' : 'text-slate-500 hover:text-white'}`}>GitHub</button>
            <button onClick={() => setActiveConfigTab('MYSQL')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeConfigTab === 'MYSQL' ? 'bg-orange-600 text-white shadow-neon-orange' : 'text-slate-500 hover:text-white'}`}>MySQL/API</button>
        </div>
      </div>

      {activeConfigTab === 'PERMISSIONS' && (
        <div className="space-y-10 animate-in slide-in-from-left-4 duration-500">
            <div className="bg-sci-panel/60 border border-white/10 rounded-2xl p-8 backdrop-blur-xl shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-8 relative overflow-hidden">
                <div className="flex items-center gap-4 bg-slate-950/80 p-2 rounded-xl border border-white/10">
                    {ROLES.map(role => (
                        <button key={role.id} onClick={() => setSelectedRole(role.id)} className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedRole === role.id ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'text-slate-500 hover:text-slate-300'}`}>{role.label}</button>
                    ))}
                </div>
                <div className="flex flex-wrap gap-4">
                    <button onClick={() => handleGlobalAction(true)} className="flex items-center gap-3 px-6 py-3 bg-emerald-600/20 text-emerald-400 border border-emerald-500/40 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"><Unlock size={18} /> Liberar</button>
                    <button onClick={() => handleGlobalAction(false)} className="flex items-center gap-3 px-6 py-3 bg-red-600/20 text-red-400 border border-red-500/40 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"><Lock size={18} /> Bloquear</button>
                    <button onClick={() => onSave(permissions)} className="flex items-center gap-3 px-10 py-3 bg-cyan-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-neon-cyan active:scale-95 transition-all"><Save size={18} /> Salvar</button>
                </div>
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
            <NeonCard glowColor="purple" title="Nuvem: Repositório Git" icon={<Github size={18} className="text-purple-400" />}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-6">
                        <div className="bg-purple-500/5 p-4 rounded-xl border border-purple-500/20"><p className="text-xs text-slate-400 leading-relaxed italic">Sincronize sua base de dados JSON diretamente com o GitHub para backup e persistência em tempo real.</p></div>
                        <div className="space-y-4">
                            <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-purple-400 font-black">Personal Access Token (PAT)</label><div className="relative"><input type={showToken ? "text" : "password"} className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 pl-4 pr-12 text-sm text-white font-mono placeholder:text-slate-700" value={ghConfig.token} onChange={e => setGhConfig({...ghConfig, token: e.target.value})} placeholder="ghp_seu_token_aqui" /><button onClick={() => setShowToken(!showToken)} className="absolute right-4 top-3.5 text-slate-500 hover:text-white">{showToken ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">Repositório</label><input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white" value={ghConfig.repo} onChange={e => setGhConfig({...ghConfig, repo: e.target.value})} placeholder="ex: senai/sge-db" /></div>
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">Branch</label><input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white" value={ghConfig.branch} onChange={e => setGhConfig({...ghConfig, branch: e.target.value})} /></div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className={`p-6 rounded-2xl border ${syncStatus.type === 'error' ? 'bg-red-500/5 border-red-500/20' : 'bg-slate-950 border-white/5'}`}>
                            <div className="flex items-center gap-4"><div className="p-3 bg-slate-900 rounded-xl"><Cloud size={24} className="text-purple-400" /></div><div><p className="text-[10px] font-mono text-slate-500 uppercase font-black">Estado Nuvem</p><p className="text-sm font-bold text-slate-300">{syncStatus.msg || 'Pronto para Sincronizar'}</p></div></div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => {}} className="py-4 bg-slate-800 text-white rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/10 active:scale-95"><DownloadCloud size={16} className="mx-auto" /> Pull</button>
                            <button onClick={syncToGitHub} disabled={syncing} className="py-4 bg-purple-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-neon-purple active:scale-95">{syncing ? <Loader2 className="animate-spin mx-auto" size={16}/> : <><CloudUpload size={16} className="mx-auto" /> Push</>}</button>
                        </div>
                    </div>
                </div>
            </NeonCard>
        </div>
      )}

      {activeConfigTab === 'MYSQL' && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
            <NeonCard glowColor="orange" title="Engine de Dados: MySQL / Hostinger" icon={<DBIcon size={18} className="text-orange-400" />}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/20">
                            <p className="text-xs text-slate-400 leading-relaxed">Conecte o S.G.E Rios ao seu servidor na **Hostinger**. Use o script `sge_bridge.php` no seu servidor para processar as requisições.</p>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-orange-400 font-black">URL do Script Bridge (PHP)</label><div className="relative"><Globe size={16} className="absolute left-4 top-3.5 text-slate-600" /><input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white font-mono" value={sqlConfig.endpoint} onChange={e => setSqlConfig({...sqlConfig, endpoint: e.target.value})} placeholder="https://seu-site.com.br/sge_bridge.php" /></div></div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">DB Hostinger</label><input type="text" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white" value={sqlConfig.dbName} onChange={e => setSqlConfig({...sqlConfig, dbName: e.target.value})} /></div>
                                <div className="space-y-2"><label className="text-[10px] font-mono uppercase text-slate-500 font-black">Chave API (Bridge)</label><input type="password" className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 px-4 text-xs text-white" value={sqlConfig.apiKey} onChange={e => setSqlConfig({...sqlConfig, apiKey: e.target.value})} placeholder="••••••••" /></div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <button onClick={pullFromMySQL} disabled={sqlPulling || sqlSyncing} className="py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest border border-white/10 transition-all flex items-center justify-center gap-3">
                                {sqlPulling ? <Loader2 className="animate-spin" size={18}/> : <HardDriveDownload size={18}/>}
                                Importar do MySQL
                            </button>
                            <button onClick={syncToMySQL} disabled={sqlSyncing || sqlPulling} className="py-4 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-neon-orange transition-all flex items-center justify-center gap-3">
                                {sqlSyncing ? <Loader2 className="animate-spin" size={18}/> : <Zap size={18}/>}
                                Salvar no MySQL
                            </button>
                        </div>
                        {sqlStatus.msg && (
                            <div className={`p-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 ${sqlStatus.type === 'error' ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                <Info size={14}/> {sqlStatus.msg}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between"><div className="flex items-center gap-2"><Code size={16} className="text-cyan-400"/><h4 className="text-[10px] font-mono font-black text-slate-400 uppercase">Schema MySQL Sugerido</h4></div><button onClick={() => navigator.clipboard.writeText(sqlSchema)} className="p-2 bg-slate-900 border border-white/10 rounded-lg text-slate-400 hover:text-white"><Copy size={14}/></button></div>
                        <div className="relative">
                            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500/50"></div>
                            <pre className="bg-slate-950 p-5 rounded-xl border border-white/5 text-[10px] font-mono text-cyan-500/80 overflow-x-auto max-h-[350px] scrollbar-hide">
                                {sqlSchema}
                            </pre>
                        </div>
                    </div>
                </div>
            </NeonCard>
        </div>
      )}

      <div className="flex items-start gap-6 p-8 bg-slate-950/80 border border-white/10 rounded-2xl shadow-2xl relative group overflow-hidden">
         <div className="absolute top-0 left-0 w-2 h-full bg-cyan-500 group-hover:shadow-neon-cyan transition-all"></div>
         <Info className="text-cyan-400 shrink-0 w-6 h-6" />
         <div>
            <h4 className="text-base font-black text-white uppercase tracking-widest mb-2">Segurança de Dados Relacionais</h4>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              O módulo MySQL opera através de uma API Bridge. Certifique-se que o seu script PHP trate adequadamente as permissões de acesso e evite SQL Injection ao gravar os metadados. Recomendamos o uso de SSL/HTTPS no seu domínio da Hostinger.
            </p>
         </div>
      </div>
    </div>
  );
};

export default SystemPanel;
