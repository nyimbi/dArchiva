// (c) Copyright Datacraft, 2026
/**
 * Side-by-side document comparison viewer.
 * Route: /compare?a=<docId>&b=<docId>
 *
 * Renders OCR text from both documents with line-level diff highlights.
 * Each panel has an independent document picker. Diff is exported as a
 * unified diff text file.
 */
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useDocumentSearch } from '@/features/documents/api';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { ViewerPage } from '@/types';
import { useQuery } from '@tanstack/react-query';
import {
	ArrowLeft,
	ArrowLeftRight,
	ChevronDown,
	Download,
	ExternalLink,
	FileText,
	Loader2,
	RefreshCw,
	Search,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentMeta {
	id: string;
	title: string;
	pageCount?: number;
	ctype: string;
	created_at?: string;
	updated_at?: string;
	file_size?: number;
	ocr_status?: string;
	tags?: Array<{ id: string; name: string }>;
	document_type?: { id: string; name: string };
}

interface DocumentForComparison {
	meta: DocumentMeta | undefined;
	pages: ViewerPage[];
	isLoadingMeta: boolean;
	isLoadingPages: boolean;
	isError: boolean;
}

type DiffLine = { text: string; type: 'common' | 'del' | 'add' };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, ms: number): T {
	const [debounced, setDebounced] = useState<T>(value);
	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), ms);
		return () => clearTimeout(timer);
	}, [value, ms]);
	return debounced;
}

/**
 * Line-level LCS diff. Capped at 500 lines each side for browser performance.
 * Returns a flat list of operations: 'del' exists only in A, 'add' only in B,
 * 'common' exists in both.
 */
function computeLineDiff(textA: string, textB: string): DiffLine[] {
	const linesA = textA.split('\n').filter((l) => l.trim().length > 0).slice(0, 500);
	const linesB = textB.split('\n').filter((l) => l.trim().length > 0).slice(0, 500);
	const m = linesA.length;
	const n = linesB.length;
	if (m === 0 && n === 0) return [];

	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			dp[i][j] =
				linesA[i - 1] === linesB[j - 1]
					? dp[i - 1][j - 1] + 1
					: Math.max(dp[i - 1][j], dp[i][j - 1]);
		}
	}

	const ops: DiffLine[] = [];
	let i = m;
	let j = n;
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && linesA[i - 1] === linesB[j - 1]) {
			ops.unshift({ text: linesA[i - 1], type: 'common' });
			i--;
			j--;
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			ops.unshift({ text: linesB[j - 1], type: 'add' });
			j--;
		} else {
			ops.unshift({ text: linesA[i - 1], type: 'del' });
			i--;
		}
	}
	return ops;
}

function exportDiff(titleA: string, titleB: string, diffLines: DiffLine[]) {
	const lines = [
		`--- ${titleA}`,
		`+++ ${titleB}`,
		'',
		...diffLines.map((l) => {
			if (l.type === 'del') return `- ${l.text}`;
			if (l.type === 'add') return `+ ${l.text}`;
			return `  ${l.text}`;
		}),
	];
	const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `diff-${Date.now()}.diff`;
	a.click();
	URL.revokeObjectURL(url);
}

