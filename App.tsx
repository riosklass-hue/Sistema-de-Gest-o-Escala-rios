
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ShiftCalendar from './components/ShiftCalendar';
import StatsPanel from './components/StatsPanel';
import ReportsPanel from './components/ReportsPanel';
import SecurityPanel from './components/SecurityPanel';
import LoginScreen from './components/LoginScreen';
import RegistrationPanel from './components/RegistrationPanel';
import SystemPanel from './components/SystemPanel';
import { INITIAL_EMPLOYEES } from './constants';
import { 
  Menu, Bell, Search, Hexagon, LogOut, Activity, 
  UserPlus, CalendarRange, Database, Shield, Zap, X, 
  Minus, Plus, Cpu, Globe, Wifi, Command, Terminal, HardDrive
} from 'lucide-react';
import NeonCard from './components/NeonCard';
import { User, Employee, Schedule, ShiftType, SystemLog, GroupPermission, UserRole, ClassGroup, CourseGroup, FinancialRecord } from './types';

const INITIAL_PERMISSIONS: Record<UserRole, GroupPermission> = {
  ADMIN: {
    role: 'ADMIN',
    modules: {
      dashboard: { visualize: true, list: true, add: true, edit: true, reports: true },
      cadastro: { visualize: true, list: true, add: true, edit: true, reports: true },
      escalas: { visualize: true, list: true, add: true, edit: true, reports: true },
      relatorios: { visualize: true, list: true, add: true, edit: true, reports: true },
      seguranca: { visualize: true, list: true, add: true, edit: true, reports: true },
    }
  },
  COORDINATOR: {
    role: 'COORDINATOR',
    modules: {
      dashboard: { visualize: true, list: true, add: false, edit: false, reports: true },
      cadastro: { visualize: true, list: true, add: true, edit: true, reports: true },
      escalas: { visualize: true, list: true, add: true, edit: true, reports: true },
      relatorios: { visualize: true, list: true, add: false, edit: false, reports: true },
      seguranca: { visualize: false, list: false, add: false, edit: false, reports: false },
    }
  },
  SUPERVISOR: {
    role: 'SUPERVISOR',
    modules: {
      dashboard: { visualize: true, list: true, add: false, edit: false, reports: true },
      cadastro: { visualize: true, list: true, add: false, edit: false, reports: false },
      escalas: { visualize: true, list: true, add: true, edit: true, reports: true },
      relatorios: { visualize: true, list: true, add: false, edit: false, reports: true },
      seguranca: { visualize: false, list: false, add: false, edit: false, reports: false },
    }
  },
  TEACHER: {
    role: 'TEACHER',
    modules: {
      dashboard: { visualize: true, list: false, add: false, edit: false, reports: false },
      cadastro: { visualize: false, list: false, add: false, edit: false, reports: false },
      escalas: { visualize: true, list: true, add: false, edit: false, reports: false },
      relatorios: { visualize: true, list: false, add: false, edit: false, reports: false },
      seguranca: { visualize: false, list: false, add: false, edit: false, reports: false },
    }
  }
};

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Escalas');
  const [insight, setInsight] = useState<string>('');
  const [zoomLevel, setZoomLevel] = useState(90); 
  const [systemUptime, setSystemUptime] = useState(0);
  
  const [viewedDate, setViewedDate] = useState(new Date());
  const [hourlyRate, setHourlyRate] = useState(32.00);
  
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [courseGroups, setCourseGroups] = useState<CourseGroup[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>([
    "Eletrotécnica", "Mecânica", "Automação", "Informática", 
    "Segurança do Trabalho", "Energias Renováveis", "Gestão Industrial", 
    "Desenho Técnico", "Logística", "Eletrônica", "Instrumentação", "Manutenção Industrial"
  ]);
  const [schools, setSchools] = useState<string[]>([
    "Unidade Central - Rios", "Campus Industrial", "Polo Porto Velho", "Unidade Zona Leste"
  ]);
  const [globalSchedules, setGlobalSchedules] = useState<Schedule[]>([]);
  const [permissions, setPermissions] = useState<Record<UserRole, GroupPermission>>(INITIAL_PERMISSIONS);
  const [importedFinancialRecords, setImportedFinancialRecords] = useState<Record<string, FinancialRecord[]>>({});

  const [logs, setLogs] = useState<SystemLog[]>([
    { id: 'l1', user: 'system', description: 'Kernel SGE v2.5 Online', module: 'CORE', action: 'BOOT', ip: '127.0.0.1', entryTime: new Date().toLocaleString(), active: false },
  ]);

  const activeEmployees = employees.filter(emp => emp.active);

  const [globalDeductions, setGlobalDeductions] = useState<any>({
    '40H': { ir: 0, inss: 0, unimed: 0 },
    '20H': { ir: 0, inss: 0, unimed: 0 }
  });

  useEffect(() => {
    const timer = setInterval(() => setSystemUptime(u => u + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const addLog = useCallback((user: string, action: string, module: string, description: string) => {
    const newLog: SystemLog = {
      id: `log-${Date.now()}`,
      user, action, module, description,
      ip: `192.168.1.${Math.floor(Math.random() * 254) + 1}`,
      entryTime: new Date().toLocaleString('pt-BR'),
      active: action === 'LOGIN'
    };
    setLogs(prev => [newLog, ...prev]);
  }, []);

  const handleImportState = useCallback((state: any) => {
    if (!state) return;
    if (state.employees) setEmployees(state.employees);
    if (state.globalSchedules) setGlobalSchedules(state.globalSchedules);
    if (state.permissions) setPermissions(state.permissions);
    if (state.classes) setClasses(state.classes);
    if (state.courseGroups) setCourseGroups(state.courseGroups);
    if (state.availableCourses) setAvailableCourses(state.availableCourses);
    if (state.schools) setSchools(state.schools);
    if (state.globalDeductions) setGlobalDeductions(state.globalDeductions);
    if (state.hourlyRate) setHourlyRate(state.hourlyRate);
    if (state.importedFinancialRecords) setImportedFinancialRecords(state.importedFinancialRecords);
    addLog('system', 'PULL', 'CLOUD', 'Sincronização de dados efetuada.');
  }, [addLog]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    addLog(user.username, 'LOGIN', 'AUTH', 'Sessão iniciada com sucesso.');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    if (currentUser) addLog(currentUser.username, 'LOGOUT', 'AUTH', 'Sessão encerrada.');
    setCurrentUser(null);
    setActiveTab('Escalas');
  };

  const handleSavePermissions = (newPermissions: Record<UserRole, GroupPermission>) => {
    setPermissions(newPermissions);
    addLog(currentUser?.username || 'admin', 'PERM_UPDATE', 'SYSTEM', 'Protocolos de acesso atualizados.');
  };

  const adjustZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(Math.max(prev + delta, 60), 120));
  };

  useEffect(() => {
    if (!currentUser) return;
    const monthName = viewedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    setInsight(activeTab === 'Sistema' ? 'Configuração de Kernel Detectada.' : `Painel Rios: Monitorando ${monthName}.`);
  }, [activeTab, currentUser, viewedDate]);

  const handleRegisterEmployee = async (newEmployee: Employee) => {
    setEmployees(prev => [...prev, newEmployee]);
    addLog(currentUser?.username || 'admin', 'CREATE', 'RECORD', `Novo colaborador ${newEmployee.name} registrado.`);
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee, newPassword?: string) => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
    addLog(currentUser?.username || 'admin', 'UPDATE', 'RECORD', `Dados de ${updatedEmployee.name} atualizados.`);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
    addLog(currentUser?.username || 'admin', 'DELETE', 'RECORD', `Registro ID ${id} removido.`);
  };

  const menuItems = useMemo(() => {
    if (!currentUser) return [];
    const rolePerms = permissions[currentUser.role].modules;
    return [
      { label: 'Dashboard', icon: <Activity className="w-5 h-5" />, visible: rolePerms.dashboard.visualize },
      { label: 'Cadastro', icon: <UserPlus className="w-5 h-5" />, visible: rolePerms.cadastro.visualize },
      { label: 'Escalas', icon: <CalendarRange className="w-5 h-5" />, visible: rolePerms.escalas.visualize },
      { label: 'Relatórios', icon: <Database className="w-5 h-5" />, visible: rolePerms.relatorios.visualize },
      { label: 'Segurança', icon: <Shield className="w-5 h-5" />, visible: rolePerms.seguranca.visualize },
      { label: 'Sistema', icon: <Zap className="w-5 h-5" />, visible: currentUser.role === 'ADMIN' },
    ].filter(item => item.visible);
  }, [currentUser, permissions]);

  const fullAppState = useMemo(() => ({
    employees,
    globalSchedules,
    permissions,
    classes,
    courseGroups,
    availableCourses,
    schools,
    globalDeductions,
    hourlyRate,
    importedFinancialRecords,
    lastUpdated: new Date().toISOString()
  }), [employees, globalSchedules, permissions, classes, courseGroups, availableCourses, schools, globalDeductions, hourlyRate, importedFinancialRecords]);

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  const filterEmployeeId = currentUser.role === 'TEACHER' ? currentUser.employeeId : null;
  const dashboardEmployees = filterEmployeeId ? activeEmployees.filter(e => e.id === filterEmployeeId) : activeEmployees;
  const dashboardSchedules = filterEmployeeId ? globalSchedules.filter(s => s.employeeId === filterEmployeeId) : globalSchedules;

  const currentRolePermissions = permissions[currentUser.role].modules;

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-neon-cyan/20 bg-sci-bg">
      
      <div className="relative z-10 flex h-screen overflow-hidden">
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden transition-opacity duration-500"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed md:relative z-[100] h-full
          ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 md:w-24'} 
          bg-slate-950/80 backdrop-blur-3xl border-r border-white/5 
          transition-all duration-500 flex flex-col justify-between shadow-2xl
        `}>
          <div>
            <div className="h-24 flex items-center justify-between px-8 border-b border-white/5">
              <div className="flex items-center">
                <div className="relative">
                  <Hexagon className="text-neon-cyan w-10 h-10 animate-pulse" />
                  <div className="absolute inset-0 bg-neon-cyan/20 blur-xl"></div>
                </div>
                {(isSidebarOpen || window.innerWidth < 768) && (
                  <div className="ml-4">
                    <span className="font-mono font-black text-xl tracking-[0.2em] text-white">RIOS</span>
                    <p className="text-[8px] font-mono text-neon-cyan uppercase tracking-widest font-black">SYSTEM v2.5</p>
                  </div>
                )}
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-500 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <nav className="p-4 space-y-3">
              {menuItems.map((item, idx) => (
                <button 
                  key={idx} 
                  onClick={() => {
                    setActiveTab(item.label);
                    if (window.innerWidth < 768) setIsSidebarOpen(false);
                  }} 
                  className={`
                    w-full flex items-center p-4 rounded-2xl transition-all duration-500 group relative
                    ${activeTab === item.label ? 'bg-cyan-600 text-white shadow-neon-cyan' : 'hover:bg-white/5 text-slate-500 hover:text-white'}
                  `}
                >
                  <div className={`${activeTab === item.label ? 'text-white' : 'group-hover:text-neon-cyan'} transition-all`}>
                    {item.icon}
                  </div>
                  {(isSidebarOpen || window.innerWidth < 768) && (
                    <span className="ml-4 font-bold text-xs uppercase tracking-[0.1em] font-mono">{item.label}</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-4 border-t border-white/5">
            {(isSidebarOpen || window.innerWidth < 768) && (
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-neon-cyan/50 transition-all">
                <div className="overflow-hidden flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neon-cyan/10 border border-neon-cyan/20 flex items-center justify-center shrink-0">
                      <Terminal size={14} className="text-neon-cyan" />
                    </div>
                    <div className="truncate">
                        <p className="text-[8px] font-mono text-slate-600 mb-0.5 uppercase font-black">Operador</p>
                        <span className="text-[10px] text-slate-200 font-mono truncate font-black uppercase tracking-wider">{currentUser.username}</span>
                    </div>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 transition-all">
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-24 bg-slate-950/60 backdrop-blur-2xl border-b border-white/5 flex items-center justify-between px-8 md:px-12">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className={`p-3 text-slate-300 hover:text-white md:hidden border border-white/10 rounded-2xl bg-slate-900/40 backdrop-blur-md ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 transition-opacity'}`}
              >
                <Menu size={24} />
              </button>
              
              <div className="hidden lg:flex items-center gap-8 bg-slate-900/60 px-6 py-2.5 rounded-2xl border border-white/5 backdrop-blur-md shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-black mb-0.5">Sessão</span>
                    <span className="text-[10px] font-mono text-neon-cyan font-black">{Math.floor(systemUptime / 3600).toString().padStart(2, '0')}:{Math.floor((systemUptime % 3600) / 60).toString().padStart(2, '0')}:{(systemUptime % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <div className="h-6 w-px bg-white/5"></div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-black mb-0.5">Persistência</span>
                    <div className="flex items-center gap-2">
                        <HardDrive size={10} className="text-orange-400" />
                        <span className="text-[9px] font-mono text-orange-400 font-black uppercase">Volátil</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                      <button onClick={() => adjustZoom(-5)} title="Zoom Out" className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 transition-all"><Minus size={14} /></button>
                      <button onClick={() => adjustZoom(5)} title="Zoom In" className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 transition-all"><Plus size={14} /></button>
                  </div>
              </div>
            </div>
            
            <div className="hidden xl:block overflow-hidden w-full max-w-md relative h-8 mx-8 bg-slate-950/60 rounded-full border border-white/5 px-4 shadow-inner">
                <p className="absolute w-full text-[10px] font-mono text-slate-400/90 whitespace-nowrap animate-marquee font-bold py-2 tracking-widest uppercase flex items-center gap-4">
                  <Wifi size={12} className="text-neon-cyan" /> {insight} <Globe size={12} className="text-neon-purple" /> STATUS: LOCAL-RAM <Cpu size={12} className="text-slate-600" /> v2.5
                </p>
            </div>

            <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-black text-white tracking-tight font-mono uppercase">{currentUser.name}</p>
                    <div className="flex items-center justify-end gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                      <p className="text-[10px] text-slate-500 uppercase tracking-[0.1em] font-mono font-black">{currentUser.role}</p>
                    </div>
                </div>
                <div className="relative group cursor-pointer">
                  <div className="absolute inset-0 bg-neon-cyan/20 blur-xl rounded-full group-hover:bg-neon-cyan/40 transition-all"></div>
                  <div className="relative w-12 h-12 rounded-2xl bg-slate-800 p-0.5 border border-white/10 shadow-2xl transition-all duration-700 backdrop-blur-md">
                      <img src={`https://ui-avatars.com/api/?name=${currentUser.name}&background=1e293b&color=00f3ff&bold=true`} alt="User" className="rounded-xl w-full h-full object-cover" />
                  </div>
                </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-12">
            <div className="max-w-full mx-auto" style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}>
               {activeTab === 'Dashboard' && currentRolePermissions.dashboard.visualize && (
                  <StatsPanel 
                    isAdmin={currentUser.role === 'ADMIN'}
                    employees={dashboardEmployees} schedules={dashboardSchedules}
                    selectedDate={viewedDate} onDateChange={setViewedDate}
                    hourlyRate={hourlyRate} deductions={globalDeductions}
                  />
               )}

               {activeTab === 'Cadastro' && currentRolePermissions.cadastro.visualize && (
                  <RegistrationPanel 
                    onRegisterEmployee={handleRegisterEmployee} onUpdateEmployee={handleUpdateEmployee} onDeleteEmployee={handleDeleteEmployee} 
                    employees={employees} availableCourses={availableCourses} onUpdateCourses={setAvailableCourses} 
                    schools={schools} onUpdateSchools={setSchools}
                    classes={classes} onUpdateClasses={setClasses}
                    courseGroups={courseGroups} onUpdateCourseGroups={setCourseGroups}
                    permission={currentRolePermissions.cadastro} 
                  />
               )}

               {activeTab === 'Escalas' && currentRolePermissions.escalas.visualize && (
                  <ShiftCalendar 
                    filterEmployeeId={filterEmployeeId} employees={activeEmployees} currentSchedules={globalSchedules} onSave={setGlobalSchedules}
                    deductions={globalDeductions} externalDate={viewedDate} onDateChange={setViewedDate}
                    hourlyRate={hourlyRate} onHourlyRateChange={setHourlyRate} availableCourses={availableCourses} 
                    schools={schools}
                    classes={classes}
                    permission={currentRolePermissions.escalas}
                    isAdmin={currentUser.role === 'ADMIN' || currentUser.role === 'COORDINATOR'}
                  />
               )}

               {activeTab === 'Relatórios' && currentRolePermissions.relatorios.visualize && (
                  <ReportsPanel 
                    filterEmployeeId={filterEmployeeId} 
                    employees={activeEmployees} 
                    schedules={globalSchedules} 
                    initialDeductions={globalDeductions} 
                    onSaveDeductions={setGlobalDeductions} 
                    hourlyRate={hourlyRate} 
                    selectedDate={viewedDate}
                    classes={classes}
                    courseGroups={courseGroups}
                    importedRecords={importedFinancialRecords}
                    onSaveImportedRecords={(empId, records) => setImportedFinancialRecords(prev => ({...prev, [empId]: records}))}
                  />
               )}

               {activeTab === 'Segurança' && currentRolePermissions.seguranca.visualize && <SecurityPanel logs={logs} />}

               {activeTab === 'Sistema' && currentUser.role === 'ADMIN' && (
                 <SystemPanel 
                   initialPermissions={permissions} 
                   onSave={handleSavePermissions} 
                   appState={fullAppState}
                   onImportState={handleImportState}
                 />
               )}
            </div>
          </div>
          
          <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-white/10 rounded-tl-3xl pointer-events-none"></div>
          <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-white/10 rounded-tr-3xl pointer-events-none"></div>
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-white/10 rounded-bl-3xl pointer-events-none"></div>
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-white/10 rounded-br-3xl pointer-events-none"></div>
        </main>
      </div>
    </div>
  );
};

export default App;
