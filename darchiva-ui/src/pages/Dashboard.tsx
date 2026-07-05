// (c) Copyright Datacraft, 2026
import { useDashboardPendingTasks, useDashboardStats } from '@/features/dashboard';
import { useActivityFeed } from '@/features/activity';
import { apiClient } from '@/lib/api-client';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
	AlertCircle,
	ArrowUpRight,
	CheckSquare,
	Clock,
	Cpu,
	FileSearch,
	FileText,
	FolderOpen,
	GitBranch,
	HardDrive,
	Inbox,
	Loader2,
	MessageSquare,
	PenTool,
	RefreshCw,
	ScanLine,
	Search,
	Shield,
	Tag,
	TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

function feedEventIcon(eventType: string) {
	const cls = 'w-3.5 h-3.5';
	if (eventType.includes('ocr'))       return <Cpu          className={cls} />;
	if (eventType.includes('classif'))   return <Tag          className={cls} />;
	if (eventType.includes('moved'))     return <FolderOpen   className={cls} />;
	if (eventType.includes('signed'))    return <PenTool      className={cls} />;
	if (eventType.includes('approved'))  return <CheckSquare  className={cls} />;
	if (eventType.includes('held'))      return <Shield       className={cls} />;
	if (eventType.includes('annotated')) return <MessageSquare className={cls} />;
	return <FileText className={cls} />;
}

function feedIconBg(eventType: string): string {
	if (eventType.includes('ocr'))       return 'bg-blue-500/10 text-blue-400';
	if (eventType.includes('classif'))   return 'bg-purple-500/10 text-purple-400';
	if (eventType.includes('moved'))     return 'bg-amber-500/10 text-amber-400';
	if (eventType.includes('signed'))    return 'bg-emerald-500/10 text-emerald-400';
	if (eventType.includes('approved'))  return 'bg-teal-500/10 text-teal-400';
	if (eventType.includes('held'))      return 'bg-red-500/10 text-red-400';
	if (eventType.includes('annotated')) return 'bg-sky-500/10 text-sky-400';
	return 'bg-brass-500/10 text-brass-400';
}

function RetryButton({ onRetry }: { onRetry: () => void }) {
	return (
		<button
			onClick={onRetry}
			className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
		>
			<RefreshCw className="w-3 h-3" />
			Retry
		</button>
	);
}

function ErrorState({ message, onRetry }: { message?: string; onRetry: () => void }) {
	return (
		<div className="p-8 flex flex-col items-center gap-3 text-slate-400">
			<AlertCircle className="w-6 h-6 text-red-400" />
			<p className="text-sm">{message ?? 'Failed to load'}</p>
			<RetryButton onRetry={onRetry} />
		</div>
	);
}

interface HealthResponse { status: string }
interface WorkersResponse { active: number; total?: number }

