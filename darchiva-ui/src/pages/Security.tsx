// (c) Copyright Datacraft, 2026
/**
 * Security management page with multiple tabs.
 */
import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as Tabs from '@radix-ui/react-tabs';
import { toast } from 'sonner';
import {
	Shield,
	Grid3X3,
	GitBranch,
	HelpCircle,
	Activity,
	Users,
	Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	PermissionMatrix,
	AccessGraph,
	PolicyAnalyzer,
	AuditDashboard,
	BulkManagement,
} from '@/features/security';
import {
	useRoles,
	useSecurityUsers,
	useDepartments,
	usePermissionMatrix,
	useUpdatePermissionMatrix,
	useAccessGraph,
	useAuditLogs,
	useCheckAccess,
	useBulkUpdateUserRoles,
	useBulkUpdateUserStatus,
	useBulkAssignDepartment,
	useResourceTypes,
	useSecurityResources,
	exportUsers,
	exportAuditLogs,
	type AuditFilters,
} from '@/features/security/api';
import type {
	PermissionMatrixCell,
	AccessRequest,
	AccessDecision,
} from '@/features/security/types';

const TABS = [
	{ id: 'matrix', label: 'Permission Matrix', icon: Grid3X3 },
	{ id: 'graph', label: 'Access Graph', icon: GitBranch },
	{ id: 'analyzer', label: 'Policy Analyzer', icon: HelpCircle },
	{ id: 'audit', label: 'Audit Log', icon: Activity },
	{ id: 'bulk', label: 'Bulk Management', icon: Users },
];

