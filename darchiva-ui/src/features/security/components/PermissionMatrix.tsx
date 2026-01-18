// (c) Copyright Datacraft, 2026
/**
 * Interactive permission matrix for role-based access control.
 * Editable grid showing permissions per role and resource type.
 */
import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Check,
	X,
	Shield,
	ShieldCheck,
	ShieldX,
	Lock,
	Edit3,
	Save,
	RotateCcw,
	Search,
	Filter,
	ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Role, PermissionAction, PermissionMatrixCell } from '../types';

interface PermissionMatrixProps {
	roles: Role[];
	resourceTypes: string[];
	matrix: PermissionMatrixCell[];
	onUpdate: (cell: PermissionMatrixCell) => void;
	isLoading?: boolean;
}

const ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete', 'share', 'approve', 'admin'];

const ACTION_ICONS: Record<PermissionAction, typeof Check> = {
	view: Check,
	create: Edit3,
	edit: Edit3,
	delete: X,
	share: Shield,
	approve: ShieldCheck,
	admin: Lock,
};

const ACTION_COLORS: Record<PermissionAction, string> = {
	view: 'text-emerald-400 bg-emerald-500/10',
	create: 'text-blue-400 bg-blue-500/10',
	edit: 'text-amber-400 bg-amber-500/10',
	delete: 'text-red-400 bg-red-500/10',
	share: 'text-purple-400 bg-purple-500/10',
	approve: 'text-cyan-400 bg-cyan-500/10',
	admin: 'text-brass-400 bg-brass-500/10',
};

