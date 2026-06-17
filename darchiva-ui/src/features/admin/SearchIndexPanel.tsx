// (c) Copyright Datacraft, 2026
/**
 * Search Index Health Panel
 *
 * Shows index coverage stats, a reindex-all action, and a failed-documents table.
 * Designed to be embedded inside SystemHealth.tsx as a named section.
 *
 * Hooks:
 *   useSearchIndexStats()   — GET /admin/search/index-stats  (30 s poll)
 *   useReindexAll()         — POST /admin/search/reindex
 *   useReindexDocument()    — POST /admin/search/reindex/{document_id}
 */
import {
  AlertCircle,
  CheckCircle2,
  FileSearch,
  Loader2,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IndexStats {
  totalDocuments: number;
  indexedDocuments: number;
  pendingIndexing: number;
  failedIndexing: number;
  lastUpdated: string;
  vectorIndexAvailable: boolean;
}

export interface FailedDocument {
  id: string;
  title: string;
  createdAt: string;
  ocrStatus: string;
}

export interface ReindexResponse {
  queuedCount: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const searchIndexKeys = {
  all: ['search-index'] as const,
  stats: () => [...searchIndexKeys.all, 'stats'] as const,
  failed: () => [...searchIndexKeys.all, 'failed'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useSearchIndexStats(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: searchIndexKeys.stats(),
    queryFn: async () => {
      const { data } = await apiClient.get<IndexStats>('/admin/search/index-stats');
      return data;
    },
    refetchInterval: options?.refetchInterval ?? 30_000,
    retry: 1,
  });
}

export function useFailedDocuments(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: searchIndexKeys.failed(),
    queryFn: async () => {
      const { data } = await apiClient.get<FailedDocument[]>(
        '/admin/search/failed-documents?limit=50',
      );
      return data ?? [];
    },
    enabled: options?.enabled ?? true,
    retry: 1,
  });
}

export function useReindexAll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post<ReindexResponse>('/admin/search/reindex');
      return data;
    },
    onSuccess: () => {
      // Invalidate stats + failed list after a short delay so worker has time to update status
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: searchIndexKeys.all });
      }, 1500);
    },
  });
}

export function useReindexDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (documentId: string) => {
      const { data } = await apiClient.post<ReindexResponse>(
        `/admin/search/reindex/${documentId}`,
      );
      return data;
    },
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: searchIndexKeys.all });
      }, 1500);
    },
  });
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: number;
  variant: 'neutral' | 'success' | 'warning' | 'danger';
  subtitle?: string;
}

