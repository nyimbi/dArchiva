// (c) Copyright Datacraft, 2026
import { useNotificationStore } from '@/features/notifications/store';
import type { NotificationConnectionStatus } from '@/features/notifications/types';
import { useStore } from '@/hooks/useStore';
import { apiClient } from '@/lib/api-client';
import { cn, formatBytes } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence,motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  CalendarClock,
  CreditCard,
  DatabaseZap,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FileText,
  FolderKanban,
  FolderTree,
  GitBranch,
  History,
  Home,
  Inbox,
  Key,
  LayoutDashboard,
  Mail,
  MonitorDot,
  MonitorPlay,
  Plug,
  Route,
  ScanLine,
  ShieldCheck,
  Workflow,
  LayoutTemplate,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  Tag,
  Timer,
  TrendingUp,
  Upload,
  UserCog,
  UserCircle,
  Users,
  Webhook,
  Zap,
  BookOpen,
  Scale,
  Hash,
  Package,
  Scissors,
  X,
} from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { Link,useLocation } from 'react-router-dom';

interface SidebarStorageStats {
	usedBytes: number;
	totalBytes: number;
}

interface SidebarQueueStats {
	name: string;
	pending: number;
}

interface SidebarStats {
	documents: number;
	storage: SidebarStorageStats;
	pendingOcrTasks: number;
}

interface StorageStatsResponse {
	usedBytes?: number;
	totalBytes?: number;
	usedStorageBytes?: number;
	totalStorageBytes?: number;
	storage?: {
		usedBytes?: number;
		totalBytes?: number;
		usedStorageBytes?: number;
		totalStorageBytes?: number;
	};
}

const API_BASE = '/api/v1';
const TOKEN_KEY = 'darchiva_token';

function authHeaders(): HeadersInit {
	const token = localStorage.getItem(TOKEN_KEY);
	return token ? { Authorization: `Bearer ${token}` } : {};
}

function headerNumber(headers: Headers, names: string[]): number | null {
	for (const name of names) {
		const value = headers.get(name);
		if (!value) continue;
		const parsed = Number.parseInt(value, 10);
		if (Number.isFinite(parsed)) return parsed;
	}
	return null;
}

async function fetchDocumentCount(): Promise<number> {
	const response = await fetch(`${API_BASE}/nodes/?ctype=document&page_size=1`, {
		headers: authHeaders(),
	});
	if (!response.ok) return 0;

	const count = headerNumber(response.headers, ['totalCount', 'total-count', 'x-total-count', 'X-Total-Count']);
	if (count !== null) return count;

	const body = await response.json().catch(() => undefined) as
		| { totalCount?: number; total?: number; count?: number }
		| undefined;
	return body?.totalCount ?? body?.total ?? body?.count ?? 0;
}

function normalizeStorageStats(data: StorageStatsResponse): SidebarStorageStats {
	const source = data.storage ?? data;
	return {
		usedBytes: source.usedBytes ?? source.usedStorageBytes ?? 0,
		totalBytes: source.totalBytes ?? source.totalStorageBytes ?? 0,
	};
}

async function fetchStorageStats(): Promise<SidebarStorageStats> {
	try {
		const { data } = await apiClient.get<StorageStatsResponse>('/system/storage');
		return normalizeStorageStats(data);
	} catch {
		const { data } = await apiClient.get<StorageStatsResponse>('/settings/storage');
		return normalizeStorageStats(data);
	}
}

async function fetchPendingOcrTasks(): Promise<number> {
	const { data } = await apiClient.get<SidebarQueueStats[]>('/system/queues');
	return data
		.filter((queue) => queue.name.toLowerCase().includes('ocr'))
		.reduce((sum, queue) => sum + queue.pending, 0);
}

