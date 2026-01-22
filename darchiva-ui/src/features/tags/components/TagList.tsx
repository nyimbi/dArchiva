// (c) Copyright Datacraft, 2026
/**
 * Tag list with hierarchy support.
 */
import { useState, useMemo } from 'react';
import { Tag as TagIcon, Search, ChevronRight, ChevronDown, FileText, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useTags, useDeleteTag } from '../api';
import type { Tag, TagTreeNode } from '../types';

interface TagListProps {
	onSelect?: (tag: Tag) => void;
	onEdit?: (tag: Tag) => void;
	selectedId?: string;
}

function buildTagTree(tags: Tag[]): TagTreeNode[] {
	const map = new Map<string, TagTreeNode>();
	const roots: TagTreeNode[] = [];

	// Create nodes
	tags.forEach((tag) => {
		map.set(tag.id, { ...tag, children: [] });
	});

	// Build tree
	tags.forEach((tag) => {
		const node = map.get(tag.id)!;
		if (tag.parentId && map.has(tag.parentId)) {
			map.get(tag.parentId)!.children.push(node);
		} else {
			roots.push(node);
		}
	});

	return roots;
}

export function TagList({ onSelect, onEdit, selectedId }: TagListProps) {
	const { data, isLoading } = useTags();
	const deleteMutation = useDeleteTag();
	const [search, setSearch] = useState('');
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	const tags = data?.items ?? [];

	const filteredTags = useMemo(() => {
		if (!search) return tags;
		const query = search.toLowerCase();
		return tags.filter((tag) => tag.name.toLowerCase().includes(query) || tag.description?.toLowerCase().includes(query));
	}, [tags, search]);

	const tree = useMemo(() => buildTagTree(filteredTags), [filteredTags]);

	const toggleExpanded = (id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	if (isLoading) {
		return (
			<div className="p-4 space-y-2">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-10 w-full" />
				))}
			</div>
		);
	}

	return (
		<div className="h-full flex flex-col">
			{/* Header */}
			<div className="p-4 border-b border-border/50">
				<div className="flex items-center justify-between mb-3">
					<h2 className="font-semibold flex items-center gap-2">
						<TagIcon className="h-4 w-4" />
						Tags
					</h2>
					<Badge variant="secondary">{tags.length}</Badge>
				</div>

				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search tags..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>

			{/* List */}
			<div className="flex-1 overflow-auto p-2">
				{tree.length === 0 ? (
					<div className="text-center py-8 text-muted-foreground">
						<TagIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
						<p>{search ? 'No matching tags' : 'No tags yet'}</p>
					</div>
				) : (
					<div className="space-y-0.5">
						{tree.map((node) => (
							<TagTreeItem
								key={node.id}
								node={node}
								level={0}
								selectedId={selectedId}
								expandedIds={expandedIds}
								onToggleExpand={toggleExpanded}
								onSelect={onSelect}
								onEdit={onEdit}
								onDelete={(id) => deleteMutation.mutate(id)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

interface TagTreeItemProps {
	node: TagTreeNode;
	level: number;
	selectedId?: string;
	expandedIds: Set<string>;
	onToggleExpand: (id: string) => void;
	onSelect?: (tag: Tag) => void;
	onEdit?: (tag: Tag) => void;
	onDelete: (id: string) => void;
}

function TagTreeItem({ node, level, selectedId, expandedIds, onToggleExpand, onSelect, onEdit, onDelete }: TagTreeItemProps) {
	const hasChildren = node.children.length > 0;
	const isExpanded = expandedIds.has(node.id);
	const isSelected = node.id === selectedId;

	return (
		<>
			<div
				className={cn(
					'group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer hover:bg-accent/50',
					isSelected && 'bg-accent'
				)}
				style={{ paddingLeft: `${8 + level * 16}px` }}
				onClick={() => onSelect?.(node)}
			>
				{hasChildren ? (
					<button
						onClick={(e) => {
							e.stopPropagation();
							onToggleExpand(node.id);
						}}
						className="p-0.5 hover:bg-accent rounded"
					>
						{isExpanded ? (
							<ChevronDown className="h-4 w-4 text-muted-foreground" />
						) : (
							<ChevronRight className="h-4 w-4 text-muted-foreground" />
						)}
					</button>
				) : (
					<span className="w-5" />
				)}

				<span
					className="w-3 h-3 rounded-full flex-shrink-0"
					style={{ backgroundColor: node.color || '#64748b' }}
				/>

				<span className="flex-1 truncate text-sm">{node.name}</span>

				<span className="text-xs text-muted-foreground flex items-center gap-1">
					<FileText className="h-3 w-3" />
					{node.documentCount}
				</span>

				<div className="hidden group-hover:flex items-center gap-1">
					<button
						onClick={(e) => {
							e.stopPropagation();
							onEdit?.(node);
						}}
						className="p-1 hover:bg-accent rounded"
					>
						<Edit className="h-3.5 w-3.5 text-muted-foreground" />
					</button>

					<AlertDialog>
						<AlertDialogTrigger asChild>
							<button
								onClick={(e) => e.stopPropagation()}
								className="p-1 hover:bg-accent rounded"
							>
								<Trash2 className="h-3.5 w-3.5 text-destructive" />
							</button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete Tag</AlertDialogTitle>
								<AlertDialogDescription>
									Are you sure you want to delete "{node.name}"? Documents will not be deleted.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={() => onDelete(node.id)} className="bg-destructive text-destructive-foreground">
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				</div>
			</div>

			{hasChildren && isExpanded && (
				<div>
					{node.children.map((child) => (
						<TagTreeItem
							key={child.id}
							node={child}
							level={level + 1}
							selectedId={selectedId}
							expandedIds={expandedIds}
							onToggleExpand={onToggleExpand}
							onSelect={onSelect}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					))}
				</div>
			)}
		</>
	);
}
