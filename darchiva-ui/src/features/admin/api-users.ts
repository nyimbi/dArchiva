// (c) Copyright Datacraft, 2026
/**
 * Admin user management API hooks.
 * Wraps /users and /iam endpoints for the admin panel.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
	id: string;
	username: string;
	email: string;
	is_active: boolean;
	is_superuser: boolean;
	created_at: string;
	updated_at?: string;
	groups: { id: string; name: string }[];
	roles: { id: string; name: string }[];
}

export interface AdminUserListResponse {
	items: AdminUser[];
	total: number;
	page: number;
	page_size: number;
}

export interface InviteUserInput {
	email: string;
	role_ids?: string[];
}

export interface InviteResult {
	id: string;
	email: string;
	status: string;
	role_ids: string[];
	created_at: string;
	expires_at: string | null;
}

export interface AdminUserUpdateInput {
	is_active?: boolean;
	is_superuser?: boolean;
	group_ids?: string[];
	role_ids?: string[];
}

// ── Query keys ───────────────────────────────────────────────────────────────

export const adminUserKeys = {
	all: ['admin-users'] as const,
	list: (params: object) => [...adminUserKeys.all, 'list', params] as const,
	detail: (id: string) => [...adminUserKeys.all, 'detail', id] as const,
	invitations: () => [...adminUserKeys.all, 'invitations'] as const,
};

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useAdminUsers(params: {
	page?: number;
	pageSize?: number;
	search?: string;
	is_active?: boolean;
} = {}) {
	return useQuery({
		queryKey: adminUserKeys.list(params),
		queryFn: async () => {
			const sp = new URLSearchParams();
			if (params.page) sp.set('page_number', String(params.page));
			if (params.pageSize) sp.set('page_size', String(params.pageSize));
			if (params.search) sp.set('filter_free_text', params.search);
			const { data } = await apiClient.get<AdminUserListResponse>(`/users?${sp}`);
			return data;
		},
	});
}

export function useAdminUser(userId: string) {
	return useQuery({
		queryKey: adminUserKeys.detail(userId),
		queryFn: async () => {
			const { data } = await apiClient.get<AdminUser>(`/users/${userId}`);
			return data;
		},
		enabled: !!userId,
	});
}

export function useAdminInvitations() {
	return useQuery({
		queryKey: adminUserKeys.invitations(),
		queryFn: async () => {
			const { data } = await apiClient.get<InviteResult[]>('/iam/invitations');
			return data;
		},
	});
}

export function useInviteUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: InviteUserInput) => {
			const { data } = await apiClient.post<InviteResult>('/iam/invitations', input);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminUserKeys.invitations() });
		},
	});
}

export function useRevokeInvitation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (invitationId: string) => {
			await apiClient.delete(`/iam/invitations/${invitationId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminUserKeys.invitations() });
		},
	});
}

export function useAdminUpdateUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ userId, data }: { userId: string; data: AdminUserUpdateInput }) => {
			const { data: result } = await apiClient.patch<AdminUser>(`/users/${userId}`, data);
			return result;
		},
		onSuccess: (_, { userId }) => {
			queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
			queryClient.invalidateQueries({ queryKey: adminUserKeys.detail(userId) });
		},
	});
}

export function useAdminDeleteUser() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (userId: string) => {
			await apiClient.delete(`/users/${userId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminUserKeys.all });
		},
	});
}
