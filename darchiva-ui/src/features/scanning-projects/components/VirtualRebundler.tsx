// (c) Copyright Datacraft, 2026
/**
 * Virtual Rebundling UI — drag-and-drop page reorder and batch reassignment.
 * All operations are metadata-only (no file moves).
 */
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { GripVertical, ArrowRightLeft, Scissors, Layers } from 'lucide-react';

interface BatchDocument {
  id: string;
  documentId: string;
  order: number;
  pageCount: number;
  thumbnailUrl?: string;
  fileName?: string;
}

interface Batch {
  id: string;
  name: string;
  status: string;
  documents: BatchDocument[];
}

interface VirtualRebundlerProps {
  projectId: string;
  batchId: string;
  onClose?: () => void;
}

export function VirtualRebundler({ projectId, batchId, onClose }: VirtualRebundlerProps) {
  const qc = useQueryClient();
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [pages, setPages] = useState<BatchDocument[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const dragNode = useRef<HTMLDivElement | null>(null);

  const { data: batch, isLoading } = useQuery<Batch>({
    queryKey: ['batch', batchId],
    queryFn: async () => {
      const { data } = await apiClient.get<Batch>(`/scanning-projects/batches/${batchId}`);
      return data;
    },
  });

  useEffect(() => {
    if (batch) setPages(batch.documents ?? []);
  }, [batch]);

  const { data: siblingBatches } = useQuery<Batch[]>({
    queryKey: ['project-batches', projectId],
    queryFn: async () => {
      const { data } = await apiClient.get<Batch[]>(`/scanning-projects/${projectId}/batches`);
      return data;
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const { data } = await apiClient.post<void>(`/scanning-projects/batches/${batchId}/reorder`, {
        document_ids: orderedIds,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batch', batchId] });
      setIsDirty(false);
    },
  });

  const moveMutation = useMutation({
    mutationFn: async ({ docId, targetBatchId }: { docId: string; targetBatchId: string }) => {
      const { data } = await apiClient.post<void>(`/scanning-projects/batches/${batchId}/move-document`, {
        document_id: docId,
        target_batch_id: targetBatchId,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batch', batchId] });
      qc.invalidateQueries({ queryKey: ['project-batches', projectId] });
    },
  });

  const splitMutation = useMutation({
    mutationFn: async (atIndex: number) => {
      const { data } = await apiClient.post<void>(
        `/scanning-projects/batches/${batchId}/split?at_document_index=${atIndex}`,
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project-batches', projectId] });
      onClose?.();
    },
  });

  const mergeMutation = useMutation({
    // sourceBatchId is the batch to absorb INTO the current batchId
    mutationFn: async (sourceBatchId: string) => {
      const { data } = await apiClient.post<void>(`/scanning-projects/batches/merge`, {
        source_batch_ids: [batchId, sourceBatchId],
        target_batch_id: batchId,
      });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batch', batchId] });
      qc.invalidateQueries({ queryKey: ['project-batches', projectId] });
    },
  });

  // ── HTML5 drag handlers ──────────────────────────────────────────────────
  const handleDragStart = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const reordered = [...pages];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setPages(reordered);
    setIsDirty(true);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const saveOrder = () => {
    reorderMutation.mutate(pages.map((p) => p.id));
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-48 text-muted-foreground">Loading batch…</div>;
  }

  const otherBatches = siblingBatches?.filter((b) => b.id !== batchId) ?? [];

  return (
    <div className="flex flex-col gap-4 p-4 max-h-[80vh] overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Virtual Rebundler</h3>
          <p className="text-sm text-muted-foreground">
            Drag pages to reorder · Move or split to reassign documents
          </p>
        </div>
        <div className="flex gap-2">
          {isDirty && (
            <Button
              size="sm"
              onClick={saveOrder}
              disabled={reorderMutation.isPending}
            >
              {reorderMutation.isPending ? 'Saving…' : 'Save Order'}
            </Button>
          )}
          {otherBatches.length > 0 && (
            <Select
              onValueChange={(sourceBatchId) => {
                setConfirmDialog({
                  message: `Merge selected batch into ${batch?.name}?`,
                  onConfirm: () => mergeMutation.mutate(sourceBatchId),
                });
              }}
            >
              <SelectTrigger className="w-44 h-8">
                <Layers className="w-4 h-4 mr-1" />
                <SelectValue placeholder="Merge batch…" />
              </SelectTrigger>
              <SelectContent>
                {otherBatches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <Separator />

      {pages.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No documents in this batch.</p>
      ) : (
        <div className="flex flex-col gap-1">
          {pages.map((page, index) => (
            <div key={page.id}>
              <div
                ref={dragIndex === index ? dragNode : null}
                draggable
                onDragStart={handleDragStart(index)}
                onDragOver={handleDragOver(index)}
                onDrop={handleDrop(index)}
                onDragEnd={handleDragEnd}
                className={[
                  'flex items-center gap-3 rounded-lg border p-3 bg-card transition-colors cursor-grab active:cursor-grabbing select-none',
                  dragOverIndex === index && dragIndex !== index
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/40',
                  dragIndex === index ? 'opacity-50' : '',
                ].join(' ')}
              >
                <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm font-mono text-muted-foreground w-6 text-right flex-shrink-0">
                  {index + 1}
                </span>
                {page.thumbnailUrl ? (
                  <img
                    src={page.thumbnailUrl}
                    alt={page.fileName ?? `Document ${index + 1}`}
                    className="w-10 h-12 object-cover rounded border"
                  />
                ) : (
                  <div className="w-10 h-12 rounded border bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    {page.pageCount}p
                  </div>
                )}
                <span className="flex-1 text-sm truncate">
                  {page.fileName ?? `Document ${page.documentId.slice(0, 8)}…`}
                </span>
                <Badge variant="outline" className="text-xs flex-shrink-0">
                  {page.pageCount}p
                </Badge>

                {otherBatches.length > 0 && (
                  <Select
                    onValueChange={(targetBatchId) =>
                      moveMutation.mutate({ docId: page.id, targetBatchId })
                    }
                  >
                    <SelectTrigger className="w-32 h-7 text-xs flex-shrink-0">
                      <ArrowRightLeft className="w-3 h-3 mr-1" />
                      <SelectValue placeholder="Move to…" />
                    </SelectTrigger>
                    <SelectContent>
                      {otherBatches.map((b) => (
                        <SelectItem key={b.id} value={b.id} className="text-xs">
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Split point between pages */}
              {index < pages.length - 1 && (
                <div className="flex items-center gap-2 py-1 px-8 group">
                  <div className="flex-1 h-px bg-border group-hover:bg-primary/40 transition-colors" />
                  <button
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                    onClick={() => {
                      setConfirmDialog({
                        message: `Split batch after document ${index + 1}?`,
                        onConfirm: () => splitMutation.mutate(index + 1),
                      });
                    }}
                  >
                    <Scissors className="w-3 h-3" />
                    Split here
                  </button>
                  <div className="flex-1 h-px bg-border group-hover:bg-primary/40 transition-colors" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(reorderMutation.isError || moveMutation.isError || splitMutation.isError || mergeMutation.isError) && (
        <p className="text-sm text-destructive">Operation failed. Please try again.</p>
      )}
      <AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}
              className="bg-red-600 hover:bg-red-700"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
