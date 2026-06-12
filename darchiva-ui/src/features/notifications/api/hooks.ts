import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notification } from '../types';

const API_BASE = '/notifications';

const notifKeys = {
	all: ['notifications'] as const,
	list: (unreadOnly?: boolean) => ['notifications', 'list', unreadOnly] as const,
	count: () => ['notifications', 'count'] as const,
};

export function useNotifications(unreadOnly = false) {
	return useQuery({
		queryKey: notifKeys.list(unreadOnly),
		queryFn: async (): Promise<Notification[]> => {
			const { data } = await apiClient.get<Notification[]>(API_BASE, {
				params: { unread_only: unreadOnly, limit: 50 },
			});
			return data ?? [];
		},
		refetchInterval: 30_000,
		staleTime: 15_000,
	});
}

export function useUnreadCount() {
	return useQuery({
		queryKey: notifKeys.count(),
		queryFn: async (): Promise<number> => {
			const { data } = await apiClient.get<{ unread_count: number }>(`${API_BASE}/count`);
			return data.unread_count;
		},
		refetchInterval: 30_000,
		staleTime: 10_000,
	});
}

export function useMarkAsRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiClient.patch(`${API_BASE}/${id}/read`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: notifKeys.all });
		},
	});
}

export function useMarkAllAsRead() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => apiClient.post<{ updated: number }>(`${API_BASE}/read-all`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: notifKeys.all });
		},
	});
}

export function useDismissNotification() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiClient.delete(`${API_BASE}/${id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: notifKeys.all });
		},
	});
}

export function useClearAllNotifications() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: () => apiClient.post<{ deleted: number }>(`${API_BASE}/clear-all`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: notifKeys.all });
		},
	});
}
