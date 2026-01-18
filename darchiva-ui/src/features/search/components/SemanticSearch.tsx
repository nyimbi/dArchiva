// (c) Copyright Datacraft, 2026
/**
 * Semantic search with natural language queries and AI suggestions.
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Sparkles,
	Search,
	Wand2,
	MessageSquare,
	ArrowRight,
	Clock,
	Star,
	Trash2,
	Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSemanticSuggestions, useRecentSearches, useSavedSearches, useClearRecentSearches } from '../api';
import type { SearchQuery, SemanticSearchSuggestion, RecentSearch, SavedSearch } from '../types';

interface SemanticSearchProps {
	onSearch: (query: SearchQuery) => void;
	onLoadSavedSearch?: (search: SavedSearch) => void;
	placeholder?: string;
}

export function SemanticSearch({
	onSearch,
	onLoadSavedSearch,
	placeholder = 'Ask a question about your documents...',
}: SemanticSearchProps) {
	const [query, setQuery] = useState('');
	const [isFocused, setIsFocused] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const dropdownRef = useRef<HTMLDivElement>(null);

	const { data: suggestions, isLoading: suggestionsLoading } = useSemanticSuggestions(query);
	const { data: recentSearches } = useRecentSearches();
	const { data: savedSearches } = useSavedSearches();
	const clearRecent = useClearRecentSearches();

	const showDropdown = isFocused && (query.length >= 2 || !query);

	const handleSearch = (searchQuery: string) => {
		if (searchQuery.trim()) {
			onSearch({
				query: searchQuery.trim(),
				mode: 'semantic',
			});
			setQuery(searchQuery);
			setIsFocused(false);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch(query);
		} else if (e.key === 'Escape') {
			setIsFocused(false);
		}
	};

	const handleSuggestionClick = (suggestion: SemanticSearchSuggestion) => {
		if (suggestion.type === 'refinement') {
			setQuery((prev) => `${prev} ${suggestion.text}`);
			inputRef.current?.focus();
		} else {
			handleSearch(suggestion.text);
		}
	};

	// Close dropdown on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				dropdownRef.current &&
				!dropdownRef.current.contains(e.target as Node) &&
				!inputRef.current?.contains(e.target as Node)
			) {
				setIsFocused(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const exampleQueries = [
		'Find all invoices from last month',
		'Documents mentioning project alpha',
		'Contracts awaiting signature',
		'Recent uploads by John',
	];

	return (
		<div className="relative w-full max-w-3xl mx-auto">
			{/* Search Input */}
			<div
				className={cn(
					'relative flex items-center gap-3 px-5 py-4 bg-slate-800/50 border rounded-2xl transition-all duration-200',
					isFocused
						? 'border-brass-500/50 ring-2 ring-brass-500/20 shadow-lg shadow-brass-500/10'
						: 'border-slate-700/50 hover:border-slate-600'
				)}
			>
				<Sparkles
					className={cn(
						'w-5 h-5 transition-colors',
						isFocused ? 'text-brass-400' : 'text-slate-500'
					)}
				/>
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					onFocus={() => setIsFocused(true)}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					className="flex-1 bg-transparent text-slate-200 placeholder:text-slate-500 focus:outline-none text-lg"
				/>
				{query && (
					<button
						onClick={() => handleSearch(query)}
						className="p-2 bg-brass-500 text-slate-900 rounded-xl hover:bg-brass-400 transition-colors"
					>
						<ArrowRight className="w-5 h-5" />
					</button>
				)}
			</div>

			{/* Dropdown */}
			<AnimatePresence>
				{showDropdown && (
					<motion.div
						ref={dropdownRef}
						initial={{ opacity: 0, y: -10 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -10 }}
						className="absolute top-full left-0 right-0 mt-2 bg-slate-800/95 backdrop-blur-lg border border-slate-700/50 rounded-2xl shadow-xl overflow-hidden z-50"
					>
						{/* AI Suggestions */}
						{query.length >= 3 && (
							<div className="p-4 border-b border-slate-700/50">
								<div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
									<Wand2 className="w-4 h-4 text-brass-400" />
									AI Suggestions
									{suggestionsLoading && (
										<Loader2 className="w-3 h-3 animate-spin ml-auto" />
									)}
								</div>
								{suggestions && suggestions.length > 0 ? (
									<div className="space-y-1">
										{suggestions.map((suggestion, idx) => (
											<button
												key={idx}
												onClick={() => handleSuggestionClick(suggestion)}
												className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 text-left transition-colors group"
											>
												<span
													className={cn(
														'text-sm',
														suggestion.type === 'query' && 'text-slate-200',
														suggestion.type === 'filter' && 'text-brass-400',
														suggestion.type === 'refinement' && 'text-emerald-400'
													)}
												>
													{suggestion.text}
												</span>
												<span className="text-2xs text-slate-500 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
													{suggestion.type === 'refinement' ? 'Add to query' : 'Search'}
												</span>
											</button>
										))}
									</div>
								) : (
									!suggestionsLoading && (
										<p className="text-sm text-slate-500 text-center py-2">
											Type more to get suggestions...
										</p>
									)
								)}
							</div>
						)}

						{/* Quick Examples */}
						{!query && (
							<div className="p-4 border-b border-slate-700/50">
								<div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
									<MessageSquare className="w-4 h-4" />
									Try asking
								</div>
								<div className="grid grid-cols-2 gap-2">
									{exampleQueries.map((example, idx) => (
										<button
											key={idx}
											onClick={() => handleSearch(example)}
											className="px-3 py-2 bg-slate-700/30 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 text-left transition-colors"
										>
											"{example}"
										</button>
									))}
								</div>
							</div>
						)}

						{/* Saved Searches */}
						{savedSearches && savedSearches.length > 0 && (
							<div className="p-4 border-b border-slate-700/50">
								<div className="flex items-center gap-2 mb-3 text-sm text-slate-400">
									<Star className="w-4 h-4 text-brass-400" />
									Saved Searches
								</div>
								<div className="space-y-1">
									{savedSearches.slice(0, 3).map((search) => (
										<button
											key={search.id}
											onClick={() => {
												if (onLoadSavedSearch) {
													onLoadSavedSearch(search);
												} else {
													handleSearch(search.query.query);
												}
											}}
											className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 text-left transition-colors"
										>
											<Search className="w-4 h-4 text-slate-500" />
											<span className="text-sm text-slate-300">{search.name}</span>
											<span className="text-2xs text-slate-500 ml-auto">
												{search.useCount} uses
											</span>
										</button>
									))}
								</div>
							</div>
						)}

						{/* Recent Searches */}
						{recentSearches && recentSearches.length > 0 && (
							<div className="p-4">
								<div className="flex items-center justify-between mb-3">
									<div className="flex items-center gap-2 text-sm text-slate-400">
										<Clock className="w-4 h-4" />
										Recent
									</div>
									<button
										onClick={() => clearRecent.mutate()}
										className="text-2xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
									>
										<Trash2 className="w-3 h-3" />
										Clear
									</button>
								</div>
								<div className="space-y-1">
									{recentSearches.slice(0, 5).map((recent, idx) => (
										<button
											key={idx}
											onClick={() => handleSearch(recent.query)}
											className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/50 text-left transition-colors"
										>
											<Search className="w-4 h-4 text-slate-500" />
											<span className="text-sm text-slate-300 truncate">{recent.query}</span>
											<span className="text-2xs text-slate-500 ml-auto whitespace-nowrap">
												{recent.resultCount} results
											</span>
										</button>
									))}
								</div>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
