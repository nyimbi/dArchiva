// (c) Copyright Datacraft, 2026
/**
 * Group members management component.
 */
import { useState } from 'react';
import { User, UserPlus, Trash2, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useGroupMembers, useAddGroupMembers, useRemoveGroupMember } from '../api';
import { useUsers } from '@/features/users/api';
import type { Group, GroupMember } from '../types';

interface GroupMembersProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	group: Group | null;
}

export function GroupMembers({ open, onOpenChange, group }: GroupMembersProps) {
	const [addDialogOpen, setAddDialogOpen] = useState(false);
	const [search, setSearch] = useState('');
	const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

	const { data: members, isLoading } = useGroupMembers(group?.id ?? '');
	const { data: usersData } = useUsers({ pageSize: 100 });

	const addMembers = useAddGroupMembers(group?.id ?? '');
	const removeMember = useRemoveGroupMember(group?.id ?? '');

	const allUsers = usersData?.items ?? [];
	const memberIds = new Set(members?.map((m) => m.id) ?? []);
	const availableUsers = allUsers.filter((u) => !memberIds.has(u.id) && u.is_active);

	const filteredAvailableUsers = availableUsers.filter(
		(u) =>
			u.username.toLowerCase().includes(search.toLowerCase()) ||
			u.email.toLowerCase().includes(search.toLowerCase()) ||
			(u.first_name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
			(u.last_name?.toLowerCase().includes(search.toLowerCase()) ?? false)
	);

	const handleAddMembers = async () => {
		if (selectedUserIds.length === 0) return;
		await addMembers.mutateAsync(selectedUserIds);
		setSelectedUserIds([]);
		setAddDialogOpen(false);
	};

	const handleRemoveMember = async (userId: string) => {
		await removeMember.mutateAsync(userId);
	};

	const toggleUser = (userId: string) => {
		if (selectedUserIds.includes(userId)) {
			setSelectedUserIds(selectedUserIds.filter((id) => id !== userId));
		} else {
			setSelectedUserIds([...selectedUserIds, userId]);
		}
	};

	const getInitials = (member: GroupMember) => {
		if (member.first_name && member.last_name) {
			return `${member.first_name[0]}${member.last_name[0]}`.toUpperCase();
		}
		return member.username.slice(0, 2).toUpperCase();
	};

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent className="sm:max-w-lg">
					<SheetHeader>
						<SheetTitle>Group Members</SheetTitle>
						<SheetDescription>
							Manage members of "{group?.name}"
						</SheetDescription>
					</SheetHeader>

					<div className="mt-6 space-y-4">
						<div className="flex items-center justify-between">
							<Badge variant="secondary">{members?.length ?? 0} members</Badge>
							<Button size="sm" onClick={() => setAddDialogOpen(true)}>
								<UserPlus className="h-4 w-4 mr-2" />
								Add Members
							</Button>
						</div>

						{isLoading ? (
							<div className="space-y-2">
								{Array.from({ length: 5 }).map((_, i) => (
									<Skeleton key={i} className="h-14" />
								))}
							</div>
						) : members?.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground">
								<User className="h-10 w-10 mx-auto mb-3 opacity-50" />
								<p>No members in this group</p>
							</div>
						) : (
							<div className="space-y-2">
								{members?.map((member) => (
									<div
										key={member.id}
										className="flex items-center gap-3 p-3 border rounded-lg"
									>
										<Avatar className="h-9 w-9">
											<AvatarFallback>{getInitials(member)}</AvatarFallback>
										</Avatar>
										<div className="flex-1 min-w-0">
											<div className="font-medium text-sm">
												{member.first_name && member.last_name
													? `${member.first_name} ${member.last_name}`
													: member.username}
											</div>
											<div className="text-xs text-muted-foreground truncate">
												{member.email}
											</div>
										</div>
										<Button
											variant="ghost"
											size="icon"
											className="h-8 w-8 text-muted-foreground hover:text-destructive"
											onClick={() => handleRemoveMember(member.id)}
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								))}
							</div>
						)}
					</div>
				</SheetContent>
			</Sheet>

			{/* Add members dialog */}
			<Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle>Add Members</DialogTitle>
						<DialogDescription>
							Select users to add to "{group?.name}"
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
							<Input
								placeholder="Search users..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9"
							/>
						</div>

						<div className="border rounded-lg max-h-64 overflow-y-auto">
							{filteredAvailableUsers.length === 0 ? (
								<div className="p-4 text-center text-muted-foreground text-sm">
									No available users found
								</div>
							) : (
								<div className="divide-y">
									{filteredAvailableUsers.map((user) => (
										<label
											key={user.id}
											className="flex items-center gap-3 p-3 hover:bg-accent/30 cursor-pointer"
										>
											<Checkbox
												checked={selectedUserIds.includes(user.id)}
												onCheckedChange={() => toggleUser(user.id)}
											/>
											<Avatar className="h-8 w-8">
												<AvatarFallback className="text-xs">
													{user.first_name && user.last_name
														? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
														: user.username.slice(0, 2).toUpperCase()}
												</AvatarFallback>
											</Avatar>
											<div className="flex-1 min-w-0">
												<div className="text-sm font-medium">
													{user.first_name && user.last_name
														? `${user.first_name} ${user.last_name}`
														: user.username}
												</div>
												<div className="text-xs text-muted-foreground truncate">
													{user.email}
												</div>
											</div>
										</label>
									))}
								</div>
							)}
						</div>
					</div>

					<DialogFooter>
						<Button variant="outline" onClick={() => setAddDialogOpen(false)}>
							Cancel
						</Button>
						<Button
							onClick={handleAddMembers}
							disabled={selectedUserIds.length === 0 || addMembers.isPending}
						>
							Add {selectedUserIds.length > 0 && `(${selectedUserIds.length})`}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
