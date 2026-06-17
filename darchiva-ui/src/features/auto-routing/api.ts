// (c) Copyright Datacraft, 2026
/**
 * Auto-Routing Rules API hooks.
 *
 * Backend base: /auto-routing/rules
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AutoRoutingRule {
	id: string;
	name: string;
	document_type: string;
	confidence_threshold: number;
	destination_folder_id: string;
	project_id: string | null;
	priority: number;
	is_active: boolean;
	applied_count: number;
	tenant_id: string;
	created_by_id: string;
	created_at: string;
	updated_at: string;
}

export interface AutoRoutingRuleCreate {
	name: string;
	document_type: string;
	confidence_threshold?: number;
	destination_folder_id: string;
	project_id?: string | null;
	priority?: number;
	is_active?: boolean;
}

export type AutoRoutingRuleUpdate = Partial<AutoRoutingRuleCreate>;

export interface AutoRoutingRuleListResponse {
	items: AutoRoutingRule[];
	total: number;
	page: number;
	page_size: number;
}

export interface TestAutoRoutingRequest {
	document_id: string;
	document_type?: string;
	confidence?: number;
}

export interface TestAutoRoutingResponse {
	would_route: boolean;
	matched_rule: AutoRoutingRule | null;
	destination_folder_id: string | null;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const autoRoutingKeys = {
	all: ['auto-routing'] as const,
	lists: () => [...autoRoutingKeys.all, 'list'] as const,
	list: (filters?: Record<string, unknown>) =>
		[...autoRoutingKeys.lists(), filters] as const,
	detail: (id: string) => [...autoRoutingKeys.all, 'detail', id] as const,
};

const API_BASE = '/auto-routing/rules';

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAutoRoutingRules(
	page = 1,
	pageSize = 50,
	activeOnly = false,
) {
	return useQuery({
		queryKey: autoRoutingKeys.list({ page, pageSize, activeOnly }),
		queryFn: async () => {
			const params: Record<string, unknown> = {
				page,
				page_size: pageSize,
				active_only: activeOnly,
			};
			const { data } = await apiClient.get<AutoRoutingRuleListResponse>(
				API_BASE,
				{ params },
			);
			return data;
		},
	});
}

export function useCreateAutoRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: AutoRoutingRuleCreate) => {
			const { data } = await apiClient.post<AutoRoutingRule>(API_BASE, input);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: autoRoutingKeys.all });
		},
	});
}

export function useUpdateAutoRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			data: input,
		}: {
			id: string;
			data: AutoRoutingRuleUpdate;
		}) => {
			const { data } = await apiClient.patch<AutoRoutingRule>(
				`${API_BASE}/${id}`,
				input,
			);
			return data;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: autoRoutingKeys.detail(id) });
			queryClient.invalidateQueries({ queryKey: autoRoutingKeys.lists() });
		},
	});
}

export function useDeleteAutoRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`${API_BASE}/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: autoRoutingKeys.all });
		},
	});
}

export function useTestAutoRoutingRule() {
	return useMutation({
		mutationFn: async ({
			ruleId,
			...body
		}: TestAutoRoutingRequest & { ruleId: string }) => {
			const { data } = await apiClient.post<TestAutoRoutingResponse>(
				`${API_BASE}/${ruleId}/test`,
				body,
			);
			return data;
		},
	});
}
