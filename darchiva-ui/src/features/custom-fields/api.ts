// (c) Copyright Datacraft, 2026
/**
 * Custom fields API hooks.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { CustomField, CustomFieldCreate, CustomFieldUpdate, CustomFieldListResponse, CustomFieldValue } from './types';

const CUSTOM_FIELDS_KEY = ['custom-fields'];

export function useCustomFields() {
	return useQuery({
		queryKey: CUSTOM_FIELDS_KEY,
		queryFn: async () => {
			const response = await api.get<CustomFieldListResponse>('/custom-fields');
			return response;
		},
	});
}

export function useCustomField(fieldId: string) {
	return useQuery({
		queryKey: [...CUSTOM_FIELDS_KEY, fieldId],
		queryFn: async () => {
			const response = await api.get<CustomField>(`/custom-fields/${fieldId}`);
			return response;
		},
		enabled: !!fieldId,
	});
}

export function useCreateCustomField() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CustomFieldCreate) => {
			const response = await api.post<CustomField>('/custom-fields', data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: CUSTOM_FIELDS_KEY });
		},
	});
}

export function useUpdateCustomField() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ fieldId, data }: { fieldId: string; data: CustomFieldUpdate }) => {
			const response = await api.patch<CustomField>(`/custom-fields/${fieldId}`, data);
			return response;
		},
		onSuccess: (_, { fieldId }) => {
			queryClient.invalidateQueries({ queryKey: CUSTOM_FIELDS_KEY });
			queryClient.invalidateQueries({ queryKey: [...CUSTOM_FIELDS_KEY, fieldId] });
		},
	});
}

export function useDeleteCustomField() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (fieldId: string) => {
			await api.delete(`/custom-fields/${fieldId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: CUSTOM_FIELDS_KEY });
		},
	});
}

export function useDocumentCustomFields(documentId: string) {
	return useQuery({
		queryKey: ['documents', documentId, 'custom-fields'],
		queryFn: async () => {
			const response = await api.get<CustomFieldValue[]>(`/documents/${documentId}/custom-fields`);
			return response;
		},
		enabled: !!documentId,
	});
}

export function useUpdateDocumentCustomFields(documentId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (values: Record<string, string | number | boolean | null>) => {
			const response = await api.put(`/documents/${documentId}/custom-fields`, values);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents', documentId, 'custom-fields'] });
		},
	});
}
