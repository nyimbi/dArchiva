// (c) Copyright Datacraft, 2026
/**
 * Form Recognition API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type ExtractionStatus = 'pending' | 'processing' | 'completed' | 'needs_review' | 'failed';

export interface FieldValue {
	fieldName: string;
	label: string;
	value: string;
	confidence: number;
	wasCorrected: boolean;
}

export interface Signature {
	id: string;
	pageNumber: number;
	signerName: string;
	verified: boolean;
	signatureType: 'handwritten' | 'digital' | 'stamp';
}

export interface Extraction {
	id: string;
	documentId: string;
	documentTitle: string;
	templateId: string;
	templateName: string;
	confidence: number;
	status: ExtractionStatus;
	pageCount: number;
	fieldValues: FieldValue[];
	signatures: Signature[];
	createdAt: string;
	updatedAt: string;
}

export interface FormTemplate {
	id: string;
	name: string;
	description?: string;
	category: string;
	fieldCount: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

export interface ExtractionQueueItem {
	id: string;
	documentId: string;
	documentTitle: string;
	templateId: string;
	templateName: string;
	status: ExtractionStatus;
	confidence: number;
	createdAt: string;
}

export interface ExtractionListResponse {
	items: ExtractionQueueItem[];
	total: number;
	page: number;
	page_size: number;
}

export interface TemplateListResponse {
	items: FormTemplate[];
	total: number;
	page: number;
	page_size: number;
}

export const formKeys = {
	all: ['forms'] as const,
	extractions: () => [...formKeys.all, 'extractions'] as const,
	extraction: (id: string) => [...formKeys.all, 'extraction', id] as const,
	queue: (filters?: Record<string, unknown>) => [...formKeys.all, 'queue', filters] as const,
	templates: () => [...formKeys.all, 'templates'] as const,
	template: (id: string) => [...formKeys.all, 'template', id] as const,
};

export function useExtraction(id: string) {
	return useQuery({
		queryKey: formKeys.extraction(id),
		queryFn: async () => {
			const response = await apiClient.get<Extraction>(`/forms/extractions/${id}`);
			return response.data;
		},
		enabled: !!id,
	});
}

export function useExtractionQueue(page = 1, pageSize = 20, status?: ExtractionStatus) {
	return useQuery({
		queryKey: formKeys.queue({ page, status }),
		queryFn: async () => {
			const params: Record<string, unknown> = { page, page_size: pageSize };
			if (status) params.status = status;
			const response = await apiClient.get<ExtractionListResponse>('/forms/queue', { params });
			return response.data;
		},
	});
}

export function useFormTemplates(page = 1, pageSize = 50, isActive?: boolean) {
	return useQuery({
		queryKey: formKeys.templates(),
		queryFn: async () => {
			const params: Record<string, unknown> = { page, page_size: pageSize };
			if (isActive !== undefined) params.is_active = isActive;
			const response = await apiClient.get<TemplateListResponse>('/forms/templates', { params });
			return response.data;
		},
	});
}

export function useFormTemplate(id: string) {
	return useQuery({
		queryKey: formKeys.template(id),
		queryFn: async () => {
			const response = await apiClient.get<FormTemplate>(`/forms/templates/${id}`);
			return response.data;
		},
		enabled: !!id,
	});
}

export function useCreateExtraction() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { documentId: string; templateId: string }) => {
			const response = await apiClient.post<Extraction>('/forms/extractions', data);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: formKeys.extractions() });
			queryClient.invalidateQueries({ queryKey: formKeys.queue() });
		},
	});
}

export function useUpdateFieldValue() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			extractionId,
			fieldName,
			value,
		}: {
			extractionId: string;
			fieldName: string;
			value: string;
		}) => {
			const response = await apiClient.patch<Extraction>(
				`/forms/extractions/${extractionId}/fields/${fieldName}`,
				{ value }
			);
			return response.data;
		},
		onSuccess: (_, { extractionId }) => {
			queryClient.invalidateQueries({ queryKey: formKeys.extraction(extractionId) });
		},
	});
}

export function useConfirmExtraction() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const response = await apiClient.post<Extraction>(`/forms/extractions/${id}/confirm`);
			return response.data;
		},
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: formKeys.extraction(id) });
			queryClient.invalidateQueries({ queryKey: formKeys.queue() });
		},
	});
}

export function useReExtract() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const response = await apiClient.post<Extraction>(`/forms/extractions/${id}/re-extract`);
			return response.data;
		},
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: formKeys.extraction(id) });
			queryClient.invalidateQueries({ queryKey: formKeys.queue() });
		},
	});
}

export function useCreateTemplate() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { name: string; category: string; description?: string }) => {
			const response = await apiClient.post<FormTemplate>('/forms/templates', data);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: formKeys.templates() });
		},
	});
}

export function useUpdateTemplate() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<FormTemplate> }) => {
			const response = await apiClient.patch<FormTemplate>(`/forms/templates/${id}`, data);
			return response.data;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: formKeys.template(id) });
			queryClient.invalidateQueries({ queryKey: formKeys.templates() });
		},
	});
}

export function useToggleTemplate() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
			const response = await apiClient.patch<FormTemplate>(`/forms/templates/${id}`, { isActive });
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: formKeys.templates() });
		},
	});
}
