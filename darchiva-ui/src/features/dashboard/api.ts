// (c) Copyright Datacraft, 2026
/**
 * Dashboard API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import type { ActivityListResponse,DashboardStats,PendingTasksResponse } from './types';

export const dashboardKeys = {
	all: ['dashboard'] as const,
	stats: () => [...dashboardKeys.all, 'stats'] as const,
	activity: (limit?: number) => [...dashboardKeys.all, 'activity', limit] as const,
	pendingTasks: () => [...dashboardKeys.all, 'pending-tasks'] as const,
	slaBreachesCount: () => [...dashboardKeys.all, 'sla-breaches-count'] as const,
	ocrStats: () => [...dashboardKeys.all, 'ocr-stats'] as const,
	activeOperators: () => [...dashboardKeys.all, 'active-operators'] as const,
};

export interface CountResponse {
	count: number;
	[key: string]: unknown;
}

export interface OcrStatsResponse {
	accuracy?: number;
	accuracyPercent?: number;
	ocrAccuracy?: number;
	averageAccuracy?: number;
	[key: string]: unknown;
}

export interface ActiveOperatorsResponse {
	count?: number;
	active?: number;
	total?: number;
	[key: string]: unknown;
}

export function useDashboardStats() {
	return useQuery({
		queryKey: dashboardKeys.stats(),
		queryFn: async () => {
			const { data } = await apiClient.get<DashboardStats>('/dashboard/stats');
			return data;
		},
		refetchInterval: 60000, // Refresh every minute
	});
}

export function useRecentActivity(limit = 10) {
	return useQuery({
		queryKey: dashboardKeys.activity(limit),
		queryFn: async () => {
			const { data } = await apiClient.get<ActivityListResponse>('/dashboard/activity', {
				params: { limit },
			});
			return data;
		},
		refetchInterval: 30000, // Refresh every 30 seconds
	});
}

export function useDashboardPendingTasks() {
	return useQuery({
		queryKey: dashboardKeys.pendingTasks(),
		queryFn: async () => {
			const { data } = await apiClient.get<PendingTasksResponse>('/workflows/instances/pending');
			return data;
		},
		refetchInterval: 30000,
	});
}

export function useSLABreachesCount() {
	return useQuery({
		queryKey: dashboardKeys.slaBreachesCount(),
		queryFn: async () => {
			const { data } = await apiClient.get<CountResponse>('/sla/breaches/count');
			return data;
		},
		refetchInterval: 60000,
		retry: 1,
	});
}

export function useOcrStats() {
	return useQuery({
		queryKey: dashboardKeys.ocrStats(),
		queryFn: async () => {
			const { data } = await apiClient.get<OcrStatsResponse>('/system/ocr-stats');
			return data;
		},
		refetchInterval: 60000,
		retry: 1,
	});
}

export function useActiveOperators() {
	return useQuery({
		queryKey: dashboardKeys.activeOperators(),
		queryFn: async () => {
			const { data } = await apiClient.get<ActiveOperatorsResponse>('/operators/active');
			return data;
		},
		refetchInterval: 30000,
		retry: 1,
	});
}
