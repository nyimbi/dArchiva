// (c) Copyright Datacraft, 2026
/**
 * Ingestion Source Dashboard — health, activity, error rates per source.
 *
 * Route: /ingestion/dashboard
 * Auto-refreshes every 30s via TanStack Query refetchInterval.
 */
import { useState } from 'react';
import {
  ArrowDownToLine,
  Mail,
  FolderOpen,
  Webhook,
  ScanLine,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Server,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useIngestionDashboard,
  useRetryIngestionSource,
  type SourceDashboardItem,
  type DashboardSourceType,
  type DashboardSourceStatus,
} from '@/features/ingestion';
import { useNavigate } from 'react-router-dom';

// ── helpers ──────────────────────────────────────────────────────────────────

function formatRelative(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

const TYPE_ICON: Record<DashboardSourceType, React.ComponentType<{ className?: string }>> = {
  watched_folder: FolderOpen,
  email: Mail,
  api: Webhook,
  scanner: ScanLine,
  email_account: Mail,
  scan_agent: Server,
};

const TYPE_LABEL: Record<DashboardSourceType, string> = {
  watched_folder: 'Hot Folder',
  email: 'Email',
  api: 'Webhook / API',
  scanner: 'Scanner',
  email_account: 'Email Account',
  scan_agent: 'Scan Agent',
};

const STATUS_DOT: Record<DashboardSourceStatus, string> = {
  active: 'bg-emerald-400',
  degraded: 'bg-amber-400',
  error: 'bg-red-500',
  inactive: 'bg-slate-500',
};

const STATUS_LABEL: Record<DashboardSourceStatus, string> = {
  active: 'Active',
  degraded: 'Degraded',
  error: 'Error',
  inactive: 'Inactive',
};

// ── SourceCard ────────────────────────────────────────────────────────────────

interface SourceCardProps {
  source: SourceDashboardItem;
}

function SourceCard({ source }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const retry = useRetryIngestionSource();
  const Icon = TYPE_ICON[source.type] ?? FileText;

  const hasError = source.error_count > 0;
  const hasDegradedError = Boolean(source.last_error) || source.error_count > 0 || source.status === 'error';
  const canRetry = hasDegradedError;

  return (
    <div
      className={cn(
        'rounded-xl border bg-slate-900/60 p-4 flex flex-col gap-3 transition-shadow',
        hasError ? 'border-red-500/30' : 'border-slate-700/50',
      )}
    >
      {/* Top row: icon + name + status dot */}
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'p-2 rounded-lg flex-shrink-0',
            source.status === 'active'
              ? 'bg-emerald-500/10 text-emerald-400'
              : source.status === 'error'
              ? 'bg-red-500/10 text-red-400'
              : source.status === 'degraded'
              ? 'bg-amber-500/10 text-amber-400'
              : 'bg-slate-700/50 text-slate-500',
          )}
        >
          <Icon className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-slate-200 truncate">{source.name}</h3>
            {/* error count badge */}
            {source.error_count > 0 && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/15 text-red-400">
                <AlertCircle className="w-3 h-3" />
                {source.error_count}
              </span>
            )}
          </div>
          {hasDegradedError && source.last_error && (
            <p className="mt-1 text-xs text-red-400 truncate">{source.last_error}</p>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-slate-500">{TYPE_LABEL[source.type]}</span>
            <span className="text-slate-700">·</span>
            {/* status indicator */}
            <span className="flex items-center gap-1 text-xs">
              <span
                className={cn(
                  'w-1.5 h-1.5 rounded-full',
                  STATUS_DOT[source.status],
                  source.status === 'active' && 'animate-pulse',
                )}
              />
              <span
                className={cn(
                  source.status === 'active' && 'text-emerald-400',
                  source.status === 'degraded' && 'text-amber-400',
                  source.status === 'error' && 'text-red-400',
                  source.status === 'inactive' && 'text-slate-500',
                )}
              >
                {STATUS_LABEL[source.status]}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1.5 text-slate-400">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>
            <span className="text-slate-200 font-medium">{source.docs_ingested_24h}</span>
            {' '}docs today
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>
            <span className="text-slate-200 font-medium">{source.docs_ingested_7d}</span>
            {' '}this week
          </span>
        </div>
        <div className="col-span-2 flex items-center gap-1.5 text-slate-400">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Last active: {formatRelative(source.last_activity_at)}</span>
        </div>
      </div>

      {/* Error expand */}
      {source.last_error && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
            {expanded ? 'Hide error' : 'Show last error'}
          </button>
          {expanded && (
            <p className="mt-1.5 text-xs text-red-400/80 bg-red-500/5 border border-red-500/20 rounded px-2 py-1.5 break-words">
              {source.last_error}
            </p>
          )}
        </div>
      )}

      {/* Retry button */}
      {canRetry && (
        <button
          onClick={() => retry.mutate(source.id)}
          disabled={retry.isPending}
          className="mt-auto flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors disabled:opacity-50"
        >
          {retry.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          Retry
        </button>
      )}
    </div>
  );
}

