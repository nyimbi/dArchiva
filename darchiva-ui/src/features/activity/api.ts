// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';

export interface ActivityEvent {
	event_type: string;
	actor_name: string | null;
	actor_id: string | null;
	description: string;
	timestamp: string | null;
	data?: Record<string, unknown> | null;
}

const activityKeys = {
	document: (id: string) => ['activity', 'document', id] as const,
	feed: () => ['activity', 'feed'] as const,
};

export function useDocumentActivity(documentId: string, limit = 50) {
	return useQuery({
		queryKey: activityKeys.document(documentId),
		queryFn: async () => {
			const { data } = await apiClient.get<ActivityEvent[]>(
				`/activity/documents/${documentId}/activity`,
				{ params: { limit } },
			);
			return data;
		},
		enabled: Boolean(documentId),
		staleTime: 30_000,
		refetchInterval: 60_000,
	});
}

export function useActivityFeed(limit = 30) {
	return useQuery({
		queryKey: activityKeys.feed(),
		queryFn: async () => {
			const { data } = await apiClient.get<ActivityEvent[]>('/activity/feed', {
				params: { limit },
			});
			return data;
		},
		staleTime: 30_000,
		refetchInterval: 60_000,
	});
}
