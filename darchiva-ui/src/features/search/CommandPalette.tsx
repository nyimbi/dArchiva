// (c) Copyright Datacraft, 2026
/**
 * CommandPalette — full-screen overlay modal for keyboard-driven navigation.
 *
 * Props:
 *   open    — controlled open state (parent manages toggle, e.g. Cmd+K)
 *   onClose — called on Escape or backdrop click
 *
 * Keyboard: ArrowUp/ArrowDown navigate, Enter executes, Escape closes.
 */
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
	BarChart2,
	BookOpen,
	ChevronRight,
	Clock,
	FileText,
	FolderOpen,
	GitBranch,
	Inbox,
	Key,
	LayoutDashboard,
	Link2,
	Lock,
	Mail,
	ScanLine,
	Search,
	Settings,
	Shield,
	Upload,
	Workflow,
	X,
	Zap,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type CommandCategory = 'navigate' | 'action' | 'recent';

interface Command {
	id: string;
	category: CommandCategory;
	label: string;
	description?: string;
	icon: React.ReactNode;
	shortcut?: string;
	keywords?: string[];
	onExecute: () => void;
}

interface RecentDoc {
	id: string;
	title: string;
	path: string;
	visitedAt: number;
}

// ---------------------------------------------------------------------------
// Recent documents helpers (written externally when navigating to a document)
// ---------------------------------------------------------------------------

const RECENT_DOCS_KEY = 'darchiva_recent_docs';
const MAX_RECENT = 5;

function readRecentDocs(): RecentDoc[] {
	try {
		const raw = localStorage.getItem(RECENT_DOCS_KEY);
		if (!raw) return [];
		return (JSON.parse(raw) as RecentDoc[]).slice(0, MAX_RECENT);
	} catch {
		return [];
	}
}

// ---------------------------------------------------------------------------
// Static commands
// ---------------------------------------------------------------------------

