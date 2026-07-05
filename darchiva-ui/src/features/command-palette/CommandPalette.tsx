// (c) Copyright Datacraft, 2026
import { adminItems, navItems } from '@/components/Sidebar';
import { useShortcuts } from '@/features/shortcuts/ShortcutsProvider';
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
	Briefcase,
	FileText,
	Key,
	Keyboard,
	ScanLine,
	Search,
	Settings,
	ShieldCheck,
	Upload,
	User,
	Webhook,
	Workflow,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

type CommandCategory = 'navigation' | 'recent' | 'actions' | 'settings';

interface RecentDocument {
	id?: string;
	title?: string;
	name?: string;
	path?: string;
	openedAt?: number;
	visitedAt?: number;
	updated_at?: string;
}

interface CommandItem {
	id: string;
	category: CommandCategory;
	label: string;
	description?: string;
	icon: LucideIcon;
	shortcut?: string;
	keywords?: string[];
	run: () => void;
}

interface CommandPaletteProps {
	open: boolean;
	onClose: () => void;
}

const RECENT_DOCS_KEY = 'recent_docs';
const CATEGORY_LABELS: Record<CommandCategory, string> = {
	navigation: 'Navigation',
	recent: 'Recent documents',
	actions: 'Actions',
	settings: 'Settings',
};

const NAV_SHORTCUTS: Record<string, string> = {
	home: 'G H',
	inbox: 'G I',
	dashboard: 'G A',
	documents: 'G D',
	search: 'G S',
	workflows: 'G W',
	settings: 'G ,',
};