function fmtMeta(val: unknown): string {
	if (val == null) return '—';
	if (typeof val === 'string') {
		const d = new Date(val);
		if (!isNaN(d.getTime()) && val.includes('T')) {
			return d.toLocaleString();
		}
		return val || '—';
	}
	if (typeof val === 'number') return val.toLocaleString();
	return String(val);
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
			const { data } = await apiClient.get<{ pages: ViewerPage[] }>(
				`/documents/${docId}/pages`,
			);
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
// Document picker
// ---------------------------------------------------------------------------

interface DocPickerProps {
	label: string;
	onSelect: (id: string) => void;
}

function DocPicker({ label, onSelect }: DocPickerProps) {
	const [open, setOpen] = useState(false);
	const [query, setQuery] = useState('');
	const debouncedQuery = useDebounce(query, 300);
	const { data: results = [], isLoading } = useDocumentSearch(debouncedQuery);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
					title={`Change document ${label}`}
				>
					<Search className="w-3 h-3" />
					Change
					<ChevronDown className="w-3 h-3" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-72 p-0 bg-slate-900 border-slate-700 shadow-xl"
				align="start"
			>
				<div className="p-2 border-b border-slate-700">
					<Input
						placeholder="Search documents…"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						className="h-8 bg-slate-800 border-slate-600 text-slate-200 placeholder-slate-500 text-sm"
						// biome-ignore lint: intentional autofocus in popover
						autoFocus
					/>
				</div>
				<div className="max-h-56 overflow-y-auto">
					{debouncedQuery.trim().length < 2 ? (
						<p className="px-3 py-4 text-xs text-slate-500 text-center">
							Type at least 2 characters to search
						</p>
					) : isLoading ? (
						<div className="flex items-center justify-center py-4">
							<Loader2 className="w-4 h-4 animate-spin text-slate-500" />
						</div>
					) : results.length === 0 ? (
						<p className="px-3 py-4 text-xs text-slate-500 text-center">
							No documents found
						</p>
					) : (
						results.map((doc) => (
							<button
								key={doc.id}
								onClick={() => {
									onSelect(doc.id);
									setOpen(false);
									setQuery('');
								}}
								className="w-full text-left px-3 py-2.5 hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0"
							>
								<div className="text-sm text-slate-200 font-medium truncate">
									{doc.title}
								</div>
								<div className="text-xs text-slate-500 font-mono mt-0.5">
									{doc.id.slice(0, 8)}…
								</div>
							</button>
						))
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}

// ---------------------------------------------------------------------------
// OCR text panel — renders one side of the diff
// ---------------------------------------------------------------------------

interface TextPanelProps {
	docId: string | null;
	label: 'A' | 'B';
	meta: DocumentMeta | undefined;
	isLoadingMeta: boolean;
	isLoadingPages: boolean;
	isError: boolean;
	/** Pre-filtered lines for this side: common + del (left) or common + add (right) */
	lines: DiffLine[];
	hasText: boolean;
	scrollRef: React.RefObject<HTMLDivElement>;
	onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
	onSelectDoc: (id: string) => void;
	onSwap?: () => void;
}

function TextPanel({
	docId,
	label,
	meta,
	isLoadingMeta,
	isLoadingPages,
	isError,
	lines,
	hasText,
	scrollRef,
	onScroll,
	onSelectDoc,
	onSwap,
}: TextPanelProps) {
	const isLoading = isLoadingMeta || isLoadingPages;
	const highlightType = label === 'A' ? 'del' : 'add';

	if (!docId) {
		return (
			<div className="flex-1 min-w-0 flex flex-col border-r border-slate-800 last:border-r-0">
				<div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900 min-h-[52px]">
					<div className="flex items-center gap-2 text-slate-500">
						<span className="text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
							{label}
						</span>
						<span className="text-sm">No document selected</span>
					</div>
					<DocPicker label={label} onSelect={onSelectDoc} />
				</div>
				<div className="flex-1 flex items-center justify-center text-slate-600 bg-slate-950">
					<div className="text-center">
						<FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
						<p className="text-sm">Select a document to compare</p>
						<p className="text-xs mt-1 text-slate-700">
							Use the "Change" button above or add{' '}
							<code className="px-1 bg-slate-800 rounded">
								?{label.toLowerCase()}=docId
							</code>{' '}
							to the URL
						</p>
					</div>
				</div>
			</div>
		);
	}

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
						<span
							className="text-sm text-slate-200 font-medium truncate"
							title={meta?.title}
						>
							{meta?.title ?? docId}
						</span>
					)}
				</div>

				<div className="flex items-center gap-1 flex-shrink-0">
					<DocPicker label={label} onSelect={onSelectDoc} />

					<Link
						to={`/documents/${docId}`}
						className="flex items-center gap-1 px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
						title="Open in detail view"
					>
						<ExternalLink className="w-3.5 h-3.5" />
						Open
					</Link>

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

			{/* Scrollable text area */}
			<div
				ref={scrollRef}
				onScroll={onScroll}
				className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed"
			>
				{isLoading && (
					<div className="flex items-center justify-center h-32 text-slate-500">
						<Loader2 className="w-5 h-5 animate-spin mr-2" />
						Loading…
					</div>
				)}

				{isError && !isLoading && (
					<div className="text-red-400 text-sm p-3 rounded bg-red-900/20 border border-red-800/30">
						Failed to load document.
					</div>
				)}

				{!isLoading && !isError && !hasText && (
					<div className="flex flex-col items-center justify-center h-32 text-slate-600 gap-2">
						<FileText className="w-8 h-8 opacity-40" />
						<p className="text-sm">No OCR text available for this document.</p>
					</div>
				)}

				{!isLoading && !isError && hasText && lines.length === 0 && (
					<div className="text-slate-500 text-sm text-center py-8">No text to display.</div>
				)}

				{!isLoading && !isError && hasText && lines.length > 0 && (
					<div className="space-y-0.5">
						{lines.map((line, idx) => (
							<div
								key={idx}
								className={cn(
									'px-2 py-0.5 rounded-sm whitespace-pre-wrap break-words',
									line.type === highlightType
										? label === 'A'
											? 'bg-red-900/30 text-red-300'
											: 'bg-emerald-900/30 text-emerald-300'
										: 'text-slate-300',
								)}
							>
								{line.text}
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Metadata comparison table
// ---------------------------------------------------------------------------

interface MetadataTableProps {
	metaA: DocumentMeta | undefined;
	metaB: DocumentMeta | undefined;
}

function MetadataTable({ metaA, metaB }: MetadataTableProps) {
	if (!metaA && !metaB) return null;

	const rows: { label: string; a: unknown; b: unknown }[] = [
		{ label: 'Title', a: metaA?.title, b: metaB?.title },
		{ label: 'Content type', a: metaA?.ctype, b: metaB?.ctype },
		{ label: 'Pages', a: metaA?.pageCount, b: metaB?.pageCount },
		{
			label: 'File size',
			a: metaA?.file_size != null ? `${(metaA.file_size / 1024).toFixed(1)} KB` : null,
			b: metaB?.file_size != null ? `${(metaB.file_size / 1024).toFixed(1)} KB` : null,
		},
		{ label: 'OCR status', a: metaA?.ocr_status, b: metaB?.ocr_status },
		{ label: 'Document type', a: metaA?.document_type?.name, b: metaB?.document_type?.name },
		{
			label: 'Tags',
			a: metaA?.tags?.map((t) => t.name).join(', ') || null,
			b: metaB?.tags?.map((t) => t.name).join(', ') || null,
		},
		{ label: 'Created', a: metaA?.created_at, b: metaB?.created_at },
		{ label: 'Updated', a: metaA?.updated_at, b: metaB?.updated_at },
	];

	return (
		<div className="border-t border-slate-800 bg-slate-900 shrink-0">
			<div className="px-5 py-3 text-sm font-medium text-slate-300">
				Metadata comparison
			</div>
			<div className="overflow-x-auto">
				<Table>
					<TableHeader>
						<TableRow className="border-slate-800 hover:bg-transparent">
							<TableHead className="text-slate-500 w-36 py-2">Field</TableHead>
							<TableHead className="text-slate-400 py-2">
								<span className="inline-flex items-center gap-1.5">
									<span className="text-xs font-mono font-bold px-1 py-0.5 rounded bg-slate-700 text-slate-300">
										A
									</span>
									{metaA?.title
										? metaA.title.length > 28
											? `${metaA.title.slice(0, 28)}…`
											: metaA.title
										: '—'}
								</span>
							</TableHead>
							<TableHead className="text-slate-400 py-2">
								<span className="inline-flex items-center gap-1.5">
									<span className="text-xs font-mono font-bold px-1 py-0.5 rounded bg-slate-700 text-slate-300">
										B
									</span>
									{metaB?.title
										? metaB.title.length > 28
											? `${metaB.title.slice(0, 28)}…`
											: metaB.title
										: '—'}
								</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => {
							const va = fmtMeta(row.a);
							const vb = fmtMeta(row.b);
							const differs = va !== vb && !(va === '—' && vb === '—');
							return (
								<TableRow
									key={row.label}
									className={cn(
										'border-slate-800',
										differs && 'bg-amber-900/10',
									)}
								>
									<TableCell className="text-slate-500 text-xs font-medium py-2">
										{row.label}
									</TableCell>
									<TableCell
										className={cn(
											'text-xs py-2',
											differs ? 'text-amber-300' : 'text-slate-400',
										)}
									>
										{va}
									</TableCell>
									<TableCell
										className={cn(
											'text-xs py-2',
											differs ? 'text-amber-300' : 'text-slate-400',
										)}
									>
										{vb}
									</TableCell>
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function DocumentComparison() {
	const [searchParams, setSearchParams] = useSearchParams();
	const navigate = useNavigate();

	const [docA, setDocA] = useState<string | null>(searchParams.get('a'));
	const [docB, setDocB] = useState<string | null>(searchParams.get('b'));

	// Sync URL params when docs change
	useEffect(() => {
		const params: Record<string, string> = {};
		if (docA) params.a = docA;
		if (docB) params.b = docB;
		setSearchParams(params, { replace: true });
	}, [docA, docB, setSearchParams]);

	// Scroll sync refs + guard
	const scrollRefA = useRef<HTMLDivElement>(null);
	const scrollRefB = useRef<HTMLDivElement>(null);
	const suppressScrollRef = useRef(false);

	// Sync toggle
	const [syncScroll, setSyncScroll] = useState(true);

	const handleScrollA = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			if (!syncScroll || suppressScrollRef.current) return;
			const el = e.currentTarget;
			suppressScrollRef.current = true;
			requestAnimationFrame(() => {
				if (scrollRefB.current) {
					const ratio =
						el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
					const target = scrollRefB.current;
					target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);
				}
				suppressScrollRef.current = false;
			});
		},
		[syncScroll],
	);

	const handleScrollB = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			if (!syncScroll || suppressScrollRef.current) return;
			const el = e.currentTarget;
			suppressScrollRef.current = true;
			requestAnimationFrame(() => {
				if (scrollRefA.current) {
					const ratio =
						el.scrollTop / Math.max(1, el.scrollHeight - el.clientHeight);
					const target = scrollRefA.current;
					target.scrollTop = ratio * (target.scrollHeight - target.clientHeight);
				}
				suppressScrollRef.current = false;
			});
		},
		[syncScroll],
	);

	const handleSwap = useCallback(() => {
		setDocA(docB);
		setDocB(docA);
	}, [docA, docB]);

	// Fetch both documents
	const docAData = useDocumentForComparison(docA);
	const docBData = useDocumentForComparison(docB);

	// Extract OCR text from pages
	const textA = useMemo(
		() => docAData.pages.map((p) => p.ocrText ?? '').join('\n'),
		[docAData.pages],
	);
	const textB = useMemo(
		() => docBData.pages.map((p) => p.ocrText ?? '').join('\n'),
		[docBData.pages],
	);

	// Compute diff (only when both texts are ready)
	const diffLines = useMemo(() => {
		if (!textA && !textB) return [];
		return computeLineDiff(textA, textB);
	}, [textA, textB]);

	// Split diff per side
	const leftLines = useMemo(
		() => diffLines.filter((l) => l.type !== 'add'),
		[diffLines],
	);
	const rightLines = useMemo(
		() => diffLines.filter((l) => l.type !== 'del'),
		[diffLines],
	);

	const hasTextA = textA.trim().length > 0;
	const hasTextB = textB.trim().length > 0;

	function handleExport() {
		exportDiff(
			docAData.meta?.title ?? docA ?? 'Document A',
			docBData.meta?.title ?? docB ?? 'Document B',
			diffLines,
		);
	}

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

				<div className="flex items-center gap-2">
					{/* Sync scroll toggle */}
					<button
						onClick={() => setSyncScroll((p) => !p)}
						className={cn(
							'flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors',
							syncScroll
								? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
								: 'border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600',
						)}
						title={syncScroll ? 'Sync scroll: on' : 'Sync scroll: off'}
					>
						<RefreshCw className="w-3.5 h-3.5" />
						Sync scroll
					</button>

					{/* Export diff */}
					<button
						onClick={handleExport}
						disabled={diffLines.length === 0}
						className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
						title="Export diff as text file"
					>
						<Download className="w-3.5 h-3.5" />
						Export Diff
					</button>
				</div>
			</div>

			{/* Legend */}
			<div className="flex items-center gap-4 px-5 py-1.5 bg-slate-900/60 border-b border-slate-800/60 text-xs text-slate-500 flex-shrink-0">
				<span className="flex items-center gap-1.5">
					<span className="w-3 h-3 rounded-sm bg-red-900/50 border border-red-700/40 inline-block" />
					Removed (only in A)
				</span>
				<span className="flex items-center gap-1.5">
					<span className="w-3 h-3 rounded-sm bg-emerald-900/50 border border-emerald-700/40 inline-block" />
					Added (only in B)
				</span>
				<span className="flex items-center gap-1.5">
					<span className="w-3 h-3 rounded-sm bg-slate-700/50 border border-slate-600/40 inline-block" />
					Unchanged
				</span>
				{diffLines.length > 0 && (
					<span className="ml-auto text-slate-600">
						{leftLines.filter((l) => l.type === 'del').length} deletions ·{' '}
						{rightLines.filter((l) => l.type === 'add').length} additions
					</span>
				)}
			</div>

			{/* Split panels */}
			<div className="flex-1 min-h-0 flex">
				<TextPanel
					docId={docA}
					label="A"
					meta={docAData.meta}
					isLoadingMeta={docAData.isLoadingMeta}
					isLoadingPages={docAData.isLoadingPages}
					isError={docAData.isError}
					lines={leftLines}
					hasText={hasTextA}
					scrollRef={scrollRefA}
					onScroll={handleScrollA}
					onSelectDoc={setDocA}
					onSwap={handleSwap}
				/>
				<TextPanel
					docId={docB}
					label="B"
					meta={docBData.meta}
					isLoadingMeta={docBData.isLoadingMeta}
					isLoadingPages={docBData.isLoadingPages}
					isError={docBData.isError}
					lines={rightLines}
					hasText={hasTextB}
					scrollRef={scrollRefB}
					onScroll={handleScrollB}
					onSelectDoc={setDocB}
				/>
			</div>

			{/* Metadata comparison */}
			<MetadataTable metaA={docAData.meta} metaB={docBData.meta} />
		</div>
	);
}
