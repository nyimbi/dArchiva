// (c) Copyright Datacraft, 2026
/**
 * Admin role management panel.
 * Table of roles with create, edit, and delete (when unused).
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
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
	Edit,
	MoreHorizontal,
	AlertCircle,
	Search,
	Shield,
	ShieldPlus,
	Trash2,
	Users,
} from 'lucide-react';
import { useState } from 'react';
import { useCreateRole, useDeleteRole, useRoles, useUpdateRole } from '../roles/api';
import type { Role } from '../roles/types';

// ── Create / Edit dialog ──────────────────────────────────────────────────────

interface RoleFormDialogProps {
	role?: Role | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

function RoleFormDialog({ role, open, onOpenChange }: RoleFormDialogProps) {
	const isEdit = !!role;
	const [name, setName] = useState(role?.name ?? '');
	const [description, setDescription] = useState(role?.description ?? '');

	const createRole = useCreateRole();
	const updateRole = useUpdateRole(role?.id ?? '');

	// Reset form when dialog opens with a different role
	const handleOpenChange = (o: boolean) => {
		if (o) {
			setName(role?.name ?? '');
			setDescription(role?.description ?? '');
		}
		onOpenChange(o);
	};

	const handleSubmit = async () => {
		if (!name.trim()) return;
		if (isEdit && role) {
			await updateRole.mutateAsync({ name: name.trim(), permission_ids: [] });
		} else {
			await createRole.mutateAsync({ name: name.trim(), description: description.trim() || undefined, permission_ids: [] });
		}
		onOpenChange(false);
	};

	const isPending = createRole.isPending || updateRole.isPending;

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit Role' : 'Create Role'}</DialogTitle>
					<DialogDescription>
						{isEdit
							? 'Update the role name or description.'
							: 'Define a new role. Assign permissions after creation.'}
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-4 py-2">
					<div className="space-y-2">
						<Label htmlFor="role-name">Name</Label>
						<Input
							id="role-name"
							placeholder="e.g. Document Reviewer"
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
						/>
					</div>
					{!isEdit && (
						<div className="space-y-2">
							<Label htmlFor="role-desc">Description</Label>
							<Textarea
								id="role-desc"
								placeholder="What is this role for? (optional)"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								rows={3}
							/>
						</div>
					)}
					<p className="text-xs text-muted-foreground">
						Full permissions matrix is managed via the Roles settings page.
					</p>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
					<Button onClick={handleSubmit} disabled={!name.trim() || isPending}>
						{isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Role'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Main component ────────────────────────────────────────────────────────────

export function RoleManagement() {
	const [page, setPage] = useState(1);
	const [search, setSearch] = useState('');
	const [createOpen, setCreateOpen] = useState(false);
	const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
	const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);

	const PAGE_SIZE = 20;
	const { data, isLoading, isError } = useRoles({
		page,
		pageSize: PAGE_SIZE,
		search: search || undefined,
	});

	const deleteRole = useDeleteRole();

	const roles = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

	const handleDelete = async () => {
		if (!roleToDelete) return;
		await deleteRole.mutateAsync(roleToDelete.id);
		setRoleToDelete(null);
	};

	return (
		<div className="space-y-4">
			{/* Header bar */}
			<div className="flex items-center justify-between">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search roles…"
						value={search}
						onChange={(e) => { setSearch(e.target.value); setPage(1); }}
						className="pl-9 w-64"
					/>
				</div>
				<Button onClick={() => setCreateOpen(true)}>
					<ShieldPlus className="h-4 w-4 mr-2" />
					Create Role
				</Button>
			</div>

			{/* Role table */}
			{isLoading ? (
				<div className="space-y-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-16 rounded-lg" />
					))}
				</div>
			) : isError ? (
				<div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
					<AlertCircle className="h-4 w-4 shrink-0" />
					Failed to load roles. Check your connection and try refreshing.
				</div>
			) : roles.length === 0 ? (
				<div className="text-center py-16 text-muted-foreground border rounded-lg">
					<Shield className="h-12 w-12 mx-auto mb-3 opacity-40" />
					<p className="font-medium">No roles found</p>
					<p className="text-sm mt-1">
						{search ? 'Try a different search.' : 'Create a role to control access.'}
					</p>
				</div>
			) : (
				<div className="border rounded-lg divide-y">
					{roles.map((role) => (
						<div
							key={role.id}
							className="flex items-center gap-4 px-4 py-3 hover:bg-accent/20 transition-colors"
						>
							{/* Icon */}
							<div className="p-2 rounded-lg bg-muted shrink-0">
								<Shield className="h-4 w-4 text-muted-foreground" />
							</div>

							{/* Name + description */}
							<div className="flex-1 min-w-0">
								<div className="flex items-center gap-2">
									<span className="font-medium text-sm">{role.name}</span>
									{role.is_system && (
										<Badge variant="outline" className="text-xs py-0">System</Badge>
									)}
								</div>
								{role.description && (
									<div className="text-xs text-muted-foreground truncate">{role.description}</div>
								)}
							</div>

							{/* Stats */}
							<div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground shrink-0">
								<span className="flex items-center gap-1">
									<Users className="h-3 w-3" />
									{role.user_count ?? 0} users
								</span>
								<span className="flex items-center gap-1">
									<Shield className="h-3 w-3" />
									{role.permissions?.length ?? 0} permissions
								</span>
							</div>

							{/* Actions */}
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button variant="ghost" size="icon" className="shrink-0" aria-label={`Actions for ${role.name}`}>
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem onClick={() => setRoleToEdit(role)}>
										<Edit className="h-4 w-4 mr-2" />
										{role.is_system ? 'View' : 'Edit'}
									</DropdownMenuItem>
									{!role.is_system && (
										<>
											<DropdownMenuSeparator />
											<DropdownMenuItem
												className="text-destructive"
												onClick={() => setRoleToDelete(role)}
												disabled={(role.user_count ?? 0) > 0}
											>
												<Trash2 className="h-4 w-4 mr-2" />
												{(role.user_count ?? 0) > 0 ? 'In use' : 'Delete'}
											</DropdownMenuItem>
										</>
									)}
								</DropdownMenuContent>
							</DropdownMenu>
						</div>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between pt-2">
					<span className="text-sm text-muted-foreground">{total} roles</span>
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

			{/* Create dialog */}
			<RoleFormDialog open={createOpen} onOpenChange={setCreateOpen} />

			{/* Edit dialog */}
			<RoleFormDialog
				role={roleToEdit}
				open={!!roleToEdit}
				onOpenChange={(open) => { if (!open) setRoleToEdit(null); }}
			/>

			{/* Delete confirmation */}
			<AlertDialog open={!!roleToDelete} onOpenChange={(open) => { if (!open) setRoleToDelete(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete Role</AlertDialogTitle>
						<AlertDialogDescription>
							Delete <strong>{roleToDelete?.name}</strong>? Users currently assigned this role
							will lose its permissions immediately. This cannot be undone.
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
		</div>
	);
}
