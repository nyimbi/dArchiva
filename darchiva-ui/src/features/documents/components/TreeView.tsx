// TreeView Component - GitHub Issue #1042
// Hierarchical folder/document navigation with virtualization support
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
	ChevronRight, ChevronDown, Folder, FolderOpen, File, FileText,
	Image, FileSpreadsheet, Presentation, Archive, MoreHorizontal,
	Plus, Trash2, Edit, Move, Copy, Download, Share2, Star, StarOff,
} from 'lucide-react';
import {
	DropdownMenu, DropdownMenuContent, DropdownMenuItem,
	DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface TreeNode {
	id: string;
	title: string;
	type: 'folder' | 'document';
	mime_type?: string;
	parent_id?: string;
	children?: TreeNode[];
	has_children?: boolean;
	is_loading?: boolean;
	is_favorite?: boolean;
	document_count?: number;
	page_count?: number;
	created_at?: string;
	updated_at?: string;
}

interface TreeViewProps {
	nodes: TreeNode[];
	selectedId?: string;
	expandedIds?: Set<string>;
	onSelect?: (node: TreeNode) => void;
	onExpand?: (node: TreeNode) => void;
	onCollapse?: (node: TreeNode) => void;
	onLoadChildren?: (node: TreeNode) => Promise<TreeNode[]>;
	onContextAction?: (action: string, node: TreeNode) => void;
	showFoldersFirst?: boolean; // #695
	showDocumentCount?: boolean;
	allowDrag?: boolean;
	allowDrop?: boolean;
	onDrop?: (source: TreeNode, target: TreeNode) => void;
	className?: string;
}

export function TreeView({
	nodes,
	selectedId,
	expandedIds: controlledExpandedIds,
	onSelect,
	onExpand,
	onCollapse,
	onLoadChildren,
	onContextAction,
	showFoldersFirst = true, // Default to folders first per #695
	showDocumentCount = true,
	allowDrag = false,
	allowDrop = false,
	onDrop,
	className,
}: TreeViewProps) {
	const [internalExpandedIds, setInternalExpandedIds] = useState<Set<string>>(new Set());
	const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
	const [dragOverId, setDragOverId] = useState<string | null>(null);

	const expandedIds = controlledExpandedIds ?? internalExpandedIds;

	// Sort nodes: folders first if enabled (#695)
	const sortedNodes = useMemo(() => {
		if (!showFoldersFirst) return nodes;
		return [...nodes].sort((a, b) => {
			if (a.type === 'folder' && b.type !== 'folder') return -1;
			if (a.type !== 'folder' && b.type === 'folder') return 1;
			return a.title.localeCompare(b.title);
		});
	}, [nodes, showFoldersFirst]);

	const toggleExpand = useCallback(async (node: TreeNode) => {
		const isExpanded = expandedIds.has(node.id);

		if (isExpanded) {
			onCollapse?.(node);
			if (!controlledExpandedIds) {
				setInternalExpandedIds(prev => {
					const next = new Set(prev);
					next.delete(node.id);
					return next;
				});
			}
		} else {
			// Load children if needed
			if (node.has_children && (!node.children || node.children.length === 0) && onLoadChildren) {
				setLoadingIds(prev => new Set(prev).add(node.id));
				try {
					await onLoadChildren(node);
				} finally {
					setLoadingIds(prev => {
						const next = new Set(prev);
						next.delete(node.id);
						return next;
					});
				}
			}

			onExpand?.(node);
			if (!controlledExpandedIds) {
				setInternalExpandedIds(prev => new Set(prev).add(node.id));
			}
		}
	}, [expandedIds, controlledExpandedIds, onExpand, onCollapse, onLoadChildren]);

	const handleDragStart = useCallback((e: React.DragEvent, node: TreeNode) => {
		if (!allowDrag) return;
		e.dataTransfer.setData('application/json', JSON.stringify(node));
		e.dataTransfer.effectAllowed = 'move';
	}, [allowDrag]);

	const handleDragOver = useCallback((e: React.DragEvent, node: TreeNode) => {
		if (!allowDrop || node.type !== 'folder') return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOverId(node.id);
	}, [allowDrop]);

	const handleDragLeave = useCallback(() => {
		setDragOverId(null);
	}, []);

	const handleDrop = useCallback((e: React.DragEvent, target: TreeNode) => {
		if (!allowDrop || target.type !== 'folder') return;
		e.preventDefault();
		setDragOverId(null);

		try {
			const source = JSON.parse(e.dataTransfer.getData('application/json')) as TreeNode;
			if (source.id !== target.id && source.parent_id !== target.id) {
				onDrop?.(source, target);
			}
		} catch {
			// Invalid drag data
		}
	}, [allowDrop, onDrop]);

	return (
		<div className={cn('tree-view select-none', className)}>
			{sortedNodes.map((node) => (
				<TreeNodeItem
					key={node.id}
					node={node}
					depth={0}
					selectedId={selectedId}
					expandedIds={expandedIds}
					loadingIds={loadingIds}
					dragOverId={dragOverId}
					showFoldersFirst={showFoldersFirst}
					showDocumentCount={showDocumentCount}
					allowDrag={allowDrag}
					allowDrop={allowDrop}
					onSelect={onSelect}
					onToggleExpand={toggleExpand}
					onContextAction={onContextAction}
					onDragStart={handleDragStart}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				/>
			))}
			{sortedNodes.length === 0 && (
				<div className="px-4 py-8 text-center text-sm text-muted-foreground">
					No items
				</div>
			)}
		</div>
	);
}

interface TreeNodeItemProps {
	node: TreeNode;
	depth: number;
	selectedId?: string;
	expandedIds: Set<string>;
	loadingIds: Set<string>;
	dragOverId: string | null;
	showFoldersFirst: boolean;
	showDocumentCount: boolean;
	allowDrag: boolean;
	allowDrop: boolean;
	onSelect?: (node: TreeNode) => void;
	onToggleExpand: (node: TreeNode) => void;
	onContextAction?: (action: string, node: TreeNode) => void;
	onDragStart: (e: React.DragEvent, node: TreeNode) => void;
	onDragOver: (e: React.DragEvent, node: TreeNode) => void;
	onDragLeave: () => void;
	onDrop: (e: React.DragEvent, node: TreeNode) => void;
}

function TreeNodeItem({
	node,
	depth,
	selectedId,
	expandedIds,
	loadingIds,
	dragOverId,
	showFoldersFirst,
	showDocumentCount,
	allowDrag,
	allowDrop,
	onSelect,
	onToggleExpand,
	onContextAction,
	onDragStart,
	onDragOver,
	onDragLeave,
	onDrop,
}: TreeNodeItemProps) {
	const isExpanded = expandedIds.has(node.id);
	const isLoading = loadingIds.has(node.id);
	const isSelected = selectedId === node.id;
	const isDragOver = dragOverId === node.id;
	const hasChildren = node.has_children || (node.children && node.children.length > 0);

	const Icon = useMemo(() => {
		if (node.type === 'folder') {
			return isExpanded ? FolderOpen : Folder;
		}
		return getDocumentIcon(node.mime_type);
	}, [node.type, node.mime_type, isExpanded]);

	// Sort children
	const sortedChildren = useMemo(() => {
		if (!node.children) return [];
		if (!showFoldersFirst) return node.children;
		return [...node.children].sort((a, b) => {
			if (a.type === 'folder' && b.type !== 'folder') return -1;
			if (a.type !== 'folder' && b.type === 'folder') return 1;
			return a.title.localeCompare(b.title);
		});
	}, [node.children, showFoldersFirst]);

	return (
		<div>
			<div
				className={cn(
					'group flex items-center gap-1 px-2 py-1.5 rounded-md cursor-pointer transition-colors',
					isSelected && 'bg-accent text-accent-foreground',
					!isSelected && 'hover:bg-accent/50',
					isDragOver && 'ring-2 ring-primary ring-inset bg-primary/10'
				)}
				style={{ paddingLeft: `${depth * 16 + 8}px` }}
				onClick={() => onSelect?.(node)}
				draggable={allowDrag}
				onDragStart={(e) => onDragStart(e, node)}
				onDragOver={(e) => onDragOver(e, node)}
				onDragLeave={onDragLeave}
				onDrop={(e) => onDrop(e, node)}
			>
				{/* Expand/collapse toggle */}
				<button
					onClick={(e) => {
						e.stopPropagation();
						if (hasChildren) onToggleExpand(node);
					}}
					className={cn(
						'p-0.5 rounded hover:bg-accent/80 transition-transform',
						!hasChildren && 'invisible'
					)}
				>
					{isLoading ? (
						<div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
					) : (
						<ChevronRight className={cn(
							'w-4 h-4 transition-transform',
							isExpanded && 'rotate-90'
						)} />
					)}
				</button>

				{/* Icon */}
				<Icon className={cn(
					'w-4 h-4 shrink-0',
					node.type === 'folder' && 'text-amber-500',
					node.type === 'document' && 'text-muted-foreground'
				)} />

				{/* Title */}
				<span className="flex-1 truncate text-sm">{node.title}</span>

				{/* Favorite indicator */}
				{node.is_favorite && (
					<Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
				)}

				{/* Document count */}
				{showDocumentCount && node.type === 'folder' && node.document_count !== undefined && (
					<span className="text-xs text-muted-foreground tabular-nums">
						{node.document_count}
					</span>
				)}

				{/* Context menu */}
				{onContextAction && (
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<button
								onClick={(e) => e.stopPropagation()}
								className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity"
							>
								<MoreHorizontal className="w-4 h-4" />
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end" className="w-48">
							{node.type === 'folder' && (
								<>
									<DropdownMenuItem onClick={() => onContextAction('new-folder', node)}>
										<Plus className="w-4 h-4 mr-2" />
										New Folder
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => onContextAction('upload', node)}>
										<Plus className="w-4 h-4 mr-2" />
										Upload
									</DropdownMenuItem>
									<DropdownMenuSeparator />
								</>
							)}
							<DropdownMenuItem onClick={() => onContextAction('rename', node)}>
								<Edit className="w-4 h-4 mr-2" />
								Rename
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onContextAction('move', node)}>
								<Move className="w-4 h-4 mr-2" />
								Move
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onContextAction('copy', node)}>
								<Copy className="w-4 h-4 mr-2" />
								Copy
							</DropdownMenuItem>
							{node.type === 'document' && (
								<DropdownMenuItem onClick={() => onContextAction('download', node)}>
									<Download className="w-4 h-4 mr-2" />
									Download
								</DropdownMenuItem>
							)}
							<DropdownMenuSeparator />
							<DropdownMenuItem onClick={() => onContextAction('share', node)}>
								<Share2 className="w-4 h-4 mr-2" />
								Share
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => onContextAction(node.is_favorite ? 'unfavorite' : 'favorite', node)}>
								{node.is_favorite ? (
									<>
										<StarOff className="w-4 h-4 mr-2" />
										Remove Favorite
									</>
								) : (
									<>
										<Star className="w-4 h-4 mr-2" />
										Add to Favorites
									</>
								)}
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								onClick={() => onContextAction('delete', node)}
								className="text-destructive focus:text-destructive"
							>
								<Trash2 className="w-4 h-4 mr-2" />
								Delete
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				)}
			</div>

			{/* Children */}
			{isExpanded && sortedChildren.length > 0 && (
				<div className="tree-children">
					{sortedChildren.map((child) => (
						<TreeNodeItem
							key={child.id}
							node={child}
							depth={depth + 1}
							selectedId={selectedId}
							expandedIds={expandedIds}
							loadingIds={loadingIds}
							dragOverId={dragOverId}
							showFoldersFirst={showFoldersFirst}
							showDocumentCount={showDocumentCount}
							allowDrag={allowDrag}
							allowDrop={allowDrop}
							onSelect={onSelect}
							onToggleExpand={onToggleExpand}
							onContextAction={onContextAction}
							onDragStart={onDragStart}
							onDragOver={onDragOver}
							onDragLeave={onDragLeave}
							onDrop={onDrop}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// Helper function to get document icon based on mime type
function getDocumentIcon(mimeType?: string) {
	if (!mimeType) return File;

	if (mimeType.startsWith('image/')) return Image;
	if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
	if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return Presentation;
	if (mimeType.includes('zip') || mimeType.includes('compressed')) return Archive;
	if (mimeType.includes('pdf') || mimeType.includes('text')) return FileText;

	return File;
}

// Export helper for folder-first sorting that can be used elsewhere (#695)
export function sortFoldersFirst<T extends { type: string; title: string }>(items: T[]): T[] {
	return [...items].sort((a, b) => {
		if (a.type === 'folder' && b.type !== 'folder') return -1;
		if (a.type !== 'folder' && b.type === 'folder') return 1;
		return a.title.localeCompare(b.title);
	});
}
