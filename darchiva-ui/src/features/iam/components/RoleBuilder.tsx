// Role Builder - Visual role creation with permission assignment
import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
	Search, Shield, ShieldCheck, ShieldAlert, ChevronDown, ChevronRight,
	Check, X, Zap, Eye, Pencil, Trash2, Settings, Users, FileText,
	FolderOpen, Tag, Workflow, Scan, CreditCard, Lock, AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { usePermissionGroups, useRoleTemplates, useCreateRole, useUpdateRole } from '../api/hooks';
import type { Permission, PermissionGroup, Role, RoleTemplate, PermissionCategory } from '../types';
import '../styles/theme.css';

interface RoleBuilderProps {
	existingRole?: Role;
	onSave?: (role: Role) => void;
	onCancel?: () => void;
}

const CATEGORY_ICONS: Record<string, typeof Shield> = {
	node: FolderOpen,
	document: FileText,
	page: FileText,
	tag: Tag,
	user: Users,
	group: Users,
	role: Shield,
	workflow: Workflow,
	scanning: Scan,
	billing: CreditCard,
	settings: Settings,
	audit: Eye,
	tenant: Lock,
	system: Settings,
};

const CATEGORY_LABELS: Record<string, string> = {
	node: 'Files & Folders',
	document: 'Documents',
	page: 'Pages',
	tag: 'Tags',
	user: 'Users',
	group: 'Groups',
	role: 'Roles',
	workflow: 'Workflows',
	scanning: 'Scanning',
	billing: 'Billing',
	settings: 'Settings',
	audit: 'Audit Logs',
	tenant: 'Tenant',
	system: 'System',
};

