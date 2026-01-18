// (c) Copyright Datacraft, 2026
/**
 * Bulk user and role management interface.
 */
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Users,
	Shield,
	Plus,
	Minus,
	Check,
	Search,
	Download,
	Lock,
	UserX,
	UserCheck,
	AlertTriangle,
	Settings,
	Building2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { User, Role, Department } from '../types';

interface BulkManagementProps {
	users: User[];
	roles: Role[];
	departments: Department[];
	onBulkRoleAssign: (userIds: string[], roleIds: string[], action: 'add' | 'remove') => Promise<void>;
	onBulkStatusChange: (userIds: string[], status: 'active' | 'inactive' | 'locked') => Promise<void>;
	onBulkDepartmentAssign: (userIds: string[], departmentId: string) => Promise<void>;
	onExport: (userIds: string[]) => void;
	isLoading?: boolean;
}

type BulkAction = 'add_roles' | 'remove_roles' | 'activate' | 'deactivate' | 'lock' | 'assign_department' | 'export';

const BULK_ACTIONS: { value: BulkAction; label: string; icon: typeof Users; color: string }[] = [
	{ value: 'add_roles', label: 'Add Roles', icon: Plus, color: 'emerald' },
	{ value: 'remove_roles', label: 'Remove Roles', icon: Minus, color: 'amber' },
	{ value: 'activate', label: 'Activate Users', icon: UserCheck, color: 'emerald' },
	{ value: 'deactivate', label: 'Deactivate Users', icon: UserX, color: 'amber' },
	{ value: 'lock', label: 'Lock Accounts', icon: Lock, color: 'red' },
	{ value: 'assign_department', label: 'Assign Department', icon: Building2, color: 'blue' },
	{ value: 'export', label: 'Export Selected', icon: Download, color: 'brass' },
];

