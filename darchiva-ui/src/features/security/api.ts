// (c) Copyright Datacraft, 2026
/**
 * Security feature API hooks using React Query.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type {
  ABACPolicy,
  AccessDecision,
  AccessGraphEdge,
  AccessGraphNode,
  AccessRequest,
  AuditLogEntry,
  Department,
  PermissionMatrixCell,
  Role,
  User,
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
		queryFn: async (): Promise<Role[]> => {
			const { data } = await apiClient.get<{ items?: Role[] } | Role[]>('/roles/');
			return Array.isArray(data) ? data : (data as { items?: Role[] }).items ?? [];
		},
	});
}

export function useRole(id: string) {
	return useQuery({
		queryKey: SECURITY_KEYS.role(id),
		queryFn: async (): Promise<Role> => {
			const { data } = await apiClient.get<Role>(`/roles/${id}`);
			return data;
		},
		enabled: !!id,
	});
}

export function useCreateRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: Partial<Role>): Promise<Role> => {
			const { data: result } = await apiClient.post<Role>('/roles/', data);
			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.roles });
		},
	});
}

export function useUpdateRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<Role> }): Promise<Role> => {
			const { data: result } = await apiClient.patch<Role>(`/roles/${id}`, data);
			return result;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.role(id) });
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.roles });
		},
	});
}

export function useDeleteRole() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiClient.delete(`/roles/${id}`),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.roles });
		},
	});
}

// Users
export function useSecurityUsers(params?: { page?: number; limit?: number; search?: string }) {
	return useQuery({
		queryKey: [...SECURITY_KEYS.users, params],
		queryFn: async (): Promise<{ users: User[]; total: number }> => {
			const { data } = await apiClient.get<{ items?: User[]; total?: number } | User[]>('/users/', { params: params as Record<string, unknown> });
			if (Array.isArray(data)) return { users: data, total: data.length };
			return {
				users: (data as { items?: User[] }).items ?? [],
				total: (data as { total?: number }).total ?? 0,
			};
		},
	});
}

export function useSecurityUser(id: string) {
	return useQuery({
		queryKey: SECURITY_KEYS.user(id),
		queryFn: async (): Promise<User> => {
			const { data } = await apiClient.get<User>(`/users/${id}`);
			return data;
		},
		enabled: !!id,
	});
}

export function useUpdateUserRoles() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
			apiClient.patch(`/users/${userId}/roles`, { role_ids: roleIds }),
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
			apiClient.post('/users/bulk-roles', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.users });
		},
	});
}

// Departments
export function useDepartments() {
	return useQuery({
		queryKey: SECURITY_KEYS.departments,
		queryFn: async (): Promise<Department[]> => {
			const { data } = await apiClient.get<Department[] | { items?: Department[] }>('/departments');
			return Array.isArray(data) ? data : (data as { items?: Department[] }).items ?? [];
		},
	});
}

// Policies (PBAC/ABAC)
export function usePolicies() {
	return useQuery({
		queryKey: SECURITY_KEYS.policies,
		queryFn: async (): Promise<ABACPolicy[]> => {
			const { data } = await apiClient.get<{ items?: ABACPolicy[] } | ABACPolicy[]>('/policies');
			return Array.isArray(data) ? data : (data as { items?: ABACPolicy[] }).items ?? [];
		},
	});
}

export function usePolicy(id: string) {
	return useQuery({
		queryKey: SECURITY_KEYS.policy(id),
		queryFn: async (): Promise<ABACPolicy> => {
			const { data } = await apiClient.get<ABACPolicy>(`/policies/${id}`);
			return data;
		},
		enabled: !!id,
	});
}

export function useCreatePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: Partial<ABACPolicy>): Promise<ABACPolicy> => {
			const { data: result } = await apiClient.post<ABACPolicy>('/policies', data);
			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.policies });
		},
	});
}

export function useUpdatePolicy() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<ABACPolicy> }): Promise<ABACPolicy> => {
			const { data: result } = await apiClient.patch<ABACPolicy>(`/policies/${id}`, data);
			return result;
		},
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
		queryFn: async (): Promise<{ logs: AuditLogEntry[]; total: number }> => {
			const { data } = await apiClient.get<{ items?: AuditLogEntry[]; total?: number }>('/audit-logs', {
				params: filters as Record<string, unknown>,
			});
			return {
				logs: data.items ?? [],
				total: data.total ?? 0,
			};
		},
	});
}

// Permission Matrix — backed by /iam/permission-matrix
export function usePermissionMatrix() {
	return useQuery({
		queryKey: SECURITY_KEYS.permissionMatrix,
		queryFn: async (): Promise<PermissionMatrixCell[]> => {
			const { data } = await apiClient.get<PermissionMatrixCell[]>('/iam/permission-matrix');
			return data ?? [];
		},
	});
}

export function useUpdatePermissionMatrix() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: PermissionMatrixCell) => apiClient.patch('/iam/permission-matrix', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.permissionMatrix });
		},
	});
}

// Access Graph — derived from roles + users
export function useAccessGraph(params?: { userId?: string; resourceId?: string; depth?: number }) {
	return useQuery({
		queryKey: [...SECURITY_KEYS.accessGraph, params],
		queryFn: async (): Promise<{ nodes: AccessGraphNode[]; edges: AccessGraphEdge[] }> => {
			const { data } = await apiClient.get<{ nodes: AccessGraphNode[]; edges: AccessGraphEdge[] }>(
				'/policies/access-graph',
				{ params: params as Record<string, unknown> }
			);
			return data ?? { nodes: [], edges: [] };
		},
	});
}

// Access Check (What-If Analysis) — backed by /policies/evaluate
export function useCheckAccess() {
	return useMutation({
		mutationFn: async (request: AccessRequest): Promise<AccessDecision> => {
			const { data } = await apiClient.post<AccessDecision>('/policies/evaluate', request);
			return data;
		},
	});
}

// Bulk User Status Change
export function useBulkUpdateUserStatus() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: { userIds: string[]; status: 'active' | 'inactive' | 'locked' }) =>
			apiClient.post('/users/bulk-status', data),
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
			apiClient.post('/departments/bulk-assign', data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SECURITY_KEYS.users });
		},
	});
}

// Export Users
export async function exportUsers(userIds: string[]): Promise<Blob> {
	const { data } = await apiClient.post<Blob>('/users/export', { user_ids: userIds }, { responseType: 'blob' });
	return data;
}

// Export Audit Logs
export async function exportAuditLogs(filters?: AuditFilters): Promise<Blob> {
	const { data } = await apiClient.get<Blob>('/audit-logs/export', {
		params: filters as Record<string, unknown>,
		responseType: 'blob',
	});
	return data;
}

// Resource Types
export function useResourceTypes() {
	return useQuery({
		queryKey: ['security', 'resource-types'],
		queryFn: async (): Promise<string[]> => {
			const { data } = await apiClient.get<string[]>('/permissions/resource-types');
			return data ?? [];
		},
	});
}

// Resources for Policy Analyzer
export function useSecurityResources(params?: { type?: string; search?: string }) {
	return useQuery({
		queryKey: ['security', 'resources', params],
		queryFn: async (): Promise<Array<{ id: string; name: string; type: string }>> => {
			const { data } = await apiClient.get<Array<{ id: string; name: string; type: string }>>(
				'/nodes/',
				{ params: params as Record<string, unknown> }
			);
			return Array.isArray(data) ? data : [];
		},
	});
}

// Re-export PBAC API functions from api/index.ts
export {
  approveHiddenAccess,approvePolicy,convertToDSL,createPolicy,
  createPolicyFromDSL,deletePolicy,denyHiddenAccess,fetchDocumentEncryptionInfo,fetchEncryptionKeys,fetchEvaluationLogs,fetchPendingAccessRequests,fetchPendingApprovals,fetchPolicies,
  fetchPolicy,fetchPolicyAnalytics,fetchUserDepartmentAccess,grantDepartmentAccess,rejectPolicy,requestHiddenAccess,revokeDepartmentAccess,rotateEncryptionKey,submitForApproval,updatePolicy,validateDSL
} from './api/index';
