// IAM Dashboard — Identity & Access Management
import { useEffect, useState } from 'react';
import {
	AlertCircle,
	Globe,
	Key,
	LogIn,
	Mail,
	Monitor,
	MoreHorizontal,
	RefreshCw,
	Shield,
	ShieldCheck,
	ShieldPlus,
	Smartphone,
	Tablet,
	Trash2,
	UserPlus,
	Users,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { apiClient } from '@/lib/api-client';
import { UserForm } from '@/features/users/components/UserForm';
import { useResetPassword } from '@/features/users/api';
import type { User as UserFormUser } from '@/features/users/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
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
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
	useActiveSessions,
	useAddGroupMembers,
	useCreateGroup,
	useCreateRole,
	useGroups,
	useIAMStats,
	useIAMUsers,
	useInviteUser,
	usePermissionGroups,
	useRevokeSession,
	useRoles,
} from '../api/hooks';
import type { Group, IAMUser, Role, UserSession } from '../types';

interface IAMDashboardProps {
	onNavigate?: (section: string, id?: string) => void;
}

export function IAMDashboard({ onNavigate = () => {} }: IAMDashboardProps) {
	const [inviteOpen, setInviteOpen] = useState(false);
	const [createRoleOpen, setCreateRoleOpen] = useState(false);
	const [createGroupOpen, setCreateGroupOpen] = useState(false);
	const statsQuery = useIAMStats();
	const stats = statsQuery.data;

	void onNavigate; // available for parent routing

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Identity &amp; Access Management
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Manage users, roles, groups, and permissions
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={() => setInviteOpen(true)}>
						<UserPlus className="w-4 h-4 mr-2" />
						Invite User
					</Button>
					<Button variant="outline" size="sm" onClick={() => setCreateRoleOpen(true)}>
						<ShieldPlus className="w-4 h-4 mr-2" />
						Create Role
					</Button>
				</div>
			</div>

			{/* Stats */}
			{statsQuery.isError && (
				<QueryErrorState onRetry={() => void statsQuery.refetch()} />
			)}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{statsQuery.isLoading ? (
					Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-28 rounded-xl" />
					))
				) : (
					<>
						<StatCard
							label="Total Users"
							value={stats?.total_users ?? 0}
							icon={<Users className="w-5 h-5" />}
						/>
						<StatCard
							label="Active Now"
							value={stats?.active_sessions ?? 0}
							icon={<LogIn className="w-5 h-5" />}
							color="text-emerald-600"
							bg="bg-emerald-50"
						/>
						<StatCard
							label="Pending Invites"
							value={stats?.pending_invitations ?? 0}
							icon={<Mail className="w-5 h-5" />}
							color="text-amber-600"
							bg="bg-amber-50"
						/>
						<StatCard
							label="Total Roles"
							value={stats?.total_roles ?? 0}
							icon={<Shield className="w-5 h-5" />}
							color="text-blue-600"
							bg="bg-blue-50"
						/>
					</>
				)}
			</div>

			{/* Tabs */}
			<Tabs defaultValue="users">
				<TabsList>
					<TabsTrigger value="users">Users</TabsTrigger>
					<TabsTrigger value="roles">Roles</TabsTrigger>
					<TabsTrigger value="groups">Groups</TabsTrigger>
					<TabsTrigger value="policies">Policies</TabsTrigger>
					<TabsTrigger value="sessions">Sessions</TabsTrigger>
				</TabsList>

				<TabsContent value="users" className="mt-4">
					<UsersTab onInvite={() => setInviteOpen(true)} />
				</TabsContent>
				<TabsContent value="roles" className="mt-4">
					<RolesTab onCreate={() => setCreateRoleOpen(true)} />
				</TabsContent>
				<TabsContent value="groups" className="mt-4">
					<GroupsTab onCreate={() => setCreateGroupOpen(true)} />
				</TabsContent>
				<TabsContent value="policies" className="mt-4">
					<PoliciesTab />
				</TabsContent>
				<TabsContent value="sessions" className="mt-4">
					<SessionsTab />
				</TabsContent>
			</Tabs>

			<InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} />
			<CreateRoleDialog open={createRoleOpen} onOpenChange={setCreateRoleOpen} />
			<CreateGroupDialog open={createGroupOpen} onOpenChange={setCreateGroupOpen} />
		</div>
	);
}

