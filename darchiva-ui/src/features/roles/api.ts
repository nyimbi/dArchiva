// (c) Copyright Datacraft, 2026
/**
 * Role management API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
	Role,
	RoleListResponse,
	RoleCreateInput,
	RoleUpdateInput,
	RoleFilters,
	Permission,
	PermissionCategory,
} from './types';

const ROLES_KEY = ['roles'];
const PERMISSIONS_KEY = ['permissions'];

interface ListRolesParams extends RoleFilters {
	page?: number;
	pageSize?: number;
}

export function useRoles(params: ListRolesParams = {}) {
	return useQuery({
		queryKey: [...ROLES_KEY, params],
		queryFn: async () => {
			const searchParams = new URLSearchParams();
			if (params.page) searchParams.set('page', String(params.page));
			if (params.pageSize) searchParams.set('page_size', String(params.pageSize));
			if (params.search) searchParams.set('search', params.search);
			if (params.is_system !== undefined) searchParams.set('is_system', String(params.is_system));

			const response = await api.get<RoleListResponse>(`/roles?${searchParams}`);
			return response;
		},
	});
}

export function useRole(roleId: string) {
	return useQuery({
		queryKey: [...ROLES_KEY, roleId],
		queryFn: async () => {
			const response = await api.get<Role>(`/roles/${roleId}`);
			return response;
		},
		enabled: !!roleId,
	});
}

export function usePermissions() {
	return useQuery({
		queryKey: PERMISSIONS_KEY,
		queryFn: async () => {
			const response = await api.get<Permission[]>('/permissions');
			return response;
		},
	});
}

export function usePermissionsByCategory() {
	return useQuery({
		queryKey: [...PERMISSIONS_KEY, 'by-category'],
		queryFn: async () => {
			const response = await api.get<PermissionCategory[]>('/permissions/by-category');
			return response;
		},
	});
}

export function useCreateRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: RoleCreateInput) => {
			const response = await api.post<Role>('/roles', data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ROLES_KEY });
		},
	});
}

export function useUpdateRole(roleId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: RoleUpdateInput) => {
			const response = await api.patch<Role>(`/roles/${roleId}`, data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ROLES_KEY });
			queryClient.invalidateQueries({ queryKey: [...ROLES_KEY, roleId] });
		},
	});
}

export function useDeleteRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (roleId: string) => {
			await api.delete(`/roles/${roleId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ROLES_KEY });
		},
	});
}

export function useCloneRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ roleId, newName }: { roleId: string; newName: string }) => {
			const response = await api.post<Role>(`/roles/${roleId}/clone`, { name: newName });
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ROLES_KEY });
		},
	});
}
