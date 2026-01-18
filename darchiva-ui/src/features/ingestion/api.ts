// (c) Copyright Datacraft, 2026
/**
 * Ingestion API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = '/api/v1/ingestion';

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
			const response = await axios.get<SourceListResponse>(`${API_BASE}/sources`);
			return response.data;
		},
	});
}

export function useIngestionSource(id: string) {
	return useQuery({
		queryKey: ingestionKeys.source(id),
		queryFn: async () => {
			const response = await axios.get<IngestionSource>(`${API_BASE}/sources/${id}`);
			return response.data;
		},
		enabled: !!id,
	});
}

export function useIngestionJobs(filters?: { sourceId?: string; status?: JobStatus; limit?: number }) {
	return useQuery({
		queryKey: ingestionKeys.jobs(filters),
		queryFn: async () => {
			const response = await axios.get<JobListResponse>(`${API_BASE}/jobs`, { params: filters });
			return response.data;
		},
	});
}

export function useIngestionStats() {
	return useQuery({
		queryKey: ingestionKeys.stats(),
		queryFn: async () => {
			const response = await axios.get<IngestionStats>(`${API_BASE}/stats`);
			return response.data;
		},
	});
}

export function useCreateSource() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: Partial<IngestionSource>) => {
			const response = await axios.post<IngestionSource>(`${API_BASE}/sources`, data);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ingestionKeys.sources() });
		},
	});
}

export function useUpdateSource() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<IngestionSource> }) => {
			const response = await axios.patch<IngestionSource>(`${API_BASE}/sources/${id}`, data);
			return response.data;
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
			await axios.delete(`${API_BASE}/sources/${id}`);
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
			const response = await axios.patch<IngestionSource>(`${API_BASE}/sources/${id}/toggle`, { isActive });
			return response.data;
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
			const response = await axios.post<IngestionJob>(`${API_BASE}/sources/${sourceId}/trigger`);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ingestionKeys.jobs() });
		},
	});
}
