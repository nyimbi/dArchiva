// IAM API Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
	IAMStats, IAMUser, Role, Permission, PermissionGroup, Group, GroupMember,
	UserSession, AccessEvent, UserInvitation, Department, RoleTemplate,
	PermissionMatrixRow, UserHomeData, WorkflowTask, BulkUserOperation,
	CreateRoleInput, UpdateRoleInput, InviteUserInput, CreateGroupInput,
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
		queryFn: () => api.get<IAMStats>('/api/iam/stats'),
		staleTime: 30_000,
	});
}

// Users
export function useIAMUsers(params?: { page?: number; pageSize?: number; search?: string; status?: string; role_id?: string; group_id?: string; department_id?: string }) {
	return useQuery({
		queryKey: keys.users(params),
		queryFn: () => api.get<{ items: IAMUser[]; total: number }>('/api/iam/users', { params }),
	});
}

export function useIAMUser(id: string) {
	return useQuery({
		queryKey: keys.user(id),
		queryFn: () => api.get<IAMUser>(`/api/iam/users/${id}`),
		enabled: !!id,
	});
}

export function useUserSessions(userId: string) {
	return useQuery({
		queryKey: keys.userSessions(userId),
		queryFn: () => api.get<UserSession[]>(`/api/iam/users/${userId}/sessions`),
		enabled: !!userId,
	});
}

export function useRevokeSession() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ userId, sessionId }: { userId: string; sessionId: string }) =>
			api.delete(`/api/iam/users/${userId}/sessions/${sessionId}`),
		onSuccess: (_, { userId }) => {
			qc.invalidateQueries({ queryKey: keys.userSessions(userId) });
		},
	});
}

export function useRevokeAllSessions() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (userId: string) => api.delete(`/api/iam/users/${userId}/sessions`),
		onSuccess: (_, userId) => {
			qc.invalidateQueries({ queryKey: keys.userSessions(userId) });
		},
	});
}

export function useBulkUserOperation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: BulkUserOperation) => api.post('/api/iam/users/bulk', data),
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
		queryFn: () => api.get<{ items: Role[]; total: number }>('/api/iam/roles', { params }),
	});
}

export function useRole(id: string) {
	return useQuery({
		queryKey: keys.role(id),
		queryFn: () => api.get<Role>(`/api/iam/roles/${id}`),
		enabled: !!id,
	});
}

export function useRoleTemplates() {
	return useQuery({
		queryKey: keys.roleTemplates,
		queryFn: () => api.get<RoleTemplate[]>('/api/iam/roles/templates'),
	});
}

export function useCreateRole() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateRoleInput) => api.post<Role>('/api/iam/roles', data),
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
			api.patch<Role>(`/api/iam/roles/${id}`, data),
		onSuccess: (_, { id }) => {
			qc.invalidateQueries({ queryKey: keys.role(id) });
			qc.invalidateQueries({ queryKey: ['iam', 'roles'] });
		},
	});
}