async function fetchSidebarStats(): Promise<SidebarStats> {
	const [documents, storage, pendingOcrTasks] = await Promise.all([
		fetchDocumentCount(),
		fetchStorageStats(),
		fetchPendingOcrTasks(),
	]);
	return { documents, storage, pendingOcrTasks };
}

export const navItems = [
	{ id: 'home', label: 'Home', icon: Home, path: '/' },
	{ id: 'inbox', label: 'Inbox', icon: Inbox, path: '/inbox' },
	{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
	{ id: 'documents', label: 'Documents', icon: FolderTree, path: '/documents' },
	{ id: 'search', label: 'Search', icon: Search, path: '/search' },
	{ id: 'shared', label: 'Shared Documents', icon: Share2, path: '/shared' },
	{ id: 'scanning', label: 'Scanning Projects', icon: ScanLine, path: '/scanning-projects' },
	{ id: 'segmentation', label: 'Segmentation', icon: Scissors, path: '/segmentation' },
	{ id: 'supervisor', label: 'Supervisor', icon: MonitorDot, path: '/supervisor' },
	{ id: 'workflows', label: 'Workflows', icon: GitBranch, path: '/workflows' },
	{ id: 'forms', label: 'Form Recognition', icon: FileSearch, path: '/forms' },
	{ id: 'cases', label: 'Cases', icon: Briefcase, path: '/cases' },
	{ id: 'portfolios', label: 'Portfolios', icon: FolderKanban, path: '/portfolios' },
	{ id: 'ingestion', label: 'Ingestion', icon: Upload, path: '/ingestion' },
	{ id: 'ingestion-dashboard', label: 'Ingestion Sources', icon: ArrowDownToLine, path: '/ingestion/dashboard' },
	{ id: 'routing', label: 'Auto-Routing', icon: Route, path: '/routing' },
	{ id: 'auto-routing', label: 'Routing Rules', icon: Workflow, path: '/auto-routing' },
	{ id: 'exception-queue', label: 'Exception Queue', icon: AlertTriangle, path: '/exception-queue' },
	{ id: 'templates', label: 'Templates', icon: LayoutTemplate, path: '/templates' },
	{ id: 'connectors', label: 'Connectors', icon: Plug, path: '/connectors' },
	{ id: 'automation', label: 'Automation', icon: Zap, path: '/automation' },
	{ id: 'reports-scheduled', label: 'Scheduled Reports', icon: CalendarClock, path: '/reports/scheduled' },
	{ id: 'quality', label: 'Quality Control', icon: ShieldCheck, path: '/quality' },
	{ id: 'serial-numbers', label: 'Serial Numbers', icon: Hash, path: '/serial-numbers' },
	{ id: 'inventory', label: 'Inventory', icon: Package, path: '/inventory' },
];

export const adminItems = [
	{ id: 'profile', label: 'My Profile', icon: UserCircle, path: '/profile' },
	{ id: 'agents', label: 'Scan Agents', icon: MonitorPlay, path: '/agents' },
	{ id: 'compliance', label: 'Compliance', icon: Scale, path: '/compliance' },
	{ id: 'retention', label: 'Retention', icon: Timer, path: '/retention' },
	{ id: 'webhooks', label: 'Webhooks', icon: Webhook, path: '/webhooks' },
	{ id: 'email-ingest', label: 'Email Ingest', icon: Mail, path: '/settings/email-ingest' },
	{ id: 'tags', label: 'Tag Management', icon: Tag, path: '/tags' },
	{ id: 'admin-users', label: 'Users', icon: Users, path: '/admin/users' },
	{ id: 'billing', label: 'Billing & Cost', icon: CreditCard, path: '/billing' },
	{ id: 'api-keys', label: 'API Keys', icon: Key, path: '/api-keys' },
	{ id: 'system', label: 'System Health', icon: Activity, path: '/system' },
	{ id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
	{ id: 'audit', label: 'Audit Logs', icon: History, path: '/audit' },
	{ id: 'encryption', label: 'Encryption', icon: Shield, path: '/encryption' },
	{ id: 'iam', label: 'IAM', icon: UserCog, path: '/iam' },
	{ id: 'data-export', label: 'Data Export', icon: DatabaseZap, path: '/admin/data-export' },
	{ id: 'superadmin', label: 'Super Admin', icon: ShieldAlert, path: '/superadmin' },
	{ id: 'onboarding', label: 'Onboarding', icon: BookOpen, path: '/onboarding' },
];

interface SidebarProps {
	onClose?: () => void;
}

const connectionDotClass: Record<NotificationConnectionStatus, string> = {
	connected: 'bg-emerald-400 shadow-[0_0_0_3px_rgba(52,211,153,0.14)]',
	reconnecting: 'bg-amber-400 shadow-[0_0_0_3px_rgba(251,191,36,0.14)]',
	disconnected: 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.14)]',
};

