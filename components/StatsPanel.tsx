import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';
import NeonCard from './NeonCard';
import { BarChart3, PieChart as PieChartIcon } from 'lucide-react';

const StatsPanel: React.FC = () => {
  const weeklyData = [
    { name: 'Sem 1', hours: 42, efficiency: 85 },
    { name: 'Sem 2', hours: 38, efficiency: 92 },
    { name: 'Sem 3', hours: 45, efficiency: 78 },
    { name: 'Sem 4', hours: 40, efficiency: 88 },
  ];

  const distributionData = [
    { name: 'Técnico', value: 45, color: '#00f3ff' }, // Cyan
    { name: 'Plan.', value: 30, color: '#ff9900' },   // Orange
    { name: 'Final', value: 25, color: '#bc13fe' },   // Purple
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <NeonCard title="Carga Horária Semanal" glowColor="blue" icon={<BarChart3 size={16} />}>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyData}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0b1221', borderColor: '#1e293b', color: '#f8fafc' }}
                itemStyle={{ color: '#00f3ff' }}
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
              />
              <Bar dataKey="hours" fill="#2266ff" radius={[4, 4, 0, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </NeonCard>

      <NeonCard title="Distribuição de Turnos" glowColor="purple" icon={<PieChartIcon size={16} />}>
        <div className="h-[200px] w-full flex items-center justify-center relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distributionData}
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                 contentStyle={{ backgroundColor: '#0b1221', borderColor: '#1e293b', color: '#f8fafc' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center text for donut chart */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold text-white">100%</span>
            <span className="text-xs text-slate-400">Total</span>
          </div>
        </div>
      </NeonCard>
    </div>
  );
};

export default StatsPanel;