// Metric Card - Swiss precision data display
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface MetricCardProps {
	label: string;
	value: number | string;
	change?: number;
	changeLabel?: string;
	icon?: ReactNode;
	variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger';
	size?: 'sm' | 'md' | 'lg';
	sparkline?: number[];
	className?: string;
}

export function MetricCard({
	label,
	value,
	change,
	changeLabel,
	icon,
	variant = 'default',
	size = 'md',
	sparkline,
	className,
}: MetricCardProps) {
	const variantStyles = {
		default: 'text-[var(--iam-text-primary)]',
		accent: 'text-[var(--iam-accent)]',
		success: 'text-[var(--iam-success)]',
		warning: 'text-[var(--iam-warning)]',
		danger: 'text-[var(--iam-danger)]',
	};

	const sizeStyles = {
		sm: { value: 'text-xl', label: 'text-[10px]' },
		md: { value: 'text-2xl', label: 'text-xs' },
		lg: { value: 'text-3xl', label: 'text-sm' },
	};

	return (
		<div className={cn('iam-card p-4', className)}>
			<div className="flex items-start justify-between mb-2">
				<span className={cn(
					'iam-grid-header',
					sizeStyles[size].label
				)}>
					{label}
				</span>
				{icon && (
					<div className="text-[var(--iam-text-tertiary)]">
						{icon}
					</div>
				)}
			</div>

			<div className="flex items-end justify-between">
				<div>
					<div className={cn(
						'iam-metric font-semibold',
						sizeStyles[size].value,
						variantStyles[variant]
					)}>
						{typeof value === 'number' ? value.toLocaleString() : value}
					</div>

					{change !== undefined && (
						<div className="flex items-center gap-1 mt-1">
							<span className={cn(
								'text-xs font-mono',
								change > 0 && 'text-[var(--iam-success)]',
								change < 0 && 'text-[var(--iam-danger)]',
								change === 0 && 'text-[var(--iam-text-tertiary)]'
							)}>
								{change > 0 ? '+' : ''}{change}%
							</span>
							{changeLabel && (
								<span className="text-[10px] text-[var(--iam-text-tertiary)]">
									{changeLabel}
								</span>
							)}
						</div>
					)}
				</div>

				{sparkline && sparkline.length > 0 && (
					<Sparkline data={sparkline} variant={variant} />
				)}
			</div>
		</div>
	);
}

function Sparkline({ data, variant }: { data: number[]; variant: string }) {
	const max = Math.max(...data);
	const min = Math.min(...data);
	const range = max - min || 1;

	const colorVar = {
		default: 'var(--iam-text-secondary)',
		accent: 'var(--iam-accent)',
		success: 'var(--iam-success)',
		warning: 'var(--iam-warning)',
		danger: 'var(--iam-danger)',
	}[variant] || 'var(--iam-accent)';

	return (
		<div className="iam-sparkline w-16">
			{data.map((val, i) => (
				<div
					key={i}
					className="iam-sparkline-bar"
					style={{
						height: `${((val - min) / range) * 100}%`,
						minHeight: '2px',
						background: colorVar,
					}}
				/>
			))}
		</div>
	);
}
