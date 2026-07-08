// (c) Copyright Datacraft, 2026
import {
  useCreateFolder,
  useDeleteFolder,
  useFolderTree,
  useUpdateFolder,
  BatchActionsBar,
  documentKeys,
  type Document as APIDocument,
  type TreeNode as APITreeNode,
} from '@/features/documents';
import { useInfiniteDocuments } from '@/features/documents/api/infiniteDocuments';
import { ThumbnailGrid } from '@/features/documents/components/ThumbnailGrid';
import { DeleteDocumentDialog } from '@/features/documents/components/modals';
import { useAddFavorite, useFavorites, useRemoveFavorite } from '@/features/home/api/hooks';
import { ShareDialog } from '@/features/shared-nodes/components/ShareDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { apiClient } from '@/lib/api-client';
import { useStore } from '@/hooks/useStore';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  FileText,
  Filter,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  GitBranch,
  Image,
  LayoutDashboard,
  LayoutGrid,
  LayoutList,
  Loader2,
  MoreVertical,
  Pencil,
  Search,
  Share2,
  SortAsc,
  Square,
  Star,
  Table,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Context menu state
// ---------------------------------------------------------------------------
interface ContextMenuState {
  x: number;
  y: number;
  node: APITreeNode;
}

type ViewMode = 'list' | 'card' | 'thumbnail';

const VIEW_MODE_STORAGE_KEY = 'darchiva-view-mode';
const API_BASE = '/api/v1';

