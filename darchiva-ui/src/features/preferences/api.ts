// (c) Copyright Datacraft, 2026
/**
 * User preferences API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { UserPreferences } from './types';
import { DEFAULT_PREFERENCES } from './types';

const PREFERENCES_KEY = ['preferences'];

export function usePreferences() {
	return useQuery({
		queryKey: PREFERENCES_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<UserPreferences>('/preferences/me');
			return { ...DEFAULT_PREFERENCES, ...data };
		},
	});
}

export function useUpdatePreferences() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: Partial<UserPreferences>) => {
			const { data: response } = await apiClient.patch<UserPreferences>('/preferences/me', data);
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
			toast.error('Failed to save');
		},
		onSuccess: () => {
			toast.success('Saved');
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
			await apiClient.delete('/preferences/me');
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
