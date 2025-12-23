
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ShiftCalendar from './components/ShiftCalendar';
import StatsPanel from './components/StatsPanel';
import ReportsPanel from './components/ReportsPanel';
import SecurityPanel from './components/SecurityPanel';
import LoginScreen from './components/LoginScreen';
import RegistrationPanel from './components/RegistrationPanel';
import SystemPanel from './components/SystemPanel';
import { INITIAL_EMPLOYEES } from './constants';
import { Menu, Bell, Search, Hexagon, TriangleAlert, LogOut, Activity, User as UserIcon, Database, Shield, Zap, UserPlus, LayoutDashboard, CalendarRange, FileBarChart, ShieldAlert } from 'lucide-react';
import NeonCard from './components/NeonCard';
import { User, Employee, Schedule, ShiftType, SystemLog, GroupPermission, UserRole } from './types';
import { generateSmartSchedule } from './services/geminiService';
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
  
  const [viewedDate, setViewedDate] = useState(new Date());
  const [hourlyRate, setHourlyRate] = useState(32.00);
  
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
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
    { id: 'l1', user: 'admin', description: 'Sistema inicializado', module: 'NÚCLEO', action: 'STARTUP', ip: '127.0.0.1', entryTime: '20/12/2025 08:00:00', exitTime: '20/12/2025 18:00:00', active: false },
  ]);

  const activeEmployees = employees.filter(emp => emp.active);

  const [globalDeductions, setGlobalDeductions] = useState<any>({
    '40H': { ir: 0, inss: 0, unimed: 0 },
    '20H': { ir: 0, inss: 0, unimed: 0 }
  });

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

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    addLog(user.username, 'LOGIN', 'USUÁRIOS', 'Acesso autorizado ao SGE');
  };

  const handleLogout = () => {
    if (currentUser) addLog(currentUser.username, 'LOGOUT', 'USUÁRIOS', 'Sessão encerrada');
    setCurrentUser(null);
    setActiveTab('Escalas');
  };

  const handleSavePermissions = (newPermissions: Record<UserRole, GroupPermission>) => {
    setPermissions(newPermissions);
    if (currentUser) addLog(currentUser.username, 'PERMISSÕES', 'SISTEMA', 'Vínculos de acesso de grupo atualizados');
  };

  useEffect(() => {
    if (!currentUser) return;
    const monthName = viewedDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    setInsight(activeTab === 'Sistema' ? 'Configurações de Kernel: Gerenciando Vínculos de Acesso.' : `S.G.E. Rios: Monitorando ${monthName}.`);
  }, [activeTab, currentUser, viewedDate]);

  const handleRegisterEmployee = async (newEmployee: Employee) => {
    setEmployees(prev => [...prev, newEmployee]);
    if (newEmployee.username) {
        await syncUserRecord(newEmployee.username, {
            name: newEmployee.name,
            role: newEmployee.userRole || 'TEACHER'
        });
    }
    if (currentUser) addLog(currentUser.username, 'CADASTRO', 'VÍNCULO', `Novo colaborador ${newEmployee.name} vinculado ao SGE`);
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
    if (currentUser) addLog(currentUser.username, 'EDITAR', 'CADASTRO', `Dados e permissões de ${updatedEmployee.name} sincronizados`);
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
    if (currentUser) addLog(currentUser.username, 'REMOVER', 'CADASTRO', `Vínculo de colaborador ID ${id} excluído`);
  };

  const menuItems = useMemo(() => {
    if (!currentUser) return [];
    const rolePerms = permissions[currentUser.role].modules;
    return [
      { label: 'Dashboard', icon: <Activity className="w-6 h-6" />, visible: rolePerms.dashboard.visualize },
      { label: 'Cadastro', icon: <UserPlus className="w-6 h-6" />, visible: rolePerms.cadastro.visualize },
      { label: 'Escalas', icon: <UserIcon className="w-6 h-6" />, visible: rolePerms.escalas.visualize },
      { label: 'Relatórios', icon: <Database className="w-6 h-6" />, visible: rolePerms.relatorios.visualize },
      { label: 'Segurança', icon: <Shield className="w-6 h-6" />, visible: rolePerms.seguranca.visualize },
      { label: 'Sistema', icon: <Zap className="w-6 h-6" />, visible: currentUser.role === 'ADMIN' },
    ].filter(item => item.visible);
  }, [currentUser, permissions]);

  if (!currentUser) return <LoginScreen onLogin={handleLogin} />;

  const filterEmployeeId = currentUser.role === 'TEACHER' ? currentUser.employeeId : null;
  const dashboardEmployees = filterEmployeeId ? activeEmployees.filter(e => e.id === filterEmployeeId) : activeEmployees;
  const dashboardSchedules = filterEmployeeId ? globalSchedules.filter(s => s.employeeId === filterEmployeeId) : globalSchedules;

  const currentRolePermissions = permissions[currentUser.role].modules;

  return (
    <div className="min-h-screen bg-sci-bg text-slate-200 font-sans selection:bg-cyan-500/30">
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative z-10 flex h-screen overflow-hidden">
        <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-sci-panel/90 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex flex-col justify-between hidden md:flex`}>
          <div>
            <div className="h-20 flex items-center justify-center border-b border-white/10">
              <Hexagon className="text-cyan-400 w-10 h-10 animate-spin-slow" />
              {isSidebarOpen && <span className="ml-4 font-mono font-bold text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">RIOS</span>}
            </div>
            <nav className="p-4 space-y-3">
              {menuItems.map((item, idx) => (
                <button key={idx} onClick={() => setActiveTab(item.label)} className={`w-full flex items-center p-4 rounded-xl transition-all group ${activeTab === item.label ? 'bg-gradient-to-r from-cyan-900/50 to-transparent border-l-4 border-cyan-400 text-cyan-300' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}>
                  <div className={`${activeTab === item.label ? 'text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.4)]' : ''}`}>{item.icon}</div>
                  {isSidebarOpen && <span className="ml-4 font-semibold text-base">{item.label}</span>}
                </button>
              ))}
            </nav>
          </div>
          <div className="p-4 border-t border-white/10">
            {isSidebarOpen && (
              <div className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                <div className="overflow-hidden">
                    <p className="text-xs font-mono text-slate-500 mb-1 uppercase tracking-tight">Vínculo Ativo</p>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-white font-mono truncate font-bold">{currentUser.username}</span>
                    </div>
                </div>
                <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-red-400 transition-colors"><LogOut size={20} /></button>
              </div>
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <header className="h-20 bg-sci-panel/50 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-8">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-white md:hidden"><Menu size={24} /></button>
            <div className="hidden lg:block overflow-hidden w-full max-w-xl relative h-6">
                <p className="absolute w-full text-sm font-mono text-cyan-500/80 whitespace-nowrap animate-marquee font-semibold">{insight}</p>
            </div>
            <div className="flex items-center gap-6">
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-white tracking-wide">{currentUser.name}</p>
                    <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">{currentUser.role}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 p-[2px]">
                    <img src={`https://ui-avatars.com/api/?name=${currentUser.name}&background=0b1221&color=fff`} alt="User" className="rounded-full w-full h-full border-2 border-sci-panel" />
                </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 md:p-10">
            <div className="max-w-7xl mx-auto space-y-8">
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
                    permission={currentRolePermissions.cadastro} // Passagem das permissões
                  />
               )}

               {activeTab === 'Escalas' && currentRolePermissions.escalas.visualize && (
                  <ShiftCalendar 
                    filterEmployeeId={filterEmployeeId} employees={activeEmployees} currentSchedules={globalSchedules} onSave={setGlobalSchedules}
                    deductions={globalDeductions} externalDate={viewedDate} onDateChange={setViewedDate}
                    hourlyRate={hourlyRate} onHourlyRateChange={setHourlyRate} availableCourses={availableCourses} 
                    schools={schools}
                    permission={currentRolePermissions.escalas} // Passagem das permissões
                  />
               )}

               {activeTab === 'Relatórios' && currentRolePermissions.relatorios.visualize && (
                  <ReportsPanel 
                    filterEmployeeId={filterEmployeeId} employees={activeEmployees} schedules={globalSchedules} initialDeductions={globalDeductions} 
                    onSaveDeductions={setGlobalDeductions} hourlyRate={hourlyRate} selectedDate={viewedDate}
                  />
               )}

               {activeTab === 'Segurança' && currentRolePermissions.seguranca.visualize && <SecurityPanel logs={logs} />}

               {activeTab === 'Sistema' && currentUser.role === 'ADMIN' && <SystemPanel initialPermissions={permissions} onSave={handleSavePermissions} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