function getStoredViewMode(): ViewMode {
  const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  if (stored === 'list' || stored === 'thumbnail') return stored;
  if (stored === 'grid' || stored === 'card') return 'card';
  return 'card';
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function useDialogFocus(dialogRef: React.RefObject<HTMLDivElement>, isOpen = true) {
  useEffect(() => {
    if (!isOpen) return;
    const returnTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    return () => {
      if (returnTarget?.isConnected) returnTarget.focus();
    };
  }, [dialogRef, isOpen]);
}

function triggerDownload(url: string) {
  const a = document.createElement('a');
  a.href = url;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function flattenFolders(nodes: APITreeNode[], depth = 0): Array<{ id: string; title: string; depth: number }> {
  return nodes.flatMap((node) => [
    { id: node.id, title: node.title, depth },
    ...(node.children ? flattenFolders(node.children, depth + 1) : []),
  ]);
}

function MoveDocumentDialog({
  open,
  document,
  folders,
  selectedFolderId,
  onSelectedFolderIdChange,
  onMove,
  onClose,
  isMoving,
  isLoadingFolders,
}: {
  open: boolean;
  document: APIDocument | null;
  folders: APITreeNode[];
  selectedFolderId: string;
  onSelectedFolderIdChange: (folderId: string) => void;
  onMove: () => void;
  onClose: () => void;
  isMoving: boolean;
  isLoadingFolders: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, open);

  if (!open || !document) return null;

  const folderOptions = flattenFolders(folders);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="move-document-title"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brass-500/20 flex items-center justify-center">
            <FolderInput className="w-5 h-5 text-brass-400" />
          </div>
          <div>
            <h3 id="move-document-title" className="font-display font-semibold text-slate-100">Move Document</h3>
            <p className="text-sm text-slate-400">Choose a destination folder</p>
          </div>
        </div>
        <p className="text-sm text-slate-300 mb-4">
          Move <span className="font-semibold text-brass-400">"{document.title}"</span>
        </p>
        <label htmlFor="document-move-folder" className="sr-only">Destination folder</label>
        <select
          id="document-move-folder"
          value={selectedFolderId}
          onChange={(event) => onSelectedFolderIdChange(event.target.value)}
          disabled={isMoving || isLoadingFolders}
          className="input-field w-full mb-5"
        >
          <option value="">Home</option>
          {folderOptions.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {`${'  '.repeat(folder.depth)}${folder.title}`}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={isMoving} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onMove} disabled={isMoving || isLoadingFolders} className="btn-primary">
            {isMoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderInput className="w-4 h-4" />}
            Move
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function CopyDocumentDialog({
  open,
  document,
  onCopy,
  onClose,
  isCopying,
}: {
  open: boolean;
  document: APIDocument | null;
  onCopy: () => void;
  onClose: () => void;
  isCopying: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef, open);

  if (!open || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-document-title"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative z-10 w-full max-w-md glass-card p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-brass-500/20 flex items-center justify-center">
            <Copy className="w-5 h-5 text-brass-400" />
          </div>
          <div>
            <h3 id="copy-document-title" className="font-display font-semibold text-slate-100">Copy Document</h3>
            <p className="text-sm text-slate-400">Create a duplicate document</p>
          </div>
        </div>
        <p className="text-slate-300 mb-6">
          Create a copy of <span className="font-semibold text-brass-400">"{document.title}"</span>?
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={isCopying} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onCopy} disabled={isCopying} className="btn-primary">
            {isCopying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            Copy
          </button>
        </div>
      </motion.div>
    </div>
  );
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
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(dialogRef);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-folder-title"
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
            <h3 id="delete-folder-title" className="font-display font-semibold text-slate-100">Delete Folder</h3>
            <p className="text-sm text-slate-400">This action cannot be undone</p>
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
        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-brass-500/20 hover:text-brass-400 flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
      >
        <FolderPlus className="w-4 h-4" />
        New Subfolder
      </button>
      <button
        onClick={() => { onRename(); onClose(); }}
        className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-brass-500/20 hover:text-brass-400 flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
      >
        <Pencil className="w-4 h-4" />
        Rename
      </button>
      <div className="my-1 border-t border-slate-700" />
      <button
        onClick={() => { onDelete(); onClose(); }}
        className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
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
            className="p-0.5 hover:bg-slate-700/50 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${node.title}`}
            aria-expanded={isExpanded}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        ) : (
          <div className="w-4" />
        )}

        {isExpanded || isSelected ? (
          <FolderOpen className="w-4 h-4 text-brass-400 flex-shrink-0" />
        ) : (
          <Folder className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}

        {isEditing ? (
          <>
            <label htmlFor={`folder-name-${node.id}`} className="sr-only">
              Rename {node.title}
            </label>
            <input
              id={`folder-name-${node.id}`}
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => onFinishEdit(node.id, editValue)}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 bg-slate-800 border border-brass-500/50 rounded px-1.5 py-0.5 text-sm text-slate-200 focus:outline-none focus:border-brass-400 focus-visible:ring-2 focus-visible:ring-brass-500"
            />
          </>
        ) : (
          <span className="truncate flex-1">{node.title}</span>
        )}

        {!isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onContextMenu(e, node); }}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-slate-700/50 rounded transition-opacity focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            aria-label={`Open options for ${node.title}`}
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
  onDownload,
  onMove,
  onCopy,
  onDelete,
  onViewVersions,
  selectionMode,
  isFavorited,
  toggleFavorite,
}: {
  doc: APIDocument;
  onShare: (doc: APIDocument) => void;
  onOpen: (doc: APIDocument) => void;
  onDownload: (doc: APIDocument) => void;
  onMove: (doc: APIDocument) => void;
  onCopy: (doc: APIDocument) => void;
  onDelete: (doc: APIDocument) => void;
  onViewVersions: (doc: APIDocument) => void;
  selectionMode: boolean;
  isFavorited: (docId: string) => unknown;
  toggleFavorite: (e: React.MouseEvent, doc: { id: string; title: string }) => void;
}) {
  const { selectedNodeIds, toggleNodeSelection } = useStore();
  const isSelected = selectedNodeIds.has(doc.id);
  const favorited = isFavorited(doc.id);
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
        <FileIcon className="w-12 h-12 text-slate-400" />
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
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
          <span>{doc.file_size ? formatBytes(doc.file_size) : '—'}</span>
          <span>•</span>
          <span>{doc.page_count || 0} pages</span>
        </div>
        <p className="mt-1 text-xs text-slate-400">{formatRelativeTime(doc.updated_at)}</p>
      </div>
      {doc.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {doc.tags.slice(0, 2).map((tag) => (
            <span key={tag.id} className="badge badge-gray text-2xs">{tag.name}</span>
          ))}
          {doc.tags.length > 2 && (
            <span className="text-2xs text-slate-400" aria-label={`${doc.tags.length - 2} more tags`}>+{doc.tags.length - 2}</span>
          )}
        </div>
      )}
      {!selectionMode && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
          <button
            onClick={(e) => toggleFavorite(e, { id: doc.id, title: doc.title })}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            className={cn(
              'p-1 rounded transition-colors opacity-0 group-hover:opacity-100',
              favorited ? 'opacity-100 text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-slate-400'
            )}
          >
            <Star className={cn('w-3.5 h-3.5', favorited ? 'fill-current' : '')} />
          </button>
          <button
            className="p-1.5 rounded-lg bg-slate-900/90 text-slate-400 hover:text-brass-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            onClick={(e) => { e.stopPropagation(); onShare(doc); }}
            aria-label={`Share ${doc.title}`}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-lg bg-slate-900/90 text-slate-400 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
                onClick={(e) => e.stopPropagation()}
                aria-label={`Open options for ${doc.title}`}
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="border-slate-800 bg-slate-900 text-slate-100">
              <DropdownMenuItem onSelect={() => onOpen(doc)}>
                <FileText className="mr-2 h-4 w-4" />
                Open
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onDownload(doc)}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onMove(doc)}>
                <FolderInput className="mr-2 h-4 w-4" />
                Move
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onCopy(doc)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onViewVersions(doc)}>
                <GitBranch className="mr-2 h-4 w-4" />
                View versions
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-800" />
              <DropdownMenuItem onSelect={() => onDelete(doc)} className="text-red-300 focus:text-red-200">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
  onViewVersions,
  isFavorited,
  toggleFavorite,
}: {
  doc: APIDocument;
  onShare: (doc: APIDocument) => void;
  onOpen: (doc: APIDocument) => void;
  onViewVersions: (doc: APIDocument) => void;
  isFavorited: (docId: string) => unknown;
  toggleFavorite: (e: React.MouseEvent, doc: { id: string; title: string }) => void;
}) {
  const { selectedNodeIds, toggleNodeSelection } = useStore();
  const isSelected = selectedNodeIds.has(doc.id);
  const favorited = isFavorited(doc.id);
  const FileIcon = doc.title.toLowerCase().includes('image') ? Image
    : doc.title.toLowerCase().match(/\.xlsx?$/) ? Table
    : FileText;
  const statusLabel = doc.ocr_status === 'completed' ? 'ready' : doc.ocr_status || 'pending';

  return (
    <tr
      className={cn('group cursor-pointer transition-colors', isSelected && 'bg-brass-500/10')}
      onClick={() => toggleNodeSelection(doc.id)}
      onDoubleClick={() => onOpen(doc)}
    >
      <td className="w-10">
        <label htmlFor={`select-document-${doc.id}`} className="sr-only">
          Select {doc.title}
        </label>
        <input
          id={`select-document-${doc.id}`}
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
            <FileIcon className="w-4 h-4 text-slate-400" />
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
        )}
        aria-label={`OCR status: ${statusLabel}`}>
          {statusLabel}
        </span>
      </td>
      <td>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => toggleFavorite(e, { id: doc.id, title: doc.title })}
            aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
            className={cn(
              'p-1 rounded transition-colors opacity-0 group-hover:opacity-100',
              favorited ? 'opacity-100 text-amber-400 hover:text-amber-300' : 'text-slate-600 hover:text-slate-400'
            )}
          >
            <Star className={cn('w-3.5 h-3.5', favorited ? 'fill-current' : '')} />
          </button>
          <button
            className="p-1.5 text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            onClick={(e) => { e.stopPropagation(); onShare(doc); }}
            aria-label={`Share ${doc.title}`}
          >
            <Share2 className="w-4 h-4" />
          </button>
          <button
            className="p-1.5 text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            onClick={(e) => { e.stopPropagation(); onViewVersions(doc); }}
            aria-label={`View versions for ${doc.title}`}
          >
            <GitBranch className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

