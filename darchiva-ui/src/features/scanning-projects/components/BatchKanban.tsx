// (c) Copyright Datacraft, 2026
/**
 * Batch pipeline Kanban board.
 * Columns: Unassigned → In Progress → QC → Complete
 * Drag-and-drop between columns updates batch status.
 * Priority lanes: 0=Normal (gray), 1=High (amber), 2=Urgent (red).
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Loader2, User, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

type BatchStatus = 'pending' | 'assigned' | 'scanning' | 'qc_review' | 'completed' | 'on_hold';
type BatchPriority = 0 | 1 | 2;

interface Batch {
  id: string;
  batchNumber: string;
  status: BatchStatus;
  priority: BatchPriority;
  estimatedPages: number;
  actualPages: number;
  scannedPages: number;
  assignedOperatorName: string | null;
  assignedScannerName: string | null;
  physicalLocation: string;
  hasIssues?: boolean;
}

const PRIORITY_CONFIG: Record<BatchPriority, { label: string; badgeClass: string; selectClass: string }> = {
  0: { label: 'Normal',  badgeClass: 'bg-slate-500/15 text-slate-400 border-slate-500/30', selectClass: 'text-slate-400' },
  1: { label: 'High',    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30', selectClass: 'text-amber-400' },
  2: { label: 'Urgent',  badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30',       selectClass: 'text-red-400' },
};

interface BatchKanbanProps {
  projectId: string;
}

const COLUMNS: { status: BatchStatus[]; label: string; color: string }[] = [
  { status: ['pending'], label: 'Unassigned', color: 'border-muted-foreground/30' },
  { status: ['assigned', 'scanning'], label: 'In Progress', color: 'border-blue-300' },
  { status: ['qc_review'], label: 'QC Review', color: 'border-amber-300' },
  { status: ['completed'], label: 'Complete', color: 'border-green-300' },
];

function BatchCard({
  batch,
  onDragStart,
  onPriorityChange,
}: {
  batch: Batch;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onPriorityChange: (batchId: string, priority: BatchPriority) => void;
}) {
  const pct = batch.estimatedPages > 0
    ? Math.round((batch.scannedPages / batch.estimatedPages) * 100)
    : 0;
  const priorityCfg = PRIORITY_CONFIG[batch.priority ?? 0];

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, batch.id)}
      className="rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing select-none hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium truncate">{batch.batchNumber}</span>
        <div className="flex items-center gap-1 flex-shrink-0">
          {batch.hasIssues && (
            <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5" />
          )}
          {/* Priority badge */}
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border ${priorityCfg.badgeClass}`}>
            {priorityCfg.label}
          </span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-0.5 truncate">{batch.physicalLocation}</p>

      {/* Progress bar */}
      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs text-muted-foreground">
          {batch.scannedPages}/{batch.estimatedPages}p
        </span>
        <span className="text-xs text-muted-foreground">{pct}%</span>
      </div>

      {batch.assignedOperatorName && (
        <div className="flex items-center gap-1 mt-1.5">
          <User className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate">{batch.assignedOperatorName}</span>
        </div>
      )}

      {/* Priority selector */}
      <div className="mt-2 pt-2 border-t border-border/50">
        <select
          value={batch.priority ?? 0}
          onChange={(e) => {
            e.stopPropagation();
            onPriorityChange(batch.id, Number(e.target.value) as BatchPriority);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className={`w-full text-[11px] bg-transparent border border-border/50 rounded px-1.5 py-0.5 cursor-pointer focus:outline-none focus:border-border ${priorityCfg.selectClass}`}
        >
          <option value={0}>Normal</option>
          <option value={1}>High</option>
          <option value={2}>Urgent</option>
        </select>
      </div>
    </div>
  );
}

export function BatchKanban({ projectId }: BatchKanbanProps) {
  const qc = useQueryClient();
  const [dragOver, setDragOver] = useState<string | null>(null);

  const { data: batches, isLoading, isError } = useQuery<Batch[]>({
    queryKey: ['project-batches-kanban', projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<{ items?: Batch[] } | Batch[]>(
        `/scanning-projects/${projectId}/batches`
      );
      return Array.isArray(data) ? data : (data.items ?? []);
    },
    refetchInterval: 30_000,
  });

  const moveMutation = useMutation({
    mutationFn: ({ batchId, newStatus }: { batchId: string; newStatus: string }) =>
      apiClient.patch(`/scanning-projects/${projectId}/batches/${batchId}`, {
        status: newStatus,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-batches-kanban', projectId] });
      toast.success('Batch status updated');
    },
    onError: () => toast.error('Failed to update batch status'),
  });

  const priorityMutation = useMutation({
    mutationFn: ({ batchId, priority }: { batchId: string; priority: BatchPriority }) =>
      apiClient.patch(`/scanning-projects/batches/${batchId}/priority`, { priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-batches-kanban', projectId] });
      toast.success('Batch priority updated');
    },
    onError: () => toast.error('Failed to update batch priority'),
  });

  const handlePriorityChange = (batchId: string, priority: BatchPriority) => {
    priorityMutation.mutate({ batchId, priority });
  };

  const handleDragStart = (e: React.DragEvent, batchId: string) => {
    e.dataTransfer.setData('batchId', batchId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetStatuses: BatchStatus[]) => {
    e.preventDefault();
    setDragOver(null);
    const batchId = e.dataTransfer.getData('batchId');
    if (!batchId) return;
    const targetStatus = targetStatuses[0];
    moveMutation.mutate({ batchId, newStatus: targetStatus });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading batches…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-sm text-destructive">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load batches.</span>
      </div>
    );
  }

  const batchList = batches ?? [];

  // Summary counts
  const total = batchList.length;
  const done = batchList.filter((b) => b.status === 'completed').length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-base font-semibold">Batch Pipeline</h3>
          <p className="text-xs text-muted-foreground">{done}/{total} complete</p>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="text-sm font-medium">{Math.round((done / Math.max(total, 1)) * 100)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 min-h-64">
        {COLUMNS.map((col) => {
          const colBatches = batchList.filter((b) => col.status.includes(b.status));
          const isDragTarget = dragOver === col.label;

          return (
            <div
              key={col.label}
              onDragOver={(e) => { e.preventDefault(); setDragOver(col.label); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => handleDrop(e, col.status)}
              className={[
                'flex flex-col gap-2 rounded-xl border-2 p-3 transition-colors min-h-48',
                col.color,
                isDragTarget ? 'bg-primary/5' : 'bg-muted/20',
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {col.label}
                </span>
                <Badge variant="secondary" className="text-xs h-5 px-1.5">
                  {colBatches.length}
                </Badge>
              </div>

              {colBatches.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-xs text-muted-foreground/50 text-center">Drop here</p>
                </div>
              ) : (
                [...colBatches]
                  .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
                  .map((b) => (
                    <BatchCard
                      key={b.id}
                      batch={b}
                      onDragStart={handleDragStart}
                      onPriorityChange={handlePriorityChange}
                    />
                  ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
