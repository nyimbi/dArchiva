// (c) Copyright Datacraft, 2026
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import { Switch } from '@/components/ui/switch';
import { useActivityFeed } from '@/features/activity';
import { useDashboardPendingTasks, useDashboardStats } from '@/features/dashboard';
import { PerformanceChart } from '@/features/scanning-ops/components/PerformanceChart';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { apiClient } from '@/lib/api-client';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
	Activity,
	AlertCircle,
	ArrowDown,
	ArrowUp,
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
	SlidersHorizontal,
	Tag,
	TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
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

type DashboardWidgetId =
	| 'stats-row'
	| 'pending-tasks'
	| 'recent-activity'
	| 'quick-actions'
	| 'system-status'
	| 'throughput-chart';

interface DashboardWidgetLayoutItem {
	id: DashboardWidgetId;
	enabled: boolean;
}

interface HealthResponse { status: string }
interface WorkersResponse { active: number; total?: number }
interface OcrStatsResponse { [key: string]: unknown }
interface AnalyticsCapacityResponse {
	avgProcessingTimeSeconds?: number;
	avgProcessingTimePreviousWeekSeconds?: number;
	avgProcessingTimeTrendPercent?: number;
	[key: string]: unknown;
}
interface HealthMetric {
	name: string;
	value: number;
	unit?: string;
	trend?: 'up' | 'down' | 'stable' | null;
}
interface HealthMetricsResponse {
	metrics: HealthMetric[];
}

interface TrendData {
	percent: number;
	direction: 'up' | 'down' | 'stable';
}

interface StatCardProps {
	label: string;
	value: string;
	trend: TrendData;
	icon: LucideIcon;
	isLoading: boolean;
	error?: JSX.Element | null;
	children?: ReactNode;
}

const DASHBOARD_LAYOUT_KEY = 'darchiva_dashboard_layout';

const WIDGET_LABELS: Record<DashboardWidgetId, string> = {
	'stats-row': 'Stats Row',
	'pending-tasks': 'Pending Tasks',
	'recent-activity': 'Recent Activity',
	'quick-actions': 'Quick Actions',
	'system-status': 'System Status',
	'throughput-chart': 'Throughput Chart',
};

const DEFAULT_DASHBOARD_LAYOUT: DashboardWidgetLayoutItem[] = [
	{ id: 'stats-row', enabled: true },
	{ id: 'pending-tasks', enabled: true },
	{ id: 'system-status', enabled: true },
	{ id: 'recent-activity', enabled: true },
	{ id: 'quick-actions', enabled: true },
	{ id: 'throughput-chart', enabled: true },
];

const WIDGET_IDS = new Set<DashboardWidgetId>(DEFAULT_DASHBOARD_LAYOUT.map((item) => item.id));

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

function normalizeDashboardLayout(value: unknown): DashboardWidgetLayoutItem[] {
	if (!Array.isArray(value)) return DEFAULT_DASHBOARD_LAYOUT;

	const seen = new Set<DashboardWidgetId>();
	const normalized = value.flatMap((item): DashboardWidgetLayoutItem[] => {
		if (
			!item ||
			typeof item !== 'object' ||
			!('id' in item) ||
			typeof item.id !== 'string' ||
			!WIDGET_IDS.has(item.id as DashboardWidgetId) ||
			seen.has(item.id as DashboardWidgetId)
		) {
			return [];
		}

		const id = item.id as DashboardWidgetId;
		seen.add(id);
		return [{
			id,
			enabled: id === 'stats-row' ? true : Boolean((item as { enabled?: unknown }).enabled),
		}];
	});

	const missing = DEFAULT_DASHBOARD_LAYOUT.filter((item) => !seen.has(item.id));
	return [...normalized, ...missing];
}

function moveWidget(items: DashboardWidgetLayoutItem[], index: number, direction: -1 | 1) {
	const nextIndex = index + direction;
	if (nextIndex < 0 || nextIndex >= items.length) return items;

	const next = [...items];
	[next[index], next[nextIndex]] = [next[nextIndex], next[index]];
	return next;
}

function toNumber(value: unknown): number | undefined {
	const numericValue = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
	return Number.isFinite(numericValue) ? numericValue : undefined;
}

