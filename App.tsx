import React, { useState, useEffect } from 'react';
import ShiftCalendar from './components/ShiftCalendar';
import StatsPanel from './components/StatsPanel';
import ReportsPanel from './components/ReportsPanel';
import SecurityPanel from './components/SecurityPanel';
import LoginScreen from './components/LoginScreen';
import RegistrationPanel from './components/RegistrationPanel';
import { INITIAL_EMPLOYEES } from './constants';
import { Menu, Bell, Search, Hexagon, TriangleAlert, LogOut, Activity, User as UserIcon, Database, Shield, Zap, UserPlus } from 'lucide-react';
import NeonCard from './components/NeonCard';
import { User, Employee, Schedule } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('Escalas');
  const [insight, setInsight] = useState<string>('');
  
  // Lifted state for employees to share between components
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  
  // State to hold saved schedules shared between Calendar and Reports
  const [globalSchedules, setGlobalSchedules] = useState<Schedule[]>([]);

  // State to hold deductions shared between Reports and Calendar
  const [globalDeductions, setGlobalDeductions] = useState<any>({
    '40H': { ir: 0, inss: 0, unimed: 0 },
    '20H': { ir: 0, inss: 0, unimed: 0 }
  });

  // Filtragem global para o sistema (Apenas ativos aparecem nas telas operacionais)
  const activeEmployees = employees.filter(emp => emp.active);

  useEffect(() => {
    if (!currentUser) return;

    // Update ticker message based on active tab
    if (activeTab === 'Escalas') {
      setInsight(currentUser.role === 'ADMIN' 
        ? "S.G.E. Rios: Modo Administrador. Gestão completa de escalas." 
        : `S.G.E. Rios: Bem-vindo(a) ${currentUser.name}. Visualizando escala individual.`);
    } else if (activeTab === 'Dashboard') {
      setInsight(currentUser.role === 'ADMIN' 
        ? "S.G.E. Rios: Visualizando monitoramento de pessoal e métricas da equipe."
        : "S.G.E. Rios: Visualizando seu desempenho individual e carga horária.");
    } else if (activeTab === 'Relatórios') {
        setInsight("S.G.E. Rios: Processando dados financeiros e volumetria de horas.");
    } else if (activeTab === 'Cadastro') {
        setInsight("S.G.E. Rios: Módulo de registro de novos usuários e colaboradores.");
    } else if (activeTab === 'Segurança') {
        setInsight("S.G.E. Rios: Auditoria de acessos e monitoramento de segurança.");
    } else {
      setInsight(`S.G.E. Rios: Acesso ao módulo ${activeTab} restrito.`);
    }
  }, [activeTab, currentUser]);

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('Escalas');
  };

  const handleRegisterEmployee = (newEmployee: Employee) => {
    setEmployees(prev => [...prev, newEmployee]);
  };

  const handleUpdateEmployee = (updatedEmployee: Employee) => {
    setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
  };

  const handleDeleteEmployee = (id: string) => {
    setEmployees(prev => prev.filter(emp => emp.id !== id));
    setGlobalSchedules(prev => prev.filter(sch => sch.employeeId !== id));
  };

  const handleSaveSchedules = (schedules: Schedule[]) => {
    setGlobalSchedules(schedules);
  };

  const handleSaveDeductions = (deductions: any) => {
    setGlobalDeductions(deductions);
  };

  const menuItems = [
      { label: 'Dashboard', icon: <Activity className="w-5 h-5" /> },
      ...(currentUser?.role === 'ADMIN' ? [{ label: 'Cadastro', icon: <UserPlus className="w-5 h-5" /> }] : []),
      { label: 'Escalas', icon: <UserIcon className="w-5 h-5" /> },
      { label: 'Relatórios', icon: <Database className="w-5 h-5" /> },
      { label: 'Segurança', icon: <Shield className="w-5 h-5" /> },
      { label: 'Sistema', icon: <Zap className="w-5 h-5" /> },
  ];

  if (!currentUser) {
    return <LoginScreen onLogin={setCurrentUser} />;
  }

  const filterEmployeeId = currentUser.role === 'TEACHER' ? currentUser.employeeId : null;
  
  // Dashboard filtering
  const dashboardEmployees = filterEmployeeId 
    ? activeEmployees.filter(e => e.id === filterEmployeeId)
    : activeEmployees;

  return (
    <div className="min-h-screen bg-sci-bg text-slate-200 font-sans selection:bg-cyan-500/30">
      
      {/* Decorative Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-cyan-900/10 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute top-[20%] right-[20%] w-[20%] h-[20%] bg-blue-900/10 rounded-full blur-[80px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <div className="relative z-10 flex h-screen overflow-hidden">
        
        {/* Sidebar */}
        <aside 
          className={`
            ${isSidebarOpen ? 'w-64' : 'w-20'} 
            bg-sci-panel/90 backdrop-blur-xl border-r border-white/10 
            transition-all duration-300 flex flex-col justify-between
            hidden md:flex
          `}
        >
          <div>
            <div className="h-16 flex items-center justify-center border-b border-white/10">
              <Hexagon className="text-cyan-400 w-8 h-8 animate-spin-slow" />
              {isSidebarOpen && <span className="ml-3 font-mono font-bold text-lg tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">RIOS</span>}
            </div>
            
            <nav className="p-4 space-y-2">
              {menuItems.map((item, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveTab(item.label)}
                  className={`
                    w-full flex items-center p-3 rounded-lg transition-all group
                    ${activeTab === item.label
                      ? 'bg-gradient-to-r from-cyan-900/50 to-transparent border-l-2 border-cyan-400 text-cyan-300' 
                      : 'hover:bg-white/5 text-slate-400 hover:text-white'}
                  `}
                >
                  <div className={`${activeTab === item.label ? 'text-cyan-400 shadow-[0_0_10px_rgba(0,243,255,0.4)]' : ''}`}>
                      {item.icon}
                  </div>
                  {isSidebarOpen && <span className="ml-3 font-medium text-sm">{item.label}</span>}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 border-t border-white/10">
            {isSidebarOpen && (
              <div className="bg-slate-900/50 p-3 rounded border border-white/5 flex items-center justify-between">
                <div>
                    <p className="text-xs text-slate-500 mb-1">Usuário</p>
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${currentUser.role === 'ADMIN' ? 'bg-purple-500' : 'bg-cyan-500'} animate-pulse`}></div>
                        <span className="text-xs text-white font-mono">{currentUser.username}</span>
                    </div>
                </div>
                <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors" title="Logout">
                    <LogOut size={16} />
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          
          <header className="h-16 bg-sci-panel/50 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg md:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-900/50 rounded-full border border-white/10 w-64">
                <Search size={14} className="text-slate-500" />
                <input 
                  type="text" 
                  placeholder="Buscar..." 
                  className="bg-transparent border-none text-xs w-full text-slate-300 focus:outline-none placeholder:text-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden lg:block overflow-hidden w-96 relative h-6">
                  <p className="absolute w-full text-xs font-mono text-cyan-500/80 whitespace-nowrap animate-marquee">
                      {insight}
                  </p>
              </div>

              <div className="flex items-center gap-4">
                <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
                  <Bell size={20} />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full border-2 border-sci-panel"></span>
                </button>
                <div className="flex items-center gap-3 pl-3 border-l border-white/10">
                    <div className="text-right hidden sm:block">
                        <p className="text-xs font-bold text-white">{currentUser.name}</p>
                        <p className="text-[10px] text-slate-400">{currentUser.role === 'ADMIN' ? 'Administrador' : 'Professor'}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-purple-500 p-[1px]">
                        <img 
                            src={`https://ui-avatars.com/api/?name=${currentUser.name}&background=0b1221&color=fff`} 
                            alt="User" 
                            className="rounded-full w-full h-full object-cover border-2 border-sci-panel" 
                        />
                    </div>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 scroll-smooth">
            <div className="max-w-7xl mx-auto space-y-6">
               
               {activeTab === 'Dashboard' && (
                 <>
                   <StatsPanel 
                      employees={dashboardEmployees} 
                      schedules={globalSchedules} 
                   />
                 </>
               )}

               {activeTab === 'Cadastro' && currentUser.role === 'ADMIN' && (
                  <RegistrationPanel 
                    onRegisterEmployee={handleRegisterEmployee} 
                    onUpdateEmployee={handleUpdateEmployee}
                    onDeleteEmployee={handleDeleteEmployee}
                    employees={employees}
                  />
               )}

               {activeTab === 'Escalas' && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <ShiftCalendar 
                      filterEmployeeId={filterEmployeeId} 
                      employees={activeEmployees}
                      currentSchedules={globalSchedules} 
                      onSave={handleSaveSchedules}
                      deductions={globalDeductions}
                    />
                  </div>
               )}

               {activeTab === 'Relatórios' && (
                  <ReportsPanel 
                    filterEmployeeId={filterEmployeeId} 
                    employees={activeEmployees} 
                    schedules={globalSchedules}
                    initialDeductions={globalDeductions}
                    onSaveDeductions={handleSaveDeductions}
                  />
               )}

               {activeTab === 'Segurança' && (
                  <SecurityPanel />
               )}

               {['Sistema'].includes(activeTab) && (
                 <NeonCard glowColor="orange" className="h-64 flex flex-col items-center justify-center text-center p-8">
                    <TriangleAlert className="w-12 h-12 text-orange-400 mb-4 animate-pulse" />
                    <h2 className="text-2xl font-mono text-white mb-2">Acesso Restrito</h2>
                    <p className="text-slate-400">O módulo <span className="text-orange-300 font-bold">{activeTab}</span> requer credenciais de nível superior.</p>
                 </NeonCard>
               )}
            
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;