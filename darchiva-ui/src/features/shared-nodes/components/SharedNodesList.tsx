// (c) Copyright Datacraft, 2026
/**
 * Shared nodes list component.
 */
import { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import {
	Share2,
	FileText,
	Folder,
	User,
	Users,
	Link,
	MoreHorizontal,
	Trash2,
	Edit,
	ExternalLink,
	Eye,
	Download,
	Pencil,
	Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { useSharedByMe, useSharedWithMe, useDeleteShare } from '../api';
import type { SharedNode, SharePermission } from '../types';

const permissionIcons: Record<SharePermission, typeof Eye> = {
	view: Eye,
	edit: Pencil,
	download: Download,
	share: Share2,
	delete: Trash2,
};

interface SharedNodesListProps {
	onEditShare: (share: SharedNode) => void;
}

export function SharedNodesList({ onEditShare }: SharedNodesListProps) {
	const [activeTab, setActiveTab] = useState<'by-me' | 'with-me'>('by-me');
	const [page, setPage] = useState(1);
	const [shareToDelete, setShareToDelete] = useState<SharedNode | null>(null);

	const { data: sharedByMe, isLoading: loadingByMe } = useSharedByMe({ page, pageSize: 25 });
	const { data: sharedWithMe, isLoading: loadingWithMe } = useSharedWithMe({ page, pageSize: 25 });

	const deleteShare = useDeleteShare();

	const handleDelete = async () => {
		if (!shareToDelete) return;
		await deleteShare.mutateAsync(shareToDelete.id);
		setShareToDelete(null);
	};

	const data = activeTab === 'by-me' ? sharedByMe : sharedWithMe;
	const isLoading = activeTab === 'by-me' ? loadingByMe : loadingWithMe;
	const shares = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / 25);

	return (
		<div className="space-y-4">
			<Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'by-me' | 'with-me'); setPage(1); }}>
				<TabsList>
					<TabsTrigger value="by-me" className="gap-2">
						<Share2 className="h-4 w-4" />
						Shared by Me
					</TabsTrigger>
					<TabsTrigger value="with-me" className="gap-2">
						<Users className="h-4 w-4" />
						Shared with Me
					</TabsTrigger>
				</TabsList>

				<TabsContent value={activeTab} className="mt-4">
					{isLoading ? (
						<div className="space-y-3">
							{Array.from({ length: 8 }).map((_, i) => (
								<Skeleton key={i} className="h-16" />
							))}
						</div>
					) : shares.length === 0 ? (
						<div className="text-center py-12 text-muted-foreground">
							<Share2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
							<p>
								{activeTab === 'by-me'
									? "You haven't shared anything yet"
									: 'Nothing has been shared with you'}
							</p>
						</div>
					) : (
						<div className="space-y-2">
							{shares.map((share) => (
								<SharedNodeRow
									key={share.id}
									share={share}
									showSharedWith={activeTab === 'by-me'}
									showSharedBy={activeTab === 'with-me'}
									onEdit={() => onEditShare(share)}
									onDelete={() => setShareToDelete(share)}
									canEdit={activeTab === 'by-me'}
								/>
							))}
						</div>
					)}

					{/* Pagination */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between pt-4">
							<span className="text-sm text-muted-foreground">{total} shares</span>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page === 1}
									onClick={() => setPage((p) => Math.max(1, p - 1))}
								>
									Previous
								</Button>
								<span className="text-sm">
									Page {page} of {totalPages}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={page === totalPages}
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</TabsContent>
			</Tabs>

			{/* Delete confirmation */}
			<AlertDialog open={!!shareToDelete} onOpenChange={() => setShareToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove Share</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to stop sharing "{shareToDelete?.node_title}" with{' '}
							{shareToDelete?.shared_with_name || 'this recipient'}?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
							Remove Share
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

interface SharedNodeRowProps {
	share: SharedNode;
	showSharedWith: boolean;
	showSharedBy: boolean;
	onEdit: () => void;
	onDelete: () => void;
	canEdit: boolean;
}

function SharedNodeRow({ share, showSharedWith, showSharedBy, onEdit, onDelete, canEdit }: SharedNodeRowProps) {
	const NodeIcon = share.node_type === 'folder' ? Folder : FileText;
	const SharedIcon = share.shared_with_type === 'group' ? Users : share.shared_with_type === 'link' ? Link : User;

	const isExpired = share.expires_at && new Date(share.expires_at) < new Date();

	return (
		<div className={cn(
			'flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/30 transition-colors',
			isExpired && 'opacity-60'
		)}>
			<div className="p-2 rounded-lg bg-muted">
				<NodeIcon className="h-5 w-5 text-muted-foreground" />
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="font-medium truncate">{share.node_title}</span>
					{isExpired && <Badge variant="destructive">Expired</Badge>}
				</div>
				<div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
					{showSharedWith && (
						<span className="flex items-center gap-1">
							<SharedIcon className="h-3 w-3" />
							{share.shared_with_name || 'Link share'}
						</span>
					)}
					{showSharedBy && (
						<span className="flex items-center gap-1">
							<User className="h-3 w-3" />
							{share.shared_by_name}
						</span>
					)}
					<span>
						{formatDistanceToNow(new Date(share.created_at), { addSuffix: true })}
					</span>
				</div>
			</div>

			<div className="flex items-center gap-1">
				{share.permissions.slice(0, 3).map((perm) => {
					const Icon = permissionIcons[perm];
					return (
						<div
							key={perm}
							className="p-1 rounded bg-muted"
							title={perm}
						>
							<Icon className="h-3 w-3 text-muted-foreground" />
						</div>
					);
				})}
				{share.permissions.length > 3 && (
					<div className="text-xs text-muted-foreground">
						+{share.permissions.length - 3}
					</div>
				)}
			</div>

			{share.expires_at && !isExpired && (
				<div className="flex items-center gap-1 text-xs text-muted-foreground">
					<Clock className="h-3 w-3" />
					{format(new Date(share.expires_at), 'MMM d')}
				</div>
			)}

			{share.access_count > 0 && (
				<div className="text-xs text-muted-foreground">
					{share.access_count} access{share.access_count !== 1 ? 'es' : ''}
				</div>
			)}

			{canEdit && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onEdit}>
							<Edit className="h-4 w-4 mr-2" />
							Edit Permissions
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={onDelete} className="text-destructive">
							<Trash2 className="h-4 w-4 mr-2" />
							Remove Share
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
