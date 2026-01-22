// (c) Copyright Datacraft, 2026
/**
 * Batch tracking API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
	ScanBatch,
	ScanBatchSummary,
	BatchDashboardStats,
	SourceLocation,
	SourceLocationTree,
	CreateBatchInput,
	UpdateBatchInput,
	CreateLocationInput,
	BatchStatus,
	LocationType,
} from './types';

const API_BASE = '/batches';
const LOCATIONS_API = '/locations';

// ============ Batches ============

export function useBatches(options?: {
	status?: BatchStatus;
	projectId?: string;
	operatorId?: string;
	skip?: number;
	limit?: number;
}) {
	return useQuery({
		queryKey: ['batches', options],
		queryFn: async () => {
			const params: Record<string, unknown> = {};
			if (options?.status) params.status = options.status;
			if (options?.projectId) params.project_id = options.projectId;
			if (options?.operatorId) params.operator_id = options.operatorId;
			if (options?.skip) params.skip = options.skip;
			if (options?.limit) params.limit = options.limit;
			const { data } = await apiClient.get<ScanBatchSummary[]>(API_BASE, { params });
			return data;
		},
	});
}

export function useBatchStats() {
	return useQuery({
		queryKey: ['batch-stats'],
		queryFn: async () => {
			const { data } = await apiClient.get<BatchDashboardStats>(`${API_BASE}/stats`);
			return data;
		},
	});
}

export function useBatch(batchId: string) {
	return useQuery({
		queryKey: ['batch', batchId],
		queryFn: async () => {
			const { data } = await apiClient.get<ScanBatch>(`${API_BASE}/${batchId}`);
			return data;
		},
		enabled: !!batchId,
	});
}

export function useCreateBatch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateBatchInput) => {
			const { data } = await apiClient.post<ScanBatch>(API_BASE, input);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['batches'] });
			queryClient.invalidateQueries({ queryKey: ['batch-stats'] });
		},
	});
}

export function useUpdateBatch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, ...input }: { id: string } & UpdateBatchInput) => {
			const { data } = await apiClient.patch<ScanBatch>(`${API_BASE}/${id}`, input);
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['batches'] });
			queryClient.invalidateQueries({ queryKey: ['batch', variables.id] });
			queryClient.invalidateQueries({ queryKey: ['batch-stats'] });
		},
	});
}

export function useStartBatch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<ScanBatch>(`${API_BASE}/${id}/start`);
			return data;
		},
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ['batches'] });
			queryClient.invalidateQueries({ queryKey: ['batch', id] });
			queryClient.invalidateQueries({ queryKey: ['batch-stats'] });
		},
	});
}

export function usePauseBatch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<ScanBatch>(`${API_BASE}/${id}/pause`);
			return data;
		},
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ['batches'] });
			queryClient.invalidateQueries({ queryKey: ['batch', id] });
			queryClient.invalidateQueries({ queryKey: ['batch-stats'] });
		},
	});
}

export function useCompleteBatch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<ScanBatch>(`${API_BASE}/${id}/complete`);
			return data;
		},
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: ['batches'] });
			queryClient.invalidateQueries({ queryKey: ['batch', id] });
			queryClient.invalidateQueries({ queryKey: ['batch-stats'] });
		},
	});
}

export function useDeleteBatch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`${API_BASE}/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['batches'] });
			queryClient.invalidateQueries({ queryKey: ['batch-stats'] });
		},
	});
}

// ============ Locations ============

export function useLocations(options?: {
	locationType?: LocationType;
	parentId?: string;
	activeOnly?: boolean;
}) {
	return useQuery({
		queryKey: ['locations', options],
		queryFn: async () => {
			const params: Record<string, unknown> = {};
			if (options?.locationType) params.location_type = options.locationType;
			if (options?.parentId) params.parent_id = options.parentId;
			if (options?.activeOnly !== undefined) params.active_only = options.activeOnly;
			const { data } = await apiClient.get<SourceLocation[]>(LOCATIONS_API, { params });
			return data;
		},
	});
}

export function useLocationTree(activeOnly: boolean = true) {
	return useQuery({
		queryKey: ['location-tree', activeOnly],
		queryFn: async () => {
			const { data } = await apiClient.get<SourceLocationTree[]>(
				`${LOCATIONS_API}/tree`,
				{ params: { active_only: activeOnly } }
			);
			return data;
		},
	});
}

export function useLocation(locationId: string) {
	return useQuery({
		queryKey: ['location', locationId],
		queryFn: async () => {
			const { data } = await apiClient.get<SourceLocation>(`${LOCATIONS_API}/${locationId}`);
			return data;
		},
		enabled: !!locationId,
	});
}

export function useCreateLocation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateLocationInput) => {
			const { data } = await apiClient.post<SourceLocation>(LOCATIONS_API, input);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['locations'] });
			queryClient.invalidateQueries({ queryKey: ['location-tree'] });
		},
	});
}

export function useUpdateLocation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, ...input }: { id: string } & Partial<SourceLocation>) => {
			const { data } = await apiClient.patch<SourceLocation>(`${LOCATIONS_API}/${id}`, input);
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['locations'] });
			queryClient.invalidateQueries({ queryKey: ['location', variables.id] });
			queryClient.invalidateQueries({ queryKey: ['location-tree'] });
		},
	});
}

export function useDeleteLocation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`${LOCATIONS_API}/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['locations'] });
			queryClient.invalidateQueries({ queryKey: ['location-tree'] });
		},
	});
}
