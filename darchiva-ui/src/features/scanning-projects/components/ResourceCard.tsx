// (c) Copyright Datacraft, 2026
import { User, Printer, Monitor, CheckCircle, Clock, Wrench, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScanningResource } from '@/types';

interface ResourceCardProps {
	resource: ScanningResource;
	onClick?: (resource: ScanningResource) => void;
}

const typeConfig: Record<ScanningResource['type'], { icon: typeof User; label: string }> = {
	operator: { icon: User, label: 'Operator' },
	scanner: { icon: Printer, label: 'Scanner' },
	workstation: { icon: Monitor, label: 'Workstation' },
};

const statusConfig: Record<ScanningResource['status'], { icon: typeof Clock; className: string; label: string }> = {
	available: { icon: CheckCircle, className: 'bg-emerald-500/10 text-emerald-400', label: 'Available' },
	busy: { icon: Clock, className: 'bg-blue-500/10 text-blue-400', label: 'Busy' },
	maintenance: { icon: Wrench, className: 'bg-amber-500/10 text-amber-400', label: 'Maintenance' },
	offline: { icon: XCircle, className: 'bg-slate-500/10 text-slate-400', label: 'Offline' },
};

export function ResourceCard({ resource, onClick }: ResourceCardProps) {
	const type = typeConfig[resource.type];
	const status = statusConfig[resource.status];
	const TypeIcon = type.icon;
	const StatusIcon = status.icon;

	return (
		<div
			className={cn('bg-slate-900 border border-slate-800 rounded-lg p-4', onClick && 'cursor-pointer hover:border-slate-700 transition-colors')}
			onClick={() => onClick?.(resource)}
		>
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
						<TypeIcon className="w-5 h-5 text-slate-400" />
					</div>
					<div>
						<h4 className="font-medium text-slate-100">{resource.name}</h4>
						<p className="text-sm text-slate-500">{type.label}</p>
					</div>
				</div>
				<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', status.className)}>
					<StatusIcon className="w-3 h-3" />
					{status.label}
				</span>
			</div>

			{resource.description && (
				<p className="text-sm text-slate-400 mb-3">{resource.description}</p>
			)}

			<div className="flex flex-wrap gap-2 text-xs text-slate-400">
				{resource.type === 'scanner' && (
					<>
						{resource.model && <span className="bg-slate-800 px-2 py-1 rounded">{resource.model}</span>}
						{resource.maxDPI && <span className="bg-slate-800 px-2 py-1 rounded">{resource.maxDPI} DPI</span>}
						{resource.supportsColor && <span className="bg-slate-800 px-2 py-1 rounded">Color</span>}
						{resource.supportsDuplex && <span className="bg-slate-800 px-2 py-1 rounded">Duplex</span>}
					</>
				)}
				{resource.type === 'operator' && resource.email && (
					<span className="bg-slate-800 px-2 py-1 rounded">{resource.email}</span>
				)}
				{resource.type === 'workstation' && resource.location && (
					<span className="bg-slate-800 px-2 py-1 rounded">{resource.location}</span>
				)}
			</div>
		</div>
	);
}
