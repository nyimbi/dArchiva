// IAM API Hooks
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type {
  AccessEvent,
  BulkUserOperation,
  CreateGroupInput,
  CreateRoleInput,
  Department,
  Group,GroupMember,
  IAMStats,IAMUser,
  InviteUserInput,
  Permission,PermissionGroup,
  PermissionMatrixRow,
  Role,
  RoleTemplate,
  UpdateRoleInput,
  UserHomeData,
  UserInvitation,
  UserSession,
  WorkflowTask,
} from '../types';

// Keys
const keys = {
	stats: ['iam', 'stats'] as const,
	users: (params?: Record<string, unknown>) => ['iam', 'users', params] as const,
	user: (id: string) => ['iam', 'user', id] as const,
	userSessions: (id: string) => ['iam', 'user', id, 'sessions'] as const,
	roles: (params?: Record<string, unknown>) => ['iam', 'roles', params] as const,
	role: (id: string) => ['iam', 'role', id] as const,
	roleTemplates: ['iam', 'role-templates'] as const,
	permissions: ['iam', 'permissions'] as const,
	permissionGroups: ['iam', 'permission-groups'] as const,
	groups: (params?: Record<string, unknown>) => ['iam', 'groups', params] as const,
	groupTree: ['iam', 'group-tree'] as const,
	group: (id: string) => ['iam', 'group', id] as const,
	groupMembers: (id: string) => ['iam', 'group', id, 'members'] as const,
	departments: ['iam', 'departments'] as const,
	departmentTree: ['iam', 'department-tree'] as const,
	accessEvents: (params?: Record<string, unknown>) => ['iam', 'access-events', params] as const,
	invitations: ['iam', 'invitations'] as const,
	permissionMatrix: (params?: Record<string, unknown>) => ['iam', 'permission-matrix', params] as const,
	// User home
	userHome: ['user', 'home'] as const,
	userTasks: ['user', 'tasks'] as const,
	userNotifications: ['user', 'notifications'] as const,
};

// IAM Stats
export function useIAMStats() {
	return useQuery({
		queryKey: keys.stats,
		queryFn: () => apiClient.get<IAMStats>('/iam/stats').then(r => r.data),
		staleTime: 30_000,
	});
}

// Users
export function useIAMUsers(params?: { page?: number; pageSize?: number; search?: string; status?: string; role_id?: string; group_id?: string; department_id?: string }) {
	return useQuery({
		queryKey: keys.users(params),
		queryFn: () => apiClient.get<{ items: IAMUser[]; total: number }>('/iam/users', { params }).then(r => r.data),
	});
}

export function useIAMUser(id: string) {
	return useQuery({
		queryKey: keys.user(id),
		queryFn: () => apiClient.get<IAMUser>(`/iam/users/${id}`).then(r => r.data),
		enabled: !!id,
	});
}

export function useUserSessions(userId: string) {
	return useQuery({
		queryKey: keys.userSessions(userId),
		queryFn: () => apiClient.get<UserSession[]>(`/iam/users/${userId}/sessions`).then(r => r.data),
		enabled: !!userId,
	});
}

export function useRevokeSession() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, sessionId }: { userId: string; sessionId: string }) =>
			apiClient.delete(`/iam/users/${userId}/sessions/${sessionId}`),
		onSuccess: (_, { userId }) => {
			qc.invalidateQueries({ queryKey: keys.userSessions(userId) });
		},
	});
}

export function useRevokeAllSessions() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (userId: string) => apiClient.delete(`/iam/users/${userId}/sessions`),
		onSuccess: (_, userId) => {
			qc.invalidateQueries({ queryKey: keys.userSessions(userId) });
		},
	});
}

export function useBulkUserOperation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: BulkUserOperation) => apiClient.post('/iam/users/bulk', data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['iam', 'users'] });
			qc.invalidateQueries({ queryKey: keys.stats });
		},
	});
}

// Roles
export function useRoles(params?: { page?: number; pageSize?: number; search?: string; is_system?: boolean }) {
	return useQuery({
		queryKey: keys.roles(params),
		queryFn: () => apiClient.get<{ items: Role[]; total: number }>('/iam/roles', { params }).then(r => r.data),
	});
}