export function useDeleteRole() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/api/iam/roles/${id}`),
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
			api.post<Role>(`/api/iam/roles/${roleId}/clone`, { name: newName }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['iam', 'roles'] });
		},
	});
}

// Permissions
export function usePermissions() {
	return useQuery({
		queryKey: keys.permissions,
		queryFn: () => api.get<Permission[]>('/api/iam/permissions'),
		staleTime: 300_000, // Permissions rarely change
	});
}

export function usePermissionGroups() {
	return useQuery({
		queryKey: keys.permissionGroups,
		queryFn: () => api.get<PermissionGroup[]>('/api/iam/permissions/grouped'),
		staleTime: 300_000,
	});
}

// Groups
export function useGroups(params?: { page?: number; pageSize?: number; search?: string; parent_id?: string }) {
	return useQuery({
		queryKey: keys.groups(params),
		queryFn: () => api.get<{ items: Group[]; total: number }>('/api/iam/groups', { params }),
	});
}

export function useGroupTree() {
	return useQuery({
		queryKey: keys.groupTree,
		queryFn: () => api.get<Group[]>('/api/iam/groups/tree'),
	});
}

export function useGroup(id: string) {
	return useQuery({
		queryKey: keys.group(id),
		queryFn: () => api.get<Group>(`/api/iam/groups/${id}`),
		enabled: !!id,
	});
}

export function useGroupMembers(groupId: string, params?: { include_inherited?: boolean }) {
	return useQuery({
		queryKey: keys.groupMembers(groupId),
		queryFn: () => api.get<GroupMember[]>(`/api/iam/groups/${groupId}/members`, { params }),
		enabled: !!groupId,
	});
}

export function useCreateGroup() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: CreateGroupInput) => api.post<Group>('/api/iam/groups', data),
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
			api.post(`/api/iam/groups/${groupId}/members`, { user_ids: userIds }),
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
			api.delete(`/api/iam/groups/${groupId}/members/${userId}`),
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
		queryFn: () => api.get<Department[]>('/api/iam/departments'),
	});
}

export function useDepartmentTree() {
	return useQuery({
		queryKey: keys.departmentTree,
		queryFn: () => api.get<Department[]>('/api/iam/departments/tree'),
	});
}

// Access Events / Audit
export function useAccessEvents(params?: { page?: number; pageSize?: number; user_id?: string; action?: string; start_date?: string; end_date?: string }) {
	return useQuery({
		queryKey: keys.accessEvents(params),
		queryFn: () => api.get<{ items: AccessEvent[]; total: number }>('/api/iam/access-events', { params }),
	});
}

// Invitations
export function useInvitations() {
	return useQuery({
		queryKey: keys.invitations,
		queryFn: () => api.get<UserInvitation[]>('/api/iam/invitations'),
	});
}

export function useInviteUser() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: InviteUserInput) => api.post<UserInvitation>('/api/iam/invitations', data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.invitations });
			qc.invalidateQueries({ queryKey: keys.stats });
		},
	});
}

export function useRevokeInvitation() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/api/iam/invitations/${id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.invitations });
		},
	});
}

export function useResendInvitation() {
	return useMutation({
		mutationFn: (id: string) => api.post(`/api/iam/invitations/${id}/resend`),
	});
}

// Permission Matrix
export function usePermissionMatrix(params?: { resource_type?: string; entity_type?: 'user' | 'group' }) {
	return useQuery({
		queryKey: keys.permissionMatrix(params),
		queryFn: () => api.get<PermissionMatrixRow[]>('/api/iam/permission-matrix', { params }),
	});
}

export function useUpdatePermissionCell() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: { entity_type: 'user' | 'group'; entity_id: string; resource: string; level: string }) =>
			api.patch('/api/iam/permission-matrix', data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['iam', 'permission-matrix'] });
		},
	});
}

// User Home / Dashboard
export function useUserHome() {
	return useQuery({
		queryKey: keys.userHome,
		queryFn: () => api.get<UserHomeData>('/api/user/home'),
		staleTime: 60_000,
	});
}

export function useUserTasks(params?: { status?: string; priority?: string }) {
	return useQuery({
		queryKey: [...keys.userTasks, params],
		queryFn: () => api.get<WorkflowTask[]>('/api/user/tasks', { params }),
	});
}

export function useCompleteTask() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ taskId, action, comment }: { taskId: string; action: 'approve' | 'reject' | 'complete'; comment?: string }) =>
			api.post(`/api/user/tasks/${taskId}/${action}`, { comment }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.userTasks });
			qc.invalidateQueries({ queryKey: keys.userHome });
		},
	});
}

export function useUserNotifications() {
	return useQuery({
		queryKey: keys.userNotifications,
		queryFn: () => api.get<{ items: import('../types').UserNotification[]; unread_count: number }>('/api/user/notifications'),
		refetchInterval: 30_000,
	});
}

export function useMarkNotificationRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.patch(`/api/user/notifications/${id}/read`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.userNotifications });
		},
	});
}

export function useMarkAllNotificationsRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => api.post('/api/user/notifications/read-all'),
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
			api.post('/api/user/favorites', data),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.userHome });
		},
	});
}

export function useRemoveFavorite() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => api.delete(`/api/user/favorites/${id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: keys.userHome });
		},
	});
}
