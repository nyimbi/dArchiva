// Users & Access Settings - Manage users, groups, and roles
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useStore } from '@/hooks/useStore';
import { UserList } from '@/features/users';
import { GroupList } from '@/features/groups';
import { RoleList } from '@/features/roles';
import {
	UsersIcon,
	UserGroupIcon,
	ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import type { User } from '@/features/users/types';
import type { Group } from '@/features/groups/types';
import type { Role } from '@/features/roles/types';

type Tab = 'users' | 'groups' | 'roles';

const TABS: { id: Tab; label: string; icon: typeof UsersIcon; description: string }[] = [
	{ id: 'users', label: 'Users', icon: UsersIcon, description: 'Manage user accounts and permissions' },
	{ id: 'groups', label: 'Groups', icon: UserGroupIcon, description: 'Organize users into groups' },
	{ id: 'roles', label: 'Roles', icon: ShieldCheckIcon, description: 'Define permission sets' },
];

export function UsersAccessSettings() {
	const [activeTab, setActiveTab] = useState<Tab>('users');
	const { openModal } = useStore();

	const handleCreateUser = () => {
		openModal('create-user');
	};

	const handleEditUser = (user: User) => {
		openModal('edit-user', user);
	};

	const handleCreateGroup = () => {
		openModal('create-group');
	};

	const handleEditGroup = (group: Group) => {
		openModal('edit-group', group);
	};

	const handleViewGroupMembers = (group: Group) => {
		openModal('view-group-members', group);
	};

	const handleCreateRole = () => {
		openModal('create-role');
	};

	const handleEditRole = (role: Role) => {
		openModal('edit-role', role);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div>
				<h2 className="text-xl font-semibold text-white">Users & Access</h2>
				<p className="text-sm text-slate-400 mt-1">
					Manage user accounts, organize them into groups, and define roles with specific permissions.
				</p>
			</div>

			{/* Tab Navigation */}
			<div className="border-b border-slate-700/50">
				<nav className="flex gap-1" aria-label="Tabs">
					{TABS.map((tab) => {
						const Icon = tab.icon;
						const isActive = activeTab === tab.id;
						return (
							<button
								key={tab.id}
								onClick={() => setActiveTab(tab.id)}
								className={cn(
									'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
									isActive
										? 'border-cyan-400 text-cyan-400'
										: 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
								)}
							>
								<Icon className="w-4 h-4" />
								{tab.label}
							</button>
						);
					})}
				</nav>
			</div>

			{/* Tab Description */}
			<p className="text-xs text-slate-500 font-mono">
				// {TABS.find(t => t.id === activeTab)?.description}
			</p>

			{/* Tab Content */}
			<div className="min-h-[500px]">
				{activeTab === 'users' && (
					<UserList
						onCreateUser={handleCreateUser}
						onEditUser={handleEditUser}
					/>
				)}
				{activeTab === 'groups' && (
					<GroupList
						onCreateGroup={handleCreateGroup}
						onEditGroup={handleEditGroup}
						onViewMembers={handleViewGroupMembers}
					/>
				)}
				{activeTab === 'roles' && (
					<RoleList
						onCreateRole={handleCreateRole}
						onEditRole={handleEditRole}
					/>
				)}
			</div>
		</div>
	);
}
