// (c) Copyright Datacraft, 2026
/**
 * Batch pipeline Kanban board.
 * Columns: Unassigned → In Progress → QC → Complete
 * Drag-and-drop between columns updates batch status.
 */
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, User, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';

type BatchStatus = 'pending' | 'assigned' | 'scanning' | 'qc_review' | 'completed' | 'on_hold';

interface Batch {
  id: string;
  batchNumber: string;
  status: BatchStatus;
  estimatedPages: number;
  actualPages: number;
  scannedPages: number;
  assignedOperatorName: string | null;
  assignedScannerName: string | null;
  physicalLocation: string;
  hasIssues?: boolean;
}

interface BatchKanbanProps {
  projectId: string;
}

const COLUMNS: { status: BatchStatus[]; label: string; color: string }[] = [
  { status: ['pending'], label: 'Unassigned', color: 'border-muted-foreground/30' },
  { status: ['assigned', 'scanning'], label: 'In Progress', color: 'border-blue-300' },
  { status: ['qc_review'], label: 'QC Review', color: 'border-amber-300' },
  { status: ['completed'], label: 'Complete', color: 'border-green-300' },
];

const NEXT_STATUS: Partial<Record<BatchStatus, BatchStatus>> = {
  pending: 'assigned',
  assigned: 'scanning',
  scanning: 'qc_review',
  qc_review: 'completed',
};

function BatchCard({
  batch,
  onDragStart,
}: {
  batch: Batch;
  onDragStart: (e: React.DragEvent, id: string) => void;
}) {
  const pct = batch.estimatedPages > 0
    ? Math.round((batch.scannedPages / batch.estimatedPages) * 100)
    : 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, batch.id)}
      className="rounded-lg border bg-card p-3 cursor-grab active:cursor-grabbing select-none hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium truncate">{batch.batchNumber}</span>
        {batch.hasIssues && (
          <AlertTriangle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
        )}
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
    </div>
  );
}

export function BatchKanban({ projectId }: BatchKanbanProps) {
  const qc = useQueryClient();
  const [dragOver, setDragOver] = useState<string | null>(null);

  const { data: batches, isLoading } = useQuery<Batch[]>({
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project-batches-kanban', projectId] }),
  });

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
                colBatches.map((b) => (
                  <BatchCard key={b.id} batch={b} onDragStart={handleDragStart} />
                ))
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
