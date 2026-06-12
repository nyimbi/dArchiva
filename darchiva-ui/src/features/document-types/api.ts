// (c) Copyright Datacraft, 2026
/**
 * Document types API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type { DocumentType,DocumentTypeCreate,DocumentTypeListResponse,DocumentTypeUpdate } from './types';

const DOC_TYPES_KEY = ['document-types'];

export function useDocumentTypes() {
	return useQuery({
		queryKey: DOC_TYPES_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentTypeListResponse>('/document-types');
			return data;
		},
	});
}

export function useDocumentType(typeId: string) {
	return useQuery({
		queryKey: [...DOC_TYPES_KEY, typeId],
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentType>(`/document-types/${typeId}`);
			return data;
		},
		enabled: !!typeId,
	});
}

export function useCreateDocumentType() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: DocumentTypeCreate) => {
			const { data: response } = await apiClient.post<DocumentType>('/document-types', data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: DOC_TYPES_KEY });
		},
	});
}

export function useUpdateDocumentType() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ typeId, data }: { typeId: string; data: DocumentTypeUpdate }) => {
			const { data: response } = await apiClient.patch<DocumentType>(`/document-types/${typeId}`, data);
			return response;
		},
		onSuccess: (_, { typeId }) => {
			queryClient.invalidateQueries({ queryKey: DOC_TYPES_KEY });
			queryClient.invalidateQueries({ queryKey: [...DOC_TYPES_KEY, typeId] });
		},
	});
}

export function useDeleteDocumentType() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (typeId: string) => {
			await apiClient.delete(`/document-types/${typeId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: DOC_TYPES_KEY });
		},
	});
}
