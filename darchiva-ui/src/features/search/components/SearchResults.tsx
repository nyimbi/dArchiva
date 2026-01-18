// (c) Copyright Datacraft, 2026
/**
 * Search results display with highlighting and faceted navigation.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	FileText,
	Folder,
	User,
	Calendar,
	Tag,
	ChevronDown,
	ChevronUp,
	Grid,
	List,
	Eye,
	Download,
	MoreVertical,
	Clock,
	Zap,
	ArrowUpDown,
} from 'lucide-react';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';
import type { SearchResponse, SearchResult, SearchFacets } from '../types';

interface SearchResultsProps {
	results: SearchResponse | null;
	isLoading: boolean;
	onResultClick: (result: SearchResult) => void;
	onFacetClick?: (facetType: string, value: string) => void;
	onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
	onPageChange?: (page: number) => void;
}

export function SearchResults({
	results,
	isLoading,
	onResultClick,
	onFacetClick,
	onSortChange,
	onPageChange,
}: SearchResultsProps) {
	const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
	const [showFacets, setShowFacets] = useState(true);
	const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'title'>('relevance');
	const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

	const handleSortChange = (newSortBy: typeof sortBy) => {
		const newOrder = newSortBy === sortBy && sortOrder === 'desc' ? 'asc' : 'desc';
		setSortBy(newSortBy);
		setSortOrder(newOrder);
		onSortChange?.(newSortBy, newOrder);
	};

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center py-16">
				<div className="relative">
					<div className="w-16 h-16 border-4 border-slate-700 rounded-full" />
					<div className="absolute inset-0 w-16 h-16 border-4 border-brass-500 border-t-transparent rounded-full animate-spin" />
				</div>
				<p className="mt-4 text-slate-400">Searching...</p>
			</div>
		);
	}

	if (!results) {
		return null;
	}

	if (results.items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<FileText className="w-16 h-16 text-slate-600 mb-4" />
				<h3 className="text-lg font-medium text-slate-300 mb-2">No results found</h3>
				<p className="text-slate-500 max-w-md">
					Try adjusting your search terms or filters to find what you're looking for.
				</p>
			</div>
		);
	}

	const totalPages = Math.ceil(results.total / results.limit);

	return (
		<div className="flex gap-6">
			{/* Facets Sidebar */}
			{results.facets && showFacets && (
				<motion.aside
					initial={{ width: 0, opacity: 0 }}
					animate={{ width: 240, opacity: 1 }}
					exit={{ width: 0, opacity: 0 }}
					className="flex-shrink-0 space-y-4"
				>
					<FacetSection
						title="Document Types"
						icon={<FileText className="w-4 h-4" />}
						items={results.facets.documentTypes}
						onItemClick={(value) => onFacetClick?.('documentType', value)}
					/>
					<FacetSection
						title="Tags"
						icon={<Tag className="w-4 h-4" />}
						items={results.facets.tags}
						onItemClick={(value) => onFacetClick?.('tag', value)}
					/>
					<FacetSection
						title="Owners"
						icon={<User className="w-4 h-4" />}
						items={results.facets.owners}
						onItemClick={(value) => onFacetClick?.('owner', value)}
					/>
				</motion.aside>
			)}

			{/* Results */}
			<div className="flex-1 space-y-4">
				{/* Results Header */}
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<p className="text-sm text-slate-400">
							<span className="text-slate-200 font-medium">{results.total}</span> results
							{results.query && (
								<>
									{' '}
									for "<span className="text-brass-400">{results.query}</span>"
								</>
							)}
						</p>
						<div className="flex items-center gap-1 text-xs text-slate-500">
							<Zap className="w-3 h-3" />
							{results.took}ms
						</div>
					</div>

					<div className="flex items-center gap-3">
						{/* Sort */}
						<div className="flex items-center gap-2">
							<span className="text-xs text-slate-500">Sort:</span>
							<div className="flex bg-slate-800/50 border border-slate-700/50 rounded-lg p-0.5">
								{(['relevance', 'date', 'title'] as const).map((s) => (
									<button
										key={s}
										onClick={() => handleSortChange(s)}
										className={cn(
											'px-2 py-1 text-xs rounded transition-colors flex items-center gap-1',
											sortBy === s
												? 'bg-slate-700 text-slate-200'
												: 'text-slate-400 hover:text-slate-200'
										)}
									>
										{s.charAt(0).toUpperCase() + s.slice(1)}
										{sortBy === s && (
											<ArrowUpDown
												className={cn('w-3 h-3', sortOrder === 'asc' && 'rotate-180')}
											/>
										)}
									</button>
								))}
							</div>
						</div>

						{/* View Toggle */}
						<div className="flex border border-slate-700/50 rounded-lg overflow-hidden">
							<button
								onClick={() => setViewMode('list')}
								className={cn(
									'p-1.5 transition-colors',
									viewMode === 'list'
										? 'bg-slate-700 text-slate-200'
										: 'text-slate-500 hover:text-slate-300'
								)}
							>
								<List className="w-4 h-4" />
							</button>
							<button
								onClick={() => setViewMode('grid')}
								className={cn(
									'p-1.5 transition-colors',
									viewMode === 'grid'
										? 'bg-slate-700 text-slate-200'
										: 'text-slate-500 hover:text-slate-300'
								)}
							>
								<Grid className="w-4 h-4" />
							</button>
						</div>

						{/* Facets Toggle */}
						{results.facets && (
							<button
								onClick={() => setShowFacets(!showFacets)}
								className={cn(
									'p-1.5 rounded-lg transition-colors',
									showFacets
										? 'bg-brass-500/10 text-brass-400'
										: 'text-slate-500 hover:text-slate-300'
								)}
							>
								<Tag className="w-4 h-4" />
							</button>
						)}
					</div>
				</div>

				{/* Results List */}
				{viewMode === 'list' ? (
					<div className="space-y-2">
						{results.items.map((result, idx) => (
							<ResultListItem
								key={result.id}
								result={result}
								index={idx}
								onClick={() => onResultClick(result)}
							/>
						))}
					</div>
				) : (
					<div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
						{results.items.map((result, idx) => (
							<ResultGridItem
								key={result.id}
								result={result}
								index={idx}
								onClick={() => onResultClick(result)}
							/>
						))}
					</div>
				)}

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex items-center justify-center gap-2 pt-4">
						<button
							onClick={() => onPageChange?.(results.page - 1)}
							disabled={results.page <= 1}
							className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Previous
						</button>
						<div className="flex gap-1">
							{Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								const page = results.page <= 3 ? i + 1 : results.page - 2 + i;
								if (page > totalPages) return null;
								return (
									<button
										key={page}
										onClick={() => onPageChange?.(page)}
										className={cn(
											'w-8 h-8 rounded-lg text-sm transition-colors',
											page === results.page
												? 'bg-brass-500 text-slate-900 font-medium'
												: 'text-slate-400 hover:bg-slate-700'
										)}
									>
										{page}
									</button>
								);
							})}
						</div>
						<button
							onClick={() => onPageChange?.(results.page + 1)}
							disabled={results.page >= totalPages}
							className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Next
						</button>
					</div>
				)}
			</div>
		</div>
	);
}

