// (c) Copyright Datacraft, 2026
/**
 * Tag feature API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type { Tag,TagCreate,TagListResponse,TagUpdate } from './types';

const TAGS_KEY = ['tags'];

export function useTags() {
	return useQuery({
		queryKey: TAGS_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<TagListResponse>('/tags');
			return data;
		},
	});
}

export function useTag(tagId: string) {
	return useQuery({
		queryKey: [...TAGS_KEY, tagId],
		queryFn: async () => {
			const { data } = await apiClient.get<Tag>(`/tags/${tagId}`);
			return data;
		},
		enabled: !!tagId,
	});
}

export function useCreateTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: TagCreate) => {
			const { data: response } = await apiClient.post<Tag>('/tags', data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TAGS_KEY });
		},
	});
}

export function useUpdateTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ tagId, data }: { tagId: string; data: TagUpdate }) => {
			const { data: response } = await apiClient.patch<Tag>(`/tags/${tagId}`, data);
			return response;
		},
		onSuccess: (_, { tagId }) => {
			queryClient.invalidateQueries({ queryKey: TAGS_KEY });
			queryClient.invalidateQueries({ queryKey: [...TAGS_KEY, tagId] });
		},
	});
}

export function useDeleteTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (tagId: string) => {
			await apiClient.delete(`/tags/${tagId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TAGS_KEY });
		},
	});
}

export function useTagDocuments(tagId: string) {
	return useMutation({
		mutationFn: async (documentIds: string[]) => {
			await apiClient.post(`/tags/${tagId}/documents`, { document_ids: documentIds });
		},
	});
}

export function useUntagDocuments(tagId: string) {
	return useMutation({
		mutationFn: async (documentIds: string[]) => {
			await apiClient.delete(`/tags/${tagId}/documents`, { data: { document_ids: documentIds } });
		},
	});
}