export function useRole(id: string) {
	return useQuery({
		queryKey: keys.role(id),
		queryFn: () => apiClient.get<Role>(`/iam/roles/${id}`).then(r => r.data),
		enabled: !!id,
	});
}

export function useRoleTemplates() {
	return useQuery({
		queryKey: keys.roleTemplates,
		queryFn: () => apiClient.get<RoleTemplate[]>('/iam/roles/templates').then(r => r.data),
	});
}

export function useCreateRole() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateRoleInput) => apiClient.post<Role>('/iam/roles', data).then(r => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['iam', 'roles'] });
			qc.invalidateQueries({ queryKey: keys.stats });
		},
	});
}

export function useUpdateRole() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateRoleInput }) =>
			apiClient.patch<Role>(`/iam/roles/${id}`, data).then(r => r.data),
		onSuccess: (_, { id }) => {
			qc.invalidateQueries({ queryKey: keys.role(id) });
			qc.invalidateQueries({ queryKey: ['iam', 'roles'] });
		},
	});
}

export function useDeleteRole() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiClient.delete(`/iam/roles/${id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['iam', 'roles'] });
			qc.invalidateQueries({ queryKey: keys.stats });
		},
	});
}

export function useCloneRole() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ roleId, newName }: { roleId: string; newName: string }) =>
			apiClient.post<Role>(`/iam/roles/${roleId}/clone`, { name: newName }).then(r => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['iam', 'roles'] });
		},
	});
}

// Permissions
export function usePermissions() {
	return useQuery({
		queryKey: keys.permissions,
		queryFn: () => apiClient.get<Permission[]>('/iam/permissions').then(r => r.data),
		staleTime: 300_000, // Permissions rarely change
	});
}

export function usePermissionGroups() {
	return useQuery({
		queryKey: keys.permissionGroups,
		queryFn: () => apiClient.get<PermissionGroup[]>('/iam/permissions/grouped').then(r => r.data),
		staleTime: 300_000,
	});
}

// Groups
export function useGroups(params?: { page?: number; pageSize?: number; search?: string; parent_id?: string }) {
	return useQuery({
		queryKey: keys.groups(params),
		queryFn: () => apiClient.get<{ items: Group[]; total: number }>('/iam/groups', { params }).then(r => r.data),
	});
}

export function useGroupTree() {
	return useQuery({
		queryKey: keys.groupTree,
		queryFn: () => apiClient.get<Group[]>('/iam/groups/tree').then(r => r.data),
	});
}

export function useGroup(id: string) {
	return useQuery({
		queryKey: keys.group(id),
		queryFn: () => apiClient.get<Group>(`/iam/groups/${id}`).then(r => r.data),
		enabled: !!id,
	});
}

export function useGroupMembers(groupId: string, params?: { include_inherited?: boolean }) {
	return useQuery({
		queryKey: keys.groupMembers(groupId),
		queryFn: () => apiClient.get<GroupMember[]>(`/iam/groups/${groupId}/members`, { params }).then(r => r.data),
		enabled: !!groupId,
	});
}

export function useCreateGroup() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateGroupInput) => apiClient.post<Group>('/iam/groups', data).then(r => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['iam', 'groups'] });
			qc.invalidateQueries({ queryKey: keys.groupTree });
			qc.invalidateQueries({ queryKey: keys.stats });
		},
	});
}

export function useAddGroupMembers() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ groupId, userIds }: { groupId: string; userIds: string[] }) =>
			apiClient.post(`/iam/groups/${groupId}/members`, { user_ids: userIds }),
		onSuccess: (_, { groupId }) => {
			qc.invalidateQueries({ queryKey: keys.groupMembers(groupId) });
			qc.invalidateQueries({ queryKey: keys.group(groupId) });
		},
	});
}

export function useRemoveGroupMember() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
			apiClient.delete(`/iam/groups/${groupId}/members/${userId}`),
		onSuccess: (_, { groupId }) => {
			qc.invalidateQueries({ queryKey: keys.groupMembers(groupId) });
			qc.invalidateQueries({ queryKey: keys.group(groupId) });
		},
	});
}

// Departments
export function useDepartments() {
	return useQuery({
		queryKey: keys.departments,
		queryFn: () => apiClient.get<Department[]>('/iam/departments').then(r => r.data),
	});
}

export function useDepartmentTree() {
	return useQuery({
		queryKey: keys.departmentTree,
		queryFn: () => apiClient.get<Department[]>('/iam/departments/tree').then(r => r.data),
	});
}

// All active sessions (admin view)
export function useActiveSessions(params?: { page?: number; pageSize?: number }) {
	return useQuery({
		queryKey: ['iam', 'sessions', 'active', params] as const,
		queryFn: () => apiClient.get<{ items: UserSession[]; total: number }>('/iam/sessions', {
			params: { ...params, active: true },
		}).then(r => r.data),
	});
}

// Access Events / Audit
export function useAccessEvents(params?: { page?: number; pageSize?: number; user_id?: string; action?: string; start_date?: string; end_date?: string }) {
	return useQuery({
		queryKey: keys.accessEvents(params),
		queryFn: () => apiClient.get<{ items: AccessEvent[]; total: number }>('/iam/access-events', { params }).then(r => r.data),
	});
}

// Invitations
export function useInvitations() {
	return useQuery({
		queryKey: keys.invitations,
		queryFn: () => apiClient.get<UserInvitation[]>('/iam/invitations').then(r => r.data),
	});
}

export function useInviteUser() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: InviteUserInput) => apiClient.post<UserInvitation>('/iam/invitations', data).then(r => r.data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.invitations });
			qc.invalidateQueries({ queryKey: keys.stats });
		},
	});
}

export function useRevokeInvitation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiClient.delete(`/iam/invitations/${id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.invitations });
		},
	});
}

