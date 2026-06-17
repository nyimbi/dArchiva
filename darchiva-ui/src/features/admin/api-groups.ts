// (c) Copyright Datacraft, 2026
/**
 * Admin group management API hooks.
 * Wraps /groups endpoints for the admin panel.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── Types ────────────────────────────────────────────────────────────────────

export interface AdminGroup {
	id: string;
	name: string;
	description?: string;
	member_count?: number;
	home_folder_id?: string | null;
	inbox_folder_id?: string | null;
	created_at?: string;
}

export interface AdminGroupListResponse {
	items: AdminGroup[];
	total: number;
	page: number;
	page_size: number;
}

export interface AdminGroupCreateInput {
	name: string;
	with_special_folders?: boolean;
}

export interface AdminGroupUpdateInput {
	name?: string;
	with_special_folders?: boolean;
}

// ── Query keys ───────────────────────────────────────────────────────────────

export const adminGroupKeys = {
	all: ['admin-groups'] as const,
	list: (params: object) => [...adminGroupKeys.all, 'list', params] as const,
	detail: (id: string) => [...adminGroupKeys.all, 'detail', id] as const,
	members: (id: string) => [...adminGroupKeys.all, 'members', id] as const,
};

// ── Hooks ────────────────────────────────────────────────────────────────────

export function useAdminGroups(params: {
	page?: number;
	pageSize?: number;
	search?: string;
} = {}) {
	return useQuery({
		queryKey: adminGroupKeys.list(params),
		queryFn: async () => {
			const sp = new URLSearchParams();
			if (params.page) sp.set('page_number', String(params.page));
			if (params.pageSize) sp.set('page_size', String(params.pageSize));
			if (params.search) sp.set('filter_free_text', params.search);
			const { data } = await apiClient.get<AdminGroupListResponse>(`/groups?${sp}`);
			return data;
		},
	});
}

export function useAdminGroupMembers(groupId: string) {
	return useQuery({
		queryKey: adminGroupKeys.members(groupId),
		queryFn: async () => {
			const { data } = await apiClient.get<{ id: string; username: string; email: string }[]>(
				`/groups/${groupId}/members`
			);
			return data;
		},
		enabled: !!groupId,
	});
}

export function useAdminCreateGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: AdminGroupCreateInput) => {
			const { data } = await apiClient.post<AdminGroup>('/groups', {
				name: input.name,
				with_special_folders: input.with_special_folders ?? false,
			});
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminGroupKeys.all });
		},
	});
}

export function useAdminUpdateGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ groupId, data }: { groupId: string; data: AdminGroupUpdateInput }) => {
			const { data: result } = await apiClient.patch<AdminGroup>(`/groups/${groupId}`, data);
			return result;
		},
		onSuccess: (_, { groupId }) => {
			queryClient.invalidateQueries({ queryKey: adminGroupKeys.all });
			queryClient.invalidateQueries({ queryKey: adminGroupKeys.detail(groupId) });
		},
	});
}

export function useAdminDeleteGroup() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (groupId: string) => {
			await apiClient.delete(`/groups/${groupId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminGroupKeys.all });
		},
	});
}
