// Technical Panel Components with Control Room Aesthetic
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface TechPanelProps {
	title?: string;
	subtitle?: string;
	children: ReactNode;
	className?: string;
	headerActions?: ReactNode;
}

export function TechPanel({ title, subtitle, children, className, headerActions }: TechPanelProps) {
	return (
		<div className={cn('scan-panel', className)}>
			{(title || headerActions) && (
				<div className="scan-panel-header">
					<div className="flex items-center gap-3">
						{title && <span>{title}</span>}
						{subtitle && (
							<span className="text-[var(--scan-text-muted)] text-[10px]">
								{subtitle}
							</span>
						)}
					</div>
					{headerActions}
				</div>
			)}
			<div className="p-4">{children}</div>
		</div>
	);
}

// Readout display for technical data
interface ReadoutProps {
	label: string;
	value: string | number;
	unit?: string;
	highlight?: boolean;
	className?: string;
}

export function Readout({ label, value, unit, highlight, className }: ReadoutProps) {
	return (
		<div className={cn('scan-readout px-3 py-2 rounded', className)}>
			<div className="text-[10px] text-[var(--scan-text-muted)] uppercase tracking-wider mb-1">
				{label}
			</div>
			<div className="flex items-baseline gap-1">
				<span
					className={cn(
						'font-mono text-lg font-semibold',
						highlight ? 'text-[var(--scan-accent)]' : 'text-[var(--scan-text-primary)]'
					)}
				>
					{value}
				</span>
				{unit && (
					<span className="text-[var(--scan-text-muted)] text-xs">{unit}</span>
				)}
			</div>
		</div>
	);
}

// Gauge/Progress bar
interface GaugeProps {
	value: number;
	max?: number;
	label?: string;
	showValue?: boolean;
	variant?: 'default' | 'success' | 'warning' | 'error';
	className?: string;
}

const gaugeColors = {
	default: 'from-[var(--scan-accent)] to-[var(--scan-accent-bright)]',
	success: 'from-emerald-500 to-emerald-400',
	warning: 'from-amber-500 to-amber-400',
	error: 'from-red-500 to-red-400',
};

export function Gauge({ value, max = 100, label, showValue, variant = 'default', className }: GaugeProps) {
	const percentage = Math.min((value / max) * 100, 100);

	return (
		<div className={cn('space-y-1', className)}>
			{(label || showValue) && (
				<div className="flex justify-between text-[10px] font-mono uppercase tracking-wider">
					{label && <span className="text-[var(--scan-text-muted)]">{label}</span>}
					{showValue && <span className="text-[var(--scan-text-secondary)]">{value}/{max}</span>}
				</div>
			)}
			<div className="scan-gauge">
				<div
					className={cn('scan-gauge-fill bg-gradient-to-r', gaugeColors[variant])}
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}

// Activity wave display
interface ActivityDisplayProps {
	active?: boolean;
	className?: string;
}

export function ActivityDisplay({ active = true, className }: ActivityDisplayProps) {
	return (
		<div className={cn('scan-activity', className)}>
			{active && <div className="scan-activity-wave" />}
			{!active && (
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="font-mono text-[10px] text-[var(--scan-text-muted)] uppercase">
						Idle
					</span>
				</div>
			)}
		</div>
	);
}

// Schematic-styled card
interface SchematicCardProps {
	children: ReactNode;
	className?: string;
	onClick?: () => void;
}

export function SchematicCard({ children, className, onClick }: SchematicCardProps) {
	return (
		<div
			className={cn(
				'scan-schematic scan-card scan-panel p-4',
				onClick && 'cursor-pointer',
				className
			)}
			onClick={onClick}
		>
			{children}
		</div>
	);
}

// Tech button
interface TechButtonProps {
	children: ReactNode;
	variant?: 'default' | 'primary' | 'danger';
	size?: 'sm' | 'md' | 'lg';
	disabled?: boolean;
	loading?: boolean;
	className?: string;
	onClick?: () => void;
}

export function TechButton({
	children,
	variant = 'default',
	size = 'md',
	disabled,
	loading,
	className,
	onClick,
}: TechButtonProps) {
	const sizeClasses = {
		sm: 'px-2 py-1 text-[10px]',
		md: 'px-4 py-2 text-xs',
		lg: 'px-6 py-3 text-sm',
	};

	const variantClasses = {
		default: 'scan-btn',
		primary: 'scan-btn scan-btn-primary',
		danger: 'scan-btn hover:border-red-500 hover:text-red-400',
	};

	return (
		<button
			className={cn(variantClasses[variant], sizeClasses[size], className)}
			disabled={disabled || loading}
			onClick={onClick}
		>
			{loading ? (
				<span className="inline-flex items-center gap-2">
					<span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
					Processing...
				</span>
			) : (
				children
			)}
		</button>
	);
}

// Grid overlay for background effect
export function GridOverlay({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				'absolute inset-0 pointer-events-none scan-grid-bg opacity-30',
				className
			)}
		/>
	);
}