function StatCard({ label, value, variant, subtitle }: StatCardProps) {
  const valueColor = {
    neutral: 'text-slate-100',
    success: value > 0 ? 'text-emerald-400' : 'text-slate-500',
    warning: value > 0 ? 'text-amber-400' : 'text-slate-500',
    danger: value > 0 ? 'text-red-400' : 'text-slate-500',
  }[variant];

  const borderColor = {
    neutral: 'border-slate-700/50',
    success: value > 0 ? 'border-emerald-500/20' : 'border-slate-700/50',
    warning: value > 0 ? 'border-amber-500/20' : 'border-slate-700/50',
    danger: value > 0 ? 'border-red-500/20' : 'border-slate-700/50',
  }[variant];

  return (
    <div className={cn('rounded-xl border bg-slate-900/60 p-4 flex flex-col gap-1', borderColor)}>
      <span className="text-xs text-slate-500">{label}</span>
      <span className={cn('text-2xl font-display font-semibold tabular-nums', valueColor)}>
        {value.toLocaleString()}
      </span>
      {subtitle && <span className="text-[11px] text-slate-600">{subtitle}</span>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function IndexProgressBar({ indexed, total }: { indexed: number; total: number }) {
  const pct = total > 0 ? Math.min((indexed / total) * 100, 100) : 0;
  const color = pct >= 95 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-400' : 'bg-red-500';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Index coverage</span>
        <span className="text-slate-300 tabular-nums font-medium">
          {pct.toFixed(1)}%{' '}
          <span className="text-slate-600 font-normal">
            ({indexed.toLocaleString()} / {total.toLocaleString()})
          </span>
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Failed documents table
// ---------------------------------------------------------------------------

function FailedDocumentsTable() {
  const { data: docs, isLoading, isError } = useFailedDocuments();
  const reindexDoc = useReindexDocument();
  const [retriedIds, setRetriedIds] = useState<Set<string>>(new Set());

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading failed documents…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 py-3 text-red-400 text-sm">
        <AlertCircle className="w-4 h-4" />
        Could not load failed documents.
      </div>
    );
  }

  if (!docs || docs.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 text-emerald-400 text-sm">
        <CheckCircle2 className="w-4 h-4" />
        No failed documents — index is clean.
      </div>
    );
  }

  const handleRetry = async (id: string) => {
    setRetriedIds((prev) => new Set(prev).add(id));
    try {
      await reindexDoc.mutateAsync(id);
    } catch {
      setRetriedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/50 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/80">
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Title
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
              Created
            </th>
            <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-2.5 w-20" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {docs.map((doc) => {
            const retried = retriedIds.has(doc.id);
            return (
              <tr key={doc.id} className="bg-slate-900/40 hover:bg-slate-800/40 transition-colors">
                <td className="px-4 py-2.5 text-slate-200 max-w-xs truncate" title={doc.title}>
                  {doc.title || '(untitled)'}
                </td>
                <td className="px-4 py-2.5 text-slate-500 tabular-nums whitespace-nowrap text-xs">
                  {new Date(doc.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {doc.ocrStatus}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => handleRetry(doc.id)}
                    disabled={retried || reindexDoc.isPending}
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors',
                      retried
                        ? 'bg-emerald-500/15 text-emerald-400 cursor-default'
                        : 'bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 hover:text-slate-100 disabled:opacity-50',
                    )}
                  >
                    {retried ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        Queued
                      </>
                    ) : (
                      <>
                        <RotateCcw className="w-3 h-3" />
                        Retry
                      </>
                    )}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel
// ---------------------------------------------------------------------------

export function SearchIndexPanel() {
  const { data: stats, isLoading, isFetching, isError, refetch } = useSearchIndexStats({
    refetchInterval: 30_000,
  });
  const reindexAll = useReindexAll();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [reindexResult, setReindexResult] = useState<ReindexResponse | null>(null);

  const handleReindexAll = async () => {
    if (!confirmVisible) {
      setConfirmVisible(true);
      return;
    }
    setConfirmVisible(false);
    try {
      const result = await reindexAll.mutateAsync();
      setReindexResult(result);
      setTimeout(() => setReindexResult(null), 5000);
    } catch {
      // error handled by mutation state
    }
  };

  const pendingCount = stats?.pendingIndexing ?? 0;
  const failedCount = stats?.failedIndexing ?? 0;
  const actionableCount = pendingCount + failedCount;

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {stats?.vectorIndexAvailable && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-medium uppercase tracking-wider">
              pgvector
            </span>
          )}
          {isFetching && !isLoading && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Reindex feedback */}
          {reindexResult && (
            <span className="text-xs text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {reindexResult.queuedCount} document{reindexResult.queuedCount !== 1 ? 's' : ''} queued
            </span>
          )}
          {reindexAll.isError && (
            <span className="text-xs text-red-400 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              Reindex failed
            </span>
          )}

          {/* Confirm / action button */}
          {confirmVisible ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400">
                Queue {actionableCount} document{actionableCount !== 1 ? 's' : ''}?
              </span>
              <button
                onClick={handleReindexAll}
                disabled={reindexAll.isPending}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-black hover:bg-amber-400 transition-colors disabled:opacity-50"
              >
                {reindexAll.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  'Confirm'
                )}
              </button>
              <button
                onClick={() => setConfirmVisible(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-700/60 text-slate-300 hover:bg-slate-600/60 transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleReindexAll}
              disabled={reindexAll.isPending || actionableCount === 0}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                actionableCount > 0
                  ? 'bg-slate-700/60 text-slate-200 hover:bg-slate-600/60'
                  : 'bg-slate-800/60 text-slate-600 cursor-not-allowed',
              )}
            >
              {reindexAll.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Reindex All Pending
              {actionableCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold">
                  {actionableCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center gap-2 py-6 text-slate-500 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading index stats…
        </div>
      )}

      {/* Error */}
      {isError && !isLoading && (
        <div className="flex items-center gap-2 py-4 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          Could not reach the search index endpoint.
          <button onClick={() => refetch()} className="ml-2 underline text-slate-400 hover:text-slate-200">
            Retry
          </button>
        </div>
      )}

      {stats && !isLoading && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Total Documents"
              value={stats.totalDocuments}
              variant="neutral"
            />
            <StatCard
              label="Indexed"
              value={stats.indexedDocuments}
              variant="success"
              subtitle="ocr completed"
            />
            <StatCard
              label="Pending"
              value={stats.pendingIndexing}
              variant="warning"
              subtitle="queued / processing"
            />
            <StatCard
              label="Failed"
              value={stats.failedIndexing}
              variant="danger"
              subtitle="need attention"
            />
          </div>

          {/* Coverage bar */}
          <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4">
            <IndexProgressBar
              indexed={stats.indexedDocuments}
              total={stats.totalDocuments}
            />
            <p className="mt-2 text-[11px] text-slate-600">
              Last updated {new Date(stats.lastUpdated).toLocaleTimeString()}
            </p>
          </div>

          {/* Failed documents table — only show if there are failures */}
          {stats.failedIndexing > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Failed Documents
              </h3>
              <FailedDocumentsTable />
            </div>
          )}
        </>
      )}
    </div>
  );
}
