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
} from 'lucide-react';
import { cn, formatBytes, formatRelativeTime, getFileIcon } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';
import type { Document, TreeNode } from '@/types';

// Mock folder tree
const mockFolderTree: TreeNode[] = [
	{
		id: 'inbox',
		name: 'Inbox',
		type: 'folder',
		children: [
			{ id: 'inbox-email', name: 'Email Imports', type: 'folder' },
			{ id: 'inbox-scan', name: 'Scanned Documents', type: 'folder' },
		],
	},
	{
		id: 'contracts',
		name: 'Contracts',
		type: 'folder',
		children: [
			{ id: 'contracts-2024', name: '2024', type: 'folder' },
			{ id: 'contracts-2023', name: '2023', type: 'folder' },
			{ id: 'contracts-templates', name: 'Templates', type: 'folder' },
		],
	},
	{
		id: 'finance',
		name: 'Finance',
		type: 'folder',
		children: [
			{ id: 'finance-invoices', name: 'Invoices', type: 'folder' },
			{ id: 'finance-reports', name: 'Reports', type: 'folder' },
		],
	},
	{
		id: 'hr',
		name: 'Human Resources',
		type: 'folder',
		children: [],
	},
	{
		id: 'archive',
		name: 'Archive',
		type: 'folder',
	},
];

// Mock documents
const mockDocuments: Document[] = [
	{ id: '1', title: 'Contract_2024_001.pdf', fileType: 'pdf', fileSize: 2456789, pageCount: 12, createdAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), parentId: 'contracts-2024', tags: ['contract', 'legal'], status: 'ready', ocrStatus: 'completed' },
	{ id: '2', title: 'Invoice_March_2024.pdf', fileType: 'pdf', fileSize: 156789, pageCount: 2, createdAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date().toISOString(), parentId: 'finance-invoices', tags: ['invoice', 'finance'], status: 'ready', ocrStatus: 'completed' },
	{ id: '3', title: 'Employee_Handbook_v3.docx', fileType: 'docx', fileSize: 4567890, pageCount: 45, createdAt: new Date(Date.now() - 259200000).toISOString(), updatedAt: new Date().toISOString(), parentId: 'hr', tags: ['hr', 'policy'], status: 'processing', ocrStatus: 'processing' },
	{ id: '4', title: 'Q1_Financial_Report.xlsx', fileType: 'xlsx', fileSize: 1234567, pageCount: 1, createdAt: new Date(Date.now() - 345600000).toISOString(), updatedAt: new Date().toISOString(), parentId: 'finance-reports', tags: ['finance', 'report'], status: 'ready', ocrStatus: 'completed' },
	{ id: '5', title: 'Product_Photos.zip', fileType: 'zip', fileSize: 45678901, pageCount: 0, createdAt: new Date(Date.now() - 432000000).toISOString(), updatedAt: new Date().toISOString(), parentId: null, tags: ['media'], status: 'ready' },
	{ id: '6', title: 'NDA_Template.pdf', fileType: 'pdf', fileSize: 234567, pageCount: 4, createdAt: new Date(Date.now() - 518400000).toISOString(), updatedAt: new Date().toISOString(), parentId: 'contracts-templates', tags: ['template', 'legal'], status: 'ready', ocrStatus: 'completed' },
];

function FolderTreeItem({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
	const { expandedFolders, toggleFolder, selectedFolderId, setSelectedFolderId } = useStore();
	const isExpanded = expandedFolders.has(node.id);
	const isSelected = selectedFolderId === node.id;
	const hasChildren = node.children && node.children.length > 0;

	return (
		<div>
			<div
				onClick={() => setSelectedFolderId(node.id)}
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
				<span className="truncate">{node.name}</span>
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

function DocumentCard({ doc }: { doc: Document }) {
	const { selectedDocuments, toggleDocumentSelection } = useStore();
	const isSelected = selectedDocuments.has(doc.id);
	const FileIcon = doc.fileType.includes('image') ? Image : doc.fileType.includes('xls') ? Table : FileText;

	return (
		<motion.div
			layout
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			className={cn(
				'doc-card cursor-pointer group',
				isSelected && 'border-brass-500 bg-brass-500/5'
			)}
			onClick={() => toggleDocumentSelection(doc.id)}
		>
			{/* Thumbnail area */}
			<div className="aspect-[4/3] bg-slate-800/50 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
				<FileIcon className="w-12 h-12 text-slate-600" />
				{doc.ocrStatus === 'processing' && (
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
					<span>{formatBytes(doc.fileSize)}</span>
					<span>•</span>
					<span>{doc.pageCount} pages</span>
				</div>
				<p className="mt-1 text-xs text-slate-600">
					{formatRelativeTime(doc.updatedAt)}
				</p>
			</div>

			{/* Tags */}
			{doc.tags.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-1">
					{doc.tags.slice(0, 2).map((tag) => (
						<span key={tag} className="badge badge-gray text-2xs">
							{tag}
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

function DocumentRow({ doc }: { doc: Document }) {
	const { selectedDocuments, toggleDocumentSelection } = useStore();
	const isSelected = selectedDocuments.has(doc.id);
	const FileIcon = doc.fileType.includes('image') ? Image : doc.fileType.includes('xls') ? Table : FileText;

	return (
		<tr
			className={cn(
				'cursor-pointer transition-colors',
				isSelected && 'bg-brass-500/10'
			)}
			onClick={() => toggleDocumentSelection(doc.id)}
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
								<span key={tag} className="badge badge-gray text-2xs">
									{tag}
								</span>
							))}
						</div>
					</div>
				</div>
			</td>
			<td className="text-slate-400">{formatBytes(doc.fileSize)}</td>
			<td className="text-slate-400">{doc.pageCount}</td>
			<td className="text-slate-400">{formatRelativeTime(doc.updatedAt)}</td>
			<td>
				<span className={cn(
					'badge',
					doc.status === 'ready' ? 'badge-green' :
					doc.status === 'processing' ? 'badge-brass' :
					'badge-gray'
				)}>
					{doc.status}
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
	const { selectedDocuments, clearSelection, selectAll } = useStore();

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
					<button className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded">
						<FolderPlus className="w-4 h-4" />
					</button>
				</div>
				<div className="flex-1 overflow-y-auto py-2">
					{mockFolderTree.map((node) => (
						<FolderTreeItem key={node.id} node={node} />
					))}
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
						<button className="btn-ghost">
							<Filter className="w-4 h-4" />
							Filter
						</button>
						<button className="btn-ghost">
							<SortAsc className="w-4 h-4" />
							Sort
						</button>
					</div>

					<div className="flex items-center gap-2">
						{selectedDocuments.size > 0 && (
							<div className="flex items-center gap-2 mr-4">
								<span className="text-sm text-slate-400">
									{selectedDocuments.size} selected
								</span>
								<button onClick={clearSelection} className="text-xs text-brass-400 hover:text-brass-300">
									Clear
								</button>
							</div>
						)}
						<button className="btn-primary">
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
					{viewMode === 'grid' ? (
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
							{mockDocuments.map((doc) => (
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
														selectAll(mockDocuments.map(d => d.id));
													} else {
														clearSelection();
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
									{mockDocuments.map((doc) => (
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
