// (c) Copyright Datacraft, 2026
/**
 * Onboarding API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const API_BASE = '/onboarding';

export interface OnboardingStatus {
	completedSteps: string[];
	allSteps: string[];
	isComplete: boolean;
}

export const onboardingKeys = {
	all: ['onboarding'] as const,
	status: () => [...onboardingKeys.all, 'status'] as const,
};

export function useOnboardingStatus() {
	return useQuery({
		queryKey: onboardingKeys.status(),
		queryFn: async () => {
			const { data } = await apiClient.get<OnboardingStatus>(`${API_BASE}/status`);
			return data;
		},
		staleTime: 30_000,
	});
}

export function useCompleteStep() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (step: string) => {
			const { data } = await apiClient.post<OnboardingStatus>(
				`${API_BASE}/complete-step`,
				{ step },
			);
			return data;
		},
		onSuccess: (data) => {
			qc.setQueryData(onboardingKeys.status(), data);
		},
	});
}

export function useResetOnboarding() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			const { data } = await apiClient.post<OnboardingStatus>(`${API_BASE}/reset`, {});
			return data;
		},
		onSuccess: (data) => {
			qc.setQueryData(onboardingKeys.status(), data);
		},
	});
}
