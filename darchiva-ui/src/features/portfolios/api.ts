// (c) Copyright Datacraft, 2026
/**
 * Portfolios API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';

export type PortfolioStatus = 'active' | 'archived' | 'on_hold';

export interface Portfolio {
	id: string;
	name: string;
	description?: string;
	status: PortfolioStatus;
	caseCount: number;
	documentCount: number;
	tags: string[];
	createdAt: string;
	updatedAt: string;
	createdBy: string;
	metadata?: Record<string, unknown>;
}

export interface PortfolioDocument {
	id: string;
	title: string;
	createdAt?: string;
	updatedAt?: string;
	pageCount?: number;
}

export interface PortfolioListResponse {
	items: Portfolio[];
	total: number;
	page: number;
	page_size: number;
}

export interface PortfolioDocumentsResponse {
	items: PortfolioDocument[];
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
	documents: (id: string) => [...portfolioKeys.detail(id), 'documents'] as const,
};

export function usePortfolios(page = 1, pageSize = 20, status?: PortfolioStatus, search?: string) {
	return useQuery({
		queryKey: portfolioKeys.list({ page, pageSize, status, search }),
		queryFn: async () => {
			const params: Record<string, unknown> = { page, page_size: pageSize };
			if (status) params.status = status;
			if (search?.trim()) params.search = search.trim();
			const { data } = await apiClient.get<PortfolioListResponse>('/portfolios/', { params });
			return data;
		},
	});
}

export function usePortfolioDocuments(portfolioId?: string, page = 1, pageSize = 50) {
	return useQuery({
		queryKey: portfolioId
			? [...portfolioKeys.documents(portfolioId), page, pageSize]
			: [...portfolioKeys.all, 'documents', 'none'],
		queryFn: async () => {
			const { data } = await apiClient.get<PortfolioDocumentsResponse>(
				`/portfolios/${portfolioId}/documents`,
				{ params: { page, page_size: pageSize } },
			);
			return data;
		},
		enabled: !!portfolioId,
	});
}

export function usePortfolio(id: string) {
	return useQuery({
		queryKey: portfolioKeys.detail(id),
		queryFn: async () => {
			const { data } = await apiClient.get<Portfolio>(`/portfolios/${id}`);
			return data;
		},
		enabled: !!id,
	});
}

export function usePortfolioStats() {
	return useQuery({
		queryKey: portfolioKeys.stats(),
		queryFn: async () => {
			const { data } = await apiClient.get<PortfolioStats>('/portfolios/stats');
			return data;
		},
	});
}

export function useCreatePortfolio() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { name: string; description?: string; tags?: string[] }) => {
			const { data: portfolio } = await apiClient.post<Portfolio>('/portfolios/', data);
			return portfolio;
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
			const { data: portfolio } = await apiClient.patch<Portfolio>(`/portfolios/${id}`, data);
			return portfolio;
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

export function useRemovePortfolioDocument(portfolioId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (documentId: string) => {
			await apiClient.delete(`/portfolios/${portfolioId}/documents`, {
				data: { document_ids: [documentId] },
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: portfolioKeys.documents(portfolioId) });
			queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
		},
	});
}

export function useArchivePortfolio() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<Portfolio>(`/portfolios/${id}/archive`);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: portfolioKeys.all });
		},
	});
}