export function PermissionMatrix({
	roles,
	resourceTypes,
	matrix,
	onUpdate,
	isLoading: _isLoading,
}: PermissionMatrixProps) {
	const [editMode, setEditMode] = useState(false);
	const [pendingChanges, setPendingChanges] = useState<Map<string, PermissionMatrixCell>>(new Map());
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedActions, setSelectedActions] = useState<Set<PermissionAction>>(new Set(ACTIONS));
	const [expandedRoles, setExpandedRoles] = useState<Set<string>>(new Set());

	// Build matrix lookup
	const matrixLookup = useMemo(() => {
		const lookup = new Map<string, PermissionMatrixCell>();
		matrix.forEach((cell) => {
			const key = `${cell.roleId}:${cell.resourceType}`;
			lookup.set(key, cell);
		});
		pendingChanges.forEach((cell, key) => {
			lookup.set(key, cell);
		});
		return lookup;
	}, [matrix, pendingChanges]);

	// Filter resources by search
	const filteredResources = useMemo(() => {
		if (!searchQuery) return resourceTypes;
		const query = searchQuery.toLowerCase();
		return resourceTypes.filter((r) => r.toLowerCase().includes(query));
	}, [resourceTypes, searchQuery]);

	const getCell = useCallback(
		(roleId: string, resourceType: string): PermissionMatrixCell => {
			const key = `${roleId}:${resourceType}`;
			return (
				matrixLookup.get(key) || {
					roleId,
					resourceType,
					permissions: Object.fromEntries(ACTIONS.map((a) => [a, false])) as Record<PermissionAction, boolean>,
				}
			);
		},
		[matrixLookup]
	);

	const togglePermission = useCallback(
		(roleId: string, resourceType: string, action: PermissionAction) => {
			if (!editMode) return;

			const key = `${roleId}:${resourceType}`;
			const current = getCell(roleId, resourceType);
			const updated: PermissionMatrixCell = {
				...current,
				permissions: {
					...current.permissions,
					[action]: !current.permissions[action],
				},
			};

			setPendingChanges((prev) => new Map(prev).set(key, updated));
		},
		[editMode, getCell]
	);

	const saveChanges = useCallback(() => {
		pendingChanges.forEach((cell) => {
			onUpdate(cell);
		});
		setPendingChanges(new Map());
		setEditMode(false);
	}, [pendingChanges, onUpdate]);

	const discardChanges = useCallback(() => {
		setPendingChanges(new Map());
		setEditMode(false);
	}, []);

	const toggleRoleExpand = useCallback((roleId: string) => {
		setExpandedRoles((prev) => {
			const next = new Set(prev);
			if (next.has(roleId)) {
				next.delete(roleId);
			} else {
				next.add(roleId);
			}
			return next;
		});
	}, []);

	const toggleActionFilter = useCallback((action: PermissionAction) => {
		setSelectedActions((prev) => {
			const next = new Set(prev);
			if (next.has(action)) {
				next.delete(action);
			} else {
				next.add(action);
			}
			return next;
		});
	}, []);

	const visibleActions = useMemo(
		() => ACTIONS.filter((a) => selectedActions.has(a)),
		[selectedActions]
	);

	return (
		<div className="glass-card overflow-hidden">
			{/* Header */}
			<div className="p-4 border-b border-slate-700/50 flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-brass-500/10">
						<Shield className="w-5 h-5 text-brass-400" />
					</div>
					<div>
						<h2 className="font-display font-semibold text-slate-100">Permission Matrix</h2>
						<p className="text-xs text-slate-500 mt-0.5">
							{roles.length} roles × {resourceTypes.length} resources
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					{/* Search */}
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
						<input
							type="text"
							placeholder="Search resources..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="w-48 pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50 focus:border-brass-500/50"
						/>
					</div>

					{/* Action Filter */}
					<div className="relative group">
						<button className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
							<Filter className="w-4 h-4" />
							Actions
							<ChevronDown className="w-3 h-3" />
						</button>
						<div className="absolute right-0 top-full mt-1 p-2 bg-slate-800 border border-slate-700/50 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[160px]">
							{ACTIONS.map((action) => (
								<button
									key={action}
									onClick={() => toggleActionFilter(action)}
									className={cn(
										'w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm capitalize transition-colors',
										selectedActions.has(action)
											? 'text-slate-100 bg-slate-700/50'
											: 'text-slate-400 hover:text-slate-200'
									)}
								>
									<div
										className={cn(
											'w-3 h-3 rounded-sm border transition-colors',
											selectedActions.has(action)
												? 'bg-brass-500 border-brass-500'
												: 'border-slate-600'
										)}
									>
										{selectedActions.has(action) && (
											<Check className="w-3 h-3 text-slate-900" />
										)}
									</div>
									{action}
								</button>
							))}
						</div>
					</div>

					{/* Edit/Save Controls */}
					{editMode ? (
						<div className="flex items-center gap-2">
							<button
								onClick={discardChanges}
								className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
							>
								<RotateCcw className="w-4 h-4" />
								Discard
							</button>
							<button
								onClick={saveChanges}
								disabled={pendingChanges.size === 0}
								className="flex items-center gap-2 px-3 py-2 bg-brass-500 rounded-lg text-sm text-slate-900 font-medium hover:bg-brass-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								<Save className="w-4 h-4" />
								Save ({pendingChanges.size})
							</button>
						</div>
					) : (
						<button
							onClick={() => setEditMode(true)}
							className="flex items-center gap-2 px-3 py-2 bg-brass-500/10 border border-brass-500/30 rounded-lg text-sm text-brass-400 hover:bg-brass-500/20 transition-colors"
						>
							<Edit3 className="w-4 h-4" />
							Edit Matrix
						</button>
					)}
				</div>
			</div>

			{/* Matrix Grid */}
			<div className="overflow-x-auto">
				<table className="w-full">
					<thead>
						<tr className="bg-slate-800/30">
							<th className="sticky left-0 z-10 bg-slate-800/95 backdrop-blur px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider w-48">
								Role / Resource
							</th>
							{filteredResources.map((resource) => (
								<th
									key={resource}
									colSpan={visibleActions.length}
									className="px-2 py-3 text-center text-xs font-medium text-slate-300 uppercase tracking-wider border-l border-slate-700/30"
								>
									{resource.replace(/_/g, ' ')}
								</th>
							))}
						</tr>
						<tr className="bg-slate-800/20">
							<th className="sticky left-0 z-10 bg-slate-800/95 backdrop-blur px-4 py-2" />
							{filteredResources.map((resource) => (
								<>
									{visibleActions.map((action) => (
										<th
											key={`${resource}-${action}`}
											className="px-1 py-2 text-center"
										>
											<div
												className={cn(
													'inline-flex items-center justify-center w-6 h-6 rounded',
													ACTION_COLORS[action]
												)}
												title={action}
											>
												{(() => {
													const Icon = ACTION_ICONS[action];
													return <Icon className="w-3 h-3" />;
												})()}
											</div>
										</th>
									))}
								</>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-800/50">
						{roles.map((role) => (
							<motion.tr
								key={role.id}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								className={cn(
									'group transition-colors',
									role.isSystem ? 'bg-slate-800/10' : 'hover:bg-slate-800/30'
								)}
							>
								<td className="sticky left-0 z-10 bg-slate-900/95 backdrop-blur px-4 py-3 group-hover:bg-slate-800/95 transition-colors">
									<div className="flex items-center gap-3">
										<button
											onClick={() => toggleRoleExpand(role.id)}
											className="p-1 rounded hover:bg-slate-700/50 transition-colors"
										>
											<ChevronDown
												className={cn(
													'w-4 h-4 text-slate-500 transition-transform',
													expandedRoles.has(role.id) && 'rotate-180'
												)}
											/>
										</button>
										<div>
											<div className="flex items-center gap-2">
												<span className="text-sm font-medium text-slate-200">
													{role.name}
												</span>
												{role.isSystem && (
													<span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-700 text-slate-400">
														System
													</span>
												)}
											</div>
											<AnimatePresence>
												{expandedRoles.has(role.id) && (
													<motion.p
														initial={{ height: 0, opacity: 0 }}
														animate={{ height: 'auto', opacity: 1 }}
														exit={{ height: 0, opacity: 0 }}
														className="text-xs text-slate-500 mt-1 overflow-hidden"
													>
														{role.description}
													</motion.p>
												)}
											</AnimatePresence>
										</div>
									</div>
								</td>
								{filteredResources.map((resource) => {
									const cell = getCell(role.id, resource);
									const cellKey = `${role.id}:${resource}`;
									const hasChanges = pendingChanges.has(cellKey);

									return visibleActions.map((action) => {
										const granted = cell.permissions[action];
										return (
											<td
												key={`${role.id}-${resource}-${action}`}
												className={cn(
													'px-1 py-2 text-center transition-colors',
													hasChanges && 'bg-brass-500/5'
												)}
											>
												<button
													onClick={() => togglePermission(role.id, resource, action)}
													disabled={!editMode || role.isSystem}
													className={cn(
														'inline-flex items-center justify-center w-7 h-7 rounded-md transition-all',
														granted
															? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
															: 'bg-slate-800/50 text-slate-600 hover:bg-slate-700/50 hover:text-slate-500',
														editMode && !role.isSystem && 'cursor-pointer',
														(!editMode || role.isSystem) && 'cursor-default'
													)}
													title={`${role.name}: ${action} ${resource}`}
												>
													{granted ? (
														<ShieldCheck className="w-4 h-4" />
													) : (
														<ShieldX className="w-4 h-4" />
													)}
												</button>
											</td>
										);
									});
								})}
							</motion.tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Legend */}
			<div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
				<div className="flex items-center gap-6">
					<span className="text-xs text-slate-500">Legend:</span>
					{ACTIONS.map((action) => {
						const Icon = ACTION_ICONS[action];
						return (
							<div key={action} className="flex items-center gap-1.5">
								<div className={cn('p-1 rounded', ACTION_COLORS[action])}>
									<Icon className="w-3 h-3" />
								</div>
								<span className="text-xs text-slate-400 capitalize">{action}</span>
							</div>
						);
					})}
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-1.5">
						<ShieldCheck className="w-4 h-4 text-emerald-400" />
						<span className="text-xs text-slate-400">Granted</span>
					</div>
					<div className="flex items-center gap-1.5">
						<ShieldX className="w-4 h-4 text-slate-600" />
						<span className="text-xs text-slate-400">Denied</span>
					</div>
				</div>
			</div>
		</div>
	);
}
