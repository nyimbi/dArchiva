import { cn } from '@/lib/utils';
import { useShiftAssignments, useOperatorCertifications } from '../../api/hooks';
import { StatusBadge } from '../core/StatusBadge';
import { MetricCard } from '../core/MetricCard';
import type { ShiftAssignment, OperatorCertification } from '../../types';
import {
  UsersIcon,
  ClockIcon,
  AwardIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
} from 'lucide-react';

interface OperatorsTabProps {
  projectId: string;
}

export function OperatorsTab({ projectId }: OperatorsTabProps) {
  const today = new Date().toISOString().split('T')[0];
  const { data: assignments, isLoading: assignmentsLoading } = useShiftAssignments(today);
  const { data: certifications, isLoading: certsLoading } = useOperatorCertifications();

  const activeOperators = assignments?.filter((a: ShiftAssignment) => a.status === 'active') ?? [];
  const totalPagesToday = assignments?.reduce((sum: number, a: ShiftAssignment) => sum + a.pages_scanned, 0) ?? 0;
  const expiringCerts = certifications?.filter((c: OperatorCertification) => {
    if (!c.expiry_date) return false;
    const daysUntil = Math.ceil((new Date(c.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntil <= 30 && daysUntil > 0;
  }) ?? [];

  return (
    <div className="space-y-6">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Active Now"
          value={activeOperators.length}
          icon={<UsersIcon className="w-4 h-4" />}
          accent="cyan"
          pulse
        />
        <MetricCard
          label="Pages Today"
          value={totalPagesToday}
          icon={<TrendingUpIcon className="w-4 h-4" />}
          accent="emerald"
        />
        <MetricCard
          label="On Shift"
          value={assignments?.length ?? 0}
          icon={<ClockIcon className="w-4 h-4" />}
        />
        <MetricCard
          label="Certs Expiring"
          value={expiringCerts.length}
          sublabel="within 30 days"
          icon={<AlertTriangleIcon className="w-4 h-4" />}
          accent={expiringCerts.length > 0 ? 'amber' : 'default'}
        />
      </div>

      {/* Two column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Shift Assignments */}
        <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-white">Today's Shift Assignments</h3>
            <span className="text-xs text-white/40 font-mono">{today}</span>
          </div>
          <div className="divide-y divide-white/5">
            {assignmentsLoading ? (
              <div className="p-4 text-center text-white/40">Loading...</div>
            ) : assignments?.length === 0 ? (
              <div className="p-4 text-center text-white/40">No assignments today</div>
            ) : (
              assignments?.map((assignment: ShiftAssignment) => (
                <div key={assignment.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white/70 text-sm font-medium">
                        {assignment.operator_name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <span className="font-medium text-white">{assignment.operator_name || 'Unknown'}</span>
                        <span className="block text-xs text-white/40">Shift ID: {assignment.shift_id.slice(0, 8)}</span>
                      </div>
                    </div>
                    <StatusBadge status={assignment.status} size="sm" />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-white/50">
                    <span className="font-mono">{assignment.pages_scanned.toLocaleString()} pages</span>
                    {assignment.actual_start && (
                      <span>Started: {new Date(assignment.actual_start).toLocaleTimeString()}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Certifications */}
        <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold text-white">Operator Certifications</h3>
          </div>
          <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
            {certsLoading ? (
              <div className="p-4 text-center text-white/40">Loading...</div>
            ) : certifications?.length === 0 ? (
              <div className="p-4 text-center text-white/40">No certifications</div>
            ) : (
              certifications?.map((cert: OperatorCertification) => {
                const daysUntilExpiry = cert.expiry_date
                  ? Math.ceil((new Date(cert.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : null;
                const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 30;
                const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;

                return (
                  <div key={cert.id} className="p-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <AwardIcon className={cn('w-4 h-4', isExpired ? 'text-red-400' : isExpiring ? 'text-amber-400' : 'text-cyan-400')} />
                        <span className="font-medium text-white">{cert.certification_name}</span>
                      </div>
                      <span className={cn(
                        'text-xs px-1.5 py-0.5 rounded',
                        cert.level === 'expert' && 'bg-purple-500/20 text-purple-400',
                        cert.level === 'advanced' && 'bg-cyan-500/20 text-cyan-400',
                        cert.level === 'intermediate' && 'bg-blue-500/20 text-blue-400',
                        cert.level === 'basic' && 'bg-slate-500/20 text-slate-400',
                      )}>
                        {cert.level}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-white/50">
                      <span>{cert.operator_name}</span>
                      {cert.expiry_date && (
                        <span className={cn(isExpired && 'text-red-400', isExpiring && 'text-amber-400')}>
                          {isExpired ? 'Expired' : isExpiring ? `${daysUntilExpiry}d left` : new Date(cert.expiry_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
