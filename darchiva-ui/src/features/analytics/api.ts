// (c) Copyright Datacraft, 2026
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ─────────────────────────── Types ───────────────────────────

export interface ThroughputPoint {
	timestamp: string;
	pages_scanned: number;
	batches_completed: number;
}

export interface ThroughputResponse {
	data: ThroughputPoint[];
}

export interface QualityPoint {
	timestamp: string;
	avg_quality_score: number;
	below_threshold_pct: number;
}

export interface QualityTrendResponse {
	data: QualityPoint[];
}

export interface OperatorPerf {
	user_id: string;
	name: string;
	pages_scanned: number;
	avg_quality: number;
	exceptions_caused: number;
	on_time_rate: number;
}

export interface OperatorPerformanceResponse {
	operators: OperatorPerf[];
}

export interface CapacityResponse {
	current_queue_depth: number;
	workers_active: number;
	avg_processing_time_seconds: number;
	estimated_throughput_pages_per_hour: number;
	projected_backlog_hours: number;
}

export interface SummaryResponse {
	throughput: ThroughputResponse;
	quality_trend: QualityTrendResponse;
	operator_performance: OperatorPerformanceResponse;
	capacity: CapacityResponse;
}

export type Granularity = 'hour' | 'day' | 'week' | 'month';

// ─────────────────────────── Fetchers ────────────────────────

export async function fetchThroughput(days: number, granularity: Granularity): Promise<ThroughputResponse> {
	const { data } = await apiClient.get<ThroughputResponse>('/analytics/throughput', {
		params: { days, granularity },
	});
	return data;
}

export async function fetchQualityTrend(days: number, granularity: Granularity): Promise<QualityTrendResponse> {
	const { data } = await apiClient.get<QualityTrendResponse>('/analytics/quality-trend', {
		params: { days, granularity },
	});
	return data;
}

export async function fetchOperatorPerformance(days: number): Promise<OperatorPerformanceResponse> {
	const { data } = await apiClient.get<OperatorPerformanceResponse>('/analytics/operator-performance', {
		params: { days },
	});
	return data;
}

export async function fetchCapacity(): Promise<CapacityResponse> {
	const { data } = await apiClient.get<CapacityResponse>('/analytics/capacity');
	return data;
}

export async function fetchSummary(days: number): Promise<SummaryResponse> {
	const { data } = await apiClient.get<SummaryResponse>('/analytics/summary', {
		params: { days },
	});
	return data;
}

// ─────────────────────────── Hooks ───────────────────────────

export const analyticsKeys = {
	all: ['analytics'] as const,
	throughput: (days: number, granularity: Granularity) =>
		[...analyticsKeys.all, 'throughput', days, granularity] as const,
	qualityTrend: (days: number, granularity: Granularity) =>
		[...analyticsKeys.all, 'quality-trend', days, granularity] as const,
	operatorPerformance: (days: number) =>
		[...analyticsKeys.all, 'operator-performance', days] as const,
	capacity: () => [...analyticsKeys.all, 'capacity'] as const,
	summary: (days: number) => [...analyticsKeys.all, 'summary', days] as const,
};

export function useAnalyticsThroughput(days: number, granularity: Granularity = 'day') {
	return useQuery({
		queryKey: analyticsKeys.throughput(days, granularity),
		queryFn: () => fetchThroughput(days, granularity),
		staleTime: 60_000,
	});
}

export function useAnalyticsQualityTrend(days: number, granularity: Granularity = 'day') {
	return useQuery({
		queryKey: analyticsKeys.qualityTrend(days, granularity),
		queryFn: () => fetchQualityTrend(days, granularity),
		staleTime: 60_000,
	});
}

export function useAnalyticsOperatorPerformance(days: number) {
	return useQuery({
		queryKey: analyticsKeys.operatorPerformance(days),
		queryFn: () => fetchOperatorPerformance(days),
		staleTime: 60_000,
	});
}

export function useAnalyticsCapacity() {
	return useQuery({
		queryKey: analyticsKeys.capacity(),
		queryFn: fetchCapacity,
		staleTime: 30_000,
		refetchInterval: 30_000,
	});
}

export function useAnalyticsSummary(days: number) {
	return useQuery({
		queryKey: analyticsKeys.summary(days),
		queryFn: () => fetchSummary(days),
		staleTime: 60_000,
	});
}
