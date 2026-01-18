// (c) Copyright Datacraft, 2026
/**
 * User preferences API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { UserPreferences } from './types';
import { DEFAULT_PREFERENCES } from './types';

const PREFERENCES_KEY = ['preferences'];

export function usePreferences() {
	return useQuery({
		queryKey: PREFERENCES_KEY,
		queryFn: async () => {
			const response = await api.get<UserPreferences>('/users/me/preferences');
			return { ...DEFAULT_PREFERENCES, ...response };
		},
	});
}

export function useUpdatePreferences() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: Partial<UserPreferences>) => {
			const response = await api.patch<UserPreferences>('/users/me/preferences', data);
			return response;
		},
		onMutate: async (newPrefs) => {
			await queryClient.cancelQueries({ queryKey: PREFERENCES_KEY });
			const previous = queryClient.getQueryData<UserPreferences>(PREFERENCES_KEY);
			queryClient.setQueryData<UserPreferences>(PREFERENCES_KEY, (old) => ({
				...DEFAULT_PREFERENCES,
				...old,
				...newPrefs,
			}));
			return { previous };
		},
		onError: (_, __, context) => {
			if (context?.previous) {
				queryClient.setQueryData(PREFERENCES_KEY, context.previous);
			}
		},
		onSettled: () => {
			queryClient.invalidateQueries({ queryKey: PREFERENCES_KEY });
		},
	});
}

export function useResetPreferences() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			await api.delete('/users/me/preferences');
			return DEFAULT_PREFERENCES;
		},
		onSuccess: () => {
			queryClient.setQueryData(PREFERENCES_KEY, DEFAULT_PREFERENCES);
		},
	});
}

export function usePreference<K extends keyof UserPreferences>(key: K) {
	const { data } = usePreferences();
	return data?.[key] ?? DEFAULT_PREFERENCES[key];
}

export function useSetPreference() {
	const updatePreferences = useUpdatePreferences();

	return <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
		updatePreferences.mutate({ [key]: value });
	};
}
