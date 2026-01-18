// (c) Copyright Datacraft, 2026
/**
 * Group create/edit form component.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useCreateGroup, useUpdateGroup, useGroups } from '../api';
import { useRoles } from '@/features/roles/api';
import type { Group } from '../types';

const groupSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	description: z.string().optional(),
	parent_id: z.string().optional(),
	role_ids: z.array(z.string()),
});

type GroupFormData = z.infer<typeof groupSchema>;

interface GroupFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	group?: Group | null;
}

export function GroupForm({ open, onOpenChange, group }: GroupFormProps) {
	const isEditing = !!group;

	const { data: groupsData } = useGroups({ pageSize: 100 });
	const { data: rolesData } = useRoles({ pageSize: 100 });

	const createGroup = useCreateGroup();
	const updateGroup = useUpdateGroup(group?.id ?? '');

	const {
		register,
		handleSubmit,
		reset,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<GroupFormData>({
		resolver: zodResolver(groupSchema),
		defaultValues: {
			name: '',
			description: '',
			parent_id: undefined,
			role_ids: [],
		},
	});

	const groups = groupsData?.items ?? [];
	const roles = rolesData?.items ?? [];
	const selectedRoleIds = watch('role_ids');
	const parentId = watch('parent_id');

	// Filter out current group and its descendants from parent options
	const availableParents = groups.filter((g) => g.id !== group?.id);

	useEffect(() => {
		if (group) {
			reset({
				name: group.name,
				description: group.description ?? '',
				parent_id: group.parent_id ?? undefined,
				role_ids: group.roles.map((r) => r.id),
			});
		} else {
			reset({
				name: '',
				description: '',
				parent_id: undefined,
				role_ids: [],
			});
		}
	}, [group, reset]);

	const onSubmit = async (data: GroupFormData) => {
		const payload = {
			...data,
			parent_id: data.parent_id || undefined,
		};

		if (isEditing) {
			await updateGroup.mutateAsync(payload);
		} else {
			await createGroup.mutateAsync(payload);
		}
		onOpenChange(false);
	};

	const toggleRole = (roleId: string) => {
		const current = selectedRoleIds || [];
		if (current.includes(roleId)) {
			setValue('role_ids', current.filter((id) => id !== roleId));
		} else {
			setValue('role_ids', [...current, roleId]);
		}
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-lg overflow-y-auto">
				<SheetHeader>
					<SheetTitle>{isEditing ? 'Edit Group' : 'Create Group'}</SheetTitle>
					<SheetDescription>
						{isEditing ? 'Update group details.' : 'Create a new group for organizing users.'}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
					<div className="space-y-2">
						<Label htmlFor="name">Name *</Label>
						<Input id="name" {...register('name')} placeholder="e.g., Marketing Team" />
						{errors.name && (
							<p className="text-sm text-destructive">{errors.name.message}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							{...register('description')}
							placeholder="What is this group for?"
							rows={3}
						/>
					</div>

					{availableParents.length > 0 && (
						<div className="space-y-2">
							<Label htmlFor="parent_id">Parent Group</Label>
							<Select
								value={parentId ?? 'none'}
								onValueChange={(value) => setValue('parent_id', value === 'none' ? undefined : value)}
							>
								<SelectTrigger>
									<SelectValue placeholder="Select parent group" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No parent (top-level)</SelectItem>
									{availableParents.map((g) => (
										<SelectItem key={g.id} value={g.id}>
											{g.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className="text-xs text-muted-foreground">
								Optionally nest this group under another group.
							</p>
						</div>
					)}

					{roles.length > 0 && (
						<div className="space-y-3">
							<Label>Assigned Roles</Label>
							<p className="text-xs text-muted-foreground">
								All members of this group will inherit these roles.
							</p>
							<div className="border rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
								{roles.map((role) => (
									<div key={role.id} className="flex items-center gap-2">
										<Checkbox
											id={`role-${role.id}`}
											checked={selectedRoleIds?.includes(role.id)}
											onCheckedChange={() => toggleRole(role.id)}
										/>
										<label
											htmlFor={`role-${role.id}`}
											className="text-sm cursor-pointer flex-1"
										>
											{role.name}
											{role.is_system && (
												<span className="text-xs text-muted-foreground ml-1">(system)</span>
											)}
										</label>
										{role.description && (
											<span className="text-xs text-muted-foreground truncate max-w-32">
												{role.description}
											</span>
										)}
									</div>
								))}
							</div>
						</div>
					)}

					<SheetFooter>
						<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							{isEditing ? 'Update' : 'Create'}
						</Button>
					</SheetFooter>
				</form>
			</SheetContent>
		</Sheet>
	);
}
