import { cn } from '@/lib/utils';
import { useProjectDashboard, useBurndownChart, useVelocityChart, useSLAAlerts } from '../../api/hooks';
import { ProgressRing } from '../core/ProgressRing';
import { MetricCard } from '../core/MetricCard';
import { StatusBadge } from '../core/StatusBadge';
import { BurndownChart } from './charts/BurndownChart';
import { VelocityChart } from './charts/VelocityChart';
import { SLAStatusPanel } from './SLAStatusPanel';
import { RecentActivityFeed } from './RecentActivityFeed';
import {
  FileTextIcon,
  UsersIcon,
  PrinterIcon,
  AlertTriangleIcon,
  TrendingUpIcon,
  CalendarIcon,
  DollarSignIcon,
  TargetIcon,
} from 'lucide-react';

interface ProjectDashboardProps {
  projectId: string;
  className?: string;
}

export function ProjectDashboard({ projectId, className }: ProjectDashboardProps) {
  const { data: dashboard, isLoading } = useProjectDashboard(projectId);
  const { data: burndown } = useBurndownChart(projectId);
  const { data: velocity } = useVelocityChart(projectId);
  const { data: alerts } = useSLAAlerts(projectId);

  if (isLoading || !dashboard) {
    return (
      <div className={cn('animate-pulse space-y-6', className)}>
        <div className="h-48 bg-white/5 rounded-lg" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-white/5 rounded-lg" />)}
        </div>
      </div>
    );
  }

  const {
    project,
    total_pages,
    scanned_pages,
    verified_pages,
    rejected_pages,
    completion_percentage,
    verification_percentage,
    rejection_rate,
    pages_today,
    pages_this_week,
    pages_per_day_average,
    days_remaining,
    estimated_completion_date,
    on_track,
    active_operators,
    active_scanners,
    pending_batches,
    active_batches,
    completed_batches,
    sla_status,
    budget_utilization,
    cost_per_page,
  } = dashboard;

  const criticalAlerts = alerts?.filter(a => !a.acknowledged_at).length ?? 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header Section */}
      <header className="relative overflow-hidden rounded-lg border border-white/10 bg-gradient-to-br from-white/[0.03] to-transparent p-6">
        {/* Scanline effect */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" />
        </div>

        <div className="flex items-start justify-between gap-8">
          {/* Project Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-white/40">{project.code}</span>
              <StatusBadge status={project.status} pulse={project.status === 'active'} />
              {!on_track && (
                <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                  <AlertTriangleIcon className="w-3 h-3" />
                  Behind Schedule
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 truncate">{project.name}</h1>
            {project.client_name && (
              <p className="text-sm text-white/50">Client: {project.client_name}</p>
            )}
          </div>

          {/* Progress Rings */}
          <div className="flex items-center gap-6">
            <ProgressRing
              value={completion_percentage}
              size={100}
              strokeWidth={6}
              color="cyan"
              label="Scanned"
              sublabel={`${scanned_pages.toLocaleString()} pages`}
            />
            <ProgressRing
              value={verification_percentage}
              size={100}
              strokeWidth={6}
              color="emerald"
              label="Verified"
              sublabel={`${verified_pages.toLocaleString()} pages`}
            />
            <div className="text-center">
              <div className="font-mono text-3xl font-bold text-white tabular-nums">
                {days_remaining}
              </div>
              <div className="text-xs text-white/50 uppercase tracking-wide">Days Left</div>
              {estimated_completion_date && (
                <div className="text-[10px] text-white/30 font-mono mt-1">
                  Est. {new Date(estimated_completion_date).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Counts Bar */}
        <div className="mt-6 pt-4 border-t border-white/5">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex-1">
              <div className="flex items-center justify-between text-xs text-white/50 mb-1">
                <span>Progress</span>
                <span className="font-mono">{scanned_pages.toLocaleString()} / {total_pages.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full flex">
                  <div
                    className="bg-emerald-400 transition-all duration-1000"
                    style={{ width: `${(verified_pages / total_pages) * 100}%` }}
                  />
                  <div
                    className="bg-cyan-400 transition-all duration-1000"
                    style={{ width: `${((scanned_pages - verified_pages) / total_pages) * 100}%` }}
                  />
                  {rejected_pages > 0 && (
                    <div
                      className="bg-red-400 transition-all duration-1000"
                      style={{ width: `${(rejected_pages / total_pages) * 100}%` }}
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-white/40">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full" /> Verified
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full" /> Scanned
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-400 rounded-full" /> Rejected ({rejection_rate.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label="Pages Today"
          value={pages_today}
          sublabel={`Avg: ${Math.round(pages_per_day_average)}/day`}
          icon={<FileTextIcon className="w-4 h-4" />}
          accent="cyan"
          trend={pages_today >= pages_per_day_average
            ? { value: Math.round(((pages_today - pages_per_day_average) / pages_per_day_average) * 100), direction: 'up' }
            : { value: Math.round(((pages_per_day_average - pages_today) / pages_per_day_average) * 100), direction: 'down' }
          }
        />
        <MetricCard
          label="Active Operators"
          value={active_operators}
          icon={<UsersIcon className="w-4 h-4" />}
          accent="purple"
        />
        <MetricCard
          label="Active Scanners"
          value={active_scanners}
          icon={<PrinterIcon className="w-4 h-4" />}
          accent="emerald"
        />
        <MetricCard
          label="Cost per Page"
          value={`$${cost_per_page.toFixed(3)}`}
          sublabel={`Budget: ${budget_utilization.toFixed(0)}% used`}
          icon={<DollarSignIcon className="w-4 h-4" />}
          accent={budget_utilization > 90 ? 'red' : budget_utilization > 75 ? 'amber' : 'default'}
        />
      </div>

      {/* Batches Overview */}
      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Pending Batches" value={pending_batches} size="sm" />
        <MetricCard label="Active Batches" value={active_batches} size="sm" accent="cyan" pulse />
        <MetricCard label="Completed Batches" value={completed_batches} size="sm" accent="emerald" />
      </div>

      {/* Charts Section */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
            <TargetIcon className="w-4 h-4 text-cyan-400" />
            Burndown Chart
          </h3>
          {burndown && <BurndownChart data={burndown} />}
        </div>
        <div className="bg-white/[0.02] border border-white/10 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-white/70 mb-4 flex items-center gap-2">
            <TrendingUpIcon className="w-4 h-4 text-emerald-400" />
            Velocity Chart
          </h3>
          {velocity && <VelocityChart data={velocity} />}
        </div>
      </div>

      {/* SLA & Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SLAStatusPanel projectId={projectId} slaStatus={sla_status} criticalAlerts={criticalAlerts} />
        </div>
        <div>
          <RecentActivityFeed projectId={projectId} />
        </div>
      </div>
    </div>
  );
}
