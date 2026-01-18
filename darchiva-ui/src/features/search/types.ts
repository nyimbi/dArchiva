// (c) Copyright Datacraft, 2026
/**
 * Search feature types.
 */

export type SearchMode = 'keyword' | 'semantic' | 'hybrid';

export interface SearchFilters {
	documentTypes?: string[];
	tags?: string[];
	dateRange?: {
		start: string | null;
		end: string | null;
	};
	owner?: string | null;
	folder?: string | null;
	status?: string[];
	customFields?: Record<string, unknown>;
}

export interface SearchQuery {
	query: string;
	mode: SearchMode;
	filters?: SearchFilters;
	page?: number;
	limit?: number;
	sortBy?: 'relevance' | 'date' | 'title' | 'size';
	sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
	id: string;
	title: string;
	excerpt: string;
	highlights: string[];
	score: number;
	documentType?: string;
	tags: Array<{ id: string; name: string; color?: string }>;
	createdAt: string;
	updatedAt: string;
	owner: {
		id: string;
		name: string;
	};
	folder?: {
		id: string;
		path: string;
	};
	pageCount?: number;
	fileSize?: number;
	thumbnailUrl?: string;
}

export interface SearchResponse {
	items: SearchResult[];
	total: number;
	page: number;
	limit: number;
	query: string;
	mode: SearchMode;
	took: number; // milliseconds
	facets?: SearchFacets;
}

export interface SearchFacets {
	documentTypes: Array<{ value: string; count: number }>;
	tags: Array<{ value: string; label: string; count: number }>;
	owners: Array<{ value: string; label: string; count: number }>;
	dateRanges: Array<{ value: string; label: string; count: number }>;
}

export interface SemanticSearchSuggestion {
	text: string;
	type: 'query' | 'filter' | 'refinement';
	confidence: number;
}

export interface SavedSearch {
	id: string;
	name: string;
	query: SearchQuery;
	createdAt: string;
	lastUsedAt?: string;
	useCount: number;
}

export interface RecentSearch {
	query: string;
	mode: SearchMode;
	timestamp: string;
	resultCount: number;
}

export const SEARCH_MODES: Array<{ value: SearchMode; label: string; description: string }> = [
	{
		value: 'keyword',
		label: 'Keyword',
		description: 'Traditional full-text search matching exact terms',
	},
	{
		value: 'semantic',
		label: 'Semantic',
		description: 'AI-powered search understanding meaning and context',
	},
	{
		value: 'hybrid',
		label: 'Hybrid',
		description: 'Combined keyword and semantic search for best results',
	},
];
