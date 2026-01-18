// (c) Copyright Datacraft, 2026
/**
 * User list component with search and filtering.
 */
import { useState } from 'react';
import {
	User,
	UserPlus,
	Search,
	MoreHorizontal,
	Shield,
	Key,
	Trash2,
	Edit,
	CheckCircle,
	XCircle,
	Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
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
import { useUsers, useDeleteUser, useResetPassword } from '../api';
import type { User as UserType } from '../types';

interface UserListProps {
	onCreateUser: () => void;
	onEditUser: (user: UserType) => void;
}

export function UserList({ onCreateUser, onEditUser }: UserListProps) {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [userToDelete, setUserToDelete] = useState<UserType | null>(null);
	const [userToReset, setUserToReset] = useState<UserType | null>(null);
	const [tempPassword, setTempPassword] = useState<string | null>(null);

	const { data, isLoading } = useUsers({
		page,
		pageSize: 25,
		search: search || undefined,
		is_active: statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
	});

	const deleteUser = useDeleteUser();
	const resetPassword = useResetPassword();

	const users = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / 25);

	const handleDelete = async () => {
		if (!userToDelete) return;
		await deleteUser.mutateAsync(userToDelete.id);
		setUserToDelete(null);
	};

	const handleResetPassword = async () => {
		if (!userToReset) return;
		const result = await resetPassword.mutateAsync(userToReset.id);
		setTempPassword(result.temporary_password);
	};

	const getInitials = (user: UserType) => {
		if (user.first_name && user.last_name) {
			return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
		}
		return user.username.slice(0, 2).toUpperCase();
	};

	if (isLoading) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 10 }).map((_, i) => (
					<Skeleton key={i} className="h-16" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search users..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9 w-64"
						/>
					</div>
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="w-32">
							<SelectValue placeholder="Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All</SelectItem>
							<SelectItem value="active">Active</SelectItem>
							<SelectItem value="inactive">Inactive</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<Button onClick={onCreateUser}>
					<UserPlus className="h-4 w-4 mr-2" />
					Add User
				</Button>
			</div>

			{/* User list */}
			{users.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground">
					<User className="h-12 w-12 mx-auto mb-4 opacity-50" />
					<p>No users found</p>
				</div>
			) : (
				<div className="border rounded-lg divide-y">
					{users.map((user) => (
						<div
							key={user.id}
							className="flex items-center gap-4 p-4 hover:bg-accent/30 transition-colors"
						>
							<Avatar className="h-10 w-10">
								<AvatarFallback className={cn(
									user.is_superuser ? 'bg-primary text-primary-foreground' : 'bg-muted'
								)}>
									{getInitials(user)}
								</AvatarFallback>
							</Avatar>

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span className="font-medium">
										{user.first_name && user.last_name
											? `${user.first_name} ${user.last_name}`
											: user.username}
									</span>
									{user.is_superuser && (
										<Badge variant="default" className="gap-1">
											<Shield className="h-3 w-3" />
											Admin
										</Badge>
									)}
									{user.mfa_enabled && (
										<Badge variant="outline" className="gap-1">
											<Key className="h-3 w-3" />
											MFA
										</Badge>
									)}
								</div>
								<div className="flex items-center gap-3 text-sm text-muted-foreground">
									<span className="flex items-center gap-1">
										<Mail className="h-3 w-3" />
										{user.email}
									</span>
									<span>@{user.username}</span>
								</div>
							</div>

							<div className="flex items-center gap-2">
								{user.is_active ? (
									<Badge variant="outline" className="gap-1 text-green-500 border-green-500/30">
										<CheckCircle className="h-3 w-3" />
										Active
									</Badge>
								) : (
									<Badge variant="outline" className="gap-1 text-red-500 border-red-500/30">
										<XCircle className="h-3 w-3" />
										Inactive
									</Badge>
								)}
							</div>

							<div className="flex items-center gap-2">
								{user.groups.length > 0 && (
									<div className="text-xs text-muted-foreground">
										{user.groups.length} group{user.groups.length !== 1 ? 's' : ''}
									</div>
								)}
								{user.roles.length > 0 && (
									<div className="text-xs text-muted-foreground">
										{user.roles.length} role{user.roles.length !== 1 ? 's' : ''}
									</div>
								)}
							</div>

							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon">
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => onEditUser(user)}>
										<Edit className="h-4 w-4 mr-2" />
										Edit
									</DropdownMenuItem>
									<DropdownMenuItem onClick={() => setUserToReset(user)}>
										<Key className="h-4 w-4 mr-2" />
										Reset Password
									</DropdownMenuItem>
									<DropdownMenuSeparator />
									<DropdownMenuItem
										onClick={() => setUserToDelete(user)}
										className="text-destructive"
									>
										<Trash2 className="h-4 w-4 mr-2" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-4">
					<span className="text-sm text-muted-foreground">{total} users</span>
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

			{/* Delete confirmation */}
			<AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete User</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{userToDelete?.username}"? This action cannot be undone.
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

			{/* Reset password dialog */}
			<AlertDialog open={!!userToReset} onOpenChange={() => { setUserToReset(null); setTempPassword(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{tempPassword ? 'Password Reset' : 'Reset Password'}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{tempPassword ? (
								<div className="space-y-2">
									<p>Temporary password for {userToReset?.username}:</p>
									<code className="block p-2 bg-muted rounded font-mono text-foreground">
										{tempPassword}
									</code>
									<p className="text-xs">Share this securely with the user. They will be required to change it on next login.</p>
								</div>
							) : (
								`Generate a new temporary password for "${userToReset?.username}"?`
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						{tempPassword ? (
							<AlertDialogAction onClick={() => { setUserToReset(null); setTempPassword(null); }}>
								Done
							</AlertDialogAction>
						) : (
							<>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction onClick={handleResetPassword}>
									Reset Password
								</AlertDialogAction>
							</>
						)}
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
