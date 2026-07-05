// (c) Copyright Datacraft, 2026
/**
 * BatchActionsBar — fixed floating bar shown when documents are selected.
 *
 * Renders at the bottom-centre of the viewport whenever selectedIds.length > 0.
 * Provides: Tag, Move, Classify, Export ZIP, Delete actions.
 * All operations call POST /api/v1/documents/batch via useBatchOperation().
 */
import { useBatchOperation } from '../api/batch';
import { useBulkTag, useBulkMove, useBulkAssignType, documentKeys } from '../api';
import { useBulkDownloadZip } from '../api/bulkDownload';
import { useBatchLabels } from '../api/qr';
import { useFolderTree, type TreeNode as APITreeNode } from '../api';
import { useTags } from '@/features/tags/api';
import { useDocumentTypes } from '@/features/document-types/api';
import type { Tag as TagType } from '@/features/tags/types';
import type { DocumentType } from '@/features/document-types/types';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Archive,
  Check,
  Package,
  FileType,
  Folder,
  GitCompare,
  Loader2,
  Merge,
  Move,
  QrCode,
  Shield,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MergeDocumentsDialog, type MergeSourceDocument } from './MergeDocumentsDialog';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BatchActionsBarProps {
  selectedIds: string[];
  selectedDocuments?: MergeSourceDocument[];
  onClear: () => void;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Internal dialog types
// ---------------------------------------------------------------------------

type ActiveDialog = 'tag' | 'move' | 'classify' | 'delete' | 'export' | 'merge' | 'hold' | null;

// ---------------------------------------------------------------------------
// Tag dialog
// ---------------------------------------------------------------------------

function TagDialog({
  onApply,
  onClose,
  isPending,
}: {
  onApply: (tagNames: string[]) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const { data: tagsData } = useTags();
  const tags: TagType[] = tagsData?.items ?? (tagsData as unknown as TagType[]) ?? [];
  const [tagInput, setTagInput] = useState('');

  const tagNames = tagInput
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);

  return (
    <Backdrop onClose={onClose}>
      <DialogCard>
        <DialogHeader icon={<Tag className="w-5 h-5 text-brass-400" />} title="Tag Documents" subtitle="Apply tags to selected documents" />

        <div className="mb-4">
          <label htmlFor="bulk-tag-input" className="block text-xs text-slate-400 mb-1">
            Tags
          </label>
          <input
            id="bulk-tag-input"
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="contract, finance, urgent"
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brass-500"
            autoFocus
          />
          <p className="mt-1 text-xs text-slate-500">Separate multiple tags with commas.</p>
        </div>

        <div className="max-h-32 overflow-y-auto border border-slate-700 rounded-lg py-1 mb-4 bg-slate-800/50">
          {tags.length === 0
            ? <p className="text-sm text-slate-500 text-center py-4">No tags available</p>
            : tags.map((t) => (
              <div
                key={t.id}
                className="w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded text-slate-300"
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color ?? '#c41fff' }} />
                {t.name}
              </div>
            ))
          }
        </div>

        <DialogFooter
          onClose={onClose}
          onConfirm={() => onApply(tagNames)}
          disabled={tagNames.length === 0 || isPending}
          isPending={isPending}
          confirmLabel="Apply Tags"
          confirmIcon={<Tag className="w-4 h-4" />}
        />
      </DialogCard>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Move dialog
// ---------------------------------------------------------------------------

function MoveDialog({
  onApply,
  onClose,
  isPending,
}: {
  onApply: (folderId: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const { data: tree } = useFolderTree();
  const [selected, setSelected] = useState<string | null>(null);

  function renderNodes(nodes: APITreeNode[], depth = 0): React.ReactNode {
    return nodes.map((n) => (
      <div key={n.id}>
        <button
          onClick={() => setSelected(n.id)}
          className={cn(
            'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded transition-colors',
            selected === n.id ? 'bg-brass-500/20 text-brass-400' : 'text-slate-300 hover:bg-slate-700/50',
          )}
          style={{ paddingLeft: `${depth * 12 + 12}px` }}
        >
          <Folder className="w-4 h-4 flex-shrink-0 text-slate-500" />
          {n.title}
        </button>
        {n.children && renderNodes(n.children, depth + 1)}
      </div>
    ));
  }

  return (
    <Backdrop onClose={onClose}>
      <DialogCard>
        <DialogHeader icon={<Move className="w-5 h-5 text-brass-400" />} title="Move Documents" subtitle="Select destination folder" />
        <div className="max-h-64 overflow-y-auto border border-slate-700 rounded-lg py-1 mb-4 bg-slate-800/50">
          {!tree || tree.length === 0
            ? <p className="text-sm text-slate-500 text-center py-4">No folders</p>
            : renderNodes(tree)
          }
        </div>
        <DialogFooter
          onClose={onClose}
          onConfirm={() => selected && onApply(selected)}
          disabled={!selected || isPending}
          isPending={isPending}
          confirmLabel="Move Here"
          confirmIcon={<Move className="w-4 h-4" />}
        />
      </DialogCard>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Classify dialog
// ---------------------------------------------------------------------------

function ClassifyDialog({
  onApply,
  onClose,
  isPending,
}: {
  onApply: (typeId: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const { data: typesData } = useDocumentTypes();
  const types: DocumentType[] = typesData?.items ?? (typesData as unknown as DocumentType[]) ?? [];
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Backdrop onClose={onClose}>
      <DialogCard>
        <DialogHeader icon={<FileType className="w-5 h-5 text-brass-400" />} title="Classify Documents" subtitle="Set document type on selected documents" />
        <div className="max-h-64 overflow-y-auto border border-slate-700 rounded-lg py-1 mb-4 bg-slate-800/50">
          {types.length === 0
            ? <p className="text-sm text-slate-500 text-center py-4">No document types defined</p>
            : types.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded transition-colors',
                  selected === t.id ? 'bg-brass-500/20 text-brass-400' : 'text-slate-300 hover:bg-slate-700/50',
                )}
              >
                <FileType className="w-4 h-4 flex-shrink-0 text-slate-500" />
                {t.name}
                {selected === t.id && <Check className="w-3 h-3 ml-auto text-brass-400" />}
              </button>
            ))
          }
        </div>
        <DialogFooter
          onClose={onClose}
          onConfirm={() => selected && onApply(selected)}
          disabled={!selected || isPending}
          isPending={isPending}
          confirmLabel="Classify"
          confirmIcon={<FileType className="w-4 h-4" />}
        />
      </DialogCard>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Delete confirm dialog
// ---------------------------------------------------------------------------

function DeleteDialog({
  count,
  onConfirm,
  onClose,
  isPending,
}: {
  count: number;
  onConfirm: () => void;
  onClose: () => void;
  isPending: boolean;
}) {
  return (
    <Backdrop onClose={onClose}>
      <DialogCard>
        <DialogHeader icon={<AlertTriangle className="w-5 h-5 text-red-400" />} title={`Delete ${count} document${count !== 1 ? 's' : ''}`} subtitle="This action cannot be undone" iconBg="bg-red-500/20" />
        <p className="text-slate-300 mb-6">
          Permanently delete{' '}
          <span className="font-semibold text-red-400">{count} selected document{count !== 1 ? 's' : ''}</span>?
          All associated files will be removed.
        </p>
        <DialogFooter
          onClose={onClose}
          onConfirm={onConfirm}
          disabled={isPending}
          isPending={isPending}
          confirmLabel="Delete All"
          confirmIcon={<Trash2 className="w-4 h-4" />}
          confirmClassName="btn-primary bg-red-600 hover:bg-red-500 border-red-500"
        />
      </DialogCard>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Hold dialog
// ---------------------------------------------------------------------------

function HoldDialog({
  count,
  onApply,
  onClose,
  isPending,
}: {
  count: number;
  onApply: (holdName: string, holdReason: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [holdName, setHoldName] = useState('');
  const [holdReason, setHoldReason] = useState('');
  const valid = holdName.trim().length > 0 && holdReason.trim().length > 0;

  return (
    <Backdrop onClose={onClose}>
      <DialogCard>
        <DialogHeader
          icon={<Shield className="w-5 h-5 text-brass-400" />}
          title={`Place Legal Hold on ${count} document${count !== 1 ? 's' : ''}`}
          subtitle="Documents under hold cannot be deleted or modified"
        />
        <div className="space-y-3 mb-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Hold name</label>
            <input
              type="text"
              value={holdName}
              onChange={(e) => setHoldName(e.target.value)}
              placeholder="e.g. Litigation Hold 2026-Q2"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brass-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Reason</label>
            <textarea
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="Describe the reason for placing this hold..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-brass-500 resize-none"
            />
          </div>
        </div>
        <DialogFooter
          onClose={onClose}
          onConfirm={() => onApply(holdName.trim(), holdReason.trim())}
          disabled={!valid || isPending}
          isPending={isPending}
          confirmLabel="Place Hold"
          confirmIcon={<Shield className="w-4 h-4" />}
        />
      </DialogCard>
    </Backdrop>
  );
}

// ---------------------------------------------------------------------------
// Shared dialog primitives
// ---------------------------------------------------------------------------

function Backdrop({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {children}
    </div>
  );
}

function DialogCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative z-10 w-full max-w-md glass-card p-6"
    >
      {children}
    </motion.div>
  );
}

function DialogHeader({
  icon,
  title,
  subtitle,
  iconBg = 'bg-brass-500/20',
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  iconBg?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center', iconBg)}>
        {icon}
      </div>
      <div>
        <h3 className="font-display font-semibold text-slate-100">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function DialogFooter({
  onClose,
  onConfirm,
  disabled,
  isPending,
  confirmLabel,
  confirmIcon,
  confirmClassName = 'btn-primary',
}: {
  onClose: () => void;
  onConfirm: () => void;
  disabled: boolean;
  isPending: boolean;
  confirmLabel: string;
  confirmIcon: React.ReactNode;
  confirmClassName?: string;
}) {
  return (
    <div className="flex justify-end gap-3">
      <button onClick={onClose} disabled={isPending} className="btn-secondary">
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={disabled}
        className={cn('btn-primary flex items-center gap-2', confirmClassName)}
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmIcon}
        {confirmLabel}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Hold sequencer — calls usePlaceLegalHold per document id in sequence
// ---------------------------------------------------------------------------

function useBatchHold() {
  const [isPending, setIsPending] = useState(false);

  const placeHolds = async (
    documentIds: string[],
    holdName: string,
    holdReason: string,
    onSuccess: () => void,
  ) => {
    setIsPending(true);
    try {
      for (const docId of documentIds) {
        // Each call is independent — we instantiate the hook payload directly
        await fetch(`/api/v1/documents/${docId}/legal-holds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ hold_name: holdName, hold_reason: holdReason }),
        });
      }
      onSuccess();
    } finally {
      setIsPending(false);
    }
  };

  return { placeHolds, isPending };
}

export function BatchActionsBar({ selectedIds, selectedDocuments, onClear, onComplete }: BatchActionsBarProps) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const queryClient = useQueryClient();
  const batch = useBatchOperation();
  const bulkTag = useBulkTag();
  const bulkMove = useBulkMove();
  const bulkAssignType = useBulkAssignType();
  const bulkDownload = useBulkDownloadZip();
  const batchLabels = useBatchLabels();
  const batchHold = useBatchHold();
  const navigate = useNavigate();

  // Derive merge sources: use selectedDocuments if provided, else bare id-only stubs
  const mergeSources: MergeSourceDocument[] = selectedDocuments && selectedDocuments.length > 0
    ? selectedDocuments
    : selectedIds.map((id) => ({ id, title: id }));

  const close = () => setActiveDialog(null);
  const count = selectedIds.length;

  const ensureTags = async (tagNames: string[]) => {
    const { data } = await apiClient.get<{ items: TagType[] }>('/tags');
    const existing = data.items ?? [];
    const tagByName = new Map(existing.map((tag) => [tag.name.toLowerCase(), tag]));
    const tagIds: string[] = [];

    for (const tagName of tagNames) {
      const existingTag = tagByName.get(tagName.toLowerCase());
      if (existingTag) {
        tagIds.push(existingTag.id);
        continue;
      }

      const { data: createdTag } = await apiClient.post<TagType>('/tags', { name: tagName });
      tagByName.set(createdTag.name.toLowerCase(), createdTag);
      tagIds.push(createdTag.id);
    }

    await queryClient.invalidateQueries({ queryKey: ['tags'] });
    return tagIds;
  };

  const tagMutation = useMutation({
    mutationFn: async (tagNames: string[]) => {
      const tagIds = await ensureTags(tagNames);
      return bulkTag.mutateAsync({ node_ids: selectedIds, tag_ids: tagIds, action: 'add' });
    },
    onSuccess: async () => {
      close();
      await queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast.success(`Tagged ${count} document${count !== 1 ? 's' : ''}`);
      onComplete();
    },
    onError: (err) => {
      console.error('Bulk tag failed:', err);
      toast.error('Failed to tag documents');
    },
  });

  const moveMutation = useMutation({
    mutationFn: (folderId: string) =>
      bulkMove.mutateAsync({ node_ids: selectedIds, target_folder_id: folderId }),
    onSuccess: async () => {
      close();
      await queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast.success(`Moved ${count} document${count !== 1 ? 's' : ''}`);
      onComplete();
    },
    onError: (err) => {
      console.error('Bulk move failed:', err);
      toast.error('Failed to move documents');
    },
  });

  const classifyMutation = useMutation({
    mutationFn: (typeId: string) =>
      bulkAssignType.mutateAsync({ node_ids: selectedIds, document_type_id: typeId }),
    onSuccess: async () => {
      close();
      await queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast.success(`Classified ${count} document${count !== 1 ? 's' : ''}`);
      onComplete();
    },
    onError: (err) => {
      console.error('Bulk classify failed:', err);
      toast.error('Failed to classify documents');
    },
  });

  const downloadMutation = useMutation({
    mutationFn: () => bulkDownload.mutateAsync(selectedIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast.success(`Downloaded ${count} document${count !== 1 ? 's' : ''}`);
      onComplete();
    },
    onError: (err) => {
      console.error('Bulk download failed:', err);
      toast.error('Failed to download documents');
    },
  });

  const archiveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(selectedIds.map((id) => apiClient.patch(`/nodes/${id}`, { archived: true })));
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: documentKeys.all });
      toast.success(`Archived ${count} document${count !== 1 ? 's' : ''}`);
      onComplete();
    },
    onError: (err) => {
      console.error('Bulk archive failed:', err);
      toast.error('Failed to archive documents');
    },
  });

  const run = (
    operation: Parameters<typeof batch.mutate>[0]['operation'],
    params: Parameters<typeof batch.mutate>[0]['params'],
    label: string,
  ) => {
    batch.mutate(
      { operation, document_ids: selectedIds, params },
      {
        onSuccess: (data) => {
          close();
          if (operation === 'export' && data.operation_id) {
            // Trigger download via the bulk-export status endpoint
            window.open(`/api/v1/nodes/bulk-export/${data.operation_id}`, '_blank');
          }
          toast.success(`${label[0].toUpperCase()}${label.slice(1)}d ${count} document${count !== 1 ? 's' : ''}`);
          onComplete();
        },
        onError: (err) => {
          console.error(`Batch ${label} failed:`, err);
        },
      },
    );
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 glass-card border border-brass-500/30 shadow-2xl shadow-brass-500/10"
        >
          {/* Count + clear */}
          <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
            <span className="text-sm font-semibold text-brass-400">{selectedIds.length}</span>
            <span className="text-sm text-slate-400">
              document{selectedIds.length !== 1 ? 's' : ''} selected
            </span>
            <button
              onClick={onClear}
              className="ml-1 p-0.5 text-slate-500 hover:text-slate-300 rounded"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={() => setActiveDialog('tag')}
            disabled={tagMutation.isPending}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40"
          >
            {tagMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Tag className="w-4 h-4" />}
            Tag
          </button>

          <button
            onClick={() => setActiveDialog('move')}
            disabled={moveMutation.isPending}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40"
          >
            {moveMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Move className="w-4 h-4" />}
            Move
          </button>

          <button
            onClick={() => setActiveDialog('classify')}
            disabled={classifyMutation.isPending}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40"
          >
            {classifyMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <FileType className="w-4 h-4" />}
            Classify
          </button>

          <button
            onClick={() => setActiveDialog('merge')}
            disabled={selectedIds.length < 2}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title={selectedIds.length < 2 ? 'Select at least 2 documents to merge' : 'Merge into one PDF'}
          >
            <Merge className="w-4 h-4" /> Merge
          </button>

          <button
            onClick={() => {
              const [id1, id2] = selectedIds;
              navigate(`/compare?a=${id1}&b=${id2}`);
            }}
            disabled={selectedIds.length !== 2}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            title={selectedIds.length !== 2 ? 'Select exactly 2 documents to compare' : 'Compare side by side'}
          >
            <GitCompare className="w-4 h-4" /> Compare
          </button>

          <button
            onClick={() => batchLabels.mutate(selectedIds)}
            disabled={batchLabels.isPending}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
            title="Download QR label sheet for selected documents"
          >
            {batchLabels.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <QrCode className="w-4 h-4" />}
            Labels
          </button>

          <button
            onClick={() => downloadMutation.mutate()}
            disabled={downloadMutation.isPending || selectedIds.length === 0}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
            title="Download selected documents as a ZIP"
          >
            {downloadMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Package className="w-4 h-4" />}
            Download
          </button>

          <button
            onClick={() => archiveMutation.mutate()}
            disabled={archiveMutation.isPending}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
            title="Archive selected documents"
          >
            {archiveMutation.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Archive className="w-4 h-4" />}
            Archive
          </button>

          <button
            onClick={() => setActiveDialog('hold')}
            disabled={batchHold.isPending}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
            title="Place legal hold on selected documents"
          >
            {batchHold.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Shield className="w-4 h-4" />}
            Hold
          </button>

          <button
            onClick={() => setActiveDialog('delete')}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5 text-red-400 hover:text-red-300"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {activeDialog === 'tag' && (
          <TagDialog
            onApply={(tagNames) => tagMutation.mutate(tagNames)}
            onClose={close}
            isPending={tagMutation.isPending}
          />
        )}
        {activeDialog === 'move' && (
          <MoveDialog
            onApply={(folderId) => moveMutation.mutate(folderId)}
            onClose={close}
            isPending={moveMutation.isPending}
          />
        )}
        {activeDialog === 'classify' && (
          <ClassifyDialog
            onApply={(typeId) => classifyMutation.mutate(typeId)}
            onClose={close}
            isPending={classifyMutation.isPending}
          />
        )}
        {activeDialog === 'delete' && (
          <DeleteDialog
            count={selectedIds.length}
            onConfirm={() => run('delete', {}, 'delete')}
            onClose={close}
            isPending={batch.isPending}
          />
        )}
        {activeDialog === 'hold' && (
          <HoldDialog
            count={selectedIds.length}
            onApply={(holdName, holdReason) =>
              batchHold.placeHolds(selectedIds, holdName, holdReason, () => {
                close();
                onComplete();
              })
            }
            onClose={close}
            isPending={batchHold.isPending}
          />
        )}
      </AnimatePresence>

      {activeDialog === 'merge' && (
        <MergeDocumentsDialog
          open={true}
          documents={mergeSources}
          onClose={close}
          onSuccess={(result) => {
            close();
            onComplete();
            // Navigate user to the new merged document
            window.location.href = `/document/${result.document_id}`;
          }}
        />
      )}
    </>
  );
}
