// (c) Copyright Datacraft, 2026
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─────────────────────────── Types ───────────────────────────

export interface IngestPoint {
	date: string;
	count: number;
}

export interface ClassAccuracyPoint {
	date: string;
	accuracy: number;
	total: number;
}

export interface StorageByType {
	document_type: string;
	size_bytes: number;
	count: number;
}

export interface UserActivityPoint {
	user: string;
	actions: number;
}

// ─────────────────────────── Keys ────────────────────────────

export const pipelineKeys = {
	all: ['analytics'] as const,
	ingest: (days: number) => ['analytics', 'ingest', days] as const,
	classAccuracy: (days: number) => ['analytics', 'class-accuracy', days] as const,
	storageByType: () => ['analytics', 'storage-by-type'] as const,
	userActivity: (days: number) => ['analytics', 'user-activity', days] as const,
};

// ─────────────────────────── Hooks ───────────────────────────

export function useIngestMetrics(days: number) {
	return useQuery({
		queryKey: pipelineKeys.ingest(days),
		queryFn: async () => {
			const { data } = await apiClient.get<{ data: IngestPoint[] }>('/analytics/ingest-rate', {
				params: { days },
			});
			return data.data;
		},
		staleTime: 60_000,
	});
}

export function useClassificationAccuracy(days: number) {
	return useQuery({
		queryKey: pipelineKeys.classAccuracy(days),
		queryFn: async () => {
			const { data } = await apiClient.get<{ data: ClassAccuracyPoint[] }>(
				'/analytics/classification-accuracy',
				{ params: { days } },
			);
			return data.data;
		},
		staleTime: 60_000,
	});
}

export function useStorageByType() {
	return useQuery({
		queryKey: pipelineKeys.storageByType(),
		queryFn: async () => {
			const { data } = await apiClient.get<{ data: StorageByType[] }>('/analytics/storage-by-type');
			return data.data;
		},
		staleTime: 120_000,
	});
}

export function useUserActivity(days: number) {
	return useQuery({
		queryKey: pipelineKeys.userActivity(days),
		queryFn: async () => {
			const { data } = await apiClient.get<{ data: UserActivityPoint[] }>('/analytics/user-activity', {
				params: { days },
			});
			return data.data;
		},
		staleTime: 60_000,
	});
}
