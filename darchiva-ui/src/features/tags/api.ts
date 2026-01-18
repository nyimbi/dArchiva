// (c) Copyright Datacraft, 2026
/**
 * Tag feature API hooks.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Tag, TagCreate, TagUpdate, TagListResponse } from './types';

const TAGS_KEY = ['tags'];

export function useTags() {
	return useQuery({
		queryKey: TAGS_KEY,
		queryFn: async () => {
			const response = await api.get<TagListResponse>('/tags');
			return response;
		},
	});
}

export function useTag(tagId: string) {
	return useQuery({
		queryKey: [...TAGS_KEY, tagId],
		queryFn: async () => {
			const response = await api.get<Tag>(`/tags/${tagId}`);
			return response;
		},
		enabled: !!tagId,
	});
}

export function useCreateTag() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: TagCreate) => {
			const response = await api.post<Tag>('/tags', data);
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
			const response = await api.patch<Tag>(`/tags/${tagId}`, data);
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
			await api.delete(`/tags/${tagId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TAGS_KEY });
		},
	});
}

export function useTagDocuments(tagId: string) {
	return useMutation({
		mutationFn: async (documentIds: string[]) => {
			await api.post(`/tags/${tagId}/documents`, { document_ids: documentIds });
		},
	});
}

export function useUntagDocuments(tagId: string) {
	return useMutation({
		mutationFn: async (documentIds: string[]) => {
			await api.delete(`/tags/${tagId}/documents`, { data: { document_ids: documentIds } });
		},
	});
}
