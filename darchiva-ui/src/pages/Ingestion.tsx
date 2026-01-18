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
} from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';
import type { IngestionSource, IngestionJob } from '@/types';

const mockSources: IngestionSource[] = [
	{ id: 's1', name: 'Inbox Folder', sourceType: 'watched_folder', mode: 'operational', isActive: true, lastCheckAt: new Date(Date.now() - 60000).toISOString(), createdAt: new Date(Date.now() - 2592000000).toISOString() },
	{ id: 's2', name: 'archive@company.com', sourceType: 'email', mode: 'archival', isActive: true, lastCheckAt: new Date(Date.now() - 300000).toISOString(), createdAt: new Date(Date.now() - 1728000000).toISOString() },
	{ id: 's3', name: 'Scanner Output', sourceType: 'watched_folder', mode: 'operational', isActive: false, createdAt: new Date(Date.now() - 864000000).toISOString() },
	{ id: 's4', name: 'API Webhook', sourceType: 'api', mode: 'operational', isActive: true, createdAt: new Date(Date.now() - 432000000).toISOString() },
];

const mockJobs: IngestionJob[] = [
	{ id: 'j1', sourceId: 's1', sourceType: 'watched_folder', sourcePath: '/inbox/Contract_2024.pdf', status: 'completed', mode: 'operational', documentId: 'd1', createdAt: new Date(Date.now() - 300000).toISOString() },
	{ id: 'j2', sourceId: 's2', sourceType: 'email', sourcePath: 'From: vendor@example.com', status: 'processing', mode: 'archival', createdAt: new Date(Date.now() - 120000).toISOString() },
	{ id: 'j3', sourceId: 's1', sourceType: 'watched_folder', sourcePath: '/inbox/Invoice_March.pdf', status: 'completed', mode: 'operational', documentId: 'd2', createdAt: new Date(Date.now() - 600000).toISOString() },
	{ id: 'j4', sourceId: 's4', sourceType: 'api', sourcePath: 'POST /api/ingest', status: 'failed', mode: 'operational', errorMessage: 'Invalid file format', createdAt: new Date(Date.now() - 900000).toISOString() },
	{ id: 'j5', sourceId: 's2', sourceType: 'email', sourcePath: 'From: client@legal.com', status: 'completed', mode: 'archival', documentId: 'd3', createdAt: new Date(Date.now() - 1200000).toISOString() },
];

const sourceIcons = {
	watched_folder: FolderOpen,
	email: Mail,
	api: Webhook,
};

function SourceCard({ source }: { source: IngestionSource }) {
	const Icon = sourceIcons[source.sourceType];

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
							<span className={cn(
								'badge text-2xs',
								source.mode === 'operational' ? 'badge-brass' : 'badge-blue'
							)}>
								{source.mode}
							</span>
							<span className="text-xs text-slate-500">
								{source.sourceType.replace('_', ' ')}
							</span>
						</div>
					</div>
				</div>
				<button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
					<MoreVertical className="w-4 h-4" />
				</button>
			</div>

			{source.lastCheckAt && (
				<p className="mt-3 text-xs text-slate-500">
					Last checked {formatRelativeTime(source.lastCheckAt)}
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
					<button className={cn(
						'p-1.5 rounded',
						source.isActive
							? 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'
							: 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
					)}>
						{source.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
					</button>
				</div>
			</div>
		</div>
	);
}

export function Ingestion() {
	const [activeTab, setActiveTab] = useState<'sources' | 'jobs'>('sources');

	const stats = {
		active: mockSources.filter(s => s.isActive).length,
		total: mockSources.length,
		jobsToday: mockJobs.length,
		failed: mockJobs.filter(j => j.status === 'failed').length,
	};

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
						{stats.active}/{stats.total}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Jobs Today</p>
					<p className="mt-1 text-2xl font-display font-semibold text-slate-100">
						{stats.jobsToday}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Failed</p>
					<p className="mt-1 text-2xl font-display font-semibold text-red-400">
						{stats.failed}
					</p>
				</div>
				<div className="stat-card">
					<p className="text-sm text-slate-500">Success Rate</p>
					<p className="mt-1 text-2xl font-display font-semibold text-brass-400">
						{(((stats.jobsToday - stats.failed) / stats.jobsToday) * 100).toFixed(0)}%
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
						{mockSources.map((source) => (
							<SourceCard key={source.id} source={source} />
						))}

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
						<table className="data-table">
							<thead>
								<tr>
									<th>Source</th>
									<th>Path / Details</th>
									<th>Mode</th>
									<th>Status</th>
									<th>Time</th>
									<th className="w-24">Actions</th>
								</tr>
							</thead>
							<tbody>
								{mockJobs.map((job) => {
									const Icon = sourceIcons[job.sourceType];
									return (
										<tr key={job.id}>
											<td>
												<div className="flex items-center gap-2">
													<Icon className="w-4 h-4 text-slate-500" />
													<span className="text-slate-300 capitalize">
														{job.sourceType.replace('_', ' ')}
													</span>
												</div>
											</td>
											<td>
												<p className="text-slate-300 truncate max-w-xs">
													{job.sourcePath}
												</p>
												{job.errorMessage && (
													<p className="text-xs text-red-400 mt-0.5">
														{job.errorMessage}
													</p>
												)}
											</td>
											<td>
												<span className={cn(
													'badge text-2xs',
													job.mode === 'operational' ? 'badge-brass' : 'badge-blue'
												)}>
													{job.mode}
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
												{formatRelativeTime(job.createdAt)}
											</td>
											<td>
												{job.documentId ? (
													<button className="btn-ghost text-xs">
														View Doc <ChevronRight className="w-3 h-3" />
													</button>
												) : job.status === 'failed' ? (
													<button className="btn-ghost text-xs text-brass-400">
														Retry
													</button>
												) : null}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
