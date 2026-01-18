import { cn } from '@/lib/utils';
import {
  FileTextIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  UserIcon,
  PrinterIcon,
  FolderIcon,
  ClockIcon,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'scan' | 'verify' | 'reject' | 'operator' | 'equipment' | 'batch' | 'milestone';
  message: string;
  timestamp: string;
  metadata?: Record<string, string | number>;
}

// Mock data for demonstration
const mockActivities: ActivityItem[] = [
  { id: '1', type: 'scan', message: 'Batch B-2024-0142 completed scanning', timestamp: new Date(Date.now() - 300000).toISOString(), metadata: { pages: 1250 } },
  { id: '2', type: 'verify', message: 'Operator verified 450 pages', timestamp: new Date(Date.now() - 900000).toISOString(), metadata: { operator: 'J. Smith' } },
  { id: '3', type: 'reject', message: '12 pages flagged for rescan', timestamp: new Date(Date.now() - 1800000).toISOString(), metadata: { batch: 'B-2024-0139' } },
  { id: '4', type: 'operator', message: 'Shift change: 3 operators started', timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '5', type: 'equipment', message: 'Scanner SCN-04 maintenance completed', timestamp: new Date(Date.now() - 7200000).toISOString() },
  { id: '6', type: 'milestone', message: '50% milestone reached', timestamp: new Date(Date.now() - 14400000).toISOString() },
];

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
  // In production, this would use a real hook
  const activities = mockActivities;

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
                      {activity.metadata?.pages && (
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
          View All Activity
        </button>
      </div>
    </div>
  );
}
