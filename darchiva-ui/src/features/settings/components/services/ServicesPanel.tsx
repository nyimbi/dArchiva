// Services Management Panel
import { cn } from '@/lib/utils';
import { SettingsBadge, SettingsButton } from '../ui/SettingsControls';
import { useServices, useServiceAction } from '../../api/hooks';
import type { ServiceInfo, ServiceStatus } from '../../types';
import {
	ServerIcon,
	PlayIcon,
	StopIcon,
	ArrowPathIcon,
	CpuChipIcon,
	ClockIcon,
} from '@heroicons/react/24/outline';

const STATUS_CONFIG: Record<ServiceStatus, { color: string; label: string }> = {
	running: { color: 'success', label: 'Running' },
	stopped: { color: 'default', label: 'Stopped' },
	error: { color: 'error', label: 'Error' },
	starting: { color: 'warning', label: 'Starting' },
	stopping: { color: 'warning', label: 'Stopping' },
	unknown: { color: 'default', label: 'Unknown' },
};

export function ServicesPanel() {
	const { data: services, isLoading } = useServices();
	const actionMutation = useServiceAction();

	if (isLoading) {
		return <LoadingState />;
	}

	// Group by type
	const grouped = services?.reduce((acc, s) => {
		acc[s.type] = acc[s.type] || [];
		acc[s.type].push(s);
		return acc;
	}, {} as Record<string, ServiceInfo[]>) || {};

	const typeLabels: Record<string, string> = {
		api: 'API Servers',
		worker: 'Workers',
		scheduler: 'Schedulers',
		indexer: 'Indexers',
		cache: 'Cache',
		database: 'Database',
		storage: 'Storage',
		external: 'External Services',
	};

	return (
		<div className="space-y-6">
			<div className="mb-8">
				<h2 className="text-xl font-semibold text-white">Services</h2>
				<p className="text-sm text-slate-400 mt-1">Monitor and control running services</p>
			</div>

			{/* Overview Stats */}
			<div className="grid grid-cols-4 gap-4">
				<StatCard
					label="Total"
					value={services?.length || 0}
					icon={<ServerIcon className="w-5 h-5" />}
				/>
				<StatCard
					label="Running"
					value={services?.filter(s => s.status === 'running').length || 0}
					variant="success"
					icon={<PlayIcon className="w-5 h-5" />}
				/>
				<StatCard
					label="Stopped"
					value={services?.filter(s => s.status === 'stopped').length || 0}
					icon={<StopIcon className="w-5 h-5" />}
				/>
				<StatCard
					label="Errors"
					value={services?.filter(s => s.status === 'error').length || 0}
					variant="error"
					icon={<ServerIcon className="w-5 h-5" />}
				/>
			</div>

			{/* Service Groups */}
			{Object.entries(grouped).map(([type, typeServices]) => (
				<div key={type} className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
					<div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
						<h3 className="font-medium text-white">{typeLabels[type] || type}</h3>
						<span className="text-xs text-slate-500 font-mono">{typeServices.length} services</span>
					</div>
					<div className="divide-y divide-slate-700/50">
						{typeServices.map((service) => (
							<ServiceRow
								key={service.id}
								service={service}
								onAction={(action) => actionMutation.mutate({ id: service.id, action })}
								isActioning={actionMutation.isPending}
							/>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function ServiceRow({ service, onAction, isActioning }: {
	service: ServiceInfo;
	onAction: (action: 'start' | 'stop' | 'restart') => void;
	isActioning: boolean;
}) {
	const statusConfig = STATUS_CONFIG[service.status];

	return (
		<div className="px-6 py-4 flex items-center justify-between">
			<div className="flex items-center gap-4">
				<div className={cn(
					'w-10 h-10 rounded-lg flex items-center justify-center',
					service.healthy ? 'bg-emerald-500/10' : 'bg-slate-700'
				)}>
					<ServerIcon className={cn(
						'w-5 h-5',
						service.healthy ? 'text-emerald-400' : 'text-slate-400'
					)} />
				</div>
				<div>
					<div className="flex items-center gap-2">
						<span className="font-medium text-slate-200">{service.name}</span>
						<SettingsBadge variant={statusConfig.color as any}>{statusConfig.label}</SettingsBadge>
					</div>
					<div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
						<span className="font-mono">{service.host}:{service.port}</span>
						<span>v{service.version}</span>
						{service.uptime_seconds && (
							<span className="flex items-center gap-1">
								<ClockIcon className="w-3 h-3" />
								{formatUptime(service.uptime_seconds)}
							</span>
						)}
					</div>
				</div>
			</div>

			<div className="flex items-center gap-4">
				{/* Resource usage */}
				{service.memory_mb && (
					<div className="text-right">
						<div className="flex items-center gap-1 text-xs text-slate-400">
							<CpuChipIcon className="w-3 h-3" />
							<span className="font-mono">{service.cpu_percent?.toFixed(1)}%</span>
						</div>
						<div className="text-xs text-slate-500 font-mono">
							{service.memory_mb.toFixed(0)} MB
						</div>
					</div>
				)}

				{/* Actions */}
				<div className="flex gap-1">
					{service.status === 'running' ? (
						<>
							<button
								onClick={() => onAction('restart')}
								disabled={isActioning}
								className="p-2 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
								title="Restart"
							>
								<ArrowPathIcon className="w-4 h-4" />
							</button>
							<button
								onClick={() => onAction('stop')}
								disabled={isActioning}
								className="p-2 rounded hover:bg-red-500/10 text-slate-400 hover:text-red-400 transition-colors"
								title="Stop"
							>
								<StopIcon className="w-4 h-4" />
							</button>
						</>
					) : (
						<button
							onClick={() => onAction('start')}
							disabled={isActioning}
							className="p-2 rounded hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 transition-colors"
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

function StatCard({ label, value, variant, icon }: {
	label: string;
	value: number;
	variant?: 'success' | 'error';
	icon: React.ReactNode;
}) {
	return (
		<div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
			<div className="flex items-center gap-2 text-slate-500 mb-2">
				{icon}
				<span className="text-xs font-mono uppercase">{label}</span>
			</div>
			<span className={cn(
				'text-2xl font-mono font-bold',
				variant === 'success' && 'text-emerald-400',
				variant === 'error' && 'text-red-400',
				!variant && 'text-white'
			)}>
				{value}
			</span>
		</div>
	);
}

function formatUptime(seconds: number): string {
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${mins}m`;
	return `${mins}m`;
}

function LoadingState() {
	return (
		<div className="space-y-4">
			{[1, 2, 3].map(i => (
				<div key={i} className="bg-slate-800/50 rounded-lg p-6 animate-pulse">
					<div className="h-4 w-32 bg-slate-700 rounded mb-4" />
					<div className="space-y-3">
						<div className="h-16 bg-slate-700 rounded" />
						<div className="h-16 bg-slate-700 rounded" />
					</div>
				</div>
			))}
		</div>
	);
}
