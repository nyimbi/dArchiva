// Empty State - Placeholder for empty lists/content
import { cn } from '@/lib/utils';
import { LucideIcon, Inbox, FileText, Search, FolderOpen, Users, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Preset = 'default' | 'documents' | 'search' | 'folders' | 'users' | 'settings';

interface Props {
	preset?: Preset;
	icon?: LucideIcon;
	title?: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	className?: string;
}

const PRESETS: Record<Preset, { icon: LucideIcon; title: string; description: string }> = {
	default: {
		icon: Inbox,
		title: 'Nothing here yet',
		description: 'Get started by adding your first item',
	},
	documents: {
		icon: FileText,
		title: 'No documents',
		description: 'Upload or create your first document',
	},
	search: {
		icon: Search,
		title: 'No results found',
		description: 'Try adjusting your search or filters',
	},
	folders: {
		icon: FolderOpen,
		title: 'Empty folder',
		description: 'This folder has no contents yet',
	},
	users: {
		icon: Users,
		title: 'No users',
		description: 'Invite team members to get started',
	},
	settings: {
		icon: Settings,
		title: 'No settings configured',
		description: 'Configure your preferences',
	},
};

export function EmptyState({
	preset = 'default',
	icon,
	title,
	description,
	action,
	className,
}: Props) {
	const presetConfig = PRESETS[preset];
	const Icon = icon || presetConfig.icon;
	const displayTitle = title || presetConfig.title;
	const displayDescription = description || presetConfig.description;

	return (
		<div className={cn('empty-state', className)}>
			<div className="empty-icon">
				<Icon className="w-10 h-10" />
			</div>
			<h3 className="empty-title">{displayTitle}</h3>
			<p className="empty-description">{displayDescription}</p>
			{action && (
				<Button onClick={action.onClick} className="empty-action">
					{action.label}
				</Button>
			)}
		</div>
	);
}

// Compact inline variant
export function EmptyInline({
	message = 'No items',
	icon: Icon = Inbox,
	className,
}: {
	message?: string;
	icon?: LucideIcon;
	className?: string;
}) {
	return (
		<div className={cn('empty-inline', className)}>
			<Icon className="w-4 h-4" />
			<span>{message}</span>
		</div>
	);
}
