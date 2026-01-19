// (c) Copyright Datacraft, 2026
import { Link } from 'react-router-dom';
import { Calendar, FileText, Users, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScanningProject } from '@/types';

function formatDate(date: string): string {
	const d = new Date(date);
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

interface ProjectCardProps {
	project: ScanningProject;
}

const statusConfig: Record<ScanningProject['status'], { label: string; className: string; icon: typeof Clock }> = {
	planning: { label: 'Planning', className: 'bg-slate-500/10 text-slate-400', icon: Clock },
	in_progress: { label: 'In Progress', className: 'bg-blue-500/10 text-blue-400', icon: FileText },
	quality_review: { label: 'QC Review', className: 'bg-amber-500/10 text-amber-400', icon: AlertCircle },
	completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-400', icon: CheckCircle },
	on_hold: { label: 'On Hold', className: 'bg-rose-500/10 text-rose-400', icon: AlertCircle },
};

export function ProjectCard({ project }: ProjectCardProps) {
	const status = statusConfig[project.status] ?? statusConfig.planning;
	const StatusIcon = status.icon;

	// Use optional fields with defaults
	const estimatedPages = project.estimatedPages ?? 0;
	const scannedPages = project.scannedPages ?? 0;
	const verifiedPages = project.verifiedPages ?? 0;
	const targetDpi = project.targetDpi ?? 300;
	const colorMode = project.colorMode ?? 'color';

	const progress = estimatedPages > 0
		? Math.round((scannedPages / estimatedPages) * 100)
		: 0;
	const verifiedProgress = estimatedPages > 0
		? Math.round((verifiedPages / estimatedPages) * 100)
		: 0;

	return (
		<Link
			to={`/scanning-projects/${project.id}`}
			className="block bg-slate-900 border border-slate-800 rounded-lg p-6 hover:border-slate-700 transition-colors"
		>
			<div className="flex items-start justify-between mb-4">
				<div>
					<h3 className="text-lg font-semibold text-slate-100">{project.name}</h3>
					{project.description && (
						<p className="text-sm text-slate-400 mt-1 line-clamp-2">{project.description}</p>
					)}
				</div>
				<span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', status.className)}>
					<StatusIcon className="w-3.5 h-3.5" />
					{status.label}
				</span>
			</div>

			<div className="space-y-3 mb-4">
				<div>
					<div className="flex items-center justify-between text-sm mb-1">
						<span className="text-slate-400">Scanned</span>
						<span className="text-slate-300">{scannedPages.toLocaleString()} / {estimatedPages.toLocaleString()} pages</span>
					</div>
					<div className="h-2 bg-slate-800 rounded-full overflow-hidden">
						<div
							className="h-full bg-blue-500 rounded-full transition-all"
							style={{ width: `${progress}%` }}
						/>
					</div>
				</div>

				<div>
					<div className="flex items-center justify-between text-sm mb-1">
						<span className="text-slate-400">Verified</span>
						<span className="text-slate-300">{verifiedPages.toLocaleString()} pages ({verifiedProgress}%)</span>
					</div>
					<div className="h-2 bg-slate-800 rounded-full overflow-hidden">
						<div
							className="h-full bg-emerald-500 rounded-full transition-all"
							style={{ width: `${verifiedProgress}%` }}
						/>
					</div>
				</div>
			</div>

			<div className="flex items-center gap-4 text-sm text-slate-400">
				<div className="flex items-center gap-1.5">
					<FileText className="w-4 h-4" />
					<span>{targetDpi} DPI</span>
				</div>
				<div className="flex items-center gap-1.5">
					<span className="capitalize">{colorMode}</span>
				</div>
				{project.targetEndDate && (
					<div className="flex items-center gap-1.5 ml-auto">
						<Calendar className="w-4 h-4" />
						<span>{formatDate(project.targetEndDate)}</span>
					</div>
				)}
			</div>
		</Link>
	);
}
