// (c) Copyright Datacraft, 2026
/**
 * Document types API hooks.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DocumentType, DocumentTypeCreate, DocumentTypeUpdate, DocumentTypeListResponse } from './types';

const DOC_TYPES_KEY = ['document-types'];

export function useDocumentTypes() {
	return useQuery({
		queryKey: DOC_TYPES_KEY,
		queryFn: async () => {
			const response = await api.get<DocumentTypeListResponse>('/document-types');
			return response;
		},
	});
}

export function useDocumentType(typeId: string) {
	return useQuery({
		queryKey: [...DOC_TYPES_KEY, typeId],
		queryFn: async () => {
			const response = await api.get<DocumentType>(`/document-types/${typeId}`);
			return response;
		},
		enabled: !!typeId,
	});
}

export function useCreateDocumentType() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: DocumentTypeCreate) => {
			const response = await api.post<DocumentType>('/document-types', data);
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
			const response = await api.patch<DocumentType>(`/document-types/${typeId}`, data);
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
			await api.delete(`/document-types/${typeId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: DOC_TYPES_KEY });
		},
	});
}