function useStaticCommands(onClose: () => void): Command[] {
	const navigate = useNavigate();

	const go = useCallback(
		(path: string) => () => {
			navigate(path);
			onClose();
		},
		[navigate, onClose],
	);

	return useMemo<Command[]>(
		() => [
			// Navigation
			{
				id: 'nav-dashboard',
				category: 'navigate',
				label: 'Go to Dashboard',
				description: 'Overview and recent activity',
				icon: <LayoutDashboard className="w-4 h-4" />,
				shortcut: 'G D',
				keywords: ['home', 'overview'],
				onExecute: go('/dashboard'),
			},
			{
				id: 'nav-documents',
				category: 'navigate',
				label: 'Go to Documents',
				description: 'Browse document library',
				icon: <FolderOpen className="w-4 h-4" />,
				shortcut: 'G O',
				keywords: ['files', 'docs', 'library'],
				onExecute: go('/documents'),
			},
			{
				id: 'nav-search',
				category: 'navigate',
				label: 'Go to Search',
				description: 'Advanced search with faceted filters',
				icon: <Search className="w-4 h-4" />,
				shortcut: 'G S',
				keywords: ['find', 'lookup', 'filter'],
				onExecute: go('/search'),
			},
			{
				id: 'nav-scanning',
				category: 'navigate',
				label: 'Go to Scanning',
				description: 'Scanning projects and station',
				icon: <ScanLine className="w-4 h-4" />,
				shortcut: 'G C',
				keywords: ['scan', 'ocr', 'batch'],
				onExecute: go('/scanning-projects'),
			},
			{
				id: 'nav-inbox',
				category: 'navigate',
				label: 'Go to Inbox',
				description: 'Pending review items',
				icon: <Inbox className="w-4 h-4" />,
				shortcut: 'G I',
				onExecute: go('/inbox'),
			},
			{
				id: 'nav-workflows',
				category: 'navigate',
				label: 'Go to Workflows',
				description: 'Document processing workflows',
				icon: <Workflow className="w-4 h-4" />,
				shortcut: 'G W',
				onExecute: go('/workflows'),
			},
			{
				id: 'nav-analytics',
				category: 'navigate',
				label: 'Go to Analytics',
				description: 'Reports and quality metrics',
				icon: <BarChart2 className="w-4 h-4" />,
				keywords: ['reports', 'stats', 'metrics'],
				onExecute: go('/dashboard'),
			},
			{
				id: 'nav-ingestion',
				category: 'navigate',
				label: 'Go to Ingestion',
				description: 'Email and connector ingestion',
				icon: <Mail className="w-4 h-4" />,
				onExecute: go('/ingestion'),
			},
			{
				id: 'nav-routing',
				category: 'navigate',
				label: 'Go to Auto-Routing',
				description: 'Document routing rules',
				icon: <GitBranch className="w-4 h-4" />,
				onExecute: go('/auto-routing'),
			},
			{
				id: 'nav-audit',
				category: 'navigate',
				label: 'Go to Audit Logs',
				description: 'System-wide audit trail',
				icon: <BookOpen className="w-4 h-4" />,
				keywords: ['log', 'history', 'trail'],
				onExecute: go('/audit'),
			},
			{
				id: 'nav-retention',
				category: 'navigate',
				label: 'Go to Retention Policies',
				description: 'Document retention management',
				icon: <Key className="w-4 h-4" />,
				onExecute: go('/retention'),
			},
			{
				id: 'nav-webhooks',
				category: 'navigate',
				label: 'Go to Webhooks',
				description: 'Outbound webhook configuration',
				icon: <Link2 className="w-4 h-4" />,
				onExecute: go('/webhooks'),
			},
			{
				id: 'nav-encryption',
				category: 'navigate',
				label: 'Go to Encryption',
				description: 'Key management and encryption',
				icon: <Lock className="w-4 h-4" />,
				onExecute: go('/encryption'),
			},
			{
				id: 'nav-security',
				category: 'navigate',
				label: 'Go to Security',
				description: 'Security settings and access control',
				icon: <Shield className="w-4 h-4" />,
				onExecute: go('/security'),
			},
			{
				id: 'nav-settings',
				category: 'navigate',
				label: 'Go to Settings',
				description: 'Application preferences',
				icon: <Settings className="w-4 h-4" />,
				shortcut: 'G ,',
				onExecute: go('/settings'),
			},
			// Actions
			{
				id: 'action-upload',
				category: 'action',
				label: 'Upload Document',
				description: 'Upload a new document to the library',
				icon: <Upload className="w-4 h-4" />,
				shortcut: 'U',
				keywords: ['import', 'add', 'new'],
				onExecute: go('/documents'),
			},
			{
				id: 'action-new-template',
				category: 'action',
				label: 'New Template',
				description: 'Create a new document template',
				icon: <FileText className="w-4 h-4" />,
				keywords: ['form', 'template', 'create'],
				onExecute: go('/forms'),
			},
			{
				id: 'action-new-workflow',
				category: 'action',
				label: 'New Workflow',
				description: 'Design a new processing workflow',
				icon: <Zap className="w-4 h-4" />,
				keywords: ['automation', 'pipeline', 'create'],
				onExecute: go('/workflows'),
			},
			{
				id: 'action-new-scan',
				category: 'action',
				label: 'New Scanning Project',
				description: 'Create a scanning batch project',
				icon: <ScanLine className="w-4 h-4" />,
				keywords: ['scan', 'batch', 'create'],
				onExecute: go('/scanning-projects'),
			},
		],
		[go],
	);
}

// ---------------------------------------------------------------------------
// Fuzzy filter — non-contiguous character match on label + description + keywords
// ---------------------------------------------------------------------------

function fuzzyScore(query: string, cmd: Command): number {
	if (!query) return 1;
	const q = query.toLowerCase();
	const haystack = [cmd.label, cmd.description ?? '', ...(cmd.keywords ?? [])].join(' ').toLowerCase();

	// Exact substring gets highest score
	if (haystack.includes(q)) return 2;

	// Non-contiguous character match
	let qi = 0;
	for (let i = 0; i < haystack.length && qi < q.length; i++) {
		if (haystack[i] === q[qi]) qi++;
	}
	return qi === q.length ? 1 : 0;
}

