// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	ChevronRight,
	ChevronDown,
	Folder,
	FolderOpen,
	FileText,
	Image,
	Table,
	MoreVertical,
	Grid,
	List,
	Upload,
	FolderPlus,
	Search,
	Filter,
	SortAsc,
	Eye,
	Download,
	Trash2,
	GitBranch,
	Loader2,
} from 'lucide-react';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';
import { useFolderTree, useDocuments, type TreeNode as APITreeNode, type Document as APIDocument } from '@/features/documents';

function FolderTreeItem({ node, depth = 0 }: { node: APITreeNode; depth?: number }) {
	const { expandedFolders, toggleFolder, currentFolderId, setCurrentFolderId } = useStore();
	const isExpanded = expandedFolders.has(node.id);
	const isSelected = currentFolderId === node.id;
	const hasChildren = node.children && node.children.length > 0;

	return (
		<div>
			<div
				onClick={() => setCurrentFolderId(node.id)}
				className={cn(
					'tree-node',
					isSelected && 'selected',
				)}
				style={{ paddingLeft: `${depth * 12 + 8}px` }}
			>
				{hasChildren && (
					<button
						onClick={(e) => {
							e.stopPropagation();
							toggleFolder(node.id);
						}}
						className="p-0.5 hover:bg-slate-700/50 rounded"
					>
						{isExpanded ? (
							<ChevronDown className="w-3 h-3" />
						) : (
							<ChevronRight className="w-3 h-3" />
						)}
					</button>
				)}
				{!hasChildren && <div className="w-4" />}
				{isExpanded ? (
					<FolderOpen className="w-4 h-4 text-brass-400" />
				) : (
					<Folder className="w-4 h-4 text-slate-500" />
				)}
				<span className="truncate">{node.title}</span>
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
							<FolderTreeItem key={child.id} node={child} depth={depth + 1} />
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

function DocumentCard({ doc }: { doc: APIDocument }) {
	const { selectedNodeIds, toggleNodeSelection } = useStore();
	const isSelected = selectedNodeIds.has(doc.id);
	const FileIcon = doc.title.includes('image') ? Image : doc.title.includes('xls') ? Table : FileText;

	return (
		<motion.div
			layout
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			className={cn(
				'doc-card cursor-pointer group',
				isSelected && 'border-brass-500 bg-brass-500/5'
			)}
			onClick={() => toggleNodeSelection(doc.id)}
		>
			{/* Thumbnail area */}
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

			{/* Info */}
			<div>
				<h3 className="text-sm font-medium text-slate-200 truncate group-hover:text-brass-400 transition-colors">
					{doc.title}
				</h3>
				<div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
					<span>{doc.file_size ? formatBytes(doc.file_size) : '—'}</span>
					<span>•</span>
					<span>{doc.page_count || 0} pages</span>
				</div>
				<p className="mt-1 text-xs text-slate-600">
					{formatRelativeTime(doc.updated_at)}
				</p>
			</div>

			{/* Tags */}
			{doc.tags.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-1">
					{doc.tags.slice(0, 2).map((tag) => (
						<span key={tag.id} className="badge badge-gray text-2xs">
							{tag.name}
						</span>
					))}
					{doc.tags.length > 2 && (
						<span className="text-2xs text-slate-500">+{doc.tags.length - 2}</span>
					)}
				</div>
			)}

			{/* Actions overlay */}
			<div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
				<button className="p-1.5 rounded-lg bg-slate-900/90 text-slate-400 hover:text-slate-200">
					<MoreVertical className="w-4 h-4" />
				</button>
			</div>
		</motion.div>
	);
}

function DocumentRow({ doc }: { doc: APIDocument }) {
	const { selectedNodeIds, toggleNodeSelection } = useStore();
	const isSelected = selectedNodeIds.has(doc.id);
	const FileIcon = doc.title.includes('image') ? Image : doc.title.includes('xls') ? Table : FileText;

	const statusLabel = doc.ocr_status === 'completed' ? 'ready' : doc.ocr_status || 'pending';

	return (
		<tr
			className={cn(
				'cursor-pointer transition-colors',
				isSelected && 'bg-brass-500/10'
			)}
			onClick={() => toggleNodeSelection(doc.id)}
		>
			<td className="w-10">
				<input
					type="checkbox"
					checked={isSelected}
					onChange={() => {}}
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
								<span key={tag.id} className="badge badge-gray text-2xs">
									{tag.name}
								</span>
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
					statusLabel === 'ready' ? 'badge-green' :
					statusLabel === 'processing' ? 'badge-brass' :
					'badge-gray'
				)}>
					{statusLabel}
				</span>
			</td>
			<td>
				<div className="flex items-center gap-1">
					<button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded">
						<Eye className="w-4 h-4" />
					</button>
					<button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded">
						<Download className="w-4 h-4" />
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

	const { data: folderTree, isLoading: treeLoading } = useFolderTree();
	const { data: documentsData, isLoading: docsLoading } = useDocuments(currentFolderId || undefined);

	const documents = documentsData?.items.filter(d => d.ctype === 'document') || [];

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
						folderTree.map((node) => (
							<FolderTreeItem key={node.id} node={node} />
						))
					) : (
						<p className="text-sm text-slate-500 text-center py-8">No folders</p>
					)}
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
							<input
								type="text"
								placeholder="Search in folder..."
								className="input-field pl-9 w-64"
							/>
						</div>
						<button
							onClick={() => openModal('filter-documents')}
							className="btn-ghost"
						>
							<Filter className="w-4 h-4" />
							Filter
						</button>
						<button
							onClick={() => openModal('sort-documents')}
							className="btn-ghost"
						>
							<SortAsc className="w-4 h-4" />
							Sort
						</button>
					</div>

					<div className="flex items-center gap-2">
						{selectedNodeIds.size > 0 && (
							<div className="flex items-center gap-2 mr-4">
								<span className="text-sm text-slate-400">
									{selectedNodeIds.size} selected
								</span>
								<button onClick={clearNodeSelection} className="text-xs text-brass-400 hover:text-brass-300">
									Clear
								</button>
							</div>
						)}
						<button
							onClick={() => openModal('upload')}
							className="btn-primary"
						>
							<Upload className="w-4 h-4" />
							Upload
						</button>
						<div className="flex border border-slate-700 rounded-lg overflow-hidden">
							<button
								onClick={() => setViewMode('grid')}
								className={cn(
									'p-2 transition-colors',
									viewMode === 'grid' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
								)}
							>
								<Grid className="w-4 h-4" />
							</button>
							<button
								onClick={() => setViewMode('list')}
								className={cn(
									'p-2 transition-colors',
									viewMode === 'list' ? 'bg-slate-700 text-slate-200' : 'text-slate-500 hover:text-slate-300'
								)}
							>
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
								<DocumentCard key={doc.id} doc={doc} />
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
												onChange={(e) => {
													if (e.target.checked) {
														selectNodes(documents.map(d => d.id));
													} else {
														clearNodeSelection();
													}
												}}
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
										<DocumentRow key={doc.id} doc={doc} />
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</motion.div>
		</div>
	);
}
