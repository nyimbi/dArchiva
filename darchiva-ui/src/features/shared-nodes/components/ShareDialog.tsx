// (c) Copyright Datacraft, 2026
/**
 * Share dialog for documents and folders.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import {
	Share2,
	User,
	Users,
	Link,
	Copy,
	Check,
	Loader2,
	Calendar,
	Lock,
	Eye,
	Pencil,
	Download,
	Trash2,
	X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import {
	useNodeShares,
	useNodeShareLinks,
	useCreateShare,
	useCreateShareLink,
	useDeleteShare,
	useDeleteShareLink,
} from '../api';
import { useUsers } from '@/features/users/api';
import { useGroups } from '@/features/groups/api';
import type { SharePermission, SharedNode, ShareLink } from '../types';

const PERMISSIONS: { value: SharePermission; label: string; icon: typeof Eye }[] = [
	{ value: 'view', label: 'View', icon: Eye },
	{ value: 'edit', label: 'Edit', icon: Pencil },
	{ value: 'download', label: 'Download', icon: Download },
	{ value: 'share', label: 'Re-share', icon: Share2 },
	{ value: 'delete', label: 'Delete', icon: Trash2 },
];

interface ShareDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	nodeId: string;
	nodeTitle: string;
	nodeType: 'document' | 'folder';
}

export function ShareDialog({ open, onOpenChange, nodeId, nodeTitle, nodeType }: ShareDialogProps) {
	const [activeTab, setActiveTab] = useState<'people' | 'link'>('people');

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Share2 className="h-5 w-5" />
						Share "{nodeTitle}"
					</DialogTitle>
					<DialogDescription>
						Share this {nodeType} with users, groups, or create a public link.
					</DialogDescription>
				</DialogHeader>

				<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'people' | 'link')}>
					<TabsList className="grid w-full grid-cols-2">
						<TabsTrigger value="people" className="gap-2">
							<Users className="h-4 w-4" />
							People
						</TabsTrigger>
						<TabsTrigger value="link" className="gap-2">
							<Link className="h-4 w-4" />
							Link
						</TabsTrigger>
					</TabsList>

					<TabsContent value="people" className="mt-4">
						<ShareWithPeople nodeId={nodeId} />
					</TabsContent>

					<TabsContent value="link" className="mt-4">
						<ShareWithLink nodeId={nodeId} />
					</TabsContent>
				</Tabs>
			</DialogContent>
		</Dialog>
	);
}

function ShareWithPeople({ nodeId }: { nodeId: string }) {
	const [shareType, setShareType] = useState<'user' | 'group'>('user');
	const [selectedId, setSelectedId] = useState<string>('');
	const [permissions, setPermissions] = useState<SharePermission[]>(['view']);
	const [expiresAt, setExpiresAt] = useState<Date | undefined>();

	const { data: shares, isLoading: loadingShares } = useNodeShares(nodeId);
	const { data: usersData } = useUsers({ pageSize: 100 });
	const { data: groupsData } = useGroups({ pageSize: 100 });

	const createShare = useCreateShare();
	const deleteShare = useDeleteShare();

	const users = usersData?.items ?? [];
	const groups = groupsData?.items ?? [];

	const togglePermission = (perm: SharePermission) => {
		if (permissions.includes(perm)) {
			setPermissions(permissions.filter((p) => p !== perm));
		} else {
			setPermissions([...permissions, perm]);
		}
	};

	const handleShare = async () => {
		if (!selectedId || permissions.length === 0) return;
		await createShare.mutateAsync({
			node_id: nodeId,
			shared_with_type: shareType,
			shared_with_id: selectedId,
			permissions,
			expires_at: expiresAt?.toISOString(),
		});
		setSelectedId('');
		setPermissions(['view']);
		setExpiresAt(undefined);
	};

	const handleRemoveShare = async (shareId: string) => {
		await deleteShare.mutateAsync(shareId);
	};

	return (
		<div className="space-y-4">
			{/* Add new share */}
			<div className="space-y-3">
				<div className="flex gap-2">
					<Select value={shareType} onValueChange={(v) => { setShareType(v as 'user' | 'group'); setSelectedId(''); }}>
						<SelectTrigger className="w-28">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="user">
								<span className="flex items-center gap-2">
									<User className="h-4 w-4" />
									User
								</span>
							</SelectItem>
							<SelectItem value="group">
								<span className="flex items-center gap-2">
									<Users className="h-4 w-4" />
									Group
								</span>
							</SelectItem>
						</SelectContent>
					</Select>

					<Select value={selectedId} onValueChange={setSelectedId}>
						<SelectTrigger className="flex-1">
							<SelectValue placeholder={`Select ${shareType}...`} />
						</SelectTrigger>
						<SelectContent>
							{shareType === 'user'
								? users.map((u) => (
									<SelectItem key={u.id} value={u.id}>
										{u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
									</SelectItem>
								))
								: groups.map((g) => (
									<SelectItem key={g.id} value={g.id}>
										{g.name}
									</SelectItem>
								))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-wrap gap-2">
					{PERMISSIONS.map((perm) => (
						<label
							key={perm.value}
							className={cn(
								'flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors',
								permissions.includes(perm.value)
									? 'bg-primary text-primary-foreground border-primary'
									: 'hover:bg-accent'
							)}
						>
							<Checkbox
								checked={permissions.includes(perm.value)}
								onCheckedChange={() => togglePermission(perm.value)}
								className="sr-only"
							/>
							<perm.icon className="h-3 w-3" />
							<span className="text-sm">{perm.label}</span>
						</label>
					))}
				</div>

				<div className="flex items-center gap-2">
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" size="sm" className="gap-2">
								<Calendar className="h-4 w-4" />
								{expiresAt ? format(expiresAt, 'PP') : 'No expiry'}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<CalendarComponent
								mode="single"
								selected={expiresAt}
								onSelect={setExpiresAt}
								disabled={(date) => date < new Date()}
							/>
						</PopoverContent>
					</Popover>
					{expiresAt && (
						<Button variant="ghost" size="sm" onClick={() => setExpiresAt(undefined)}>
							<X className="h-4 w-4" />
						</Button>
					)}
					<Button
						className="ml-auto"
						disabled={!selectedId || permissions.length === 0 || createShare.isPending}
						onClick={handleShare}
					>
						{createShare.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						Share
					</Button>
				</div>
			</div>

			{/* Current shares */}
			<div className="border-t pt-4">
				<Label className="text-xs text-muted-foreground">Current shares</Label>
				{loadingShares ? (
					<div className="space-y-2 mt-2">
						{Array.from({ length: 3 }).map((_, i) => (
							<Skeleton key={i} className="h-10" />
						))}
					</div>
				) : !shares?.length ? (
					<p className="text-sm text-muted-foreground mt-2">Not shared with anyone yet</p>
				) : (
					<div className="space-y-2 mt-2">
						{shares.filter((s) => s.shared_with_type !== 'link').map((share) => (
							<div key={share.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
								{share.shared_with_type === 'group' ? (
									<Users className="h-4 w-4 text-muted-foreground" />
								) : (
									<User className="h-4 w-4 text-muted-foreground" />
								)}
								<span className="flex-1 text-sm">{share.shared_with_name}</span>
								<div className="flex gap-1">
									{share.permissions.slice(0, 2).map((p) => (
										<Badge key={p} variant="secondary" className="text-xs">
											{p}
										</Badge>
									))}
								</div>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={() => handleRemoveShare(share.id)}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

function ShareWithLink({ nodeId }: { nodeId: string }) {
	const [permissions, setPermissions] = useState<SharePermission[]>(['view']);
	const [password, setPassword] = useState('');
	const [expiresAt, setExpiresAt] = useState<Date | undefined>();
	const [maxAccess, setMaxAccess] = useState<string>('');
	const [copiedId, setCopiedId] = useState<string | null>(null);

	const { data: links, isLoading: loadingLinks } = useNodeShareLinks(nodeId);
	const createLink = useCreateShareLink();
	const deleteLink = useDeleteShareLink();

	const togglePermission = (perm: SharePermission) => {
		if (permissions.includes(perm)) {
			setPermissions(permissions.filter((p) => p !== perm));
		} else {
			setPermissions([...permissions, perm]);
		}
	};

	const handleCreateLink = async () => {
		if (permissions.length === 0) return;
		await createLink.mutateAsync({
			node_id: nodeId,
			permissions,
			password: password || undefined,
			expires_at: expiresAt?.toISOString(),
			max_access_count: maxAccess ? parseInt(maxAccess, 10) : undefined,
		});
		setPassword('');
		setExpiresAt(undefined);
		setMaxAccess('');
	};

	const copyLink = async (link: ShareLink) => {
		await navigator.clipboard.writeText(link.url);
		setCopiedId(link.id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	return (
		<div className="space-y-4">
			{/* Create new link */}
			<div className="space-y-3">
				<div className="flex flex-wrap gap-2">
					{PERMISSIONS.filter((p) => p.value !== 'share').map((perm) => (
						<label
							key={perm.value}
							className={cn(
								'flex items-center gap-2 px-3 py-1.5 rounded-full border cursor-pointer transition-colors',
								permissions.includes(perm.value)
									? 'bg-primary text-primary-foreground border-primary'
									: 'hover:bg-accent'
							)}
						>
							<Checkbox
								checked={permissions.includes(perm.value)}
								onCheckedChange={() => togglePermission(perm.value)}
								className="sr-only"
							/>
							<perm.icon className="h-3 w-3" />
							<span className="text-sm">{perm.label}</span>
						</label>
					))}
				</div>

				<div className="grid grid-cols-2 gap-2">
					<div className="space-y-1">
						<Label className="text-xs">Password (optional)</Label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								type="password"
								placeholder="No password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								className="pl-9"
							/>
						</div>
					</div>
					<div className="space-y-1">
						<Label className="text-xs">Max accesses</Label>
						<Input
							type="number"
							placeholder="Unlimited"
							value={maxAccess}
							onChange={(e) => setMaxAccess(e.target.value)}
							min="1"
						/>
					</div>
				</div>

				<div className="flex items-center gap-2">
					<Popover>
						<PopoverTrigger asChild>
							<Button variant="outline" size="sm" className="gap-2">
								<Calendar className="h-4 w-4" />
								{expiresAt ? format(expiresAt, 'PP') : 'No expiry'}
							</Button>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-0" align="start">
							<CalendarComponent
								mode="single"
								selected={expiresAt}
								onSelect={setExpiresAt}
								disabled={(date) => date < new Date()}
							/>
						</PopoverContent>
					</Popover>
					{expiresAt && (
						<Button variant="ghost" size="sm" onClick={() => setExpiresAt(undefined)}>
							<X className="h-4 w-4" />
						</Button>
					)}
					<Button
						className="ml-auto"
						disabled={permissions.length === 0 || createLink.isPending}
						onClick={handleCreateLink}
					>
						{createLink.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
						Create Link
					</Button>
				</div>
			</div>

			{/* Existing links */}
			<div className="border-t pt-4">
				<Label className="text-xs text-muted-foreground">Active links</Label>
				{loadingLinks ? (
					<div className="space-y-2 mt-2">
						{Array.from({ length: 2 }).map((_, i) => (
							<Skeleton key={i} className="h-12" />
						))}
					</div>
				) : !links?.length ? (
					<p className="text-sm text-muted-foreground mt-2">No active links</p>
				) : (
					<div className="space-y-2 mt-2">
						{links.map((link) => (
							<div key={link.id} className="flex items-center gap-3 p-3 rounded-lg border">
								<Link className="h-4 w-4 text-muted-foreground" />
								<div className="flex-1 min-w-0">
									<code className="text-xs text-muted-foreground truncate block">
										{link.url}
									</code>
									<div className="flex items-center gap-2 mt-1">
										{link.password_protected && (
											<Badge variant="outline" className="text-xs gap-1">
												<Lock className="h-3 w-3" />
												Password
											</Badge>
										)}
										{link.expires_at && (
											<span className="text-xs text-muted-foreground">
												Expires {format(new Date(link.expires_at), 'PP')}
											</span>
										)}
										<span className="text-xs text-muted-foreground">
											{link.access_count} accesses
										</span>
									</div>
								</div>
								<Button
									variant="outline"
									size="sm"
									className="gap-2"
									onClick={() => copyLink(link)}
								>
									{copiedId === link.id ? (
										<Check className="h-4 w-4" />
									) : (
										<Copy className="h-4 w-4" />
									)}
									{copiedId === link.id ? 'Copied' : 'Copy'}
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8"
									onClick={() => deleteLink.mutate(link.id)}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
