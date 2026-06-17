// (c) Copyright Datacraft, 2026
/**
 * System Health Dashboard
 *
 * Route: /system/health
 * Sections:
 *   0. Service Status  — live probes: PostgreSQL, Redis, LiteLLM, Storage
 *   0b. Metrics        — document counters: total, today, OCR queue, failed
 *   1. Celery Workers  — per-worker card: hostname, online/offline dot, active tasks, tasks/24h
 *   2. Queue Depths    — bar gauge per queue (core, ocr, s3, workflow) colour-coded by depth
 *   3. Storage & DB    — donut for used/total bytes, doc count, avg size, DB pool, Redis ping
 *   4. Search Index
 *
 * Auto-refreshes every 30 s via TanStack Query refetchInterval.
 */
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Database,
  FileSearch,
  HardDrive,
  Layers,
  Loader2,
  RefreshCw,
  Server,
  Wifi,
  WifiOff,
  Zap,
  BarChart2,
  ShieldCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useSystemHealth,
  useServiceHealth,
  useHealthMetrics,
  type CacheHealth,
  type DatabaseHealth,
  type QueueInfo,
  type StorageHealth,
  type WorkerInfo,
  type ServiceStatus,
  type MetricItem,
} from '@/features/system';
import { SearchIndexPanel } from '@/features/admin/SearchIndexPanel';

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function fmtBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, units.length - 1)]}`;
}

function fmtNumber(n: number): string {
  return n.toLocaleString();
}

// ---------------------------------------------------------------------------
// Service dependency cards
// ---------------------------------------------------------------------------

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  postgres:  <Database className="w-4 h-4 text-indigo-400" />,
  redis:     <Zap className="w-4 h-4 text-rose-400" />,
  litellm:   <Activity className="w-4 h-4 text-cyan-400" />,
  storage:   <HardDrive className="w-4 h-4 text-amber-400" />,
};

const SERVICE_LABELS: Record<string, string> = {
  postgres: 'PostgreSQL',
  redis:    'Redis',
  litellm:  'LiteLLM',
  storage:  'Storage',
};

function serviceStatusColor(status: ServiceStatus['status']): string {
  switch (status) {
    case 'ok':       return 'text-emerald-400';
    case 'degraded': return 'text-amber-400';
    case 'down':     return 'text-red-400';
    default:         return 'text-slate-500';
  }
}

function serviceStatusDot(status: ServiceStatus['status']): string {
  switch (status) {
    case 'ok':       return 'bg-emerald-400 animate-pulse';
    case 'degraded': return 'bg-amber-400';
    case 'down':     return 'bg-red-500';
    default:         return 'bg-slate-600';
  }
}

function serviceStatusBadge(status: ServiceStatus['status']): string {
  switch (status) {
    case 'ok':       return 'bg-emerald-500/15 text-emerald-400';
    case 'degraded': return 'bg-amber-500/15 text-amber-400';
    case 'down':     return 'bg-red-500/15 text-red-400';
    default:         return 'bg-slate-700/50 text-slate-500';
  }
}

function ServiceCard({ service }: { service: ServiceStatus }) {
  const label = SERVICE_LABELS[service.name] ?? service.name;
  const icon = SERVICE_ICONS[service.name] ?? <Server className="w-4 h-4 text-slate-400" />;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-semibold text-slate-200">{label}</span>
        </div>
        <span className={cn('flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full', serviceStatusBadge(service.status))}>
          <span className={cn('w-1.5 h-1.5 rounded-full', serviceStatusDot(service.status))} />
          {service.status === 'ok' ? 'Operational' : service.status.charAt(0).toUpperCase() + service.status.slice(1)}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        {service.latencyMs != null ? (
          <span className="tabular-nums text-slate-400">{service.latencyMs.toFixed(1)} ms</span>
        ) : (
          <span>—</span>
        )}
        {service.details && (
          <span className="text-slate-600 truncate max-w-[12rem]" title={service.details}>
            {service.details}
          </span>
        )}
      </div>
    </div>
  );
}

function ServiceCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-4 animate-pulse flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 bg-slate-800 rounded" />
        <div className="h-5 w-20 bg-slate-800 rounded-full" />
      </div>
      <div className="h-3 w-16 bg-slate-800 rounded" />
    </div>
  );
}

function ServicesBanner({ degradedCount, downCount }: { degradedCount: number; downCount: number }) {
  if (downCount > 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-red-500/10 border-red-500/30 text-red-300 text-sm">
        <AlertCircle className="w-4 h-4 text-red-400" />
        {downCount} service{downCount !== 1 ? 's' : ''} down
        {degradedCount > 0 ? `, ${degradedCount} degraded` : ''}
      </div>
    );
  }
  if (degradedCount > 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-amber-500/10 border-amber-500/30 text-amber-300 text-sm">
        <AlertCircle className="w-4 h-4 text-amber-400" />
        {degradedCount} service{degradedCount !== 1 ? 's' : ''} degraded
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-300 text-sm">
      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      All Systems Operational
    </div>
  );
}

// ---------------------------------------------------------------------------
// Metrics tiles
// ---------------------------------------------------------------------------

const METRIC_ICONS: Record<string, React.ReactNode> = {
  documents_total: <Database className="w-4 h-4 text-cyan-400" />,
  documents_today: <Activity className="w-4 h-4 text-emerald-400" />,
  ocr_queue_depth: <Layers className="w-4 h-4 text-amber-400" />,
  failed_ocr:      <AlertCircle className="w-4 h-4 text-red-400" />,
};

const METRIC_LABELS: Record<string, string> = {
  documents_total: 'Documents Total',
  documents_today: 'Indexed Today',
  ocr_queue_depth: 'OCR Queue',
  failed_ocr:      'Failed OCR',
};

function metricValueColor(name: string, value: number): string {
  if (name === 'failed_ocr' && value > 0) return 'text-red-400';
  if (name === 'ocr_queue_depth' && value > 50) return 'text-amber-400';
  return 'text-slate-100';
}

function MetricTile({ metric }: { metric: MetricItem }) {
  const label = METRIC_LABELS[metric.name] ?? metric.name;
  const icon = METRIC_ICONS[metric.name] ?? <BarChart2 className="w-4 h-4 text-slate-400" />;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {icon}
        <span>{label}</span>
      </div>
      <p className={cn('text-3xl font-display font-semibold tabular-nums', metricValueColor(metric.name, metric.value))}>
        {fmtNumber(Math.round(metric.value))}
      </p>
      {metric.unit && (
        <span className="text-xs text-slate-600">{metric.unit}</span>
      )}
    </div>
  );
}

function MetricTileSkeleton() {
  return (
    <div className="rounded-xl border border-slate-700/30 bg-slate-900/40 p-4 animate-pulse flex flex-col gap-2">
      <div className="h-3 w-24 bg-slate-800 rounded" />
      <div className="h-8 w-16 bg-slate-800 rounded" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workers section
// ---------------------------------------------------------------------------

interface WorkerCardProps {
  worker: WorkerInfo;
}

function WorkerCard({ worker }: WorkerCardProps) {
  const online = worker.status === 'running';

  return (
    <div
      className={cn(
        'rounded-xl border bg-slate-900/60 p-4 flex flex-col gap-3',
        online ? 'border-slate-700/50' : 'border-red-500/30',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Server className="w-4 h-4 flex-shrink-0 text-slate-400" />
          <span className="text-sm font-medium text-slate-200 truncate" title={worker.name}>
            {worker.name}
          </span>
        </div>
        {/* Status dot */}
        <span
          className={cn(
            'flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full',
            online
              ? 'bg-emerald-500/15 text-emerald-400'
              : 'bg-red-500/15 text-red-400',
          )}
        >
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full',
              online ? 'bg-emerald-400 animate-pulse' : 'bg-red-500',
            )}
          />
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-500">Active tasks</span>
          <span
            className={cn(
              'text-lg font-display font-semibold',
              worker.activeTasks > 0 ? 'text-amber-400' : 'text-slate-300',
            )}
          >
            {worker.activeTasks}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-slate-500">Concurrency</span>
          <span className="text-lg font-display font-semibold text-slate-300">
            {worker.concurrency}
          </span>
        </div>
        <div className="flex flex-col gap-0.5 col-span-2">
          <span className="text-slate-500">Queue</span>
          <span className="text-slate-300 font-mono">{worker.queue || '—'}</span>
        </div>
        {worker.currentTask && (
          <div className="col-span-2 flex flex-col gap-0.5">
            <span className="text-slate-500">Current task</span>
            <span className="text-slate-300 truncate font-mono text-[11px]" title={worker.currentTask}>
              {worker.currentTask}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Queue gauge
// ---------------------------------------------------------------------------

const QUEUE_ALIASES: Record<string, string> = {
  celery: 'default',
  core: 'core',
  ocr: 'ocr',
  s3: 's3',
  s3preview: 's3-preview',
  workflow: 'workflow',
  index: 'index',
  email: 'email',
  path_tmpl: 'path-tmpl',
};

function queueDepthColor(depth: number): string {
  if (depth === 0) return 'bg-emerald-500';
  if (depth < 10) return 'bg-amber-400';
  return 'bg-red-500';
}

function queueDepthLabel(depth: number): string {
  if (depth === 0) return 'text-emerald-400';
  if (depth < 10) return 'text-amber-400';
  return 'text-red-400';
}

interface QueueGaugeProps {
  queue: QueueInfo;
  maxDepth: number;
}

function QueueGauge({ queue, maxDepth }: QueueGaugeProps) {
  const pct = maxDepth > 0 ? Math.min((queue.pending / maxDepth) * 100, 100) : 0;
  const label = QUEUE_ALIASES[queue.name] ?? queue.name;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-300 font-mono">{label}</span>
        <span className={cn('font-semibold tabular-nums', queueDepthLabel(queue.pending))}>
          {fmtNumber(queue.pending)}
        </span>
      </div>
      {/* Track */}
      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', queueDepthColor(queue.pending))}
          style={{ width: `${Math.max(pct, queue.pending > 0 ? 2 : 0)}%` }}
        />
      </div>
      {queue.consumers > 0 && (
        <div className="text-[10px] text-slate-600">
          {queue.consumers} consumer{queue.consumers !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Storage donut (pure CSS, no chart lib dep)
// ---------------------------------------------------------------------------

interface StorageDonutProps {
  used: number;
  total: number;
}

function StorageDonut({ used, total }: StorageDonutProps) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (pct / 100) * circ;

  const fillColor =
    pct > 90 ? '#ef4444' : pct > 75 ? '#f59e0b' : '#22d3ee';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 96, height: 96 }}>
      <svg width="96" height="96" viewBox="0 0 96 96" className="-rotate-90">
        {/* Track */}
        <circle cx="48" cy="48" r={r} fill="none" stroke="#1e293b" strokeWidth="10" />
        {/* Fill */}
        <circle
          cx="48"
          cy="48"
          r={r}
          fill="none"
          stroke={fillColor}
          strokeWidth="10"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-display font-semibold text-slate-200">
          {pct.toFixed(0)}%
        </span>
        <span className="text-[10px] text-slate-500">used</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DB pool mini-bar
// ---------------------------------------------------------------------------

interface DbPoolBarProps {
  active: number;
  max: number;
}

function DbPoolBar({ active, max }: DbPoolBarProps) {
  const pct = max > 0 ? Math.min((active / max) * 100, 100) : 0;
  const color = pct > 80 ? 'bg-red-500' : pct > 60 ? 'bg-amber-400' : 'bg-cyan-500';
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Connection pool</span>
        <span className="text-slate-300 tabular-nums">
          {active} / {max > 0 ? max : '—'}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: `${Math.max(pct, active > 0 ? 2 : 0)}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section wrappers
