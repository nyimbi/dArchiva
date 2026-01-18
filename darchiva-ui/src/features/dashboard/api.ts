// (c) Copyright Datacraft, 2026
/**
 * Dashboard API hooks.
 */
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import type { DashboardStats, ActivityListResponse, PendingTasksResponse } from './types';

const API_BASE = '/api/v1';

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
			const response = await axios.get<DashboardStats>(`${API_BASE}/dashboard/stats`);
			return response.data;
		},
		refetchInterval: 60000, // Refresh every minute
	});
}

export function useRecentActivity(limit = 10) {
	return useQuery({
		queryKey: dashboardKeys.activity(limit),
		queryFn: async () => {
			const response = await axios.get<ActivityListResponse>(`${API_BASE}/dashboard/activity`, {
				params: { limit },
			});
			return response.data;
		},
		refetchInterval: 30000, // Refresh every 30 seconds
	});
}

export function useDashboardPendingTasks() {
	return useQuery({
		queryKey: dashboardKeys.pendingTasks(),
		queryFn: async () => {
			const response = await axios.get<PendingTasksResponse>(`${API_BASE}/workflows/instances/pending`);
			return response.data;
		},
		refetchInterval: 30000,
	});
}
