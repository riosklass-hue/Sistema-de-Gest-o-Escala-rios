
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
    cyan: 'border-cyan-500/20 hover:border-cyan-400/50 shadow-[0_0_20px_rgba(0,243,255,0.05)] hover:shadow-neon-cyan',
    purple: 'border-purple-500/20 hover:border-purple-400/50 shadow-[0_0_20px_rgba(188,19,254,0.05)] hover:shadow-neon-purple',
    orange: 'border-orange-500/20 hover:border-orange-400/50 shadow-[0_0_20px_rgba(255,153,0,0.05)] hover:shadow-neon-orange',
    blue: 'border-blue-500/20 hover:border-blue-400/50 shadow-[0_0_20px_rgba(34,102,255,0.05)] hover:shadow-[0_0_30px_rgba(34,102,255,0.2)]',
    none: 'border-white/5 hover:border-white/10'
  };

  return (
    <div className={`
      relative bg-[#0f172a]/70 backdrop-blur-xl
      border ${glowClasses[glowColor]} 
      rounded-xl transition-all duration-500 
      group
      ${className}
    `}>
      {/* Intricate Corner Brackets */}
      <svg className="absolute top-0 left-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32" fill="none">
        <path d="M1 12V1H12" stroke="currentColor" strokeWidth="1" className={`${glowColor === 'none' ? 'text-white/10' : `text-${glowColor === 'cyan' ? 'cyan' : glowColor === 'purple' ? 'purple' : glowColor === 'orange' ? 'orange' : 'blue'}-500/40`}`} />
      </svg>
      <svg className="absolute bottom-0 right-0 w-8 h-8 pointer-events-none" viewBox="0 0 32 32" fill="none">
        <path d="M31 20V31H20" stroke="currentColor" strokeWidth="1" className={`${glowColor === 'none' ? 'text-white/10' : `text-${glowColor === 'cyan' ? 'cyan' : glowColor === 'purple' ? 'purple' : glowColor === 'orange' ? 'orange' : 'blue'}-500/40`}`} />
      </svg>
      
      {/* Header if title exists */}
      {(title || icon) && (
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-3">
              {icon && <span className={`${glowColor === 'none' ? 'text-slate-400' : `text-${glowColor === 'cyan' ? 'cyan' : glowColor === 'purple' ? 'purple' : glowColor === 'orange' ? 'orange' : 'blue'}-400`} group-hover:scale-110 transition-transform duration-300`}>{icon}</span>}
              <div>
                {title && <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/80 font-black">{title}</h3>}
                {subtitle && <p className="text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-0.5">{subtitle}</p>}
              </div>
            </div>
            {/* HUD element decorative circle */}
            <div className={`w-1 h-4 rounded-full ${glowColor === 'none' ? 'bg-white/10' : `bg-${glowColor === 'cyan' ? 'cyan' : glowColor === 'purple' ? 'purple' : glowColor === 'orange' ? 'orange' : 'blue'}-500/30`}`}></div>
        </div>
      )}

      <div className="p-5">
        {children}
      </div>
    </div>
  );
};

export default NeonCard;
