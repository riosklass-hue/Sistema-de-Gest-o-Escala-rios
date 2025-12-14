import React from 'react';

interface NeonCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'cyan' | 'purple' | 'orange' | 'blue' | 'none';
  title?: string;
  icon?: React.ReactNode;
}

const NeonCard: React.FC<NeonCardProps> = ({ 
  children, 
  className = '', 
  glowColor = 'none',
  title,
  icon
}) => {
  const glowClasses = {
    cyan: 'border-cyan-500/30 hover:shadow-neon-cyan hover:border-cyan-400/50',
    purple: 'border-purple-500/30 hover:shadow-neon-purple hover:border-purple-400/50',
    orange: 'border-orange-500/30 hover:shadow-neon-orange hover:border-orange-400/50',
    blue: 'border-blue-500/30 hover:shadow-blue-500/20 hover:border-blue-400/50',
    none: 'border-white/10 hover:border-white/20'
  };

  return (
    <div className={`
      relative bg-sci-panel/60 backdrop-blur-md 
      border ${glowClasses[glowColor]} 
      rounded-xl transition-all duration-300 
      overflow-hidden
      ${className}
    `}>
      {/* Decorative corner lines */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/20 rounded-tl-lg pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/20 rounded-br-lg pointer-events-none"></div>
      
      {/* Header if title exists */}
      {(title || icon) && (
        <div className="flex items-center gap-2 p-4 border-b border-white/5 bg-white/5">
            {icon && <span className="text-white/70">{icon}</span>}
            {title && <h3 className="text-sm font-mono uppercase tracking-wider text-white/90 font-bold">{title}</h3>}
        </div>
      )}

      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default NeonCard;