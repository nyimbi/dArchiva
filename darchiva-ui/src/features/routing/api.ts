// (c) Copyright Datacraft, 2026
/**
 * Routing Rules API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import type { RoutingRule } from '@/types';

const API_BASE = '/api/v1/routing';

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
			const response = await axios.get<RoutingRuleListResponse>(API_BASE, { params });
			return response.data;
		},
	});
}

export function useRoutingRule(id: string) {
	return useQuery({
		queryKey: routingKeys.detail(id),
		queryFn: async () => {
			const response = await axios.get<RoutingRule>(`${API_BASE}/${id}`);
			return response.data;
		},
		enabled: !!id,
	});
}

export function useRoutingStats() {
	return useQuery({
		queryKey: routingKeys.stats(),
		queryFn: async () => {
			const response = await axios.get<RoutingStats>(`${API_BASE}/stats`);
			return response.data;
		},
	});
}

export function useCreateRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: Omit<RoutingRule, 'id'>) => {
			const response = await axios.post<RoutingRule>(API_BASE, data);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: routingKeys.all });
		},
	});
}

export function useUpdateRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<RoutingRule> }) => {
			const response = await axios.patch<RoutingRule>(`${API_BASE}/${id}`, data);
			return response.data;
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
			await axios.delete(`${API_BASE}/${id}`);
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
			const response = await axios.patch<RoutingRule>(`${API_BASE}/${id}`, { isActive });
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: routingKeys.all });
		},
	});
}

export function useTestRoutingRules() {
	return useMutation({
		mutationFn: async (data: TestRulesRequest) => {
			const response = await axios.post<TestRulesResponse>(`${API_BASE}/test`, data);
			return response.data;
		},
	});
}
