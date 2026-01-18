// (c) Copyright Datacraft, 2026
/**
 * Advanced search panel with filters and facets.
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Search,
	Filter,
	X,
	Calendar,
	Tag,
	FileText,
	User,
	Folder,
	ChevronDown,
	ChevronUp,
	Save,
	Clock,
	Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchFilters, SearchMode, SearchQuery } from '../types';
import { SEARCH_MODES } from '../types';

interface AdvancedSearchProps {
	onSearch: (query: SearchQuery) => void;
	onSaveSearch?: (name: string, query: SearchQuery) => void;
	documentTypes?: Array<{ id: string; name: string }>;
	tags?: Array<{ id: string; name: string; color?: string }>;
	users?: Array<{ id: string; name: string }>;
	folders?: Array<{ id: string; name: string; path: string }>;
	isLoading?: boolean;
	initialQuery?: string;
	initialFilters?: SearchFilters;
}

export function AdvancedSearch({
	onSearch,
	onSaveSearch,
	documentTypes = [],
	tags = [],
	users = [],
	folders = [],
	isLoading,
	initialQuery = '',
	initialFilters,
}: AdvancedSearchProps) {
	const [query, setQuery] = useState(initialQuery);
	const [mode, setMode] = useState<SearchMode>('hybrid');
	const [showFilters, setShowFilters] = useState(false);
	const [showSaveDialog, setShowSaveDialog] = useState(false);
	const [searchName, setSearchName] = useState('');

	const [filters, setFilters] = useState<SearchFilters>(
		initialFilters || {
			documentTypes: [],
			tags: [],
			dateRange: { start: null, end: null },
			owner: null,
			folder: null,
			status: [],
		}
	);

	const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
		documentTypes: true,
		tags: true,
		dateRange: true,
		owner: false,
		folder: false,
	});

	const toggleSection = (section: string) => {
		setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
	};

	const handleSearch = useCallback(() => {
		const searchQuery: SearchQuery = {
			query,
			mode,
			filters: Object.fromEntries(
				Object.entries(filters).filter(([_, v]) => {
					if (Array.isArray(v)) return v.length > 0;
					if (typeof v === 'object' && v !== null) {
						return Object.values(v).some((val) => val !== null);
					}
					return v !== null;
				})
			) as SearchFilters,
		};
		onSearch(searchQuery);
	}, [query, mode, filters, onSearch]);

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			handleSearch();
		}
	};

	const handleSaveSearch = () => {
		if (searchName.trim() && onSaveSearch) {
			onSaveSearch(searchName.trim(), { query, mode, filters });
			setShowSaveDialog(false);
			setSearchName('');
		}
	};

	const updateFilter = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) => {
		setFilters((prev) => ({ ...prev, [key]: value }));
	};

	const toggleArrayFilter = (key: 'documentTypes' | 'tags' | 'status', value: string) => {
		const current = filters[key] || [];
		const updated = current.includes(value)
			? current.filter((v) => v !== value)
			: [...current, value];
		updateFilter(key, updated);
	};

	const activeFilterCount = Object.values(filters).reduce((count, value) => {
		if (Array.isArray(value) && value.length > 0) return count + 1;
		if (typeof value === 'object' && value !== null) {
			const hasValue = Object.values(value).some((v) => v !== null);
			return hasValue ? count + 1 : count;
		}
		return value !== null ? count + 1 : count;
	}, 0);

	const clearFilters = () => {
		setFilters({
			documentTypes: [],
			tags: [],
			dateRange: { start: null, end: null },
			owner: null,
			folder: null,
			status: [],
		});
	};

	return (
		<div className="space-y-4">
			{/* Search Input */}
			<div className="flex gap-3">
				<div className="flex-1 relative">
					<Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
					<input
						type="text"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Search documents..."
						className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50 focus:border-brass-500/50"
					/>
				</div>

				{/* Mode Selector */}
				<div className="flex bg-slate-800/50 border border-slate-700/50 rounded-xl p-1">
					{SEARCH_MODES.map((m) => (
						<button
							key={m.value}
							onClick={() => setMode(m.value)}
							className={cn(
								'px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2',
								mode === m.value
									? 'bg-brass-500 text-slate-900'
									: 'text-slate-400 hover:text-slate-200'
							)}
							title={m.description}
						>
							{m.value === 'semantic' && <Sparkles className="w-4 h-4" />}
							{m.label}
						</button>
					))}
				</div>

				{/* Filter Toggle */}
				<button
					onClick={() => setShowFilters(!showFilters)}
					className={cn(
						'px-4 py-2 rounded-xl border transition-colors flex items-center gap-2',
						showFilters || activeFilterCount > 0
							? 'bg-brass-500/10 border-brass-500/50 text-brass-400'
							: 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200'
					)}
				>
					<Filter className="w-4 h-4" />
					Filters
					{activeFilterCount > 0 && (
						<span className="px-1.5 py-0.5 text-2xs rounded-full bg-brass-500 text-slate-900 font-medium">
							{activeFilterCount}
						</span>
					)}
				</button>

				{/* Search Button */}
				<button
					onClick={handleSearch}
					disabled={isLoading}
					className="px-6 py-2 bg-brass-500 text-slate-900 font-medium rounded-xl hover:bg-brass-400 disabled:opacity-50 transition-colors"
				>
					{isLoading ? (
						<div className="w-5 h-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin" />
					) : (
						'Search'
					)}
				</button>
			</div>

			{/* Filters Panel */}
			<AnimatePresence>
				{showFilters && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="overflow-hidden"
					>
						<div className="glass-card p-4 space-y-4">
							<div className="flex items-center justify-between">
								<h3 className="font-medium text-slate-200">Filters</h3>
								<div className="flex items-center gap-2">
									{activeFilterCount > 0 && (
										<button
											onClick={clearFilters}
											className="text-xs text-slate-400 hover:text-slate-200"
										>
											Clear all
										</button>
									)}
									{onSaveSearch && (
										<button
											onClick={() => setShowSaveDialog(true)}
											className="flex items-center gap-1 text-xs text-brass-400 hover:text-brass-300"
										>
											<Save className="w-3 h-3" />
											Save search
										</button>
									)}
								</div>
							</div>

							<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
								{/* Document Types */}
								{documentTypes.length > 0 && (
									<FilterSection
										title="Document Types"
										icon={<FileText className="w-4 h-4" />}
										expanded={expandedSections.documentTypes}
										onToggle={() => toggleSection('documentTypes')}
									>
										<div className="space-y-1">
											{documentTypes.map((dt) => (
												<label key={dt.id} className="flex items-center gap-2 cursor-pointer">
													<input
														type="checkbox"
														checked={filters.documentTypes?.includes(dt.id)}
														onChange={() => toggleArrayFilter('documentTypes', dt.id)}
														className="rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500/50"
													/>
													<span className="text-sm text-slate-300">{dt.name}</span>
												</label>
											))}
										</div>
									</FilterSection>
								)}

								{/* Tags */}
								{tags.length > 0 && (
									<FilterSection
										title="Tags"
										icon={<Tag className="w-4 h-4" />}
										expanded={expandedSections.tags}
										onToggle={() => toggleSection('tags')}
									>
										<div className="flex flex-wrap gap-1">
											{tags.map((tag) => (
												<button
													key={tag.id}
													onClick={() => toggleArrayFilter('tags', tag.id)}
													className={cn(
														'px-2 py-1 text-xs rounded-full border transition-colors',
														filters.tags?.includes(tag.id)
															? 'bg-brass-500/20 border-brass-500/50 text-brass-400'
															: 'border-slate-700 text-slate-400 hover:border-slate-600'
													)}
													style={
														tag.color && filters.tags?.includes(tag.id)
															? { borderColor: tag.color, color: tag.color }
															: undefined
													}
												>
													{tag.name}
												</button>
											))}
										</div>
									</FilterSection>
								)}

								{/* Date Range */}
								<FilterSection
									title="Date Range"
									icon={<Calendar className="w-4 h-4" />}
									expanded={expandedSections.dateRange}
									onToggle={() => toggleSection('dateRange')}
								>
									<div className="space-y-2">
										<div>
											<label className="text-xs text-slate-500 mb-1 block">From</label>
											<input
												type="date"
												value={filters.dateRange?.start || ''}
												onChange={(e) =>
													updateFilter('dateRange', {
														...filters.dateRange,
														start: e.target.value || null,
														end: filters.dateRange?.end || null,
													})
												}
												className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
											/>
										</div>
										<div>
											<label className="text-xs text-slate-500 mb-1 block">To</label>
											<input
												type="date"
												value={filters.dateRange?.end || ''}
												onChange={(e) =>
													updateFilter('dateRange', {
														...filters.dateRange,
														start: filters.dateRange?.start || null,
														end: e.target.value || null,
													})
												}
												className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
											/>
										</div>
									</div>
								</FilterSection>

								{/* Owner */}
								{users.length > 0 && (
									<FilterSection
										title="Owner"
										icon={<User className="w-4 h-4" />}
										expanded={expandedSections.owner}
										onToggle={() => toggleSection('owner')}
									>
										<select
											value={filters.owner || ''}
											onChange={(e) => updateFilter('owner', e.target.value || null)}
											className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
										>
											<option value="">Any owner</option>
											{users.map((user) => (
												<option key={user.id} value={user.id}>
													{user.name}
												</option>
											))}
										</select>
									</FilterSection>
								)}

								{/* Folder */}
								{folders.length > 0 && (
									<FilterSection
										title="Folder"
										icon={<Folder className="w-4 h-4" />}
										expanded={expandedSections.folder}
										onToggle={() => toggleSection('folder')}
									>
										<select
											value={filters.folder || ''}
											onChange={(e) => updateFilter('folder', e.target.value || null)}
											className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200"
										>
											<option value="">Any folder</option>
											{folders.map((folder) => (
												<option key={folder.id} value={folder.id}>
													{folder.path}
												</option>
											))}
										</select>
									</FilterSection>
								)}
							</div>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Save Search Dialog */}
			<AnimatePresence>
				{showSaveDialog && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50"
						onClick={() => setShowSaveDialog(false)}
					>
						<motion.div
							initial={{ scale: 0.95 }}
							animate={{ scale: 1 }}
							exit={{ scale: 0.95 }}
							className="glass-card w-full max-w-md p-6"
							onClick={(e) => e.stopPropagation()}
						>
							<h3 className="text-lg font-display font-semibold text-slate-100 mb-4">
								Save Search
							</h3>
							<input
								type="text"
								value={searchName}
								onChange={(e) => setSearchName(e.target.value)}
								placeholder="Search name..."
								className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder:text-slate-500 mb-4"
								autoFocus
							/>
							<div className="flex gap-2 justify-end">
								<button
									onClick={() => setShowSaveDialog(false)}
									className="px-4 py-2 text-slate-400 hover:text-slate-200"
								>
									Cancel
								</button>
								<button
									onClick={handleSaveSearch}
									disabled={!searchName.trim()}
									className="px-4 py-2 bg-brass-500 text-slate-900 font-medium rounded-lg hover:bg-brass-400 disabled:opacity-50"
								>
									Save
								</button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

interface FilterSectionProps {
	title: string;
	icon: React.ReactNode;
	expanded: boolean;
	onToggle: () => void;
	children: React.ReactNode;
}

function FilterSection({ title, icon, expanded, onToggle, children }: FilterSectionProps) {
	return (
		<div className="bg-slate-800/30 rounded-lg border border-slate-700/50">
			<button
				onClick={onToggle}
				className="w-full flex items-center justify-between p-3 text-sm font-medium text-slate-300"
			>
				<span className="flex items-center gap-2">
					<span className="text-slate-500">{icon}</span>
					{title}
				</span>
				{expanded ? (
					<ChevronUp className="w-4 h-4 text-slate-500" />
				) : (
					<ChevronDown className="w-4 h-4 text-slate-500" />
				)}
			</button>
			<AnimatePresence>
				{expanded && (
					<motion.div
						initial={{ height: 0 }}
						animate={{ height: 'auto' }}
						exit={{ height: 0 }}
						className="overflow-hidden"
					>
						<div className="px-3 pb-3">{children}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}
