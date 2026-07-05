// (c) Copyright Datacraft, 2026
/**
 * Admin user management panel.
 * Paginated user table with invite, role assignment, status toggle, and removal.
 */
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
	AlertCircle,
	CheckCircle,
	Mail,
	MoreHorizontal,
	Search,
	Shield,
	Trash2,
	UserPlus,
	Users,
	XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useRoles } from '../roles/api';
import {
	AdminUser,
	useAdminDeleteUser,
	useAdminUpdateUser,
	useAdminUsers,
	useInviteUser,
} from './api-users';

function getUserInitials(user: AdminUser): string {
	return user.username.slice(0, 2).toUpperCase();
}

// ── Invite dialog ─────────────────────────────────────────────────────────────

interface InviteDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function InviteDialog({ open, onOpenChange }: InviteDialogProps) {
	const [email, setEmail] = useState('');
	const [roleId, setRoleId] = useState<string>('');
	const { data: rolesData } = useRoles({ pageSize: 100 });
	const invite = useInviteUser();

	const roles = rolesData?.items ?? [];

	const handleSubmit = async () => {
		if (!email.trim()) return;
		await invite.mutateAsync({
			email: email.trim().toLowerCase(),
			role_ids: roleId ? [roleId] : [],
		});
		setEmail('');
		setRoleId('');
		onOpenChange(false);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Invite User</DialogTitle>
					<DialogDescription>
						Send an invitation link to a new user. The invitation expires in 7 days.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="invite-email">Email address</Label>
						<Input
							id="invite-email"
							type="email"
							placeholder="user@example.com"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="invite-role">Role (optional)</Label>
						<Select value={roleId} onValueChange={setRoleId}>
							<SelectTrigger id="invite-role">
								<SelectValue placeholder="Select a role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">No role</SelectItem>
								{roles.map((r) => (
									<SelectItem key={r.id} value={r.id}>
										{r.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!email.trim() || invite.isPending}
					>
						<Mail className="h-4 w-4 mr-2" />
						{invite.isPending ? 'Sending…' : 'Send Invite'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Edit role dialog ──────────────────────────────────────────────────────────

interface EditRoleDialogProps {
	user: AdminUser | null;
	onOpenChange: (open: boolean) => void;
}

function EditRoleDialog({ user, onOpenChange }: EditRoleDialogProps) {
	const { data: rolesData } = useRoles({ pageSize: 100 });
	const updateUser = useAdminUpdateUser();
	const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(
		() => user?.roles.map((r) => r.id) ?? []
	);

	const roles = rolesData?.items ?? [];

	const toggleRole = (roleId: string) => {
		setSelectedRoleIds((prev) =>
			prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
		);
	};

	const handleSave = async () => {
		if (!user) return;
		await updateUser.mutateAsync({ userId: user.id, data: { role_ids: selectedRoleIds } });
		onOpenChange(false);
	};

	return (
		<Dialog open={!!user} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Roles — {user?.username}</DialogTitle>
					<DialogDescription>
						Select the roles to assign to this user.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2 max-h-72 overflow-y-auto py-2">
					{roles.length === 0 && (
						<p className="text-sm text-muted-foreground text-center py-4">No roles defined.</p>
					)}
					{roles.map((role) => {
						const checked = selectedRoleIds.includes(role.id);
						return (
							<label
								key={role.id}
								className={cn(
									'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
									checked ? 'border-primary bg-primary/5' : 'hover:bg-accent/30'
								)}
							>
								<input
									type="checkbox"
									className="accent-primary"
									checked={checked}
									onChange={() => toggleRole(role.id)}
								/>
								<span className="font-medium text-sm">{role.name}</span>
							</label>
						);
					})}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={handleSave} disabled={updateUser.isPending}>
						{updateUser.isPending ? 'Saving…' : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Main component ────────────────────────────────────────────────────────────

export function UserManagement() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [inviteOpen, setInviteOpen] = useState(false);
	const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null);
	const [userToDelete, setUserToDelete] = useState<AdminUser | null>(null);

	const PAGE_SIZE = 20;
	const { data, isLoading, isError } = useAdminUsers({
		page,
		pageSize: PAGE_SIZE,
		search: search || undefined,
		is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
	});

	const updateUser = useAdminUpdateUser();
	const deleteUser = useAdminDeleteUser();

	const users = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	const handleToggleActive = async (user: AdminUser) => {
		await updateUser.mutateAsync({ userId: user.id, data: { is_active: !user.is_active } });
	};

	const handleDelete = async () => {
		if (!userToDelete) return;
		await deleteUser.mutateAsync(userToDelete.id);
		setUserToDelete(null);
	};

	return (
		<div className="space-y-4">
			{/* Header bar */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search by name or email…"
							value={search}
							onChange={(e) => { setSearch(e.target.value); setPage(1); }}
							className="pl-9 w-64"
						/>
					</div>
					<Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
						<SelectTrigger className="w-32">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="inactive">Disabled</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<Button onClick={() => setInviteOpen(true)}>
					<UserPlus className="h-4 w-4 mr-2" />
					Invite User
				</Button>
			</div>

			{/* User table */}
			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 8 }).map((_, i) => (
						<Skeleton key={i} className="h-16 rounded-lg" />
					))}
				</div>
			) : isError ? (
				<div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
					<AlertCircle className="h-4 w-4 shrink-0" />
					Failed to load users. Check your connection and try refreshing.
				</div>
			) : users.length === 0 ? (
				<div className="text-center py-16 text-muted-foreground border rounded-lg">
					<Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
					<p className="font-medium">No users found</p>
					<p className="text-sm mt-1">
						{search ? 'Try a different search term.' : 'Invite someone to get started.'}
					</p>
				</div>
			) : (
				<div className="border rounded-lg divide-y">
					{users.map((user) => (
						<div
							key={user.id}
							className="flex items-center gap-4 px-4 py-3 hover:bg-accent/20 transition-colors"
						>
							{/* Avatar */}
							<Avatar className="h-9 w-9 shrink-0">
								<AvatarFallback className={cn(
									'text-xs font-semibold',
									user.is_superuser
										? 'bg-primary text-primary-foreground'
										: 'bg-muted text-muted-foreground'
								)}>
									{getUserInitials(user)}
								</AvatarFallback>
							</Avatar>

							{/* Name + email */}
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2 flex-wrap">
									<span className="font-medium text-sm">{user.username}</span>
									{user.is_superuser && (
										<Badge variant="default" className="gap-1 text-xs py-0">
											<Shield className="h-3 w-3" />
											Superuser
										</Badge>
									)}
								</div>
								<div className="text-xs text-muted-foreground truncate">{user.email}</div>
							</div>

							{/* Roles */}
							<div className="hidden sm:flex items-center gap-1 flex-wrap max-w-[200px]">
								{user.roles.slice(0, 3).map((r) => (
									<Badge key={r.id} variant="secondary" className="text-xs py-0">
										{r.name}
									</Badge>
								))}
								{user.roles.length > 3 && (
									<span className="text-xs text-muted-foreground">+{user.roles.length - 3}</span>
								)}
								{user.roles.length === 0 && (
									<span className="text-xs text-muted-foreground italic">No roles</span>
								)}
							</div>

							{/* Status badge */}
							<div className="shrink-0">
								{user.is_active ? (
									<Badge variant="outline" className="gap-1 text-green-600 border-green-500/30 text-xs">
										<CheckCircle className="h-3 w-3" />
										Active
									</Badge>
								) : (
									<Badge variant="outline" className="gap-1 text-red-500 border-red-500/30 text-xs">
										<XCircle className="h-3 w-3" />
										Disabled
									</Badge>
								)}
							</div>

							{/* Joined date */}
							<div className="hidden md:block text-xs text-muted-foreground shrink-0 w-24 text-right">
								{new Date(user.created_at).toLocaleDateString()}
							</div>

							{/* Actions */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="shrink-0" aria-label={`Actions for ${user.username}`}>
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => setUserToEdit(user)}>
										<Shield className="h-4 w-4 mr-2" />
										Edit Roles
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => handleToggleActive(user)}>
										{user.is_active ? (
											<><XCircle className="h-4 w-4 mr-2" />Disable</>
										) : (
											<><CheckCircle className="h-4 w-4 mr-2" />Enable</>
										)}
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										className="text-destructive"
										onClick={() => setUserToDelete(user)}
									>
										<Trash2 className="h-4 w-4 mr-2" />
										Remove from org
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2">
					<span className="text-sm text-muted-foreground">{total} users</span>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
							Previous
						</Button>
						<span className="text-sm">Page {page} of {totalPages}</span>
						<Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
							Next
						</Button>
					</div>
				</div>
			)}

			{/* Invite dialog */}
			<InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />

			{/* Edit role dialog */}
			<EditRoleDialog
				user={userToEdit}
				onOpenChange={(open) => { if (!open) setUserToEdit(null); }}
			/>

			{/* Delete confirmation */}
			<AlertDialog open={!!userToDelete} onOpenChange={(open) => { if (!open) setUserToDelete(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remove User</AlertDialogTitle>
						<AlertDialogDescription>
							Remove <strong>{userToDelete?.username}</strong> ({userToDelete?.email}) from the
							organisation? This deletes all their data and cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Remove
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
