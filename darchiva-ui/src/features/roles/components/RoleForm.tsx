// (c) Copyright Datacraft, 2026
/**
 * Role create/edit form with permission matrix.
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateRole, useUpdateRole, usePermissionsByCategory } from '../api';
import type { Role, PermissionCategory } from '../types';

const roleSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
	permission_ids: z.array(z.string()),
});

type RoleFormData = z.infer<typeof roleSchema>;

interface RoleFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	role?: Role | null;
}

export function RoleForm({ open, onOpenChange, role }: RoleFormProps) {
	const isEditing = !!role;
	const isSystemRole = role?.is_system ?? false;

	const { data: categories, isLoading: loadingPermissions } = usePermissionsByCategory();

	const createRole = useCreateRole();
	const updateRole = useUpdateRole(role?.id ?? '');

	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

	const {
		register,
		handleSubmit,
		reset,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<RoleFormData>({
		resolver: zodResolver(roleSchema),
		defaultValues: {
			name: '',
			description: '',
			permission_ids: [],
		},
	});

	const selectedPermissionIds = watch('permission_ids') || [];

	useEffect(() => {
		if (role) {
			reset({
				name: role.name,
				description: role.description ?? '',
				permission_ids: role.permissions.map((p) => p.id),
			});
			// Expand categories that have selected permissions
			const permCategories = new Set(role.permissions.map((p) => p.category));
			setExpandedCategories(permCategories);
		} else {
			reset({
				name: '',
				description: '',
				permission_ids: [],
			});
			setExpandedCategories(new Set());
		}
	}, [role, reset]);

	const onSubmit = async (data: RoleFormData) => {
		if (isSystemRole) return;

		if (isEditing) {
			await updateRole.mutateAsync(data);
		} else {
			await createRole.mutateAsync({
				...data,
				permission_ids: data.permission_ids,
			});
		}
		onOpenChange(false);
	};

	const toggleCategory = (categoryName: string) => {
		const newExpanded = new Set(expandedCategories);
		if (newExpanded.has(categoryName)) {
			newExpanded.delete(categoryName);
		} else {
			newExpanded.add(categoryName);
		}
		setExpandedCategories(newExpanded);
	};

	const togglePermission = (permissionId: string) => {
		if (isSystemRole) return;
		const current = selectedPermissionIds;
		if (current.includes(permissionId)) {
			setValue('permission_ids', current.filter((id) => id !== permissionId));
		} else {
			setValue('permission_ids', [...current, permissionId]);
		}
	};

	const toggleAllInCategory = (category: PermissionCategory) => {
		if (isSystemRole) return;
		const categoryPermIds = category.permissions.map((p) => p.id);
		const allSelected = categoryPermIds.every((id) => selectedPermissionIds.includes(id));

		if (allSelected) {
			setValue('permission_ids', selectedPermissionIds.filter((id) => !categoryPermIds.includes(id)));
		} else {
			const newIds = new Set([...selectedPermissionIds, ...categoryPermIds]);
			setValue('permission_ids', Array.from(newIds));
		}
	};

	const getCategoryStats = (category: PermissionCategory) => {
		const total = category.permissions.length;
		const selected = category.permissions.filter((p) => selectedPermissionIds.includes(p.id)).length;
		return { total, selected };
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-2xl overflow-y-auto">
				<SheetHeader>
					<SheetTitle>
						{isEditing ? (isSystemRole ? 'View Role' : 'Edit Role') : 'Create Role'}
					</SheetTitle>
					<SheetDescription>
						{isSystemRole
							? 'System roles cannot be modified.'
							: isEditing
								? 'Update role name and permissions.'
								: 'Create a new role with specific permissions.'}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
					<div className="space-y-2">
						<Label htmlFor="name">Name *</Label>
						<Input
							id="name"
							{...register('name')}
							disabled={isSystemRole}
							placeholder="e.g., Editor"
						/>
						{errors.name && (
							<p className="text-sm text-destructive">{errors.name.message}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							{...register('description')}
							disabled={isSystemRole}
							placeholder="What can users with this role do?"
							rows={2}
						/>
					</div>

					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label>Permissions</Label>
							<Badge variant="secondary">
								{selectedPermissionIds.length} selected
							</Badge>
						</div>

						{loadingPermissions ? (
							<div className="space-y-2">
								{Array.from({ length: 5 }).map((_, i) => (
									<Skeleton key={i} className="h-12" />
								))}
							</div>
						) : (
							<div className="border rounded-lg divide-y">
								{categories?.map((category) => {
									const isExpanded = expandedCategories.has(category.name);
									const stats = getCategoryStats(category);
									const allSelected = stats.selected === stats.total;
									const someSelected = stats.selected > 0 && stats.selected < stats.total;

									return (
										<div key={category.name}>
											<div
												className="flex items-center gap-3 p-3 hover:bg-accent/30 cursor-pointer"
												onClick={() => toggleCategory(category.name)}
											>
												<Button
													type="button"
													variant="ghost"
													size="icon"
													className="h-6 w-6"
												>
													{isExpanded ? (
														<ChevronDown className="h-4 w-4" />
													) : (
														<ChevronRight className="h-4 w-4" />
													)}
												</Button>

												<Checkbox
													checked={allSelected}
													ref={(ref) => {
														if (ref && someSelected) {
															ref.dataset.state = 'indeterminate';
														}
													}}
													onCheckedChange={() => {
														toggleAllInCategory(category);
													}}
													onClick={(e) => e.stopPropagation()}
													disabled={isSystemRole}
													className={cn(someSelected && 'data-[state=checked]:bg-primary/50')}
												/>

												<span className="font-medium capitalize flex-1">
													{category.name}
												</span>

												<span className="text-sm text-muted-foreground">
													{stats.selected}/{stats.total}
												</span>
											</div>

											{isExpanded && (
												<div className="pl-12 pr-4 pb-3 space-y-2">
													{category.permissions.map((permission) => (
														<label
															key={permission.id}
															className={cn(
																'flex items-start gap-3 p-2 rounded-md cursor-pointer hover:bg-accent/30',
																isSystemRole && 'cursor-default'
															)}
														>
															<Checkbox
																checked={selectedPermissionIds.includes(permission.id)}
																onCheckedChange={() => togglePermission(permission.id)}
																disabled={isSystemRole}
																className="mt-0.5"
															/>
															<div className="flex-1 min-w-0">
																<div className="text-sm font-medium">
																	{permission.name}
																</div>
																{permission.description && (
																	<div className="text-xs text-muted-foreground">
																		{permission.description}
																	</div>
																)}
																<code className="text-xs text-muted-foreground">
																	{permission.codename}
																</code>
															</div>
														</label>
													))}
												</div>
											)}
										</div>
									);
								})}
							</div>
						)}
					</div>

					<SheetFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							{isSystemRole ? 'Close' : 'Cancel'}
						</Button>
						{!isSystemRole && (
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
								{isEditing ? 'Update' : 'Create'}
							</Button>
						)}
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
