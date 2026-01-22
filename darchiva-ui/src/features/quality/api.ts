// (c) Copyright Datacraft, 2026
/**
 * Quality API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
	QualityRule,
	QualityAssessment,
	QualityStats,
	QualityIssueDetail,
} from './types';

const API_BASE = '/quality';

// Quality Rules
export function useQualityRules(options?: { activeOnly?: boolean; metric?: string }) {
	return useQuery({
		queryKey: ['quality-rules', options],
		queryFn: async () => {
			const params: Record<string, unknown> = {};
			if (options?.activeOnly) params.active_only = true;
			if (options?.metric) params.metric = options.metric;
			const { data } = await apiClient.get<{ items: QualityRule[]; total: number }>(
				`${API_BASE}/rules`,
				{ params }
			);
			return data;
		},
	});
}

export function useCreateQualityRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (rule: Omit<QualityRule, 'id' | 'createdAt'>) => {
			const { data } = await apiClient.post<QualityRule>(`${API_BASE}/rules`, rule);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quality-rules'] });
		},
	});
}

export function useUpdateQualityRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, ...updates }: { id: string } & Partial<QualityRule>) => {
			const { data } = await apiClient.patch<QualityRule>(`${API_BASE}/rules/${id}`, updates);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quality-rules'] });
		},
	});
}

export function useDeleteQualityRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.delete(`${API_BASE}/rules/${id}`);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quality-rules'] });
		},
	});
}

// Quality Assessments
export function useQualityAssessments(options?: {
	documentId?: string;
	passed?: boolean;
	minScore?: number;
	maxScore?: number;
	page?: number;
	pageSize?: number;
}) {
	return useQuery({
		queryKey: ['quality-assessments', options],
		queryFn: async () => {
			const params: Record<string, unknown> = {};
			if (options?.documentId) params.document_id = options.documentId;
			if (options?.passed !== undefined) params.passed = options.passed;
			if (options?.minScore !== undefined) params.min_score = options.minScore;
			if (options?.maxScore !== undefined) params.max_score = options.maxScore;
			if (options?.page) params.page = options.page;
			if (options?.pageSize) params.page_size = options.pageSize;
			const { data } = await apiClient.get<{
				items: QualityAssessment[];
				total: number;
				page: number;
				pageSize: number;
			}>(`${API_BASE}/assessments`, { params });
			return data;
		},
	});
}

export function useDocumentAssessments(documentId: string) {
	return useQuery({
		queryKey: ['quality-assessments', 'document', documentId],
		queryFn: async () => {
			const { data } = await apiClient.get<QualityAssessment[]>(`${API_BASE}/assessments/${documentId}`);
			return data;
		},
		enabled: !!documentId,
	});
}

// Quality Issues
export function useQualityIssues(options?: {
	status?: string;
	severity?: string;
	documentId?: string;
	page?: number;
	pageSize?: number;
}) {
	return useQuery({
		queryKey: ['quality-issues', options],
		queryFn: async () => {
			const params: Record<string, unknown> = {};
			if (options?.status) params.status = options.status;
			if (options?.severity) params.severity = options.severity;
			if (options?.documentId) params.document_id = options.documentId;
			if (options?.page) params.page = options.page;
			if (options?.pageSize) params.page_size = options.pageSize;
			const { data } = await apiClient.get<{
				items: QualityIssueDetail[];
				total: number;
				page: number;
				pageSize: number;
			}>(`${API_BASE}/issues`, { params });
			return data;
		},
	});
}

export function useUpdateQualityIssue() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, status, resolutionNotes }: {
			id: string;
			status: string;
			resolutionNotes?: string;
		}) => {
			const { data } = await apiClient.patch<QualityIssueDetail>(`${API_BASE}/issues/${id}`, {
				status,
				resolution_notes: resolutionNotes,
			});
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quality-issues'] });
			queryClient.invalidateQueries({ queryKey: ['quality-stats'] });
		},
	});
}

// Quality Statistics
export function useQualityStats(days: number = 7) {
	return useQuery({
		queryKey: ['quality-stats', days],
		queryFn: async () => {
			const { data } = await apiClient.get<QualityStats>(`${API_BASE}/stats`, { params: { days } });
			return data;
		},
	});
}