// ── IngestionDashboard page ───────────────────────────────────────────────────

export function IngestionDashboard() {
  const navigate = useNavigate();
  const { data, isLoading, isFetching, isError, refetch } = useIngestionDashboard();

  const sources = data?.sources ?? [];

  const activeCount = sources.filter((s) => s.status === 'active').length;
  const errorCount = sources.filter((s) => s.status === 'error').length;
  const totalDocs24h = sources.reduce((sum, s) => sum + s.docs_ingested_24h, 0);
  const totalDocs7d = sources.reduce((sum, s) => sum + s.docs_ingested_7d, 0);

  return (
    <div className="space-y-6">
      {isError && (
        <div className="flex items-center justify-between rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <span>Failed to load ingestion dashboard data.</span>
          <button onClick={() => refetch()} className="ml-4 underline hover:text-red-200">Retry</button>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-slate-400" />
            <h1 className="text-2xl font-display font-semibold text-slate-100">
              Ingestion Sources
            </h1>
            {isFetching && !isLoading && (
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Health and activity across all document ingestion channels — refreshes every 30s.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            title="Refresh now"
          >
            <RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
          </button>
          <button
            onClick={() => navigate('/ingestion')}
            className="btn-primary"
          >
            <Plus className="w-4 h-4" />
            Add Source
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <CheckCircle2 className="w-4 h-4" />
            Active Sources
          </div>
          <p className="mt-1 text-2xl font-display font-semibold text-emerald-400">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : `${activeCount} / ${sources.length}`}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <AlertCircle className="w-4 h-4" />
            Sources in Error
          </div>
          <p className={cn('mt-1 text-2xl font-display font-semibold', errorCount > 0 ? 'text-red-400' : 'text-slate-100')}>
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : errorCount}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <FileText className="w-4 h-4" />
            Docs Today
          </div>
          <p className="mt-1 text-2xl font-display font-semibold text-slate-100">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : totalDocs24h.toLocaleString()}
          </p>
        </div>
        <div className="stat-card">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <FileText className="w-4 h-4" />
            Docs This Week
          </div>
          <p className="mt-1 text-2xl font-display font-semibold text-slate-100">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : totalDocs7d.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Source grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
        </div>
      ) : sources.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="p-4 rounded-full bg-slate-800">
            <ArrowDownToLine className="w-8 h-8 text-slate-500" />
          </div>
          <div>
            <p className="text-slate-300 font-medium">No ingestion sources configured</p>
            <p className="mt-1 text-sm text-slate-500">
              Add a source to start automatically importing documents.
            </p>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={() => navigate('/ingestion')}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" />
              Configure Sources
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sources.map((source) => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>
      )}
    </div>
  );
}
