import { cn } from '@/lib/utils';
import { ArrowUpIcon, ArrowDownIcon, MinusIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type TrendDirection = 'up' | 'down' | 'neutral';

interface MetricCardProps {
  label: string;
  value: string | number;
  sublabel?: string;
  trend?: { value: number; direction: TrendDirection };
  icon?: ReactNode;
  accent?: 'cyan' | 'emerald' | 'amber' | 'red' | 'purple' | 'default';
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const accentColors = {
  default: 'border-white/10',
  cyan: 'border-l-cyan-400 border-l-2',
  emerald: 'border-l-emerald-400 border-l-2',
  amber: 'border-l-amber-400 border-l-2',
  red: 'border-l-red-400 border-l-2',
  purple: 'border-l-purple-400 border-l-2',
};

const trendColors = {
  up: 'text-emerald-400',
  down: 'text-red-400',
  neutral: 'text-slate-400',
};

const TrendIcon = ({ direction }: { direction: TrendDirection }) => {
  const icons = { up: ArrowUpIcon, down: ArrowDownIcon, neutral: MinusIcon };
  const Icon = icons[direction];
  return <Icon className="w-3 h-3" />;
};

export function MetricCard({
  label,
  value,
  sublabel,
  trend,
  icon,
  accent = 'default',
  size = 'md',
  pulse = false,
  className,
}: MetricCardProps) {
  const sizes = {
    sm: { container: 'p-3', value: 'text-xl', label: 'text-[10px]' },
    md: { container: 'p-4', value: 'text-2xl', label: 'text-xs' },
    lg: { container: 'p-5', value: 'text-3xl', label: 'text-sm' },
  };

  return (
    <div
      className={cn(
        'relative bg-white/[0.02] border border-white/10 rounded-md overflow-hidden',
        'hover:bg-white/[0.04] hover:border-white/15 transition-all duration-200',
        accentColors[accent],
        sizes[size].container,
        className
      )}
    >
      {/* Grid texture overlay */}
      <div className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }}
      />

      <div className="relative z-10">
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <span className={cn('font-medium text-white/50 uppercase tracking-wider', sizes[size].label)}>
            {label}
          </span>
          {icon && <span className="text-white/30">{icon}</span>}
        </div>

        {/* Value row */}
        <div className="flex items-end gap-2">
          <span
            className={cn(
              'font-mono font-bold text-white tabular-nums',
              sizes[size].value,
              pulse && 'animate-pulse'
            )}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </span>

          {trend && (
            <span className={cn('flex items-center gap-0.5 text-xs font-mono mb-1', trendColors[trend.direction])}>
              <TrendIcon direction={trend.direction} />
              {Math.abs(trend.value)}%
            </span>
          )}
        </div>

        {/* Sublabel */}
        {sublabel && (
          <span className="block mt-1 text-[10px] text-white/40 font-mono">{sublabel}</span>
        )}
      </div>
    </div>
  );
}
