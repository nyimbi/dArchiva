// (c) Copyright Datacraft, 2026
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
	LayoutDashboard,
	FolderTree,
	GitBranch,
	FileSearch,
	Briefcase,
	FolderKanban,
	Upload,
	Route,
	Settings,
	ChevronLeft,
	ChevronRight,
	FileText,
	Shield,
} from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';

const navItems = [
	{ id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
	{ id: 'documents', label: 'Documents', icon: FolderTree, path: '/documents' },
	{ id: 'workflows', label: 'Workflows', icon: GitBranch, path: '/workflows' },
	{ id: 'forms', label: 'Form Recognition', icon: FileSearch, path: '/forms' },
	{ id: 'cases', label: 'Cases', icon: Briefcase, path: '/cases' },
	{ id: 'portfolios', label: 'Portfolios', icon: FolderKanban, path: '/portfolios' },
	{ id: 'ingestion', label: 'Ingestion', icon: Upload, path: '/ingestion' },
	{ id: 'routing', label: 'Auto-Routing', icon: Route, path: '/routing' },
];

const adminItems = [
	{ id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
	{ id: 'encryption', label: 'Encryption', icon: Shield, path: '/encryption' },
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
				<Link to="/" className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-brass-500 flex items-center justify-center">
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
							>
								<Icon className="w-5 h-5 flex-shrink-0" />
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
								>
									<Icon className="w-5 h-5 flex-shrink-0" />
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
				>
					{sidebarCollapsed ? (
						<ChevronRight className="w-5 h-5" />
					) : (
						<ChevronLeft className="w-5 h-5" />
					)}
				</button>
			</div>
		</motion.aside>
	);
}
