// (c) Copyright Datacraft, 2026
/**
 * Side-by-side document comparison viewer.
 * Route: /compare?a=<docId>&b=<docId>
 *
 * Each panel has independent page state. When "Sync pages" is on both panels
 * track the same page number. Synchronized scrolling is achieved by mirroring
 * scroll events between the two panel scroll containers.
 */
import { Viewer } from '@/features/documents/components/Viewer';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { ViewerPage } from '@/types';
import { useQuery } from '@tanstack/react-query';
import {
	ArrowLeft,
	ArrowLeftRight,
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	FileText,
	Loader2,
	RefreshCw,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentMeta {
	id: string;
	title: string;
	pageCount?: number;
	ctype: string;
}

interface DocumentForComparison {
	meta: DocumentMeta | undefined;
	pages: ViewerPage[];
	isLoadingMeta: boolean;
	isLoadingPages: boolean;
	isError: boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDocumentForComparison(docId: string | null): DocumentForComparison {
	const { data: meta, isLoading: isLoadingMeta, isError } = useQuery({
		queryKey: ['document', docId],
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentMeta>(`/documents/${docId}`);
			return data;
		},
		enabled: !!docId,
	});

	const { data: pagesData, isLoading: isLoadingPages } = useQuery({
		queryKey: ['document-pages', docId],
		queryFn: async () => {
			const { data } = await apiClient.get<{ pages: ViewerPage[] }>(`/documents/${docId}/pages`);
			return data;
		},
		enabled: !!docId,
	});

	return {
		meta,
		pages: pagesData?.pages ?? [],
		isLoadingMeta,
		isLoadingPages,
		isError,
	};
}

// ---------------------------------------------------------------------------
// Panel — one side of the comparison
// ---------------------------------------------------------------------------

interface PanelProps {
	docId: string | null;
	label: 'A' | 'B';
	pageIndex: number;
	onPageChange: (index: number) => void;
	scrollRef: React.RefObject<HTMLDivElement>;
	onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
	/** The "other" docId for the swap button — only rendered on panel A */
	otherDocId?: string | null;
	onSwap?: () => void;
}

function ComparisonPanel({
	docId,
	label,
	pageIndex,
	onPageChange,
	scrollRef,
	onScroll,
	onSwap,
}: PanelProps) {
	const { meta, pages, isLoadingMeta, isLoadingPages } = useDocumentForComparison(docId);

	const totalPages = pages.length;
	const safeIndex = Math.min(pageIndex, Math.max(0, totalPages - 1));

	// Show only the current page to Viewer so its internal navigation is
	// effectively disabled (it sees 1 page). Navigation is handled here.
	const singlePage: ViewerPage[] = totalPages > 0 ? [pages[safeIndex]] : [];

	if (!docId) {
		return (
			<div className="flex-1 min-w-0 flex flex-col border-r border-slate-800 last:border-r-0">
				{/* Panel header placeholder */}
				<div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 min-h-[52px]">
					<div className="flex items-center gap-2 text-slate-500">
						<span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
							{label}
						</span>
						<span className="text-sm">No document selected</span>
					</div>
				</div>
				{/* Empty state */}
				<div className="flex-1 flex items-center justify-center text-slate-600 bg-slate-950">
					<div className="text-center">
						<FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
						<p className="text-sm">Select a document to compare</p>
						<p className="text-xs mt-1 text-slate-700">
							Add <code className="px-1 bg-slate-800 rounded">?{label.toLowerCase()}=docId</code> to the URL
						</p>
					</div>
				</div>
			</div>
		);
	}

	const isLoading = isLoadingMeta || isLoadingPages;

	return (
		<div className="flex-1 min-w-0 flex flex-col border-r border-slate-800 last:border-r-0">
			{/* Panel header */}
			<div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 min-h-[52px]">
				<div className="flex items-center gap-2 min-w-0">
					<span className="flex-shrink-0 text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
						{label}
					</span>
					{isLoadingMeta ? (
						<Loader2 className="w-4 h-4 animate-spin text-slate-500" />
					) : (
						<span className="text-sm text-slate-200 font-medium truncate" title={meta?.title}>
							{meta?.title ?? docId}
						</span>
					)}
				</div>

				<div className="flex items-center gap-1.5 flex-shrink-0">
					{/* Open in detail view */}
					<Link
						to={`/documents/${docId}`}
						className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
						title="Open in detail view"
					>
						<ExternalLink className="w-3.5 h-3.5" />
						Open
					</Link>

					{/* Swap button — only on panel A */}
					{onSwap && (
						<button
							onClick={onSwap}
							className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
							title="Swap documents"
						>
							<ArrowLeftRight className="w-3.5 h-3.5" />
							Swap
						</button>
					)}
				</div>
			</div>

			{/* Page navigation bar */}
			<div className="flex items-center justify-center gap-3 px-4 py-1.5 border-b border-slate-800/60 bg-slate-900/60">
				<button
					onClick={() => onPageChange(Math.max(0, safeIndex - 1))}
					disabled={safeIndex === 0 || totalPages === 0}
					className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors hover:bg-slate-800"
				>
					<ChevronLeft className="w-4 h-4" />
				</button>
				<span className="text-xs text-slate-400 min-w-[64px] text-center tabular-nums">
					{totalPages === 0 ? '—' : `${safeIndex + 1} / ${totalPages}`}
				</span>
				<button
					onClick={() => onPageChange(Math.min(totalPages - 1, safeIndex + 1))}
					disabled={safeIndex >= totalPages - 1 || totalPages === 0}
					className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded transition-colors hover:bg-slate-800"
				>
					<ChevronRight className="w-4 h-4" />
				</button>
			</div>

			{/* Scrollable viewer area */}
			<div
				ref={scrollRef}
				onScroll={onScroll}
				className="flex-1 overflow-auto"
			>
				<Viewer
					documentId={docId}
					pages={singlePage}
					isLoading={isLoading}
				/>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function DocumentComparison() {
	const [searchParams] = useSearchParams();
	const navigate = useNavigate();

	const initialA = searchParams.get('a');
	const initialB = searchParams.get('b');

	const [docA, setDocA] = useState<string | null>(initialA);
	const [docB, setDocB] = useState<string | null>(initialB);

	// Per-panel page indices
	const [pageA, setPageA] = useState(0);
	const [pageB, setPageB] = useState(0);

	// Sync toggle
	const [syncPages, setSyncPages] = useState(true);

	// Scroll sync refs
	const scrollRefA = useRef<HTMLDivElement>(null);
	const scrollRefB = useRef<HTMLDivElement>(null);
	// Guard to prevent infinite scroll loops
	const suppressScrollRef = useRef(false);

	// ---------------------------------------------------------------------------
	// Synchronized page navigation
	// ---------------------------------------------------------------------------

	const handlePageChangeA = useCallback((index: number) => {
		setPageA(index);
		if (syncPages) setPageB(index);
	}, [syncPages]);

	const handlePageChangeB = useCallback((index: number) => {
		setPageB(index);
		if (syncPages) setPageA(index);
	}, [syncPages]);

	// When sync is toggled on, align B to A
	const handleSyncToggle = () => {
		setSyncPages((prev) => {
			if (!prev) setPageB(pageA);
			return !prev;
		});
	};

	// ---------------------------------------------------------------------------
	// Synchronized scrolling
	// ---------------------------------------------------------------------------

	const handleScrollA = useCallback((e: React.UIEvent<HTMLDivElement>) => {
		if (suppressScrollRef.current) return;
		const el = e.currentTarget;
		suppressScrollRef.current = true;
		requestAnimationFrame(() => {
			if (scrollRefB.current) {
				const ratio = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
				const targetEl = scrollRefB.current;
				targetEl.scrollTop = ratio * (targetEl.scrollHeight - targetEl.clientHeight);
			}
			suppressScrollRef.current = false;
		});
	}, []);

	const handleScrollB = useCallback((e: React.UIEvent<HTMLDivElement>) => {
		if (suppressScrollRef.current) return;
		const el = e.currentTarget;
		suppressScrollRef.current = true;
		requestAnimationFrame(() => {
			if (scrollRefA.current) {
				const ratio = el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
				const targetEl = scrollRefA.current;
				targetEl.scrollTop = ratio * (targetEl.scrollHeight - targetEl.clientHeight);
			}
			suppressScrollRef.current = false;
		});
	}, []);

	// ---------------------------------------------------------------------------
	// Swap
	// ---------------------------------------------------------------------------

	const handleSwap = useCallback(() => {
		setDocA(docB);
		setDocB(docA);
		setPageA(pageB);
		setPageB(pageA);
	}, [docA, docB, pageA, pageB]);

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<div className="h-full flex flex-col bg-slate-950">
			{/* Top bar */}
			<div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900 flex-shrink-0">
				<div className="flex items-center gap-3">
					<button
						onClick={() => navigate(-1)}
						className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
						title="Go back"
					>
						<ArrowLeft className="w-4 h-4" />
					</button>
					<span className="text-sm font-medium text-slate-300">Document Comparison</span>
				</div>

				{/* Controls */}
				<div className="flex items-center gap-2">
					<button
						onClick={handleSyncToggle}
						className={cn(
							'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
							syncPages
								? 'bg-brass-500/20 border-brass-500/50 text-brass-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600',
						)}
						title={syncPages ? 'Sync pages: on — click to disable' : 'Sync pages: off — click to enable'}
					>
						<RefreshCw className="w-3.5 h-3.5" />
						Sync pages
					</button>
				</div>
			</div>

			{/* Split panels */}
			<div className="flex-1 min-h-0 flex">
				<ComparisonPanel
					docId={docA}
					label="A"
					pageIndex={pageA}
					onPageChange={handlePageChangeA}
					scrollRef={scrollRefA}
					onScroll={handleScrollA}
					onSwap={handleSwap}
				/>
				<ComparisonPanel
					docId={docB}
					label="B"
					pageIndex={pageB}
					onPageChange={handlePageChangeB}
					scrollRef={scrollRefB}
					onScroll={handleScrollB}
				/>
			</div>
		</div>
	);
}