interface ResultListItemProps {
	result: SearchResult;
	index: number;
	onClick: () => void;
}

function ResultListItem({ result, index, onClick }: ResultListItemProps) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.05 }}
			onClick={onClick}
			className="glass-card p-4 cursor-pointer hover:border-slate-600 transition-colors group"
		>
			<div className="flex gap-4">
				{/* Thumbnail */}
				{result.thumbnailUrl ? (
					<img
						src={result.thumbnailUrl}
						alt=""
						className="w-16 h-20 object-cover rounded-lg bg-slate-800"
					/>
				) : (
					<div className="w-16 h-20 bg-slate-800 rounded-lg flex items-center justify-center">
						<FileText className="w-8 h-8 text-slate-600" />
					</div>
				)}

				{/* Content */}
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h3 className="font-medium text-slate-200 group-hover:text-brass-400 transition-colors">
								{result.title}
							</h3>
							<div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
								{result.folder && (
									<span className="flex items-center gap-1">
										<Folder className="w-3 h-3" />
										{result.folder.path}
									</span>
								)}
								<span className="flex items-center gap-1">
									<User className="w-3 h-3" />
									{result.owner.name}
								</span>
								<span className="flex items-center gap-1">
									<Calendar className="w-3 h-3" />
									{formatRelativeTime(result.updatedAt)}
								</span>
								{result.pageCount && <span>{result.pageCount} pages</span>}
								{result.fileSize && <span>{formatBytes(result.fileSize)}</span>}
							</div>
						</div>

						{/* Relevance Score */}
						<div className="flex-shrink-0">
							<div
								className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium"
								style={{
									background: `conic-gradient(#d4a753 ${result.score * 100}%, #334155 0)`,
								}}
							>
								<div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-brass-400">
									{Math.round(result.score * 100)}
								</div>
							</div>
						</div>
					</div>

					{/* Excerpt with highlights */}
					{result.excerpt && (
						<p
							className="mt-2 text-sm text-slate-400 line-clamp-2"
							dangerouslySetInnerHTML={{
								__html: result.highlights.length > 0 ? result.highlights[0] : result.excerpt,
							}}
						/>
					)}

					{/* Tags */}
					{result.tags.length > 0 && (
						<div className="flex flex-wrap gap-1 mt-2">
							{result.tags.slice(0, 4).map((tag) => (
								<span
									key={tag.id}
									className="px-2 py-0.5 text-2xs rounded-full border border-slate-700 text-slate-400"
									style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
								>
									{tag.name}
								</span>
							))}
							{result.tags.length > 4 && (
								<span className="text-2xs text-slate-500">+{result.tags.length - 4}</span>
							)}
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
					<div className="flex gap-1">
						<button className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg">
							<Eye className="w-4 h-4" />
						</button>
						<button className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg">
							<Download className="w-4 h-4" />
						</button>
						<button className="p-2 text-slate-500 hover:text-slate-300 hover:bg-slate-700 rounded-lg">
							<MoreVertical className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>
		</motion.div>
	);
}