// ---------------------------------------------------------------------------
// Main Documents page
// ---------------------------------------------------------------------------
export function Documents() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>(getStoredViewMode);
  const [selectionMode, setSelectionMode] = useState(false);
  const { data: favorites = [] } = useFavorites();
  const addFavorite = useAddFavorite();
  const removeFavorite = useRemoveFavorite();

  const {
    selectedNodeIds,
    clearNodeSelection,
    selectNodes,
    toggleNodeSelection,
    currentFolderId,
    setCurrentFolderId,
    openModal,
    sortBy,
    sortOrder,
    searchFilters,
  } = useStore();
  const navigate = useNavigate();
  const [folderSearch, setFolderSearch] = useState('');
  const [movingDocument, setMovingDocument] = useState<APIDocument | null>(null);
  const [copyingDocument, setCopyingDocument] = useState<APIDocument | null>(null);
  const [deletingDocument, setDeletingDocument] = useState<APIDocument | null>(null);
  const [selectedMoveFolderId, setSelectedMoveFolderId] = useState('');

  const { data: folderTree, isLoading: treeLoading, isError: treeError } = useFolderTree();
  const documentQueryFilters = useMemo(() => {
    const filters: Record<string, unknown> = {
      sort_by: sortBy === 'size' ? 'file_size' : sortBy,
      sort_direction: sortOrder,
    };

    if (searchFilters.documentTypes.length > 0) {
      filters.document_types = searchFilters.documentTypes.join(',');
    }
    if (searchFilters.tags.length > 0) {
      filters.tags = searchFilters.tags.join(',');
    }
    if (searchFilters.dateRange.start) {
      filters.date_from = searchFilters.dateRange.start;
    }
    if (searchFilters.dateRange.end) {
      filters.date_to = searchFilters.dateRange.end;
    }
    if (searchFilters.owner) {
      filters.owner = searchFilters.owner;
    }

    return filters;
  }, [searchFilters, sortBy, sortOrder]);
  const {
    documents: infiniteDocs,
    isLoading: docsLoading,
    isError: docsError,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteDocuments(currentFolderId || undefined, folderSearch || undefined, documentQueryFilters, sortBy, sortOrder);

  const handleOpenDocument = useCallback((doc: APIDocument) => {
    navigate(`/document/${doc.id}`);
  }, [navigate]);

  const handleViewVersions = useCallback((doc: APIDocument) => {
    navigate(`/document/${doc.id}?tab=versions`);
  }, [navigate]);

  const handleDownloadDocument = useCallback((doc: APIDocument) => {
    triggerDownload(`${API_BASE}/documents/${doc.id}/download`);
  }, []);

  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();

  const moveDocumentMutation = useMutation({
    mutationFn: async ({ documentId, folderId }: { documentId: string; folderId: string | null }) => {
      const { data } = await apiClient.patch<APIDocument>(`/documents/${documentId}`, { folder_id: folderId });
      return data;
    },
    onSuccess: async () => {
      setMovingDocument(null);
      setSelectedMoveFolderId('');
      await queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });

  const copyDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const { data } = await apiClient.post<APIDocument>(`/documents/${documentId}/copy`);
      return data;
    },
    onSuccess: async () => {
      setCopyingDocument(null);
      await queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (documentId: string) => {
      await apiClient.delete(`/documents/${documentId}`);
    },
    onSuccess: async () => {
      setDeletingDocument(null);
      await queryClient.invalidateQueries({ queryKey: documentKeys.all });
    },
  });

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode === 'card' ? 'grid' : mode);
  }, []);

  const documents = infiniteDocs as APIDocument[];
  const [sharingNode, setSharingNode] = useState<APIDocument | null>(null);

  const isFavorited = (docId: string) => favorites.find(f => f.item_id === docId && f.item_type === 'document');
  const toggleFavorite = (e: React.MouseEvent, doc: { id: string; title: string }) => {
    e.stopPropagation();
    const fav = isFavorited(doc.id);
    if (fav) {
      removeFavorite.mutate(fav.id);
    } else {
      addFavorite.mutate({ item_type: 'document', item_id: doc.id, title: doc.title });
    }
  };

  // Folder tree UI state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [deletingFolder, setDeletingFolder] = useState<APITreeNode | null>(null);
  const [newSubfolderParent, setNewSubfolderParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const newSubfolderDialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus(newSubfolderDialogRef, !!newSubfolderParent);

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

  // Breadcrumb path from tree root to current folder
  const breadcrumb = useMemo(() => {
    if (!currentFolderId || !folderTree?.length) return [];
    return buildBreadcrumb(folderTree, currentFolderId);
  }, [currentFolderId, folderTree]);

  // Selected ids passed to BatchActionsBar
  const selectedIds = Array.from(selectedNodeIds);

  return (
    <div className="flex flex-col gap-4 min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] lg:flex-row lg:gap-6">
      {/* Folder tree sidebar */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full flex-shrink-0 glass-card flex flex-col lg:w-64"
      >
        <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="font-display font-semibold text-slate-200">Folders</h2>
          <button
            onClick={() => openModal('create-folder')}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500"
            title="New Folder"
            aria-label="New folder"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-64 flex-1 overflow-y-auto py-2 lg:max-h-none">
          {treeLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            </div>
          ) : treeError ? (
            <div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Failed to load folders. Check your connection and try refreshing.
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
            <p className="text-sm text-slate-400 text-center py-8">No folders</p>
          )}
        </div>
        <div className="p-2 border-t border-slate-700/50 text-xs text-slate-400">
          Right-click for options
        </div>
      </motion.div>

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="min-w-0 flex-1 flex flex-col"
      >
        {/* Breadcrumb */}
        {breadcrumb.length > 0 && (
          <nav className="flex items-center gap-1 text-sm mb-3 flex-wrap" aria-label="Folder breadcrumb">
            <button
              onClick={() => setCurrentFolderId(null)}
              className="text-slate-400 hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded"
            >
              Home
            </button>
            {breadcrumb.map((node, i) => (
              <span key={node.id} className="flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <button
                  onClick={() => setCurrentFolderId(node.id)}
                  disabled={i === breadcrumb.length - 1}
                  className={cn(
                    'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded',
                    i === breadcrumb.length - 1
                      ? 'text-slate-200 font-medium cursor-default'
                      : 'text-slate-400 hover:text-slate-200',
                  )}
                >
                  {node.title}
                </button>
              </span>
            ))}
          </nav>
        )}

        {/* Toolbar */}
        <div className="flex flex-col gap-3 mb-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <label htmlFor="folder-search" className="sr-only">
                Search in folder
              </label>
              <input
                id="folder-search"
                type="text"
                placeholder="Search in folder..."
                className="input-field pl-9 w-full sm:w-64"
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
              />
            </div>
            <button onClick={() => openModal('filter-documents')} className="btn-ghost">
              <Filter className="w-4 h-4" /> Filter
            </button>
            <button onClick={() => openModal('sort-documents')} className="btn-ghost">
              <SortAsc className="w-4 h-4" /> Sort
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {/* Selection mode badge when not in selection mode but items are selected */}
            {selectedNodeIds.size > 0 && !selectionMode && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-sm text-slate-400">{selectedNodeIds.size} selected</span>
                <button onClick={clearNodeSelection} className="text-xs text-brass-400 hover:text-brass-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500 rounded">
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
              aria-pressed={selectionMode}
            >
              {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              <span className="text-sm">Select</span>
            </button>
            <button onClick={() => openModal('upload')} className="btn-primary">
              <Upload className="w-4 h-4" /> Upload
            </button>
            <div className="flex border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => handleSetViewMode('list')}
                className={cn('p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500', viewMode === 'list' ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:text-slate-300')}
                title="List view"
                aria-label="List view"
                aria-pressed={viewMode === 'list'}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetViewMode('card')}
                className={cn('p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500', viewMode === 'card' ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:text-slate-300')}
                title="Grid view"
                aria-label="Grid view"
                aria-pressed={viewMode === 'card'}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleSetViewMode('thumbnail')}
                className={cn('p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500', viewMode === 'thumbnail' ? 'bg-slate-700 text-slate-200' : 'text-slate-400 hover:text-slate-300')}
                title="Thumbnail view"
                aria-label="Thumbnail view"
                aria-pressed={viewMode === 'thumbnail'}
              >
                <LayoutDashboard className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Select-all row when in selection mode */}
        {selectionMode && documents.length > 0 && (
          <div className="flex items-center gap-3 mb-2 px-1">
            <input
              id="select-all-documents"
              type="checkbox"
              checked={documents.every((d) => selectedNodeIds.has(d.id))}
              onChange={(e) =>
                e.target.checked ? selectNodes(documents.map((d) => d.id)) : clearNodeSelection()
              }
              className="rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500/50 focus-visible:ring-2 focus-visible:ring-brass-500"
            />
            <label htmlFor="select-all-documents" className="text-sm text-slate-400">Select all ({documents.length})</label>
          </div>
        )}

        {/* Documents area */}
        <div className="flex-1 overflow-y-auto">
          {docsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : docsError ? (
            <div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Failed to load documents. Check your connection and try refreshing.
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <FileText className="w-12 h-12 mb-4" />
              <p>No documents in this folder</p>
            </div>
          ) : viewMode === 'thumbnail' ? (
            <ThumbnailGrid
              documents={documents.map((d) => ({
                id: d.id,
                title: d.title,
                pageCount: d.page_count,
                updatedAt: d.updated_at,
                tags: d.tags,
              }))}
              selectedIds={selectedNodeIds}
              onToggleSelect={toggleNodeSelection}
              isSelectMode={selectionMode}
            />
          ) : viewMode === 'card' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    doc={doc}
                    onShare={setSharingNode}
                    onOpen={handleOpenDocument}
                    onDownload={handleDownloadDocument}
                    onMove={setMovingDocument}
                    onCopy={setCopyingDocument}
                    onDelete={setDeletingDocument}
                    onViewVersions={handleViewVersions}
                    selectionMode={selectionMode}
                    isFavorited={isFavorited}
                    toggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
              {(hasNextPage || isFetchingNextPage) && (
                <div className="flex justify-center py-4">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                    className="btn-secondary"
                  >
                    {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Load more
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="glass-card overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-700/50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Select</th>
                      <th className="px-3 py-2">Document</th>
                      <th className="px-3 py-2">Size</th>
                      <th className="px-3 py-2">Pages</th>
                      <th className="px-3 py-2">Modified</th>
                      <th className="px-3 py-2">OCR</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <DocumentRow
                        key={doc.id}
                        doc={doc}
                        onShare={setSharingNode}
                        onOpen={handleOpenDocument}
                        onViewVersions={handleViewVersions}
                        isFavorited={isFavorited}
                        toggleFavorite={toggleFavorite}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {(hasNextPage || isFetchingNextPage) && (
                <div className="flex justify-center py-4">
                  <button
                    type="button"
                    onClick={() => fetchNextPage()}
                    disabled={!hasNextPage || isFetchingNextPage}
                    className="btn-secondary"
                  >
                    {isFetchingNextPage ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Load more
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Batch actions bar — replaces the old BulkActionBar + individual modals */}
      <BatchActionsBar
        selectedIds={selectedIds}
        selectedDocuments={documents
          .filter((d) => selectedNodeIds.has(d.id))
          .map((d) => ({ id: d.id, title: d.title, page_count: d.page_count }))}
        onClear={() => { clearNodeSelection(); setSelectionMode(false); }}
        onComplete={() => { clearNodeSelection(); setSelectionMode(false); }}
      />

      <MoveDocumentDialog
        open={!!movingDocument}
        document={movingDocument}
        folders={folderTree ?? []}
        selectedFolderId={selectedMoveFolderId}
        onSelectedFolderIdChange={setSelectedMoveFolderId}
        onMove={() => {
          if (movingDocument) {
            moveDocumentMutation.mutate({
              documentId: movingDocument.id,
              folderId: selectedMoveFolderId || null,
            });
          }
        }}
        onClose={() => setMovingDocument(null)}
        isMoving={moveDocumentMutation.isPending}
        isLoadingFolders={treeLoading}
      />

      <CopyDocumentDialog
        open={!!copyingDocument}
        document={copyingDocument}
        onCopy={() => {
          if (copyingDocument) copyDocumentMutation.mutate(copyingDocument.id);
        }}
        onClose={() => setCopyingDocument(null)}
        isCopying={copyDocumentMutation.isPending}
      />

      <DeleteDocumentDialog
        open={!!deletingDocument}
        document={deletingDocument ? {
          id: deletingDocument.id,
          title: deletingDocument.title,
          pageCount: deletingDocument.page_count,
        } : null}
        onDelete={async () => {
          if (deletingDocument) await deleteDocumentMutation.mutateAsync(deletingDocument.id);
        }}
        onClose={() => setDeletingDocument(null)}
      />

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
              ref={newSubfolderDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="new-subfolder-title"
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
                  <h3 id="new-subfolder-title" className="font-display font-semibold text-slate-100">New Subfolder</h3>
                  <p className="text-sm text-slate-400">Create a folder inside the selected folder</p>
                </div>
              </div>
              <label htmlFor="new-subfolder-name" className="sr-only">
                Folder name
              </label>
              <input
                id="new-subfolder-name"
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

// Build ordered path from tree root to a target node
function buildBreadcrumb(nodes: APITreeNode[], targetId: string): APITreeNode[] {
  for (const node of nodes) {
    if (node.id === targetId) return [node];
    if (node.children?.length) {
      const sub = buildBreadcrumb(node.children, targetId);
      if (sub.length) return [node, ...sub];
    }
  }
  return [];
}
