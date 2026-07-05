// (c) Copyright Datacraft, 2026
/**
 * SavedSearchPanel — compact panel for managing saved searches.
 */
import { useState } from 'react';
import { BookmarkPlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDeleteSavedSearch, useSavedSearches, useSaveSearch } from '../api';
import type { SearchFilters, SearchQuery } from '../types';

export function SavedSearchPanel({
	currentQuery,
	currentFilters,
	onApply,
}: {
	currentQuery: string;
	currentFilters: SearchFilters;
	onApply: (query: string, filters?: SearchFilters) => void;
}) {
	const [name, setName] = useState('');

	const { data: savedSearches = [], isLoading } = useSavedSearches();
	const saveSearch = useSaveSearch();
	const deleteSearch = useDeleteSavedSearch();

	function handleSave() {
		const trimmedName = name.trim();
		if (!trimmedName || !currentQuery.trim()) return;
		saveSearch.mutate(
			{ name: trimmedName, query: currentQuery.trim(), filters: currentFilters },
			{ onSuccess: () => setName('') },
		);
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') handleSave();
	}

	return (
		<div className="flex flex-col gap-3 p-3">
			{/* Save current search form */}
			<div className="flex gap-2">
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Name this search"
					disabled={!currentQuery.trim()}
					className="h-8 text-sm"
				/>
				<Button
					size="sm"
					variant="secondary"
					disabled={!currentQuery.trim() || !name.trim() || saveSearch.isPending}
					onClick={handleSave}
					className="shrink-0"
					aria-label="Save current search"
				>
					{saveSearch.isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<BookmarkPlus className="h-4 w-4" />
					)}
				</Button>
			</div>

			{/* Saved searches list */}
			{isLoading ? (
				<div className="flex items-center justify-center py-4">
					<Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
				</div>
			) : savedSearches.length === 0 ? (
				<p className="text-xs text-muted-foreground py-2 text-center">
					No saved searches yet.
				</p>
			) : (
				<ul className="flex flex-col gap-1">
					{savedSearches.map((search) => (
						<li
							key={search.id}
							className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-accent group"
						>
							<button
								type="button"
								className="flex-1 text-left text-sm truncate"
								onClick={() => {
									const queryValue = getSavedSearchQuery(search.query);
									onApply(queryValue, search.filters ?? (typeof search.query === 'object' ? search.query.filters : undefined));
								}}
								title={getSavedSearchQuery(search.query)}
							>
								{search.name}
							</button>
							<Button
								size="icon"
								variant="ghost"
								className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
								disabled={deleteSearch.isPending}
								onClick={() => deleteSearch.mutate(search.id)}
								aria-label={`Delete saved search "${search.name}"`}
							>
								<Trash2 className="h-3.5 w-3.5" />
							</Button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function getSavedSearchQuery(query: string | SearchQuery): string {
	return typeof query === 'string' ? query : query.query;
}
