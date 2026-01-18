// (c) Copyright Datacraft, 2026
import { motion } from 'framer-motion';
import {
	FileText,
	FolderOpen,
	GitBranch,
	HardDrive,
	TrendingUp,
	Clock,
	AlertCircle,
	ArrowUpRight,
	FileSearch,
	Loader2,
} from 'lucide-react';
import { formatBytes, formatRelativeTime, cn } from '@/lib/utils';
import { useDashboardStats, useRecentActivity, useDashboardPendingTasks } from '@/features/dashboard';

const containerVariants = {
	hidden: { opacity: 0 },
	visible: {
		opacity: 1,
		transition: { staggerChildren: 0.1 },
	},
};

const itemVariants = {
	hidden: { opacity: 0, y: 20 },
	visible: { opacity: 1, y: 0 },
};

export function Dashboard() {
	const { data: stats, isLoading: statsLoading } = useDashboardStats();
	const { data: activityData, isLoading: activityLoading } = useRecentActivity(5);
	const { data: tasksData, isLoading: tasksLoading } = useDashboardPendingTasks();

	const activity = activityData?.items ?? [];
	const pendingTasks = tasksData?.tasks ?? [];

	// Default stats when loading
	const displayStats = stats ?? {
		totalDocuments: 0,
		documentsThisMonth: 0,
		pendingTasks: 0,
		storageUsedBytes: 0,
		storageQuotaBytes: 1,
		activeWorkflows: 0,
		ocrProcessed: 0,
	};

	const storagePercentage = displayStats.storageQuotaBytes > 0
		? (displayStats.storageUsedBytes / displayStats.storageQuotaBytes) * 100
		: 0;

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			className="space-y-6"
		>
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Dashboard
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Welcome back. Here's your document management overview.
					</p>
				</div>
			</div>

			{/* Stats grid */}
			<motion.div
				variants={itemVariants}
				className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
			>
				{/* Total Documents */}
				<div className="stat-card group">
					<div className="flex items-start justify-between">
						<div>
							<p className="text-sm text-slate-500">Total Documents</p>
							{statsLoading ? (
								<Loader2 className="w-6 h-6 animate-spin text-slate-500 mt-2" />
							) : (
								<>
									<p className="mt-2 text-3xl font-display font-semibold text-slate-100">
										{displayStats.totalDocuments.toLocaleString()}
									</p>
									<p className="mt-1 flex items-center gap-1 text-xs text-emerald-400">
										<TrendingUp className="w-3 h-3" />
										+{displayStats.documentsThisMonth} this month
									</p>
								</>
							)}
						</div>
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400 group-hover:bg-brass-500/20 transition-colors">
							<FileText className="w-5 h-5" />
						</div>
					</div>
				</div>

				{/* Active Workflows */}
				<div className="stat-card group">
					<div className="flex items-start justify-between">
						<div>
							<p className="text-sm text-slate-500">Active Workflows</p>
							{statsLoading ? (
								<Loader2 className="w-6 h-6 animate-spin text-slate-500 mt-2" />
							) : (
								<>
									<p className="mt-2 text-3xl font-display font-semibold text-slate-100">
										{displayStats.activeWorkflows}
									</p>
									<p className="mt-1 flex items-center gap-1 text-xs text-brass-400">
										<Clock className="w-3 h-3" />
										{displayStats.pendingTasks} pending tasks
									</p>
								</>
							)}
						</div>
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400 group-hover:bg-brass-500/20 transition-colors">
							<GitBranch className="w-5 h-5" />
						</div>
					</div>
				</div>

				{/* OCR Processed */}
				<div className="stat-card group">
					<div className="flex items-start justify-between">
						<div>
							<p className="text-sm text-slate-500">OCR Processed</p>
							{statsLoading ? (
								<Loader2 className="w-6 h-6 animate-spin text-slate-500 mt-2" />
							) : (
								<>
									<p className="mt-2 text-3xl font-display font-semibold text-slate-100">
										{displayStats.ocrProcessed.toLocaleString()}
									</p>
									<p className="mt-1 text-xs text-slate-500">
										Documents this month
									</p>
								</>
							)}
						</div>
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400 group-hover:bg-brass-500/20 transition-colors">
							<FileSearch className="w-5 h-5" />
						</div>
					</div>
				</div>

				{/* Storage */}
				<div className="stat-card group">
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<p className="text-sm text-slate-500">Storage Used</p>
							{statsLoading ? (
								<Loader2 className="w-6 h-6 animate-spin text-slate-500 mt-2" />
							) : (
								<>
									<p className="mt-2 text-3xl font-display font-semibold text-slate-100">
										{formatBytes(displayStats.storageUsedBytes)}
									</p>
									<div className="mt-3">
										<div className="progress-bar">
											<div
												className="progress-bar-fill"
												style={{ width: `${storagePercentage}%` }}
											/>
										</div>
										<p className="mt-1 text-xs text-slate-500">
											{storagePercentage.toFixed(1)}% of {formatBytes(displayStats.storageQuotaBytes)}
										</p>
									</div>
								</>
							)}
						</div>
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400 group-hover:bg-brass-500/20 transition-colors">
							<HardDrive className="w-5 h-5" />
						</div>
					</div>
				</div>
			</motion.div>

			{/* Main content grid */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Pending Tasks */}
				<motion.div variants={itemVariants} className="lg:col-span-2 glass-card">
					<div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
						<h2 className="font-display font-semibold text-slate-100">Pending Tasks</h2>
						<a href="/workflows" className="flex items-center gap-1 text-sm text-brass-400 hover:text-brass-300">
							View all <ArrowUpRight className="w-4 h-4" />
						</a>
					</div>
					<div className="divide-y divide-slate-800/50">
						{tasksLoading ? (
							<div className="p-8 flex items-center justify-center">
								<Loader2 className="w-6 h-6 animate-spin text-slate-500" />
							</div>
						) : pendingTasks.length === 0 ? (
							<div className="p-8 text-center text-slate-500">
								No pending tasks
							</div>
						) : (
							pendingTasks.slice(0, 3).map((task, idx) => (
								<motion.div
									key={task.id}
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: 0.1 * idx }}
									className="p-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
								>
									<div className="flex items-start gap-4">
										<div className={cn(
											'mt-0.5 p-1.5 rounded-lg',
											task.priority === 'high' ? 'bg-red-500/10 text-red-400' :
											task.priority === 'urgent' ? 'bg-orange-500/10 text-orange-400' :
											'bg-slate-700/50 text-slate-400'
										)}>
											<AlertCircle className="w-4 h-4" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-slate-200 truncate">
												{task.documentTitle}
											</p>
											<p className="mt-1 text-xs text-slate-500">
												{task.workflowName} • {task.stepName}
											</p>
										</div>
										<div className="text-right">
											<span className={cn(
												'badge',
												task.priority === 'high' ? 'badge-red' :
												task.priority === 'urgent' ? 'badge-brass' :
												'badge-gray'
											)}>
												{task.priority}
											</span>
											{task.deadline && (
												<p className="mt-1 text-xs text-slate-500">
													Due {formatRelativeTime(task.deadline)}
												</p>
											)}
										</div>
									</div>
								</motion.div>
							))
						)}
					</div>
				</motion.div>

				{/* Recent Activity */}
				<motion.div variants={itemVariants} className="glass-card">
					<div className="p-4 border-b border-slate-700/50">
						<h2 className="font-display font-semibold text-slate-100">Recent Activity</h2>
					</div>
					<div className="divide-y divide-slate-800/50">
						{activityLoading ? (
							<div className="p-8 flex items-center justify-center">
								<Loader2 className="w-6 h-6 animate-spin text-slate-500" />
							</div>
						) : activity.length === 0 ? (
							<div className="p-8 text-center text-slate-500">
								No recent activity
							</div>
						) : (
							activity.map((item, idx) => (
								<motion.div
									key={item.id}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									transition={{ delay: 0.05 * idx }}
									className="p-4 hover:bg-slate-800/30 transition-colors"
								>
									<div className="flex items-start gap-3">
										<div className={cn(
											'mt-0.5 w-2 h-2 rounded-full',
											item.type === 'document_uploaded' ? 'bg-emerald-400' :
											item.type === 'workflow_completed' ? 'bg-brass-400' :
											item.type === 'form_extracted' ? 'bg-blue-400' :
											'bg-slate-400'
										)} />
										<div className="flex-1 min-w-0">
											<p className="text-sm text-slate-300 truncate">
												{item.description}
											</p>
											<p className="mt-1 text-xs text-slate-500">
												{item.userName} • {formatRelativeTime(item.timestamp)}
											</p>
										</div>
									</div>
								</motion.div>
							))
						)}
					</div>
				</motion.div>
			</div>

			{/* Quick actions */}
			<motion.div variants={itemVariants} className="glass-card p-4">
				<h2 className="font-display font-semibold text-slate-100 mb-4">Quick Actions</h2>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{[
						{ icon: FileText, label: 'Upload Document', href: '/documents?action=upload' },
						{ icon: FolderOpen, label: 'Create Folder', href: '/documents?action=create-folder' },
						{ icon: GitBranch, label: 'Start Workflow', href: '/workflows' },
						{ icon: FileSearch, label: 'Extract Forms', href: '/forms' },
					].map((action) => (
						<a
							key={action.label}
							href={action.href}
							className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 hover:border-brass-500/30 transition-all group"
						>
							<action.icon className="w-6 h-6 text-slate-400 group-hover:text-brass-400 transition-colors" />
							<span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
								{action.label}
							</span>
						</a>
					))}
				</div>
			</motion.div>
		</motion.div>
	);
}
