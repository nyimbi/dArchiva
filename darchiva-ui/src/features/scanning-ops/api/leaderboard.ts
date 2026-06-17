// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── types ──────────────────────────────────────────────────────────────────

export type LeaderboardPeriod = 'today' | 'week' | 'month';

export interface LeaderboardEntry {
	rank: number;
	user_id: string;
	username: string;
	pages_scanned: number;
	batches_completed: number;
	avg_quality_score: number;
	/** 7-day daily page counts, oldest first */
	trend_pages: number[];
}

export interface LeaderboardResponse {
	period: LeaderboardPeriod;
	entries: LeaderboardEntry[];
}

export interface OperatorTargets {
	user_id: string;
	daily_page_target: number;
	weekly_batch_target: number;
}

export interface SetTargetsBody {
	user_id: string;
	daily_page_target: number;
	weekly_batch_target: number;
}

// ── query keys ─────────────────────────────────────────────────────────────

export const leaderboardKeys = {
	all: ['scanning-leaderboard'] as const,
	byPeriod: (period: LeaderboardPeriod) =>
		[...leaderboardKeys.all, period] as const,
	targets: (userId?: string) =>
		['scanning-targets', userId ?? 'me'] as const,
};

// ── hooks ──────────────────────────────────────────────────────────────────

export function useLeaderboard(period: LeaderboardPeriod = 'today') {
	return useQuery({
		queryKey: leaderboardKeys.byPeriod(period),
		queryFn: async () => {
			const res = await apiClient.get<LeaderboardResponse>(
				'/analytics/scanning/leaderboard',
				{ params: { period } },
			);
			return res.data;
		},
		refetchInterval: 30_000,
	});
}

export function useOperatorTargets(userId?: string) {
	return useQuery({
		queryKey: leaderboardKeys.targets(userId),
		queryFn: async () => {
			const res = await apiClient.get<OperatorTargets>(
				'/analytics/scanning/targets',
				userId ? { params: { user_id: userId } } : undefined,
			);
			return res.data;
		},
		staleTime: 60_000,
	});
}

export function useSetOperatorTargets() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: SetTargetsBody) => {
			const res = await apiClient.put<OperatorTargets>(
				'/analytics/scanning/targets',
				body,
			);
			return res.data;
		},
		onSuccess: (data) => {
			queryClient.invalidateQueries({
				queryKey: leaderboardKeys.targets(data.user_id),
			});
		},
	});
}
