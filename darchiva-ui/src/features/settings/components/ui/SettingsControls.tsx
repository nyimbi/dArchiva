// Settings UI Controls
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SettingsCardProps {
	title: string;
	description?: string;
	children: React.ReactNode;
	className?: string;
}

export function SettingsCard({ title, description, children, className }: SettingsCardProps) {
	return (
		<div className={cn('bg-slate-800/50 border border-slate-700/50 rounded-lg', className)}>
			<div className="px-6 py-4 border-b border-slate-700/50">
				<h3 className="font-medium text-white">{title}</h3>
				{description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
			</div>
			<div className="p-6 space-y-6">{children}</div>
		</div>
	);
}

interface SettingsFieldProps {
	label: string;
	description?: string;
	value: string;
	onChange: (value: string) => void;
	type?: 'text' | 'password' | 'email' | 'number';
	placeholder?: string;
	disabled?: boolean;
}

export function SettingsField({ label, description, value, onChange, type = 'text', placeholder, disabled }: SettingsFieldProps) {
	const [localValue, setLocalValue] = useState(value);

	useEffect(() => setLocalValue(value), [value]);

	const handleBlur = () => {
		if (localValue !== value) onChange(localValue);
	};

	return (
		<div className="space-y-2">
			<label className="block">
				<span className="text-sm font-medium text-slate-200">{label}</span>
				{description && <span className="block text-xs text-slate-500 mt-0.5">{description}</span>}
			</label>
			<input
				type={type}
				value={localValue}
				onChange={(e) => setLocalValue(e.target.value)}
				onBlur={handleBlur}
				placeholder={placeholder}
				disabled={disabled}
				className={cn(
					'w-full px-4 py-2.5 rounded-lg text-sm',
					'bg-slate-900 border border-slate-700',
					'text-slate-200 placeholder:text-slate-600',
					'focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20',
					'transition-colors',
					disabled && 'opacity-50 cursor-not-allowed'
				)}
			/>
		</div>
	);
}

interface SettingsToggleProps {
	label: string;
	description?: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
	disabled?: boolean;
}

export function SettingsToggle({ label, description, checked, onChange, disabled }: SettingsToggleProps) {
	return (
		<div className="flex items-center justify-between py-2">
			<div>
				<span className="text-sm font-medium text-slate-200">{label}</span>
				{description && <span className="block text-xs text-slate-500 mt-0.5">{description}</span>}
			</div>
			<button
				type="button"
				onClick={() => !disabled && onChange(!checked)}
				disabled={disabled}
				className={cn(
					'relative w-11 h-6 rounded-full transition-colors',
					checked ? 'bg-cyan-500' : 'bg-slate-700',
					disabled && 'opacity-50 cursor-not-allowed'
				)}
			>
				<span
					className={cn(
						'absolute top-1 w-4 h-4 rounded-full bg-white transition-transform',
						checked ? 'translate-x-6' : 'translate-x-1'
					)}
				/>
			</button>
		</div>
	);
}

interface SettingsSelectProps {
	label: string;
	description?: string;
	value: string;
	options: { value: string; label: string }[];
	onChange: (value: string) => void;
	disabled?: boolean;
}

export function SettingsSelect({ label, description, value, options, onChange, disabled }: SettingsSelectProps) {
	return (
		<div className="space-y-2">
			<label className="block">
				<span className="text-sm font-medium text-slate-200">{label}</span>
				{description && <span className="block text-xs text-slate-500 mt-0.5">{description}</span>}
			</label>
			<select
				value={value}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
				className={cn(
					'w-full px-4 py-2.5 rounded-lg text-sm',
					'bg-slate-900 border border-slate-700',
					'text-slate-200',
					'focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20',
					'transition-colors',
					disabled && 'opacity-50 cursor-not-allowed'
				)}
			>
				{options.map((opt) => (
					<option key={opt.value} value={opt.value}>{opt.label}</option>
				))}
			</select>
		</div>
	);
}

interface SettingsSliderProps {
	label: string;
	description?: string;
	value: number;
	min: number;
	max: number;
	step?: number;
	unit?: string;
	onChange: (value: number) => void;
	disabled?: boolean;
}

export function SettingsSlider({ label, description, value, min, max, step = 1, unit, onChange, disabled }: SettingsSliderProps) {
	return (
		<div className="space-y-2">
			<div className="flex justify-between">
				<label className="block">
					<span className="text-sm font-medium text-slate-200">{label}</span>
					{description && <span className="block text-xs text-slate-500 mt-0.5">{description}</span>}
				</label>
				<span className="text-sm font-mono text-cyan-400">
					{value}{unit}
				</span>
			</div>
			<input
				type="range"
				value={value}
				min={min}
				max={max}
				step={step}
				onChange={(e) => onChange(Number(e.target.value))}
				disabled={disabled}
				className="w-full accent-cyan-500"
			/>
		</div>
	);
}

interface SettingsButtonProps {
	children: React.ReactNode;
	onClick: () => void;
	variant?: 'default' | 'primary' | 'danger';
	loading?: boolean;
	disabled?: boolean;
}

export function SettingsButton({ children, onClick, variant = 'default', loading, disabled }: SettingsButtonProps) {
	const variants = {
		default: 'bg-slate-700 hover:bg-slate-600 text-slate-200',
		primary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-900',
		danger: 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30',
	};

	return (
		<button
			onClick={onClick}
			disabled={loading || disabled}
			className={cn(
				'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
				variants[variant],
				(loading || disabled) && 'opacity-50 cursor-not-allowed'
			)}
		>
			{loading ? (
				<span className="inline-flex items-center gap-2">
					<span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
					Processing...
				</span>
			) : children}
		</button>
	);
}

interface SettingsBadgeProps {
	children: React.ReactNode;
	variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export function SettingsBadge({ children, variant = 'default' }: SettingsBadgeProps) {
	const variants = {
		default: 'bg-slate-700 text-slate-300',
		success: 'bg-emerald-500/10 text-emerald-400',
		warning: 'bg-amber-500/10 text-amber-400',
		error: 'bg-red-500/10 text-red-400',
		info: 'bg-cyan-500/10 text-cyan-400',
	};

	return (
		<span className={cn('px-2 py-0.5 rounded text-xs font-mono', variants[variant])}>
			{children}
		</span>
	);
}

export function SettingsDivider() {
	return <div className="border-t border-slate-700/50 my-6" />;
}