// ---------------------------------------------------------------------------

function Section({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Storage & DB section
// ---------------------------------------------------------------------------

function StorageSection({
  storage,
  database,
  cache,
}: {
  storage: StorageHealth;
  database: DatabaseHealth;
  cache: CacheHealth;
}) {
  const avgDocBytes =
    storage.objectsCount > 0 ? storage.usedBytes / storage.objectsCount : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Storage card */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-slate-300">Object Storage</span>
          <span
            className={cn(
              'ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
              storage.available
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-red-500/15 text-red-400',
            )}
          >
            {storage.available ? (
              <CheckCircle2 className="w-3 h-3" />
            ) : (
              <AlertCircle className="w-3 h-3" />
            )}
            {storage.available ? 'Available' : 'Unavailable'}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <StorageDonut used={storage.usedBytes} total={storage.totalBytes} />
          <div className="flex flex-col gap-2 text-xs flex-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Used</span>
              <span className="text-slate-200 font-medium">{fmtBytes(storage.usedBytes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Total</span>
              <span className="text-slate-200 font-medium">
                {storage.totalBytes > 0 ? fmtBytes(storage.totalBytes) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Documents</span>
              <span className="text-slate-200 font-medium">{fmtNumber(storage.objectsCount)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Avg size</span>
              <span className="text-slate-200 font-medium">
                {avgDocBytes > 0 ? fmtBytes(avgDocBytes) : '—'}
              </span>
            </div>
            {storage.latencyMs > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Latency</span>
                <span className="text-slate-400 tabular-nums">{storage.latencyMs.toFixed(1)} ms</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* DB + Redis card */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 flex flex-col gap-4">
        {/* PostgreSQL */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-slate-300">PostgreSQL</span>
            <span
              className={cn(
                'ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                database.connected
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400',
              )}
            >
              {database.connected ? (
                <CheckCircle2 className="w-3 h-3" />
              ) : (
                <AlertCircle className="w-3 h-3" />
              )}
              {database.connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          <DbPoolBar active={database.activeConnections} max={database.maxConnections} />

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Latency</span>
              <span className="text-slate-300 tabular-nums">{database.latencyMs.toFixed(1)} ms</span>
            </div>
            {database.diskUsageBytes > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">DB size</span>
                <span className="text-slate-300">{fmtBytes(database.diskUsageBytes)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800" />

        {/* Redis */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-rose-400" />
            <span className="text-sm font-semibold text-slate-300">Redis</span>
            <span
              className={cn(
                'ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full',
                cache.connected
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-red-500/15 text-red-400',
              )}
            >
              {cache.connected ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
              {cache.connected ? 'Reachable' : 'Unreachable'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Latency</span>
              <span className="text-slate-300 tabular-nums">{cache.latencyMs.toFixed(1)} ms</span>
            </div>
            {cache.memoryUsedBytes > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Memory</span>
                <span className="text-slate-300">{fmtBytes(cache.memoryUsedBytes)}</span>
              </div>
            )}
            {cache.memoryMaxBytes > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Max</span>
                <span className="text-slate-300">{fmtBytes(cache.memoryMaxBytes)}</span>
              </div>
            )}
            {cache.hitRate > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Hit rate</span>
                <span className="text-slate-300 tabular-nums">
                  {(cache.hitRate * 100).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overall status banner
// ---------------------------------------------------------------------------

function StatusBanner({ status }: { status: 'healthy' | 'degraded' | 'unhealthy' }) {
  const cfg = {
    healthy: {
      bg: 'bg-emerald-500/10 border-emerald-500/30',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
      label: 'All systems healthy',
      text: 'text-emerald-300',
    },
    degraded: {
      bg: 'bg-amber-500/10 border-amber-500/30',
      icon: <AlertCircle className="w-4 h-4 text-amber-400" />,
      label: 'System degraded — some components unavailable',
      text: 'text-amber-300',
    },
    unhealthy: {
      bg: 'bg-red-500/10 border-red-500/30',
      icon: <AlertCircle className="w-4 h-4 text-red-400" />,
      label: 'System unhealthy — critical components down',
      text: 'text-red-300',
    },
  }[status];

  return (
    <div className={cn('flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm', cfg.bg, cfg.text)}>
      {cfg.icon}
      {cfg.label}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SystemHealth() {
  const { data, isLoading, isFetching, refetch, isError } = useSystemHealth({
    refetchInterval: 30_000,
  });
  const {
    data: servicesData,
    isLoading: servicesLoading,
  } = useServiceHealth({ refetchInterval: 30_000 });
  const {
    data: metricsData,
    isLoading: metricsLoading,
  } = useHealthMetrics({ refetchInterval: 30_000 });

  const workers = data?.workers ?? [];
  const queues = data?.queues ?? [];
  const maxDepth = Math.max(...queues.map((q) => q.pending), 1);

  const onlineWorkers = workers.filter((w) => w.status === 'running').length;
  const totalActiveTasks = workers.reduce((s, w) => s + w.activeTasks, 0);
  const totalPending = queues.reduce((s, q) => s + q.pending, 0);

  const anyFetching = isFetching;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-slate-400" />
            <h1 className="text-2xl font-display font-semibold text-slate-100">System Health</h1>
            {anyFetching && !isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Workers, queue depths, storage and infrastructure — refreshes every 30 s.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          title="Refresh now"
        >
          <RefreshCw className={cn('w-4 h-4', anyFetching && 'animate-spin')} />
        </button>
      </div>

      {/* ── Section 0: Service Status ── */}
      <Section icon={ShieldCheck} title="Service Status">
        {servicesLoading ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => <ServiceCardSkeleton key={i} />)}
            </div>
          </>
        ) : servicesData ? (
          <>
            <ServicesBanner
              degradedCount={servicesData.degradedCount ?? 0}
              downCount={servicesData.downCount ?? 0}
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {servicesData.services.map((svc) => (
                <ServiceCard key={svc.name} service={svc} />
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-500">Service probe data unavailable.</p>
        )}
      </Section>

      {/* ── Section 0b: Metrics ── */}
      <Section icon={BarChart2} title="Document Metrics">
        {metricsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => <MetricTileSkeleton key={i} />)}
          </div>
        ) : metricsData?.metrics ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metricsData.metrics.map((m) => (
              <MetricTile key={m.name} metric={m} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">Metrics unavailable.</p>
        )}
      </Section>

      {/* Loading skeleton for Celery / storage sections */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-slate-300 font-medium">Could not reach the system health endpoint.</p>
          <p className="text-sm text-slate-500">
            The API server may be unreachable or an authentication error occurred.
          </p>
          <button onClick={() => refetch()} className="btn-primary mt-2">
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {data && !isLoading && (
        <>
          {/* Overall status */}
          <StatusBanner status={data.overallStatus} />

          {/* Summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Server className="w-4 h-4" />
                Workers online
              </div>
              <p className={cn('mt-1 text-2xl font-display font-semibold', onlineWorkers > 0 ? 'text-emerald-400' : 'text-slate-500')}>
                {onlineWorkers} / {workers.length}
              </p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Activity className="w-4 h-4" />
                Active tasks
              </div>
              <p className={cn('mt-1 text-2xl font-display font-semibold', totalActiveTasks > 0 ? 'text-amber-400' : 'text-slate-100')}>
                {totalActiveTasks}
              </p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Layers className="w-4 h-4" />
                Queued messages
              </div>
              <p className={cn('mt-1 text-2xl font-display font-semibold', totalPending > 10 ? 'text-red-400' : totalPending > 0 ? 'text-amber-400' : 'text-slate-100')}>
                {fmtNumber(totalPending)}
              </p>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Database className="w-4 h-4" />
                DB status
              </div>
              <p className={cn('mt-1 text-2xl font-display font-semibold', data.database.connected ? 'text-emerald-400' : 'text-red-400')}>
                {data.database.connected ? 'OK' : 'Down'}
              </p>
            </div>
          </div>

          {/* ── Section 1: Workers ── */}
          <Section icon={Server} title="Celery Workers">
            {workers.length === 0 ? (
              <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 px-6 py-8 text-center">
                <Server className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No workers reachable via Celery inspect.</p>
                <p className="text-slate-500 text-xs mt-1">
                  Workers may be starting up or the broker connection may be unavailable.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {workers.map((w) => (
                  <WorkerCard key={w.id} worker={w} />
                ))}
              </div>
            )}
          </Section>

          {/* ── Section 2: Queue Depths ── */}
          <Section icon={Layers} title="Queue Depths">
            {queues.length === 0 ? (
              <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 px-6 py-8 text-center">
                <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">No queue data available.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                {queues.map((q) => (
                  <QueueGauge key={q.name} queue={q} maxDepth={maxDepth} />
                ))}
              </div>
            )}
          </Section>

          {/* ── Section 3: Storage & Database ── */}
          <Section icon={HardDrive} title="Storage &amp; Database">
            <StorageSection
              storage={data.storage}
              database={data.database}
              cache={data.cache}
            />
          </Section>

          {/* ── Section 4: Search Index ── */}
          <Section icon={FileSearch} title="Search Index">
            <SearchIndexPanel />
          </Section>
        </>
      )}
    </div>
  );
}
