// User Home Page API Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	UserHomeData, WorkflowTask, RecentDocument, FavoriteItem,
	Notification, CalendarEvent, TaskActionRequest, FavoriteRequest,
	RecentSearch, ActivityEvent,
} from '../types';

const API_BASE = '/api/v1';

// Fetch user home data (aggregated)
export function useUserHome() {
	return useQuery<UserHomeData>({
		queryKey: ['user', 'home'],
		queryFn: async () => {
			const response = await fetch(`${API_BASE}/users/me/home`);
			if (!response.ok) throw new Error('Failed to fetch home data');
			return response.json();
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
			const params = new URLSearchParams();
			if (options?.status) params.set('status', options.status);
			if (options?.limit) params.set('limit', options.limit.toString());

			const response = await fetch(`${API_BASE}/workflows/tasks/assigned?${params}`);
			if (!response.ok) throw new Error('Failed to fetch tasks');
			return response.json();
		},
		staleTime: 15_000,
		refetchInterval: 30_000,
	});
}

export function useTaskAction() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (request: TaskActionRequest) => {
			const response = await fetch(`${API_BASE}/workflows/tasks/${request.task_id}/action`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					action_id: request.action_id,
					comment: request.comment,
					metadata: request.metadata,
				}),
			});
			if (!response.ok) throw new Error('Failed to execute task action');
			return response.json();
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
			const params = new URLSearchParams();
			if (options?.limit) params.set('limit', options.limit.toString());
			if (options?.type) params.set('type', options.type);

			const response = await fetch(`${API_BASE}/documents/recent?${params}`);
			if (!response.ok) throw new Error('Failed to fetch recent documents');
			return response.json();
		},
		staleTime: 30_000,
	});
}

// Favorites
export function useFavorites() {
	return useQuery<FavoriteItem[]>({
		queryKey: ['favorites'],
		queryFn: async () => {
			const response = await fetch(`${API_BASE}/users/me/favorites`);
			if (!response.ok) throw new Error('Failed to fetch favorites');
			return response.json();
		},
		staleTime: 60_000,
	});
}

export function useAddFavorite() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (request: FavoriteRequest) => {
			const response = await fetch(`${API_BASE}/users/me/favorites`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(request),
			});
			if (!response.ok) throw new Error('Failed to add favorite');
			return response.json();
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
			const response = await fetch(`${API_BASE}/users/me/favorites/${favoriteId}`, {
				method: 'DELETE',
			});
			if (!response.ok) throw new Error('Failed to remove favorite');
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
			const params = new URLSearchParams();
			if (options?.unread_only) params.set('unread_only', 'true');
			if (options?.limit) params.set('limit', options.limit.toString());

			const response = await fetch(`${API_BASE}/notifications?${params}`);
			if (!response.ok) throw new Error('Failed to fetch notifications');
			return response.json();
		},
		staleTime: 15_000,
		refetchInterval: 30_000,
	});
}

export function useMarkNotificationRead() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (notificationId: string) => {
			const response = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
				method: 'POST',
			});
			if (!response.ok) throw new Error('Failed to mark notification read');
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
			const response = await fetch(`${API_BASE}/notifications/read-all`, {
				method: 'POST',
			});
			if (!response.ok) throw new Error('Failed to mark all notifications read');
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
			const params = new URLSearchParams();
			if (options?.from) params.set('from', options.from);
			if (options?.to) params.set('to', options.to);

			const response = await fetch(`${API_BASE}/calendar/events?${params}`);
			if (!response.ok) throw new Error('Failed to fetch calendar events');
			return response.json();
		},
		staleTime: 60_000,
	});
}

// Recent searches
export function useRecentSearches(limit?: number) {
	return useQuery<RecentSearch[]>({
		queryKey: ['searches', 'recent', limit],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (limit) params.set('limit', limit.toString());

			const response = await fetch(`${API_BASE}/search/recent?${params}`);
			if (!response.ok) throw new Error('Failed to fetch recent searches');
			return response.json();
		},
		staleTime: 60_000,
	});
}

export function useClearRecentSearches() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const response = await fetch(`${API_BASE}/search/recent`, {
				method: 'DELETE',
			});
			if (!response.ok) throw new Error('Failed to clear recent searches');
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
			const params = new URLSearchParams();
			if (options?.limit) params.set('limit', options.limit.toString());
			if (options?.types) params.set('types', options.types.join(','));

			const response = await fetch(`${API_BASE}/activity?${params}`);
			if (!response.ok) throw new Error('Failed to fetch activity');
			return response.json();
		},
		staleTime: 30_000,
	});
}

// Quick upload
export function useQuickUpload() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ files, folder_id }: { files: File[]; folder_id?: string }) => {
			const formData = new FormData();
			files.forEach(file => formData.append('files', file));
			if (folder_id) formData.append('folder_id', folder_id);

			const response = await fetch(`${API_BASE}/documents/upload`, {
				method: 'POST',
				body: formData,
			});
			if (!response.ok) throw new Error('Failed to upload files');
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['documents'] });
			queryClient.invalidateQueries({ queryKey: ['user', 'home'] });
		},
	});
}