export function BulkManagement({
	users,
	roles,
	departments,
	onBulkRoleAssign,
	onBulkStatusChange,
	onBulkDepartmentAssign,
	onExport,
	isLoading: _isLoading,
}: BulkManagementProps) {
	const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
	const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
	const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
	const [selectedAction, setSelectedAction] = useState<BulkAction | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('');
	const [roleFilter, setRoleFilter] = useState<string>('');
	const [showConfirm, setShowConfirm] = useState(false);
	const [processing, setProcessing] = useState(false);

	const filteredUsers = useMemo(() => {
		return users.filter((user) => {
			// Search filter
			if (
				searchQuery &&
				!user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) &&
				!user.email.toLowerCase().includes(searchQuery.toLowerCase())
			) {
				return false;
			}
			// Status filter
			if (statusFilter && user.status !== statusFilter) {
				return false;
			}
			// Role filter
			if (roleFilter && !user.roles.some((r) => r.id === roleFilter)) {
				return false;
			}
			return true;
		});
	}, [users, searchQuery, statusFilter, roleFilter]);

	const toggleUser = useCallback((userId: string) => {
		setSelectedUsers((prev) => {
			const next = new Set(prev);
			if (next.has(userId)) {
				next.delete(userId);
			} else {
				next.add(userId);
			}
			return next;
		});
	}, []);

	const toggleAllUsers = useCallback(() => {
		if (selectedUsers.size === filteredUsers.length) {
			setSelectedUsers(new Set());
		} else {
			setSelectedUsers(new Set(filteredUsers.map((u) => u.id)));
		}
	}, [filteredUsers, selectedUsers]);

	const toggleRole = useCallback((roleId: string) => {
		setSelectedRoles((prev) => {
			const next = new Set(prev);
			if (next.has(roleId)) {
				next.delete(roleId);
			} else {
				next.add(roleId);
			}
			return next;
		});
	}, []);

	const executeAction = useCallback(async () => {
		if (!selectedAction || selectedUsers.size === 0) return;

		setProcessing(true);
		try {
			const userIds = Array.from(selectedUsers);

			switch (selectedAction) {
				case 'add_roles':
					await onBulkRoleAssign(userIds, Array.from(selectedRoles), 'add');
					break;
				case 'remove_roles':
					await onBulkRoleAssign(userIds, Array.from(selectedRoles), 'remove');
					break;
				case 'activate':
					await onBulkStatusChange(userIds, 'active');
					break;
				case 'deactivate':
					await onBulkStatusChange(userIds, 'inactive');
					break;
				case 'lock':
					await onBulkStatusChange(userIds, 'locked');
					break;
				case 'assign_department':
					if (selectedDepartment) {
						await onBulkDepartmentAssign(userIds, selectedDepartment);
					}
					break;
				case 'export':
					onExport(userIds);
					break;
			}

			// Reset selection
			setSelectedUsers(new Set());
			setSelectedRoles(new Set());
			setSelectedAction(null);
			setShowConfirm(false);
		} finally {
			setProcessing(false);
		}
	}, [
		selectedAction,
		selectedUsers,
		selectedRoles,
		selectedDepartment,
		onBulkRoleAssign,
		onBulkStatusChange,
		onBulkDepartmentAssign,
		onExport,
	]);

	const STATUS_BADGES = {
		active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
		inactive: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
		locked: 'bg-red-500/10 text-red-400 border-red-500/30',
	};

	return (
		<div className="space-y-6">
			{/* Action Bar */}
			<div className="glass-card p-4">
				<div className="flex flex-wrap items-center gap-4">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-brass-500/10">
							<Settings className="w-5 h-5 text-brass-400" />
						</div>
						<div>
							<h2 className="font-display font-semibold text-slate-100">
								Bulk Management
							</h2>
							<p className="text-xs text-slate-500 mt-0.5">
								{selectedUsers.size} of {filteredUsers.length} users selected
							</p>
						</div>
					</div>

					<div className="flex-1 flex flex-wrap items-center gap-3 justify-end">
						{/* Search */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
							<input
								type="text"
								placeholder="Search users..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-48 pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50"
							/>
						</div>

						{/* Status Filter */}
						<select
							value={statusFilter}
							onChange={(e) => setStatusFilter(e.target.value)}
							className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200"
						>
							<option value="">All Status</option>
							<option value="active">Active</option>
							<option value="inactive">Inactive</option>
							<option value="locked">Locked</option>
						</select>

						{/* Role Filter */}
						<select
							value={roleFilter}
							onChange={(e) => setRoleFilter(e.target.value)}
							className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200"
						>
							<option value="">All Roles</option>
							{roles.map((role) => (
								<option key={role.id} value={role.id}>
									{role.name}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* Bulk Actions */}
				{selectedUsers.size > 0 && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						className="mt-4 pt-4 border-t border-slate-700/50"
					>
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-sm text-slate-500 mr-2">Apply action:</span>
							{BULK_ACTIONS.map((action) => (
								<button
									key={action.value}
									onClick={() => setSelectedAction(action.value)}
									className={cn(
										'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border',
										selectedAction === action.value
											? `bg-${action.color}-500/20 border-${action.color}-500/50 text-${action.color}-400`
											: 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
									)}
								>
									<action.icon className="w-4 h-4" />
									{action.label}
								</button>
							))}
						</div>
					</motion.div>
				)}
			</div>

			{/* Role Selection Panel (for role actions) */}
			<AnimatePresence>
				{(selectedAction === 'add_roles' || selectedAction === 'remove_roles') && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="glass-card p-4"
					>
						<h3 className="text-sm font-medium text-slate-300 mb-3">
							Select Roles to {selectedAction === 'add_roles' ? 'Add' : 'Remove'}
						</h3>
						<div className="flex flex-wrap gap-2">
							{roles
								.filter((r) => !r.isSystem)
								.map((role) => (
									<button
										key={role.id}
										onClick={() => toggleRole(role.id)}
										className={cn(
											'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border',
											selectedRoles.has(role.id)
												? 'bg-brass-500/20 border-brass-500/50 text-brass-400'
												: 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
										)}
									>
										<Shield className="w-4 h-4" />
										{role.name}
										{selectedRoles.has(role.id) && <Check className="w-3 h-3" />}
									</button>
								))}
						</div>
						<div className="flex items-center justify-end gap-3 mt-4">
							<button
								onClick={() => {
									setSelectedAction(null);
									setSelectedRoles(new Set());
								}}
								className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
							>
								Cancel
							</button>
							<button
								onClick={() => setShowConfirm(true)}
								disabled={selectedRoles.size === 0}
								className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-brass-400 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Apply to {selectedUsers.size} users
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Department Selection Panel */}
			<AnimatePresence>
				{selectedAction === 'assign_department' && (
					<motion.div
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="glass-card p-4"
					>
						<h3 className="text-sm font-medium text-slate-300 mb-3">
							Select Department
						</h3>
						<div className="flex flex-wrap gap-2">
							{departments.map((dept) => (
								<button
									key={dept.id}
									onClick={() => setSelectedDepartment(dept.id)}
									className={cn(
										'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors border',
										selectedDepartment === dept.id
											? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
											: 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
									)}
								>
									<Building2 className="w-4 h-4" />
									{dept.name}
									{selectedDepartment === dept.id && <Check className="w-3 h-3" />}
								</button>
							))}
						</div>
						<div className="flex items-center justify-end gap-3 mt-4">
							<button
								onClick={() => {
									setSelectedAction(null);
									setSelectedDepartment(null);
								}}
								className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200"
							>
								Cancel
							</button>
							<button
								onClick={() => setShowConfirm(true)}
								disabled={!selectedDepartment}
								className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-brass-400 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								Assign to {selectedUsers.size} users
							</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* User List */}
			<div className="glass-card overflow-hidden">
				<table className="w-full">
					<thead>
						<tr className="bg-slate-800/30">
							<th className="px-4 py-3 text-left">
								<label className="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										checked={
											selectedUsers.size > 0 &&
											selectedUsers.size === filteredUsers.length
										}
										onChange={toggleAllUsers}
										className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500/50"
									/>
									<span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
										Select All
									</span>
								</label>
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
								User
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
								Status
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
								Roles
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
								Departments
							</th>
							<th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
								MFA
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-800/50">
						{filteredUsers.map((user) => (
							<motion.tr
								key={user.id}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className={cn(
									'transition-colors',
									selectedUsers.has(user.id)
										? 'bg-brass-500/5'
										: 'hover:bg-slate-800/30'
								)}
							>
								<td className="px-4 py-3">
									<input
										type="checkbox"
										checked={selectedUsers.has(user.id)}
										onChange={() => toggleUser(user.id)}
										className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500/50"
									/>
								</td>
								<td className="px-4 py-3">
									<div className="flex items-center gap-3">
										<div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
											<Users className="w-4 h-4 text-blue-400" />
										</div>
										<div>
											<p className="text-sm font-medium text-slate-200">
												{user.displayName}
											</p>
											<p className="text-xs text-slate-500">{user.email}</p>
										</div>
									</div>
								</td>
								<td className="px-4 py-3">
									<span
										className={cn(
											'inline-flex items-center px-2 py-0.5 rounded text-xs border',
											STATUS_BADGES[user.status]
										)}
									>
										{user.status}
									</span>
								</td>
								<td className="px-4 py-3">
									<div className="flex flex-wrap gap-1">
										{user.roles.slice(0, 3).map((role) => (
											<span
												key={role.id}
												className="px-1.5 py-0.5 bg-brass-500/10 text-brass-400 rounded text-[10px]"
											>
												{role.name}
											</span>
										))}
										{user.roles.length > 3 && (
											<span className="px-1.5 py-0.5 bg-slate-700/50 text-slate-500 rounded text-[10px]">
												+{user.roles.length - 3}
											</span>
										)}
									</div>
								</td>
								<td className="px-4 py-3">
									<div className="flex flex-wrap gap-1">
										{user.departments.slice(0, 2).map((dept) => (
											<span
												key={dept.id}
												className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[10px]"
											>
												{dept.name}
											</span>
										))}
									</div>
								</td>
								<td className="px-4 py-3">
									{user.mfaEnabled ? (
										<Shield className="w-4 h-4 text-emerald-400" />
									) : (
										<Shield className="w-4 h-4 text-slate-600" />
									)}
								</td>
							</motion.tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Confirmation Modal */}
			<AnimatePresence>
				{showConfirm && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm"
						onClick={() => setShowConfirm(false)}
					>
						<motion.div
							initial={{ scale: 0.9, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.9, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
							className="w-full max-w-md bg-slate-800 border border-slate-700/50 rounded-xl p-6 shadow-xl"
						>
							<div className="flex items-center gap-3 mb-4">
								<div className="p-2 rounded-lg bg-amber-500/10">
									<AlertTriangle className="w-5 h-5 text-amber-400" />
								</div>
								<h3 className="font-display font-semibold text-slate-100">
									Confirm Bulk Action
								</h3>
							</div>

							<p className="text-sm text-slate-400 mb-6">
								You are about to apply{' '}
								<span className="text-slate-200 font-medium">
									{BULK_ACTIONS.find((a) => a.value === selectedAction)?.label}
								</span>{' '}
								to <span className="text-brass-400 font-medium">{selectedUsers.size}</span>{' '}
								users. This action cannot be undone.
							</p>

							<div className="flex items-center justify-end gap-3">
								<button
									onClick={() => setShowConfirm(false)}
									className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200"
								>
									Cancel
								</button>
								<button
									onClick={executeAction}
									disabled={processing}
									className="flex items-center gap-2 px-4 py-2 bg-brass-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-brass-400 disabled:opacity-50"
								>
									{processing ? (
										<>
											<motion.div
												animate={{ rotate: 360 }}
												transition={{ repeat: Infinity, duration: 1 }}
												className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full"
											/>
											Processing...
										</>
									) : (
										<>
											<Check className="w-4 h-4" />
											Confirm
										</>
									)}
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
