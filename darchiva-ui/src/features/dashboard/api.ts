// (c) Copyright Datacraft, 2026
/**
 * Dashboard API hooks.
 */
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { DashboardStats, ActivityListResponse, PendingTasksResponse } from './types';

export const dashboardKeys = {
	all: ['dashboard'] as const,
	stats: () => [...dashboardKeys.all, 'stats'] as const,
	activity: (limit?: number) => [...dashboardKeys.all, 'activity', limit] as const,
	pendingTasks: () => [...dashboardKeys.all, 'pending-tasks'] as const,
};

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
