// Scheduler Management Panel
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { SettingsBadge, SettingsButton, SettingsToggle } from '../ui/SettingsControls';
import { useScheduledTasks, useToggleTask, useRunTask } from '../../api/hooks';
import type { ScheduledTask } from '../../types';
import {
	ClockIcon,
	PlayIcon,
	PauseIcon,
	ArrowPathIcon,
	CalendarDaysIcon,
	CheckCircleIcon,
	ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

export function SchedulerPanel() {
	const { data: tasks, isLoading } = useScheduledTasks();
	const toggleMutation = useToggleTask();
	const runMutation = useRunTask();

	if (isLoading) {
		return <div className="animate-pulse h-64 bg-slate-800/50 rounded-lg" />;
	}

	// Group by category
	const byCategory = tasks?.reduce((acc, t) => {
		const cat = t.category || 'other';
		acc[cat] = acc[cat] || [];
		acc[cat].push(t);
		return acc;
	}, {} as Record<string, ScheduledTask[]>) || {};

	const categoryLabels: Record<string, string> = {
		maintenance: 'Maintenance',
		indexing: 'Indexing',
		cleanup: 'Cleanup',
		reports: 'Reports',
		sync: 'Synchronization',
		backup: 'Backup',
		other: 'Other',
	};

	const enabledCount = tasks?.filter(t => t.enabled).length || 0;
	const runningCount = tasks?.filter(t => t.is_running).length || 0;

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">Scheduler</h2>
				<p className="text-sm text-slate-400 mt-1">Manage scheduled tasks and cron jobs</p>
			</div>

			{/* Summary */}
			<div className="grid grid-cols-4 gap-4">
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Total Tasks</div>
					<div className="text-2xl font-mono font-bold text-white">{tasks?.length || 0}</div>
				</div>
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Enabled</div>
					<div className="text-2xl font-mono font-bold text-emerald-400">{enabledCount}</div>
				</div>
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Running</div>
					<div className="text-2xl font-mono font-bold text-cyan-400">{runningCount}</div>
				</div>
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
					<div className="text-xs text-slate-500 font-mono uppercase mb-1">Categories</div>
					<div className="text-2xl font-mono font-bold text-white">{Object.keys(byCategory).length}</div>
				</div>
			</div>

			{/* Task Groups */}
			{Object.entries(byCategory).map(([category, categoryTasks]) => (
				<div key={category} className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
					<div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
						<div className="flex items-center gap-3">
							<CalendarDaysIcon className="w-5 h-5 text-slate-400" />
							<h3 className="font-medium text-white">{categoryLabels[category] || category}</h3>
						</div>
						<span className="text-xs text-slate-500 font-mono">{categoryTasks.length} tasks</span>
					</div>
					<div className="divide-y divide-slate-700/50">
						{categoryTasks.map((task) => (
							<TaskRow
								key={task.id}
								task={task}
								onToggle={(enabled) => toggleMutation.mutate({ id: task.id, enabled })}
								onRun={() => runMutation.mutate(task.id)}
							/>
						))}
					</div>
				</div>
			))}

			{(!tasks || tasks.length === 0) && (
				<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-12 text-center">
					<ClockIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
					<p className="text-slate-400">No scheduled tasks configured</p>
				</div>
			)}
		</div>
	);
}

