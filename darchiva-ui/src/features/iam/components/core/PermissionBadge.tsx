// Permission Badge - Visual permission level indicator
import { cn } from '@/lib/utils';
import { Eye, Pencil, Shield, Crown, Ban } from 'lucide-react';
import type { PermissionLevel } from '../../types';

interface PermissionBadgeProps {
	level: PermissionLevel;
	size?: 'xs' | 'sm' | 'md';
	showLabel?: boolean;
	className?: string;
}

const LEVEL_CONFIG: Record<PermissionLevel, {
	label: string;
	icon: typeof Eye;
	className: string;
}> = {
	none: {
		label: 'None',
		icon: Ban,
		className: 'bg-[var(--iam-bg-surface)] text-[var(--iam-text-muted)] border border-[var(--iam-border-subtle)]',
	},
	read: {
		label: 'Read',
		icon: Eye,
		className: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
	},
	write: {
		label: 'Write',
		icon: Pencil,
		className: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
	},
	admin: {
		label: 'Admin',
		icon: Shield,
		className: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
	},
	owner: {
		label: 'Owner',
		icon: Crown,
		className: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
	},
};

const SIZE_CLASSES = {
	xs: 'h-5 text-[10px] px-1.5 gap-0.5',
	sm: 'h-6 text-xs px-2 gap-1',
	md: 'h-7 text-sm px-2.5 gap-1.5',
};

const ICON_SIZES = {
	xs: 'w-3 h-3',
	sm: 'w-3.5 h-3.5',
	md: 'w-4 h-4',
};

export function PermissionBadge({
	level,
	size = 'sm',
	showLabel = true,
	className,
}: PermissionBadgeProps) {
	const config = LEVEL_CONFIG[level];
	const Icon = config.icon;

	return (
		<span
			className={cn(
				'inline-flex items-center rounded-md font-medium whitespace-nowrap',
				SIZE_CLASSES[size],
				config.className,
				className
			)}
		>
			<Icon className={ICON_SIZES[size]} />
			{showLabel && <span>{config.label}</span>}
		</span>
	);
}

// Permission selector for editing
interface PermissionSelectorProps {
	value: PermissionLevel;
	onChange: (level: PermissionLevel) => void;
	disabled?: boolean;
	allowedLevels?: PermissionLevel[];
}

export function PermissionSelector({
	value,
	onChange,
	disabled = false,
	allowedLevels = ['none', 'read', 'write', 'admin', 'owner'],
}: PermissionSelectorProps) {
	return (
		<div className="flex items-center gap-1">
			{allowedLevels.map((level) => {
				const config = LEVEL_CONFIG[level];
				const Icon = config.icon;
				const isSelected = level === value;

				return (
					<button
						key={level}
						onClick={() => onChange(level)}
						disabled={disabled}
						className={cn(
							'p-1.5 rounded-md transition-all',
							isSelected
								? config.className
								: 'text-[var(--iam-text-muted)] hover:text-[var(--iam-text-secondary)] hover:bg-[var(--iam-bg-hover)]',
							disabled && 'opacity-50 cursor-not-allowed'
						)}
						title={config.label}
					>
						<Icon className="w-4 h-4" />
					</button>
				);
			})}
		</div>
	);
}
