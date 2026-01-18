// (c) Copyright Datacraft, 2026
/**
 * Cases and Bundles API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = '/api/v1';

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
			const response = await axios.get<CaseListResponse>(`${API_BASE}/cases`, { params });
			return response.data;
		},
	});
}

export function useCase(id: string) {
	return useQuery({
		queryKey: caseKeys.detail(id),
		queryFn: async () => {
			const response = await axios.get<Case>(`${API_BASE}/cases/${id}`);
			return response.data;
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
			const response = await axios.get<BundleListResponse>(`${API_BASE}/bundles`, { params });
			return response.data;
		},
	});
}

export function useBundle(id: string) {
	return useQuery({
		queryKey: caseKeys.bundle(id),
		queryFn: async () => {
			const response = await axios.get<Bundle>(`${API_BASE}/bundles/${id}`);
			return response.data;
		},
		enabled: !!id,
	});
}

export function useCreateCase() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: { title: string; description?: string; portfolioId?: string }) => {
			const response = await axios.post<Case>(`${API_BASE}/cases`, data);
			return response.data;
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
			const response = await axios.patch<Case>(`${API_BASE}/cases/${id}`, data);
			return response.data;
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
			const response = await axios.post<Case>(`${API_BASE}/cases/${id}/close`);
			return response.data;
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
			const response = await axios.post<Bundle>(`${API_BASE}/bundles`, data);
			return response.data;
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
			const response = await axios.patch<Bundle>(`${API_BASE}/bundles/${id}`, data);
			return response.data;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: caseKeys.bundle(id) });
			queryClient.invalidateQueries({ queryKey: caseKeys.bundles() });
		},
	});
}
