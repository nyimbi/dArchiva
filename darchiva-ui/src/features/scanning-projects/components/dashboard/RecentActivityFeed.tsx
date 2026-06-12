import { cn } from '@/lib/utils';
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  FileTextIcon,
  FolderIcon,
  PrinterIcon,
  UserIcon,
} from 'lucide-react';
import { useMemo } from 'react';
import { useBatches,useProjectDashboard } from '../../api/hooks';

interface ActivityItem {
	id: string;
	type: 'scan' | 'verify' | 'reject' | 'operator' | 'equipment' | 'batch' | 'milestone';
	message: string;
	timestamp: string;
	metadata?: Record<string, string | number>;
}

const activityIcons: Record<ActivityItem['type'], typeof FileTextIcon> = {
	scan: FileTextIcon,
	verify: CheckCircleIcon,
	reject: AlertTriangleIcon,
	operator: UserIcon,
	equipment: PrinterIcon,
	batch: FolderIcon,
	milestone: ClockIcon,
};

const activityColors: Record<ActivityItem['type'], string> = {
	scan: 'text-cyan-400 bg-cyan-400/10',
	verify: 'text-emerald-400 bg-emerald-400/10',
	reject: 'text-red-400 bg-red-400/10',
	operator: 'text-purple-400 bg-purple-400/10',
	equipment: 'text-amber-400 bg-amber-400/10',
	batch: 'text-blue-400 bg-blue-400/10',
	milestone: 'text-pink-400 bg-pink-400/10',
};

interface RecentActivityFeedProps {
	projectId: string;
	className?: string;
}

export function RecentActivityFeed({ projectId, className }: RecentActivityFeedProps) {
	const { data: batchesResponse } = useBatches(projectId);
	const { data: dashboard } = useProjectDashboard(projectId);

	const activities = useMemo<ActivityItem[]>(() => {
		const items: ActivityItem[] = [];
		const batches = batchesResponse?.items ?? [];

		for (const batch of batches.slice(0, 20)) {
			const timestamp = batch.completed_at || batch.started_at || batch.created_at;
			if (batch.status === 'completed') {
				items.push({
					id: `batch-completed-${batch.id}`,
					type: 'scan',
					message: `Batch ${batch.batch_number} completed scanning`,
					timestamp,
					metadata: { pages: batch.scanned_pages },
				});
				continue;
			}
			if (batch.status === 'in_progress') {
				items.push({
					id: `batch-active-${batch.id}`,
					type: 'batch',
					message: `Batch ${batch.batch_number} is currently in progress`,
					timestamp,
					metadata: { pages: batch.scanned_pages },
				});
				continue;
			}
			if (batch.status === 'failed') {
				items.push({
					id: `batch-failed-${batch.id}`,
					type: 'reject',
					message: `Batch ${batch.batch_number} failed and needs attention`,
					timestamp,
				});
			}
		}

		for (const issue of dashboard?.recent_issues ?? []) {
			items.push({
				id: `issue-${issue.id}`,
				type: issue.status === 'resolved' ? 'verify' : 'reject',
				message: issue.title,
				timestamp: issue.created_at,
			});
		}

		return items
			.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
			.slice(0, 20);
	}, [batchesResponse?.items, dashboard?.recent_issues]);

	const formatTime = (timestamp: string) => {
		const date = new Date(timestamp);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);

		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		return date.toLocaleDateString();
	};

	return (
		<div className={cn('bg-white/[0.02] border border-white/10 rounded-lg', className)}>
			<div className="p-4 border-b border-white/10">
				<h3 className="font-semibold text-white/80">Recent Activity</h3>
			</div>

			<div className="max-h-[320px] overflow-y-auto">
				<div className="divide-y divide-white/5">
					{activities.length === 0 && (
						<div className="p-6 text-center text-white/40">No recent activity</div>
					)}
					{activities.map((activity, idx) => {
						const Icon = activityIcons[activity.type];
						return (
							<div
								key={activity.id}
								className="p-3 hover:bg-white/[0.02] transition-colors"
								style={{ animationDelay: `${idx * 50}ms` }}
							>
								<div className="flex gap-3">
									<div className={cn('w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0', activityColors[activity.type])}>
										<Icon className="w-3.5 h-3.5" />
									</div>
									<div className="flex-1 min-w-0">
										<p className="text-sm text-white/80">{activity.message}</p>
										<div className="flex items-center gap-2 mt-1">
											<span className="text-[10px] text-white/40 font-mono">{formatTime(activity.timestamp)}</span>
											{typeof activity.metadata?.pages === 'number' && (
												<span className="text-[10px] text-cyan-400/70 font-mono">
													{activity.metadata.pages.toLocaleString()} pages
												</span>
											)}
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>

			<div className="p-3 border-t border-white/10">
				<button className="w-full text-xs text-white/50 hover:text-white/70 transition-colors font-medium">
					{activities.length === 0 ? 'No activity to display' : 'View All Activity'}
				</button>
			</div>
		</div>
	);
}
