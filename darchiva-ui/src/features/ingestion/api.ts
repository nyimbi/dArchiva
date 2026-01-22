// (c) Copyright Datacraft, 2026
/**
 * Ingestion API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const API_BASE = '/ingestion';

export type SourceType = 'folder_watch' | 'email' | 'api' | 'scanner' | 'cloud_storage';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface IngestionSource {
	id: string;
	name: string;
	type: SourceType;
	config: Record<string, unknown>;
	isActive: boolean;
	lastRunAt?: string;
	nextRunAt?: string;
	documentsIngested: number;
	errorCount: number;
	createdAt: string;
}

export interface IngestionJob {
	id: string;
	sourceId: string;
	sourceName: string;
	status: JobStatus;
	documentsProcessed: number;
	documentsFailed: number;
	startedAt: string;
	completedAt?: string;
	error?: string;
}

export interface IngestionStats {
	active: number;
	total: number;
	jobsToday: number;
	failed: number;
}

export interface SourceListResponse {
	items: IngestionSource[];
	total: number;
}

export interface JobListResponse {
	items: IngestionJob[];
	total: number;
}

export const ingestionKeys = {
	all: ['ingestion'] as const,
	sources: () => [...ingestionKeys.all, 'sources'] as const,
	source: (id: string) => [...ingestionKeys.sources(), id] as const,
	jobs: (filters?: Record<string, unknown>) => [...ingestionKeys.all, 'jobs', filters] as const,
	stats: () => [...ingestionKeys.all, 'stats'] as const,
};

export function useIngestionSources() {
	return useQuery({
		queryKey: ingestionKeys.sources(),
		queryFn: async () => {
			const { data } = await apiClient.get<SourceListResponse>(`${API_BASE}/sources`);
			return data;
		},
	});
}

export function useIngestionSource(id: string) {
	return useQuery({
		queryKey: ingestionKeys.source(id),
		queryFn: async () => {
			const { data } = await apiClient.get<IngestionSource>(`${API_BASE}/sources/${id}`);
			return data;
		},
		enabled: !!id,
	});
}

export function useIngestionJobs(filters?: { sourceId?: string; status?: JobStatus; limit?: number }) {
	return useQuery({
		queryKey: ingestionKeys.jobs(filters),
		queryFn: async () => {
			const { data } = await apiClient.get<JobListResponse>(`${API_BASE}/jobs`, { params: filters });
			return data;
		},
	});
}

export function useIngestionStats() {
	return useQuery({
		queryKey: ingestionKeys.stats(),
		queryFn: async () => {
			const { data } = await apiClient.get<IngestionStats>(`${API_BASE}/stats`);
			return data;
		},
	});
}

export function useCreateSource() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: Partial<IngestionSource>) => {
			const { data } = await apiClient.post<IngestionSource>(`${API_BASE}/sources`, input);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ingestionKeys.sources() });
		},
	});
}

export function useUpdateSource() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data: input }: { id: string; data: Partial<IngestionSource> }) => {
			const { data } = await apiClient.patch<IngestionSource>(`${API_BASE}/sources/${id}`, input);
			return data;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ingestionKeys.source(id) });
			queryClient.invalidateQueries({ queryKey: ingestionKeys.sources() });
		},
	});
}

export function useDeleteSource() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`${API_BASE}/sources/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ingestionKeys.sources() });
		},
	});
}

export function useToggleSource() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
			const { data } = await apiClient.patch<IngestionSource>(`${API_BASE}/sources/${id}/toggle`, { isActive });
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ingestionKeys.sources() });
		},
	});
}

export function useTriggerIngestion() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (sourceId: string) => {
			const { data } = await apiClient.post<IngestionJob>(`${API_BASE}/sources/${sourceId}/trigger`);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ingestionKeys.jobs() });
		},
	});
}


// ==================== Batch Types & Hooks ====================

export interface IngestionBatch {
	id: string;
	name?: string;
	templateId?: string;
	totalFiles: number;
	processedFiles: number;
	failedFiles: number;
	status: 'pending' | 'processing' | 'completed' | 'failed';
	startedAt?: string;
	completedAt?: string;
	createdAt: string;
}

export interface BatchDetail extends IngestionBatch {
	jobs: IngestionJob[];
}

export interface BatchListResponse {
	items: IngestionBatch[];
	total: number;
	page: number;
	pageSize: number;
}

export const batchKeys = {
	all: ['ingestion', 'batches'] as const,
	list: (filters?: Record<string, unknown>) => [...batchKeys.all, 'list', filters] as const,
	detail: (id: string) => [...batchKeys.all, id] as const,
};

export function useIngestionBatches(filters?: { status?: string; page?: number }) {
	return useQuery({
		queryKey: batchKeys.list(filters),
		queryFn: async () => {
			const { data } = await apiClient.get<BatchListResponse>(`${API_BASE}/batches`, { params: filters });
			return data;
		},
	});
}

export function useIngestionBatch(id: string) {
	return useQuery({
		queryKey: batchKeys.detail(id),
		queryFn: async () => {
			const { data } = await apiClient.get<BatchDetail>(`${API_BASE}/batch/${id}`);
			return data;
		},
		enabled: !!id,
		refetchInterval: (data) => data?.status === 'processing' ? 2000 : false,
	});
}

export function useCreateBatch() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: { name?: string; templateId?: string; filePaths?: string[] }) => {
			const { data } = await apiClient.post<IngestionBatch>(`${API_BASE}/batch`, input);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: batchKeys.all });
		},
	});
}


// ==================== Template Types & Hooks ====================

export interface IngestionTemplate {
	id: string;
	name: string;
	description?: string;
	targetFolderId?: string;
	documentTypeId?: string;
	applyOcr: boolean;
	autoClassify: boolean;
	duplicateCheck: boolean;
	validationRules?: Record<string, unknown>;
	isActive: boolean;
	createdAt: string;
}

export interface TemplateListResponse {
	items: IngestionTemplate[];
	total: number;
}

export const templateKeys = {
	all: ['ingestion', 'templates'] as const,
	list: () => [...templateKeys.all, 'list'] as const,
};

export function useIngestionTemplates() {
	return useQuery({
		queryKey: templateKeys.list(),
		queryFn: async () => {
			const { data } = await apiClient.get<TemplateListResponse>(`${API_BASE}/templates`);
			return data;
		},
	});
}

export function useCreateTemplate() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: Omit<IngestionTemplate, 'id' | 'isActive' | 'createdAt'>) => {
			const { data } = await apiClient.post<IngestionTemplate>(`${API_BASE}/templates`, input);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: templateKeys.all });
		},
	});
}

export function useDeleteTemplate() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`${API_BASE}/templates/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: templateKeys.all });
		},
	});
}


// ==================== Validation Types & Hooks ====================

export interface ValidationRule {
	id: string;
	name: string;
	ruleType: 'file_size' | 'file_type' | 'naming';
	config: Record<string, unknown>;
	isActive: boolean;
	createdAt: string;
}

export interface FileValidationResult {
	valid: boolean;
	errors: string[];
	warnings: string[];
}

export function useValidationRules() {
	return useQuery({
		queryKey: ['ingestion', 'validation-rules'] as const,
		queryFn: async () => {
			const { data } = await apiClient.get<ValidationRule[]>(`${API_BASE}/validation-rules`);
			return data;
		},
	});
}

export function useValidateFiles() {
	return useMutation({
		mutationFn: async (input: { filePaths: string[]; templateId?: string }) => {
			const { data } = await apiClient.post<FileValidationResult[]>(`${API_BASE}/validate`, input);
			return data;
		},
	});
}
