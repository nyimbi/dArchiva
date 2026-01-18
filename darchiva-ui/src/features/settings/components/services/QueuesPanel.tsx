// Queues Management Panel
import { cn } from '@/lib/utils';
import { SettingsBadge, SettingsButton } from '../ui/SettingsControls';
import { useQueues, usePurgeQueue, useRetryFailedJobs } from '../../api/hooks';
import type { QueueInfo } from '../../types';
import { QueueListIcon, TrashIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

export function QueuesPanel() {
	const { data: queues, isLoading } = useQueues();
	const purgeMutation = usePurgeQueue();
	const retryMutation = useRetryFailedJobs();

	if (isLoading) {
		return <div className="animate-pulse h-64 bg-slate-800/50 rounded-lg" />;
	}

	const totalPending = queues?.reduce((sum, q) => sum + q.pending, 0) || 0;
	const totalActive = queues?.reduce((sum, q) => sum + q.active, 0) || 0;
	const totalFailed = queues?.reduce((sum, q) => sum + q.failed, 0) || 0;

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">Queues</h2>
				<p className="text-sm text-slate-400 mt-1">Monitor task queues and manage backlogs</p>
			</div>

			{/* Overview */}
			<div className="grid grid-cols-4 gap-4">
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Queues</div>
					<div className="text-2xl font-mono font-bold text-white">{queues?.length || 0}</div>
				</div>
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Pending</div>
					<div className="text-2xl font-mono font-bold text-amber-400">{totalPending.toLocaleString()}</div>
				</div>
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Active</div>
					<div className="text-2xl font-mono font-bold text-cyan-400">{totalActive}</div>
				</div>
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Failed</div>
					<div className="text-2xl font-mono font-bold text-red-400">{totalFailed.toLocaleString()}</div>
				</div>
			</div>

			{/* Queue List */}
			<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
				<div className="px-6 py-4 border-b border-slate-700/50">
					<h3 className="font-medium text-white">All Queues</h3>
				</div>
				<div className="divide-y divide-slate-700/50">
					{queues?.map((queue) => (
						<QueueRow
							key={queue.name}
							queue={queue}
							onPurge={(status) => purgeMutation.mutate({ name: queue.name, status })}
							onRetry={() => retryMutation.mutate(queue.name)}
						/>
					))}
					{(!queues || queues.length === 0) && (
						<div className="px-6 py-8 text-center text-slate-500">
							No queues found
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function QueueRow({ queue, onPurge, onRetry }: {
	queue: QueueInfo;
	onPurge: (status?: 'pending' | 'failed' | 'delayed') => void;
	onRetry: () => void;
}) {
	const total = queue.pending + queue.active + queue.completed + queue.failed + queue.delayed;
	const pendingPercent = total > 0 ? (queue.pending / total) * 100 : 0;
	const failedPercent = total > 0 ? (queue.failed / total) * 100 : 0;

	return (
		<div className="px-6 py-4">
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-3">
					<QueueListIcon className="w-5 h-5 text-slate-400" />
					<span className="font-mono text-sm font-medium text-white">{queue.name}</span>
					<span className="text-xs text-slate-500">{queue.consumers} consumers</span>
				</div>
				<div className="flex items-center gap-2">
					{queue.failed > 0 && (
						<button
							onClick={onRetry}
							className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400"
						>
							<ArrowPathIcon className="w-3 h-3" />
							Retry Failed
						</button>
					)}
					{queue.pending > 0 && (
						<button
							onClick={() => onPurge('pending')}
							className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400"
						>
							<TrashIcon className="w-3 h-3" />
							Purge
						</button>
					)}
				</div>
			</div>

			{/* Stats Grid */}
			<div className="grid grid-cols-5 gap-4 mb-3">
				<StatCell label="Pending" value={queue.pending} variant={queue.pending > 100 ? 'warning' : 'default'} />
				<StatCell label="Active" value={queue.active} variant="info" />
				<StatCell label="Completed" value={queue.completed} variant="success" />
				<StatCell label="Failed" value={queue.failed} variant={queue.failed > 0 ? 'error' : 'default'} />
				<StatCell label="Delayed" value={queue.delayed} />
			</div>

			{/* Progress bar */}
			<div className="h-2 bg-slate-700 rounded-full overflow-hidden flex">
				{queue.completed > 0 && (
					<div
						className="bg-emerald-500"
						style={{ width: `${(queue.completed / total) * 100}%` }}
					/>
				)}
				{queue.active > 0 && (
					<div
						className="bg-cyan-500"
						style={{ width: `${(queue.active / total) * 100}%` }}
					/>
				)}
				{queue.pending > 0 && (
					<div
						className="bg-amber-500"
						style={{ width: `${pendingPercent}%` }}
					/>
				)}
				{queue.failed > 0 && (
					<div
						className="bg-red-500"
						style={{ width: `${failedPercent}%` }}
					/>
				)}
			</div>

			{/* Oldest message warning */}
			{queue.oldest_message_age_seconds && queue.oldest_message_age_seconds > 3600 && (
				<div className="mt-2 text-xs text-amber-400">
					⚠ Oldest message: {formatAge(queue.oldest_message_age_seconds)}
				</div>
			)}
		</div>
	);
}

function StatCell({ label, value, variant }: {
	label: string;
	value: number;
	variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}) {
	const colors = {
		default: 'text-slate-300',
		success: 'text-emerald-400',
		warning: 'text-amber-400',
		error: 'text-red-400',
		info: 'text-cyan-400',
	};

	return (
		<div className="text-center">
			<div className="text-[10px] text-slate-500 uppercase">{label}</div>
			<div className={cn('font-mono text-sm font-medium', colors[variant || 'default'])}>
				{value.toLocaleString()}
			</div>
		</div>
	);
}

function formatAge(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
	if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
	return `${Math.floor(seconds / 86400)}d`;
}
