// (c) Copyright Datacraft, 2026
/**
 * Portfolios API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export type PortfolioStatus = 'active' | 'archived' | 'on_hold';

export interface Portfolio {
	id: string;
	name: string;
	description?: string;
	status: PortfolioStatus;
	caseCount: number;
	documentCount: number;
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	metadata?: Record<string, unknown>;
}

export interface PortfolioListResponse {
	items: Portfolio[];
	total: number;
	page: number;
	page_size: number;
}

export interface PortfolioStats {
	total: number;
	active: number;
	totalCases: number;
	totalDocuments: number;
}

export const portfolioKeys = {
	all: ['portfolios'] as const,
	lists: () => [...portfolioKeys.all, 'list'] as const,
	list: (filters?: Record<string, unknown>) => [...portfolioKeys.lists(), filters] as const,
	detail: (id: string) => [...portfolioKeys.all, 'detail', id] as const,
	stats: () => [...portfolioKeys.all, 'stats'] as const,
};

export function usePortfolios(page = 1, pageSize = 20, status?: PortfolioStatus) {
	return useQuery({
		queryKey: portfolioKeys.list({ page, status }),
		queryFn: async () => {
			const params: Record<string, unknown> = { page, page_size: pageSize };
			if (status) params.status = status;
			const response = await apiClient.get<PortfolioListResponse>('/portfolios/', { params });
			return response.data;
		},
	});
}

export function usePortfolio(id: string) {
	return useQuery({
		queryKey: portfolioKeys.detail(id),
		queryFn: async () => {
			const response = await apiClient.get<Portfolio>(`/portfolios/${id}`);
			return response.data;
		},
		enabled: !!id,
	});
}

export function usePortfolioStats() {
	return useQuery({
		queryKey: portfolioKeys.stats(),
		queryFn: async () => {
			const response = await apiClient.get<PortfolioStats>('/portfolios/stats');
			return response.data;
		},
	});
}

export function useCreatePortfolio() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { name: string; description?: string }) => {
			const response = await apiClient.post<Portfolio>('/portfolios/', data);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
		},
	});
}

export function useUpdatePortfolio() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<Portfolio> }) => {
			const response = await apiClient.patch<Portfolio>(`/portfolios/${id}`, data);
			return response.data;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: portfolioKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: portfolioKeys.lists() });
		},
	});
}

export function useDeletePortfolio() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/portfolios/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
		},
	});
}

export function useArchivePortfolio() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const response = await apiClient.post<Portfolio>(`/portfolios/${id}/archive`);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
		},
	});
}
