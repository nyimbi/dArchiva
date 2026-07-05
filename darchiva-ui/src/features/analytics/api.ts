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
export interface AnalyticsRangeParams {
	days: number;
	date_from?: string;
	date_to?: string;
}

function rangeParams(range: AnalyticsRangeParams): Record<string, string | number> {
	const params: Record<string, string | number> = { days: range.days };
	if (range.date_from) params.date_from = range.date_from;
	if (range.date_to) params.date_to = range.date_to;
	return params;
}

// ─────────────────────────── Fetchers ────────────────────────

export async function fetchThroughput(range: AnalyticsRangeParams, granularity: Granularity): Promise<ThroughputResponse> {
	const { data } = await apiClient.get<ThroughputResponse>('/analytics/throughput', {
		params: { ...rangeParams(range), granularity },
	});
	return data;
}

export async function fetchQualityTrend(range: AnalyticsRangeParams, granularity: Granularity): Promise<QualityTrendResponse> {
	const { data } = await apiClient.get<QualityTrendResponse>('/analytics/quality-trend', {
		params: { ...rangeParams(range), granularity },
	});
	return data;
}

export async function fetchOperatorPerformance(range: AnalyticsRangeParams): Promise<OperatorPerformanceResponse> {
	const { data } = await apiClient.get<OperatorPerformanceResponse>('/analytics/operator-performance', {
		params: rangeParams(range),
	});
	return data;
}

export async function fetchCapacity(): Promise<CapacityResponse> {
	const { data } = await apiClient.get<CapacityResponse>('/analytics/capacity');
	return data;
}

export async function fetchSummary(range: AnalyticsRangeParams): Promise<SummaryResponse> {
	const { data } = await apiClient.get<SummaryResponse>('/analytics/summary', {
		params: rangeParams(range),
	});
	return data;
}

// ─────────────────────────── Hooks ───────────────────────────

export const analyticsKeys = {
	all: ['analytics'] as const,
	throughput: (range: AnalyticsRangeParams, granularity: Granularity) =>
		[...analyticsKeys.all, 'throughput', range, granularity] as const,
	qualityTrend: (range: AnalyticsRangeParams, granularity: Granularity) =>
		[...analyticsKeys.all, 'quality-trend', range, granularity] as const,
	operatorPerformance: (range: AnalyticsRangeParams) =>
		[...analyticsKeys.all, 'operator-performance', range] as const,
	capacity: () => [...analyticsKeys.all, 'capacity'] as const,
	summary: (range: AnalyticsRangeParams) => [...analyticsKeys.all, 'summary', range] as const,
};

export function useAnalyticsThroughput(range: AnalyticsRangeParams, granularity: Granularity = 'day') {
	return useQuery({
		queryKey: analyticsKeys.throughput(range, granularity),
		queryFn: () => fetchThroughput(range, granularity),
		staleTime: 60_000,
	});
}

export function useAnalyticsQualityTrend(range: AnalyticsRangeParams, granularity: Granularity = 'day') {
	return useQuery({
		queryKey: analyticsKeys.qualityTrend(range, granularity),
		queryFn: () => fetchQualityTrend(range, granularity),
		staleTime: 60_000,
	});
}

export function useAnalyticsOperatorPerformance(range: AnalyticsRangeParams) {
	return useQuery({
		queryKey: analyticsKeys.operatorPerformance(range),
		queryFn: () => fetchOperatorPerformance(range),
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

export function useAnalyticsSummary(range: AnalyticsRangeParams) {
	return useQuery({
		queryKey: analyticsKeys.summary(range),
		queryFn: () => fetchSummary(range),
		staleTime: 60_000,
	});
}
