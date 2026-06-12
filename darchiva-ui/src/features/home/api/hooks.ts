// User Home Page API Hooks
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type {
  ActivityEvent,
  CalendarEvent,
  FavoriteItem,
  FavoriteRequest,
  Notification,
  RecentDocument,
  RecentSearch,
  TaskActionRequest,
  UserHomeData,WorkflowTask,
} from '../types';

// Fetch user home data (aggregated)
export function useUserHome() {
	return useQuery<UserHomeData>({
		queryKey: ['user', 'home'],
		queryFn: async () => {
			const { data } = await apiClient.get<UserHomeData>('/users/me/home');
			return data;
		},
		staleTime: 30_000, // 30 seconds
		refetchInterval: 60_000, // 1 minute
	});
}

// Workflow tasks
export function useWorkflowTasks(options?: { status?: string; limit?: number }) {
	return useQuery<WorkflowTask[]>({
		queryKey: ['workflow', 'tasks', options],
		queryFn: async () => {
			const { data } = await apiClient.get<WorkflowTask[]>('/workflows/tasks/assigned', {
				params: { status: options?.status, limit: options?.limit },
			});
			return data;
		},
		staleTime: 15_000,
		refetchInterval: 30_000,
	});
}

export function useTaskAction() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (request: TaskActionRequest) => {
			const { data } = await apiClient.post(`/workflows/tasks/${request.task_id}/action`, {
				action_id: request.action_id,
				comment: request.comment,
				metadata: request.metadata,
			});
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['workflow', 'tasks'] });
			queryClient.invalidateQueries({ queryKey: ['user', 'home'] });
		},
	});
}

// Recent documents
export function useRecentDocuments(options?: { limit?: number; type?: string }) {
	return useQuery<RecentDocument[]>({
		queryKey: ['documents', 'recent', options],
		queryFn: async () => {
			const { data } = await apiClient.get<RecentDocument[]>('/documents/recent', {
				params: { limit: options?.limit, type: options?.type },
			});
			return data;
		},
		staleTime: 30_000,
	});
}

// Favorites
export function useFavorites() {
	return useQuery<FavoriteItem[]>({
		queryKey: ['favorites'],
		queryFn: async () => {
			const { data } = await apiClient.get<FavoriteItem[]>('/users/me/favorites');
			return data;
		},
		staleTime: 60_000,
	});
}

export function useAddFavorite() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (request: FavoriteRequest) => {
			const { data } = await apiClient.post('/users/me/favorites', request);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['favorites'] });
		},
	});
}

export function useRemoveFavorite() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (favoriteId: string) => {
			await apiClient.delete(`/users/me/favorites/${favoriteId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['favorites'] });
		},
	});
}

// Notifications
export function useNotifications(options?: { unread_only?: boolean; limit?: number }) {
	return useQuery<Notification[]>({
		queryKey: ['notifications', options],
		queryFn: async () => {
			const { data } = await apiClient.get<Notification[]>('/notifications', {
				params: { unread_only: options?.unread_only, limit: options?.limit },
			});
			return data;
		},
		staleTime: 15_000,
		refetchInterval: 30_000,
	});
}

export function useMarkNotificationRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (notificationId: string) => {
			await apiClient.patch(`/notifications/${notificationId}/read`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] });
			queryClient.invalidateQueries({ queryKey: ['user', 'home'] });
		},
	});
}

export function useMarkAllNotificationsRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			await apiClient.post('/notifications/read-all');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['notifications'] });
			queryClient.invalidateQueries({ queryKey: ['user', 'home'] });
		},
	});
}

// Calendar events
export function useCalendarEvents(options?: { from?: string; to?: string }) {
	return useQuery<CalendarEvent[]>({
		queryKey: ['calendar', 'events', options],
		queryFn: async () => {
			const { data } = await apiClient.get<CalendarEvent[]>('/calendar/events', {
				params: { from: options?.from, to: options?.to },
			});
			return data;
		},
		staleTime: 60_000,
	});
}

// Recent searches
export function useRecentSearches(limit?: number) {
	return useQuery<RecentSearch[]>({
		queryKey: ['searches', 'recent', limit],
		queryFn: async () => {
			const { data } = await apiClient.get<RecentSearch[]>('/search/recent', {
				params: { limit },
			});
			return data;
		},
		staleTime: 60_000,
	});
}

export function useClearRecentSearches() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			await apiClient.delete('/search/recent');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['searches', 'recent'] });
		},
	});
}

// Activity feed
export function useActivityFeed(options?: { limit?: number; types?: string[] }) {
	return useQuery<ActivityEvent[]>({
		queryKey: ['activity', options],
		queryFn: async () => {
			const { data } = await apiClient.get<ActivityEvent[]>('/activity', {
				params: { limit: options?.limit, types: options?.types?.join(',') },
			});
			return data;
		},
		staleTime: 30_000,
	});
}

export function useQuickUpload() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ files, folder_id }: { files: File[]; folder_id?: string }) => {
			const formData = new FormData();
			files.forEach((file) => formData.append('files', file));
			if (folder_id) formData.append('folder_id', folder_id);

			// Axios detects FormData and sets multipart Content-Type with boundary automatically
			const response = await apiClient.post('/documents/upload', formData);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
			queryClient.invalidateQueries({ queryKey: ['user', 'home'] });
		},
	});
}