interface ResultGridItemProps {
	result: SearchResult;
	index: number;
	onClick: () => void;
}

function ResultGridItem({ result, index, onClick }: ResultGridItemProps) {
	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			transition={{ delay: index * 0.05 }}
			onClick={onClick}
			className="glass-card p-3 cursor-pointer hover:border-slate-600 transition-colors group"
		>
			{/* Thumbnail */}
			<div className="aspect-[4/3] bg-slate-800 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
				{result.thumbnailUrl ? (
					<img src={result.thumbnailUrl} alt="" className="w-full h-full object-cover" />
				) : (
					<FileText className="w-12 h-12 text-slate-600" />
				)}
			</div>

			{/* Content */}
			<h3 className="font-medium text-sm text-slate-200 truncate group-hover:text-brass-400 transition-colors">
				{result.title}
			</h3>
			<div className="flex items-center gap-2 mt-1 text-2xs text-slate-500">
				<span>{formatRelativeTime(result.updatedAt)}</span>
				{result.pageCount && <span>• {result.pageCount}p</span>}
			</div>

			{/* Tags */}
			{result.tags.length > 0 && (
				<div className="flex gap-1 mt-2">
					{result.tags.slice(0, 2).map((tag) => (
						<span
							key={tag.id}
							className="px-1.5 py-0.5 text-2xs rounded border border-slate-700 text-slate-400"
							style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
						>
							{tag.name}
						</span>
					))}
				</div>
			)}

			{/* Score */}
			<div className="absolute top-2 right-2 px-1.5 py-0.5 bg-slate-900/80 rounded text-2xs text-brass-400 font-medium">
				{Math.round(result.score * 100)}%
			</div>
		</motion.div>
	);
}

interface FacetSectionProps {
	title: string;
	icon: React.ReactNode;
	items: Array<{ value: string; label?: string; count: number }>;
	onItemClick: (value: string) => void;
}

function FacetSection({ title, icon, items, onItemClick }: FacetSectionProps) {
	const [expanded, setExpanded] = useState(true);
	const displayItems = expanded ? items : items.slice(0, 5);

	if (items.length === 0) return null;

	return (
		<div className="glass-card p-3">
			<button
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center justify-between text-sm font-medium text-slate-300 mb-2"
			>
				<span className="flex items-center gap-2">
					<span className="text-slate-500">{icon}</span>
					{title}
				</span>
				{items.length > 5 && (
					<span className="text-slate-500">
						{expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
					</span>
				)}
			</button>
			<div className="space-y-1">
				{displayItems.map((item) => (
					<button
						key={item.value}
						onClick={() => onItemClick(item.value)}
						className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-700/50 transition-colors text-left"
					>
						<span className="text-sm text-slate-400 truncate">{item.label || item.value}</span>
						<span className="text-xs text-slate-500 ml-2">{item.count}</span>
					</button>
				))}
			</div>
		</div>
	);
}
