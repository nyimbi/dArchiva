// (c) Copyright Datacraft, 2026
import {
  useBulkAssignType,
  useBulkDelete,
  useBulkMove,
  useBulkTag,
  useCreateFolder,
  useDeleteFolder,
  useDocuments,
  useFolderTree,
  useUpdateFolder,
  type Document as APIDocument,
  type TreeNode as APITreeNode,
} from '@/features/documents';
import { useDocumentTypes } from '@/features/document-types/api';
import { useTags } from '@/features/tags/api';
import type { DocumentType } from '@/features/document-types/types';
import type { Tag as TagType } from '@/features/tags/types';
import { ShareDialog } from '@/features/shared-nodes/components/ShareDialog';
import { useStore } from '@/hooks/useStore';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  FolderPlus,
  GitBranch,
  Grid,
  Image,
  List,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
  Share2,
  SortAsc,
  Square,
  Table,
  Tag,
  Trash2,
  Upload,
  FileType,
  Move,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Context menu state
// ---------------------------------------------------------------------------
interface ContextMenuState {
  x: number;
  y: number;
  node: APITreeNode;
}

// ---------------------------------------------------------------------------
// Delete folder modal
// ---------------------------------------------------------------------------
function DeleteFolderModal({
  folder,
  onClose,
  onConfirm,
  isDeleting,
}: {
  folder: APITreeNode;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-100">Delete Folder</h3>
            <p className="text-sm text-slate-500">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-slate-300 mb-6">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-brass-400">"{folder.title}"</span>? All contents will
          be permanently removed.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={isDeleting} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="btn-primary bg-red-600 hover:bg-red-500 border-red-500"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Folder context menu
// ---------------------------------------------------------------------------
function FolderContextMenu({
  state,
  onClose,
  onNewSubfolder,
  onRename,
  onDelete,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onNewSubfolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={menuRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className="fixed z-50 min-w-[160px] py-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl"
      style={{ left: state.x, top: state.y }}
    >
      <button
        onClick={() => { onNewSubfolder(); onClose(); }}
        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-brass-500/20 hover:text-brass-400 flex items-center gap-2 transition-colors"
      >
        <FolderPlus className="w-4 h-4" />
        New Subfolder
      </button>
      <button
        onClick={() => { onRename(); onClose(); }}
        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-brass-500/20 hover:text-brass-400 flex items-center gap-2 transition-colors"
      >
        <Pencil className="w-4 h-4" />
        Rename
      </button>
      <div className="my-1 border-t border-slate-700" />
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-2 transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Delete
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Folder tree item
// ---------------------------------------------------------------------------
function FolderTreeItem({
  node,
  depth = 0,
  onContextMenu,
  editingId,
  onStartEdit,
  onFinishEdit,
}: {
  node: APITreeNode;
  depth?: number;
  onContextMenu: (e: React.MouseEvent, node: APITreeNode) => void;
  editingId: string | null;
  onStartEdit: (id: string) => void;
  onFinishEdit: (id: string, newTitle: string) => void;
}) {
  const { expandedFolders, toggleFolder, currentFolderId, setCurrentFolderId } = useStore();
  const isExpanded = expandedFolders.has(node.id);
  const isSelected = currentFolderId === node.id;
  const hasChildren = node.children && node.children.length > 0;
  const isEditing = editingId === node.id;

  const [editValue, setEditValue] = useState(node.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onFinishEdit(node.id, editValue);
    } else if (e.key === 'Escape') {
      setEditValue(node.title);
      onFinishEdit(node.id, node.title);
    }
  };

  return (
    <div>
      <div
        onClick={() => !isEditing && setCurrentFolderId(node.id)}
        onContextMenu={(e) => onContextMenu(e, node)}
        onDoubleClick={() => !isEditing && onStartEdit(node.id)}
        className={cn(
          'tree-node group',
          isSelected && 'selected',
          isEditing && 'bg-brass-500/10 border-brass-500/30',
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleFolder(node.id); }}
            className="p-0.5 hover:bg-slate-700/50 rounded"
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {isExpanded || isSelected ? (
          <FolderOpen className="w-4 h-4 text-brass-400 flex-shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-slate-500 group-hover:text-slate-400 flex-shrink-0" />
        )}

        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => onFinishEdit(node.id, editValue)}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 bg-slate-800 border border-brass-500/50 rounded px-1.5 py-0.5 text-sm text-slate-200 focus:outline-none focus:border-brass-400"
          />
        ) : (
          <span className="truncate flex-1">{node.title}</span>
        )}

        {!isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onContextMenu(e, node); }}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-700/50 rounded transition-opacity"
          >
            <MoreVertical className="w-3 h-3" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children!.map((child) => (
              <FolderTreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                onContextMenu={onContextMenu}
                editingId={editingId}
                onStartEdit={onStartEdit}
                onFinishEdit={onFinishEdit}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document card (grid view)
// ---------------------------------------------------------------------------
function DocumentCard({
  doc,
  onShare,
  onOpen,
  selectionMode,
}: {
  doc: APIDocument;
  onShare: (doc: APIDocument) => void;
  onOpen: (doc: APIDocument) => void;
  selectionMode: boolean;
}) {
  const { selectedNodeIds, toggleNodeSelection } = useStore();
  const isSelected = selectedNodeIds.has(doc.id);
  const FileIcon = doc.title.toLowerCase().includes('image') ? Image
    : doc.title.toLowerCase().match(/\.xlsx?$/) ? Table
    : FileText;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('doc-card cursor-pointer group relative', isSelected && 'border-brass-500 bg-brass-500/5')}
      onClick={() => selectionMode ? toggleNodeSelection(doc.id) : undefined}
      onDoubleClick={() => !selectionMode && onOpen(doc)}
    >
      {/* Selection checkbox — visible on hover or when selection mode is active */}
      <div
        className={cn(
          'absolute top-2 left-2 z-10 transition-opacity',
          selectionMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        onClick={(e) => { e.stopPropagation(); toggleNodeSelection(doc.id); }}
      >
        <div className={cn(
          'w-5 h-5 rounded border-2 flex items-center justify-center',
          isSelected
            ? 'bg-brass-500 border-brass-500'
            : 'bg-slate-900/80 border-slate-500 hover:border-brass-400',
        )}>
          {isSelected && <Check className="w-3 h-3 text-slate-900" />}
        </div>
      </div>

      <div className="aspect-[4/3] bg-slate-800/50 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
        <FileIcon className="w-12 h-12 text-slate-600" />
        {doc.ocr_status === 'processing' && (
          <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-brass-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-400">Processing OCR</span>
            </div>
          </div>
        )}
      </div>
      <div>
        <h3 className="text-sm font-medium text-slate-200 truncate group-hover:text-brass-400 transition-colors">
          {doc.title}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span>{doc.file_size ? formatBytes(doc.file_size) : '—'}</span>
          <span>•</span>
          <span>{doc.page_count || 0} pages</span>
        </div>
        <p className="mt-1 text-xs text-slate-600">{formatRelativeTime(doc.updated_at)}</p>
      </div>
      {doc.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {doc.tags.slice(0, 2).map((tag) => (
            <span key={tag.id} className="badge badge-gray text-2xs">{tag.name}</span>
          ))}
          {doc.tags.length > 2 && (
            <span className="text-2xs text-slate-500">+{doc.tags.length - 2}</span>
          )}
        </div>
      )}
      {!selectionMode && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            className="p-1.5 rounded-lg bg-slate-900/90 text-slate-400 hover:text-brass-400 transition-colors"
            onClick={(e) => { e.stopPropagation(); onShare(doc); }}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 rounded-lg bg-slate-900/90 text-slate-400 hover:text-slate-200">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Document row (list view)
// ---------------------------------------------------------------------------
function DocumentRow({
  doc,
  onShare,
  onOpen,
}: {
  doc: APIDocument;
  onShare: (doc: APIDocument) => void;
  onOpen: (doc: APIDocument) => void;
}) {
  const { selectedNodeIds, toggleNodeSelection } = useStore();
  const isSelected = selectedNodeIds.has(doc.id);
  const FileIcon = doc.title.toLowerCase().includes('image') ? Image
    : doc.title.toLowerCase().match(/\.xlsx?$/) ? Table
    : FileText;
  const statusLabel = doc.ocr_status === 'completed' ? 'ready' : doc.ocr_status || 'pending';

  return (
    <tr
      className={cn('cursor-pointer transition-colors', isSelected && 'bg-brass-500/10')}
      onClick={() => toggleNodeSelection(doc.id)}
      onDoubleClick={() => onOpen(doc)}
    >
      <td className="w-10">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleNodeSelection(doc.id)}
          onClick={(e) => e.stopPropagation()}
          className="rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500/50"
        />
      </td>
      <td>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
            <FileIcon className="w-4 h-4 text-slate-500" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-200">{doc.title}</p>
            <div className="flex gap-1 mt-0.5">
              {doc.tags.slice(0, 2).map((tag) => (
                <span key={tag.id} className="badge badge-gray text-2xs">{tag.name}</span>
              ))}
            </div>
          </div>
        </div>
      </td>
      <td className="text-slate-400">{doc.file_size ? formatBytes(doc.file_size) : '—'}</td>
      <td className="text-slate-400">{doc.page_count || 0}</td>
      <td className="text-slate-400">{formatRelativeTime(doc.updated_at)}</td>
      <td>
        <span className={cn(
          'badge',
          statusLabel === 'ready' ? 'badge-green'
            : statusLabel === 'processing' ? 'badge-brass'
            : 'badge-gray',
        )}>
          {statusLabel}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-1">
          <button
            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded"
            onClick={(e) => { e.stopPropagation(); onShare(doc); }}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded">
            <GitBranch className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Folder picker modal (used by bulk move)
// ---------------------------------------------------------------------------
function FolderPickerModal({
  tree,
  onSelect,
  onClose,
  isPending,
}: {
  tree: APITreeNode[];
  onSelect: (folderId: string) => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  function renderNodes(nodes: APITreeNode[], depth = 0): React.ReactNode {
    return nodes.map((n) => (
      <div key={n.id}>
        <button
          onClick={() => setSelected(n.id)}
          className={cn(
            'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded transition-colors',
            selected === n.id
              ? 'bg-brass-500/20 text-brass-400'
              : 'text-slate-300 hover:bg-slate-700/50',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brass-500/20 flex items-center justify-center">
            <Move className="w-5 h-5 text-brass-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-100">Move to Folder</h3>
            <p className="text-sm text-slate-500">Select destination folder</p>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto border border-slate-700 rounded-lg py-1 mb-4 bg-slate-800/50">
          {tree.length === 0
            ? <p className="text-sm text-slate-500 text-center py-4">No folders</p>
            : renderNodes(tree)
          }
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => selected && onSelect(selected)}
            disabled={!selected || isPending}
            className="btn-primary"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Move className="w-4 h-4" />}
            Move Here
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tag picker modal (used by bulk tag)
// ---------------------------------------------------------------------------
function TagPickerModal({
  onApply,
  onClose,
  isPending,
}: {
  onApply: (tagIds: string[], action: 'add' | 'remove' | 'replace') => void;
  onClose: () => void;
  isPending: boolean;
}) {
  const { data: tagsData } = useTags();
  const tags: TagType[] = tagsData?.items ?? (tagsData as unknown as TagType[]) ?? [];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [action, setAction] = useState<'add' | 'remove' | 'replace'>('add');

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brass-500/20 flex items-center justify-center">
            <Tag className="w-5 h-5 text-brass-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-100">Bulk Tag</h3>
            <p className="text-sm text-slate-500">Apply tags to selected documents</p>
          </div>
        </div>

        {/* Action selector */}
        <div className="flex gap-2 mb-3">
          {(['add', 'remove', 'replace'] as const).map((a) => (
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
          {!tags || tags.length === 0
            ? <p className="text-sm text-slate-500 text-center py-4">No tags available</p>
            : tags.map((t) => (
              <button
                key={t.id}
                onClick={() => toggle(t.id)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded transition-colors',
                  selected.has(t.id)
                    ? 'bg-brass-500/20 text-brass-400'
                    : 'text-slate-300 hover:bg-slate-700/50',
                )}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ background: t.color ?? '#c41fff' }}
                />
                {t.name}
                {selected.has(t.id) && <Check className="w-3 h-3 ml-auto" />}
              </button>
            ))
          }
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => onApply(Array.from(selected), action)}
            disabled={selected.size === 0 || isPending}
            className="btn-primary"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
            Apply Tags
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Document type picker modal (used by bulk assign-type)
// ---------------------------------------------------------------------------
function DocTypePickerModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brass-500/20 flex items-center justify-center">
            <FileType className="w-5 h-5 text-brass-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-100">Assign Document Type</h3>
            <p className="text-sm text-slate-500">Set type on selected documents</p>
          </div>
        </div>

        <div className="max-h-64 overflow-y-auto border border-slate-700 rounded-lg py-1 mb-4 bg-slate-800/50">
          {!types || types.length === 0
            ? <p className="text-sm text-slate-500 text-center py-4">No document types defined</p>
            : types.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t.id)}
                className={cn(
                  'w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 rounded transition-colors',
                  selected === t.id
                    ? 'bg-brass-500/20 text-brass-400'
                    : 'text-slate-300 hover:bg-slate-700/50',
                )}
              >
                <FileType className="w-4 h-4 flex-shrink-0 text-slate-500" />
                {t.name}
                {selected === t.id && <Check className="w-3 h-3 ml-auto text-brass-400" />}
              </button>
            ))
          }
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => selected && onApply(selected)}
            disabled={!selected || isPending}
            className="btn-primary"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileType className="w-4 h-4" />}
            Assign Type
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bulk delete confirm dialog
// ---------------------------------------------------------------------------
function BulkDeleteModal({
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-slate-100">Delete {count} items</h3>
            <p className="text-sm text-slate-500">This action cannot be undone</p>
          </div>
        </div>
        <p className="text-slate-300 mb-6">
          Permanently delete{' '}
          <span className="font-semibold text-red-400">{count} selected item{count !== 1 ? 's' : ''}</span>?
          All contents will be removed.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={isPending} className="btn-secondary">Cancel</button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="btn-primary bg-red-600 hover:bg-red-500 border-red-500"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Delete All
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Floating bulk action bar
// ---------------------------------------------------------------------------
type BulkModal = 'move' | 'tag' | 'delete' | 'assign-type' | null;

function BulkActionBar({
  count,
  onClear,
  onAction,
}: {
  count: number;
  onClear: () => void;
  onAction: (action: Exclude<BulkModal, null>) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-5 py-3 glass-card border border-brass-500/30 shadow-2xl shadow-brass-500/10"
    >
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
        <span className="text-sm font-semibold text-brass-400">{count}</span>
        <span className="text-sm text-slate-400">selected</span>
        <button onClick={onClear} className="ml-1 text-xs text-slate-500 hover:text-slate-300 underline">
          Clear
        </button>
      </div>
      <button
        onClick={() => onAction('move')}
        className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
      >
        <Move className="w-4 h-4" /> Move
      </button>
      <button
        onClick={() => onAction('tag')}
        className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
      >
        <Tag className="w-4 h-4" /> Tag
      </button>
      <button
        onClick={() => onAction('assign-type')}
        className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5"
      >
        <FileType className="w-4 h-4" /> Assign Type
      </button>
      <button
        onClick={() => onAction('delete')}
        className="btn-ghost text-sm py-1.5 px-3 flex items-center gap-1.5 text-red-400 hover:text-red-300"
      >
        <Trash2 className="w-4 h-4" /> Delete
      </button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Documents page
// ---------------------------------------------------------------------------
export function Documents() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectionMode, setSelectionMode] = useState(false);
  const [activeBulkModal, setActiveBulkModal] = useState<BulkModal>(null);

  const { selectedNodeIds, clearNodeSelection, selectNodes, currentFolderId, openModal } = useStore();
  const navigate = useNavigate();

  const { data: folderTree, isLoading: treeLoading } = useFolderTree();
  const { data: documentsData, isLoading: docsLoading } = useDocuments(currentFolderId || undefined);

  const bulkMove = useBulkMove();
  const bulkDelete = useBulkDelete();
  const bulkTag = useBulkTag();
  const bulkAssignType = useBulkAssignType();

  const handleOpenDocument = useCallback((doc: APIDocument) => {
    navigate(`/document/${doc.id}`);
  }, [navigate]);

  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const documents = documentsData?.items.filter((d) => d.ctype === 'document') || [];
  const [sharingNode, setSharingNode] = useState<APIDocument | null>(null);

  // Folder tree UI state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<APITreeNode | null>(null);
  const [newSubfolderParent, setNewSubfolderParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  // Clear selection when leaving selection mode
  useEffect(() => {
    if (!selectionMode) clearNodeSelection();
  }, [selectionMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleContextMenu = useCallback((e: React.MouseEvent, node: APITreeNode) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, node });
  }, []);

  const handleStartEdit = useCallback((id: string) => {
    setEditingFolderId(id);
  }, []);

  const handleFinishEdit = useCallback((id: string, newTitle: string) => {
    setEditingFolderId(null);
    const node = folderTree?.find((n) => n.id === id) || findNodeInTree(folderTree || [], id);
    if (node && newTitle !== node.title && newTitle.trim()) {
      updateFolder.mutate({ id, title: newTitle.trim() });
    }
  }, [folderTree, updateFolder]);

  const handleDelete = useCallback(() => {
    if (deletingFolder) {
      deleteFolder.mutate(deletingFolder.id, {
        onSuccess: () => setDeletingFolder(null),
      });
    }
  }, [deletingFolder, deleteFolder]);

  const handleCreateSubfolder = useCallback(() => {
    if (newSubfolderParent && newFolderName.trim()) {
      createFolder.mutate(
        { title: newFolderName.trim(), parent_id: newSubfolderParent },
        { onSuccess: () => { setNewSubfolderParent(null); setNewFolderName(''); } },
      );
    }
  }, [newSubfolderParent, newFolderName, createFolder]);

  // Bulk action handlers
  const selectedIds = Array.from(selectedNodeIds);

  const handleBulkMove = useCallback((targetFolderId: string) => {
    bulkMove.mutate(
      { node_ids: selectedIds, target_folder_id: targetFolderId },
      { onSuccess: () => { setActiveBulkModal(null); clearNodeSelection(); } },
    );
  }, [selectedIds, bulkMove, clearNodeSelection]);

  const handleBulkTag = useCallback((tagIds: string[], action: 'add' | 'remove' | 'replace') => {
    bulkTag.mutate(
      { node_ids: selectedIds, tag_ids: tagIds, action },
      { onSuccess: () => { setActiveBulkModal(null); clearNodeSelection(); } },
    );
  }, [selectedIds, bulkTag, clearNodeSelection]);

  const handleBulkDelete = useCallback(() => {
    bulkDelete.mutate(
      { node_ids: selectedIds },
      { onSuccess: () => { setActiveBulkModal(null); clearNodeSelection(); setSelectionMode(false); } },
    );
  }, [selectedIds, bulkDelete, clearNodeSelection]);

  const handleBulkAssignType = useCallback((typeId: string) => {
    bulkAssignType.mutate(
      { node_ids: selectedIds, document_type_id: typeId },
      { onSuccess: () => { setActiveBulkModal(null); clearNodeSelection(); } },
    );
  }, [selectedIds, bulkAssignType, clearNodeSelection]);

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Folder tree sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-64 flex-shrink-0 glass-card flex flex-col"
      >
        <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="font-display font-semibold text-slate-200">Folders</h2>
          <button
            onClick={() => openModal('create-folder')}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
            title="New Folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {treeLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
            </div>
          ) : folderTree && folderTree.length > 0 ? (
            <>
              {folderTree.map((node) => (
                <FolderTreeItem
                  key={node.id}
                  node={node}
                  onContextMenu={handleContextMenu}
                  editingId={editingFolderId}
                  onStartEdit={handleStartEdit}
                  onFinishEdit={handleFinishEdit}
                />
              ))}
            </>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No folders</p>
          )}
        </div>
        <div className="p-2 border-t border-slate-700/50 text-xs text-slate-600">
          Right-click for options
        </div>
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex-1 flex flex-col"
      >
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input type="text" placeholder="Search in folder..." className="input-field pl-9 w-64" />
            </div>
            <button onClick={() => openModal('filter-documents')} className="btn-ghost">
              <Filter className="w-4 h-4" /> Filter
            </button>
            <button onClick={() => openModal('sort-documents')} className="btn-ghost">
              <SortAsc className="w-4 h-4" /> Sort
            </button>
          </div>
          <div className="flex items-center gap-2">
            {/* Selection mode badge when not in selection mode but items are selected */}
            {selectedNodeIds.size > 0 && !selectionMode && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm text-slate-400">{selectedNodeIds.size} selected</span>
                <button onClick={clearNodeSelection} className="text-xs text-brass-400 hover:text-brass-300">
                  Clear
                </button>
              </div>
            )}
            {/* Selection mode toggle */}
            <button
              onClick={() => setSelectionMode((v) => !v)}
              className={cn(
                'btn-ghost',
                selectionMode && 'bg-brass-500/20 text-brass-400 border-brass-500/40',
              )}
              title="Toggle selection mode"
            >
              {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              <span className="text-sm">Select</span>
            </button>
            <button onClick={() => openModal('upload')} className="btn-primary">
              <Upload className="w-4 h-4" /> Upload
            </button>
            <div className="flex border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300')}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300')}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Select-all row when in selection mode */}
        {selectionMode && documents.length > 0 && (
          <div className="flex items-center gap-3 mb-2 px-1">
            <input
              type="checkbox"
              checked={documents.every((d) => selectedNodeIds.has(d.id))}
              onChange={(e) =>
                e.target.checked ? selectNodes(documents.map((d) => d.id)) : clearNodeSelection()
              }
              className="rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500/50"
            />
            <span className="text-sm text-slate-400">Select all ({documents.length})</span>
          </div>
        )}

        {/* Documents area */}
        <div className="flex-1 overflow-y-auto">
          {docsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-slate-500" />
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <FileText className="w-12 h-12 mb-4" />
              <p>No documents in this folder</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {documents.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  onShare={setSharingNode}
                  onOpen={handleOpenDocument}
                  selectionMode={selectionMode}
                />
              ))}
            </div>
          ) : (
            <div className="glass-card overflow-hidden">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="w-10">
                      <input
                        type="checkbox"
                        onChange={(e) =>
                          e.target.checked
                            ? selectNodes(documents.map((d) => d.id))
                            : clearNodeSelection()
                        }
                        className="rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500/50"
                      />
                    </th>
                    <th>Name</th>
                    <th>Size</th>
                    <th>Pages</th>
                    <th>Modified</th>
                    <th>Status</th>
                    <th className="w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => (
                    <DocumentRow key={doc.id} doc={doc} onShare={setSharingNode} onOpen={handleOpenDocument} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      {/* Floating bulk action bar */}
      <AnimatePresence>
        {selectedNodeIds.size > 0 && (
          <BulkActionBar
            count={selectedNodeIds.size}
            onClear={() => { clearNodeSelection(); setSelectionMode(false); }}
            onAction={setActiveBulkModal}
          />
        )}
      </AnimatePresence>

      {/* Bulk modals */}
      <AnimatePresence>
        {activeBulkModal === 'move' && (
          <FolderPickerModal
            tree={folderTree ?? []}
            onSelect={handleBulkMove}
            onClose={() => setActiveBulkModal(null)}
            isPending={bulkMove.isPending}
          />
        )}
        {activeBulkModal === 'tag' && (
          <TagPickerModal
            onApply={handleBulkTag}
            onClose={() => setActiveBulkModal(null)}
            isPending={bulkTag.isPending}
          />
        )}
        {activeBulkModal === 'delete' && (
          <BulkDeleteModal
            count={selectedNodeIds.size}
            onConfirm={handleBulkDelete}
            onClose={() => setActiveBulkModal(null)}
            isPending={bulkDelete.isPending}
          />
        )}
        {activeBulkModal === 'assign-type' && (
          <DocTypePickerModal
            onApply={handleBulkAssignType}
            onClose={() => setActiveBulkModal(null)}
            isPending={bulkAssignType.isPending}
          />
        )}
      </AnimatePresence>

      {/* Single-item folder context menu */}
      <AnimatePresence>
        {contextMenu && (
          <FolderContextMenu
            state={contextMenu}
            onClose={() => setContextMenu(null)}
            onNewSubfolder={() => setNewSubfolderParent(contextMenu.node.id)}
            onRename={() => setEditingFolderId(contextMenu.node.id)}
            onDelete={() => setDeletingFolder(contextMenu.node)}
          />
        )}
      </AnimatePresence>

      {/* Single-folder delete modal */}
      <AnimatePresence>
        {deletingFolder && (
          <DeleteFolderModal
            folder={deletingFolder}
            onClose={() => setDeletingFolder(null)}
            onConfirm={handleDelete}
            isDeleting={deleteFolder.isPending}
          />
        )}
      </AnimatePresence>

      {/* New subfolder modal */}
      <AnimatePresence>
        {newSubfolderParent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setNewSubfolderParent(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md glass-card p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-brass-500/20 flex items-center justify-center">
                  <FolderPlus className="w-5 h-5 text-brass-400" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-slate-100">New Subfolder</h3>
                  <p className="text-sm text-slate-500">Create a folder inside the selected folder</p>
                </div>
              </div>
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="input-field w-full mb-4"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSubfolder()}
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setNewSubfolderParent(null)} className="btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleCreateSubfolder}
                  disabled={!newFolderName.trim() || createFolder.isPending}
                  className="btn-primary"
                >
                  {createFolder.isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Check className="w-4 h-4" />}
                  Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {sharingNode && (
        <ShareDialog
          nodeId={sharingNode.id}
          nodeTitle={sharingNode.title}
          nodeType="document"
          open={!!sharingNode}
          onOpenChange={(open) => !open && setSharingNode(null)}
        />
      )}
    </div>
  );
}

// Helper to find a node in a nested tree
function findNodeInTree(nodes: APITreeNode[], id: string): APITreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeInTree(node.children, id);
      if (found) return found;
    }
  }
  return null;
}
