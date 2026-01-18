// (c) Copyright Datacraft, 2026
/**
 * User create/edit form component.
 */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import { useCreateUser, useUpdateUser } from '../api';
import { useGroups } from '@/features/groups/api';
import { useRoles } from '@/features/roles/api';
import type { User } from '../types';

const userSchema = z.object({
	username: z.string().min(3, 'Username must be at least 3 characters'),
	email: z.string().email('Invalid email address'),
	password: z.string().min(8, 'Password must be at least 8 characters').optional(),
	first_name: z.string().optional(),
	last_name: z.string().optional(),
	is_active: z.boolean(),
	is_superuser: z.boolean(),
	group_ids: z.array(z.string()),
	role_ids: z.array(z.string()),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user?: User | null;
}

export function UserForm({ open, onOpenChange, user }: UserFormProps) {
	const isEditing = !!user;

	const { data: groupsData } = useGroups({ pageSize: 100 });
	const { data: rolesData } = useRoles({ pageSize: 100 });

	const createUser = useCreateUser();
	const updateUser = useUpdateUser(user?.id ?? '');

	const {
		register,
		handleSubmit,
		reset,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<UserFormData>({
		resolver: zodResolver(userSchema),
		defaultValues: {
			username: '',
			email: '',
			password: '',
			first_name: '',
			last_name: '',
			is_active: true,
			is_superuser: false,
			group_ids: [],
			role_ids: [],
		},
	});

	const groups = groupsData?.items ?? [];
	const roles = rolesData?.items ?? [];
	const selectedGroupIds = watch('group_ids');
	const selectedRoleIds = watch('role_ids');

	useEffect(() => {
		if (user) {
			reset({
				username: user.username,
				email: user.email,
				password: undefined,
				first_name: user.first_name ?? '',
				last_name: user.last_name ?? '',
				is_active: user.is_active,
				is_superuser: user.is_superuser,
				group_ids: user.groups.map((g) => g.id),
				role_ids: user.roles.map((r) => r.id),
			});
		} else {
			reset({
				username: '',
				email: '',
				password: '',
				first_name: '',
				last_name: '',
				is_active: true,
				is_superuser: false,
				group_ids: [],
				role_ids: [],
			});
		}
	}, [user, reset]);

	const onSubmit = async (data: UserFormData) => {
		if (isEditing) {
			const { password, ...rest } = data;
			await updateUser.mutateAsync(rest);
		} else {
			await createUser.mutateAsync({
				...data,
				password: data.password!,
			});
		}
		onOpenChange(false);
	};

	const toggleGroup = (groupId: string) => {
		const current = selectedGroupIds || [];
		if (current.includes(groupId)) {
			setValue('group_ids', current.filter((id) => id !== groupId));
		} else {
			setValue('group_ids', [...current, groupId]);
		}
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
					<SheetTitle>{isEditing ? 'Edit User' : 'Create User'}</SheetTitle>
					<SheetDescription>
						{isEditing ? 'Update user account details.' : 'Create a new user account.'}
					</SheetDescription>
				</SheetHeader>

				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6 mt-6">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="first_name">First Name</Label>
							<Input id="first_name" {...register('first_name')} />
						</div>
						<div className="space-y-2">
							<Label htmlFor="last_name">Last Name</Label>
							<Input id="last_name" {...register('last_name')} />
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="username">Username *</Label>
						<Input id="username" {...register('username')} />
						{errors.username && (
							<p className="text-sm text-destructive">{errors.username.message}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="email">Email *</Label>
						<Input id="email" type="email" {...register('email')} />
						{errors.email && (
							<p className="text-sm text-destructive">{errors.email.message}</p>
						)}
					</div>

					{!isEditing && (
						<div className="space-y-2">
							<Label htmlFor="password">Password *</Label>
							<Input id="password" type="password" {...register('password')} />
							{errors.password && (
								<p className="text-sm text-destructive">{errors.password.message}</p>
							)}
						</div>
					)}

					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<Label htmlFor="is_active">Active</Label>
								<p className="text-sm text-muted-foreground">User can log in</p>
							</div>
							<Switch
								id="is_active"
								checked={watch('is_active')}
								onCheckedChange={(checked) => setValue('is_active', checked)}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<Label htmlFor="is_superuser">Administrator</Label>
								<p className="text-sm text-muted-foreground">Full system access</p>
							</div>
							<Switch
								id="is_superuser"
								checked={watch('is_superuser')}
								onCheckedChange={(checked) => setValue('is_superuser', checked)}
							/>
						</div>
					</div>

					{groups.length > 0 && (
						<div className="space-y-3">
							<Label>Groups</Label>
							<div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
								{groups.map((group) => (
									<div key={group.id} className="flex items-center gap-2">
										<Checkbox
											id={`group-${group.id}`}
											checked={selectedGroupIds?.includes(group.id)}
											onCheckedChange={() => toggleGroup(group.id)}
										/>
										<label
											htmlFor={`group-${group.id}`}
											className="text-sm cursor-pointer"
										>
											{group.name}
										</label>
									</div>
								))}
							</div>
						</div>
					)}

					{roles.length > 0 && (
						<div className="space-y-3">
							<Label>Roles</Label>
							<div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
								{roles.map((role) => (
									<div key={role.id} className="flex items-center gap-2">
										<Checkbox
											id={`role-${role.id}`}
											checked={selectedRoleIds?.includes(role.id)}
											onCheckedChange={() => toggleRole(role.id)}
										/>
										<label
											htmlFor={`role-${role.id}`}
											className="text-sm cursor-pointer"
										>
											{role.name}
											{role.is_system && (
												<span className="text-xs text-muted-foreground ml-1">(system)</span>
											)}
										</label>
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
