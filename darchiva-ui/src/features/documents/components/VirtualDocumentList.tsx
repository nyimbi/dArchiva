// (c) Copyright Datacraft, 2026
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn, formatBytes, formatRelativeTime } from '@/lib/utils';
import { Check, ChevronUp, FileText, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { DocumentListItem } from '../api/infiniteDocuments';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface VirtualDocumentListProps {
	documents: DocumentListItem[];
	isLoading: boolean;
	hasNextPage?: boolean;
	isFetchingNextPage?: boolean;
	onFetchNextPage?: () => void;
	viewMode: 'list' | 'card';
	selectedIds?: Set<string>;
	onToggleSelect?: (id: string) => void;
	isSelectMode?: boolean;
}

// ---------------------------------------------------------------------------
// Row heights — virtualizer estimateSize
// ---------------------------------------------------------------------------
const ROW_HEIGHT_LIST = 80;
const ROW_HEIGHT_CARD = 220;

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function SkeletonRow({ isCard }: { isCard: boolean }) {
	if (isCard) {
		return (
			<div className="glass-card p-3 animate-pulse">
				<div className="aspect-[4/3] bg-slate-700/60 rounded-lg mb-3" />
				<div className="h-4 bg-slate-700/60 rounded w-3/4 mb-2" />
				<div className="h-3 bg-slate-700/40 rounded w-1/2" />
			</div>
		);
	}
	return (
		<div className="flex items-center gap-4 px-4 py-3 border-b border-slate-700/30 animate-pulse">
			<div className="w-5 h-5 rounded bg-slate-700/60 flex-shrink-0" />
			<div className="w-8 h-8 rounded bg-slate-700/60 flex-shrink-0" />
			<div className="flex-1 space-y-1.5">
				<div className="h-4 bg-slate-700/60 rounded w-1/2" />
				<div className="h-3 bg-slate-700/40 rounded w-1/3" />
			</div>
			<div className="h-3 bg-slate-700/40 rounded w-16" />
			<div className="h-3 bg-slate-700/40 rounded w-10" />
			<div className="h-3 bg-slate-700/40 rounded w-20" />
		</div>
	);
}

// ---------------------------------------------------------------------------
// Single card item
// ---------------------------------------------------------------------------
function VirtualCard({
	doc,
	isSelected,
	onToggleSelect,
	isSelectMode,
}: {
	doc: DocumentListItem;
	isSelected: boolean;
	onToggleSelect?: (id: string) => void;
	isSelectMode?: boolean;
}) {
	return (
		<div
			className={cn(
				'doc-card cursor-pointer group relative h-full',
				isSelected && 'border-brass-500 bg-brass-500/5',
			)}
			onClick={() => onToggleSelect?.(doc.id)}
		>
			{/* Selection checkbox */}
			<div
				className={cn(
					'absolute top-2 left-2 z-10 transition-opacity',
					isSelectMode || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
				)}
				onClick={(e) => { e.stopPropagation(); onToggleSelect?.(doc.id); }}
			>
				<div className={cn(
					'w-5 h-5 rounded border-2 flex items-center justify-center',
					isSelected
						? 'bg-brass-500 border-brass-500'
						: 'bg-slate-900/80 border-slate-500 hover:border-brass-400',
				)}>
					{isSelected && <Check className="w-3 h-3 text-slate-900" />}
				</div>
			</div>

			<div className="aspect-[4/3] bg-slate-800/50 rounded-lg mb-3 flex items-center justify-center">
				<FileText className="w-12 h-12 text-slate-600" />
				{doc.ocr_status === 'processing' && (
					<div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center rounded-lg">
						<div className="flex flex-col items-center gap-2">
							<div className="w-6 h-6 border-2 border-brass-500 border-t-transparent rounded-full animate-spin" />
							<span className="text-xs text-slate-400">Processing OCR</span>
						</div>
					</div>
				)}
			</div>
			<div>
				<h3 className="text-sm font-medium text-slate-200 truncate group-hover:text-brass-400 transition-colors">
					{doc.title}
				</h3>
				<div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
					<span>{doc.file_size ? formatBytes(doc.file_size) : '—'}</span>
					<span>•</span>
					<span>{doc.page_count || 0} pages</span>
				</div>
				<p className="mt-1 text-xs text-slate-600">{formatRelativeTime(doc.updated_at)}</p>
			</div>
			{doc.tags.length > 0 && (
				<div className="mt-2 flex flex-wrap gap-1">
					{doc.tags.slice(0, 2).map((tag) => (
						<span key={tag.id} className="badge badge-gray text-2xs">{tag.name}</span>
					))}
					{doc.tags.length > 2 && (
						<span className="text-2xs text-slate-500">+{doc.tags.length - 2}</span>
					)}
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Single list row item
// ---------------------------------------------------------------------------
function VirtualRow({
	doc,
	isSelected,
	onToggleSelect,
}: {
	doc: DocumentListItem;
	isSelected: boolean;
	onToggleSelect?: (id: string) => void;
}) {
	const statusLabel =
		doc.ocr_status === 'completed' ? 'ready' : doc.ocr_status || 'pending';

	return (
		<div
			className={cn(
				'flex items-center gap-4 px-4 py-3 border-b border-slate-700/30 cursor-pointer hover:bg-slate-800/40 transition-colors',
				isSelected && 'bg-brass-500/10',
			)}
			onClick={() => onToggleSelect?.(doc.id)}
		>
			{/* Checkbox */}
			<input
				type="checkbox"
				checked={isSelected}
				onChange={() => onToggleSelect?.(doc.id)}
				onClick={(e) => e.stopPropagation()}
				className="rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500/50 flex-shrink-0"
			/>

			{/* Icon */}
			<div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center flex-shrink-0">
				<FileText className="w-4 h-4 text-slate-500" />
			</div>

			{/* Name + tags */}
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-slate-200 truncate">{doc.title}</p>
				{doc.tags.length > 0 && (
					<div className="flex gap-1 mt-0.5">
						{doc.tags.slice(0, 2).map((tag) => (
							<span key={tag.id} className="badge badge-gray text-2xs">{tag.name}</span>
						))}
					</div>
				)}
			</div>

			{/* Size */}
			<span className="text-xs text-slate-400 w-16 text-right flex-shrink-0">
				{doc.file_size ? formatBytes(doc.file_size) : '—'}
			</span>

			{/* Pages */}
			<span className="text-xs text-slate-400 w-12 text-right flex-shrink-0">
				{doc.page_count || 0}p
			</span>

			{/* Modified */}
			<span className="text-xs text-slate-400 w-24 text-right flex-shrink-0">
				{formatRelativeTime(doc.updated_at)}
			</span>

			{/* Status badge */}
			<span className={cn(
				'badge flex-shrink-0',
				statusLabel === 'ready' ? 'badge-green'
					: statusLabel === 'processing' ? 'badge-brass'
					: 'badge-gray',
			)}>
				{statusLabel}
			</span>
		</div>
	);
}

// ---------------------------------------------------------------------------
// VirtualDocumentList
// ---------------------------------------------------------------------------
export function VirtualDocumentList({
	documents,
	isLoading,
	hasNextPage,
	isFetchingNextPage,
	onFetchNextPage,
	viewMode,
	selectedIds,
	onToggleSelect,
	isSelectMode,
}: VirtualDocumentListProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [showJumpTop, setShowJumpTop] = useState(false);

	const isCard = viewMode === 'card';
	// Card mode: 4 cards per row (approximation; actual row count derived below)
	const CARDS_PER_ROW = 4;

	// For card mode, virtualise rows of CARDS_PER_ROW items
	const virtualItems = isCard
		? Math.ceil(documents.length / CARDS_PER_ROW)
		: documents.length;

	const virtualizer = useVirtualizer({
		count: virtualItems,
		getScrollElement: () => containerRef.current,
		estimateSize: () => (isCard ? ROW_HEIGHT_CARD : ROW_HEIGHT_LIST),
		overscan: 5,
	});

	// Scroll handler: show/hide jump-to-top + infinite load trigger
	const handleScroll = useCallback(() => {
		const el = containerRef.current;
		if (!el) return;

		setShowJumpTop(el.scrollTop > 300);

		// Trigger next page when within 200px of bottom
		if (
			hasNextPage &&
			!isFetchingNextPage &&
			onFetchNextPage &&
			el.scrollHeight - el.scrollTop - el.clientHeight < 200
		) {
			onFetchNextPage();
		}
	}, [hasNextPage, isFetchingNextPage, onFetchNextPage]);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		el.addEventListener('scroll', handleScroll, { passive: true });
		return () => el.removeEventListener('scroll', handleScroll);
	}, [handleScroll]);

	const scrollToTop = useCallback(() => {
		containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
	}, []);

	// ---------------------------------------------------------------------------
	// Loading state — 5 skeleton rows
	// ---------------------------------------------------------------------------
	if (isLoading) {
		return (
			<div className={cn('flex-1 overflow-y-auto', isCard && 'p-2')}>
				{isCard ? (
					<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-2">
						{Array.from({ length: 5 }).map((_, i) => (
							<SkeletonRow key={i} isCard />
						))}
					</div>
				) : (
					<div className="glass-card overflow-hidden divide-y divide-slate-700/30">
						{Array.from({ length: 5 }).map((_, i) => (
							<SkeletonRow key={i} isCard={false} />
						))}
					</div>
				)}
			</div>
		);
	}

	// ---------------------------------------------------------------------------
	// Empty state
	// ---------------------------------------------------------------------------
	if (documents.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-slate-500">
				<FileText className="w-12 h-12 mb-4 opacity-40" />
				<p className="text-sm">No documents found</p>
			</div>
		);
	}

	// ---------------------------------------------------------------------------
	// Virtual list
	// ---------------------------------------------------------------------------
	return (
		<div className="relative flex-1 overflow-hidden">
			<div
				ref={containerRef}
				className="h-full overflow-y-auto"
			>
				{/* Virtualizer total height container */}
				<div
					style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}
				>
					{virtualizer.getVirtualItems().map((virtualRow) => {
						if (isCard) {
							// Card grid: each virtual row maps to CARDS_PER_ROW documents
							const startIdx = virtualRow.index * CARDS_PER_ROW;
							const rowDocs = documents.slice(startIdx, startIdx + CARDS_PER_ROW);

							return (
								<div
									key={virtualRow.key}
									data-index={virtualRow.index}
									ref={virtualizer.measureElement}
									style={{
										position: 'absolute',
										top: 0,
										left: 0,
										width: '100%',
										transform: `translateY(${virtualRow.start}px)`,
									}}
									className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-1 pb-4"
								>
									{rowDocs.map((doc) => (
										<VirtualCard
											key={doc.id}
											doc={doc}
											isSelected={selectedIds?.has(doc.id) ?? false}
											onToggleSelect={onToggleSelect}
											isSelectMode={isSelectMode}
										/>
									))}
								</div>
							);
						}

						const doc = documents[virtualRow.index];
						if (!doc) return null;

						return (
							<div
								key={virtualRow.key}
								data-index={virtualRow.index}
								ref={virtualizer.measureElement}
								style={{
									position: 'absolute',
									top: 0,
									left: 0,
									width: '100%',
									transform: `translateY(${virtualRow.start}px)`,
								}}
							>
								<VirtualRow
									doc={doc}
									isSelected={selectedIds?.has(doc.id) ?? false}
									onToggleSelect={onToggleSelect}
								/>
							</div>
						);
					})}
				</div>

				{/* Loading more indicator */}
				{isFetchingNextPage && (
					<div className="flex items-center justify-center gap-2 py-4 text-slate-400 text-sm">
						<Loader2 className="w-4 h-4 animate-spin" />
						Loading more...
					</div>
				)}

				{/* End of list indicator */}
				{!hasNextPage && documents.length > 0 && (
					<div className="text-center py-4 text-xs text-slate-600">
						{documents.length} document{documents.length !== 1 ? 's' : ''} total
					</div>
				)}
			</div>

			{/* Jump to top button */}
			{showJumpTop && (
				<button
					onClick={scrollToTop}
					className="fixed bottom-20 right-6 z-30 p-2.5 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-brass-400 shadow-lg transition-all"
					title="Jump to top"
				>
					<ChevronUp className="w-4 h-4" />
				</button>
			)}
		</div>
	);
}
