// (c) Copyright Datacraft, 2026
/**
 * BatchActionsBar — fixed floating bar shown when documents are selected.
 *
 * Renders at the bottom-centre of the viewport whenever selectedIds.length > 0.
 * Provides: Tag, Move, Classify, Export ZIP, Delete actions.
 * All operations call POST /api/v1/documents/batch via useBatchOperation().
 */
import { useBatchOperation } from '../api/batch';
import { useFolderTree, type TreeNode as APITreeNode } from '../api';
import { useTags } from '@/features/tags/api';
import { useDocumentTypes } from '@/features/document-types/api';
import type { Tag as TagType } from '@/features/tags/types';
import type { DocumentType } from '@/features/document-types/types';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Archive,
  Check,
  FileType,
  Folder,
  Loader2,
  Move,
  Tag,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface BatchActionsBarProps {
  selectedIds: string[];
  onClear: () => void;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Internal dialog types
// ---------------------------------------------------------------------------

type ActiveDialog = 'tag' | 'move' | 'classify' | 'delete' | 'export' | null;

// ---------------------------------------------------------------------------
// Tag dialog
// ---------------------------------------------------------------------------

function TagDialog({
  onApply,
  onClose,
  isPending,
}: {
  onApply: (tagIds: string[], action: 'add' | 'remove' | 'set') => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const { data: tagsData } = useTags();
  const tags: TagType[] = tagsData?.items ?? (tagsData as unknown as TagType[]) ?? [];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<'add' | 'remove' | 'set'>('add');

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <Backdrop onClose={onClose}>
      <DialogCard>
        <DialogHeader icon={<Tag className="w-5 h-5 text-brass-400" />} title="Tag Documents" subtitle="Apply tags to selected documents" />

        <div className="flex gap-2 mb-3">
          {(['add', 'remove', 'set'] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={cn(
                'flex-1 py-1.5 text-xs rounded-lg border transition-colors capitalize',
                action === a
                  ? 'bg-brass-500/20 border-brass-500 text-brass-400'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600',
              )}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="max-h-48 overflow-y-auto border border-slate-700 rounded-lg py-1 mb-4 bg-slate-800/50">
          {tags.length === 0
            ? <p className="text-sm text-slate-500 text-center py-4">No tags available</p>
            : tags.map((t) => (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded transition-colors',
                  selected.has(t.id) ? 'bg-brass-500/20 text-brass-400' : 'text-slate-300 hover:bg-slate-700/50',
                )}
              >
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: t.color ?? '#c41fff' }} />
                {t.name}
                {selected.has(t.id) && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))
          }
        </div>

        <DialogFooter
          onClose={onClose}
          onConfirm={() => onApply(Array.from(selected), action)}
          disabled={selected.size === 0 || isPending}
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

export function BatchActionsBar({ selectedIds, onClear, onComplete }: BatchActionsBarProps) {
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  const batch = useBatchOperation();

  const close = () => setActiveDialog(null);

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
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
          >
            <Tag className="w-4 h-4" /> Tag
          </button>

          <button
            onClick={() => setActiveDialog('move')}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
          >
            <Move className="w-4 h-4" /> Move
          </button>

          <button
            onClick={() => setActiveDialog('classify')}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
          >
            <FileType className="w-4 h-4" /> Classify
          </button>

          <button
            onClick={() =>
              run('export', {}, 'export')
            }
            disabled={batch.isPending}
            className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
          >
            {batch.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Archive className="w-4 h-4" />}
            Export ZIP
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
            onApply={(tagIds, action) => run('tag', { tag_ids: tagIds, action }, 'tag')}
            onClose={close}
            isPending={batch.isPending}
          />
        )}
        {activeDialog === 'move' && (
          <MoveDialog
            onApply={(folderId) => run('move', { destination_folder_id: folderId }, 'move')}
            onClose={close}
            isPending={batch.isPending}
          />
        )}
        {activeDialog === 'classify' && (
          <ClassifyDialog
            onApply={(typeId) => run('classify', { document_type_id: typeId }, 'classify')}
            onClose={close}
            isPending={batch.isPending}
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
      </AnimatePresence>
    </>
  );
}
