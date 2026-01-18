// (c) Copyright Datacraft, 2026
/**
 * Role list component.
 */
import { useState } from 'react';
import {
	Shield,
	ShieldPlus,
	Search,
	MoreHorizontal,
	Trash2,
	Edit,
	Copy,
	Lock,
	Users,
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
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useRoles, useDeleteRole, useCloneRole } from '../api';
import type { Role } from '../types';

interface RoleListProps {
	onCreateRole: () => void;
	onEditRole: (role: Role) => void;
}

export function RoleList({ onCreateRole, onEditRole }: RoleListProps) {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState('');
	const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
	const [roleToClone, setRoleToClone] = useState<Role | null>(null);
	const [cloneName, setCloneName] = useState('');

	const { data, isLoading } = useRoles({
		page,
		pageSize: 25,
		search: search || undefined,
	});

	const deleteRole = useDeleteRole();
	const cloneRole = useCloneRole();

	const roles = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / 25);

	const handleDelete = async () => {
		if (!roleToDelete) return;
		await deleteRole.mutateAsync(roleToDelete.id);
		setRoleToDelete(null);
	};

	const handleClone = async () => {
		if (!roleToClone || !cloneName.trim()) return;
		await cloneRole.mutateAsync({ roleId: roleToClone.id, newName: cloneName.trim() });
		setRoleToClone(null);
		setCloneName('');
	};

	const openCloneDialog = (role: Role) => {
		setRoleToClone(role);
		setCloneName(`${role.name} (Copy)`);
	};

	if (isLoading) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 8 }).map((_, i) => (
					<Skeleton key={i} className="h-16" />
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
						placeholder="Search roles..."
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9 w-64"
					/>
				</div>
				<Button onClick={onCreateRole}>
					<ShieldPlus className="h-4 w-4 mr-2" />
					Add Role
				</Button>
			</div>

			{/* Role list */}
			{roles.length === 0 ? (
				<div className="text-center py-12 text-muted-foreground">
					<Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
					<p>No roles found</p>
				</div>
			) : (
				<div className="grid gap-3">
					{roles.map((role) => (
						<div
							key={role.id}
							className={cn(
								'flex items-center gap-4 p-4 border rounded-lg hover:bg-accent/30 transition-colors',
								role.is_system && 'border-primary/30'
							)}
						>
							<div className={cn(
								'p-2 rounded-lg',
								role.is_system ? 'bg-primary/10 text-primary' : 'bg-muted'
							)}>
								{role.is_system ? (
									<Lock className="h-5 w-5" />
								) : (
									<Shield className="h-5 w-5" />
								)}
							</div>

							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span className="font-medium">{role.name}</span>
									{role.is_system && (
										<Badge variant="outline" className="text-xs">System</Badge>
									)}
								</div>
								{role.description && (
									<div className="text-sm text-muted-foreground truncate">
										{role.description}
									</div>
								)}
							</div>

							<div className="flex items-center gap-4">
								<div className="text-sm text-muted-foreground text-right">
									<div className="flex items-center gap-1">
										<Shield className="h-3 w-3" />
										{role.permissions.length} permissions
									</div>
									<div className="flex items-center gap-1">
										<Users className="h-3 w-3" />
										{role.user_count} users
									</div>
								</div>

								<DropdownMenu>
									<DropdownMenuTrigger asChild>
										<Button variant="ghost" size="icon">
											<MoreHorizontal className="h-4 w-4" />
										</Button>
									</DropdownMenuTrigger>
									<DropdownMenuContent align="end">
										<DropdownMenuItem onClick={() => onEditRole(role)}>
											<Edit className="h-4 w-4 mr-2" />
											{role.is_system ? 'View' : 'Edit'}
										</DropdownMenuItem>
										<DropdownMenuItem onClick={() => openCloneDialog(role)}>
											<Copy className="h-4 w-4 mr-2" />
											Clone
										</DropdownMenuItem>
										{!role.is_system && (
											<>
												<DropdownMenuSeparator />
												<DropdownMenuItem
													onClick={() => setRoleToDelete(role)}
													className="text-destructive"
												>
													<Trash2 className="h-4 w-4 mr-2" />
													Delete
												</DropdownMenuItem>
											</>
										)}
									</DropdownMenuContent>
								</DropdownMenu>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-4">
					<span className="text-sm text-muted-foreground">{total} roles</span>
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
			<AlertDialog open={!!roleToDelete} onOpenChange={() => setRoleToDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Role</AlertDialogTitle>
						<AlertDialogDescription>
							Are you sure you want to delete "{roleToDelete?.name}"? Users and groups with this role will lose its permissions.
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

			{/* Clone dialog */}
			<Dialog open={!!roleToClone} onOpenChange={() => { setRoleToClone(null); setCloneName(''); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Clone Role</DialogTitle>
						<DialogDescription>
							Create a copy of "{roleToClone?.name}" with a new name.
						</DialogDescription>
					</DialogHeader>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="clone-name">New Role Name</Label>
							<Input
								id="clone-name"
								value={cloneName}
								onChange={(e) => setCloneName(e.target.value)}
								placeholder="Enter role name"
							/>
						</div>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => { setRoleToClone(null); setCloneName(''); }}>
							Cancel
						</Button>
						<Button onClick={handleClone} disabled={!cloneName.trim() || cloneRole.isPending}>
							Clone Role
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