export function RoleBuilder({ existingRole, onSave, onCancel }: RoleBuilderProps) {
	const { data: permissionGroups, isLoading: loadingPermissions } = usePermissionGroups();
	const { data: templates } = useRoleTemplates();
	const createRole = useCreateRole();
	const updateRole = useUpdateRole();

	const [name, setName] = useState(existingRole?.name || '');
	const [description, setDescription] = useState(existingRole?.description || '');
	const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
		new Set(existingRole?.permissions.map(p => p.id) || [])
	);
	const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState('');

	// Filter permissions by search
	const filteredGroups = useMemo(() => {
		if (!permissionGroups) return [];
		if (!searchQuery) return permissionGroups;

		const query = searchQuery.toLowerCase();
		return permissionGroups
			.map(group => ({
				...group,
				permissions: group.permissions.filter(
					p => p.name.toLowerCase().includes(query) ||
						p.codename.toLowerCase().includes(query) ||
						p.description?.toLowerCase().includes(query)
				),
			}))
			.filter(group => group.permissions.length > 0);
	}, [permissionGroups, searchQuery]);

	// Permission conflict detection
	const conflicts = useMemo(() => {
		const issues: string[] = [];

		// Check for dangerous permissions without safeguards
		const hasSystemAdmin = selectedPermissions.has('system.admin');
		const hasTenantAdmin = selectedPermissions.has('tenant.admin');

		if (hasSystemAdmin && !hasTenantAdmin) {
			issues.push('System admin without tenant admin may have limited scope');
		}

		// Check for delete without view
		const deletePerms = Array.from(selectedPermissions).filter(p => p.includes('.delete'));
		const viewPerms = Array.from(selectedPermissions).filter(p => p.includes('.view'));

		for (const del of deletePerms) {
			const category = del.split('.')[0];
			const hasView = viewPerms.some(v => v.startsWith(category));
			if (!hasView) {
				issues.push(`Delete permission for ${category} without view permission`);
			}
		}

		return issues;
	}, [selectedPermissions]);

	const toggleCategory = (category: string) => {
		setExpandedCategories(prev => {
			const next = new Set(prev);
			if (next.has(category)) {
				next.delete(category);
			} else {
				next.add(category);
			}
			return next;
		});
	};

	const togglePermission = (permissionId: string) => {
		setSelectedPermissions(prev => {
			const next = new Set(prev);
			if (next.has(permissionId)) {
				next.delete(permissionId);
			} else {
				next.add(permissionId);
			}
			return next;
		});
	};

	const toggleCategoryAll = (group: PermissionGroup) => {
		const allSelected = group.permissions.every(p => selectedPermissions.has(p.id));

		setSelectedPermissions(prev => {
			const next = new Set(prev);
			for (const p of group.permissions) {
				if (allSelected) {
					next.delete(p.id);
				} else {
					next.add(p.id);
				}
			}
			return next;
		});
	};

	const applyTemplate = (template: RoleTemplate) => {
		setSelectedPermissions(new Set(template.permission_ids));
		if (!name) {
			setName(template.name);
		}
	};

	const handleSave = async () => {
		if (!name.trim()) return;

		try {
			if (existingRole) {
				const updated = await updateRole.mutateAsync({
					id: existingRole.id,
					data: {
						name: name.trim(),
						description: description.trim() || undefined,
						permission_ids: Array.from(selectedPermissions),
					},
				});
				onSave?.(updated);
			} else {
				const created = await createRole.mutateAsync({
					name: name.trim(),
					description: description.trim() || undefined,
					permission_ids: Array.from(selectedPermissions),
				});
				onSave?.(created);
			}
		} catch (error) {
			console.error('Failed to save role:', error);
		}
	};

	if (loadingPermissions) {
		return <RoleBuilderSkeleton />;
	}

	return (
		<div className="iam-root flex flex-col h-full">
			{/* Header */}
			<div className="p-6 border-b border-[var(--iam-border-subtle)]">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-xl font-semibold text-[var(--iam-text-primary)]">
						{existingRole ? 'Edit Role' : 'Create Role'}
					</h2>
					<div className="flex gap-2">
						<Button variant="outline" onClick={onCancel}>
							Cancel
						</Button>
						<Button
							onClick={handleSave}
							disabled={!name.trim() || createRole.isPending || updateRole.isPending}
						>
							{existingRole ? 'Update Role' : 'Create Role'}
						</Button>
					</div>
				</div>

				{/* Role info */}
				<div className="grid grid-cols-2 gap-4">
					<div>
						<label className="text-xs text-[var(--iam-text-tertiary)] uppercase tracking-wider mb-1 block">
							Role Name
						</label>
						<Input
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="e.g., Document Reviewer"
							className="bg-[var(--iam-bg-surface)]"
						/>
					</div>
					<div>
						<label className="text-xs text-[var(--iam-text-tertiary)] uppercase tracking-wider mb-1 block">
							Description
						</label>
						<Input
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Optional description"
							className="bg-[var(--iam-bg-surface)]"
						/>
					</div>
				</div>
			</div>

			{/* Templates & Stats */}
			<div className="px-6 py-4 border-b border-[var(--iam-border-subtle)] flex items-center justify-between">
				<div className="flex items-center gap-4">
					{templates && templates.length > 0 && (
						<div className="flex items-center gap-2">
							<span className="text-xs text-[var(--iam-text-tertiary)]">Templates:</span>
							{templates.slice(0, 4).map(template => (
								<button
									key={template.id}
									onClick={() => applyTemplate(template)}
									className="px-3 py-1.5 text-xs rounded-md bg-[var(--iam-bg-surface)] hover:bg-[var(--iam-accent-subtle)] text-[var(--iam-text-secondary)] hover:text-[var(--iam-accent)] transition-colors"
								>
									{template.name}
								</button>
							))}
						</div>
					)}
				</div>

				<div className="flex items-center gap-4">
					<Badge variant="outline" className="gap-1">
						<ShieldCheck className="w-3 h-3" />
						{selectedPermissions.size} permissions
					</Badge>
					{conflicts.length > 0 && (
						<Badge variant="destructive" className="gap-1">
							<AlertTriangle className="w-3 h-3" />
							{conflicts.length} warnings
						</Badge>
					)}
				</div>
			</div>

			{/* Conflicts warning */}
			{conflicts.length > 0 && (
				<div className="px-6 py-3 bg-[var(--iam-warning-muted)] border-b border-[var(--iam-warning)]">
					<div className="flex items-start gap-2">
						<AlertTriangle className="w-4 h-4 text-[var(--iam-warning)] shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-[var(--iam-warning)]">
								Potential permission conflicts
							</p>
							<ul className="text-xs text-[var(--iam-text-secondary)] mt-1 space-y-0.5">
								{conflicts.map((conflict, i) => (
									<li key={i}>{conflict}</li>
								))}
							</ul>
						</div>
					</div>
				</div>
			)}

			{/* Search */}
			<div className="px-6 py-3 border-b border-[var(--iam-border-subtle)]">
				<div className="relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--iam-text-tertiary)]" />
					<Input
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						placeholder="Search permissions..."
						className="pl-9 bg-[var(--iam-bg-surface)]"
					/>
				</div>
			</div>

			{/* Permission Groups */}
			<div className="flex-1 overflow-auto p-6">
				<div className="space-y-3">
					{filteredGroups.map((group) => (
						<PermissionCategoryCard
							key={group.category}
							group={group}
							selectedPermissions={selectedPermissions}
							expanded={expandedCategories.has(group.category)}
							onToggleExpand={() => toggleCategory(group.category)}
							onTogglePermission={togglePermission}
							onToggleAll={() => toggleCategoryAll(group)}
						/>
					))}

					{filteredGroups.length === 0 && (
						<div className="text-center py-12 text-[var(--iam-text-tertiary)]">
							<Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
							<p>No permissions found</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

function PermissionCategoryCard({
	group,
	selectedPermissions,
	expanded,
	onToggleExpand,
	onTogglePermission,
	onToggleAll,
}: {
	group: PermissionGroup;
	selectedPermissions: Set<string>;
	expanded: boolean;
	onToggleExpand: () => void;
	onTogglePermission: (id: string) => void;
	onToggleAll: () => void;
}) {
	const Icon = CATEGORY_ICONS[group.category] || Shield;
	const label = CATEGORY_LABELS[group.category] || group.category;
	const selectedCount = group.permissions.filter(p => selectedPermissions.has(p.id)).length;
	const allSelected = selectedCount === group.permissions.length;
	const someSelected = selectedCount > 0 && !allSelected;

	return (
		<div className="iam-card overflow-hidden">
			{/* Category header */}
			<div
				className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[var(--iam-bg-hover)] transition-colors"
				onClick={onToggleExpand}
			>
				<button className="p-0.5">
					{expanded ? (
						<ChevronDown className="w-4 h-4 text-[var(--iam-text-tertiary)]" />
					) : (
						<ChevronRight className="w-4 h-4 text-[var(--iam-text-tertiary)]" />
					)}
				</button>

				<div className={cn(
					'p-2 rounded-lg',
					selectedCount > 0 ? 'bg-[var(--iam-accent-muted)]' : 'bg-[var(--iam-bg-surface)]'
				)}>
					<Icon className={cn(
						'w-4 h-4',
						selectedCount > 0 ? 'text-[var(--iam-accent)]' : 'text-[var(--iam-text-tertiary)]'
					)} />
				</div>

				<div className="flex-1">
					<span className="font-medium text-[var(--iam-text-primary)]">{label}</span>
					<span className="text-xs text-[var(--iam-text-tertiary)] ml-2">
						{group.permissions.length} permissions
					</span>
				</div>

				<div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
					<span className="text-xs font-mono text-[var(--iam-text-secondary)]">
						{selectedCount}/{group.permissions.length}
					</span>
					<Checkbox
						checked={allSelected}
						onCheckedChange={onToggleAll}
						className={cn(someSelected && 'data-[state=checked]:bg-[var(--iam-accent)]/50')}
					/>
				</div>
			</div>

			{/* Permissions list */}
			{expanded && (
				<div className="border-t border-[var(--iam-border-subtle)] divide-y divide-[var(--iam-border-subtle)]">
					{group.permissions.map((permission) => (
						<PermissionRow
							key={permission.id}
							permission={permission}
							selected={selectedPermissions.has(permission.id)}
							onToggle={() => onTogglePermission(permission.id)}
						/>
					))}
				</div>
			)}
		</div>
	);
}

function PermissionRow({
	permission,
	selected,
	onToggle,
}: {
	permission: Permission;
	selected: boolean;
	onToggle: () => void;
}) {
	return (
		<div
			className={cn(
				'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors',
				selected ? 'bg-[var(--iam-accent-subtle)]' : 'hover:bg-[var(--iam-bg-hover)]'
			)}
			onClick={onToggle}
		>
			<Checkbox checked={selected} onCheckedChange={onToggle} />

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className={cn(
						'text-sm',
						selected ? 'text-[var(--iam-text-primary)]' : 'text-[var(--iam-text-secondary)]'
					)}>
						{permission.name}
					</span>
					{permission.is_dangerous && (
						<Badge variant="destructive" className="text-[9px] px-1.5 py-0">
							Dangerous
						</Badge>
					)}
				</div>
				{permission.description && (
					<p className="text-xs text-[var(--iam-text-tertiary)] truncate">
						{permission.description}
					</p>
				)}
			</div>

			<code className="text-[10px] font-mono text-[var(--iam-text-tertiary)] bg-[var(--iam-bg-surface)] px-1.5 py-0.5 rounded">
				{permission.codename}
			</code>
		</div>
	);
}

function RoleBuilderSkeleton() {
	return (
		<div className="iam-root p-6 animate-pulse">
			<div className="h-8 w-48 bg-[var(--iam-bg-surface)] rounded mb-6" />
			<div className="grid grid-cols-2 gap-4 mb-6">
				<div className="h-10 bg-[var(--iam-bg-surface)] rounded" />
				<div className="h-10 bg-[var(--iam-bg-surface)] rounded" />
			</div>
			<div className="space-y-3">
				{[1, 2, 3, 4].map(i => (
					<div key={i} className="h-16 bg-[var(--iam-bg-surface)] rounded-lg" />
				))}
			</div>
		</div>
	);
}
