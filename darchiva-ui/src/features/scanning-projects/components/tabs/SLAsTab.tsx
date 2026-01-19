import { cn } from '@/lib/utils';
import { useProjectSLAs, useSLAAlerts, useAcknowledgeSLAAlert } from '../../api/hooks';
import { StatusBadge } from '../core/StatusBadge';
import type { ProjectSLA, SLAAlert, SLAStatus } from '../../types';
import {
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  BellIcon,
} from 'lucide-react';

interface SLAsTabProps {
  projectId: string;
}

const statusIcons: Record<SLAStatus, typeof ShieldCheckIcon> = {
  on_track: CheckCircleIcon,
  at_risk: ClockIcon,
  warning: AlertTriangleIcon,
  breached: ShieldCheckIcon,
};

const statusColors: Record<SLAStatus, { bg: string; border: string; text: string }> = {
  on_track: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400' },
  at_risk: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  warning: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  breached: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
};

export function SLAsTab({ projectId }: SLAsTabProps) {
  const { data: slas, isLoading: slasLoading } = useProjectSLAs(projectId);
  const { data: alerts, isLoading: alertsLoading } = useSLAAlerts(projectId);
  const acknowledgeMutation = useAcknowledgeSLAAlert();

  const unacknowledgedAlerts = alerts?.filter((a: SLAAlert) => !a.acknowledged_at) ?? [];
  const statusCounts = slas?.reduce((acc: Record<SLAStatus, number>, sla: ProjectSLA) => {
    acc[sla.status] = (acc[sla.status] || 0) + 1;
    return acc;
  }, {} as Record<SLAStatus, number>) ?? {};

  return (
    <div className="space-y-6">
      {/* Status Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(['on_track', 'at_risk', 'warning', 'breached'] as SLAStatus[]).map(status => {
          const Icon = statusIcons[status];
          const colors = statusColors[status];
          const count = statusCounts[status] || 0;

          return (
            <div
              key={status}
              className={cn('p-4 rounded-lg border', colors.bg, colors.border)}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-4 h-4', colors.text)} />
                <span className={cn('text-sm font-medium uppercase', colors.text)}>
                  {status.replace('_', ' ')}
                </span>
              </div>
              <div className={cn('text-3xl font-mono font-bold', colors.text)}>{count}</div>
            </div>
          );
        })}
      </div>

      {/* Alerts Panel */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <BellIcon className="w-4 h-4 text-red-400" />
            <span className="font-semibold text-red-400">
              {unacknowledgedAlerts.length} Unacknowledged Alert{unacknowledgedAlerts.length > 1 ? 's' : ''}
            </span>
          </div>
          <div className="space-y-2">
            {unacknowledgedAlerts.slice(0, 5).map((alert: SLAAlert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 bg-black/20 rounded">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{alert.message}</p>
                  <p className="text-[10px] text-white/40 font-mono">
                    {new Date(alert.alert_time).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => acknowledgeMutation.mutate({ alertId: alert.id })}
                  disabled={acknowledgeMutation.isPending}
                  className="px-3 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
                >
                  Acknowledge
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SLA Cards */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Service Level Agreements</h2>
        <button className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md text-sm transition-colors">
          <PlusIcon className="w-4 h-4" />
          Add SLA
        </button>
      </div>

      {slasLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {slas?.map((sla: ProjectSLA) => {
            const Icon = statusIcons[sla.status];
            const colors = statusColors[sla.status];
            const progress = (sla.current_value / sla.target_value) * 100;
            const daysRemaining = Math.ceil((new Date(sla.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

            return (
              <div
                key={sla.id}
                className={cn(
                  'p-4 rounded-lg border transition-all hover:scale-[1.01]',
                  colors.bg,
                  colors.border
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('w-5 h-5', colors.text)} />
                    <div>
                      <h3 className="font-semibold text-white">{sla.name}</h3>
                      <p className="text-xs text-white/50">{sla.sla_type}</p>
                    </div>
                  </div>
                  <StatusBadge status={sla.status} size="sm" />
                </div>

                {sla.description && (
                  <p className="text-sm text-white/60 mb-3">{sla.description}</p>
                )}

                {/* Progress */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-white/50">Progress</span>
                    <span className="font-mono text-white/70">
                      {sla.current_value.toLocaleString()} / {sla.target_value.toLocaleString()} {sla.target_unit}
                    </span>
                  </div>
                  <div className="h-2 bg-black/20 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', colors.text.replace('text-', 'bg-'))}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    />
                  </div>
                </div>

                {/* Thresholds */}
                {(sla.threshold_warning || sla.threshold_critical) && (
                  <div className="flex items-center gap-4 text-xs text-white/40 mb-3">
                    {sla.threshold_warning && (
                      <span>Warning: {sla.threshold_warning.toLocaleString()}</span>
                    )}
                    {sla.threshold_critical && (
                      <span>Critical: {sla.threshold_critical.toLocaleString()}</span>
                    )}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs">
                  <span className="text-white/40">
                    {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
                  </span>
                  {sla.penalty_amount && (
                    <span className="text-red-400 font-mono">
                      Penalty: ${sla.penalty_amount.toLocaleString()} {sla.penalty_currency}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
