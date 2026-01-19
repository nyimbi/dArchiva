// (c) Copyright Datacraft, 2026
import { Link, useNavigate } from 'react-router-dom';
import { Package, Barcode, MapPin, User, FileText, CheckCircle, Clock, AlertCircle, Loader2, ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScanningBatch } from '@/types';

interface BatchCardProps {
	batch: ScanningBatch;
	projectId: string;
}

const statusConfig: Record<ScanningBatch['status'], { label: string; className: string; icon: typeof Clock }> = {
	pending: { label: 'Pending', className: 'bg-slate-500/10 text-slate-400', icon: Clock },
	scanning: { label: 'Scanning', className: 'bg-blue-500/10 text-blue-400', icon: Loader2 },
	ocr_processing: { label: 'OCR Processing', className: 'bg-purple-500/10 text-purple-400', icon: Loader2 },
	qc_pending: { label: 'QC Pending', className: 'bg-amber-500/10 text-amber-400', icon: AlertCircle },
	qc_passed: { label: 'QC Passed', className: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle },
	qc_failed: { label: 'QC Failed', className: 'bg-rose-500/10 text-rose-400', icon: AlertCircle },
	completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle },
};

const typeIcons: Record<ScanningBatch['type'], typeof Package> = {
	box: Package,
	folder: FileText,
	volume: FileText,
};

export function BatchCard({ batch, projectId }: BatchCardProps) {
	const navigate = useNavigate();
	const status = statusConfig[batch.status];
	const StatusIcon = status.icon;
	const TypeIcon = typeIcons[batch.type];
	const progress = batch.estimatedPages > 0
		? Math.round((batch.scannedPages / batch.estimatedPages) * 100)
		: 0;

	const canScan = batch.status === 'pending' || batch.status === 'scanning';

	return (
		<div className="bg-slate-900 border border-slate-800 rounded-lg p-4 hover:border-slate-700 transition-colors">
			<div className="flex items-start justify-between mb-3">
				<div className="flex items-center gap-2">
					<TypeIcon className="w-5 h-5 text-slate-400" />
					<div>
						<h4 className="font-medium text-slate-100">{batch.batchNumber}</h4>
						<p className="text-xs text-slate-500 capitalize">{batch.type}</p>
					</div>
				</div>
				<span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', status.className)}>
					<StatusIcon className={cn('w-3 h-3', status.icon === Loader2 && 'animate-spin')} />
					{status.label}
				</span>
			</div>

			<div className="space-y-2 mb-3">
				<div className="flex items-center justify-between text-sm">
					<span className="text-slate-400">Progress</span>
					<span className="text-slate-300">{batch.scannedPages} / {batch.estimatedPages} pages</span>
				</div>
				<div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
					<div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
				</div>
			</div>

			<div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
				{batch.barcode && (
					<div className="flex items-center gap-1">
						<Barcode className="w-3.5 h-3.5" />
						<span>{batch.barcode}</span>
					</div>
				)}
				<div className="flex items-center gap-1">
					<MapPin className="w-3.5 h-3.5" />
					<span>{batch.physicalLocation}</span>
				</div>
				{batch.assignedOperatorName && (
					<div className="flex items-center gap-1">
						<User className="w-3.5 h-3.5" />
						<span>{batch.assignedOperatorName}</span>
					</div>
				)}
			</div>

			{/* Scan Button */}
			{canScan && (
				<Link
					to={`/scanning-projects/${projectId}/batches/${batch.id}/scan`}
					className="mt-3 flex items-center justify-center gap-2 w-full py-2 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded-lg text-sm font-medium hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-colors"
				>
					<ScanLine className="w-4 h-4" />
					{batch.status === 'scanning' ? 'Continue Scanning' : 'Start Scanning'}
				</Link>
			)}
		</div>
	);
}
