// System Health Status Banner
import { cn } from '@/lib/utils';
import { useSystemHealth } from '../api/hooks';
import {
	CheckCircleIcon,
	ExclamationTriangleIcon,
	XCircleIcon,
	ServerIcon,
	CpuChipIcon,
	CircleStackIcon,
} from '@heroicons/react/24/outline';

export function SystemHealthBanner() {
	const { data: health, isLoading } = useSystemHealth();

	if (isLoading || !health) {
		return (
			<div className="h-12 bg-slate-800/50 border-b border-slate-700/50 animate-pulse" />
		);
	}

	const statusConfig = {
		healthy: { icon: CheckCircleIcon, color: 'text-emerald-400', bg: 'bg-emerald-500/10', label: 'All Systems Operational' },
		degraded: { icon: ExclamationTriangleIcon, color: 'text-amber-400', bg: 'bg-amber-500/10', label: 'Degraded Performance' },
		unhealthy: { icon: XCircleIcon, color: 'text-red-400', bg: 'bg-red-500/10', label: 'System Issues Detected' },
	};

	const config = statusConfig[health.overall_status];
	const Icon = config.icon;

	const runningServices = health.services.filter((s) => s.status === 'running').length;
	const activeWorkers = health.workers.filter((w) => w.status === 'running').length;
	const dbConnected = health.database.connected;

	return (
		<div className={cn('h-12 border-b border-slate-700/50 flex items-center justify-between px-4', config.bg)}>
			<div className="flex items-center gap-3">
				<Icon className={cn('w-5 h-5', config.color)} />
				<span className={cn('font-medium text-sm', config.color)}>{config.label}</span>
			</div>

			<div className="flex items-center gap-6 text-xs font-mono">
				<div className="flex items-center gap-2">
					<ServerIcon className="w-4 h-4 text-slate-500" />
					<span className="text-slate-400">{runningServices}/{health.services.length} services</span>
				</div>
				<div className="flex items-center gap-2">
					<CpuChipIcon className="w-4 h-4 text-slate-500" />
					<span className="text-slate-400">{activeWorkers}/{health.workers.length} workers</span>
				</div>
				<div className="flex items-center gap-2">
					<CircleStackIcon className={cn('w-4 h-4', dbConnected ? 'text-emerald-400' : 'text-red-400')} />
					<span className={dbConnected ? 'text-emerald-400' : 'text-red-400'}>
						DB {dbConnected ? 'OK' : 'ERROR'}
					</span>
				</div>
			</div>
		</div>
	);
}
