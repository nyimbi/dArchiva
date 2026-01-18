// (c) Copyright Datacraft, 2026
/**
 * Group list component with hierarchy.
 */
import { useState } from 'react';
import {
	Users,
	UserPlus,
	Search,
	MoreHorizontal,
	Trash2,
	Edit,
	ChevronRight,
	ChevronDown,
	FolderTree,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useGroupTree, useDeleteGroup } from '../api';
import type { Group, GroupTree } from '../types';

interface GroupListProps {
	onCreateGroup: () => void;
	onEditGroup: (group: Group) => void;
	onViewMembers: (group: Group) => void;
}

export function GroupList({ onCreateGroup, onEditGroup, onViewMembers }: GroupListProps) {
	const [search, setSearch] = useState('');
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
	const [groupToDelete, setGroupToDelete] = useState<GroupTree | null>(null);

	const { data: groups, isLoading } = useGroupTree();
	const deleteGroup = useDeleteGroup();

	const toggleExpand = (id: string) => {
		const newExpanded = new Set(expandedIds);
		if (newExpanded.has(id)) {
			newExpanded.delete(id);
		} else {
			newExpanded.add(id);
		}
		setExpandedIds(newExpanded);
	};

	const handleDelete = async () => {
		if (!groupToDelete) return;
		await deleteGroup.mutateAsync(groupToDelete.id);
		setGroupToDelete(null);
	};

	const filterGroups = (groups: GroupTree[], query: string): GroupTree[] => {
		if (!query) return groups;
		return groups.reduce<GroupTree[]>((acc, group) => {
			const matchesSearch = group.name.toLowerCase().includes(query.toLowerCase());
			const filteredChildren = filterGroups(group.children, query);
			if (matchesSearch || filteredChildren.length > 0) {
				acc.push({ ...group, children: filteredChildren });
			}
			return acc;
		}, []);
	};

	const filteredGroups = filterGroups(groups ?? [], search);

	if (isLoading) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-14" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search groups..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9 w-64"
					/>
				</div>
				<Button onClick={onCreateGroup}>
					<UserPlus className="h-4 w-4 mr-2" />
					Add Group
				</Button>
			</div>

			{/* Group tree */}
			{filteredGroups.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground">
					<FolderTree className="h-12 w-12 mx-auto mb-4 opacity-50" />
					<p>No groups found</p>
				</div>
			) : (
				<div className="border rounded-lg">
					{filteredGroups.map((group) => (
						<GroupTreeNode
							key={group.id}
							group={group}
							depth={0}
							expandedIds={expandedIds}
							onToggle={toggleExpand}
							onEdit={onEditGroup}
							onViewMembers={onViewMembers}
							onDelete={setGroupToDelete}
						/>
					))}
				</div>
			)}

			{/* Delete confirmation */}
			<AlertDialog open={!!groupToDelete} onOpenChange={() => setGroupToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Group</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{groupToDelete?.name}"?
							{(groupToDelete?.children?.length ?? 0) > 0 && (
								<span className="block mt-2 text-destructive">
									This group has child groups that will also be affected.
								</span>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

interface GroupTreeNodeProps {
	group: GroupTree;
	depth: number;
	expandedIds: Set<string>;
	onToggle: (id: string) => void;
	onEdit: (group: Group) => void;
	onViewMembers: (group: Group) => void;
	onDelete: (group: GroupTree) => void;
}

function GroupTreeNode({
	group,
	depth,
	expandedIds,
	onToggle,
	onEdit,
	onViewMembers,
	onDelete,
}: GroupTreeNodeProps) {
	const isExpanded = expandedIds.has(group.id);
	const hasChildren = group.children.length > 0;

	return (
		<>
			<div
				className={cn(
					'flex items-center gap-3 p-3 hover:bg-accent/30 transition-colors border-b last:border-b-0',
				)}
				style={{ paddingLeft: `${depth * 24 + 12}px` }}
			>
				{hasChildren ? (
					<Button
						variant="ghost"
						size="icon"
						className="h-6 w-6"
						onClick={() => onToggle(group.id)}
					>
						{isExpanded ? (
							<ChevronDown className="h-4 w-4" />
						) : (
							<ChevronRight className="h-4 w-4" />
						)}
					</Button>
				) : (
					<div className="w-6" />
				)}

				<Users className="h-5 w-5 text-muted-foreground" />

				<div className="flex-1 min-w-0">
					<div className="font-medium">{group.name}</div>
					{group.description && (
						<div className="text-sm text-muted-foreground truncate">
							{group.description}
						</div>
					)}
				</div>

				<Badge variant="secondary">{group.member_count} members</Badge>

				{group.roles.length > 0 && (
					<div className="text-xs text-muted-foreground">
						{group.roles.length} role{group.roles.length !== 1 ? 's' : ''}
					</div>
				)}

				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={() => onViewMembers(group)}>
							<Users className="h-4 w-4 mr-2" />
							View Members
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onEdit(group)}>
							<Edit className="h-4 w-4 mr-2" />
							Edit
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={() => onDelete(group)}
							className="text-destructive"
						>
							<Trash2 className="h-4 w-4 mr-2" />
							Delete
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{isExpanded &&
				group.children.map((child) => (
					<GroupTreeNode
						key={child.id}
						group={child}
						depth={depth + 1}
						expandedIds={expandedIds}
						onToggle={onToggle}
						onEdit={onEdit}
						onViewMembers={onViewMembers}
						onDelete={onDelete}
					/>
				))}
		</>
	);
}
