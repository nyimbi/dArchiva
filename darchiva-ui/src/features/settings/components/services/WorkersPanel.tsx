// Workers Management Panel
import { cn } from '@/lib/utils';
import { SettingsBadge } from '../ui/SettingsControls';
import { useWorkers, useWorkerAction } from '../../api/hooks';
import type { WorkerInfo, ServiceStatus } from '../../types';
import {
	CogIcon,
	PlayIcon,
	PauseIcon,
	StopIcon,
	ArrowPathIcon,
} from '@heroicons/react/24/outline';

export function WorkersPanel() {
	const { data: workers, isLoading } = useWorkers();
	const actionMutation = useWorkerAction();

	if (isLoading) {
		return <div className="animate-pulse h-64 bg-slate-800/50 rounded-lg" />;
	}

	// Group by queue
	const byQueue = workers?.reduce((acc, w) => {
		acc[w.queue] = acc[w.queue] || [];
		acc[w.queue].push(w);
		return acc;
	}, {} as Record<string, WorkerInfo[]>) || {};

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">Workers</h2>
				<p className="text-sm text-slate-400 mt-1">Background task workers by queue</p>
			</div>

			{/* Summary */}
			<div className="grid grid-cols-4 gap-4">
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Total Workers</div>
					<div className="text-2xl font-mono font-bold text-white">{workers?.length || 0}</div>
				</div>
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Active Tasks</div>
					<div className="text-2xl font-mono font-bold text-cyan-400">
						{workers?.reduce((sum, w) => sum + w.active_tasks, 0) || 0}
					</div>
				</div>
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Completed</div>
					<div className="text-2xl font-mono font-bold text-emerald-400">
						{workers?.reduce((sum, w) => sum + w.completed_tasks, 0).toLocaleString() || 0}
					</div>
				</div>
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Failed</div>
					<div className="text-2xl font-mono font-bold text-red-400">
						{workers?.reduce((sum, w) => sum + w.failed_tasks, 0) || 0}
					</div>
				</div>
			</div>

			{/* Workers by Queue */}
			{Object.entries(byQueue).map(([queue, queueWorkers]) => (
				<div key={queue} className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
					<div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<CogIcon className="w-5 h-5 text-slate-400" />
							<h3 className="font-medium text-white font-mono">{queue}</h3>
						</div>
						<div className="flex items-center gap-2 text-xs text-slate-500">
							<span>{queueWorkers.length} workers</span>
							<span>•</span>
							<span>Concurrency: {queueWorkers.reduce((sum, w) => sum + w.concurrency, 0)}</span>
						</div>
					</div>
					<div className="divide-y divide-slate-700/50">
						{queueWorkers.map((worker) => (
							<WorkerRow
								key={worker.id}
								worker={worker}
								onAction={(action) => actionMutation.mutate({ id: worker.id, action })}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function WorkerRow({ worker, onAction }: {
	worker: WorkerInfo;
	onAction: (action: 'start' | 'stop' | 'restart' | 'pause' | 'resume') => void;
}) {
	const statusColors: Record<ServiceStatus, string> = {
		running: 'success',
		stopped: 'default',
		error: 'error',
		starting: 'warning',
		stopping: 'warning',
		unknown: 'default',
	};

	return (
		<div className="px-6 py-4 flex items-center justify-between">
			<div className="flex items-center gap-4 flex-1">
				<div className={cn(
					'w-2 h-2 rounded-full',
					worker.status === 'running' && 'bg-emerald-400',
					worker.status === 'stopped' && 'bg-slate-500',
					worker.status === 'error' && 'bg-red-400 animate-pulse'
				)} />
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2">
						<span className="font-mono text-sm text-slate-200">{worker.name}</span>
						<SettingsBadge variant={statusColors[worker.status] as any}>
							{worker.status}
						</SettingsBadge>
					</div>
					{worker.current_task && (
						<div className="text-xs text-cyan-400 font-mono truncate mt-1">
							→ {worker.current_task}
						</div>
					)}
				</div>
			</div>

			<div className="flex items-center gap-6">
				{/* Stats */}
				<div className="grid grid-cols-3 gap-4 text-right">
					<div>
						<div className="text-xs text-slate-500">Active</div>
						<div className="font-mono text-sm text-white">{worker.active_tasks}</div>
					</div>
					<div>
						<div className="text-xs text-slate-500">Done</div>
						<div className="font-mono text-sm text-emerald-400">{worker.completed_tasks}</div>
					</div>
					<div>
						<div className="text-xs text-slate-500">Failed</div>
						<div className="font-mono text-sm text-red-400">{worker.failed_tasks}</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-1">
					{worker.status === 'running' && (
						<>
							<button
								onClick={() => onAction('pause')}
								className="p-2 rounded hover:bg-amber-500/10 text-slate-400 hover:text-amber-400"
								title="Pause"
							>
								<PauseIcon className="w-4 h-4" />
							</button>
							<button
								onClick={() => onAction('restart')}
								className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
								title="Restart"
							>
								<ArrowPathIcon className="w-4 h-4" />
							</button>
						</>
					)}
					{worker.status === 'stopped' && (
						<button
							onClick={() => onAction('start')}
							className="p-2 rounded hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400"
							title="Start"
						>
							<PlayIcon className="w-4 h-4" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
