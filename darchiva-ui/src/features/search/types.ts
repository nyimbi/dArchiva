// (c) Copyright Datacraft, 2026
/**
 * Search feature types.
 */

export type SearchMode = 'keyword' | 'semantic' | 'hybrid';

export interface SearchFilters {
	// existing
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

	// Advanced faceted search additions
	dateFrom?: string | null;       // ISO date YYYY-MM-DD
	dateTo?: string | null;
	qualityScoreMin?: number | null; // 0–100
	scannedById?: string | null;    // user UUID
	projectId?: string | null;
	hasAnnotations?: boolean | null;
	hasExceptions?: boolean | null;
}

export type SearchSortBy = 'relevance' | 'date_desc' | 'date_asc' | 'quality_asc' | 'date' | 'title' | 'size';

export interface SearchQuery {
	query: string;
	mode: SearchMode;
	filters?: SearchFilters;
	page?: number;
	limit?: number;
	sortBy?: SearchSortBy;
	sortOrder?: 'asc' | 'desc';
}

export interface SearchResult {
	id: string;
	title: string;
	excerpt: string;
	highlights: string[];
	score: number;
	documentType?: string;
	documentTypeBadge?: string;
	qualityScore?: number;
	ocrExcerpt?: string;
	matchedFieldLabel?: string;
	pageNumber?: number;
	tags: Array<{ id: string; name: string; color?: string }>;
	createdAt: string;
	updatedAt: string;
	scannedAt?: string;
	owner: {
		id: string;
		name: string;
	};
	operator?: {
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
	total_items?: number;
	num_pages?: number;
	page: number;
	page_number?: number;
	limit: number;
	page_size?: number;
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

// Facets response from GET /search/facets
export interface FacetItem {
	name: string;
	count: number;
}

export interface DateHistogramBucket {
	date: string; // YYYY-MM
	count: number;
}

export interface QualityBucket {
	label: string;
	min: number;
	max: number;
	count: number;
}

export interface SearchFacetsResponse {
	document_types: FacetItem[];
	tags?: FacetItem[];
	date_histogram: DateHistogramBucket[];
	quality_buckets: QualityBucket[];
	operators: FacetItem[];
	projects: FacetItem[];
}

export interface SemanticSearchSuggestion {
	text: string;
	type: 'query' | 'filter' | 'refinement';
	confidence: number;
}

export interface SavedSearch {
	id: string;
	name: string;
	query: string | SearchQuery;
	filters?: SearchFilters;
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

// Active filter chip representation
export interface ActiveFilter {
	key: string;
	label: string;
	value: string;
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
