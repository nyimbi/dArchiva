// (c) Copyright Datacraft, 2026
/**
 * Cases and Bundles API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';

export type CaseStatus = 'open' | 'closed' | 'pending' | 'on_hold';
export type BundleStatus = 'draft' | 'active' | 'archived' | 'locked';

export interface Case {
	id: string;
	caseNumber: string;
	title: string;
	description?: string;
	status: CaseStatus;
	portfolioId?: string;
	portfolioName?: string;
	documentCount: number;
	bundleCount: number;
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	metadata?: Record<string, unknown>;
}

export interface Bundle {
	id: string;
	name: string;
	description?: string;
	status: BundleStatus;
	caseId: string;
	caseName: string;
	documentCount: number;
	pageCount: number;
	createdAt: string;
	updatedAt: string;
}

export interface CaseListResponse {
	items: Case[];
	total: number;
	page: number;
	page_size: number;
}

export interface BundleListResponse {
	items: Bundle[];
	total: number;
	page: number;
	page_size: number;
}

export const caseKeys = {
	all: ['cases'] as const,
	lists: () => [...caseKeys.all, 'list'] as const,
	list: (filters?: Record<string, unknown>) => [...caseKeys.lists(), filters] as const,
	detail: (id: string) => [...caseKeys.all, 'detail', id] as const,
	bundles: (caseId?: string) => [...caseKeys.all, 'bundles', caseId] as const,
	bundle: (id: string) => [...caseKeys.all, 'bundle', id] as const,
};

export function useCases(page = 1, pageSize = 20, status?: CaseStatus, portfolioId?: string) {
	return useQuery({
		queryKey: caseKeys.list({ page, status, portfolioId }),
		queryFn: async () => {
			const params: Record<string, unknown> = { page, page_size: pageSize };
			if (status) params.status = status;
			if (portfolioId) params.portfolio_id = portfolioId;
			const { data } = await apiClient.get<CaseListResponse>('/cases', { params });
			return data;
		},
	});
}

export function useCase(id: string) {
	return useQuery({
		queryKey: caseKeys.detail(id),
		queryFn: async () => {
			const { data } = await apiClient.get<Case>(`/cases/${id}`);
			return data;
		},
		enabled: !!id,
	});
}

export function useBundles(caseId?: string, page = 1, pageSize = 20) {
	return useQuery({
		queryKey: caseKeys.bundles(caseId),
		queryFn: async () => {
			const params: Record<string, unknown> = { page, page_size: pageSize };
			if (caseId) params.case_id = caseId;
			const { data } = await apiClient.get<BundleListResponse>('/bundles', { params });
			return data;
		},
	});
}

export function useBundle(id: string) {
	return useQuery({
		queryKey: caseKeys.bundle(id),
		queryFn: async () => {
			const { data } = await apiClient.get<Bundle>(`/bundles/${id}`);
			return data;
		},
		enabled: !!id,
	});
}

export function useCreateCase() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { title: string; description?: string; portfolioId?: string }) => {
			const { data: createdCase } = await apiClient.post<Case>('/cases', data);
			return createdCase;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: caseKeys.all });
		},
	});
}

export function useUpdateCase() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<Case> }) => {
			const { data: updatedCase } = await apiClient.patch<Case>(`/cases/${id}`, data);
			return updatedCase;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: caseKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: caseKeys.lists() });
		},
	});
}

export function useCloseCase() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<Case>(`/cases/${id}/close`);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: caseKeys.all });
		},
	});
}

export function useCreateBundle() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { name: string; caseId: string; description?: string }) => {
			const { data: createdBundle } = await apiClient.post<Bundle>('/bundles', data);
			return createdBundle;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: caseKeys.bundles() });
		},
	});
}

export function useUpdateBundle() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<Bundle> }) => {
			const { data: updatedBundle } = await apiClient.patch<Bundle>(`/bundles/${id}`, data);
			return updatedBundle;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: caseKeys.bundle(id) });
			queryClient.invalidateQueries({ queryKey: caseKeys.bundles() });
		},
	});
}
