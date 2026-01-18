import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  label?: string;
  sublabel?: string;
  color?: 'cyan' | 'emerald' | 'amber' | 'red' | 'purple';
  animate?: boolean;
  className?: string;
}

const colorClasses = {
  cyan: 'stroke-cyan-400',
  emerald: 'stroke-emerald-400',
  amber: 'stroke-amber-400',
  red: 'stroke-red-400',
  purple: 'stroke-purple-400',
};

const glowClasses = {
  cyan: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]',
  emerald: 'drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]',
  amber: 'drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]',
  red: 'drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]',
  purple: 'drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]',
};

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  showValue = true,
  label,
  sublabel,
  color = 'cyan',
  animate = true,
  className,
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(animate ? 0 : value);
  const percentage = Math.min(100, Math.max(0, (animatedValue / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    if (!animate) {
      setAnimatedValue(value);
      return;
    }
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value, animate]);

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className={cn('-rotate-90', glowClasses[color])}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-white/5"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(colorClasses[color], 'transition-all duration-1000 ease-out')}
        />
        {/* Gradient definition for optional gradient stroke */}
        <defs>
          <linearGradient id={`ring-gradient-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.8" />
            <stop offset="100%" stopColor="currentColor" />
          </linearGradient>
        </defs>
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span className="font-mono text-2xl font-bold text-white tabular-nums">
            {Math.round(percentage)}
            <span className="text-sm text-white/50">%</span>
          </span>
        )}
        {label && (
          <span className="text-xs font-medium text-white/70 mt-0.5 tracking-wide">{label}</span>
        )}
        {sublabel && (
          <span className="text-[10px] text-white/40 font-mono">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
