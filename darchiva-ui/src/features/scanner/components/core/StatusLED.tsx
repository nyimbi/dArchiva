// Status LED Indicator Component
import { cn } from '@/lib/utils';
import type { ScannerStatus } from '../../types';
import { STATUS_CONFIG } from '../../types';

interface StatusLEDProps {
	status: ScannerStatus;
	size?: 'sm' | 'md' | 'lg';
	showLabel?: boolean;
	className?: string;
}

const sizeClasses = {
	sm: 'w-2 h-2',
	md: 'w-3 h-3',
	lg: 'w-4 h-4',
};

export function StatusLED({ status, size = 'md', showLabel = false, className }: StatusLEDProps) {
	const config = STATUS_CONFIG[status];

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<div
				className={cn(
					'rounded-full',
					sizeClasses[size],
					config.ledClass
				)}
				aria-label={config.label}
			/>
			{showLabel && (
				<span className={cn('font-mono text-xs uppercase tracking-wider', config.color)}>
					{config.label}
				</span>
			)}
		</div>
	);
}

// Compact status badge with LED
interface StatusBadgeProps {
	status: ScannerStatus;
	className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
	const config = STATUS_CONFIG[status];

	return (
		<div
			className={cn(
				'inline-flex items-center gap-1.5 px-2 py-1 rounded',
				'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
				className
			)}
		>
			<div className={cn('w-2 h-2 rounded-full', config.ledClass)} />
			<span className={cn('font-mono text-[10px] uppercase tracking-wider', config.color)}>
				{config.label}
			</span>
		</div>
	);
}