export function useResendInvitation() {
	return useMutation({
		mutationFn: (id: string) => apiClient.post(`/iam/invitations/${id}/resend`),
	});
}

// Permission Matrix
export function usePermissionMatrix(params?: { resource_type?: string; entity_type?: 'user' | 'group' }) {
	return useQuery({
		queryKey: keys.permissionMatrix(params),
		queryFn: () => apiClient.get<PermissionMatrixRow[]>('/iam/permission-matrix', { params }).then(r => r.data),
	});
}

export function useUpdatePermissionCell() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { entity_type: 'user' | 'group'; entity_id: string; resource: string; level: string }) =>
			apiClient.patch('/iam/permission-matrix', data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['iam', 'permission-matrix'] });
		},
	});
}

// User Home / Dashboard
export function useUserHome() {
	return useQuery({
		queryKey: keys.userHome,
		queryFn: () => apiClient.get<UserHomeData>('/users/me/home').then(r => r.data),
		staleTime: 60_000,
	});
}

export function useUserTasks(params?: { status?: string; priority?: string }) {
	return useQuery({
		queryKey: [...keys.userTasks, params],
		queryFn: () => apiClient.get<WorkflowTask[]>('/workflows/tasks/assigned', { params }).then(r => r.data),
	});
}

export function useCompleteTask() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ taskId, action, comment }: { taskId: string; action: 'approve' | 'reject' | 'complete'; comment?: string }) =>
			apiClient.post(`/workflows/tasks/${taskId}/${action}`, { comment }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.userTasks });
			qc.invalidateQueries({ queryKey: keys.userHome });
		},
	});
}

export function useUserNotifications() {
	return useQuery({
		queryKey: keys.userNotifications,
		queryFn: () => apiClient.get<{ items: import('../types').UserNotification[]; unread_count: number }>('/notifications').then(r => r.data),
		refetchInterval: 30_000,
	});
}

export function useMarkNotificationRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiClient.patch(`/notifications/${id}/read`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.userNotifications });
		},
	});
}

export function useMarkAllNotificationsRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => apiClient.post('/notifications/read-all'),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.userNotifications });
		},
	});
}

// Favorites
export function useAddFavorite() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { item_type: string; item_id: string; title: string }) =>
			apiClient.post('/users/me/favorites', data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.userHome });
		},
	});
}

export function useRemoveFavorite() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiClient.delete(`/users/me/favorites/${id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.userHome });
		},
	});
}