function TaskRow({ task, onToggle, onRun }: {
	task: ScheduledTask;
	onToggle: (enabled: boolean) => void;
	onRun: () => void;
}) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div className="px-6 py-4">
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-4 flex-1">
					<div className={cn(
						'w-2 h-2 rounded-full',
						task.is_running && 'bg-cyan-400 animate-pulse',
						!task.is_running && task.enabled && 'bg-emerald-400',
						!task.enabled && 'bg-slate-600'
					)} />
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<button
								onClick={() => setExpanded(!expanded)}
								className="font-medium text-slate-200 hover:text-white"
							>
								{task.name}
							</button>
							{task.is_running && (
								<SettingsBadge variant="info">Running</SettingsBadge>
							)}
							{task.last_run_success === false && (
								<SettingsBadge variant="error">Failed</SettingsBadge>
							)}
						</div>
						<div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
							<span className="font-mono">{task.schedule}</span>
							{task.next_run && (
								<span className="flex items-center gap-1">
									<ClockIcon className="w-3 h-3" />
									Next: {formatRelativeTime(task.next_run)}
								</span>
							)}
						</div>
					</div>
				</div>

				<div className="flex items-center gap-4">
					{/* Last run info */}
					{task.last_run && (
						<div className="text-right text-xs">
							<div className="flex items-center gap-1 text-slate-400">
								{task.last_run_success ? (
									<CheckCircleIcon className="w-3 h-3 text-emerald-400" />
								) : (
									<ExclamationCircleIcon className="w-3 h-3 text-red-400" />
								)}
								<span>{formatRelativeTime(task.last_run)}</span>
							</div>
							{task.last_duration_seconds && (
								<span className="text-slate-500 font-mono">
									{formatDuration(task.last_duration_seconds)}
								</span>
							)}
						</div>
					)}

					{/* Actions */}
					<div className="flex items-center gap-2">
						<button
							onClick={onRun}
							disabled={task.is_running}
							className={cn(
								'p-2 rounded transition-colors',
								task.is_running
									? 'text-slate-600 cursor-not-allowed'
									: 'hover:bg-cyan-500/10 text-slate-400 hover:text-cyan-400'
							)}
							title="Run now"
						>
							{task.is_running ? (
								<ArrowPathIcon className="w-4 h-4 animate-spin" />
							) : (
								<PlayIcon className="w-4 h-4" />
							)}
						</button>
						<SettingsToggle
							label=""
							checked={task.enabled}
							onChange={onToggle}
						/>
					</div>
				</div>
			</div>

			{/* Expanded details */}
			{expanded && (
				<div className="mt-4 ml-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700/30">
					{task.description && (
						<p className="text-sm text-slate-400 mb-3">{task.description}</p>
					)}
					<div className="grid grid-cols-3 gap-4 text-xs">
						<div>
							<span className="text-slate-500">Task</span>
							<span className="block font-mono text-slate-300">{task.task_name}</span>
						</div>
						<div>
							<span className="text-slate-500">Schedule</span>
							<span className="block font-mono text-slate-300">{task.schedule}</span>
						</div>
						<div>
							<span className="text-slate-500">Timeout</span>
							<span className="block font-mono text-slate-300">
								{task.timeout_seconds ? `${task.timeout_seconds}s` : 'None'}
							</span>
						</div>
					</div>
					{task.args && Object.keys(task.args).length > 0 && (
						<div className="mt-3 pt-3 border-t border-slate-700/30">
							<span className="text-xs text-slate-500">Arguments</span>
							<pre className="mt-1 text-xs font-mono text-slate-400 bg-slate-950/50 p-2 rounded overflow-x-auto">
								{JSON.stringify(task.args, null, 2)}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = date.getTime() - now.getTime();
	const diffMins = Math.round(diffMs / 60000);

	if (Math.abs(diffMins) < 1) return 'now';
	if (diffMins > 0) {
		if (diffMins < 60) return `in ${diffMins}m`;
		if (diffMins < 1440) return `in ${Math.floor(diffMins / 60)}h`;
		return `in ${Math.floor(diffMins / 1440)}d`;
	} else {
		const absMins = Math.abs(diffMins);
		if (absMins < 60) return `${absMins}m ago`;
		if (absMins < 1440) return `${Math.floor(absMins / 60)}h ago`;
		return `${Math.floor(absMins / 1440)}d ago`;
	}
}

function formatDuration(seconds: number): string {
	if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
	if (seconds < 60) return `${seconds.toFixed(1)}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
	return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
