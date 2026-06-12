// (c) Copyright Datacraft, 2026
import {
  useCreateFolder,
  useDeleteFolder,
  useDocuments,
  useFolderTree,
  useUpdateFolder,
  type Document as APIDocument,
  type TreeNode as APITreeNode,
} from '@/features/documents';
import { ShareDialog } from '@/features/shared-nodes/components/ShareDialog';
import { useStore } from '@/hooks/useStore';
import { cn,formatBytes,formatRelativeTime } from '@/lib/utils';
import { AnimatePresence,motion } from 'framer-motion';
import {
  AlertTriangle,
  Check,
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
  Table,
  Trash2,
  Upload
} from 'lucide-react';
import { useCallback,useEffect,useRef,useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Context menu state
interface ContextMenuState {
	x: number;
	y: number;
	node: APITreeNode;
}

// Delete confirmation modal
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
					Are you sure you want to delete <span className="font-semibold text-brass-400">"{folder.title}"</span>?
					All contents will be permanently removed.
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

// Context menu component
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

// Enhanced folder tree item
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

function DocumentCard({ doc, onShare, onOpen }: { doc: APIDocument; onShare: (doc: APIDocument) => void; onOpen: (doc: APIDocument) => void }) {
	const { selectedNodeIds, toggleNodeSelection } = useStore();
	const isSelected = selectedNodeIds.has(doc.id);
	const FileIcon = doc.title.includes('image') ? Image : doc.title.includes('xls') ? Table : FileText;

	return (
		<motion.div
			layout
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			className={cn('doc-card cursor-pointer group', isSelected && 'border-brass-500 bg-brass-500/5')}
			onClick={() => toggleNodeSelection(doc.id)}
			onDoubleClick={() => onOpen(doc)}
		>
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
					{doc.tags.length > 2 && <span className="text-2xs text-slate-500">+{doc.tags.length - 2}</span>}
				</div>
			)}
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
		</motion.div>
	);
}

function DocumentRow({ doc, onShare, onOpen }: { doc: APIDocument; onShare: (doc: APIDocument) => void; onOpen: (doc: APIDocument) => void }) {
	const { selectedNodeIds, toggleNodeSelection } = useStore();
	const isSelected = selectedNodeIds.has(doc.id);
	const FileIcon = doc.title.includes('image') ? Image : doc.title.includes('xls') ? Table : FileText;
	const statusLabel = doc.ocr_status === 'completed' ? 'ready' : doc.ocr_status || 'pending';

	return (
		<tr className={cn('cursor-pointer transition-colors', isSelected && 'bg-brass-500/10')} onClick={() => toggleNodeSelection(doc.id)} onDoubleClick={() => onOpen(doc)}>
			<td className="w-10">
				<input type="checkbox" checked={isSelected} onChange={() => {}} className="rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500/50" />
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
				<span className={cn('badge', statusLabel === 'ready' ? 'badge-green' : statusLabel === 'processing' ? 'badge-brass' : 'badge-gray')}>
					{statusLabel}
				</span>
			</td>
			<td>
				<div className="flex items-center gap-1">
					<button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded" onClick={(e) => { e.stopPropagation(); onShare(doc); }}>
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

export function Documents() {
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const { selectedNodeIds, clearNodeSelection, selectNodes, currentFolderId, openModal } = useStore();
	const navigate = useNavigate();

	const { data: folderTree, isLoading: treeLoading } = useFolderTree();
	const { data: documentsData, isLoading: docsLoading } = useDocuments(currentFolderId || undefined);

	// Open document in detail view
	const handleOpenDocument = useCallback((doc: APIDocument) => {
		navigate(`/document/${doc.id}`);
	}, [navigate]);

	const createFolder = useCreateFolder();
	const updateFolder = useUpdateFolder();
	const deleteFolder = useDeleteFolder();

	const documents = documentsData?.items.filter((d) => d.ctype === 'document') || [];
	const [sharingNode, setSharingNode] = useState<APIDocument | null>(null);

	// Context menu state
	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
	const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
	const [deletingFolder, setDeletingFolder] = useState<APITreeNode | null>(null);
	const [newSubfolderParent, setNewSubfolderParent] = useState<string | null>(null);
	const [newFolderName, setNewFolderName] = useState('');

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
				{ onSuccess: () => { setNewSubfolderParent(null); setNewFolderName(''); } }
			);
		}
	}, [newSubfolderParent, newFolderName, createFolder]);

	return (
		<div className="flex gap-6 h-[calc(100vh-8rem)]">
			{/* Folder tree sidebar */}
			<motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="w-64 flex-shrink-0 glass-card flex flex-col">
				<div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
					<h2 className="font-display font-semibold text-slate-200">Folders</h2>
					<button onClick={() => openModal('create-folder')} className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded" title="New Folder">
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
			<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex-1 flex flex-col">
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
						{selectedNodeIds.size > 0 && (
							<div className="flex items-center gap-2 mr-4">
								<span className="text-sm text-slate-400">{selectedNodeIds.size} selected</span>
								<button onClick={clearNodeSelection} className="text-xs text-brass-400 hover:text-brass-300">Clear</button>
							</div>
						)}
						<button onClick={() => openModal('upload')} className="btn-primary">
							<Upload className="w-4 h-4" /> Upload
						</button>
						<div className="flex border border-slate-700 rounded-lg overflow-hidden">
							<button onClick={() => setViewMode('grid')} className={cn('p-2 transition-colors', viewMode === 'grid' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300')}>
								<Grid className="w-4 h-4" />
							</button>
							<button onClick={() => setViewMode('list')} className={cn('p-2 transition-colors', viewMode === 'list' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300')}>
								<List className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>

				{/* Documents */}
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
								<DocumentCard key={doc.id} doc={doc} onShare={setSharingNode} onOpen={handleOpenDocument} />
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
												onChange={(e) => e.target.checked ? selectNodes(documents.map((d) => d.id)) : clearNodeSelection()}
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

			{/* Context Menu */}
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

			{/* Delete Confirmation Modal */}
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

			{/* New Subfolder Modal */}
			<AnimatePresence>
				{newSubfolderParent && (
					<div className="fixed inset-0 z-50 flex items-center justify-center">
						<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setNewSubfolderParent(null)} />
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
								<button onClick={() => setNewSubfolderParent(null)} className="btn-secondary">Cancel</button>
								<button onClick={handleCreateSubfolder} disabled={!newFolderName.trim() || createFolder.isPending} className="btn-primary">
									{createFolder.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
									Create
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>

			{sharingNode && (
				<ShareDialog nodeId={sharingNode.id} nodeTitle={sharingNode.title} nodeType="document" open={!!sharingNode} onOpenChange={(open) => !open && setSharingNode(null)} />
			)}
		</div>
	);
}

// Helper to find node in nested tree
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
