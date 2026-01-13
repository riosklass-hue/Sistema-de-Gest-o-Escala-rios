
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
  Minus, Plus, Cpu, Globe, Wifi, Command, Terminal
} from 'lucide-react';
import NeonCard from './components/NeonCard';
import { User, Employee, Schedule, ShiftType, SystemLog, GroupPermission, UserRole, ClassGroup, CourseGroup } from './types';
import { syncUserRecord } from './services/authService';

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
  const [zoomLevel, setZoomLevel] = useState(80); 
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
  
  const [logs, setLogs] = useState<SystemLog[]>([
    { id: 'l1', user: 'system', description: 'Kernel SGE v2.5 Online', module: 'CORE', action: 'BOOT', ip: '127.0.0.1', entryTime: new Date().toLocaleString(), active: false },
  ]);

  const activeEmployees = employees.filter(emp => emp.active);

  const [globalDeductions, setGlobalDeductions] = useState<any>({
    '40H': { ir: 0, inss: 0, unimed: 0 },
    '20H': { ir: 0, inss: 0, unimed: 0 }
  });

  // System Uptime Counter
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
    addLog('system', 'PULL', 'CLOUD', 'Data synchronized from central node');
  }, [addLog]);

  useEffect(() => {
    const autoPull = async () => {
      const mysqlEndpoint = localStorage.getItem('sge_mysql_endpoint');
      const mysqlKey = localStorage.getItem('sge_mysql_key');
      if (mysqlEndpoint && mysqlKey) {
          try {
              const res = await fetch(mysqlEndpoint, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-API-Key': mysqlKey },
                  body: JSON.stringify({ action: 'PULL' })
              });
              if (res.ok) {
                  const data = await res.json();
                  if (!data.error) {
                      handleImportState(data);
                      return;
                  }
              }
          } catch (e) { console.debug("Auto-mysql fail:", e); }
      }
    };
    autoPull();
  }, [handleImportState]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    addLog(user.username, 'LOGIN', 'AUTH', 'Secure authentication established');
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const handleLogout = () => {
    if (currentUser) addLog(currentUser.username, 'LOGOUT', 'AUTH', 'Session terminated');
    setCurrentUser(null);
    setActiveTab('Escalas');
  };

  const handleSavePermissions = (newPermissions: Record<UserRole, GroupPermission>) => {
    setPermissions(newPermissions);
    if (currentUser) addLog(currentUser.username, 'PERM_UPDATE', 'SYSTEM', 'Global access protocols updated');
  };

  const adjustZoom = (delta: number) => {
    setZoomLevel(prev => Math.min(Math.max(prev + delta, 50), 150));
  };

  const resetZoom = () => {
    setZoomLevel(80); 
  };

  useEffect(() => {
    if (!currentUser) return;
    const monthName = viewedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    setInsight(activeTab === 'Sistema' ? 'Accessing Kernel Configuration Mode.' : `S.G.E. Command Center: Active Monitoring of ${monthName}.`);
  }, [activeTab, currentUser, viewedDate]);

  const handleRegisterEmployee = async (newEmployee: Employee) => {
    setEmployees(prev => [...prev, newEmployee]);
    if (newEmployee.username) {
        await syncUserRecord(newEmployee.username, {
            name: newEmployee.name,
            role: newEmployee.userRole || 'TEACHER'
        });
    }
    if (currentUser) addLog(currentUser.username, 'CREATE', 'RECORD', `New operative ${newEmployee.name} registered`);
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee, newPassword?: string) => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
    if (updatedEmployee.username) {
      await syncUserRecord(updatedEmployee.username, {
          name: updatedEmployee.name,
          role: updatedEmployee.userRole || 'TEACHER',
          password: newPassword
      });
      if (currentUser && currentUser.username === updatedEmployee.username) {
        setCurrentUser({ ...currentUser, name: updatedEmployee.name, role: updatedEmployee.userRole || 'TEACHER' });
      }
    }
    if (currentUser) addLog(currentUser.username, 'UPDATE', 'RECORD', `Metadata updated for node: ${updatedEmployee.name}`);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
    if (currentUser) addLog(currentUser.username, 'DELETE', 'RECORD', `Operative node ID ${id} purged from system`);
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
    lastUpdated: new Date().toISOString()
  }), [employees, globalSchedules, permissions, classes, courseGroups, availableCourses, schools, globalDeductions, hourlyRate]);

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  const filterEmployeeId = currentUser.role === 'TEACHER' ? currentUser.employeeId : null;
  const dashboardEmployees = filterEmployeeId ? activeEmployees.filter(e => e.id === filterEmployeeId) : activeEmployees;
  const dashboardSchedules = filterEmployeeId ? globalSchedules.filter(s => s.employeeId === filterEmployeeId) : globalSchedules;

  const currentRolePermissions = permissions[currentUser.role].modules;

  return (
    <div className="min-h-screen bg-sci-bg text-slate-200 font-sans selection:bg-cyan-500/30">
      {/* Dynamic Background Effects */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-grid-pulse">
        <div className="absolute top-[-15%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/10 rounded-full blur-[150px]"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[150px]"></div>
        
        {/* Futuristic Scanning Overlays */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      </div>

      <div className="relative z-10 flex h-screen overflow-hidden">
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-[90] md:hidden transition-opacity duration-500"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <aside className={`
          fixed md:relative z-[100] h-full
          ${isSidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0 md:w-20'} 
          bg-[#0f172a]/95 md:bg-[#0f172a]/80 backdrop-blur-2xl border-r border-white/5 
          transition-all duration-500 flex flex-col justify-between
        `}>
          <div>
            <div className="h-24 flex items-center justify-between px-8 border-b border-white/5 bg-white/[0.01]">
              <div className="flex items-center">
                <div className="relative">
                  <Hexagon className="text-cyan-400 w-10 h-10 animate-spin-slow" />
                  <div className="absolute inset-0 bg-cyan-500/20 blur-xl animate-pulse"></div>
                </div>
                {(isSidebarOpen || window.innerWidth < 768) && (
                  <div className="ml-4">
                    <span className="font-mono font-black text-xl tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">RIOS</span>
                    <p className="text-[8px] font-mono text-cyan-500/60 uppercase tracking-widest font-black">COMMAND CENTER v2.5</p>
                  </div>
                )}
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)} 
                className="md:hidden p-2 text-slate-400 hover:text-white"
              >
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
                    w-full flex items-center p-4 rounded-xl transition-all duration-300 group relative
                    ${activeTab === item.label ? 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 shadow-neon-cyan/5' : 'hover:bg-white/[0.03] text-slate-500 hover:text-slate-300'}
                  `}
                >
                  <div className={`${activeTab === item.label ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(0,243,255,0.6)]' : 'group-hover:text-slate-300'} transition-all`}>
                    {item.icon}
                  </div>
                  {(isSidebarOpen || window.innerWidth < 768) && (
                    <span className="ml-4 font-bold text-xs uppercase tracking-[0.15em] font-mono">{item.label}</span>
                  )}
                  {activeTab === item.label && (
                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-neon-cyan"></div>
                  )}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="p-4 border-t border-white/5 bg-white/[0.01]">
            {(isSidebarOpen || window.innerWidth < 768) && (
              <div className="bg-slate-900/60 p-4 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                <div className="overflow-hidden flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0">
                      <Terminal size={14} className="text-cyan-400" />
                    </div>
                    <div className="truncate">
                        <p className="text-[8px] font-mono text-slate-500 mb-0.5 uppercase font-black">Operator ID</p>
                        <span className="text-[10px] text-white font-mono truncate font-black uppercase tracking-wider">{currentUser.username}</span>
                    </div>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 transition-all active:scale-90">
                  <LogOut size={18} />
                </button>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative bg-black/10">
          <header className="h-24 bg-[#0f172a]/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-8 md:px-12">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setIsSidebarOpen(true)} 
                className={`p-3 text-slate-400 hover:text-white md:hidden border border-white/5 rounded-xl bg-white/[0.02] ${isSidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100 transition-opacity'}`}
              >
                <Menu size={24} />
              </button>
              
              {/* HUD DATA ELEMENTS */}
              <div className="hidden lg:flex items-center gap-8 bg-black/40 px-6 py-2.5 rounded-2xl border border-white/5 shadow-2xl">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-black mb-0.5">Uptime</span>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{Math.floor(systemUptime / 3600).toString().padStart(2, '0')}:{Math.floor((systemUptime % 3600) / 60).toString().padStart(2, '0')}:{(systemUptime % 60).toString().padStart(2, '0')}</span>
                  </div>
                  <div className="h-6 w-px bg-white/10"></div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-mono text-slate-500 uppercase font-black mb-0.5">Scale</span>
                    <span className="text-[10px] font-mono text-purple-400 font-bold">{zoomLevel}%</span>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                      <button onClick={() => adjustZoom(-5)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"><Minus size={14} /></button>
                      <button onClick={() => adjustZoom(5)} className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"><Plus size={14} /></button>
                      <button onClick={resetZoom} className="ml-2 p-1.5 text-[8px] font-black font-mono border border-white/10 rounded-lg hover:bg-white/5 transition-all text-slate-500 hover:text-cyan-400">RST</button>
                  </div>
              </div>
            </div>
            
            <div className="hidden xl:block overflow-hidden w-full max-w-md relative h-8 mx-8">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent animate-pulse rounded-full"></div>
                <p className="absolute w-full text-[10px] font-mono text-cyan-400/90 whitespace-nowrap animate-marquee font-bold py-2 tracking-widest uppercase flex items-center gap-4">
                  <Wifi size={12} className="animate-pulse" /> {insight} <Globe size={12} /> SYSTEM STATUS: OPTIMAL <Cpu size={12} /> KERNEL v2.5.0-STABLE
                </p>
            </div>

            <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-black text-white tracking-tight font-mono">{currentUser.name}</p>
                    <div className="flex items-center justify-end gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                      <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-mono font-black">{currentUser.role}</p>
                    </div>
                </div>
                <div className="relative group cursor-pointer">
                  <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-full group-hover:bg-cyan-500/40 transition-all"></div>
                  <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0f172a] to-[#1e293b] p-0.5 border border-white/10 shadow-xl rotate-3 group-hover:rotate-0 transition-all duration-500">
                      <img src={`https://ui-avatars.com/api/?name=${currentUser.name}&background=0f172a&color=00f3ff&bold=true`} alt="User" className="rounded-xl w-full h-full object-cover" />
                  </div>
                </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 md:p-12 scrollbar-thin">
            <div className="max-w-full mx-auto zoom-container" style={{ transform: `scale(${zoomLevel / 100})` }}>
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
          
          {/* Futuristic HUD Frame / Corners */}
          <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-cyan-500/20 rounded-tl-3xl pointer-events-none"></div>
          <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-cyan-500/20 rounded-tr-3xl pointer-events-none"></div>
          <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-cyan-500/20 rounded-bl-3xl pointer-events-none"></div>
          <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-cyan-500/20 rounded-br-3xl pointer-events-none"></div>
        </main>
      </div>
    </div>
  );
};

export default App;
