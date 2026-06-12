// (c) Copyright Datacraft, 2026
/**
 * Search feature API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type {
  RecentSearch,
  SavedSearch,
  SearchQuery,
  SearchResponse,
  SemanticSearchSuggestion,
} from './types';

const SEARCH_KEY = ['search'];

export function useSearch(query: SearchQuery, enabled = true) {
	return useQuery({
		queryKey: [...SEARCH_KEY, 'results', query],
		queryFn: async () => {
			const { data } = await apiClient.post<SearchResponse>('/search', query);
			return data;
		},
		enabled: enabled && !!query.query,
		staleTime: 30000, // 30 seconds
	});
}

export function useSemanticSuggestions(query: string) {
	return useQuery({
		queryKey: [...SEARCH_KEY, 'suggestions', query],
		queryFn: async () => {
			const { data } = await apiClient.get<SemanticSearchSuggestion[]>('/search/suggestions', {
				params: { q: query },
			});
			return data;
		},
		enabled: query.length >= 3,
		staleTime: 60000, // 1 minute
	});
}

export function useSavedSearches() {
	return useQuery({
		queryKey: [...SEARCH_KEY, 'saved'],
		queryFn: async () => {
			const { data } = await apiClient.get<SavedSearch[]>('/search/saved');
			return data;
		},
	});
}

export function useRecentSearches() {
	return useQuery({
		queryKey: [...SEARCH_KEY, 'recent'],
		queryFn: async () => {
			const { data } = await apiClient.get<RecentSearch[]>('/search/recent');
			return data;
		},
	});
}

export function useSaveSearch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ name, query }: { name: string; query: SearchQuery }) => {
			const { data } = await apiClient.post<SavedSearch>('/search/saved', { name, query });
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...SEARCH_KEY, 'saved'] });
		},
	});
}

export function useDeleteSavedSearch() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (searchId: string) => {
			await apiClient.delete(`/search/saved/${searchId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...SEARCH_KEY, 'saved'] });
		},
	});
}

export function useClearRecentSearches() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			await apiClient.delete('/search/recent');
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...SEARCH_KEY, 'recent'] });
		},
	});
}

export function useSearchFacets(filters?: Record<string, unknown>) {
	return useQuery({
		queryKey: [...SEARCH_KEY, 'facets', filters],
		queryFn: async () => {
			const { data } = await apiClient.get<{
				documentTypes: Array<{ value: string; count: number }>;
				tags: Array<{ value: string; label: string; count: number }>;
				owners: Array<{ value: string; label: string; count: number }>;
			}>('/search/facets', { params: filters });
			return data;
		},
	});
}