export function Security() {
	const [activeTab, setActiveTab] = useState('matrix');
	const [auditPage, setAuditPage] = useState(1);
	const [auditFilters, setAuditFilters] = useState<AuditFilters>({});

	// API hooks
	const { data: rolesData, isLoading: rolesLoading } = useRoles();
	const { data: usersData, isLoading: usersLoading } = useSecurityUsers();
	const { data: departmentsData, isLoading: departmentsLoading } = useDepartments();
	const { data: matrixData, isLoading: matrixLoading } = usePermissionMatrix();
	const { data: graphData, isLoading: graphLoading } = useAccessGraph();
	const { data: auditData, isLoading: auditLoading, refetch: refetchAuditLogs } = useAuditLogs({
		...auditFilters,
		page: auditPage,
		limit: 20,
	});
	const { data: resourceTypesData } = useResourceTypes();
	const { data: resourcesData } = useSecurityResources();

	// Mutations
	const updateMatrixMutation = useUpdatePermissionMatrix();
	const checkAccessMutation = useCheckAccess();
	const bulkRolesMutation = useBulkUpdateUserRoles();
	const bulkStatusMutation = useBulkUpdateUserStatus();
	const bulkDepartmentMutation = useBulkAssignDepartment();

	// Extracted data
	const roles = rolesData ?? [];
	const users = usersData?.users ?? [];
	const departments = departmentsData ?? [];
	const matrix = matrixData ?? [];
	const graphNodes = graphData?.nodes ?? [];
	const graphEdges = graphData?.edges ?? [];
	const auditLogs = auditData?.logs ?? [];
	const auditTotal = auditData?.total ?? 0;
	const resourceTypes = resourceTypesData ?? [
		'documents',
		'folders',
		'workflows',
		'users',
		'roles',
		'settings',
		'audit_logs',
	];
	const resources = resourcesData ?? [];

	const handleMatrixUpdate = useCallback(
		async (cell: PermissionMatrixCell) => {
			try {
				await updateMatrixMutation.mutateAsync(cell);
				toast.success('Permission updated');
			} catch (error) {
				toast.error('Failed to update permission');
			}
		},
		[updateMatrixMutation]
	);

	const handleAnalyze = useCallback(
		async (request: AccessRequest): Promise<AccessDecision> => {
			try {
				const result = await checkAccessMutation.mutateAsync(request);
				return result;
			} catch (error) {
				return {
					allowed: false,
					reason: 'Error evaluating access request',
					matchedPolicies: [],
					evaluationTime: 0,
				};
			}
		},
		[checkAccessMutation]
	);

	const handleBulkRoleAssign = useCallback(
		async (userIds: string[], roleIds: string[], action: 'add' | 'remove') => {
			try {
				await bulkRolesMutation.mutateAsync({
					userIds,
					addRoleIds: action === 'add' ? roleIds : undefined,
					removeRoleIds: action === 'remove' ? roleIds : undefined,
				});
				toast.success(`Roles ${action === 'add' ? 'assigned' : 'removed'} successfully`);
			} catch (error) {
				toast.error('Failed to update roles');
			}
		},
		[bulkRolesMutation]
	);

	const handleBulkStatusChange = useCallback(
		async (userIds: string[], status: 'active' | 'inactive' | 'locked') => {
			try {
				await bulkStatusMutation.mutateAsync({ userIds, status });
				toast.success('User status updated');
			} catch (error) {
				toast.error('Failed to update status');
			}
		},
		[bulkStatusMutation]
	);

	const handleBulkDepartmentAssign = useCallback(
		async (userIds: string[], departmentId: string) => {
			try {
				await bulkDepartmentMutation.mutateAsync({ userIds, departmentId });
				toast.success('Department assignment updated');
			} catch (error) {
				toast.error('Failed to assign department');
			}
		},
		[bulkDepartmentMutation]
	);

	const handleExportUsers = useCallback(async (userIds: string[]) => {
		try {
			const blob = await exportUsers(userIds);
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success('Users exported successfully');
		} catch (error) {
			toast.error('Failed to export users');
		}
	}, []);

	const handleExportAuditLogs = useCallback(async () => {
		try {
			const blob = await exportAuditLogs(auditFilters);
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success('Audit logs exported successfully');
		} catch (error) {
			toast.error('Failed to export audit logs');
		}
	}, [auditFilters]);

	const handleRefreshAuditLogs = useCallback(() => {
		refetchAuditLogs();
		toast.success('Audit logs refreshed');
	}, [refetchAuditLogs]);

	const isLoading = rolesLoading || usersLoading || departmentsLoading;

	return (
		<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
			{/* Page Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="p-2 rounded-lg bg-brass-500/10">
						<Shield className="w-6 h-6 text-brass-400" />
					</div>
					<div>
						<h1 className="text-2xl font-display font-semibold text-slate-100">
							Security & Permissions
						</h1>
						<p className="text-sm text-slate-500 mt-1">
							Manage access control, policies, and audit logs
						</p>
					</div>
				</div>
			</div>

			{/* Tabs */}
			<Tabs.Root value={activeTab} onValueChange={setActiveTab}>
				<Tabs.List className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-xl border border-slate-700/50 w-fit">
					{TABS.map((tab) => (
						<Tabs.Trigger
							key={tab.id}
							value={tab.id}
							className={cn(
								'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
								activeTab === tab.id
									? 'bg-brass-500 text-slate-900'
									: 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
							)}
						>
							<tab.icon className="w-4 h-4" />
							{tab.label}
						</Tabs.Trigger>
					))}
				</Tabs.List>

				<div className="mt-6">
					<Tabs.Content value="matrix">
						{matrixLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : (
							<PermissionMatrix
								roles={roles}
								resourceTypes={resourceTypes}
								matrix={matrix}
								onUpdate={handleMatrixUpdate}
							/>
						)}
					</Tabs.Content>

					<Tabs.Content value="graph">
						{graphLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : (
							<AccessGraph nodes={graphNodes} edges={graphEdges} />
						)}
					</Tabs.Content>

					<Tabs.Content value="analyzer">
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : (
							<PolicyAnalyzer
								users={users}
								resources={resources}
								onAnalyze={handleAnalyze}
							/>
						)}
					</Tabs.Content>

					<Tabs.Content value="audit">
						{auditLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : (
							<AuditDashboard
								logs={auditLogs}
								total={auditTotal}
								page={auditPage}
								limit={20}
								onPageChange={setAuditPage}
								onFilterChange={setAuditFilters}
								onExport={handleExportAuditLogs}
								onRefresh={handleRefreshAuditLogs}
							/>
						)}
					</Tabs.Content>

					<Tabs.Content value="bulk">
						{isLoading ? (
							<div className="flex items-center justify-center py-12">
								<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
							</div>
						) : (
							<BulkManagement
								users={users}
								roles={roles}
								departments={departments}
								onBulkRoleAssign={handleBulkRoleAssign}
								onBulkStatusChange={handleBulkStatusChange}
								onBulkDepartmentAssign={handleBulkDepartmentAssign}
								onExport={handleExportUsers}
							/>
						)}
					</Tabs.Content>
				</div>
			</Tabs.Root>
		</motion.div>
	);
}