function readRecentDocuments(): RecentDocument[] {
	try {
		const raw = window.localStorage.getItem(RECENT_DOCS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
	} catch {
		return [];
	}
}

function matchesCommand(item: CommandItem, query: string): boolean {
	if (!query) return true;
	const haystack = [
		item.label,
		item.description,
		item.shortcut,
		...(item.keywords ?? []),
	].filter(Boolean).join(' ').toLowerCase();
	return haystack.includes(query);
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
	const navigate = useNavigate();
	const { openModal } = useStore();
	const { setShortcutsHelpOpen } = useShortcuts();
	const inputRef = useRef<HTMLInputElement>(null);
	const [query, setQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);

	const close = useCallback(() => {
		setQuery('');
		setSelectedIndex(0);
		onClose();
	}, [onClose]);

	useEffect(() => {
		if (!open) return;
		setRecentDocuments(readRecentDocuments());
		const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
		return () => window.cancelAnimationFrame(frame);
	}, [open]);

	const commands = useMemo<CommandItem[]>(() => {
		const go = (path: string) => () => {
			navigate(path);
			close();
		};

		const navigationCommands = [...navItems, ...adminItems].map((item) => ({
			id: `nav-${item.id}`,
			category: 'navigation' as const,
			label: `Go to ${item.label}`,
			description: item.path,
			icon: item.icon,
			shortcut: NAV_SHORTCUTS[item.id] ?? 'G',
			keywords: [item.id, item.label.replace(/\s+/g, ' ')],
			run: go(item.path),
		}));

		const recentCommands = recentDocuments
			.map((doc, index) => {
				const title = doc.title ?? doc.name ?? 'Untitled document';
				const path = doc.path ?? (doc.id ? `/document/${doc.id}` : '/documents');
				return {
					id: `recent-${doc.id ?? path}-${index}`,
					category: 'recent' as const,
					label: title,
					description: path,
					icon: FileText,
					keywords: ['recent', 'document'],
					run: go(path),
				};
			});

		const actionCommands: CommandItem[] = [
			{
				id: 'action-upload-document',
				category: 'actions',
				label: 'Upload Document',
				description: 'Open the upload dialog',
				icon: Upload,
				shortcut: 'U',
				keywords: ['upload', 'import', 'file'],
				run: () => {
					openModal('upload');
					close();
				},
			},
			{
				id: 'action-create-case',
				category: 'actions',
				label: 'Create Case',
				description: 'Open the case creation dialog',
				icon: Briefcase,
				shortcut: 'C',
				keywords: ['case', 'matter'],
				run: () => {
					openModal('create-case');
					close();
				},
			},
			{
				id: 'action-new-workflow',
				category: 'actions',
				label: 'New Workflow',
				description: 'Open workflow management',
				icon: Workflow,
				shortcut: 'W',
				keywords: ['automation', 'process'],
				run: go('/workflows'),
			},
			{
				id: 'action-scan-document',
				category: 'actions',
				label: 'Scan Document',
				description: 'Open the scanning interface',
				icon: ScanLine,
				shortcut: 'S',
				keywords: ['scan', 'ocr'],
				run: go('/scanning/interface'),
			},
			{
				id: 'action-create-api-key',
				category: 'actions',
				label: 'Create API Key',
				description: 'Open API key management',
				icon: Key,
				keywords: ['api', 'key', 'token', 'credential'],
				run: go('/api-keys'),
			},
			{
				id: 'action-add-webhook',
				category: 'actions',
				label: 'Add Webhook',
				description: 'Open webhook management',
				icon: Webhook,
				keywords: ['webhook', 'integration', 'callback'],
				run: go('/webhooks'),
			},
			{
				id: 'action-rotate-encryption-key',
				category: 'actions',
				label: 'Rotate Encryption Key',
				description: 'Open encryption key management',
				icon: ShieldCheck,
				keywords: ['encryption', 'rotate', 'key', 'security'],
				run: go('/encryption'),
			},
			{
				id: 'action-apply-saved-search',
				category: 'actions',
				label: 'Apply Saved Search',
				description: 'Open search',
				icon: Search,
				keywords: ['saved search', 'filter', 'query'],
				run: go('/search'),
			},
		];

		const settingsCommands: CommandItem[] = [
			{
				id: 'settings-open',
				category: 'settings',
				label: 'Open Settings',
				description: 'Application preferences',
				icon: Settings,
				shortcut: 'G ,',
				keywords: ['preferences'],
				run: go('/settings'),
			},
			{
				id: 'settings-profile',
				category: 'settings',
				label: 'My Profile',
				description: 'Open user profile',
				icon: User,
				keywords: ['account', 'user'],
				run: () => {
					openModal('user-profile');
					close();
				},
			},
			{
				id: 'settings-shortcuts',
				category: 'settings',
				label: 'Keyboard Shortcuts',
				description: 'Show available shortcuts',
				icon: Keyboard,
				shortcut: '?',
				keywords: ['keys', 'help'],
				run: () => {
					close();
					setShortcutsHelpOpen(true);
				},
			},
		];

		return [...navigationCommands, ...recentCommands, ...actionCommands, ...settingsCommands];
	}, [close, navigate, openModal, recentDocuments, setShortcutsHelpOpen]);

	const filteredCommands = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		return commands.filter((item) => matchesCommand(item, normalizedQuery));
	}, [commands, query]);

	const groupedCommands = useMemo(() => {
		return (['navigation', 'recent', 'actions', 'settings'] as CommandCategory[])
			.map((category) => ({
				category,
				items: filteredCommands.filter((item) => item.category === category),
			}))
			.filter((group) => group.items.length > 0);
	}, [filteredCommands]);

	useEffect(() => {
		setSelectedIndex(0);
	}, [query]);

	useEffect(() => {
		if (selectedIndex > filteredCommands.length - 1) {
			setSelectedIndex(Math.max(filteredCommands.length - 1, 0));
		}
	}, [filteredCommands.length, selectedIndex]);

	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/85 px-4 py-20 backdrop-blur-sm"
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) close();
			}}
			role="dialog"
			aria-modal="true"
			aria-label="Command palette"
		>
			<div className="w-full max-w-2xl overflow-hidden rounded-lg border border-slate-700/80 bg-slate-925 shadow-2xl">
				<div className="relative border-b border-slate-800">
					<Search className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
					<input
						ref={inputRef}
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Escape') {
								event.preventDefault();
								close();
							}
							if (event.key === 'ArrowDown') {
								event.preventDefault();
								setSelectedIndex((index) => Math.min(index + 1, filteredCommands.length - 1));
							}
							if (event.key === 'ArrowUp') {
								event.preventDefault();
								setSelectedIndex((index) => Math.max(index - 1, 0));
							}
							if (event.key === 'Enter') {
								event.preventDefault();
								filteredCommands[selectedIndex]?.run();
							}
						}}
						className="h-16 w-full bg-transparent pl-14 pr-5 text-lg text-slate-100 outline-none placeholder:text-slate-500"
						placeholder="Search commands, pages, and documents..."
						aria-label="Search commands"
					/>
				</div>

				<div className="max-h-[60vh] overflow-y-auto py-3">
					{groupedCommands.length === 0 ? (
						<p className="px-5 py-8 text-center text-sm text-slate-500">No commands found</p>
					) : (
						groupedCommands.map((group) => (
							<div key={group.category} className="px-2 py-2">
								<p className="px-3 pb-2 text-2xs font-semibold uppercase tracking-wider text-slate-500">
									{CATEGORY_LABELS[group.category]}
								</p>
								<div className="space-y-1">
									{group.items.map((item) => {
										const globalIndex = filteredCommands.findIndex((command) => command.id === item.id);
										const Icon = item.icon;
										const selected = globalIndex === selectedIndex;

										return (
											<button
												key={item.id}
												type="button"
												onMouseEnter={() => setSelectedIndex(globalIndex)}
												onClick={item.run}
												className={cn(
													'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors',
													selected ? 'bg-slate-800 text-slate-100' : 'text-slate-300 hover:bg-slate-800/60'
												)}
											>
												<Icon className="h-4 w-4 flex-shrink-0 text-slate-400" aria-hidden="true" />
												<span className="min-w-0 flex-1">
													<span className="block truncate text-sm font-medium">{item.label}</span>
													{item.description && (
														<span className="block truncate text-xs text-slate-500">{item.description}</span>
													)}
												</span>
												{item.shortcut && (
													<kbd className="flex-shrink-0 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-2xs text-slate-500">
														{item.shortcut}
													</kbd>
												)}
											</button>
										);
									})}
								</div>
							</div>
						))
					)}
				</div>
			</div>
		</div>
	);
}
