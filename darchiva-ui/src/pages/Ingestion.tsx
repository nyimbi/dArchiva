// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

function SourceCard({ source }: { source: IngestionSource }) {
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
				<button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
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
					<button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded">
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
	const [activeTab, setActiveTab] = useState<'sources' | 'jobs'>('sources');

	const { data: sourcesData, isLoading: sourcesLoading } = useIngestionSources();
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
				<button className="btn-primary">
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
								<SourceCard key={source.id} source={source} />
							))
						)}

						{/* Add new source card */}
						<button className="doc-card border-dashed border-2 border-slate-700 hover:border-brass-500/50 flex flex-col items-center justify-center gap-3 min-h-[160px]">
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
						className="glass-card overflow-hidden"
					>
						{jobsLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : jobs.length === 0 ? (
							<div className="text-center py-12 text-slate-500">
								No recent jobs
							</div>
						) : (
							<table className="data-table">
								<thead>
									<tr>
										<th>Source</th>
										<th>Documents</th>
										<th>Status</th>
										<th>Started</th>
										<th className="w-24">Actions</th>
									</tr>
								</thead>
								<tbody>
									{jobs.map((job) => (
										<tr key={job.id}>
											<td>
												<span className="text-slate-300">
													{job.sourceName}
												</span>
											</td>
											<td>
												<span className="text-slate-400">
													{job.documentsProcessed} processed
													{job.documentsFailed > 0 && (
														<span className="text-red-400 ml-2">
															({job.documentsFailed} failed)
														</span>
													)}
												</span>
											</td>
											<td>
												<div className="flex items-center gap-2">
													{job.status === 'completed' && (
														<CheckCircle2 className="w-4 h-4 text-emerald-400" />
													)}
													{job.status === 'processing' && (
														<RefreshCw className="w-4 h-4 text-brass-400 animate-spin" />
													)}
													{job.status === 'failed' && (
														<XCircle className="w-4 h-4 text-red-400" />
													)}
													{job.status === 'pending' && (
														<Clock className="w-4 h-4 text-slate-400" />
													)}
													<span className={cn(
														'text-sm',
														job.status === 'completed' ? 'text-emerald-400' :
														job.status === 'processing' ? 'text-brass-400' :
														job.status === 'failed' ? 'text-red-400' : 'text-slate-400'
													)}>
														{job.status}
													</span>
												</div>
											</td>
											<td className="text-slate-500">
												{formatRelativeTime(job.startedAt)}
											</td>
											<td>
												{job.status === 'completed' ? (
													<button className="btn-ghost text-xs">
														View <ChevronRight className="w-3 h-3" />
													</button>
												) : job.status === 'failed' ? (
													<button className="btn-ghost text-xs text-brass-400">
														Retry
													</button>
												) : null}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
