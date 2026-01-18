import { cn } from '@/lib/utils';
import { useState } from 'react';
import { usePriorityQueue, useSLAAlerts, useEquipmentMaintenance } from '../api/hooks';
import { StatusBadge } from './core/StatusBadge';
import {
  ZapIcon,
  BellIcon,
  WrenchIcon,
  ChevronRightIcon,
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
} from 'lucide-react';

interface QuickActionsPanelProps {
  projectId?: string;
  className?: string;
}

export function QuickActionsPanel({ projectId, className }: QuickActionsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const { data: priorityQueue } = usePriorityQueue(projectId ?? '');
  const { data: alerts } = useSLAAlerts(projectId ?? '');
  const { data: maintenance } = useEquipmentMaintenance();

  const rushItems = priorityQueue?.filter(q => q.is_rush).slice(0, 5) ?? [];
  const unacknowledgedAlerts = alerts?.filter(a => !a.acknowledged_at).slice(0, 5) ?? [];
  const overdueMaintenance = maintenance?.filter(m => m.status === 'overdue').slice(0, 3) ?? [];
  const upcomingMaintenance = maintenance?.filter(m =>
    m.status === 'scheduled' &&
    new Date(m.scheduled_date) <= new Date(Date.now() + 24 * 60 * 60 * 1000)
  ).slice(0, 3) ?? [];

  const totalItems = rushItems.length + unacknowledgedAlerts.length + overdueMaintenance.length;

  if (!projectId && totalItems === 0) return null;

  return (
    <div
      className={cn(
        'bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden',
        className
      )}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-2">
          <ZapIcon className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-white">Quick Actions</span>
          {totalItems > 0 && (
            <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-mono rounded">
              {totalItems}
            </span>
          )}
        </div>
        <ChevronRightIcon
          className={cn('w-4 h-4 text-white/40 transition-transform', expanded && 'rotate-90')}
        />
      </button>

      {expanded && (
        <div className="border-t border-white/5">
          {/* Rush Queue */}
          {rushItems.length > 0 && (
            <Section
              icon={<ZapIcon className="w-4 h-4 text-amber-400" />}
              title="Rush Queue"
              count={rushItems.length}
              color="amber"
            >
              {rushItems.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 hover:bg-white/[0.02] rounded cursor-pointer"
                >
                  <div>
                    <span className="text-sm text-white font-mono">
                      {item.batch?.batch_number || item.batch_id.slice(0, 8)}
                    </span>
                    {item.priority_reason && (
                      <span className="block text-xs text-white/40">{item.priority_reason}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-amber-400">P{item.priority}</span>
                    {item.due_date && (
                      <span className="text-[10px] text-white/40">
                        {new Date(item.due_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* SLA Alerts */}
          {unacknowledgedAlerts.length > 0 && (
            <Section
              icon={<BellIcon className="w-4 h-4 text-red-400" />}
              title="SLA Alerts"
              count={unacknowledgedAlerts.length}
              color="red"
            >
              {unacknowledgedAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="p-2 hover:bg-white/[0.02] rounded"
                >
                  <p className="text-sm text-white truncate">{alert.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-white/40 font-mono">
                      {new Date(alert.alert_time).toLocaleString()}
                    </span>
                    <button className="text-[10px] text-cyan-400 hover:underline">ACK</button>
                  </div>
                </div>
              ))}
            </Section>
          )}

          {/* Maintenance */}
          {(overdueMaintenance.length > 0 || upcomingMaintenance.length > 0) && (
            <Section
              icon={<WrenchIcon className="w-4 h-4 text-cyan-400" />}
              title="Maintenance"
              count={overdueMaintenance.length + upcomingMaintenance.length}
              color="cyan"
            >
              {overdueMaintenance.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 hover:bg-white/[0.02] rounded"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangleIcon className="w-3 h-3 text-red-400" />
                    <span className="text-sm text-white">{item.title}</span>
                  </div>
                  <StatusBadge status="overdue" size="sm" />
                </div>
              ))}
              {upcomingMaintenance.map(item => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 hover:bg-white/[0.02] rounded"
                >
                  <div className="flex items-center gap-2">
                    <ClockIcon className="w-3 h-3 text-white/40" />
                    <span className="text-sm text-white">{item.title}</span>
                  </div>
                  <span className="text-[10px] text-white/40">
                    {new Date(item.scheduled_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </Section>
          )}

          {/* Empty State */}
          {totalItems === 0 && (
            <div className="p-4 text-center text-sm text-white/40">
              <CheckCircleIcon className="w-6 h-6 mx-auto mb-2 text-emerald-400" />
              All clear! No pending actions.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  icon,
  title,
  count,
  color,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count: number;
  color: 'amber' | 'red' | 'cyan';
  children: React.ReactNode;
}) {
  const colorClasses = {
    amber: 'border-l-amber-400',
    red: 'border-l-red-400',
    cyan: 'border-l-cyan-400',
  };

  return (
    <div className={cn('border-l-2 mx-2 my-2', colorClasses[color])}>
      <div className="flex items-center gap-2 px-3 py-2">
        {icon}
        <span className="text-xs font-medium text-white/70 uppercase tracking-wider">{title}</span>
        <span className="text-[10px] font-mono text-white/40">({count})</span>
      </div>
      <div className="px-2 pb-2 space-y-1">{children}</div>
    </div>
  );
}
