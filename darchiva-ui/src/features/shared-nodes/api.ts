// (c) Copyright Datacraft, 2026
/**
 * Shared nodes API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type {
  CreateLinkShareInput,
  CreateShareInput,
  SharedNode,
  SharedNodesFilters,
  SharedNodesListResponse,
  ShareLink,
  UpdateShareInput,
} from './types';

const SHARED_KEY = ['shared-nodes'];

interface ListSharedParams extends SharedNodesFilters {
	page?: number;
	pageSize?: number;
}

export function useSharedNodes(params: ListSharedParams = {}) {
	return useQuery({
		queryKey: [...SHARED_KEY, params],
		queryFn: async () => {
			const searchParams = new URLSearchParams();
			if (params.page) searchParams.set('page', String(params.page));
			if (params.pageSize) searchParams.set('page_size', String(params.pageSize));
			if (params.node_type) searchParams.set('node_type', params.node_type);
			if (params.shared_with_type) searchParams.set('shared_with_type', params.shared_with_type);
			if (params.shared_by_me) searchParams.set('shared_by_me', 'true');
			if (params.shared_with_me) searchParams.set('shared_with_me', 'true');

			const { data } = await apiClient.get<SharedNodesListResponse>(`/shared-nodes?${searchParams}`);
			return data;
		},
	});
}

export function useSharedByMe(params: Omit<ListSharedParams, 'shared_by_me'> = {}) {
	return useSharedNodes({ ...params, shared_by_me: true });
}

export function useSharedWithMe(params: Omit<ListSharedParams, 'shared_with_me'> = {}) {
	return useSharedNodes({ ...params, shared_with_me: true });
}

export function useNodeShares(nodeId: string) {
	return useQuery({
		queryKey: [...SHARED_KEY, 'node', nodeId],
		queryFn: async () => {
			const { data } = await apiClient.get<SharedNode[]>(`/nodes/${nodeId}/shares`);
			return data;
		},
		enabled: !!nodeId,
	});
}

export function useNodeShareLinks(nodeId: string) {
	return useQuery({
		queryKey: [...SHARED_KEY, 'node', nodeId, 'links'],
		queryFn: async () => {
			const { data } = await apiClient.get<ShareLink[]>(`/shared-nodes/links/${nodeId}`);
			return data;
		},
		enabled: !!nodeId,
	});
}

export function useCreateShare() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateShareInput) => {
			const { data: response } = await apiClient.post<SharedNode>('/shared-nodes', data);
			return response;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: SHARED_KEY });
			queryClient.invalidateQueries({ queryKey: [...SHARED_KEY, 'node', variables.node_id] });
		},
	});
}

export function useCreateShareLink() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateLinkShareInput) => {
			const { data: response } = await apiClient.post<ShareLink>('/shared-nodes/links', data);
			return response;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: SHARED_KEY });
			queryClient.invalidateQueries({ queryKey: [...SHARED_KEY, 'node', variables.node_id, 'links'] });
		},
	});
}

export function useUpdateShare(shareId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: UpdateShareInput) => {
			const { data: response } = await apiClient.patch<SharedNode>(`/shared-nodes/${shareId}`, data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SHARED_KEY });
		},
	});
}

export function useDeleteShare() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (shareId: string) => {
			await apiClient.delete(`/shared-nodes/${shareId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SHARED_KEY });
		},
	});
}

export function useDeleteShareLink() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (linkId: string) => {
			await apiClient.delete(`/shared-nodes/links/${linkId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SHARED_KEY });
		},
	});
}