function pickNumber(source: Record<string, unknown> | null | undefined, keys: string[]): number | undefined {
	if (!source) return undefined;
	for (const key of keys) {
		const value = toNumber(source[key]);
		if (value !== undefined) return value;
	}
	return undefined;
}

function calculateTrendPercent(current: number, previous?: number): number {
	if (previous === undefined) return 0;
	if (previous === 0) return current > 0 ? 100 : 0;
	return ((current - previous) / Math.abs(previous)) * 100;
}

function trendFrom(
	current: number,
	source: Record<string, unknown> | null | undefined,
	percentKeys: string[],
	previousKeys: string[],
	fallbackPrevious?: number,
): TrendData {
	const explicitPercent = pickNumber(source, percentKeys);
	const previous = pickNumber(source, previousKeys) ?? fallbackPrevious;
	const percent = explicitPercent ?? calculateTrendPercent(current, previous);
	const rounded = Math.abs(percent) < 0.05 ? 0 : percent;
	return {
		percent: rounded,
		direction: rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'stable',
	};
}

function formatTrendPercent(percent: number): string {
	const abs = Math.abs(percent);
	return `${abs >= 10 || Number.isInteger(abs) ? abs.toFixed(0) : abs.toFixed(1)}%`;
}

function formatProcessingTime(seconds?: number): string {
	if (seconds === undefined) return '0s';
	if (seconds < 60) return `${seconds.toFixed(seconds < 10 ? 1 : 0)}s`;
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = Math.round(seconds % 60);
	return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
}

function TrendIndicator({ trend }: { trend: TrendData }) {
	const isDown = trend.direction === 'down';
	const Icon = isDown ? ArrowDown : ArrowUp;
	return (
		<p className={cn(
			'mt-1 flex items-center gap-1 text-xs font-medium',
			isDown ? 'text-red-500' : 'text-green-500',
		)}>
			<Icon className="w-3 h-3" />
			{formatTrendPercent(trend.percent)} vs last week
		</p>
	);
}

