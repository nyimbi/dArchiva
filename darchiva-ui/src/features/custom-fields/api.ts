// (c) Copyright Datacraft, 2026
/**
 * Custom fields API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type { CustomField,CustomFieldCreate,CustomFieldListResponse,CustomFieldUpdate,CustomFieldValue } from './types';

const CUSTOM_FIELDS_KEY = ['custom-fields'];

export function useCustomFields() {
	return useQuery({
		queryKey: CUSTOM_FIELDS_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<CustomFieldListResponse>('/custom-fields');
			return data;
		},
	});
}

export function useCustomField(fieldId: string) {
	return useQuery({
		queryKey: [...CUSTOM_FIELDS_KEY, fieldId],
		queryFn: async () => {
			const { data } = await apiClient.get<CustomField>(`/custom-fields/${fieldId}`);
			return data;
		},
		enabled: !!fieldId,
	});
}

export function useCreateCustomField() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CustomFieldCreate) => {
			const { data: response } = await apiClient.post<CustomField>('/custom-fields', data);
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
			const { data: response } = await apiClient.patch<CustomField>(`/custom-fields/${fieldId}`, data);
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
			await apiClient.delete(`/custom-fields/${fieldId}`);
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
			const { data } = await apiClient.get<CustomFieldValue[]>(`/documents/${documentId}/custom-fields`);
			return data;
		},
		enabled: !!documentId,
	});
}

export function useUpdateDocumentCustomFields(documentId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (values: Record<string, string | number | boolean | null>) => {
			const { data } = await apiClient.put(`/documents/${documentId}/custom-fields`, values);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents', documentId, 'custom-fields'] });
		},
	});
}