const connectionLabel: Record<NotificationConnectionStatus, string> = {
	connected: 'Notifications connected',
	reconnecting: 'Notifications reconnecting',
	disconnected: 'Notifications disconnected',
};

export function Sidebar({ onClose }: SidebarProps) {
	const location = useLocation();
	const { sidebarCollapsed, toggleSidebar, pendingTasks } = useStore();
	const connectionStatus = useNotificationStore(s => s.connectionStatus);
	const isMobileOverlay = Boolean(onClose);
	const collapsed = isMobileOverlay ? false : sidebarCollapsed;
	const { data: sidebarStats, isLoading: sidebarStatsLoading } = useQuery({
		queryKey: ['sidebar', 'stats'],
		queryFn: fetchSidebarStats,
		staleTime: 5 * 60 * 1000,
		retry: 1,
	});

	return (
		<motion.aside
			initial={false}
			animate={{ width: collapsed ? 64 : 256 }}
			transition={{ duration: 0.3, ease: 'easeInOut' }}
			className={cn(
				'left-0 top-0 h-screen bg-slate-925 border-r border-slate-800/50 flex flex-col',
				isMobileOverlay ? 'relative z-50 shadow-2xl' : 'fixed z-40'
			)}
		>
			{/* Logo */}
			<div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/50">
				<Link to="/" className="flex items-center gap-3" aria-label="dArchiva Home">
					<div className="w-8 h-8 rounded-lg bg-brass-500 flex items-center justify-center" aria-hidden="true">
						<FileText className="w-5 h-5 text-slate-900" />
					</div>
					<AnimatePresence>
						{!collapsed && (
							<motion.div
								initial={{ opacity: 0, x: -10 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -10 }}
								transition={{ duration: 0.2 }}
							>
								<span className="font-display text-xl font-semibold text-slate-100">
									dArchiva
								</span>
							</motion.div>
						)}
					</AnimatePresence>
				</Link>
				{onClose && (
					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
						aria-label="Close navigation menu"
					>
						<X className="w-5 h-5" aria-hidden="true" />
					</button>
				)}
			</div>

			{/* Navigation */}
			<nav className="flex-1 py-4 px-2 overflow-y-auto" role="navigation" aria-label="Main navigation">
				<div className="space-y-1">
					{navItems.map((item) => {
						const isActive = location.pathname === item.path;
						const Icon = item.icon;
						const taskCount = item.id === 'workflows' ? pendingTasks.length : 0;

						return (
							<Link
								key={item.id}
								to={item.path}
								onClick={onClose}
								className={cn(
									'nav-item relative',
									isActive && 'active'
								)}
								aria-label={item.label}
								aria-current={isActive ? 'page' : undefined}
							>
								<Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
								<AnimatePresence>
									{!collapsed && (
										<motion.span
											initial={{ opacity: 0 }}
											animate={{ opacity: 1 }}
											exit={{ opacity: 0 }}
											transition={{ duration: 0.15 }}
											className="truncate"
										>
											{item.label}
										</motion.span>
									)}
								</AnimatePresence>
								{taskCount > 0 && (
									<span
										className={cn(
											'absolute flex items-center justify-center min-w-5 h-5 text-2xs font-bold rounded-full',
											'bg-brass-500 text-slate-900',
											collapsed ? 'top-0 right-0' : 'right-2'
										)}
										aria-label={`${taskCount} pending tasks`}
									>
										{taskCount}
									</span>
								)}
							</Link>
						);
					})}
				</div>

				{/* Admin section */}
				<div className="mt-8 pt-4 border-t border-slate-800/50" role="navigation" aria-label="Administration">
					<AnimatePresence>
						{!collapsed && (
							<motion.p
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="px-3 mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-400"
							>
								Administration
							</motion.p>
						)}
					</AnimatePresence>
					<div className="space-y-1">
						{adminItems.map((item) => {
							const isActive = location.pathname === item.path;
							const Icon = item.icon;

							return (
								<Link
									key={item.id}
									to={item.path}
									onClick={onClose}
									className={cn(
										'nav-item',
										isActive && 'active'
									)}
									aria-label={item.label}
									aria-current={isActive ? 'page' : undefined}
								>
									<Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
									<AnimatePresence>
										{!collapsed && (
											<motion.span
												initial={{ opacity: 0 }}
												animate={{ opacity: 1 }}
												exit={{ opacity: 0 }}
												transition={{ duration: 0.15 }}
												className="truncate"
											>
												{item.label}
											</motion.span>
										)}
									</AnimatePresence>
								</Link>
							);
						})}
					</div>
				</div>
			</nav>

			{/* Sidebar stats + collapse button */}
			<div className={cn('p-2 border-t border-slate-800/50', isMobileOverlay && 'hidden')}>
				<AnimatePresence>
					{!collapsed && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
							transition={{ duration: 0.15 }}
							className="mb-2 rounded-lg bg-slate-900/70 px-3 py-2 text-2xs text-slate-400"
						>
							{sidebarStatsLoading ? (
								<span>Loading stats...</span>
							) : (
								<div className="space-y-1">
									<div className="flex items-center justify-between gap-3">
										<span>Documents</span>
										<span className="font-mono text-slate-400">{(sidebarStats?.documents ?? 0).toLocaleString()}</span>
									</div>
									<div className="flex items-center justify-between gap-3">
										<span>Storage</span>
										<span className="font-mono text-slate-400">
											{formatBytes(sidebarStats?.storage.usedBytes ?? 0)} / {formatBytes(sidebarStats?.storage.totalBytes ?? 0)}
										</span>
									</div>
									<div className="flex items-center justify-between gap-3">
										<span>Queue</span>
										<span className="font-mono text-slate-400">{sidebarStats?.pendingOcrTasks ?? 0}</span>
									</div>
								</div>
							)}
						</motion.div>
					)}
				</AnimatePresence>
				<div
					className={cn(
						'mb-2 flex items-center gap-2 px-2 text-2xs uppercase text-slate-400',
						collapsed && 'justify-center px-0'
					)}
					title={connectionLabel[connectionStatus]}
					aria-label={connectionLabel[connectionStatus]}
				>
					<span
						className={cn(
							'h-2.5 w-2.5 shrink-0 rounded-full',
							connectionStatus === 'reconnecting' && 'animate-pulse',
							connectionDotClass[connectionStatus]
						)}
						aria-hidden="true"
					/>
					{!collapsed && <span className="truncate">Realtime {connectionStatus}</span>}
				</div>
				<button
					onClick={toggleSidebar}
					className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
					aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
					aria-expanded={!sidebarCollapsed}
				>
					{sidebarCollapsed ? (
						<ChevronRight className="w-5 h-5" aria-hidden="true" />
					) : (
						<ChevronLeft className="w-5 h-5" aria-hidden="true" />
					)}
				</button>
			</div>
		</motion.aside>
	);
}
