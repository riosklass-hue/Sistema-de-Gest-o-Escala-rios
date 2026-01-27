
import React from 'react';

interface NeonCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'purple' | 'orange' | 'blue' | 'none';
  title?: string;
  icon?: React.ReactNode;
  subtitle?: string;
}

const NeonCard: React.FC<NeonCardProps> = ({ 
  children, 
  className = '', 
  glowColor = 'none',
  title,
  icon,
  subtitle
}) => {
  const glowClasses = {
    cyan: 'border-neon-cyan/30 shadow-neon-cyan bg-slate-900/40',
    purple: 'border-neon-purple/30 shadow-neon-purple bg-slate-900/40',
    orange: 'border-neon-orange/30 shadow-[0_0_15px_rgba(255,153,0,0.2)] bg-slate-900/40',
    blue: 'border-neon-blue/30 shadow-[0_0_15px_rgba(59,130,246,0.2)] bg-slate-900/40',
    none: 'border-white/10 shadow-glass-dark bg-slate-900/60'
  };

  return (
    <div className={`
      relative backdrop-blur-3xl
      border ${glowClasses[glowColor]} 
      rounded-3xl transition-all duration-500 
      group hover:bg-slate-900/80
      ${className}
    `}>
      {/* Glow Ambient Interno */}
      <div className={`absolute inset-0 rounded-3xl opacity-5 pointer-events-none transition-opacity duration-700 group-hover:opacity-10 bg-gradient-to-br ${glowColor === 'cyan' ? 'from-neon-cyan/40 to-transparent' : glowColor === 'purple' ? 'from-neon-purple/40 to-transparent' : 'from-transparent to-transparent'}`}></div>

      {/* Corner Brackets */}
      <svg className="absolute top-0 left-0 w-10 h-10 pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity" viewBox="0 0 32 32" fill="none">
        <path d="M1 12V1H12" stroke="currentColor" strokeWidth="2" className={`${glowColor === 'none' ? 'text-slate-700' : `text-neon-${glowColor === 'cyan' ? 'cyan' : glowColor === 'purple' ? 'purple' : glowColor === 'orange' ? 'orange' : 'blue'}`}`} />
      </svg>
      <svg className="absolute bottom-0 right-0 w-10 h-10 pointer-events-none opacity-20 group-hover:opacity-100 transition-opacity" viewBox="0 0 32 32" fill="none">
        <path d="M31 20V31H20" stroke="currentColor" strokeWidth="2" className={`${glowColor === 'none' ? 'text-slate-700' : `text-neon-${glowColor === 'cyan' ? 'cyan' : glowColor === 'purple' ? 'purple' : glowColor === 'orange' ? 'orange' : 'blue'}`}`} />
      </svg>
      
      {(title || icon) && (
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-white/5 rounded-t-3xl relative z-10">
            <div className="flex items-center gap-4">
              {icon && <span className={`${glowColor === 'none' ? 'text-slate-500' : `text-neon-${glowColor === 'cyan' ? 'cyan' : glowColor === 'purple' ? 'purple' : glowColor === 'orange' ? 'orange' : 'blue'}`} group-hover:scale-110 transition-transform duration-500`}>{icon}</span>}
              <div>
                {title && <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-300 font-black">{title}</h3>}
                {subtitle && <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1">{subtitle}</p>}
              </div>
            </div>
            <div className={`w-2 h-2 rounded-full ${glowColor === 'none' ? 'bg-slate-700' : `bg-neon-${glowColor === 'cyan' ? 'cyan' : glowColor === 'purple' ? 'purple' : glowColor === 'orange' ? 'orange' : 'blue'} shadow-[0_0_10px_currentColor]`}`}></div>
        </div>
      )}

      <div className="p-6 relative z-10">
        {children}
      </div>
    </div>
  );
};

export default NeonCard;
