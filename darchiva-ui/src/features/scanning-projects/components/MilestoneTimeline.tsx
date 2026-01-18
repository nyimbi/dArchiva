// (c) Copyright Datacraft, 2026
import { CheckCircle, Clock, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScanningMilestone } from '@/types';

function formatDate(date: string): string {
	const d = new Date(date);
	return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isPast(date: Date): boolean {
	return date.getTime() < Date.now();
}

interface MilestoneTimelineProps {
	milestones: ScanningMilestone[];
}

const statusConfig: Record<ScanningMilestone['status'], { icon: typeof Clock; className: string }> = {
	pending: { icon: Circle, className: 'text-slate-500' },
	in_progress: { icon: Clock, className: 'text-blue-400' },
	completed: { icon: CheckCircle, className: 'text-emerald-400' },
	overdue: { icon: AlertCircle, className: 'text-rose-400' },
};

export function MilestoneTimeline({ milestones }: MilestoneTimelineProps) {
	const sorted = [...milestones].sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());

	return (
		<div className="relative">
			<div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-800" />
			<div className="space-y-6">
				{sorted.map((milestone, index) => {
					const config = statusConfig[milestone.status];
					const Icon = config.icon;
					const progress = milestone.targetPages > 0
						? Math.round((milestone.actualPages / milestone.targetPages) * 100)
						: 0;
					const isOverdue = milestone.status !== 'completed' && isPast(new Date(milestone.targetDate));

					return (
						<div key={milestone.id} className="relative flex gap-4 pl-10">
							<div className={cn('absolute left-2 w-5 h-5 rounded-full flex items-center justify-center bg-slate-900', config.className)}>
								<Icon className="w-4 h-4" />
							</div>
							<div className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-4">
								<div className="flex items-start justify-between mb-2">
									<div>
										<h4 className="font-medium text-slate-100">{milestone.name}</h4>
										{milestone.description && (
											<p className="text-sm text-slate-400 mt-0.5">{milestone.description}</p>
										)}
									</div>
									<span className={cn('text-sm', isOverdue ? 'text-rose-400' : 'text-slate-400')}>
										{formatDate(milestone.targetDate)}
									</span>
								</div>
								<div className="flex items-center gap-4">
									<div className="flex-1">
										<div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
											<div
												className={cn('h-full rounded-full', milestone.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500')}
												style={{ width: `${Math.min(progress, 100)}%` }}
											/>
										</div>
									</div>
									<span className="text-sm text-slate-400">
										{milestone.actualPages.toLocaleString()} / {milestone.targetPages.toLocaleString()}
									</span>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
