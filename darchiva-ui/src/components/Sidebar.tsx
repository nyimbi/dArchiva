// (c) Copyright Datacraft, 2026
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';
import { AnimatePresence,motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  CalendarClock,
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
  Workflow,
  LayoutTemplate,
  Search,
  Settings,
  Share2,
  Shield,
  ShieldAlert,
  Timer,
  TrendingUp,
  Upload,
  Users,
  Webhook,
  Zap,
} from 'lucide-react';
import { useBranding } from '@/hooks/useBranding';
import { Link,useLocation } from 'react-router-dom';

const navItems = [
	{ id: 'home', label: 'Home', icon: Home, path: '/' },
	{ id: 'inbox', label: 'Inbox', icon: Inbox, path: '/inbox' },
	{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
	{ id: 'documents', label: 'Documents', icon: FolderTree, path: '/documents' },
	{ id: 'search', label: 'Search', icon: Search, path: '/search' },
	{ id: 'shared', label: 'Shared Documents', icon: Share2, path: '/shared' },
	{ id: 'scanning', label: 'Scanning Projects', icon: ScanLine, path: '/scanning-projects' },
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
];

const adminItems = [
	{ id: 'agents', label: 'Scan Agents', icon: MonitorPlay, path: '/agents' },
	{ id: 'retention', label: 'Retention', icon: Timer, path: '/retention' },
	{ id: 'webhooks', label: 'Webhooks', icon: Webhook, path: '/webhooks' },
	{ id: 'email-ingest', label: 'Email Ingest', icon: Mail, path: '/settings/email-ingest' },
	{ id: 'admin-users', label: 'Users', icon: Users, path: '/admin/users' },
	{ id: 'api-keys', label: 'API Keys', icon: Key, path: '/api-keys' },
	{ id: 'system', label: 'System Health', icon: Activity, path: '/system' },
	{ id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
	{ id: 'audit', label: 'Audit Logs', icon: History, path: '/audit' },
	{ id: 'encryption', label: 'Encryption', icon: Shield, path: '/encryption' },
	{ id: 'data-export', label: 'Data Export', icon: DatabaseZap, path: '/admin/data-export' },
	{ id: 'superadmin', label: 'Super Admin', icon: ShieldAlert, path: '/superadmin' },
];

export function Sidebar() {
	const location = useLocation();
	const { sidebarCollapsed, toggleSidebar, pendingTasks } = useStore();

	return (
		<motion.aside
			initial={false}
			animate={{ width: sidebarCollapsed ? 64 : 256 }}
			transition={{ duration: 0.3, ease: 'easeInOut' }}
			className="fixed left-0 top-0 h-screen bg-slate-925 border-r border-slate-800/50 z-40 flex flex-col"
		>
			{/* Logo */}
			<div className="h-16 flex items-center px-4 border-b border-slate-800/50">
				<Link to="/" className="flex items-center gap-3" aria-label="dArchiva Home">
					<div className="w-8 h-8 rounded-lg bg-brass-500 flex items-center justify-center" aria-hidden="true">
						<FileText className="w-5 h-5 text-slate-900" />
					</div>
					<AnimatePresence>
						{!sidebarCollapsed && (
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
			</div>

			{/* Navigation */}
			<nav className="flex-1 py-4 px-2 overflow-y-auto">
				<div className="space-y-1">
					{navItems.map((item) => {
						const isActive = location.pathname === item.path;
						const Icon = item.icon;
						const taskCount = item.id === 'workflows' ? pendingTasks.length : 0;

						return (
							<Link
								key={item.id}
								to={item.path}
								className={cn(
									'nav-item relative',
									isActive && 'active'
								)}
								aria-label={item.label}
							>
								<Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
								<AnimatePresence>
									{!sidebarCollapsed && (
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
											sidebarCollapsed ? 'top-0 right-0' : 'right-2'
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
				<div className="mt-8 pt-4 border-t border-slate-800/50">
					<AnimatePresence>
						{!sidebarCollapsed && (
							<motion.p
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								className="px-3 mb-2 text-2xs font-semibold uppercase tracking-wider text-slate-600"
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
									className={cn(
										'nav-item',
										isActive && 'active'
									)}
									aria-label={item.label}
								>
									<Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
									<AnimatePresence>
										{!sidebarCollapsed && (
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

			{/* Collapse button */}
			<div className="p-2 border-t border-slate-800/50">
				<button
					onClick={toggleSidebar}
					className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
					aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
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
