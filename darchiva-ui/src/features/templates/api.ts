// (c) Copyright Datacraft, 2026
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─────────────────────────── Types ───────────────────────────────

export interface FieldDefinition {
	name: string;
	label: string;
	type: 'text' | 'date' | 'number' | 'checkbox';
	required: boolean;
	default_value: string;
}

export interface DocumentTemplate {
	id: string;
	name: string;
	description: string;
	category: string;
	template_file_id: string | null;
	field_definitions: FieldDefinition[];
	is_active: boolean;
	created_by_id: string;
	tenant_id: string;
	use_count: number;
}

export interface TemplateListResponse {
	items: DocumentTemplate[];
	total: number;
	page: number;
	page_size: number;
}

export interface TemplateCreate {
	name: string;
	description?: string;
	category?: string;
	field_definitions?: FieldDefinition[];
	template_file_id?: string | null;
}

export interface TemplateUpdate {
	name?: string;
	description?: string;
	category?: string;
	field_definitions?: FieldDefinition[];
	template_file_id?: string | null;
	is_active?: boolean;
}

export interface CreateFromTemplateRequest {
	title: string;
	field_values: Record<string, string>;
	destination_folder_id?: string;
}

export interface CreateFromTemplateResponse {
	document_id: string;
	title: string;
}

// ─────────────────────────── Query keys ──────────────────────────

const TEMPLATES_KEY = ['templates'] as const;

const templateKeys = {
	all: TEMPLATES_KEY,
	list: (category?: string, page?: number) =>
		[...TEMPLATES_KEY, 'list', category, page] as const,
};

// ─────────────────────────── Hooks ───────────────────────────────

export function useTemplates(category?: string, page = 1, pageSize = 20) {
	return useQuery({
		queryKey: templateKeys.list(category, page),
		queryFn: async () => {
			const params: Record<string, unknown> = { page, page_size: pageSize };
			if (category) params.category = category;
			const { data } = await apiClient.get<TemplateListResponse>('/templates/', { params });
			return data;
		},
		staleTime: 30_000,
	});
}

export function useCreateTemplate() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: TemplateCreate) => {
			const { data } = await apiClient.post<DocumentTemplate>('/templates/', body);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
		},
	});
}

export function useUpdateTemplate() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: TemplateUpdate }) => {
			const { data: response } = await apiClient.patch<DocumentTemplate>(
				`/templates/${id}`,
				data,
			);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
		},
	});
}

export function useDeleteTemplate() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/templates/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
		},
	});
}

export function useCreateFromTemplate() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			templateId,
			body,
		}: {
			templateId: string;
			body: CreateFromTemplateRequest;
		}) => {
			const { data } = await apiClient.post<CreateFromTemplateResponse>(
				`/templates/${templateId}/create-document`,
				body,
			);
			return data;
		},
		onSuccess: () => {
			// Invalidate templates (use_count changed) and documents list
			queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
			queryClient.invalidateQueries({ queryKey: ['documents'] });
		},
	});
}