// ---------------------------------------------------------------------------
// CommandPalette
// ---------------------------------------------------------------------------

export interface CommandPaletteProps {
	open: boolean;
	onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
	const [query, setQuery] = useState('');
	const [activeIdx, setActiveIdx] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	const staticCommands = useStaticCommands(onClose);

	// Recent docs as commands — re-read each time palette opens
	const recentCommands = useMemo<Command[]>(() => {
		if (!open) return [];
		return readRecentDocs().map(doc => ({
			id: `recent-${doc.id}`,
			category: 'recent' as CommandCategory,
			label: doc.title,
			description: 'Recent document',
			icon: <Clock className="w-4 h-4" />,
			keywords: [],
			onExecute: () => {
				// onClose handled by parent's navigate effect
				window.location.href = doc.path;
				onClose();
			},
		}));
	}, [open, onClose]);

	const allCommands = useMemo(
		() => [...recentCommands, ...staticCommands],
		[recentCommands, staticCommands],
	);

	const filtered = useMemo(() => {
		const q = query.trim();
		if (!q) return allCommands;
		return allCommands
			.map(cmd => ({ cmd, score: fuzzyScore(q, cmd) }))
			.filter(({ score }) => score > 0)
			.sort((a, b) => b.score - a.score)
			.map(({ cmd }) => cmd);
	}, [allCommands, query]);

	// Group filtered results
	const grouped = useMemo(() => {
		const order: CommandCategory[] = ['recent', 'navigate', 'action'];
		const labels: Record<CommandCategory, string> = {
			recent: 'Recent Documents',
			navigate: 'Navigation',
			action: 'Actions',
		};
		const map = new Map<CommandCategory, Command[]>();
		for (const cmd of filtered) {
			if (!map.has(cmd.category)) map.set(cmd.category, []);
			map.get(cmd.category)!.push(cmd);
		}
		return order
			.filter(cat => map.has(cat))
			.map(cat => ({ heading: labels[cat], items: map.get(cat)! }));
	}, [filtered]);

	const flatItems = useMemo(() => grouped.flatMap(g => g.items), [grouped]);

	// Reset on open
	useEffect(() => {
		if (open) {
			setQuery('');
			setActiveIdx(0);
			setTimeout(() => inputRef.current?.focus(), 20);
		}
	}, [open]);

	// Clamp active index when filtered set changes
	useEffect(() => {
		setActiveIdx(idx => Math.min(idx, Math.max(0, flatItems.length - 1)));
	}, [flatItems.length]);

