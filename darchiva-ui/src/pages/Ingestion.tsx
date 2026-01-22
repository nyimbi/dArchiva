// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/hooks/useStore';
import {
	Upload,
	FolderOpen,
	Mail,
	Webhook,
	Plus,
	Play,
	Pause,
	Settings,
	MoreVertical,
	CheckCircle2,
	XCircle,
	Clock,
	RefreshCw,
	ChevronRight,
	Loader2,
	ScanLine,
	Cloud,
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import {
	useIngestionSources,
	useIngestionJobs,
	useIngestionStats,
	useToggleSource,
	BatchUploader,
	IngestionTemplates,
	JobQueueDashboard,
	type IngestionSource,
	type IngestionJob,
	type SourceType,
} from '@/features/ingestion';

const sourceIcons: Record<SourceType, React.ComponentType<{ className?: string }>> = {
	folder_watch: FolderOpen,
	email: Mail,
	api: Webhook,
	scanner: ScanLine,
	cloud_storage: Cloud,
};

function SourceCard({ source, onSettings, onOptions }: { source: IngestionSource; onSettings: (s: IngestionSource) => void; onOptions: (s: IngestionSource) => void }) {
	const Icon = sourceIcons[source.type] || FolderOpen;
	const toggleSource = useToggleSource();

	const handleToggle = () => {
		toggleSource.mutate({ id: source.id, isActive: !source.isActive });
	};

	return (
		<div className="doc-card group">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<div className={cn(
						'p-2 rounded-lg',
						source.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-700/50 text-slate-400'
					)}>
						<Icon className="w-5 h-5" />
					</div>
					<div>
						<h3 className="font-medium text-slate-200">{source.name}</h3>
						<div className="flex items-center gap-2 mt-1">
							<span className="text-xs text-slate-500">
								{source.type.replace('_', ' ')}
							</span>
							{source.documentsIngested > 0 && (
								<span className="text-xs text-slate-500">
									• {source.documentsIngested} docs
								</span>
							)}
						</div>
					</div>
				</div>
				<button
					onClick={() => onOptions(source)}
					className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<MoreVertical className="w-4 h-4" />
				</button>
			</div>

			{source.lastRunAt && (
				<p className="mt-3 text-xs text-slate-500">
					Last run {formatRelativeTime(source.lastRunAt)}
				</p>
			)}

			<div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/50">
				<div className="flex items-center gap-2">
					<div className={cn(
						'w-2 h-2 rounded-full',
						source.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'
					)} />
					<span className={cn(
						'text-xs',
						source.isActive ? 'text-emerald-400' : 'text-slate-500'
					)}>
						{source.isActive ? 'Active' : 'Paused'}
					</span>
				</div>
				<div className="flex items-center gap-1">
					<button onClick={() => onSettings(source)} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded">
						<Settings className="w-4 h-4" />
					</button>
					<button
						onClick={handleToggle}
						disabled={toggleSource.isPending}
						className={cn(
							'p-1.5 rounded',
							source.isActive
								? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
								: 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
						)}
					>
						{toggleSource.isPending ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : source.isActive ? (
							<Pause className="w-4 h-4" />
						) : (
							<Play className="w-4 h-4" />
						)}
					</button>
				</div>
			</div>
		</div>
	);
}

export function Ingestion() {
	const [activeTab, setActiveTab] = useState<'sources' | 'jobs' | 'batch' | 'templates'>('sources');
	const { openModal } = useStore();

	const { data: sourcesData, isLoading: sourcesLoading } = useIngestionSources();

	const handleAddSource = () => openModal('add-ingestion-source');
	const handleSourceSettings = (s: IngestionSource) => openModal('ingestion-source-settings', s);
	const handleSourceOptions = (s: IngestionSource) => openModal('ingestion-source-options', s);
	const handleViewJob = (j: IngestionJob) => openModal('view-ingestion-job', j);
	const handleRetryJob = (j: IngestionJob) => openModal('retry-ingestion-job', j);
	const { data: jobsData, isLoading: jobsLoading } = useIngestionJobs({ limit: 20 });
	const { data: stats, isLoading: statsLoading } = useIngestionStats();

	const sources = sourcesData?.items || [];
	const jobs = jobsData?.items || [];

	const displayStats = stats || {
		active: sources.filter(s => s.isActive).length,
		total: sources.length,
		jobsToday: jobs.length,
		failed: jobs.filter(j => j.status === 'failed').length,
	};

	const successRate = displayStats.jobsToday > 0
		? (((displayStats.jobsToday - displayStats.failed) / displayStats.jobsToday) * 100).toFixed(0)
		: '100';

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Document Ingestion
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Configure automatic document import from folders, email, and APIs
					</p>
				</div>
				<button onClick={handleAddSource} className="btn-primary">
					<Plus className="w-4 h-4" />
					Add Source
				</button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<div className="stat-card">
					<p className="text-sm text-slate-500">Active Sources</p>
					<p className="mt-1 text-2xl font-display font-semibold text-emerald-400">
						{statsLoading ? (
							<Loader2 className="w-5 h-5 animate-spin" />
						) : (
							`${displayStats.active}/${displayStats.total}`
						)}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Jobs Today</p>
					<p className="mt-1 text-2xl font-display font-semibold text-slate-100">
						{statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : displayStats.jobsToday}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Failed</p>
					<p className="mt-1 text-2xl font-display font-semibold text-red-400">
						{statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : displayStats.failed}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Success Rate</p>
					<p className="mt-1 text-2xl font-display font-semibold text-brass-400">
						{statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `${successRate}%`}
					</p>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
				<button
					onClick={() => setActiveTab('sources')}
					className={cn(
						'px-4 py-2 rounded-md text-sm font-medium transition-colors',
						activeTab === 'sources'
							? 'bg-slate-700 text-slate-100'
							: 'text-slate-400 hover:text-slate-200'
					)}
				>
					Sources
				</button>
				<button
					onClick={() => setActiveTab('jobs')}
					className={cn(
						'px-4 py-2 rounded-md text-sm font-medium transition-colors',
						activeTab === 'jobs'
							? 'bg-slate-700 text-slate-100'
							: 'text-slate-400 hover:text-slate-200'
					)}
				>
					Recent Jobs
				</button>
				<button
					onClick={() => setActiveTab('batch')}
					className={cn(
						'px-4 py-2 rounded-md text-sm font-medium transition-colors',
						activeTab === 'batch'
							? 'bg-slate-700 text-slate-100'
							: 'text-slate-400 hover:text-slate-200'
					)}
				>
					Batch Upload
				</button>
				<button
					onClick={() => setActiveTab('templates')}
					className={cn(
						'px-4 py-2 rounded-md text-sm font-medium transition-colors',
						activeTab === 'templates'
							? 'bg-slate-700 text-slate-100'
							: 'text-slate-400 hover:text-slate-200'
					)}
				>
					Templates
				</button>
			</div>

			{/* Content */}
			<AnimatePresence mode="wait">
				{activeTab === 'sources' && (
					<motion.div
						key="sources"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
					>
						{sourcesLoading ? (
							<div className="col-span-full flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : sources.length === 0 ? (
							<div className="col-span-full text-center py-12 text-slate-500">
								No ingestion sources configured
							</div>
						) : (
							sources.map((source) => (
								<SourceCard key={source.id} source={source} onSettings={handleSourceSettings} onOptions={handleSourceOptions} />
							))
						)}

						{/* Add new source card */}
						<button onClick={handleAddSource} className="doc-card border-dashed border-2 border-slate-700 hover:border-brass-500/50 flex flex-col items-center justify-center gap-3 min-h-[160px]">
							<div className="p-3 rounded-full bg-slate-800">
								<Plus className="w-6 h-6 text-slate-400" />
							</div>
							<span className="text-slate-400">Add New Source</span>
						</button>
					</motion.div>
				)}

				{activeTab === 'jobs' && (
					<motion.div
						key="jobs"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<JobQueueDashboard />
					</motion.div>
				)}

				{activeTab === 'batch' && (
					<motion.div
						key="batch"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<BatchUploader />
					</motion.div>
				)}

				{activeTab === 'templates' && (
					<motion.div
						key="templates"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<IngestionTemplates />
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
