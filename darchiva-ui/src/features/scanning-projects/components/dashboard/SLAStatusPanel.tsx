import { cn } from '@/lib/utils';
import { useProjectSLAs, useSLAAlerts, useAcknowledgeSLAAlert } from '../../api/hooks';
import { StatusBadge } from '../core/StatusBadge';
import type { SLAStatus, ProjectSLA } from '../../types';
import { AlertTriangleIcon, CheckCircleIcon, ClockIcon, ShieldAlertIcon } from 'lucide-react';

interface SLAStatusPanelProps {
  projectId: string;
  slaStatus: SLAStatus;
  criticalAlerts: number;
}

const slaIcons: Record<SLAStatus, typeof AlertTriangleIcon> = {
  on_track: CheckCircleIcon,
  at_risk: ClockIcon,
  warning: AlertTriangleIcon,
  breached: ShieldAlertIcon,
};

const statusColors: Record<SLAStatus, string> = {
  on_track: 'text-emerald-400 bg-emerald-400/10',
  at_risk: 'text-amber-400 bg-amber-400/10',
  warning: 'text-orange-400 bg-orange-400/10',
  breached: 'text-red-400 bg-red-400/10',
};

export function SLAStatusPanel({ projectId, slaStatus, criticalAlerts }: SLAStatusPanelProps) {
  const { data: slas } = useProjectSLAs(projectId);
  const { data: alerts } = useSLAAlerts(projectId);
  const acknowledgeMutation = useAcknowledgeSLAAlert();

  const Icon = slaIcons[slaStatus];
  const unacknowledgedAlerts = alerts?.filter(a => !a.acknowledged_at) ?? [];

  const handleAcknowledge = (alertId: string) => {
    acknowledgeMutation.mutate({ alertId });
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <div className={cn('flex items-center justify-between p-4 border-b border-white/10', statusColors[slaStatus])}>
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5" />
          <div>
            <h3 className="font-semibold">SLA Status</h3>
            <p className="text-xs opacity-70">{slas?.length ?? 0} active agreements</p>
          </div>
        </div>
        {criticalAlerts > 0 && (
          <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 text-xs font-mono rounded">
            <AlertTriangleIcon className="w-3 h-3" />
            {criticalAlerts} alerts
          </span>
        )}
      </div>

      {/* SLA List */}
      <div className="divide-y divide-white/5">
        {slas?.slice(0, 4).map((sla: ProjectSLA) => {
          const progress = (sla.current_value / sla.target_value) * 100;
          const isOverTarget = sla.sla_type.includes('max') || sla.sla_type.includes('time');
          const effectiveProgress = isOverTarget ? 100 - progress : progress;

          return (
            <div key={sla.id} className="p-3 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white/80 font-medium">{sla.name}</span>
                <StatusBadge status={sla.status} size="sm" />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-500 rounded-full',
                      sla.status === 'on_track' && 'bg-emerald-400',
                      sla.status === 'at_risk' && 'bg-amber-400',
                      sla.status === 'warning' && 'bg-orange-400',
                      sla.status === 'breached' && 'bg-red-400'
                    )}
                    style={{ width: `${Math.min(100, effectiveProgress)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-white/50 w-20 text-right">
                  {sla.current_value.toLocaleString()} / {sla.target_value.toLocaleString()} {sla.target_unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Unacknowledged Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="border-t border-white/10">
          <div className="p-3 bg-red-500/5">
            <h4 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">
              Pending Alerts
            </h4>
            <div className="space-y-2">
              {unacknowledgedAlerts.slice(0, 3).map(alert => (
                <div
                  key={alert.id}
                  className="flex items-start justify-between gap-2 p-2 bg-red-500/10 rounded text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white/80 truncate">{alert.message}</p>
                    <p className="text-[10px] text-white/40 font-mono">
                      {new Date(alert.alert_time).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    disabled={acknowledgeMutation.isPending}
                    className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white/70 rounded transition-colors"
                  >
                    ACK
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
