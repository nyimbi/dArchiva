// (c) Copyright Datacraft, 2026
/**
 * User management API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type {
  PasswordChangeInput,
  User,
  UserCreateInput,
  UserFilters,
  UserListResponse,
  UserUpdateInput,
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

			const { data } = await apiClient.get<UserListResponse>(`/users?${searchParams}`);
			return data;
		},
	});
}

export function useUser(userId: string) {
	return useQuery({
		queryKey: [...USERS_KEY, userId],
		queryFn: async () => {
			const { data } = await apiClient.get<User>(`/users/${userId}`);
			return data;
		},
		enabled: !!userId,
	});
}

export function useCurrentUser() {
	return useQuery({
		queryKey: ['current-user'],
		queryFn: async () => {
			const { data } = await apiClient.get<User>('/users/me');
			return data;
		},
	});
}

export function useCreateUser() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UserCreateInput) => {
			const { data: response } = await apiClient.post<User>('/users', data);
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
			const { data: response } = await apiClient.patch<User>(`/users/${userId}`, data);
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
			await apiClient.delete(`/users/${userId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: USERS_KEY });
		},
	});
}

export function useChangePassword(userId: string) {
	return useMutation({
		mutationFn: async (data: PasswordChangeInput) => {
			await apiClient.post(`/users/${userId}/change-password`, data);
		},
	});
}

export function useResetPassword() {
	return useMutation({
		mutationFn: async (userId: string) => {
			const { data } = await apiClient.post<{ temporary_password: string }>(`/users/${userId}/reset-password`);
			return data;
		},
	});
}

export function useEnableMfa(userId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const { data } = await apiClient.post<{ qr_code: string; secret: string }>(`/users/${userId}/mfa/enable`);
			return data;
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
			await apiClient.post(`/users/${userId}/mfa/disable`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...USERS_KEY, userId] });
		},
	});
}
