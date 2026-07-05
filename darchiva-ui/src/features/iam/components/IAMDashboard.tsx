// IAM Dashboard — Identity & Access Management
import { useState } from 'react';
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
	const { data: stats, isLoading } = useIAMStats();

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
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{isLoading ? (
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

	const { data, isLoading } = useIAMUsers({
		search: search || undefined,
		status: statusFilter === 'all' ? undefined : statusFilter,
		pageSize: 20,
	});

	const users = data?.items ?? [];

	return (
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
						{isLoading
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
								: users.map((user) => <UserRow key={user.id} user={user} />)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function UserRow({ user }: { user: IAMUser }) {
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
						<Button variant="ghost" size="icon" className="h-7 w-7">
							<MoreHorizontal className="w-4 h-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem>Edit User</DropdownMenuItem>
						<DropdownMenuItem>Reset Password</DropdownMenuItem>
						<DropdownMenuItem className="text-destructive">
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
	const { data, isLoading } = useRoles({ pageSize: 50 });
	const roles = data?.items ?? [];

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button size="sm" onClick={onCreate}>
					<ShieldPlus className="w-4 h-4 mr-2" />
					Create Role
				</Button>
			</div>

			{isLoading ? (
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
	const { data, isLoading } = useGroups({ pageSize: 50 });
	const groups = data?.items ?? [];

	return (
		<div className="space-y-4">
			<div className="flex justify-end">
				<Button size="sm" onClick={onCreate}>
					<UserPlus className="w-4 h-4 mr-2" />
					Create Group
				</Button>
			</div>

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
						{isLoading
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
									<GroupRow key={group.id} group={group} />
								))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

function GroupRow({ group }: { group: Group }) {
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
						<Button variant="ghost" size="icon" className="h-7 w-7">
							<MoreHorizontal className="w-4 h-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem>Edit</DropdownMenuItem>
						<DropdownMenuItem>Add Members</DropdownMenuItem>
						<DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</TableCell>
		</TableRow>
	);
}

/* ── Policies Tab ──────────────────────────────────────────────────────── */
function PoliciesTab() {
	const { data: permGroups, isLoading } = usePermissionGroups();

	if (isLoading) return <Skeleton className="h-64 w-full" />;

	return (
		<div className="space-y-4">
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
	const { data, isLoading, refetch } = useActiveSessions({ pageSize: 25 });
	const revokeSession = useRevokeSession();
	const sessions = data?.items ?? [];

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					{data?.total ?? 0} active session
					{(data?.total ?? 0) !== 1 ? 's' : ''}
				</p>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void refetch()}
				>
					<RefreshCw className="w-4 h-4 mr-2" />
					Refresh
				</Button>
			</div>

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
						{isLoading
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
											revokeSession.mutate({
												userId: session.user_id,
												sessionId: session.id,
											})
										}
									/>
								))}
					</TableBody>
				</Table>
			</div>
		</div>
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
					onOpenChange(false);
					setEmail('');
					setRoleId('');
				},
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

	const toggle = (id: string) =>
		setSelectedPerms((prev) =>
			prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
		);

	const handleSubmit = () => {
		createRole.mutate(
			{ name, description, permission_ids: selectedPerms },
			{
				onSuccess: () => {
					onOpenChange(false);
					setName('');
					setDescription('');
					setSelectedPerms([]);
				},
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
					onOpenChange(false);
					setName('');
					setDescription('');
				},
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
