// (c) Copyright Datacraft, 2026
import { CheckCircle, XCircle, Clock, RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QualityControlSample } from '@/types';

interface QCSampleCardProps {
	sample: QualityControlSample;
	onReview: (sample: QualityControlSample) => void;
}

const statusConfig: Record<QualityControlSample['reviewStatus'], { icon: typeof Clock; className: string; label: string }> = {
	pending: { icon: Clock, className: 'text-amber-400', label: 'Pending Review' },
	passed: { icon: CheckCircle, className: 'text-emerald-400', label: 'Passed' },
	failed: { icon: XCircle, className: 'text-rose-400', label: 'Failed' },
	needs_rescan: { icon: RotateCcw, className: 'text-amber-400', label: 'Needs Rescan' },
};

const severityColors = {
	minor: 'bg-slate-500/10 text-slate-400',
	major: 'bg-amber-500/10 text-amber-400',
	critical: 'bg-rose-500/10 text-rose-400',
};

export function QCSampleCard({ sample, onReview }: QCSampleCardProps) {
	const status = statusConfig[sample.reviewStatus];
	const Icon = status.icon;

	return (
		<div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
			<div className="flex items-start justify-between mb-3">
				<div>
					<h4 className="font-medium text-slate-100">Page {sample.pageNumber}</h4>
					<p className="text-sm text-slate-400">Batch: {sample.batchId.slice(0, 8)}</p>
				</div>
				<span className={cn('inline-flex items-center gap-1 text-sm', status.className)}>
					<Icon className="w-4 h-4" />
					{status.label}
				</span>
			</div>

			<div className="grid grid-cols-2 gap-4 mb-3">
				<div>
					<span className="text-xs text-slate-500 block mb-1">Image Quality</span>
					<div className="flex items-center gap-2">
						<div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
							<div
								className={cn('h-full rounded-full', sample.imageQuality >= 80 ? 'bg-emerald-500' : sample.imageQuality >= 60 ? 'bg-amber-500' : 'bg-rose-500')}
								style={{ width: `${sample.imageQuality}%` }}
							/>
						</div>
						<span className="text-sm text-slate-300">{sample.imageQuality}%</span>
					</div>
				</div>
				{sample.ocrAccuracy !== undefined && (
					<div>
						<span className="text-xs text-slate-500 block mb-1">OCR Accuracy</span>
						<div className="flex items-center gap-2">
							<div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
								<div
									className={cn('h-full rounded-full', sample.ocrAccuracy >= 95 ? 'bg-emerald-500' : sample.ocrAccuracy >= 85 ? 'bg-amber-500' : 'bg-rose-500')}
									style={{ width: `${sample.ocrAccuracy}%` }}
								/>
							</div>
							<span className="text-sm text-slate-300">{sample.ocrAccuracy}%</span>
						</div>
					</div>
				)}
			</div>

			{sample.issues.length > 0 && (
				<div className="mb-3">
					<span className="text-xs text-slate-500 block mb-1.5">Issues</span>
					<div className="flex flex-wrap gap-1.5">
						{sample.issues.map((issue) => (
							<span key={issue.id} className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs', severityColors[issue.severity])}>
								<AlertTriangle className="w-3 h-3" />
								{issue.type}
							</span>
						))}
					</div>
				</div>
			)}

			{sample.reviewStatus === 'pending' && (
				<button
					onClick={() => onReview(sample)}
					className="w-full py-2 px-3 bg-brass-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-brass-400 transition-colors"
				>
					Review Sample
				</button>
			)}
		</div>
	);
}