export function Dashboard() {
	const navigate = useNavigate();

	const { data: stats, isLoading: statsLoading, isError: statsError, refetch: refetchStats } = useDashboardStats();
	const { data: tasksData, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useDashboardPendingTasks();
	const { data: feedEvents, isLoading: feedLoading, isError: feedError, refetch: refetchFeed } = useActivityFeed(10);

	const { data: healthData, isLoading: healthLoading, isError: healthError } = useQuery({
		queryKey: ['system', 'health'],
		queryFn: async () => {
			const { data } = await apiClient.get<HealthResponse>('/health');
			return data;
		},
		refetchInterval: 30_000,
		retry: 1,
	});

	const { data: workersData, isLoading: workersLoading } = useQuery({
		queryKey: ['system', 'workers'],
		queryFn: async () => {
			const { data } = await apiClient.get<WorkersResponse>('/system/workers');
			return data;
		},
		refetchInterval: 30_000,
		retry: 1,
	});

	const pendingTasks = tasksData?.tasks ?? [];

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

	const apiOnline = !healthError && (healthData?.status === 'ok' || healthData?.status === 'healthy' || healthData != null);
	const activeWorkers = workersData?.active ?? 0;

	const quickActions = [
		{ icon: ScanLine, label: 'New Scan Project', action: () => navigate('/scanning-projects') },
		{ icon: FileText,  label: 'Upload Document',  action: () => navigate('/documents?action=upload') },
		{ icon: Search,    label: 'Search',            action: () => navigate('/search') },
		{ icon: Inbox,     label: 'View Inbox',        action: () => navigate('/inbox') },
	];

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			className="space-y-6"
		>
			{/* Page header */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Dashboard
					</h1>
					<p className="mt-1 text-sm text-slate-400">
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
						<div className="flex-1">
							<p className="text-sm text-slate-400">Total Documents</p>
							{statsLoading ? (
								<Loader2 className="w-6 h-6 animate-spin text-slate-400 mt-2" />
							) : statsError ? (
								<div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
									<AlertCircle className="w-3.5 h-3.5" />
									<button onClick={() => void refetchStats()} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded">Retry</button>
								</div>
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
						<div className="flex-1">
							<p className="text-sm text-slate-400">Active Workflows</p>
							{statsLoading ? (
								<Loader2 className="w-6 h-6 animate-spin text-slate-400 mt-2" />
							) : statsError ? (
								<div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
									<AlertCircle className="w-3.5 h-3.5" />
									<button onClick={() => void refetchStats()} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded">Retry</button>
								</div>
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
						<div className="flex-1">
							<p className="text-sm text-slate-400">OCR Processed</p>
							{statsLoading ? (
								<Loader2 className="w-6 h-6 animate-spin text-slate-400 mt-2" />
							) : statsError ? (
								<div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
									<AlertCircle className="w-3.5 h-3.5" />
									<button onClick={() => void refetchStats()} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded">Retry</button>
								</div>
							) : (
								<>
									<p className="mt-2 text-3xl font-display font-semibold text-slate-100">
										{displayStats.ocrProcessed.toLocaleString()}
									</p>
									<p className="mt-1 text-xs text-slate-400">Documents this month</p>
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
							<p className="text-sm text-slate-400">Storage Used</p>
							{statsLoading ? (
								<Loader2 className="w-6 h-6 animate-spin text-slate-400 mt-2" />
							) : statsError ? (
								<div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
									<AlertCircle className="w-3.5 h-3.5" />
									<button onClick={() => void refetchStats()} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded">Retry</button>
								</div>
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
										<p className="mt-1 text-xs text-slate-400">
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
					<div className="p-4 border-b border-slate-700/50 flex items-center justify-between gap-3">
						<h2 className="font-display font-semibold text-slate-100">Pending Tasks</h2>
						<a href="/workflows" className="flex items-center gap-1 text-sm text-brass-400 hover:text-brass-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded">
							View all <ArrowUpRight className="w-4 h-4" />
						</a>
					</div>
					<div className="divide-y divide-slate-800/50">
						{tasksLoading ? (
							<div className="p-8 flex items-center justify-center">
								<Loader2 className="w-6 h-6 animate-spin text-slate-400" />
							</div>
						) : tasksError ? (
							<ErrorState message="Failed to load tasks" onRetry={() => void refetchTasks()} />
						) : pendingTasks.length === 0 ? (
							<div className="p-8 text-center text-slate-400">No pending tasks</div>
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
											task.priority === 'high'   ? 'bg-red-500/10 text-red-400' :
											task.priority === 'urgent' ? 'bg-orange-500/10 text-orange-400' :
											'bg-slate-700/50 text-slate-400'
										)}>
											<AlertCircle className="w-4 h-4" />
										</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-slate-200 truncate">
												{task.documentTitle}
											</p>
											<p className="mt-1 text-xs text-slate-400">
												{task.workflowName} • {task.stepName}
											</p>
										</div>
										<div className="text-right shrink-0">
											<span className={cn(
												'badge',
												task.priority === 'high'   ? 'badge-red' :
												task.priority === 'urgent' ? 'badge-brass' :
												'badge-gray'
											)}
											aria-label={`Priority: ${task.priority}`}>
												{task.priority}
											</span>
											{task.deadline && (
												<p className="mt-1 text-xs text-slate-400">
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

				{/* System Status */}
				<motion.div variants={itemVariants} className="glass-card">
					<div className="p-4 border-b border-slate-700/50">
						<h2 className="font-display font-semibold text-slate-100">System Status</h2>
					</div>
					<div className="p-4 space-y-3">
						{/* API */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className={cn(
									'w-2 h-2 rounded-full shrink-0',
									healthLoading ? 'bg-slate-500 animate-pulse' :
									healthError   ? 'bg-red-400' :
									apiOnline     ? 'bg-emerald-400' : 'bg-red-400'
								)} />
								<span className="text-sm text-slate-300">API</span>
							</div>
							<span className={cn(
								'text-xs font-medium',
								healthLoading ? 'text-slate-400' :
								healthError   ? 'text-red-400' :
								apiOnline     ? 'text-emerald-400' : 'text-red-400'
							)}>
								{healthLoading ? 'Checking…' : healthError ? 'Offline' : apiOnline ? 'Online' : 'Offline'}
							</span>
						</div>

						{/* Workers */}
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span className={cn(
									'w-2 h-2 rounded-full shrink-0',
									workersLoading    ? 'bg-slate-500 animate-pulse' :
									activeWorkers > 0 ? 'bg-blue-400' : 'bg-slate-500'
								)} />
								<span className="text-sm text-slate-300">Workers</span>
							</div>
							<span className="text-xs font-medium text-slate-400">
								{workersLoading ? 'Checking…' : `${activeWorkers} active`}
							</span>
						</div>

						<div className="pt-2 border-t border-slate-700/50">
							<p className="text-xs text-slate-400">
								Refreshes every 30 s
							</p>
						</div>
					</div>
				</motion.div>
			</div>

			{/* Activity Feed */}
			<motion.div variants={itemVariants} className="glass-card">
				<div className="p-4 border-b border-slate-700/50 flex items-center justify-between gap-3">
					<h2 className="font-display font-semibold text-slate-100">Recent Activity</h2>
					<a href="/audit" className="flex items-center gap-1 text-sm text-brass-400 hover:text-brass-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded">
						View all <ArrowUpRight className="w-4 h-4" />
					</a>
				</div>
				<div className="divide-y divide-slate-800/50">
					{feedLoading ? (
						<div className="p-8 flex items-center justify-center">
							<Loader2 className="w-5 h-5 animate-spin text-slate-400" />
						</div>
					) : feedError ? (
						<ErrorState message="Failed to load activity" onRetry={() => void refetchFeed()} />
					) : !feedEvents || feedEvents.length === 0 ? (
						<div className="p-8 text-center text-sm text-slate-400">No activity yet</div>
					) : (
						feedEvents.map((event, idx) => (
							<motion.div
								key={`feed-${event.event_type}-${event.timestamp}-${idx}`}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								transition={{ delay: 0.04 * idx }}
								className="flex flex-col gap-2 py-3 px-4 hover:bg-slate-800/30 transition-colors sm:flex-row sm:items-start sm:gap-3"
							>
								<div className={cn('mt-0.5 p-1 rounded-md shrink-0', feedIconBg(event.event_type))}>
									{feedEventIcon(event.event_type)}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm text-slate-300 truncate">{event.description}</p>
									{Boolean(event.data?.record_id) && (
										<a
											href={`/documents/${event.data!.record_id as string}`}
											className="mt-0.5 text-xs text-brass-400 hover:text-brass-300 truncate block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded"
										>
											View document
										</a>
									)}
								</div>
								{event.timestamp && (
									<time
										className="shrink-0 text-xs text-slate-400 mt-0.5"
										dateTime={event.timestamp}
										title={new Date(event.timestamp).toLocaleString()}
									>
										{formatRelativeTime(event.timestamp)}
									</time>
								)}
							</motion.div>
						))
					)}
				</div>
			</motion.div>

			{/* Quick Actions */}
			<motion.div variants={itemVariants} className="glass-card p-4">
				<h2 className="font-display font-semibold text-slate-100 mb-4">Quick Actions</h2>
				<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
					{quickActions.map((action) => (
						<button
							key={action.label}
							onClick={action.action}
							className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/30 hover:border-brass-500/30 transition-all group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
						>
							<action.icon className="w-6 h-6 text-slate-400 group-hover:text-brass-400 transition-colors" />
							<span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">
								{action.label}
							</span>
						</button>
					))}
				</div>
			</motion.div>
		</motion.div>
	);
}
