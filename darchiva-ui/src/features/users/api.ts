// (c) Copyright Datacraft, 2026
/**
 * User management API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
	User,
	UserListResponse,
	UserCreateInput,
	UserUpdateInput,
	UserFilters,
	PasswordChangeInput,
} from './types';

const USERS_KEY = ['users'];

interface ListUsersParams extends UserFilters {
	page?: number;
	pageSize?: number;
}

export function useUsers(params: ListUsersParams = {}) {
	return useQuery({
		queryKey: [...USERS_KEY, params],
		queryFn: async () => {
			const searchParams = new URLSearchParams();
			if (params.page) searchParams.set('page', String(params.page));
			if (params.pageSize) searchParams.set('page_size', String(params.pageSize));
			if (params.search) searchParams.set('search', params.search);
			if (params.is_active !== undefined) searchParams.set('is_active', String(params.is_active));
			if (params.is_superuser !== undefined) searchParams.set('is_superuser', String(params.is_superuser));
			if (params.group_id) searchParams.set('group_id', params.group_id);
			if (params.role_id) searchParams.set('role_id', params.role_id);

			const response = await api.get<UserListResponse>(`/users?${searchParams}`);
			return response;
		},
	});
}

export function useUser(userId: string) {
	return useQuery({
		queryKey: [...USERS_KEY, userId],
		queryFn: async () => {
			const response = await api.get<User>(`/users/${userId}`);
			return response;
		},
		enabled: !!userId,
	});
}

export function useCurrentUser() {
	return useQuery({
		queryKey: ['current-user'],
		queryFn: async () => {
			const response = await api.get<User>('/users/me');
			return response;
		},
	});
}

export function useCreateUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UserCreateInput) => {
			const response = await api.post<User>('/users', data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: USERS_KEY });
		},
	});
}

export function useUpdateUser(userId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UserUpdateInput) => {
			const response = await api.patch<User>(`/users/${userId}`, data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: USERS_KEY });
			queryClient.invalidateQueries({ queryKey: [...USERS_KEY, userId] });
		},
	});
}

export function useDeleteUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			await api.delete(`/users/${userId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: USERS_KEY });
		},
	});
}

export function useChangePassword(userId: string) {
	return useMutation({
		mutationFn: async (data: PasswordChangeInput) => {
			await api.post(`/users/${userId}/change-password`, data);
		},
	});
}

export function useResetPassword() {
	return useMutation({
		mutationFn: async (userId: string) => {
			const response = await api.post<{ temporary_password: string }>(`/users/${userId}/reset-password`);
			return response;
		},
	});
}

export function useEnableMfa(userId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const response = await api.post<{ qr_code: string; secret: string }>(`/users/${userId}/mfa/enable`);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...USERS_KEY, userId] });
		},
	});
}

export function useDisableMfa(userId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			await api.post(`/users/${userId}/mfa/disable`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...USERS_KEY, userId] });
		},
	});
}