function StatCard({ label, value, trend, icon: Icon, isLoading, error, children }: StatCardProps) {
	return (
		<div className="stat-card group">
			<div className="flex items-start justify-between">
				<div className="flex-1 min-w-0">
					<p className="text-sm text-slate-400">{label}</p>
					{isLoading ? (
						<Loader2 className="w-6 h-6 animate-spin text-slate-400 mt-2" />
					) : error ? error : (
						<>
							<p className="mt-2 text-3xl font-display font-semibold text-slate-100">
								{value}
							</p>
							<TrendIndicator trend={trend} />
							{children}
						</>
					)}
				</div>
				<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400 group-hover:bg-brass-500/20 transition-colors">
					<Icon className="w-5 h-5" />
				</div>
			</div>
		</div>
	);
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

export function Dashboard() {
	const navigate = useNavigate();
	const preferences = useUserPreferences();
	const [customizerOpen, setCustomizerOpen] = useState(false);
	const [layout, setLayout] = useState<DashboardWidgetLayoutItem[]>(() =>
		normalizeDashboardLayout(preferences.get<unknown>(DASHBOARD_LAYOUT_KEY, DEFAULT_DASHBOARD_LAYOUT))
	);
	const [draftLayout, setDraftLayout] = useState<DashboardWidgetLayoutItem[]>(layout);

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

	const { data: ocrStatsData, isLoading: ocrStatsLoading } = useQuery({
		queryKey: ['dashboard', 'ocr-stats'],
		queryFn: async () => {
			try {
				const { data } = await apiClient.get<OcrStatsResponse>('/ocr/stats');
				return data;
			} catch {
				const { data } = await apiClient.get<HealthMetricsResponse>('/admin/health/metrics');
				const failedMetric = data.metrics.find((metric) =>
					metric.name === 'failed_ocr_today' || metric.name === 'failed_ocr'
				);
				return { failedJobs: Math.max(failedMetric?.value ?? 0, 0) };
			}
		},
		refetchInterval: 60_000,
		retry: 1,
	});

	const { data: capacityData, isLoading: capacityLoading } = useQuery({
		queryKey: ['dashboard', 'analytics-capacity'],
		queryFn: async () => {
			const { data } = await apiClient.get<AnalyticsCapacityResponse>('/analytics/capacity');
			return data;
		},
		refetchInterval: 60_000,
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
	const statsRecord = stats as Record<string, unknown> | undefined;
	const tasksRecord = tasksData as Record<string, unknown> | undefined;
	const ocrStatsRecord = ocrStatsData as Record<string, unknown> | undefined;
	const capacityRecord = capacityData as Record<string, unknown> | undefined;
	const failedOcrJobs = pickNumber(ocrStatsRecord, [
		'failedJobs',
		'failedOcrJobs',
		'failedOcr',
		'failedOcrToday',
		'failed',
	]) ?? 0;
	const avgProcessingSeconds = pickNumber(capacityRecord, ['avgProcessingTimeSeconds']) ?? 0;
	const pendingReviewCount = tasksData?.total ?? pendingTasks.length;

	const statTrends = {
		totalDocuments: trendFrom(
			displayStats.totalDocuments,
			statsRecord,
			['totalDocumentsTrendPercent', 'documentsTrendPercent'],
			['totalDocumentsLastWeek', 'documentsLastWeek', 'totalDocumentsPreviousWeek', 'documentsPreviousWeek'],
			Math.max(displayStats.totalDocuments - displayStats.documentsThisMonth, 0),
		),
		activeWorkflows: trendFrom(
			displayStats.activeWorkflows,
			statsRecord,
			['activeWorkflowsTrendPercent'],
			['activeWorkflowsLastWeek', 'activeWorkflowsPreviousWeek'],
		),
		ocrProcessed: trendFrom(
			displayStats.ocrProcessed,
			statsRecord,
			['ocrProcessedTrendPercent', 'ocrTrendPercent'],
			['ocrProcessedLastWeek', 'ocrProcessedPreviousWeek'],
		),
		storageUsed: trendFrom(
			displayStats.storageUsedBytes,
			statsRecord,
			['storageUsedTrendPercent', 'storageTrendPercent'],
			['storageUsedBytesLastWeek', 'storageUsedBytesPreviousWeek'],
		),
		failedOcr: trendFrom(
			failedOcrJobs,
			ocrStatsRecord,
			['failedJobsTrendPercent', 'failedOcrTrendPercent', 'trendPercent'],
			['failedJobsLastWeek', 'failedOcrLastWeek', 'failedJobsPreviousWeek', 'failedOcrPreviousWeek'],
		),
		avgProcessingTime: trendFrom(
			avgProcessingSeconds,
			capacityRecord,
			['avgProcessingTimeTrendPercent'],
			['avgProcessingTimePreviousWeekSeconds', 'avgProcessingTimeLastWeekSeconds'],
		),
		pendingReview: trendFrom(
			pendingReviewCount,
			tasksRecord,
			['pendingReviewTrendPercent', 'pendingTasksTrendPercent'],
			['pendingReviewLastWeek', 'pendingTasksLastWeek', 'pendingReviewPreviousWeek', 'pendingTasksPreviousWeek'],
		),
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

	const visibleLayout = useMemo(
		() => layout.filter((widget) => widget.id === 'stats-row' || widget.enabled),
		[layout]
	);

	const openCustomizer = () => {
		setDraftLayout(layout);
		setCustomizerOpen(true);
	};

	const persistLayout = (next: DashboardWidgetLayoutItem[]) => {
		const normalized = normalizeDashboardLayout(next);
		setLayout(normalized);
		preferences.set(DASHBOARD_LAYOUT_KEY, normalized);
	};

	const saveDraftLayout = () => {
		persistLayout(draftLayout);
		setCustomizerOpen(false);
	};

	const resetLayout = () => {
		setDraftLayout(DEFAULT_DASHBOARD_LAYOUT);
		persistLayout(DEFAULT_DASHBOARD_LAYOUT);
	};

	const setWidgetEnabled = (id: DashboardWidgetId, enabled: boolean) => {
		if (id === 'stats-row') return;
		setDraftLayout((current) =>
			current.map((item) => item.id === id ? { ...item, enabled } : item)
		);
	};

	const statError = (
		<div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
			<AlertCircle className="w-3.5 h-3.5" />
			<button onClick={() => void refetchStats()} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded">Retry</button>
		</div>
	);

	const renderStatsRow = () => (
		<motion.div
			variants={itemVariants}
			className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
		>
			<StatCard
				label="Total Documents"
				value={displayStats.totalDocuments.toLocaleString()}
				trend={statTrends.totalDocuments}
				icon={FileText}
				isLoading={statsLoading}
				error={statsError ? statError : null}
			>
				<p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
					<TrendingUp className="w-3 h-3" />
					+{displayStats.documentsThisMonth} this month
				</p>
			</StatCard>

			<StatCard
				label="Active Workflows"
				value={displayStats.activeWorkflows.toLocaleString()}
				trend={statTrends.activeWorkflows}
				icon={GitBranch}
				isLoading={statsLoading}
				error={statsError ? statError : null}
			>
				<p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
					<Clock className="w-3 h-3" />
					{displayStats.pendingTasks} pending tasks
				</p>
			</StatCard>

			<StatCard
				label="OCR Processed"
				value={displayStats.ocrProcessed.toLocaleString()}
				trend={statTrends.ocrProcessed}
				icon={FileSearch}
				isLoading={statsLoading}
				error={statsError ? statError : null}
			>
				<p className="mt-1 text-xs text-slate-400">Documents this month</p>
			</StatCard>

			<StatCard
				label="Storage Used"
				value={formatBytes(displayStats.storageUsedBytes)}
				trend={statTrends.storageUsed}
				icon={HardDrive}
				isLoading={statsLoading}
				error={statsError ? statError : null}
			>
				<div className="mt-3">
					<div className="progress-bar">
						<div className="progress-bar-fill" style={{ width: `${storagePercentage}%` }} />
					</div>
					<p className="mt-1 text-xs text-slate-400">
						{storagePercentage.toFixed(1)}% of {formatBytes(displayStats.storageQuotaBytes)}
					</p>
				</div>
			</StatCard>

			<StatCard
				label="Failed OCR Jobs"
				value={failedOcrJobs.toLocaleString()}
				trend={statTrends.failedOcr}
				icon={AlertCircle}
				isLoading={ocrStatsLoading}
			/>

			<StatCard
				label="Avg Processing Time"
				value={formatProcessingTime(avgProcessingSeconds)}
				trend={statTrends.avgProcessingTime}
				icon={Clock}
				isLoading={capacityLoading}
			/>

			<StatCard
				label="Pending Review"
				value={pendingReviewCount.toLocaleString()}
				trend={statTrends.pendingReview}
				icon={CheckSquare}
				isLoading={tasksLoading}
				error={tasksError ? (
					<div className="mt-2 flex items-center gap-1.5 text-xs text-red-400">
						<AlertCircle className="w-3.5 h-3.5" />
						<button onClick={() => void refetchTasks()} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded">Retry</button>
					</div>
				) : null}
			/>
		</motion.div>
	);

	const renderPendingTasks = () => (
		<motion.div variants={itemVariants} className="glass-card">
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
					<EmptyState
						icon={CheckSquare}
						title="No pending tasks"
						description="Workflow tasks that need your attention will appear here."
					/>
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
									<p className="text-sm font-medium text-slate-200 truncate">{task.documentTitle}</p>
									<p className="mt-1 text-xs text-slate-400">{task.workflowName} • {task.stepName}</p>
								</div>
								<div className="text-right shrink-0">
									<span
										className={cn(
											'badge',
											task.priority === 'high'   ? 'badge-red' :
											task.priority === 'urgent' ? 'badge-brass' :
											'badge-gray'
										)}
										aria-label={`Priority: ${task.priority}`}
									>
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
	);

	const renderSystemStatus = () => (
		<motion.div variants={itemVariants} className="glass-card">
			<div className="p-4 border-b border-slate-700/50">
				<h2 className="font-display font-semibold text-slate-100">System Status</h2>
			</div>
			<div className="p-4 space-y-3">
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
						{healthLoading ? 'Checking...' : healthError ? 'Offline' : apiOnline ? 'Online' : 'Offline'}
					</span>
				</div>

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
						{workersLoading ? 'Checking...' : `${activeWorkers} active`}
					</span>
				</div>

				<div className="pt-2 border-t border-slate-700/50">
					<p className="text-xs text-slate-400">Refreshes every 30 s</p>
				</div>
			</div>
		</motion.div>
	);

	const renderActivityFeed = () => (
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
					<EmptyState
						icon={Activity}
						title="No recent activity"
						description="Document events will appear here as they happen"
					/>
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
	);

	const renderQuickActions = () => (
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
						<span className="text-sm text-slate-400 group-hover:text-slate-200 transition-colors">{action.label}</span>
					</button>
				))}
			</div>
		</motion.div>
	);

	const renderThroughputChart = () => (
		<motion.div variants={itemVariants}>
			<PerformanceChart />
		</motion.div>
	);

	const widgetRenderers: Record<DashboardWidgetId, () => JSX.Element> = {
		'stats-row': renderStatsRow,
		'pending-tasks': renderPendingTasks,
		'recent-activity': renderActivityFeed,
		'quick-actions': renderQuickActions,
		'system-status': renderSystemStatus,
		'throughput-chart': renderThroughputChart,
	};

	const widgetSpans: Record<DashboardWidgetId, string> = {
		'stats-row': 'lg:col-span-3',
		'pending-tasks': 'lg:col-span-2',
		'system-status': 'lg:col-span-1',
		'recent-activity': 'lg:col-span-3',
		'quick-actions': 'lg:col-span-3',
		'throughput-chart': 'lg:col-span-3',
	};

	return (
		<motion.div
			variants={containerVariants}
			initial="hidden"
			animate="visible"
			className="space-y-6"
		>
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">Dashboard</h1>
					<p className="mt-1 text-sm text-slate-400">
						Welcome back. Here's your document management overview.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					onClick={openCustomizer}
					className="self-start border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-slate-100"
				>
					<SlidersHorizontal className="w-4 h-4" />
					Customize
				</Button>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{visibleLayout.map((widget) => (
					<div key={widget.id} className={widgetSpans[widget.id]}>
						{widgetRenderers[widget.id]()}
					</div>
				))}
			</div>

			<Sheet open={customizerOpen} onOpenChange={setCustomizerOpen}>
				<SheetContent className="w-full border-slate-800 bg-slate-925 text-slate-100 sm:max-w-md">
					<SheetHeader>
						<SheetTitle className="text-slate-100">Customize Dashboard</SheetTitle>
						<SheetDescription className="text-slate-400">
							Choose visible widgets and arrange the dashboard order.
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6 space-y-2">
						{draftLayout.map((widget, index) => {
							const alwaysOn = widget.id === 'stats-row';
							return (
								<div
									key={widget.id}
									className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3"
								>
									<div className="flex flex-col gap-1">
										<button
											type="button"
											onClick={() => setDraftLayout((current) => moveWidget(current, index, -1))}
											disabled={index === 0}
											className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
											aria-label={`Move ${WIDGET_LABELS[widget.id]} up`}
										>
											<ArrowUp className="w-3.5 h-3.5" />
										</button>
										<button
											type="button"
											onClick={() => setDraftLayout((current) => moveWidget(current, index, 1))}
											disabled={index === draftLayout.length - 1}
											className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
											aria-label={`Move ${WIDGET_LABELS[widget.id]} down`}
										>
											<ArrowDown className="w-3.5 h-3.5" />
										</button>
									</div>
									<div className="min-w-0 flex-1">
										<p className="text-sm font-medium text-slate-200">{WIDGET_LABELS[widget.id]}</p>
										{alwaysOn && <p className="text-xs text-slate-400">Always on</p>}
									</div>
									<Switch
										checked={alwaysOn || widget.enabled}
										disabled={alwaysOn}
										onCheckedChange={(checked) => setWidgetEnabled(widget.id, checked)}
										className="data-[state=checked]:bg-brass-500 data-[state=unchecked]:bg-slate-700"
										aria-label={`Toggle ${WIDGET_LABELS[widget.id]}`}
									/>
								</div>
							);
						})}
					</div>

					<SheetFooter className="mt-6 gap-3 sm:flex-col sm:space-x-0">
						<Button type="button" onClick={saveDraftLayout} className="bg-brass-500 text-slate-950 hover:bg-brass-400">
							Save
						</Button>
						<button
							type="button"
							onClick={resetLayout}
							className="self-center text-sm text-slate-400 hover:text-brass-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded"
						>
							Reset to defaults
						</button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</motion.div>
	);
}
