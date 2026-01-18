// (c) Copyright Datacraft, 2026
/**
 * Quality API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	QualityRule,
	QualityAssessment,
	QualityStats,
	QualityIssueDetail,
} from './types';

const API_BASE = '/api/quality';

// Fetch helpers
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

// Quality Rules
export function useQualityRules(options?: { activeOnly?: boolean; metric?: string }) {
	return useQuery({
		queryKey: ['quality-rules', options],
		queryFn: () => {
			const params = new URLSearchParams();
			if (options?.activeOnly) params.set('active_only', 'true');
			if (options?.metric) params.set('metric', options.metric);
			return fetchJson<{ items: QualityRule[]; total: number }>(
				`${API_BASE}/rules?${params}`
			);
		},
	});
}

export function useCreateQualityRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (rule: Omit<QualityRule, 'id' | 'createdAt'>) =>
			fetchJson<QualityRule>(`${API_BASE}/rules`, {
				method: 'POST',
				body: JSON.stringify(rule),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quality-rules'] });
		},
	});
}

export function useUpdateQualityRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...updates }: { id: string } & Partial<QualityRule>) =>
			fetchJson<QualityRule>(`${API_BASE}/rules/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(updates),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['quality-rules'] });
		},
	});
}

export function useDeleteQualityRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) =>
			fetchJson<{ success: boolean }>(`${API_BASE}/rules/${id}`, {
				method: 'DELETE',
			}),
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
		queryFn: () => {
			const params = new URLSearchParams();
			if (options?.documentId) params.set('document_id', options.documentId);
			if (options?.passed !== undefined)
				params.set('passed', options.passed.toString());
			if (options?.minScore !== undefined)
				params.set('min_score', options.minScore.toString());
			if (options?.maxScore !== undefined)
				params.set('max_score', options.maxScore.toString());
			if (options?.page) params.set('page', options.page.toString());
			if (options?.pageSize) params.set('page_size', options.pageSize.toString());
			return fetchJson<{
				items: QualityAssessment[];
				total: number;
				page: number;
				pageSize: number;
			}>(`${API_BASE}/assessments?${params}`);
		},
	});
}

export function useDocumentAssessments(documentId: string) {
	return useQuery({
		queryKey: ['quality-assessments', 'document', documentId],
		queryFn: () =>
			fetchJson<QualityAssessment[]>(`${API_BASE}/assessments/${documentId}`),
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
		queryFn: () => {
			const params = new URLSearchParams();
			if (options?.status) params.set('status', options.status);
			if (options?.severity) params.set('severity', options.severity);
			if (options?.documentId) params.set('document_id', options.documentId);
			if (options?.page) params.set('page', options.page.toString());
			if (options?.pageSize) params.set('page_size', options.pageSize.toString());
			return fetchJson<{
				items: QualityIssueDetail[];
				total: number;
				page: number;
				pageSize: number;
			}>(`${API_BASE}/issues?${params}`);
		},
	});
}

export function useUpdateQualityIssue() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			status,
			resolutionNotes,
		}: {
			id: string;
			status: string;
			resolutionNotes?: string;
		}) =>
			fetchJson<QualityIssueDetail>(`${API_BASE}/issues/${id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status, resolution_notes: resolutionNotes }),
			}),
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
		queryFn: () =>
			fetchJson<QualityStats>(`${API_BASE}/stats?days=${days}`),
	});
}
