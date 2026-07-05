// (c) Copyright Datacraft, 2026
import { useSearchDocuments, useSearchFacets } from '@/features/search/api';
import { SavedSearchPanel } from '@/features/search/components/SavedSearchPanel';
import type { ActiveFilter, SearchFilters, SearchResult, SearchSortBy } from '@/features/search/types';
import { cn, formatRelativeTime } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { motion, AnimatePresence } from 'framer-motion';
import {
	AlertCircle,
	AlertTriangle,
	BarChart2,
	Bookmark,
	Calendar,
	CheckCircle2,
	ChevronDown,
	ChevronUp,
	Clock,
	FileText,
	Filter,
	FolderOpen,
	MessageSquare,
	Search,
	SlidersHorizontal,
	Star,
	Tag,
	Trash2,
	User,
	X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Search History helpers (localStorage)
// ---------------------------------------------------------------------------

const HISTORY_KEY = 'darchiva_search_history';
const HISTORY_MAX = 10;

function loadHistory(): string[] {
	try {
		const raw = localStorage.getItem(HISTORY_KEY);
		return raw ? (JSON.parse(raw) as string[]) : [];
	} catch {
		return [];
	}
}

function saveToHistory(query: string): void {
	if (!query.trim()) return;
	const prev = loadHistory().filter(q => q !== query.trim());
	const next = [query.trim(), ...prev].slice(0, HISTORY_MAX);
	try {
		localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
	} catch {
		// storage quota — ignore
	}
}

function removeFromHistory(query: string): string[] {
	const next = loadHistory().filter(q => q !== query);
	try {
		localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
	} catch {
		// ignore
	}
	return next;
}

function clearHistory(): void {
	try {
		localStorage.removeItem(HISTORY_KEY);
	} catch {
		// ignore
	}
}

function useSearchHistory() {
	const [history, setHistory] = useState<string[]>(loadHistory);

	const push = useCallback((query: string) => {
		saveToHistory(query);
		setHistory(loadHistory());
	}, []);

	const remove = useCallback((query: string) => {
		setHistory(removeFromHistory(query));
	}, []);

	const clear = useCallback(() => {
		clearHistory();
		setHistory([]);
	}, []);

	return { history, push, remove, clear };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

const SORT_OPTIONS: Array<{ value: SearchSortBy; label: string }> = [
	{ value: 'relevance', label: 'Relevance' },
	{ value: 'date_desc', label: 'Newest first' },
	{ value: 'date_asc', label: 'Oldest first' },
	{ value: 'quality_asc', label: 'Quality (low→high)' },
];

const SEARCH_OPERATORS = [
	{ token: 'type:invoice', description: 'filter by document type' },
	{ token: 'tag:important', description: 'filter by tag' },
	{ token: 'from:2024-01-01', description: 'created after date' },
	{ token: 'to:2024-12-31', description: 'created before date' },
	{ token: 'has:annotations', description: 'has annotations' },
	{ token: 'created_by:<username>', description: 'by specific user' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function qualityColor(score?: number): string {
	if (score == null) return 'text-slate-500';
	if (score >= 75) return 'text-emerald-400';
	if (score >= 50) return 'text-amber-400';
	return 'text-red-400';
}

function qualityBg(score?: number): string {
	if (score == null) return 'bg-slate-700/50 text-slate-400';
	if (score >= 75) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
	if (score >= 50) return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
	return 'bg-red-500/10 text-red-400 border-red-500/30';
}

function useDebounce<T>(value: T, ms: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);
	useEffect(() => {
		const id = setTimeout(() => setDebouncedValue(value), ms);
		return () => clearTimeout(id);
	}, [value, ms]);
	return debouncedValue;
}

function buildActiveFilters(filters: SearchFilters): ActiveFilter[] {
	const chips: ActiveFilter[] = [];
	filters.documentTypes?.forEach(v =>
		chips.push({ key: 'documentTypes', label: `Type: ${v}`, value: v })
	);
	filters.tags?.forEach(v =>
		chips.push({ key: 'tags', label: `Tag: ${v}`, value: v })
	);
	filters.status?.forEach(v =>
		chips.push({ key: 'status', label: `OCR: ${v}`, value: v })
	);
	if (filters.dateFrom) chips.push({ key: 'dateFrom', label: `From: ${filters.dateFrom}`, value: filters.dateFrom });
	if (filters.dateTo) chips.push({ key: 'dateTo', label: `To: ${filters.dateTo}`, value: filters.dateTo });
	if (filters.qualityScoreMin != null && filters.qualityScoreMin > 0)
		chips.push({ key: 'qualityScoreMin', label: `Quality ≥ ${filters.qualityScoreMin}`, value: String(filters.qualityScoreMin) });
	if (filters.scannedById) chips.push({ key: 'scannedById', label: `Operator: ${filters.scannedById}`, value: filters.scannedById });
	if (filters.projectId) chips.push({ key: 'projectId', label: `Project: ${filters.projectId}`, value: filters.projectId });
	if (filters.hasAnnotations === true) chips.push({ key: 'hasAnnotations', label: 'Has annotations', value: 'true' });
	if (filters.hasExceptions === true) chips.push({ key: 'hasExceptions', label: 'Has exceptions', value: 'true' });
	return chips;
}

interface SearchResultTypeGroup {
	type: string;
	items: SearchResult[];
}

function groupResultsByType(items: SearchResult[]): SearchResultTypeGroup[] {
	const groups = new Map<string, SearchResult[]>();
	for (const item of items) {
		const type = item.documentType ?? item.documentTypeBadge ?? 'Other documents';
		groups.set(type, [...(groups.get(type) ?? []), item]);
	}
	return Array.from(groups.entries()).map(([type, groupItems]) => ({ type, items: groupItems }));
}

function stripHtml(value: string): string {
	return value.replace(/<[^>]*>/g, ' ');
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSearchTerms(query: string): string[] {
	return query
		.split(/\s+/)
		.map(term => term.trim())
		.filter(term => term && !term.includes(':'))
		.slice(0, 6);
}

function highlightedText(text: string, query: string): React.ReactNode[] {
	const cleanText = stripHtml(text);
	const terms = getSearchTerms(query);
	if (terms.length === 0) return [cleanText];

	const regex = new RegExp(`(${terms.map(escapeRegExp).join('|')})`, 'ig');
	return cleanText.split(regex).map((part, index) => {
		if (!part) return null;
		const matched = terms.some(term => part.toLowerCase() === term.toLowerCase());
		return matched ? (
			<mark key={`${part}-${index}`} className="rounded bg-yellow-300/80 px-0.5 text-slate-950">
				{part}
			</mark>
		) : (
			<span key={`${part}-${index}`}>{part}</span>
		);
	});
}

// ---------------------------------------------------------------------------
// SearchPage
// ---------------------------------------------------------------------------

export function SearchPage() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();

	const urlQuery = searchParams.get('q') ?? '';
	const [inputValue, setInputValue] = useState(urlQuery);
	const debouncedQuery = useDebounce(inputValue, 300);
	const inputRef = useRef<HTMLInputElement>(null);
	const [inputFocused, setInputFocused] = useState(false);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [groupByType, setGroupByType] = useState(false);
	const { history, push: pushHistory, remove: removeHistory, clear: clearHistoryFn } = useSearchHistory();

	const [filters, setFilters] = useState<SearchFilters>({});
	const [sortBy, setSortBy] = useState<SearchSortBy>('date_desc');
	const [page, setPage] = useState(1);
	const pageSize = 20;

	// Sync URL → input on external navigation
	useEffect(() => {
		setInputValue(urlQuery);
		setPage(1);
	}, [urlQuery]);

	// Update URL when debounced query changes + push to history
	useEffect(() => {
		if (debouncedQuery !== urlQuery) {
			setSearchParams(debouncedQuery ? { q: debouncedQuery } : {}, { replace: true });
			setPage(1);
		}
		if (debouncedQuery.trim()) {
			pushHistory(debouncedQuery.trim());
		}
	}, [debouncedQuery, pushHistory, setSearchParams, urlQuery]);

	const { data: results, isLoading, isFetching, isError } = useSearchDocuments(
		debouncedQuery,
		filters,
		page,
		pageSize,
		sortBy,
	);

	const { data: facets } = useSearchFacets(debouncedQuery || undefined);

	const activeFilters = useMemo(() => buildActiveFilters(filters), [filters]);

	const totalItems = results?.total ?? results?.total_items ?? 0;
	const numPages = results?.num_pages ?? Math.ceil(totalItems / pageSize);
	const currentPage = results?.page ?? results?.page_number ?? page;
	const groupedResults = useMemo(() => groupResultsByType(results?.items ?? []), [results?.items]);

	// ---------------------------------------------------------------------------
	// Filter mutations
	// ---------------------------------------------------------------------------

	const toggleDocType = useCallback((name: string) => {
		setFilters(prev => {
			const list = prev.documentTypes ?? [];
			return {
				...prev,
				documentTypes: list.includes(name) ? list.filter(v => v !== name) : [...list, name],
			};
		});
		setPage(1);
	}, []);

	const toggleTag = useCallback((name: string) => {
		setFilters(prev => {
			const list = prev.tags ?? [];
			return {
				...prev,
				tags: list.includes(name) ? list.filter(v => v !== name) : [...list, name],
			};
		});
		setPage(1);
	}, []);

	const toggleOcrStatus = useCallback((status: string) => {
		setFilters(prev => {
			const list = prev.status ?? [];
			return {
				...prev,
				status: list.includes(status) ? list.filter(v => v !== status) : [...list, status],
			};
		});
		setPage(1);
	}, []);

	const setOperator = useCallback((name: string) => {
		setFilters(prev => ({ ...prev, scannedById: prev.scannedById === name ? null : name }));
		setPage(1);
	}, []);

	const setProject = useCallback((name: string) => {
		setFilters(prev => ({ ...prev, projectId: prev.projectId === name ? null : name }));
		setPage(1);
	}, []);

	const removeFilter = useCallback((key: string, value: string) => {
		setFilters(prev => {
			const next = { ...prev };
			if (key === 'documentTypes') {
				next.documentTypes = (next.documentTypes ?? []).filter(v => v !== value);
			} else if (key === 'tags') {
				next.tags = (next.tags ?? []).filter(v => v !== value);
			} else if (key === 'status') {
				next.status = (next.status ?? []).filter(v => v !== value);
			} else if (key === 'dateFrom') {
				next.dateFrom = null;
			} else if (key === 'dateTo') {
				next.dateTo = null;
			} else if (key === 'qualityScoreMin') {
				next.qualityScoreMin = null;
			} else if (key === 'scannedById') {
				next.scannedById = null;
			} else if (key === 'projectId') {
				next.projectId = null;
			} else if (key === 'hasAnnotations') {
				next.hasAnnotations = null;
			} else if (key === 'hasExceptions') {
				next.hasExceptions = null;
			}
			return next;
		});
		setPage(1);
	}, []);

	const clearAllFilters = useCallback(() => {
		setFilters({});
		setPage(1);
	}, []);

	const runSearch = useCallback((query: string) => {
		setInputValue(query);
		setSearchParams(query.trim() ? { q: query.trim() } : {}, { replace: true });
		setPage(1);
		if (query.trim()) pushHistory(query.trim());
	}, [pushHistory, setSearchParams]);

	const appendOperator = useCallback((operator: string) => {
		setInputValue(prev => {
			const next = prev.trim() ? `${prev.trim()} ${operator}` : operator;
			setPage(1);
			inputRef.current?.focus();
			return next;
		});
	}, []);

	return (
		<div className="flex flex-col h-full gap-0">
			{/* ------------------------------------------------------------------ Header */}
			<div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-slate-800">
				<div className="flex items-center justify-between gap-4">
					<div className="flex-1 max-w-2xl">
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
							<input
								ref={inputRef}
								type="text"
								value={inputValue}
								onChange={e => setInputValue(e.target.value)}
								onFocus={() => setInputFocused(true)}
								onBlur={() => setTimeout(() => setInputFocused(false), 150)}
								placeholder="Search documents…"
								className="w-full bg-slate-800/60 border border-slate-700/60 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brass-500/60 focus:ring-1 focus:ring-brass-500/30 transition-colors"
								autoFocus
							/>
							{isFetching && (
								<div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brass-500/60 border-t-transparent rounded-full animate-spin" />
							)}

							{/* Search history dropdown */}
							<AnimatePresence>
								{inputFocused && !inputValue && history.length > 0 && (
									<motion.div
										initial={{ opacity: 0, y: -4 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -4 }}
										transition={{ duration: 0.13 }}
										className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-slate-900 border border-slate-700/70 rounded-xl shadow-xl p-3"
									>
										<div className="flex items-center justify-between mb-2">
											<span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
												<Clock className="w-3 h-3" />
												Recent Searches
											</span>
											<button
												onClick={clearHistoryFn}
												className="flex items-center gap-1 text-xs text-slate-600 hover:text-red-400 transition-colors"
											>
												<Trash2 className="w-3 h-3" />
												Clear
											</button>
										</div>
										<div className="space-y-1">
											{history.map(q => (
												<div
													key={q}
													className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-800/80 group"
												>
													<Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
													<button
														type="button"
														onMouseDown={(e) => {
															e.preventDefault();
															runSearch(q);
															setInputFocused(false);
														}}
														className="min-w-0 flex-1 text-left text-sm text-slate-300 truncate"
													>
														{q}
													</button>
													<button
														type="button"
														onMouseDown={(e) => {
															e.preventDefault();
															e.stopPropagation();
															removeHistory(q);
														}}
														className="w-6 h-6 inline-flex items-center justify-center rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
														aria-label={`Remove ${q} from recent searches`}
													>
														<X className="w-3.5 h-3.5" />
													</button>
												</div>
											))}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
						<div className="mt-2">
							<button
								type="button"
								onClick={() => setShowAdvanced(v => !v)}
								className="inline-flex items-center gap-1.5 text-xs text-brass-400 hover:text-brass-300 transition-colors"
							>
								<SlidersHorizontal className="w-3.5 h-3.5" />
								Advanced
								{showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
							</button>
							<AnimatePresence initial={false}>
								{showAdvanced && (
									<motion.div
										initial={{ height: 0, opacity: 0 }}
										animate={{ height: 'auto', opacity: 1 }}
										exit={{ height: 0, opacity: 0 }}
										transition={{ duration: 0.18 }}
										className="overflow-hidden"
									>
										<div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
											<div className="grid gap-2 sm:grid-cols-2">
												{SEARCH_OPERATORS.map(op => (
													<button
														key={op.token}
														type="button"
														onClick={() => appendOperator(op.token)}
														className="flex items-center justify-between gap-3 rounded-md border border-slate-800 bg-slate-800/40 px-2.5 py-2 text-left hover:border-brass-500/30 hover:bg-slate-800 transition-colors"
													>
														<code className="text-xs text-brass-300">{op.token}</code>
														<span className="text-2xs text-slate-500">{op.description}</span>
													</button>
												))}
											</div>
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</div>
					</div>

					{/* Sort */}
					<div className="flex items-center gap-2">
						<SlidersHorizontal className="w-4 h-4 text-slate-500" />
						<select
							value={sortBy}
							onChange={e => { setSortBy(e.target.value as SearchSortBy); setPage(1); }}
							className="bg-slate-800 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-brass-500/40"
						>
							{SORT_OPTIONS.map(opt => (
								<option key={opt.value} value={opt.value}>{opt.label}</option>
							))}
						</select>
					</div>
				</div>

				{/* Result count + active filter chips */}
				<div className="flex items-center gap-3 mt-3 flex-wrap">
					<span className="text-sm text-slate-500 flex-shrink-0">
						{isLoading
							? 'Searching…'
							: totalItems > 0
								? `Showing ${((currentPage - 1) * pageSize) + 1}–${Math.min(currentPage * pageSize, totalItems)} of ${totalItems} results`
								: debouncedQuery || activeFilters.length > 0
									? 'No results'
									: 'Enter a query or apply filters'}
					</span>

					<AnimatePresence initial={false}>
						{activeFilters.map(f => (
							<motion.button
								key={`${f.key}-${f.value}`}
								initial={{ opacity: 0, scale: 0.85 }}
								animate={{ opacity: 1, scale: 1 }}
								exit={{ opacity: 0, scale: 0.85 }}
								onClick={() => removeFilter(f.key, f.value)}
								className="flex items-center gap-1.5 px-2.5 py-1 bg-brass-500/10 border border-brass-500/30 text-brass-400 text-xs rounded-full hover:bg-brass-500/20 transition-colors"
							>
								{f.label}
								<X className="w-3 h-3" />
							</motion.button>
						))}
					</AnimatePresence>

					{activeFilters.length > 1 && (
						<button
							onClick={clearAllFilters}
							className="text-xs text-slate-500 hover:text-slate-300 underline transition-colors"
						>
							Clear all
						</button>
					)}

					<div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
						<span>Group by type</span>
						<Switch
							checked={groupByType}
							onCheckedChange={setGroupByType}
							className="data-[state=checked]:bg-brass-500 data-[state=unchecked]:bg-slate-700"
							aria-label="Group results by document type"
						/>
					</div>
				</div>
			</div>

			{/* ------------------------------------------------------------------ Body */}
			<div className="flex flex-1 overflow-hidden">
				{/* Left sidebar — filter panels */}
				<aside className="w-72 flex-shrink-0 border-r border-slate-800 overflow-y-auto p-4 space-y-3">
					<FilterPanelDocTypes
						items={facets?.document_types ?? []}
						selected={filters.documentTypes ?? []}
						onToggle={toggleDocType}
					/>

					<FilterPanelTags
						items={facets?.tags ?? []}
						selected={filters.tags ?? []}
						onToggle={toggleTag}
					/>

					<FilterPanelOcrStatus
						selected={filters.status ?? []}
						onToggle={toggleOcrStatus}
					/>

					<FilterPanelDateRange
						dateFrom={filters.dateFrom ?? ''}
						dateTo={filters.dateTo ?? ''}
						onChange={(from, to) => {
							setFilters(prev => ({ ...prev, dateFrom: from || null, dateTo: to || null }));
							setPage(1);
						}}
					/>

					<FilterPanelQuality
						value={filters.qualityScoreMin ?? 0}
						onChange={v => {
							setFilters(prev => ({ ...prev, qualityScoreMin: v > 0 ? v : null }));
							setPage(1);
						}}
					/>

					<FilterPanelOperators
						items={facets?.operators ?? []}
						selected={filters.scannedById ?? null}
						onSelect={setOperator}
					/>

					<FilterPanelProjects
						items={facets?.projects ?? []}
						selected={filters.projectId ?? null}
						onSelect={setProject}
					/>

					<FilterPanelToggles
						hasAnnotations={filters.hasAnnotations ?? null}
						hasExceptions={filters.hasExceptions ?? null}
						onChange={(key, val) => {
							setFilters(prev => ({ ...prev, [key]: val }));
							setPage(1);
						}}
					/>

					<CollapsiblePanel
						title="Saved Searches"
						icon={<Bookmark className="w-4 h-4" />}
						defaultOpen={false}
					>
						<SavedSearchPanel
							currentQuery={inputValue}
							currentFilters={filters}
							onApply={(query, savedFilters) => {
								runSearch(query);
								if (savedFilters) {
									setFilters(savedFilters);
								}
							}}
						/>
					</CollapsiblePanel>
				</aside>

				{/* Main results area */}
				<main className="flex-1 overflow-y-auto px-6 py-4">
					{isLoading ? (
						<SearchSkeleton />
					) : isError ? (
						<div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
							<AlertCircle className="h-4 w-4 shrink-0" />
							Failed to load search results. Check your connection and try refreshing.
						</div>
					) : !results || results.items.length === 0 ? (
						<SearchEmpty
							query={debouncedQuery}
							hasFilters={activeFilters.length > 0}
							onClearFilters={clearAllFilters}
						/>
					) : (
						groupByType ? (
							<div className="space-y-3">
								{groupedResults.map(group => (
									<SearchResultGroup
										key={group.type}
										group={group}
										query={debouncedQuery}
										onOpen={(id) => navigate(`/documents?nodeId=${id}`)}
									/>
								))}
							</div>
						) : (
							<div className="space-y-2">
								{results.items.map((item, idx) => (
									<SearchResultCard
										key={item.id}
										item={item}
										index={idx}
										query={debouncedQuery}
										onClick={() => navigate(`/documents?nodeId=${item.id}`)}
									/>
								))}
							</div>
						)
					)}

					{/* Pagination */}
					{numPages > 1 && (
						<div className="flex items-center justify-center gap-2 pt-6">
							<button
								onClick={() => setPage(p => Math.max(1, p - 1))}
								disabled={currentPage <= 1}
								className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
							>
								Previous
							</button>
							<div className="flex gap-1">
								{buildPageNumbers(currentPage, numPages).map((p, i) =>
									p === '…' ? (
										<span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-slate-600 text-sm">…</span>
									) : (
										<button
											key={p}
											onClick={() => setPage(Number(p))}
											className={cn(
												'w-8 h-8 rounded-lg text-sm transition-colors',
												Number(p) === currentPage
													? 'bg-brass-500 text-slate-900 font-semibold'
													: 'text-slate-400 hover:bg-slate-700'
											)}
										>
											{p}
										</button>
									)
								)}
							</div>
							<button
								onClick={() => setPage(p => Math.min(numPages, p + 1))}
								disabled={currentPage >= numPages}
								className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
							>
								Next
							</button>
						</div>
					)}
				</main>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Filter Panels
// ---------------------------------------------------------------------------

interface CollapsiblePanelProps {
	title: string;
	icon: React.ReactNode;
	children: React.ReactNode;
	defaultOpen?: boolean;
	badge?: number;
}

function CollapsiblePanel({ title, icon, children, defaultOpen = true, badge }: CollapsiblePanelProps) {
	const [open, setOpen] = useState(defaultOpen);
	return (
		<div className="glass-card overflow-hidden">
			<button
				onClick={() => setOpen(o => !o)}
				className="w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors"
			>
				<span className="flex items-center gap-2">
					<span className="text-slate-500">{icon}</span>
					{title}
					{badge != null && badge > 0 && (
						<span className="px-1.5 py-0.5 text-2xs rounded-full bg-brass-500/20 text-brass-400 font-medium">{badge}</span>
					)}
				</span>
				{open ? <ChevronUp className="w-3.5 h-3.5 text-slate-600" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-600" />}
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.18 }}
						className="overflow-hidden"
					>
						<div className="px-3 pb-3">{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

// Document Type checkboxes
function FilterPanelDocTypes({
	items,
	selected,
	onToggle,
}: {
	items: Array<{ name: string; count: number }>;
	selected: string[];
	onToggle: (name: string) => void;
}) {
	const [showAll, setShowAll] = useState(false);
	const displayed = showAll ? items : items.slice(0, 6);

	return (
		<CollapsiblePanel
			title="Document Type"
			icon={<FileText className="w-4 h-4" />}
			badge={selected.length}
		>
			{items.length === 0 ? (
				<p className="text-xs text-slate-600 py-1">No types available</p>
			) : (
				<div className="space-y-1">
					{displayed.map(item => (
						<label
							key={item.name}
							className="flex items-center justify-between gap-2 px-1 py-1 rounded hover:bg-slate-700/40 cursor-pointer group"
						>
							<div className="flex items-center gap-2">
								<input
									type="checkbox"
									checked={selected.includes(item.name)}
									onChange={() => onToggle(item.name)}
									className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 accent-brass-500"
								/>
								<span className="text-sm text-slate-300 truncate">{item.name}</span>
							</div>
							<span className="text-xs text-slate-500 flex-shrink-0">{item.count}</span>
						</label>
					))}
					{items.length > 6 && (
						<button
							onClick={() => setShowAll(s => !s)}
							className="text-xs text-brass-500/70 hover:text-brass-400 mt-1 transition-colors"
						>
							{showAll ? 'Show less' : `+${items.length - 6} more`}
						</button>
					)}
				</div>
			)}
		</CollapsiblePanel>
	);
}

// Date Range
function FilterPanelDateRange({
	dateFrom,
	dateTo,
	onChange,
}: {
	dateFrom: string;
	dateTo: string;
	onChange: (from: string, to: string) => void;
}) {
	return (
		<CollapsiblePanel title="Date Range" icon={<Calendar className="w-4 h-4" />}>
			<div className="space-y-2">
				<div>
					<label className="text-xs text-slate-500 mb-1 block">From</label>
					<input
						type="date"
						value={dateFrom}
						onChange={e => onChange(e.target.value, dateTo)}
						className="w-full bg-slate-800/70 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brass-500/40 [color-scheme:dark]"
					/>
				</div>
				<div>
					<label className="text-xs text-slate-500 mb-1 block">To</label>
					<input
						type="date"
						value={dateTo}
						onChange={e => onChange(dateFrom, e.target.value)}
						className="w-full bg-slate-800/70 border border-slate-700/50 rounded-lg px-2.5 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-brass-500/40 [color-scheme:dark]"
					/>
				</div>
				{(dateFrom || dateTo) && (
					<button
						onClick={() => onChange('', '')}
						className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
					>
						Clear dates
					</button>
				)}
			</div>
		</CollapsiblePanel>
	);
}

// Quality score slider
function FilterPanelQuality({
	value,
	onChange,
}: {
	value: number;
	onChange: (v: number) => void;
}) {
	return (
		<CollapsiblePanel title="Quality Score" icon={<Star className="w-4 h-4" />}>
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<span className="text-xs text-slate-500">Minimum quality</span>
					<span className={cn('text-sm font-medium tabular-nums', value > 0 ? qualityColor(value) : 'text-slate-500')}>
						{value > 0 ? `≥ ${value}` : 'Any'}
					</span>
				</div>
				<input
					type="range"
					min={0}
					max={100}
					step={5}
					value={value}
					onChange={e => onChange(Number(e.target.value))}
					className="w-full accent-brass-500"
				/>
				<div className="flex justify-between text-2xs text-slate-600">
					<span>0</span>
					<span>25</span>
					<span>50</span>
					<span>75</span>
					<span>100</span>
				</div>
			</div>
		</CollapsiblePanel>
	);
}

// Operator radio list
function FilterPanelOperators({
	items,
	selected,
	onSelect,
}: {
	items: Array<{ name: string; count: number }>;
	selected: string | null;
	onSelect: (name: string) => void;
}) {
	return (
		<CollapsiblePanel
			title="Operator"
			icon={<User className="w-4 h-4" />}
			badge={selected ? 1 : 0}
		>
			{items.length === 0 ? (
				<p className="text-xs text-slate-600 py-1">No operators available</p>
			) : (
				<div className="space-y-1">
					{items.map(item => (
						<button
							key={item.name}
							onClick={() => onSelect(item.name)}
							className={cn(
								'w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-sm transition-colors',
								selected === item.name
									? 'bg-brass-500/10 text-brass-400 border border-brass-500/20'
									: 'text-slate-400 hover:bg-slate-700/50'
							)}
						>
							<span className="truncate">{item.name}</span>
							<span className="text-xs text-slate-500 flex-shrink-0 ml-2">{item.count}</span>
						</button>
					))}
				</div>
			)}
		</CollapsiblePanel>
	);
}

// Project dropdown / list
function FilterPanelProjects({
	items,
	selected,
	onSelect,
}: {
	items: Array<{ name: string; count: number }>;
	selected: string | null;
	onSelect: (name: string) => void;
}) {
	return (
		<CollapsiblePanel
			title="Project"
			icon={<FolderOpen className="w-4 h-4" />}
			badge={selected ? 1 : 0}
		>
			{items.length === 0 ? (
				<p className="text-xs text-slate-600 py-1">No projects available</p>
			) : (
				<div className="space-y-1">
					{items.map(item => (
						<button
							key={item.name}
							onClick={() => onSelect(item.name)}
							className={cn(
								'w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left text-sm transition-colors',
								selected === item.name
									? 'bg-brass-500/10 text-brass-400 border border-brass-500/20'
									: 'text-slate-400 hover:bg-slate-700/50'
							)}
						>
							<span className="truncate">{item.name}</span>
							<span className="text-xs text-slate-500 flex-shrink-0 ml-2">{item.count}</span>
						</button>
					))}
				</div>
			)}
		</CollapsiblePanel>
	);
}

// Boolean toggles
function FilterPanelToggles({
	hasAnnotations,
	hasExceptions,
	onChange,
}: {
	hasAnnotations: boolean | null;
	hasExceptions: boolean | null;
	onChange: (key: 'hasAnnotations' | 'hasExceptions', val: boolean | null) => void;
}) {
	return (
		<CollapsiblePanel title="Flags" icon={<Filter className="w-4 h-4" />}>
			<div className="space-y-2">
				<ToggleRow
					label="Has annotations"
					icon={<MessageSquare className="w-3.5 h-3.5" />}
					value={hasAnnotations}
					onChange={v => onChange('hasAnnotations', v)}
				/>
				<ToggleRow
					label="Has exceptions"
					icon={<AlertTriangle className="w-3.5 h-3.5" />}
					value={hasExceptions}
					onChange={v => onChange('hasExceptions', v)}
				/>
			</div>
		</CollapsiblePanel>
	);
}

function ToggleRow({
	label,
	icon,
	value,
	onChange,
}: {
	label: string;
	icon: React.ReactNode;
	value: boolean | null;
	onChange: (v: boolean | null) => void;
}) {
	const cycle = () => {
		if (value === null) onChange(true);
		else if (value === true) onChange(false);
		else onChange(null);
	};

	return (
		<button
			onClick={cycle}
			className={cn(
				'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors',
				value === true
					? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
					: value === false
						? 'bg-red-500/10 text-red-400 border border-red-500/20'
						: 'text-slate-400 hover:bg-slate-700/50'
			)}
		>
			<span className={value === null ? 'text-slate-600' : ''}>{icon}</span>
			<span className="flex-1">{label}</span>
			{value === true && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
			{value === false && <X className="w-3.5 h-3.5 text-red-400" />}
		</button>
	);
}

// Tags filter — chips with color swatches
function FilterPanelTags({
	items,
	selected,
	onToggle,
}: {
	items: Array<{ name: string; count: number; color?: string }>;
	selected: string[];
	onToggle: (name: string) => void;
}) {
	const [showAll, setShowAll] = useState(false);
	const displayed = showAll ? items : items.slice(0, 8);

	return (
		<CollapsiblePanel
			title="Tags"
			icon={<Tag className="w-4 h-4" />}
			badge={selected.length}
			defaultOpen={false}
		>
			{items.length === 0 ? (
				<p className="text-xs text-slate-600 py-1">No tags available</p>
			) : (
				<div className="flex flex-wrap gap-1.5">
					{displayed.map(item => {
						const active = selected.includes(item.name);
						return (
							<button
								key={item.name}
								onClick={() => onToggle(item.name)}
								className={cn(
									'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
									active
										? 'bg-brass-500/15 border-brass-500/40 text-brass-300'
										: 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:border-slate-600'
								)}
								style={item.color && !active ? { borderColor: item.color + '50', color: item.color } : undefined}
							>
								{item.color && (
									<span
										className="w-2 h-2 rounded-full flex-shrink-0"
										style={{ background: item.color }}
									/>
								)}
								{item.name}
								<span className="text-slate-500 ml-0.5">{item.count}</span>
							</button>
						);
					})}
					{items.length > 8 && (
						<button
							onClick={() => setShowAll(s => !s)}
							className="text-xs text-brass-500/70 hover:text-brass-400 transition-colors px-1"
						>
							{showAll ? 'Less' : `+${items.length - 8} more`}
						</button>
					)}
				</div>
			)}
		</CollapsiblePanel>
	);
}

const OCR_STATUS_OPTIONS = [
	{ value: 'pending',    label: 'Pending',    color: '#94a3b8' },
	{ value: 'processing', label: 'Processing', color: '#f59e0b' },
	{ value: 'completed',  label: 'Completed',  color: '#10b981' },
	{ value: 'failed',     label: 'Failed',     color: '#ef4444' },
] as const;

// OCR Status checkboxes
function FilterPanelOcrStatus({
	selected,
	onToggle,
}: {
	selected: string[];
	onToggle: (status: string) => void;
}) {
	return (
		<CollapsiblePanel
			title="OCR Status"
			icon={<CheckCircle2 className="w-4 h-4" />}
			badge={selected.length}
			defaultOpen={false}
		>
			<div className="space-y-1">
				{OCR_STATUS_OPTIONS.map(opt => {
					const active = selected.includes(opt.value);
					return (
						<label
							key={opt.value}
							className="flex items-center gap-2 px-1 py-1 rounded hover:bg-slate-700/40 cursor-pointer"
						>
							<input
								type="checkbox"
								checked={active}
								onChange={() => onToggle(opt.value)}
								className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 accent-brass-500"
							/>
							<span
								className="w-2 h-2 rounded-full flex-shrink-0"
								style={{ background: opt.color }}
							/>
							<span className="text-sm text-slate-300">{opt.label}</span>
						</label>
					);
				})}
			</div>
		</CollapsiblePanel>
	);
}

// ---------------------------------------------------------------------------
// Result Card
// ---------------------------------------------------------------------------

function SearchResultGroup({
	group,
	query,
	onOpen,
}: {
	group: SearchResultTypeGroup;
	query: string;
	onOpen: (id: string) => void;
}) {
	const [open, setOpen] = useState(true);

	return (
		<section className="rounded-lg border border-slate-800/80 bg-slate-950/20 overflow-hidden">
			<button
				type="button"
				onClick={() => setOpen(v => !v)}
				className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-900/70 transition-colors"
			>
				<span className="flex items-center gap-2 text-sm font-medium text-slate-200">
					<FileText className="w-4 h-4 text-slate-500" />
					{group.type} ({group.items.length})
				</span>
				{open ? <ChevronUp className="w-4 h-4 text-slate-600" /> : <ChevronDown className="w-4 h-4 text-slate-600" />}
			</button>
			<AnimatePresence initial={false}>
				{open && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.18 }}
						className="overflow-hidden"
					>
						<div className="space-y-2 p-3 pt-0">
							{group.items.map((item, index) => (
								<SearchResultCard
									key={item.id}
									item={item}
									index={index}
									query={query}
									onClick={() => onOpen(item.id)}
								/>
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</section>
	);
}

interface SearchResultCardProps {
	item: SearchResult;
	index: number;
	query: string;
	onClick: () => void;
}

function SearchResultCard({ item, index, query, onClick }: SearchResultCardProps) {
	const typeLabel = item.documentType ?? item.documentTypeBadge;
	const operatorName = item.operator
		? (item.operator.name ?? (item.operator as { username?: string }).username ?? null)
		: null;
	const excerpt = item.ocrExcerpt ?? item.highlights?.[0] ?? item.excerpt ?? '';

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: Math.min(index * 0.04, 0.3) }}
			onClick={onClick}
			className="glass-card p-4 cursor-pointer hover:border-slate-600/70 transition-all group"
		>
			<div className="flex gap-4">
				{/* Icon */}
				<div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
					<FileText className="w-5 h-5 text-slate-500 group-hover:text-brass-500 transition-colors" />
				</div>

				{/* Content */}
				<div className="flex-1 min-w-0">
					{/* Title row */}
					<div className="flex items-start gap-2 flex-wrap">
						<h3 className="font-medium text-slate-200 group-hover:text-brass-400 transition-colors leading-snug">
							{item.title}
						</h3>
						{typeLabel && (
							<span className="flex-shrink-0 px-2 py-0.5 text-2xs rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
								{typeLabel}
							</span>
						)}
						{item.qualityScore != null && (
							<span className={cn(
								'flex-shrink-0 px-2 py-0.5 text-2xs rounded-full border font-medium',
								qualityBg(item.qualityScore)
							)}>
								Q {Math.round(item.qualityScore)}
							</span>
						)}
					</div>

					{/* Meta row */}
					<div className="flex items-center gap-3 mt-1 text-xs text-slate-500 flex-wrap">
						{item.owner?.name && (
							<span className="flex items-center gap-1">
								<User className="w-3 h-3" />
								{item.owner.name}
							</span>
						)}
						{operatorName && operatorName !== item.owner?.name && (
							<span className="flex items-center gap-1 text-slate-600">
								<BarChart2 className="w-3 h-3" />
								{operatorName}
							</span>
						)}
						{(item.updatedAt || item.createdAt) && (
							<span className="flex items-center gap-1">
								<Calendar className="w-3 h-3" />
								{formatRelativeTime(item.updatedAt ?? item.createdAt ?? '')}
							</span>
						)}
						{item.matchedFieldLabel && (
							<span className="flex items-center gap-1 text-brass-400">
								<Tag className="w-3 h-3" />
								Matched field: {item.matchedFieldLabel}
							</span>
						)}
						{item.pageNumber != null && (
							<span className="flex items-center gap-1 text-slate-400">
								<FileText className="w-3 h-3" />
								Found on page {item.pageNumber}
							</span>
						)}
					</div>

					{/* OCR excerpt */}
					{excerpt && (
						<p className="mt-1.5 text-sm text-slate-400 line-clamp-2 leading-relaxed">
							{highlightedText(excerpt, query)}
						</p>
					)}

					{/* Tags */}
					{item.tags && item.tags.length > 0 && (
						<div className="flex flex-wrap gap-1 mt-2">
							{item.tags.slice(0, 5).map(tag => (
								<span
									key={tag.id}
									className="px-2 py-0.5 text-2xs rounded-full border border-slate-700 text-slate-500"
									style={tag.color ? { borderColor: tag.color + '60', color: tag.color } : undefined}
								>
									{tag.name}
								</span>
							))}
							{item.tags.length > 5 && (
								<span className="text-2xs text-slate-600">+{item.tags.length - 5}</span>
							)}
						</div>
					)}
				</div>

				{/* Relevance score donut */}
				{item.score != null && item.score > 0 && (
					<div className="flex-shrink-0 w-9 h-9 self-center">
						<div
							className="w-9 h-9 rounded-full flex items-center justify-center text-2xs font-semibold text-brass-400"
							style={{
								background: `conic-gradient(#d4a753 ${Math.round(item.score * 100)}%, #1e293b 0)`,
							}}
						>
							<div className="w-7 h-7 bg-slate-900 rounded-full flex items-center justify-center">
								{Math.round(item.score * 100)}
							</div>
						</div>
					</div>
				)}
			</div>
		</motion.div>
	);
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SearchSkeleton() {
	return (
		<div className="space-y-2">
			{Array.from({ length: 6 }).map((_, i) => (
				<div key={i} className="glass-card p-4 animate-pulse">
					<div className="flex gap-4">
						<div className="w-10 h-10 rounded-lg bg-slate-800" />
						<div className="flex-1 space-y-2">
							<div className="h-4 bg-slate-800 rounded w-1/2" />
							<div className="h-3 bg-slate-800/60 rounded w-1/4" />
							<div className="h-3 bg-slate-800/40 rounded w-3/4" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function SearchEmpty({
	query,
	hasFilters,
	onClearFilters,
}: {
	query: string;
	hasFilters: boolean;
	onClearFilters: () => void;
}) {
	const trimmedQuery = query.trim();

	return (
		<div className="flex flex-col items-center justify-center py-20 text-center">
			<div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-4">
				<Search className="w-8 h-8 text-slate-600" />
			</div>
			<h3 className="text-base font-medium text-slate-300 mb-2">
				{trimmedQuery ? `No results for "${trimmedQuery}"` : 'No results'}
			</h3>
			<ul className="space-y-1 text-sm text-slate-500 max-w-sm">
				<li>Try: removing filters</li>
				<li>Check spelling</li>
				<li>Search all document types</li>
			</ul>
			<button
				type="button"
				onClick={onClearFilters}
				disabled={!hasFilters}
				className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-brass-500/40 hover:text-brass-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
			>
				<X className="w-4 h-4" />
				Clear all filters
			</button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Pagination helper
// ---------------------------------------------------------------------------

function buildPageNumbers(current: number, total: number): Array<number | '…'> {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
	const pages: Array<number | '…'> = [1];
	if (current > 3) pages.push('…');
	for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) pages.push(p);
	if (current < total - 2) pages.push('…');
	pages.push(total);
	return pages;
}
