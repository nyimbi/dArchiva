// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import type { ComplianceAlert, ComplianceStats } from './types';

export function useComplianceStats() {
	return useQuery({
		queryKey: ['compliance', 'stats'],
		queryFn: async () => {
			const { data } = await apiClient.get<ComplianceStats>('/compliance/stats');
			return data;
		},
		staleTime: 60_000,
	});
}

export function useComplianceAlerts() {
	return useQuery({
		queryKey: ['compliance', 'alerts'],
		queryFn: async () => {
			const { data } = await apiClient.get<ComplianceAlert[]>('/compliance/alerts');
			return data;
		},
		refetchInterval: 60_000,
	});
}
