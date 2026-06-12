// (c) Copyright Datacraft, 2026
/**
 * Group management API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type {
  Group,
  GroupCreateInput,
  GroupFilters,
  GroupListResponse,
  GroupMember,
  GroupTree,
  GroupUpdateInput,
} from './types';

const GROUPS_KEY = ['groups'];

interface ListGroupsParams extends GroupFilters {
	page?: number;
	pageSize?: number;
}

export function useGroups(params: ListGroupsParams = {}) {
	return useQuery({
		queryKey: [...GROUPS_KEY, params],
		queryFn: async () => {
			const searchParams = new URLSearchParams();
			if (params.page) searchParams.set('page', String(params.page));
			if (params.pageSize) searchParams.set('page_size', String(params.pageSize));
			if (params.search) searchParams.set('search', params.search);
			if (params.parent_id) searchParams.set('parent_id', params.parent_id);

			const { data } = await apiClient.get<GroupListResponse>(`/groups?${searchParams}`);
			return data;
		},
	});
}

export function useGroupTree() {
	return useQuery({
		queryKey: [...GROUPS_KEY, 'tree'],
		queryFn: async () => {
			const { data } = await apiClient.get<GroupTree[]>('/groups/tree');
			return data;
		},
	});
}

export function useGroup(groupId: string) {
	return useQuery({
		queryKey: [...GROUPS_KEY, groupId],
		queryFn: async () => {
			const { data } = await apiClient.get<Group>(`/groups/${groupId}`);
			return data;
		},
		enabled: !!groupId,
	});
}

export function useGroupMembers(groupId: string) {
	return useQuery({
		queryKey: [...GROUPS_KEY, groupId, 'members'],
		queryFn: async () => {
			const { data } = await apiClient.get<GroupMember[]>(`/groups/${groupId}/members`);
			return data;
		},
		enabled: !!groupId,
	});
}

export function useCreateGroup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: GroupCreateInput) => {
			const { data: response } = await apiClient.post<Group>('/groups', data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: GROUPS_KEY });
		},
	});
}

export function useUpdateGroup(groupId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: GroupUpdateInput) => {
			const { data: response } = await apiClient.patch<Group>(`/groups/${groupId}`, data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: GROUPS_KEY });
			queryClient.invalidateQueries({ queryKey: [...GROUPS_KEY, groupId] });
		},
	});
}

export function useDeleteGroup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (groupId: string) => {
			await apiClient.delete(`/groups/${groupId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: GROUPS_KEY });
		},
	});
}

export function useAddGroupMembers(groupId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userIds: string[]) => {
			await apiClient.post(`/groups/${groupId}/members`, { user_ids: userIds });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...GROUPS_KEY, groupId, 'members'] });
			queryClient.invalidateQueries({ queryKey: [...GROUPS_KEY, groupId] });
		},
	});
}

export function useRemoveGroupMember(groupId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (userId: string) => {
			await apiClient.delete(`/groups/${groupId}/members/${userId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...GROUPS_KEY, groupId, 'members'] });
			queryClient.invalidateQueries({ queryKey: [...GROUPS_KEY, groupId] });
		},
	});
}
