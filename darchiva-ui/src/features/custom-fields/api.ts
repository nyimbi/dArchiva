// (c) Copyright Datacraft, 2026
/**
 * Custom fields API hooks — extended with project-scoped field support
 * and document custom-field-value upsert via custom_field_values_v2.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
	CustomField,
	CustomFieldCreate,
	CustomFieldListResponse,
	CustomFieldUpdate,
	CustomFieldValue,
	DocumentCustomFieldValues,
	UpsertCustomFieldValuesPayload,
} from './types';

const CUSTOM_FIELDS_KEY = ['custom-fields'];

// ------------------------------------------------------------------
// Field definition hooks
// ------------------------------------------------------------------

/** List all custom fields. Pass projectId to scope to a project; omit for globals. */
export function useCustomFields(projectId?: string) {
	return useQuery({
		queryKey: [...CUSTOM_FIELDS_KEY, { projectId: projectId ?? null }],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (projectId) params.set('project_id', projectId);
			const { data } = await apiClient.get<CustomFieldListResponse>(
				`/custom-fields/all${params.size ? `?${params}` : ''}`,
			);
			// /all returns an array; wrap into the list-response shape consumers expect
			if (Array.isArray(data)) {
				return { items: data, total: data.length } as CustomFieldListResponse;
			}
			return data as CustomFieldListResponse;
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
		mutationFn: async (payload: CustomFieldCreate) => {
			const { data } = await apiClient.post<CustomField>('/custom-fields/', payload);
			return data;
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
			const { data: response } = await apiClient.patch<CustomField>(
				`/custom-fields/${fieldId}`,
				data,
			);
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

// ------------------------------------------------------------------
// Document custom-field-value hooks
// ------------------------------------------------------------------

const docCfvKey = (documentId: string) => ['documents', documentId, 'custom-field-values'];

/** Fetch all custom field values for a document (GET /documents/{id}/custom-field-values). */
export function useCustomFieldValues(documentId: string) {
	return useQuery({
		queryKey: docCfvKey(documentId),
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentCustomFieldValues>(
				`/documents/${documentId}/custom-field-values`,
			);
			return data;
		},
		enabled: !!documentId,
	});
}

/**
 * Upsert custom field values for a document.
 * PUT /documents/{id}/custom-field-values
 * Body: { field_id: value, ... }  (string keys, typed values)
 */
export function useUpsertCustomFieldValues(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: UpsertCustomFieldValuesPayload) => {
			const { data } = await apiClient.put(
				`/documents/${documentId}/custom-field-values`,
				payload,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: docCfvKey(documentId) });
			// also invalidate legacy key used by older code
			queryClient.invalidateQueries({
				queryKey: ['documents', documentId, 'custom-fields'],
			});
		},
	});
}

// ------------------------------------------------------------------
// Re-export legacy hook aliases so existing callers keep working
// ------------------------------------------------------------------

/** @deprecated Use useCustomFieldValues instead */
export function useDocumentCustomFields(documentId: string) {
	return useQuery({
		queryKey: ['documents', documentId, 'custom-fields'],
		queryFn: async () => {
			const { data } = await apiClient.get<CustomFieldValue[]>(
				`/documents/${documentId}/custom-fields`,
			);
			return data;
		},
		enabled: !!documentId,
	});
}

/** @deprecated Use useUpsertCustomFieldValues instead */
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
