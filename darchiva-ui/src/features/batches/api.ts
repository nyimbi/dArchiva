// (c) Copyright Datacraft, 2026
/**
 * Batch tracking API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const API_BASE = '/api/batches';
const LOCATIONS_API = '/api/locations';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
	});
	if (!response.ok) {
		throw new Error(`API error: ${response.statusText}`);
	}
	return response.json();
}

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
		queryFn: () => {
			const params = new URLSearchParams();
			if (options?.status) params.set('status', options.status);
			if (options?.projectId) params.set('project_id', options.projectId);
			if (options?.operatorId) params.set('operator_id', options.operatorId);
			if (options?.skip) params.set('skip', options.skip.toString());
			if (options?.limit) params.set('limit', options.limit.toString());
			return fetchJson<ScanBatchSummary[]>(`${API_BASE}?${params}`);
		},
	});
}

export function useBatchStats() {
	return useQuery({
		queryKey: ['batch-stats'],
		queryFn: () => fetchJson<BatchDashboardStats>(`${API_BASE}/stats`),
	});
}

export function useBatch(batchId: string) {
	return useQuery({
		queryKey: ['batch', batchId],
		queryFn: () => fetchJson<ScanBatch>(`${API_BASE}/${batchId}`),
		enabled: !!batchId,
	});
}

export function useCreateBatch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateBatchInput) =>
			fetchJson<ScanBatch>(`${API_BASE}`, {
				method: 'POST',
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['batches'] });
			queryClient.invalidateQueries({ queryKey: ['batch-stats'] });
		},
	});
}

export function useUpdateBatch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & UpdateBatchInput) =>
			fetchJson<ScanBatch>(`${API_BASE}/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data),
			}),
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
		mutationFn: (id: string) =>
			fetchJson<ScanBatch>(`${API_BASE}/${id}/start`, { method: 'POST' }),
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
		mutationFn: (id: string) =>
			fetchJson<ScanBatch>(`${API_BASE}/${id}/pause`, { method: 'POST' }),
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
		mutationFn: (id: string) =>
			fetchJson<ScanBatch>(`${API_BASE}/${id}/complete`, { method: 'POST' }),
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
		mutationFn: (id: string) =>
			fetch(`${API_BASE}/${id}`, { method: 'DELETE' }),
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
		queryFn: () => {
			const params = new URLSearchParams();
			if (options?.locationType) params.set('location_type', options.locationType);
			if (options?.parentId) params.set('parent_id', options.parentId);
			if (options?.activeOnly !== undefined)
				params.set('active_only', options.activeOnly.toString());
			return fetchJson<SourceLocation[]>(`${LOCATIONS_API}?${params}`);
		},
	});
}

export function useLocationTree(activeOnly: boolean = true) {
	return useQuery({
		queryKey: ['location-tree', activeOnly],
		queryFn: () =>
			fetchJson<SourceLocationTree[]>(
				`${LOCATIONS_API}/tree?active_only=${activeOnly}`
			),
	});
}

export function useLocation(locationId: string) {
	return useQuery({
		queryKey: ['location', locationId],
		queryFn: () => fetchJson<SourceLocation>(`${LOCATIONS_API}/${locationId}`),
		enabled: !!locationId,
	});
}

export function useCreateLocation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateLocationInput) =>
			fetchJson<SourceLocation>(`${LOCATIONS_API}`, {
				method: 'POST',
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['locations'] });
			queryClient.invalidateQueries({ queryKey: ['location-tree'] });
		},
	});
}

export function useUpdateLocation() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & Partial<SourceLocation>) =>
			fetchJson<SourceLocation>(`${LOCATIONS_API}/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data),
			}),
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
		mutationFn: (id: string) =>
			fetch(`${LOCATIONS_API}/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['locations'] });
			queryClient.invalidateQueries({ queryKey: ['location-tree'] });
		},
	});
}
