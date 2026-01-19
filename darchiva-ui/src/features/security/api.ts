// (c) Copyright Datacraft, 2026
/**
 * Security feature API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
	Role,
	User,
	Department,
	ABACPolicy,
	AuditLogEntry,
	PermissionMatrixCell,
	AccessGraphNode,
	AccessGraphEdge,
	AccessRequest,
	AccessDecision,
} from './types';

const SECURITY_KEYS = {
	roles: ['security', 'roles'] as const,
	role: (id: string) => ['security', 'roles', id] as const,
	users: ['security', 'users'] as const,
	user: (id: string) => ['security', 'users', id] as const,
	departments: ['security', 'departments'] as const,
	policies: ['security', 'policies'] as const,
	policy: (id: string) => ['security', 'policies', id] as const,
	auditLogs: (filters?: AuditFilters) => ['security', 'audit', filters] as const,
	permissionMatrix: ['security', 'matrix'] as const,
	accessGraph: ['security', 'graph'] as const,
};

export interface AuditFilters {
	userId?: string;
	resourceType?: string;
	action?: string;
	outcome?: string;
	startDate?: string;
	endDate?: string;
	page?: number;
	limit?: number;
	[key: string]: string | number | undefined;
}

// Roles
export function useRoles() {
	return useQuery({
		queryKey: SECURITY_KEYS.roles,
		queryFn: () => api.get<Role[]>('/security/roles'),
	});
}

export function useRole(id: string) {
	return useQuery({
		queryKey: SECURITY_KEYS.role(id),
		queryFn: () => api.get<Role>(`/security/roles/${id}`),
		enabled: !!id,
	});
}

export function useCreateRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<Role>) => api.post<Role>('/security/roles', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.roles });
		},
	});
}

export function useUpdateRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<Role> }) =>
			api.patch<Role>(`/security/roles/${id}`, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.role(id) });
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.roles });
		},
	});
}

export function useDeleteRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/security/roles/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.roles });
		},
	});
}

// Users
export function useSecurityUsers(params?: { page?: number; limit?: number; search?: string }) {
	return useQuery({
		queryKey: [...SECURITY_KEYS.users, params],
		queryFn: () => api.get<{ users: User[]; total: number }>('/security/users', { params }),
	});
}

export function useSecurityUser(id: string) {
	return useQuery({
		queryKey: SECURITY_KEYS.user(id),
		queryFn: () => api.get<User>(`/security/users/${id}`),
		enabled: !!id,
	});
}

export function useUpdateUserRoles() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
			api.patch(`/security/users/${userId}/roles`, { roleIds }),
		onSuccess: (_, { userId }) => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.user(userId) });
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.users });
		},
	});
}

export function useBulkUpdateUserRoles() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { userIds: string[]; addRoleIds?: string[]; removeRoleIds?: string[] }) =>
			api.post('/security/users/bulk-roles', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.users });
		},
	});
}

// Departments
export function useDepartments() {
	return useQuery({
		queryKey: SECURITY_KEYS.departments,
		queryFn: () => api.get<Department[]>('/security/departments'),
	});
}

// Policies
export function usePolicies() {
	return useQuery({
		queryKey: SECURITY_KEYS.policies,
		queryFn: () => api.get<ABACPolicy[]>('/security/policies'),
	});
}

export function usePolicy(id: string) {
	return useQuery({
		queryKey: SECURITY_KEYS.policy(id),
		queryFn: () => api.get<ABACPolicy>(`/security/policies/${id}`),
		enabled: !!id,
	});
}

export function useCreatePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<ABACPolicy>) =>
			api.post<ABACPolicy>('/security/policies', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.policies });
		},
	});
}

export function useUpdatePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<ABACPolicy> }) =>
			api.patch<ABACPolicy>(`/security/policies/${id}`, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.policy(id) });
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.policies });
		},
	});
}

// Audit Logs
export function useAuditLogs(filters?: AuditFilters) {
	return useQuery({
		queryKey: SECURITY_KEYS.auditLogs(filters),
		queryFn: () =>
			api.get<{ logs: AuditLogEntry[]; total: number }>('/security/audit-logs', {
				params: filters,
			}),
	});
}

// Permission Matrix
export function usePermissionMatrix() {
	return useQuery({
		queryKey: SECURITY_KEYS.permissionMatrix,
		queryFn: () => api.get<PermissionMatrixCell[]>('/security/permission-matrix'),
	});
}

export function useUpdatePermissionMatrix() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: PermissionMatrixCell) =>
			api.patch('/security/permission-matrix', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.permissionMatrix });
		},
	});
}

// Access Graph
export function useAccessGraph(params?: { userId?: string; resourceId?: string; depth?: number }) {
	return useQuery({
		queryKey: [...SECURITY_KEYS.accessGraph, params],
		queryFn: () =>
			api.get<{ nodes: AccessGraphNode[]; edges: AccessGraphEdge[] }>(
				'/security/access-graph',
				{ params }
			),
	});
}

// Access Check (What-If Analysis)
export function useCheckAccess() {
	return useMutation({
		mutationFn: (request: AccessRequest) =>
			api.post<AccessDecision>('/security/check-access', request),
	});
}

// Bulk User Status Change
export function useBulkUpdateUserStatus() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { userIds: string[]; status: 'active' | 'inactive' | 'locked' }) =>
			api.post('/security/users/bulk-status', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.users });
		},
	});
}

// Bulk Department Assignment
export function useBulkAssignDepartment() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { userIds: string[]; departmentId: string }) =>
			api.post('/security/users/bulk-department', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.users });
		},
	});
}

// Export Users
export async function exportUsers(userIds: string[]): Promise<Blob> {
	const response = await api.post<Blob>(
		'/security/users/export',
		{ userIds },
		{ responseType: 'blob' }
	);
	return response;
}

// Export Audit Logs
export async function exportAuditLogs(filters?: AuditFilters): Promise<Blob> {
	const response = await api.get<Blob>('/security/audit-logs/export', {
		params: filters,
		responseType: 'blob',
	});
	return response;
}

// Resource Types
export function useResourceTypes() {
	return useQuery({
		queryKey: ['security', 'resource-types'],
		queryFn: () => api.get<string[]>('/security/resource-types'),
	});
}

// Resources for Policy Analyzer
export function useSecurityResources(params?: { type?: string; search?: string }) {
	return useQuery({
		queryKey: ['security', 'resources', params],
		queryFn: () =>
			api.get<Array<{ id: string; name: string; type: string }>>(
				'/security/resources',
				{ params }
			),
	});
}

// Re-export PBAC API functions from api/index.ts
export {
	fetchPolicies,
	fetchPolicy,
	createPolicy,
	createPolicyFromDSL,
	updatePolicy,
	deletePolicy,
	validateDSL,
	convertToDSL,
	submitForApproval,
	fetchPendingApprovals,
	approvePolicy,
	rejectPolicy,
	fetchPolicyAnalytics,
	fetchEvaluationLogs,
	fetchEncryptionKeys,
	rotateEncryptionKey,
	fetchDocumentEncryptionInfo,
	requestHiddenAccess,
	fetchPendingAccessRequests,
	approveHiddenAccess,
	denyHiddenAccess,
	grantDepartmentAccess,
	revokeDepartmentAccess,
	fetchUserDepartmentAccess,
} from './api/index';