function QueryErrorState({ onRetry }: { onRetry: () => void }) {
	return (
		<div className="flex items-center gap-2 text-sm text-destructive p-4">
			<AlertCircle className="h-4 w-4" />
			Failed to load.{' '}
			<Button variant="ghost" size="sm" onClick={onRetry}>
				Retry
			</Button>
		</div>
	);
}

function useToggleUserActive() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
			apiClient.patch(`/users/${id}`, { is_active: isActive }),
		onSuccess: (_, { id }) => {
			qc.invalidateQueries({ queryKey: ['iam', 'users'] });
			qc.invalidateQueries({ queryKey: ['iam', 'user', id] });
			qc.invalidateQueries({ queryKey: ['iam', 'stats'] });
			qc.invalidateQueries({ queryKey: ['users'] });
		},
	});
}

function useUpdateIAMGroup() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: { name: string; description?: string } }) =>
			apiClient.patch<Group>(`/iam/groups/${id}`, data).then((r) => r.data),
		onSuccess: (_, { id }) => {
			qc.invalidateQueries({ queryKey: ['iam', 'groups'] });
			qc.invalidateQueries({ queryKey: ['iam', 'group', id] });
		},
	});
}

function useDeleteIAMGroup() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiClient.delete(`/iam/groups/${id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['iam', 'groups'] });
			qc.invalidateQueries({ queryKey: ['iam', 'stats'] });
		},
	});
}

/* ── Stat Card ─────────────────────────────────────────────────────────── */
function StatCard({
	label,
	value,
	icon,
	color = 'text-foreground',
	bg = 'bg-muted',
}: {
	label: string;
	value: number;
	icon: React.ReactNode;
	color?: string;
	bg?: string;
}) {
	return (
		<Card>
			<CardContent className="p-5">
				<div className="flex items-center justify-between">
					<div>
						<p className="text-sm text-muted-foreground">{label}</p>
						<p className={`text-3xl font-bold mt-1 ${color}`}>
							{value.toLocaleString()}
						</p>
					</div>
					<div className={`p-3 rounded-lg ${bg}`}>
						<span className={color}>{icon}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

/* ── Users Tab ─────────────────────────────────────────────────────────── */
function UsersTab({ onInvite }: { onInvite: () => void }) {
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [userToEdit, setUserToEdit] = useState<IAMUser | null>(null);
	const [userToReset, setUserToReset] = useState<IAMUser | null>(null);
	const [userToToggle, setUserToToggle] = useState<IAMUser | null>(null);
	const qc = useQueryClient();

	const usersQuery = useIAMUsers({
		search: search || undefined,
		status: statusFilter === 'all' ? undefined : statusFilter,
		pageSize: 20,
	});
	const resetPassword = useResetPassword();
	const toggleUserActive = useToggleUserActive();

	const users = usersQuery.data?.items ?? [];

	const userFormUser = userToEdit
		? ({
			...userToEdit,
			permissions: userToEdit.effective_permissions,
		} satisfies UserFormUser)
		: null;

	return (
		<>
			<div className="space-y-4">
				<div className="flex items-center gap-3">
					<Input
						placeholder="Search users..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="max-w-xs"
					/>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-40">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All statuses</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="inactive">Suspended</SelectItem>
						</SelectContent>
					</Select>
					<div className="ml-auto">
						<Button size="sm" onClick={onInvite}>
							<UserPlus className="w-4 h-4 mr-2" />
							Invite User
						</Button>
					</div>
				</div>

				{usersQuery.isError && (
					<QueryErrorState onRetry={() => void usersQuery.refetch()} />
				)}

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Roles</TableHead>
								<TableHead>Last Login</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>2FA</TableHead>
								<TableHead className="w-10" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{usersQuery.isLoading
								? Array.from({ length: 5 }).map((_, i) => (
										<TableRow key={i}>
											<TableCell colSpan={6}>
												<Skeleton className="h-8 w-full" />
											</TableCell>
										</TableRow>
									))
								: users.length === 0
									? (
										<TableRow>
											<TableCell
												colSpan={6}
												className="text-center text-muted-foreground py-8"
											>
												No users found
											</TableCell>
										</TableRow>
									)
									: users.map((user) => (
										<UserRow
											key={user.id}
											user={user}
											onEdit={() => setUserToEdit(user)}
											onResetPassword={() => setUserToReset(user)}
											onToggleActive={() => setUserToToggle(user)}
										/>
									))}
						</TableBody>
					</Table>
				</div>
			</div>
			<UserForm
				open={!!userToEdit}
				onOpenChange={(open) => {
					if (!open) {
						setUserToEdit(null);
						qc.invalidateQueries({ queryKey: ['iam', 'users'] });
					}
				}}
				user={userFormUser}
			/>
			<AlertDialog open={!!userToReset} onOpenChange={(open) => { if (!open) setUserToReset(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reset Password</AlertDialogTitle>
						<AlertDialogDescription>
							Reset the password for <strong>{userToReset?.email}</strong>?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (!userToReset) return;
								resetPassword.mutate(userToReset.id, {
									onSuccess: () => {
										toast.success('Password reset.');
										setUserToReset(null);
									},
									onError: () => toast.error('Failed to reset password.'),
								});
							}}
						>
							Reset Password
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog open={!!userToToggle} onOpenChange={(open) => { if (!open) setUserToToggle(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{userToToggle?.is_active ? 'Suspend User' : 'Activate User'}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{userToToggle?.is_active ? 'Suspend' : 'Activate'}{' '}
							<strong>{userToToggle?.email}</strong>?
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (!userToToggle) return;
								toggleUserActive.mutate(
									{ id: userToToggle.id, isActive: !userToToggle.is_active },
									{
										onSuccess: () => {
											toast.success(userToToggle.is_active ? 'User suspended.' : 'User activated.');
											setUserToToggle(null);
										},
										onError: () => toast.error('Failed to update user status.'),
									},
								);
							}}
						>
							{userToToggle?.is_active ? 'Suspend' : 'Activate'}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function UserRow({
	user,
	onEdit,
	onResetPassword,
	onToggleActive,
}: {
	user: IAMUser;
	onEdit: () => void;
	onResetPassword: () => void;
	onToggleActive: () => void;
}) {
	const full =
		user.first_name && user.last_name
			? `${user.first_name} ${user.last_name}`
			: user.username;
	const initials = (user.first_name?.[0] ?? user.username[0]).toUpperCase() +
		(user.last_name?.[0] ?? '').toUpperCase();

	return (
		<TableRow>
			<TableCell>
				<div className="flex items-center gap-3">
					<Avatar className="h-8 w-8">
						{user.avatar_url && <AvatarImage src={user.avatar_url} />}
						<AvatarFallback className="text-xs">{initials}</AvatarFallback>
					</Avatar>
					<div>
						<p className="font-medium text-sm">{full}</p>
						<p className="text-xs text-muted-foreground">{user.email}</p>
					</div>
				</div>
			</TableCell>
			<TableCell>
				<div className="flex gap-1 flex-wrap">
					{user.roles.slice(0, 2).map((r) => (
						<Badge key={r.id} variant="secondary" className="text-xs">
							{r.name}
						</Badge>
					))}
					{user.roles.length > 2 && (
						<Badge variant="outline" className="text-xs">
							+{user.roles.length - 2}
						</Badge>
					)}
					{user.roles.length === 0 && (
						<span className="text-xs text-muted-foreground">—</span>
					)}
				</div>
			</TableCell>
			<TableCell className="text-sm text-muted-foreground">
				{user.last_login
					? new Date(user.last_login).toLocaleDateString()
					: 'Never'}
			</TableCell>
			<TableCell>
				<Badge
					variant="secondary"
					className={
						user.is_active
							? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
							: 'bg-gray-100 text-gray-600 hover:bg-gray-100'
					}
				>
					{user.is_active ? 'Active' : 'Suspended'}
				</Badge>
			</TableCell>
			<TableCell>
				{user.mfa_enabled ? (
					<Badge
						variant="outline"
						className="text-xs border-emerald-400 text-emerald-700"
					>
						<ShieldCheck className="w-3 h-3 mr-1" />
						2FA
					</Badge>
				) : (
					<span className="text-xs text-muted-foreground">Off</span>
				)}
			</TableCell>
			<TableCell>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button aria-label="User actions" variant="ghost" size="icon" className="h-7 w-7">
							<MoreHorizontal className="w-4 h-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onEdit}>Edit User</DropdownMenuItem>
						<DropdownMenuItem onClick={onResetPassword}>Reset Password</DropdownMenuItem>
						<DropdownMenuItem onClick={onToggleActive} className="text-destructive">
							{user.is_active ? 'Suspend' : 'Activate'}
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}

/* ── Roles Tab ─────────────────────────────────────────────────────────── */
function RolesTab({ onCreate }: { onCreate: () => void }) {
	const rolesQuery = useRoles({ pageSize: 50 });
	const roles = rolesQuery.data?.items ?? [];

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button size="sm" onClick={onCreate}>
					<ShieldPlus className="w-4 h-4 mr-2" />
					Create Role
				</Button>
			</div>

			{rolesQuery.isError && (
				<QueryErrorState onRetry={() => void rolesQuery.refetch()} />
			)}

			{rolesQuery.isLoading ? (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-36 rounded-xl" />
					))}
				</div>
			) : roles.length === 0 ? (
				<p className="text-center text-muted-foreground py-8">
					No roles configured
				</p>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{roles.map((role) => (
						<RoleCard key={role.id} role={role} />
					))}
				</div>
			)}
		</div>
	);
}

function RoleCard({ role }: { role: Role }) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-medium">{role.name}</CardTitle>
					{role.is_system && (
						<Badge variant="secondary" className="text-xs">
							System
						</Badge>
					)}
				</div>
				{role.description && (
					<p className="text-xs text-muted-foreground">{role.description}</p>
				)}
			</CardHeader>
			<CardContent>
				<div className="flex flex-wrap gap-1 mb-3">
					{role.permissions.slice(0, 4).map((p) => (
						<Badge key={p.id} variant="outline" className="text-xs">
							{p.codename}
						</Badge>
					))}
					{role.permissions.length > 4 && (
						<Badge variant="outline" className="text-xs">
							+{role.permissions.length - 4} more
						</Badge>
					)}
				</div>
				<div className="flex items-center gap-4 text-xs text-muted-foreground">
					<span className="flex items-center gap-1">
						<Users className="w-3 h-3" />
						{role.user_count} users
					</span>
					<span className="flex items-center gap-1">
						<Key className="w-3 h-3" />
						{role.permissions.length} perms
					</span>
				</div>
			</CardContent>
		</Card>
	);
}

/* ── Groups Tab ────────────────────────────────────────────────────────── */
function GroupsTab({ onCreate }: { onCreate: () => void }) {
	const [groupToEdit, setGroupToEdit] = useState<Group | null>(null);
	const [groupToAddMembers, setGroupToAddMembers] = useState<Group | null>(null);
	const [groupToDelete, setGroupToDelete] = useState<Group | null>(null);
	const groupsQuery = useGroups({ pageSize: 50 });
	const groups = groupsQuery.data?.items ?? [];
	const deleteGroup = useDeleteIAMGroup();

	const handleDelete = () => {
		if (!groupToDelete) return;
		deleteGroup.mutate(groupToDelete.id, {
			onSuccess: () => {
				toast.success('Group deleted.');
				setGroupToDelete(null);
			},
			onError: () => toast.error('Failed to delete group.'),
		});
	};

	return (
		<>
			<div className="space-y-4">
				<div className="flex justify-end">
					<Button size="sm" onClick={onCreate}>
						<UserPlus className="w-4 h-4 mr-2" />
						Create Group
					</Button>
				</div>

				{groupsQuery.isError && (
					<QueryErrorState onRetry={() => void groupsQuery.refetch()} />
				)}

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Group</TableHead>
								<TableHead>Members</TableHead>
								<TableHead>Roles</TableHead>
								<TableHead>Created</TableHead>
								<TableHead className="w-10" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{groupsQuery.isLoading
								? Array.from({ length: 5 }).map((_, i) => (
										<TableRow key={i}>
											<TableCell colSpan={5}>
												<Skeleton className="h-8 w-full" />
											</TableCell>
										</TableRow>
									))
								: groups.length === 0
									? (
										<TableRow>
											<TableCell
												colSpan={5}
												className="text-center text-muted-foreground py-8"
											>
												No groups yet
											</TableCell>
										</TableRow>
									)
									: groups.map((group) => (
										<GroupRow
											key={group.id}
											group={group}
											onEdit={() => setGroupToEdit(group)}
											onAddMembers={() => setGroupToAddMembers(group)}
											onDelete={() => setGroupToDelete(group)}
										/>
									))}
						</TableBody>
					</Table>
				</div>
			</div>
			<EditGroupDialog
				group={groupToEdit}
				open={!!groupToEdit}
				onOpenChange={(open) => { if (!open) setGroupToEdit(null); }}
			/>
			<AddGroupMembersDialog
				group={groupToAddMembers}
				open={!!groupToAddMembers}
				onOpenChange={(open) => { if (!open) setGroupToAddMembers(null); }}
			/>
			<AlertDialog open={!!groupToDelete} onOpenChange={(open) => { if (!open) setGroupToDelete(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Group</AlertDialogTitle>
						<AlertDialogDescription>
							Delete <strong>{groupToDelete?.name}</strong>? Members will lose access inherited from this group.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function GroupRow({
	group,
	onEdit,
	onAddMembers,
	onDelete,
}: {
	group: Group;
	onEdit: () => void;
	onAddMembers: () => void;
	onDelete: () => void;
}) {
	return (
		<TableRow>
			<TableCell>
				<div>
					<p className="font-medium text-sm">{group.name}</p>
					{group.description && (
						<p className="text-xs text-muted-foreground">{group.description}</p>
					)}
				</div>
			</TableCell>
			<TableCell className="text-sm">
				{group.member_count}
				{group.direct_member_count !== group.member_count && (
					<span className="text-muted-foreground">
						{' '}({group.direct_member_count} direct)
					</span>
				)}
			</TableCell>
			<TableCell>
				<div className="flex gap-1 flex-wrap">
					{group.roles.slice(0, 2).map((r) => (
						<Badge key={r.id} variant="secondary" className="text-xs">
							{r.name}
						</Badge>
					))}
					{group.roles.length > 2 && (
						<Badge variant="outline" className="text-xs">
							+{group.roles.length - 2}
						</Badge>
					)}
					{group.roles.length === 0 && (
						<span className="text-xs text-muted-foreground">—</span>
					)}
				</div>
			</TableCell>
			<TableCell className="text-sm text-muted-foreground">
				{new Date(group.created_at).toLocaleDateString()}
			</TableCell>
			<TableCell>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button aria-label="Group actions" variant="ghost" size="icon" className="h-7 w-7">
							<MoreHorizontal className="w-4 h-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onClick={onEdit}>Edit</DropdownMenuItem>
						<DropdownMenuItem onClick={onAddMembers}>Add Members</DropdownMenuItem>
						<DropdownMenuItem onClick={onDelete} className="text-destructive">Delete</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}

function EditGroupDialog({
	group,
	open,
	onOpenChange,
}: {
	group: Group | null;
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const updateGroup = useUpdateIAMGroup();

	useEffect(() => {
		if (open && group) {
			setName(group.name);
			setDescription(group.description ?? '');
		}
	}, [group, open]);

	const handleSubmit = () => {
		if (!group || !name.trim()) return;
		updateGroup.mutate(
			{ id: group.id, data: { name: name.trim(), description: description.trim() || undefined } },
			{
				onSuccess: () => {
					toast.success('Group updated.');
					onOpenChange(false);
					setName('');
					setDescription('');
				},
				onError: () => toast.error('Failed to update group.'),
			},
		);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (nextOpen && group) {
					setName(group.name);
					setDescription(group.description ?? '');
				}
				if (!nextOpen) {
					setName('');
					setDescription('');
				}
				onOpenChange(nextOpen);
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Edit Group</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="edit-group-name">Group name</Label>
						<Input
							id="edit-group-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="edit-group-desc">Description</Label>
						<Input
							id="edit-group-desc"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={handleSubmit} disabled={!name.trim() || updateGroup.isPending}>
						{updateGroup.isPending ? 'Saving…' : 'Save Changes'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function AddGroupMembersDialog({
	group,
	open,
	onOpenChange,
}: {
	group: Group | null;
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
	const usersQuery = useIAMUsers({ pageSize: 100, status: 'active' });
	const addGroupMembers = useAddGroupMembers();
	const qc = useQueryClient();
	const users = usersQuery.data?.items ?? [];

	const toggleUser = (userId: string) => {
		setSelectedUserIds((prev) =>
			prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId],
		);
	};

	const handleSubmit = () => {
		if (!group || selectedUserIds.length === 0) return;
		addGroupMembers.mutate(
			{ groupId: group.id, userIds: selectedUserIds },
			{
				onSuccess: () => {
					toast.success('Members added.');
					qc.invalidateQueries({ queryKey: ['iam', 'groups'] });
					setSelectedUserIds([]);
					onOpenChange(false);
				},
				onError: () => toast.error('Failed to add members.'),
			},
		);
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) setSelectedUserIds([]);
				onOpenChange(nextOpen);
			}}
		>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add Members</DialogTitle>
				</DialogHeader>
				<div className="border rounded-md max-h-72 overflow-y-auto">
					{usersQuery.isError ? (
						<QueryErrorState onRetry={() => void usersQuery.refetch()} />
					) : usersQuery.isLoading ? (
						<div className="p-3 space-y-2">
							{Array.from({ length: 4 }).map((_, i) => (
								<Skeleton key={i} className="h-10 w-full" />
							))}
						</div>
					) : users.length === 0 ? (
						<p className="p-4 text-center text-sm text-muted-foreground">
							No users available
						</p>
					) : (
						<div className="divide-y">
							{users.map((user) => (
								<label
									key={user.id}
									className="flex items-center gap-3 p-3 hover:bg-accent/30 cursor-pointer"
								>
									<Checkbox
										checked={selectedUserIds.includes(user.id)}
										onCheckedChange={() => toggleUser(user.id)}
									/>
									<div className="min-w-0">
										<p className="text-sm font-medium truncate">
											{user.first_name && user.last_name
												? `${user.first_name} ${user.last_name}`
												: user.username}
										</p>
										<p className="text-xs text-muted-foreground truncate">{user.email}</p>
									</div>
								</label>
							))}
						</div>
					)}
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={selectedUserIds.length === 0 || addGroupMembers.isPending}
					>
						{addGroupMembers.isPending ? 'Adding…' : 'Add Members'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/* ── Policies Tab ──────────────────────────────────────────────────────── */
function PoliciesTab() {
	const permGroupsQuery = usePermissionGroups();
	const permGroups = permGroupsQuery.data;

	if (permGroupsQuery.isLoading) return <Skeleton className="h-64 w-full" />;

	return (
		<div className="space-y-4">
			{permGroupsQuery.isError && (
				<QueryErrorState onRetry={() => void permGroupsQuery.refetch()} />
			)}
			{(permGroups ?? []).map((group) => (
				<Card key={group.category}>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium capitalize">
							{group.label}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-wrap gap-2">
							{group.permissions.map((p) => (
								<Badge
									key={p.id}
									variant={p.is_dangerous ? 'destructive' : 'outline'}
									className="text-xs"
									title={p.description}
								>
									{p.is_dangerous && (
										<AlertCircle className="w-3 h-3 mr-1" />
									)}
									{p.codename}
								</Badge>
							))}
						</div>
					</CardContent>
				</Card>
			))}
			{(permGroups ?? []).length === 0 && (
				<p className="text-center text-muted-foreground py-8">
					No permissions configured
				</p>
			)}
		</div>
	);
}

/* ── Sessions Tab ──────────────────────────────────────────────────────── */
function SessionsTab() {
	const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
	const sessionsQuery = useActiveSessions({ pageSize: 25 });
	const revokeSession = useRevokeSession();
	const sessions = sessionsQuery.data?.items ?? [];

	return (
		<>
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<p className="text-sm text-muted-foreground">
						{sessionsQuery.data?.total ?? 0} active session
						{(sessionsQuery.data?.total ?? 0) !== 1 ? 's' : ''}
					</p>
					<Button
						variant="outline"
						size="sm"
						onClick={() => void sessionsQuery.refetch()}
					>
						<RefreshCw className="w-4 h-4 mr-2" />
						Refresh
					</Button>
				</div>

				{sessionsQuery.isError && (
					<QueryErrorState onRetry={() => void sessionsQuery.refetch()} />
				)}

				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>IP Address</TableHead>
								<TableHead>Device</TableHead>
								<TableHead>Started</TableHead>
								<TableHead>Last Activity</TableHead>
								<TableHead className="w-24" />
							</TableRow>
						</TableHeader>
						<TableBody>
							{sessionsQuery.isLoading
								? Array.from({ length: 5 }).map((_, i) => (
										<TableRow key={i}>
											<TableCell colSpan={6}>
												<Skeleton className="h-8 w-full" />
											</TableCell>
										</TableRow>
									))
								: sessions.length === 0
									? (
										<TableRow>
											<TableCell
												colSpan={6}
												className="text-center text-muted-foreground py-8"
											>
												No active sessions
											</TableCell>
										</TableRow>
									)
									: sessions.map((session) => (
										<SessionRow
											key={session.id}
											session={session}
											isRevoking={revokeSession.isPending}
											onRevoke={() =>
												setConfirmDialog({
													message: 'Revoke this session? The user will be signed out immediately.',
													onConfirm: () =>
														revokeSession.mutate({
															userId: session.user_id,
															sessionId: session.id,
														}, {
															onSuccess: () => toast.success('Session revoked.'),
															onError: () => toast.error('Failed to revoke session.'),
														}),
												})
											}
										/>
									))}
						</TableBody>
					</Table>
				</div>
			</div>
			<AlertDialog open={!!confirmDialog} onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm</AlertDialogTitle>
						<AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								confirmDialog?.onConfirm();
								setConfirmDialog(null);
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}

function SessionRow({
	session,
	isRevoking,
	onRevoke,
}: {
	session: UserSession;
	isRevoking: boolean;
	onRevoke: () => void;
}) {
	const DeviceIcon =
		session.device_type === 'mobile'
			? Smartphone
			: session.device_type === 'tablet'
				? Tablet
				: Monitor;

	return (
		<TableRow>
			<TableCell className="font-mono text-xs">
				{session.user_id.slice(0, 12)}…
				{session.is_current && (
					<Badge
						variant="outline"
						className="ml-2 text-xs border-emerald-400 text-emerald-700"
					>
						Current
					</Badge>
				)}
			</TableCell>
			<TableCell className="font-mono text-sm">{session.ip_address}</TableCell>
			<TableCell>
				<div className="flex items-center gap-1.5 text-sm text-muted-foreground">
					<DeviceIcon className="w-4 h-4" />
					<span className="capitalize">{session.device_type}</span>
					{session.location && (
						<>
							<Globe className="w-3 h-3 ml-1" />
							<span>{session.location}</span>
						</>
					)}
				</div>
			</TableCell>
			<TableCell className="text-sm text-muted-foreground">
				{new Date(session.created_at).toLocaleString()}
			</TableCell>
			<TableCell className="text-sm text-muted-foreground">
				{new Date(session.last_active_at).toLocaleString()}
			</TableCell>
			<TableCell>
				<Button
					variant="ghost"
					size="sm"
					className="text-destructive hover:text-destructive h-7 text-xs"
					disabled={session.is_current || isRevoking}
					onClick={onRevoke}
				>
					<Trash2 className="w-3.5 h-3.5 mr-1" />
					Revoke
				</Button>
			</TableCell>
		</TableRow>
	);
}

/* ── Invite User Dialog ────────────────────────────────────────────────── */
function InviteUserDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const [email, setEmail] = useState('');
	const [roleId, setRoleId] = useState('');
	const { data: rolesData } = useRoles({ pageSize: 100 });
	const inviteUser = useInviteUser();

	const handleSubmit = () => {
		inviteUser.mutate(
			{ email, role_ids: roleId ? [roleId] : [] },
			{
				onSuccess: () => {
					toast.success('Invitation sent.');
					onOpenChange(false);
					setEmail('');
					setRoleId('');
				},
				onError: () => toast.error('Failed to send invitation.'),
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Invite User</DialogTitle>
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
						/>
					</div>
					<div className="space-y-2">
						<Label>Role (optional)</Label>
						<Select value={roleId} onValueChange={setRoleId}>
							<SelectTrigger>
								<SelectValue placeholder="Select a role…" />
							</SelectTrigger>
							<SelectContent>
								{(rolesData?.items ?? []).map((r) => (
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
						disabled={!email || inviteUser.isPending}
					>
						{inviteUser.isPending ? 'Sending…' : 'Send Invite'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/* ── Create Role Dialog ────────────────────────────────────────────────── */
function CreateRoleDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
	const { data: permGroups } = usePermissionGroups();
	const createRole = useCreateRole();

	const handleSubmit = () => {
		createRole.mutate(
			{ name, description, permission_ids: selectedPerms },
			{
				onSuccess: () => {
					toast.success('Role created.');
					onOpenChange(false);
					setName('');
					setDescription('');
					setSelectedPerms([]);
				},
				onError: () => toast.error('Failed to create role.'),
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Create Role</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="role-name">Role name</Label>
							<Input
								id="role-name"
								placeholder="e.g. Document Reviewer"
								value={name}
								onChange={(e) => setName(e.target.value)}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="role-desc">Description</Label>
							<Input
								id="role-desc"
								placeholder="Optional"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label>
							Permissions{' '}
							<span className="text-muted-foreground font-normal">
								({selectedPerms.length} selected)
							</span>
						</Label>
						<div className="space-y-4 max-h-72 overflow-y-auto pr-1 border rounded-md p-3">
							{(permGroups ?? []).map((group) => (
								<div key={group.category}>
									<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
										{group.label}
									</p>
									<div className="grid grid-cols-2 gap-2">
										{group.permissions.map((p) => (
											<div
												key={p.id}
												className="flex items-center space-x-2"
											>
												<Checkbox
													id={`perm-${p.id}`}
													checked={selectedPerms.includes(p.id)}
													onCheckedChange={(checked) => {
														if (checked === true) {
															setSelectedPerms((prev) => [...prev, p.id]);
														} else {
															setSelectedPerms((prev) =>
																prev.filter((x) => x !== p.id),
															);
														}
													}}
												/>
												<Label
													htmlFor={`perm-${p.id}`}
													className="text-sm font-normal cursor-pointer"
												>
													{p.name}
												</Label>
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!name || createRole.isPending}
					>
						{createRole.isPending ? 'Creating…' : 'Create Role'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

/* ── Create Group Dialog ───────────────────────────────────────────────── */
function CreateGroupDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
}) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const createGroup = useCreateGroup();

	const handleSubmit = () => {
		createGroup.mutate(
			{ name, description },
			{
				onSuccess: () => {
					toast.success('Group created.');
					onOpenChange(false);
					setName('');
					setDescription('');
				},
				onError: () => toast.error('Failed to create group.'),
			},
		);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Create Group</DialogTitle>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="group-name">Group name</Label>
						<Input
							id="group-name"
							placeholder="e.g. Finance Team"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="group-desc">Description</Label>
						<Input
							id="group-desc"
							placeholder="Optional"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
						/>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button
						onClick={handleSubmit}
						disabled={!name || createGroup.isPending}
					>
						{createGroup.isPending ? 'Creating…' : 'Create Group'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
