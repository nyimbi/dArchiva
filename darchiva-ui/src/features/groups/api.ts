// (c) Copyright Datacraft, 2026
/**
 * Group management API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
	Group,
	GroupListResponse,
	GroupCreateInput,
	GroupUpdateInput,
	GroupFilters,
	GroupMember,
	GroupTree,
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

			const response = await api.get<GroupListResponse>(`/groups?${searchParams}`);
			return response;
		},
	});
}

export function useGroupTree() {
	return useQuery({
		queryKey: [...GROUPS_KEY, 'tree'],
		queryFn: async () => {
			const response = await api.get<GroupTree[]>('/groups/tree');
			return response;
		},
	});
}

export function useGroup(groupId: string) {
	return useQuery({
		queryKey: [...GROUPS_KEY, groupId],
		queryFn: async () => {
			const response = await api.get<Group>(`/groups/${groupId}`);
			return response;
		},
		enabled: !!groupId,
	});
}

export function useGroupMembers(groupId: string) {
	return useQuery({
		queryKey: [...GROUPS_KEY, groupId, 'members'],
		queryFn: async () => {
			const response = await api.get<GroupMember[]>(`/groups/${groupId}/members`);
			return response;
		},
		enabled: !!groupId,
	});
}

export function useCreateGroup() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: GroupCreateInput) => {
			const response = await api.post<Group>('/groups', data);
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
			const response = await api.patch<Group>(`/groups/${groupId}`, data);
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
			await api.delete(`/groups/${groupId}`);
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
			await api.post(`/groups/${groupId}/members`, { user_ids: userIds });
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
			await api.delete(`/groups/${groupId}/members/${userId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...GROUPS_KEY, groupId, 'members'] });
			queryClient.invalidateQueries({ queryKey: [...GROUPS_KEY, groupId] });
		},
	});
}
