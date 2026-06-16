// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// =====================================================
// Types
// =====================================================

export type ExceptionType =
	| 'quality_rejected'
	| 'missing_signature'
	| 'incomplete_set'
	| 'barcode_unreadable'
	| 'orientation_error';

export type ExceptionSeverity = 'warning' | 'error' | 'critical';

export type ExceptionStatus =
	| 'open'
	| 'in_review'
	| 'resolved'
	| 'dismissed'
	| 'auto_resolved';

export type RoutingAction = string;

export interface ExceptionEvent {
	id: string;
	scan_job_id: string | null;
	document_id: string | null;
	batch_id: string | null;
	page_number: number | null;
	exception_type: ExceptionType;
	severity: ExceptionSeverity;
	status: ExceptionStatus;
	routing_action: RoutingAction | null;
	description: string;
	auto_fixable: boolean;
	quality_score: number | null;
	defects: string[] | null;
	resolved_by_id: string | null;
	resolved_at: string | null;
	resolution_notes: string | null;
	tenant_id: string;
	created_at: string;
}

export interface ExceptionStats {
	total_open: number;
	total_in_review: number;
	total_resolved: number;
	by_type: Record<ExceptionType, number>;
	by_severity: Record<ExceptionSeverity, number>;
	auto_fixable_count: number;
}

export interface ExceptionFilters {
	status?: ExceptionStatus;
	exception_type?: ExceptionType;
	batch_id?: string;
	limit?: number;
	offset?: number;
}

export interface PaginatedExceptions {
	items: ExceptionEvent[];
	total: number;
	page: number;
	page_size: number;
}

export interface AutoFixResult {
	fixed_count: number;
	failed_count: number;
}

export interface ExceptionRoutingRule {
	id: string;
	exception_type: ExceptionType;
	action: string;
	priority: number;
	is_active: boolean;
	config: Record<string, unknown> | null;
	created_at: string;
}

export interface CreateRoutingRuleInput {
	exception_type: ExceptionType;
	action: string;
	priority: number;
	is_active: boolean;
	config?: Record<string, unknown>;
}

export type UpdateRoutingRuleInput = Partial<CreateRoutingRuleInput>;

const BASE_URL = '/exceptions';

// =====================================================
// Query Keys
// =====================================================

export const exceptionKeys = {
	all: ['exceptions'] as const,
	lists: () => [...exceptionKeys.all, 'list'] as const,
	list: (filters: ExceptionFilters) => [...exceptionKeys.lists(), filters] as const,
	stats: () => [...exceptionKeys.all, 'stats'] as const,
	detail: (id: string) => [...exceptionKeys.all, 'detail', id] as const,
	routingRules: () => [...exceptionKeys.all, 'routing-rules'] as const,
};

// =====================================================
// Queries
// =====================================================

export function useExceptions(filters: ExceptionFilters = {}) {
	return useQuery({
		queryKey: exceptionKeys.list(filters),
		queryFn: async () => {
			const params = new URLSearchParams();
			if (filters.status) params.set('status', filters.status);
			if (filters.exception_type) params.set('exception_type', filters.exception_type);
			if (filters.batch_id) params.set('batch_id', filters.batch_id);
			if (filters.limit != null) params.set('limit', String(filters.limit));
			if (filters.offset != null) params.set('offset', String(filters.offset));
			const qs = params.toString();
			const res = await apiClient.get<PaginatedExceptions>(`${BASE_URL}${qs ? `?${qs}` : ''}`);
			return res.data;
		},
		refetchInterval: 30_000,
	});
}

export function useExceptionStats() {
	return useQuery({
		queryKey: exceptionKeys.stats(),
		queryFn: async () => {
			const res = await apiClient.get<ExceptionStats>(`${BASE_URL}/stats`);
			return res.data;
		},
		refetchInterval: 30_000,
	});
}

export function useExceptionRoutingRules() {
	return useQuery({
		queryKey: exceptionKeys.routingRules(),
		queryFn: async () => {
			const res = await apiClient.get<ExceptionRoutingRule[]>(`${BASE_URL}/routing-rules`);
			return res.data;
		},
	});
}

// =====================================================
// Mutations
// =====================================================

export function useResolveException() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, resolution_notes }: { id: string; resolution_notes: string }) => {
			const res = await apiClient.patch<ExceptionEvent>(`${BASE_URL}/${id}/resolve`, {
				resolution_notes,
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: exceptionKeys.all });
		},
	});
}

export function useDismissException() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
			const res = await apiClient.patch<ExceptionEvent>(`${BASE_URL}/${id}/dismiss`, {
				notes: notes ?? '',
			});
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: exceptionKeys.all });
		},
	});
}

export function useAutoFixAll() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			const res = await apiClient.post<AutoFixResult>(`${BASE_URL}/auto-fix-all`);
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: exceptionKeys.all });
		},
	});
}

export function useCreateRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: CreateRoutingRuleInput) => {
			const res = await apiClient.post<ExceptionRoutingRule>(`${BASE_URL}/routing-rules`, data);
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: exceptionKeys.routingRules() });
		},
	});
}

export function useUpdateRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: UpdateRoutingRuleInput }) => {
			const res = await apiClient.patch<ExceptionRoutingRule>(
				`${BASE_URL}/routing-rules/${id}`,
				data
			);
			return res.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: exceptionKeys.routingRules() });
		},
	});
}

export function useDeleteRoutingRule() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`${BASE_URL}/routing-rules/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: exceptionKeys.routingRules() });
		},
	});
}
