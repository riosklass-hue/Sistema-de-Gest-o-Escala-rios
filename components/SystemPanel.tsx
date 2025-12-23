
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
  Loader2
} from 'lucide-react';
import NeonCard from './NeonCard';
import { GroupPermission, UserRole, ModulePermission } from '../types';

const ROLES: { id: UserRole; label: string }[] = [
  { id: 'ADMIN', label: 'Administradores' },
  { id: 'COORDINATOR', label: 'Coordenadores' },
  { id: 'SUPERVISOR', label: 'Supervisores' },
  { id: 'TEACHER', label: 'Professores' },
];

interface SystemPanelProps {
  initialPermissions: Record<UserRole, GroupPermission>;
  onSave: (permissions: Record<UserRole, GroupPermission>) => void;
}

const SystemPanel: React.FC<SystemPanelProps> = ({ initialPermissions, onSave }) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>('TEACHER');
  const [permissions, setPermissions] = useState<Record<UserRole, GroupPermission>>(initialPermissions);
  const [mode, setMode] = useState<'BASIC' | 'ADVANCED'>('BASIC');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setPermissions(initialPermissions);
  }, [initialPermissions]);

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
    // Simulate complex persistence logic for sci-fi feel
    await new Promise(resolve => setTimeout(resolve, 1500));
    onSave(permissions);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-12">
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
        {/* Visual decoration for sci-fi feel */}
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