	// Scroll active item into view
	useEffect(() => {
		const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`);
		el?.scrollIntoView({ block: 'nearest' });
	}, [activeIdx]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === 'ArrowDown') {
				e.preventDefault();
				setActiveIdx(i => Math.min(i + 1, flatItems.length - 1));
			} else if (e.key === 'ArrowUp') {
				e.preventDefault();
				setActiveIdx(i => Math.max(i - 1, 0));
			} else if (e.key === 'Enter') {
				e.preventDefault();
				flatItems[activeIdx]?.onExecute();
			} else if (e.key === 'Escape') {
				onClose();
			}
		},
		[flatItems, activeIdx, onClose],
	);

	// Global Escape fallback
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, [open, onClose]);

	let flatCursor = 0;

	return (
		<AnimatePresence>
			{open && (
				<>
					{/* Backdrop */}
					<motion.div
						key="cp-backdrop"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
						className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-sm"
						onClick={onClose}
					/>

					{/* Panel */}
					<motion.div
						key="cp-panel"
						initial={{ opacity: 0, scale: 0.96, y: -12 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.96, y: -12 }}
						transition={{ duration: 0.15, ease: 'easeOut' }}
						className="fixed left-1/2 top-[15vh] z-[101] w-full max-w-xl -translate-x-1/2"
					>
						<div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
							{/* Search input */}
							<div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
								<Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
								<input
									ref={inputRef}
									type="text"
									value={query}
									onChange={e => {
										setQuery(e.target.value);
										setActiveIdx(0);
									}}
									onKeyDown={handleKeyDown}
									placeholder="Search commands…"
									className="flex-1 bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none"
								/>
								{query ? (
									<button
										onClick={() => setQuery('')}
										className="flex-shrink-0 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
									>
										<X className="w-3.5 h-3.5" />
									</button>
								) : (
									<button
										onClick={onClose}
										className="flex-shrink-0 p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
									>
										<X className="w-4 h-4" />
									</button>
								)}
							</div>

							{/* Results */}
							<div ref={listRef} className="overflow-y-auto flex-1 py-2">
								{flatItems.length === 0 ? (
									<div className="flex flex-col items-center justify-center py-10 text-center">
										<Search className="w-8 h-8 text-slate-700 mb-3" />
										<p className="text-sm text-slate-500">
											{query ? `No commands match "${query}"` : 'No commands available'}
										</p>
									</div>
								) : (
									grouped.map(group => {
										const groupStart = flatCursor;
										flatCursor += group.items.length;
										return (
											<div key={group.heading}>
												<div className="px-4 py-1.5">
													<span className="text-2xs font-semibold uppercase tracking-widest text-slate-600">
														{group.heading}
													</span>
												</div>
												{group.items.map((cmd, localIdx) => {
													const globalIdx = groupStart + localIdx;
													const isActive = globalIdx === activeIdx;
													return (
														<CommandItem
															key={cmd.id}
															cmd={cmd}
															isActive={isActive}
															dataIdx={globalIdx}
															onMouseEnter={() => setActiveIdx(globalIdx)}
														/>
													);
												})}
											</div>
										);
									})
								)}
							</div>

							{/* Footer hint */}
							<div className="flex items-center gap-4 px-4 py-2 border-t border-slate-800 text-2xs text-slate-600">
								<span className="flex items-center gap-1">
									<kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">↑↓</kbd>
									navigate
								</span>
								<span className="flex items-center gap-1">
									<kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">↵</kbd>
									open
								</span>
								<span className="flex items-center gap-1">
									<kbd className="px-1 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">Esc</kbd>
									close
								</span>
							</div>
						</div>
					</motion.div>
				</>
			)}
		</AnimatePresence>
	);
}

// ---------------------------------------------------------------------------
// CommandItem
// ---------------------------------------------------------------------------

interface CommandItemProps {
	cmd: Command;
	isActive: boolean;
	dataIdx: number;
	onMouseEnter: () => void;
}

function CommandItem({ cmd, isActive, dataIdx, onMouseEnter }: CommandItemProps) {
	return (
		<button
			data-idx={dataIdx}
			onMouseEnter={onMouseEnter}
			onClick={cmd.onExecute}
			className={cn(
				'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
				isActive ? 'bg-slate-800/80' : 'hover:bg-slate-800/40',
			)}
		>
			<span className={cn(
				'flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors',
				isActive ? 'bg-brass-500/15 text-brass-400' : 'bg-slate-800 text-slate-500',
			)}>
				{cmd.icon}
			</span>

			<div className="flex-1 min-w-0">
				<div className={cn(
					'text-sm font-medium leading-snug',
					isActive ? 'text-slate-100' : 'text-slate-300',
				)}>
					{cmd.label}
				</div>
				{cmd.description && (
					<div className="text-xs text-slate-500 truncate">{cmd.description}</div>
				)}
			</div>

			<div className="flex items-center gap-2 flex-shrink-0">
				{cmd.shortcut && (
					<span className="text-2xs text-slate-600 font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/50">
						{cmd.shortcut}
					</span>
				)}
				{isActive && <ChevronRight className="w-3.5 h-3.5 text-brass-500/60" />}
			</div>
		</button>
	);
}
