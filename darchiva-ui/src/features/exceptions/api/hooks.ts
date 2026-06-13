// (c) Copyright Datacraft, 2026
/**
 * Exception queue API hooks using React Query.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
	DocumentException,
	ExceptionFilters,
	ExceptionStats,
} from '../types';

const API_BASE = '/exceptions';

export const exceptionKeys = {
	all: ['exceptions'] as const,
	list: (filters?: ExceptionFilters) => [...exceptionKeys.all, 'list', filters] as const,
	stats: () => [...exceptionKeys.all, 'stats'] as const,
};

export function useExceptions(filters?: ExceptionFilters) {
	return useQuery({
		queryKey: exceptionKeys.list(filters),
		queryFn: async () => {
			const params: Record<string, unknown> = {};
			if (filters?.status) params.status = filters.status;
			if (filters?.type) params.type = filters.type;
			if (filters?.severity) params.severity = filters.severity;
			if (filters?.batchId) params.batch_id = filters.batchId;
			if (filters?.page) params.page = filters.page;
			if (filters?.pageSize) params.page_size = filters.pageSize;
			const { data } = await apiClient.get<{
				items: DocumentException[];
				total: number;
				page: number;
				pageSize: number;
			}>(API_BASE, { params });
			return data;
		},
	});
}

export function useResolveException() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, resolutionNotes }: { id: string; resolutionNotes?: string }) => {
			const { data } = await apiClient.patch<DocumentException>(
				`${API_BASE}/${id}/resolve`,
				resolutionNotes ? { resolution_notes: resolutionNotes } : {}
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: exceptionKeys.all });
		},
	});
}

export function useDismissException() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
			const { data } = await apiClient.patch<DocumentException>(
				`${API_BASE}/${id}/dismiss`,
				reason ? { reason } : {}
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: exceptionKeys.all });
		},
	});
}

export function useExceptionStats() {
	return useQuery({
		queryKey: exceptionKeys.stats(),
		queryFn: async () => {
			const { data } = await apiClient.get<ExceptionStats>(`${API_BASE}/stats`);
			return data;
		},
	});
}
