// (c) Copyright Datacraft, 2026
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
	Folder,
	FileText,
	Grid,
	List,
	Upload,
	FolderPlus,
	ChevronRight,
	MoreHorizontal,
	ArrowUp,
} from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';
import type { NodeItem } from '@/types';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface CommanderProps {
	nodes?: NodeItem[];
	isLoading?: boolean;
	onNavigate?: (node: NodeItem) => void;
	onSelect?: (node: NodeItem) => void;
}

export function Commander({ nodes = [], isLoading, onNavigate, onSelect }: CommanderProps) {
	const { folderId } = useParams<{ folderId: string }>();
	const navigate = useNavigate();
	const {
		viewMode,
		setViewMode,
		selectedNodeIds,
		toggleNodeSelection,
		clearNodeSelection,
		sortBy,
		sortOrder,
		setSorting,
	} = useStore();

	const handleNodeClick = (node: NodeItem, e: React.MouseEvent) => {
		if (e.ctrlKey || e.metaKey) {
			toggleNodeSelection(node.id);
		} else if (node.nodeType === 'folder') {
			clearNodeSelection();
			onNavigate?.(node);
			navigate(`/documents/${node.id}`);
		} else {
			clearNodeSelection();
			toggleNodeSelection(node.id);
			onSelect?.(node);
		}
	};

	const handleNavigateUp = () => {
		// Navigate to parent folder
		if (folderId) {
			const parentNode = nodes.find((n) => n.id === folderId);
			if (parentNode?.parentId) {
				navigate(`/documents/${parentNode.parentId}`);
			} else {
				navigate('/documents');
			}
		}
	};

	const sortedNodes = [...nodes].sort((a, b) => {
		// Folders first
		if (a.nodeType !== b.nodeType) {
			return a.nodeType === 'folder' ? -1 : 1;
		}
		// Then by selected sort
		let comparison = 0;
		switch (sortBy) {
			case 'title':
				comparison = a.title.localeCompare(b.title);
				break;
			case 'created_at':
				comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
				break;
			case 'updated_at':
				comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
				break;
			case 'size':
				comparison = (a.fileSize || 0) - (b.fileSize || 0);
				break;
		}
		return sortOrder === 'asc' ? comparison : -comparison;
	});

	if (isLoading) {
		return (
			<div className="p-4">
				<div className="animate-pulse space-y-2">
					{[1, 2, 3, 4, 5].map((i) => (
						<div key={i} className="h-12 bg-slate-800 rounded-lg" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* Toolbar */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-slate-800">
				<div className="flex items-center gap-2">
					{folderId && (
						<button
							onClick={handleNavigateUp}
							className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
							title="Go up"
						>
							<ArrowUp className="w-4 h-4" />
						</button>
					)}
					<button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brass-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-brass-400 transition-colors">
						<Upload className="w-4 h-4" />
						Upload
					</button>
					<button className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors">
						<FolderPlus className="w-4 h-4" />
						New Folder
					</button>
				</div>
				<div className="flex items-center gap-2">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger asChild>
							<button className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors capitalize">
								{sortBy.replace('_', ' ')} {sortOrder === 'asc' ? '↑' : '↓'}
							</button>
						</DropdownMenu.Trigger>
						<DropdownMenu.Portal>
							<DropdownMenu.Content className="bg-slate-800 border border-slate-700 rounded-lg p-1 shadow-xl min-w-[150px]">
								{(['title', 'created_at', 'updated_at', 'size'] as const).map((field) => (
									<DropdownMenu.Item
										key={field}
										onClick={() => setSorting(field, sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc')}
										className="px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded cursor-pointer capitalize"
									>
										{field.replace('_', ' ')}
									</DropdownMenu.Item>
								))}
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					</DropdownMenu.Root>
					<div className="flex items-center bg-slate-800 rounded-lg p-0.5">
						<button
							onClick={() => setViewMode('list')}
							className={cn('p-1.5 rounded transition-colors', viewMode === 'list' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-100')}
						>
							<List className="w-4 h-4" />
						</button>
						<button
							onClick={() => setViewMode('grid')}
							className={cn('p-1.5 rounded transition-colors', viewMode === 'grid' ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-100')}
						>
							<Grid className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-auto p-4">
				{sortedNodes.length === 0 ? (
					<div className="text-center py-12 text-slate-500">
						<Folder className="w-12 h-12 mx-auto mb-3 opacity-50" />
						<p>This folder is empty</p>
					</div>
				) : viewMode === 'list' ? (
					<div className="space-y-1">
						{sortedNodes.map((node) => (
							<div
								key={node.id}
								onClick={(e) => handleNodeClick(node, e)}
								className={cn(
									'flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors',
									selectedNodeIds.has(node.id)
										? 'bg-brass-500/10 border border-brass-500/30'
										: 'hover:bg-slate-800/50'
								)}
							>
								{node.nodeType === 'folder' ? (
									<Folder className="w-5 h-5 text-brass-400" />
								) : (
									<FileText className="w-5 h-5 text-slate-400" />
								)}
								<div className="flex-1 min-w-0">
									<p className="text-slate-100 truncate">{node.title}</p>
									<p className="text-xs text-slate-500">
										{node.nodeType === 'folder'
											? `${node.childCount || 0} items`
											: node.fileSize
												? `${(node.fileSize / 1024).toFixed(1)} KB`
												: ''}
									</p>
								</div>
								{node.nodeType === 'folder' && (
									<ChevronRight className="w-4 h-4 text-slate-500" />
								)}
							</div>
						))}
					</div>
				) : (
					<div className="grid grid-cols-4 gap-4">
						{sortedNodes.map((node) => (
							<div
								key={node.id}
								onClick={(e) => handleNodeClick(node, e)}
								className={cn(
									'flex flex-col items-center p-4 rounded-lg cursor-pointer transition-colors',
									selectedNodeIds.has(node.id)
										? 'bg-brass-500/10 border border-brass-500/30'
										: 'hover:bg-slate-800/50'
								)}
							>
								{node.nodeType === 'folder' ? (
									<Folder className="w-12 h-12 text-brass-400 mb-2" />
								) : node.thumbnailUrl ? (
									<img
										src={node.thumbnailUrl}
										alt={node.title}
										className="w-12 h-16 object-cover rounded mb-2"
									/>
								) : (
									<FileText className="w-12 h-12 text-slate-400 mb-2" />
								)}
								<p className="text-sm text-slate-100 text-center truncate w-full">{node.title}</p>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
