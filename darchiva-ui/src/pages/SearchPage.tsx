// (c) Copyright Datacraft, 2026
import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { SearchResults } from '@/features/search/components/SearchResults';
import { useSearch } from '@/features/search/api';
import { SearchQuery } from '@/features/search/types';

export function SearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const query = searchParams.get('q') || '';

    const [searchState, setSearchState] = useState<SearchQuery>({
        query,
        mode: 'hybrid',
        page: 1,
        limit: 20,
        filters: {}
    });

    // Update local state when URL param changes
    useEffect(() => {
        setSearchState(prev => ({ ...prev, query }));
    }, [query]);

    const { data: results, isLoading } = useSearch(searchState);

    const handlePageChange = (page: number) => {
        setSearchState(prev => ({ ...prev, page }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSortChange = (sortBy: string, sortOrder: 'asc' | 'desc') => {
        setSearchState(prev => ({
            ...prev,
            sortBy: sortBy as 'relevance' | 'date' | 'title' | 'size',
            sortOrder
        }));
    };

    const handleFacetClick = (facetType: string, value: string) => {
        setSearchState(prev => {
            const currentFilters = { ...prev.filters };
            // We need to cast to any to access dynamic property, or use a switch
            // For now, simple toggle logic for array types
            if (facetType === 'documentTypes' || facetType === 'tags' || facetType === 'status') {
                const list = (currentFilters[facetType] as string[]) || [];
                if (list.includes(value)) {
                    currentFilters[facetType] = list.filter(v => v !== value);
                } else {
                    currentFilters[facetType] = [...list, value];
                }
            } else if (facetType === 'owner' || facetType === 'folder') {
                if (currentFilters[facetType] === value) {
                    currentFilters[facetType] = null;
                } else {
                    currentFilters[facetType] = value;
                }
            }

            return { ...prev, filters: currentFilters, page: 1 };
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-display font-semibold text-slate-100">
                        Search Results
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {query ? `Showing results for "${query}"` : 'Enter a search term to begin'}
                    </p>
                </div>
            </div>

            <SearchResults
                results={results || null}
                isLoading={isLoading}
                onResultClick={(result) => navigate(`/documents?nodeId=${result.id}`)}
                onPageChange={handlePageChange}
                onSortChange={handleSortChange}
                onFacetClick={handleFacetClick}
            />
        </div>
    );
}
