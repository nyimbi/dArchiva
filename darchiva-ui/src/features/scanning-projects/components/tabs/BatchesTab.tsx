import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useBatches, usePriorityQueue, useBulkUpdateBatches } from '../../api/hooks';
import { StatusBadge } from '../core/StatusBadge';
import { DataTable, type Column } from '../core/DataTable';
import type { ScanningBatch, BatchStatus, BatchFilters } from '../../types';
import {
  PlusIcon,
  FilterIcon,
  ZapIcon,
  UploadIcon,
  PlayIcon,
  PauseIcon,
  CheckIcon,
  XIcon,
  ArrowUpIcon,
} from 'lucide-react';

interface BatchesTabProps {
  projectId: string;
}

const statusFilters: BatchStatus[] = ['pending', 'in_progress', 'completed', 'failed', 'on_hold'];

export function BatchesTab({ projectId }: BatchesTabProps) {
  const [filters, setFilters] = useState<BatchFilters>({});
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showPriorityQueue, setShowPriorityQueue] = useState(false);

  const { data: batchesData, isLoading } = useBatches(projectId, filters);
  const { data: priorityQueue } = usePriorityQueue(projectId);
  const bulkUpdateMutation = useBulkUpdateBatches();

  const batches = batchesData?.items ?? [];
  const rushCount = priorityQueue?.filter(q => q.is_rush).length ?? 0;

  const handleBulkAction = (updates: Partial<ScanningBatch>) => {
    if (selectedIds.size === 0) return;
    bulkUpdateMutation.mutate({
      batch_ids: Array.from(selectedIds),
      updates,
    });
    setSelectedIds(new Set());
  };

  const columns: Column<ScanningBatch>[] = [
    {
      key: 'batch_number',
      header: 'Batch',
      sortable: true,
      render: (row) => (
        <div>
          <span className="font-mono font-medium text-white">{row.batch_number}</span>
          {row.box_label && (
            <span className="block text-[10px] text-white/40">{row.box_label}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.status} size="sm" pulse={row.status === 'in_progress'} />,
    },
    {
      key: 'priority',
      header: 'Priority',
      align: 'center',
      sortable: true,
      render: (row) => {
        const queueItem = priorityQueue?.find(q => q.batch_id === row.id);
        return (
          <div className="flex items-center justify-center gap-1">
            {queueItem?.is_rush && <ZapIcon className="w-3 h-3 text-amber-400" />}
            <span className={cn(
              'font-mono text-sm',
              row.priority <= 2 && 'text-red-400 font-bold',
              row.priority === 3 && 'text-amber-400',
              row.priority >= 4 && 'text-white/50'
            )}>
              P{row.priority}
            </span>
          </div>
        );
      },
    },
    {
      key: 'progress',
      header: 'Progress',
      render: (row) => {
        const progress = row.total_pages > 0 ? (row.scanned_pages / row.total_pages) * 100 : 0;
        return (
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full',
                  row.status === 'completed' && 'bg-emerald-400',
                  row.status === 'in_progress' && 'bg-cyan-400',
                  row.status === 'failed' && 'bg-red-400',
                  !['completed', 'in_progress', 'failed'].includes(row.status) && 'bg-white/30'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="font-mono text-xs text-white/50 w-10">{progress.toFixed(0)}%</span>
          </div>
        );
      },
    },
    {
      key: 'pages',
      header: 'Pages',
      align: 'right',
      render: (row) => (
        <span className="font-mono text-sm text-white/70">
          {row.scanned_pages.toLocaleString()} / {row.total_pages.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'assigned_operator_name',
      header: 'Operator',
      render: (row) => row.assigned_operator_name || <span className="text-white/30">Unassigned</span>,
    },
    {
      key: 'source_location',
      header: 'Source',
      render: (row) => row.source_location || '-',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Header with Rush Queue indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Batches</h2>
            <p className="text-sm text-white/50">{batches.length} batches</p>
          </div>
          {rushCount > 0 && (
            <button
              onClick={() => setShowPriorityQueue(!showPriorityQueue)}
              className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded text-xs font-medium"
            >
              <ZapIcon className="w-3 h-3" />
              {rushCount} Rush
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/70 border border-white/10 rounded-md text-sm transition-colors">
            <UploadIcon className="w-4 h-4" />
            Bulk Import
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md text-sm transition-colors">
            <PlusIcon className="w-4 h-4" />
            Add Batch
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/10 rounded-lg">
        <FilterIcon className="w-4 h-4 text-white/40" />
        <div className="flex items-center gap-2">
          {statusFilters.map(status => (
            <button
              key={status}
              onClick={() => setFilters(f => ({
                ...f,
                status: f.status?.includes(status)
                  ? f.status.filter(s => s !== status)
                  : [...(f.status || []), status],
              }))}
              className={cn(
                'px-2 py-1 text-xs rounded border transition-colors',
                filters.status?.includes(status)
                  ? 'bg-cyan-400/10 text-cyan-400 border-cyan-400/30'
                  : 'text-white/50 border-white/10 hover:border-white/20'
              )}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 ml-auto text-sm text-white/50">
          <input
            type="checkbox"
            checked={filters.is_rush}
            onChange={e => setFilters(f => ({ ...f, is_rush: e.target.checked || undefined }))}
            className="rounded border-white/20 bg-transparent accent-amber-400"
          />
          Rush only
        </label>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <span className="text-sm text-cyan-400 font-medium">
            {selectedIds.size} selected
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => handleBulkAction({ status: 'in_progress' })}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded"
            >
              <PlayIcon className="w-3 h-3" /> Start
            </button>
            <button
              onClick={() => handleBulkAction({ status: 'on_hold' })}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-white/10 hover:bg-white/20 text-white rounded"
            >
              <PauseIcon className="w-3 h-3" /> Pause
            </button>
            <button
              onClick={() => handleBulkAction({ status: 'completed' })}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded"
            >
              <CheckIcon className="w-3 h-3" /> Complete
            </button>
            <button
              onClick={() => handleBulkAction({ priority: 1 })}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded"
            >
              <ArrowUpIcon className="w-3 h-3" /> Prioritize
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1 text-white/50 hover:text-white"
            >
              <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white/[0.02] border border-white/10 rounded-lg overflow-hidden">
        <DataTable
          columns={columns}
          data={batches}
          loading={isLoading}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyMessage="No batches yet"
        />
      </div>
    </div>
  );
}
