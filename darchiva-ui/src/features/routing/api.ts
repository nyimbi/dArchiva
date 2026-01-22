// (c) Copyright Datacraft, 2026
/**
 * Routing Rules API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { RoutingRule } from '@/types';

const API_BASE = '/routing/rules';

export interface RoutingRuleListResponse {
	items: RoutingRule[];
	total: number;
	page: number;
	page_size: number;
}

export interface RoutingStats {
	total: number;
	active: number;
	operational: number;
	archival: number;
}

export interface TestRulesRequest {
	documentType?: string;
	tags?: string[];
	metadata?: Record<string, unknown>;
	mode: 'operational' | 'archival';
}

export interface TestRulesResponse {
	matchedRules: RoutingRule[];
	destination: {
		type: string;
		id: string;
		name: string;
	} | null;
}

export const routingKeys = {
	all: ['routing'] as const,
	lists: () => [...routingKeys.all, 'list'] as const,
	list: (filters?: Record<string, unknown>) => [...routingKeys.lists(), filters] as const,
	detail: (id: string) => [...routingKeys.all, 'detail', id] as const,
	stats: () => [...routingKeys.all, 'stats'] as const,
};

export function useRoutingRules(page = 1, pageSize = 50, mode?: string) {
	return useQuery({
		queryKey: routingKeys.list({ page, mode }),
		queryFn: async () => {
			const params: Record<string, unknown> = { page, page_size: pageSize };
			if (mode) params.mode = mode;
			const { data } = await apiClient.get<RoutingRuleListResponse>(API_BASE, { params });
			return data;
		},
	});
}

export function useRoutingRule(id: string) {
	return useQuery({
		queryKey: routingKeys.detail(id),
		queryFn: async () => {
			const { data } = await apiClient.get<RoutingRule>(`${API_BASE}/${id}`);
			return data;
		},
		enabled: !!id,
	});
}

export function useRoutingStats() {
	return useQuery({
		queryKey: routingKeys.stats(),
		queryFn: async () => {
			const { data } = await apiClient.get<RoutingStats>(`${API_BASE}/stats`);
			return data;
		},
	});
}

export function useCreateRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: Omit<RoutingRule, 'id'>) => {
			const { data } = await apiClient.post<RoutingRule>(API_BASE, input);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: routingKeys.all });
		},
	});
}

export function useUpdateRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data: input }: { id: string; data: Partial<RoutingRule> }) => {
			const { data } = await apiClient.patch<RoutingRule>(`${API_BASE}/${id}`, input);
			return data;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: routingKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: routingKeys.lists() });
		},
	});
}

export function useDeleteRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`${API_BASE}/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: routingKeys.all });
		},
	});
}

export function useToggleRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
			const { data } = await apiClient.patch<RoutingRule>(`${API_BASE}/${id}`, { isActive });
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: routingKeys.all });
		},
	});
}

export function useTestRoutingRules() {
	return useMutation({
		mutationFn: async (input: TestRulesRequest) => {
			const { data } = await apiClient.post<TestRulesResponse>(`${API_BASE}/test`, input);
			return data;
		},
	});
}
