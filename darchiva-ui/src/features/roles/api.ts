// (c) Copyright Datacraft, 2026
/**
 * Role management API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type {
  Permission,
  PermissionCategory,
  Role,
  RoleCreateInput,
  RoleFilters,
  RoleListResponse,
  RoleUpdateInput,
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

			const { data } = await apiClient.get<RoleListResponse>(`/roles?${searchParams}`);
			return data;
		},
	});
}

export function useRole(roleId: string) {
	return useQuery({
		queryKey: [...ROLES_KEY, roleId],
		queryFn: async () => {
			const { data } = await apiClient.get<Role>(`/roles/${roleId}`);
			return data;
		},
		enabled: !!roleId,
	});
}

export function usePermissions() {
	return useQuery({
		queryKey: PERMISSIONS_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<Permission[]>('/permissions');
			return data;
		},
	});
}

export function usePermissionsByCategory() {
	return useQuery({
		queryKey: [...PERMISSIONS_KEY, 'by-category'],
		queryFn: async () => {
			const { data } = await apiClient.get<PermissionCategory[]>('/permissions/by-category');
			return data;
		},
	});
}

export function useCreateRole() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: RoleCreateInput) => {
			const { data: response } = await apiClient.post<Role>('/roles', data);
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
			const { data: response } = await apiClient.patch<Role>(`/roles/${roleId}`, data);
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
			await apiClient.delete(`/roles/${roleId}`);
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
			const { data } = await apiClient.post<Role>(`/roles/${roleId}/clone`, { name: newName });
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ROLES_KEY });
		},
	});
}
