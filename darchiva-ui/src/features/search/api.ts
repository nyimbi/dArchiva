// (c) Copyright Datacraft, 2026
/**
 * Search feature API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
	RecentSearch,
	SavedSearch,
	SearchFilters,
	SearchFacetsResponse,
	SearchQuery,
	SearchResponse,
	SemanticSearchSuggestion,
} from './types';

const SEARCH_KEY = ['search'];

// ---------------------------------------------------------------------------
// Existing hook — kept for backward compat with SearchPage (simple mode)
// ---------------------------------------------------------------------------
export function useSearch(query: SearchQuery, enabled = true) {
	return useQuery({
		queryKey: [...SEARCH_KEY, 'results', query],
		queryFn: async () => {
			const { data } = await apiClient.post<SearchResponse>('/search', buildSearchPayload(query));
			return data;
		},
		enabled: enabled && !!query.query,
		staleTime: 30000,
	});
}

// ---------------------------------------------------------------------------
// Advanced: useSearchDocuments — sends the full structured payload
// ---------------------------------------------------------------------------
export function useSearchDocuments(
	query: string,
	filters: SearchFilters,
	page = 1,
	pageSize = 20,
	sortBy = 'date_desc',
	enabled = true,
	mode: import('./types').SearchMode = 'keyword',
) {
	return useQuery({
		queryKey: [...SEARCH_KEY, 'documents', query, filters, page, pageSize, sortBy, mode],
		queryFn: async () => {
			const payload = buildStructuredPayload(query, filters, page, pageSize, sortBy);
			const { data } = await apiClient.post<SearchResponse>(
				'/search/',
				payload,
				{ params: { mode } },
			);
			return normalizeSearchResponse(data);
		},
		enabled: enabled,
		staleTime: 30000,
		placeholderData: (prev) => prev,
	});
}

// ---------------------------------------------------------------------------
// Advanced: useSearchFacets — GET /search/facets
// ---------------------------------------------------------------------------
export function useSearchFacets(query?: string) {
	return useQuery({
		queryKey: [...SEARCH_KEY, 'facets', query ?? ''],
		queryFn: async () => {
			const { data } = await apiClient.get<SearchFacetsResponse>('/search/facets', {
				params: query ? { q: query } : undefined,
			});
			return data;
		},
		staleTime: 60000,
	});
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------
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
		staleTime: 60000,
	});
}

// ---------------------------------------------------------------------------
// Saved searches
// ---------------------------------------------------------------------------
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

// Legacy facets hook (kept for SearchResults sidebar)
export function useSearchFacetsLegacy(filters?: Record<string, unknown>) {
	return useQuery({
		queryKey: [...SEARCH_KEY, 'facets-legacy', filters],
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

// ---------------------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------------------

function buildSearchPayload(query: SearchQuery) {
	return {
		filters: {
			fts: query.query ? { terms: [query.query] } : undefined,
		},
		page_number: query.page ?? 1,
		page_size: query.limit ?? 20,
		sort_by: mapSortBy(query.sortBy),
		sort_direction: query.sortOrder ?? 'desc',
	};
}

function buildStructuredPayload(
	query: string,
	filters: SearchFilters,
	page: number,
	pageSize: number,
	sortBy: string,
) {
	const f: Record<string, unknown> = {};

	if (query?.trim()) {
		f.fts = { terms: [query.trim()] };
	}

	if (filters.documentTypes?.length) {
		f.categories = [{ values: filters.documentTypes, operator: 'any' }];
	}

	if (filters.tags?.length) {
		f.tags = [{ values: filters.tags, operator: 'any' }];
	}

	if (filters.dateFrom || filters.dateTo) {
		f.date_from = filters.dateFrom ?? undefined;
		f.date_to = filters.dateTo ?? undefined;
	}

	if (filters.qualityScoreMin != null) {
		f.quality_score_min = filters.qualityScoreMin;
	}

	if (filters.scannedById) {
		f.scanned_by_id = filters.scannedById;
	}

	if (filters.projectId) {
		f.project_id = filters.projectId;
	}

	if (filters.hasAnnotations != null) {
		f.has_annotations = filters.hasAnnotations;
	}

	if (filters.hasExceptions != null) {
		f.has_exceptions = filters.hasExceptions;
	}

	return {
		filters: f,
		page_number: page,
		page_size: pageSize,
		sort_by: mapSortBy(sortBy as string),
		sort_direction: sortBy === 'date_asc' ? 'asc' : 'desc',
	};
}

function mapSortBy(sortBy?: string): string {
	switch (sortBy) {
		case 'relevance': return 'updated_at';
		case 'date_desc': return 'updated_at';
		case 'date_asc': return 'created_at';
		case 'quality_asc': return 'quality_asc';
		case 'date': return 'updated_at';
		case 'title': return 'title';
		default: return 'updated_at';
	}
}

// Normalize backend response (snake_case) to frontend shape
function normalizeSearchResponse(data: SearchResponse): SearchResponse {
	return {
		...data,
		total: data.total ?? data.total_items ?? 0,
		page: data.page ?? data.page_number ?? 1,
		limit: data.limit ?? data.page_size ?? 20,
		mode: data.mode ?? 'keyword',
		query: data.query ?? '',
		took: data.took ?? 0,
		items: (data.items ?? []).map(normalizeResult),
	};
}

function normalizeResult(item: SearchResponse['items'][number]): SearchResponse['items'][number] {
	return {
		id: String((item as unknown as Record<string, unknown>).id ?? ''),
		title: (item as unknown as Record<string, unknown>).title as string ?? '',
		excerpt: (item as unknown as Record<string, unknown>).excerpt as string ?? '',
		highlights: (item as unknown as Record<string, unknown>).highlights as string[] ?? [],
		score: Number((item as unknown as Record<string, unknown>).score ?? 0),
		documentType: ((item as unknown as Record<string, unknown>).category as { name?: string } | null)?.name,
		documentTypeBadge: ((item as unknown as Record<string, unknown>).category as { name?: string } | null)?.name,
		tags: ((item as unknown as Record<string, unknown>).tags as Array<{ id: string; name: string }> ?? []).map(t => ({
			id: String(t.id),
			name: t.name,
		})),
		createdAt: (item as unknown as Record<string, unknown>).created_at as string ?? (item as unknown as Record<string, unknown>).createdAt as string ?? '',
		updatedAt: (item as unknown as Record<string, unknown>).updated_at as string ?? (item as unknown as Record<string, unknown>).updatedAt as string ?? '',
		owner: {
			id: String(((item as unknown as Record<string, unknown>).owned_by as { id?: string } | null)?.id ?? ''),
			name: String(((item as unknown as Record<string, unknown>).owned_by as { name?: string } | null)?.name ?? ''),
		},
		operator: (item as unknown as Record<string, unknown>).created_by as { id: string; name: string } | undefined,
	};
}
