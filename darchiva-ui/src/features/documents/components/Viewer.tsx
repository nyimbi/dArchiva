// (c) Copyright Datacraft, 2026
import { useStore } from '@/hooks/useStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { ViewerPage } from '@/types';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileText,
  LayoutList,
  Maximize,
  Minimize,
  Printer,
  RotateCcw,
  RotateCw,
  Share2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback,useEffect,useRef,useState } from 'react';
import { ShareLinkDialog } from './modals/ShareLinkDialog';
import { AnnotationLayer } from '@/features/annotations/AnnotationLayer';
import { AnnotationToolbar } from '@/features/annotations/AnnotationToolbar';
import type { AnnotationMode } from '@/features/annotations/AnnotationToolbar';
import { OcrConfidenceOverlay } from '@/features/documents/OcrConfidenceOverlay';
import { ThumbnailStrip } from './ThumbnailStrip';
import type { WheelEvent } from 'react';

interface ViewerProps {
	documentId?: string;
	pages?: ViewerPage[];
	isLoading?: boolean;
}

const API_BASE = '/api/v1';
const MIN_ZOOM = 50;
const MAX_ZOOM = 400;

function clampZoom(value: number): number {
	return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value)));
}

function pageImageUrl(documentId: string, pageNumber: number): string {
	return `${API_BASE}/documents/${documentId}/pages/${pageNumber}/image`;
}

function triggerDownload(url: string, filename?: string) {
	const a = document.createElement('a');
	a.href = url;
	if (filename) a.download = filename;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
}

function openPrint(documentId: string) {
	const win = window.open(`${API_BASE}/documents/${documentId}/download`, '_blank');
	win?.addEventListener('load', () => {
		try {
			win.print();
		} catch {
			// Some browsers block scripted printing for embedded PDF viewers.
		}
	});
}

export function Viewer({ documentId, pages = [], isLoading }: ViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewerAreaRef = useRef<HTMLDivElement>(null);
	const {
		currentPageIndex,
		setCurrentPageIndex,
		zoom,
		setZoom,
		rotation,
		rotateClockwise,
		rotateCounterClockwise,
		fitToWidth,
		setFitToWidth,
		viewerMode,
		setViewerMode,
	} = useStore();

	const [annotationMode, setAnnotationMode] = useState<AnnotationMode>('view');
	const [shareOpen, setShareOpen] = useState(false);
	const [showOcrOverlay, setShowOcrOverlay] = useState(false);
	const [ocrThreshold, setOcrThreshold] = useState(90);
	const [stripOpen, setStripOpen] = useState(false);
	const [fitHeight, setFitHeight] = useState(false);
	const [pageInput, setPageInput] = useState('1');
	const [imageLoaded, setImageLoaded] = useState(false);

	const currentPage = pages[currentPageIndex];
	const totalPages = pages.length;
	const currentPageNumber = currentPageIndex + 1;
	const currentImageUrl = documentId && currentPage
		? currentPage.imageUrl ?? pageImageUrl(documentId, currentPageNumber)
		: undefined;

	const setBoundedZoom = useCallback((nextZoom: number) => {
		setZoom(clampZoom(nextZoom));
		setFitToWidth(false);
		setFitHeight(false);
	}, [setZoom, setFitToWidth]);

	const goToPage = useCallback((pageNumber: number) => {
		if (totalPages === 0) return;
		const nextPage = Math.max(1, Math.min(totalPages, pageNumber));
		setCurrentPageIndex(nextPage - 1);
	}, [setCurrentPageIndex, totalPages]);

	// Persist zoom to localStorage per document
	useEffect(() => {
		if (!documentId) return;
		const stored = localStorage.getItem(`viewer_zoom_${documentId}`);
		if (stored) {
			const parsed = Number(stored);
			if (!Number.isNaN(parsed)) setZoom(clampZoom(parsed));
		}
	// Only run on mount / documentId change
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [documentId]);

	useEffect(() => {
		if (!documentId) return;
		localStorage.setItem(`viewer_zoom_${documentId}`, String(zoom));
	}, [zoom, documentId]);

	useEffect(() => {
		if (totalPages === 0) {
			setCurrentPageIndex(0);
			return;
		}
		if (currentPageIndex > totalPages - 1) {
			setCurrentPageIndex(totalPages - 1);
		}
	}, [currentPageIndex, setCurrentPageIndex, totalPages]);

	useEffect(() => {
		setPageInput(String(currentPageNumber));
	}, [currentPageNumber]);

	useEffect(() => {
		setImageLoaded(false);
	}, [currentImageUrl]);

	// Fit-width / fit-height helpers
	const handleFitWidth = useCallback(() => {
		if (!viewerAreaRef.current || !currentPage) return;
		const pageW = rotation % 180 === 0 ? currentPage.width : currentPage.height;
		const computed = ((viewerAreaRef.current.clientWidth - 48) / (pageW || 816)) * 100;
		setZoom(clampZoom(computed));
		setFitToWidth(true);
		setFitHeight(false);
	}, [currentPage, rotation, setFitToWidth, setZoom]);

	const handleFitPage = useCallback(() => {
		if (!viewerAreaRef.current || !currentPage) return;
		const containerW = viewerAreaRef.current.clientWidth - 48;
		const containerH = viewerAreaRef.current.clientHeight - 48;
		const pageW = rotation % 180 === 0 ? currentPage.width : currentPage.height;
		const pageH = rotation % 180 === 0 ? currentPage.height : currentPage.width;
		const widthZoom = (containerW / (pageW || 816)) * 100;
		const heightZoom = (containerH / (pageH || 1056)) * 100;
		setZoom(clampZoom(Math.min(widthZoom, heightZoom)));
		setFitToWidth(false);
		setFitHeight(true);
	}, [currentPage, rotation, setZoom, setFitToWidth]);

	const handleDownloadCurrentPage = useCallback(() => {
		if (!documentId || totalPages === 0) return;
		triggerDownload(
			`${pageImageUrl(documentId, currentPageNumber)}?download=1`,
			`page-${currentPageNumber}.png`,
		);
	}, [currentPageNumber, documentId, totalPages]);

	const handlePageInputCommit = useCallback(() => {
		const nextPage = Number(pageInput);
		if (!Number.isNaN(nextPage)) {
			goToPage(nextPage);
			return;
		}
		setPageInput(String(currentPageNumber));
	}, [currentPageNumber, goToPage, pageInput]);

	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		// Only handle when focused inside the viewer container or no input focused
		const active = document.activeElement;
		if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;

		switch (e.key) {
			case 'ArrowLeft':
				if (currentPageIndex > 0) {
					e.preventDefault();
					setCurrentPageIndex(currentPageIndex - 1);
				}
				break;
			case 'ArrowRight':
				if (currentPageIndex < totalPages - 1) {
					e.preventDefault();
					setCurrentPageIndex(currentPageIndex + 1);
				}
				break;
			case 'Home':
				e.preventDefault();
				setCurrentPageIndex(0);
				break;
			case 'End':
				e.preventDefault();
				setCurrentPageIndex(totalPages - 1);
				break;
			case '+':
			case '=':
				e.preventDefault();
				setBoundedZoom(zoom + 25);
				break;
			case '-':
				e.preventDefault();
				setBoundedZoom(zoom - 25);
				break;
			case 'r':
			case 'R':
				e.preventDefault();
				rotateClockwise();
				break;
			case '0':
				setZoom(100);
				setFitToWidth(false);
				setFitHeight(false);
				break;
		}
	}, [currentPageIndex, rotateClockwise, setBoundedZoom, setCurrentPageIndex, setFitToWidth, setZoom, totalPages, zoom]);

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleKeyDown]);

	const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
		if (!e.ctrlKey && !e.metaKey) return;
		e.preventDefault();
		setBoundedZoom(zoom + (e.deltaY < 0 ? 25 : -25));
	}, [setBoundedZoom, zoom]);

	if (!documentId) {
		return (
			<div className="h-full flex items-center justify-center text-slate-500">
				<div className="text-center">
					<FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
					<p>Select a document to view</p>
				</div>
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="h-full flex items-center justify-center">
				<div className="animate-spin w-8 h-8 border-2 border-brass-500 border-t-transparent rounded-full" />
			</div>
		);
	}

	return (
		<>
		<div className="h-full flex flex-col bg-slate-950">
			{/* Toolbar */}
			<div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900">
				{/* Left: page navigation + strip toggle */}
				<div className="flex items-center gap-1">
					{/* Thumbnail strip toggle */}
					{totalPages > 1 && (
						<Button
							type="button"
							variant="ghost"
							size="icon"
							onClick={() => setStripOpen((v) => !v)}
							className={cn(
								'h-8 w-8 mr-1',
								stripOpen ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
							)}
							title={stripOpen ? 'Hide page strip' : 'Show page strip'}
						>
							<LayoutList className="w-5 h-5" />
						</Button>
					)}
					<div className="w-px h-5 bg-slate-700 mx-0.5" />
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => goToPage(currentPageNumber - 1)}
						disabled={currentPageIndex === 0}
						className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
						title="Previous page (←)"
					>
						<ChevronLeft className="w-5 h-5" />
					</Button>
					<div className="flex items-center gap-1 text-sm text-slate-300">
						<Input
							type="number"
							min={totalPages > 0 ? 1 : 0}
							max={totalPages}
							value={pageInput}
							onChange={(e) => setPageInput(e.target.value)}
							onBlur={handlePageInputCommit}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									e.currentTarget.blur();
								}
							}}
							className="h-8 w-14 border-slate-700 bg-slate-950 px-2 text-center text-slate-100"
							aria-label="Page number"
						/>
						<span className="min-w-10 text-slate-500">/ {totalPages}</span>
					</div>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => goToPage(currentPageNumber + 1)}
						disabled={currentPageIndex === totalPages - 1}
						className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
						title="Next page (→)"
					>
						<ChevronRight className="w-5 h-5" />
					</Button>
				</div>

				{/* Center: zoom + fit + rotate controls */}
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => setBoundedZoom(zoom - 25)}
						disabled={zoom <= MIN_ZOOM}
						className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
						title="Zoom out (−)"
					>
						<ZoomOut className="w-5 h-5" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						onClick={() => setBoundedZoom(100)}
						className="h-8 min-w-[60px] px-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-100"
						title="Reset zoom"
					>
						{zoom}%
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => setBoundedZoom(zoom + 25)}
						disabled={zoom >= MAX_ZOOM}
						className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
						title="Zoom in (+)"
					>
						<ZoomIn className="w-5 h-5" />
					</Button>
					<div className="w-px h-5 bg-slate-700 mx-1" />
					<Button
						type="button"
						variant="ghost"
						onClick={handleFitWidth}
						className={cn(
							'h-8 px-2',
							fitToWidth ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
						)}
						title="Fit to width"
					>
						<Maximize className="w-4 h-4" />
						<span className="sr-only">Fit to width</span>
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={handleFitPage}
						className={cn(
							'h-8 w-8',
							fitHeight ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
						)}
						title="Fit to page"
					>
						<Minimize className="w-4 h-4" />
					</Button>
					<div className="w-px h-5 bg-slate-700 mx-1" />
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={rotateCounterClockwise}
						className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
						title="Rotate counter-clockwise"
					>
						<RotateCcw className="w-5 h-5" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={rotateClockwise}
						className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
						title="Rotate clockwise (R)"
					>
						<RotateCw className="w-5 h-5" />
					</Button>
					<div className="w-px h-5 bg-slate-700 mx-1" />
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={handleDownloadCurrentPage}
						disabled={totalPages === 0}
						className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
						title="Download current page"
					>
						<Download className="w-5 h-5" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => documentId && openPrint(documentId)}
						className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
						title="Print document"
					>
						<Printer className="w-5 h-5" />
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => setShareOpen(true)}
						className="h-8 w-8 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
						title="Share"
					>
						<Share2 className="w-5 h-5" />
					</Button>
					<div className="w-px h-5 bg-slate-700 mx-1" />
					{/* OCR Quality overlay toggle */}
					<Button
						type="button"
						variant="ghost"
						size="icon"
						onClick={() => setShowOcrOverlay(!showOcrOverlay)}
						className={cn(
							'h-8 w-8',
							showOcrOverlay
								? 'bg-amber-600/30 text-amber-400 hover:bg-amber-600/40'
								: 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
						)}
						title={showOcrOverlay ? 'Hide OCR quality overlay' : 'Show OCR quality overlay'}
					>
						{showOcrOverlay ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
					</Button>
					{/* Threshold slider — only visible when overlay is on */}
					{showOcrOverlay && (
						<div className="flex items-center gap-1.5 ml-1">
							<span className="text-xs text-slate-400 whitespace-nowrap">
								{ocrThreshold}%
							</span>
							<input
								type="range"
								min={0}
								max={100}
								value={ocrThreshold}
								onChange={(e) => setOcrThreshold(Number(e.target.value))}
								className="w-20 accent-amber-500 cursor-pointer"
								title="Confidence threshold — words below this value are highlighted"
							/>
						</div>
					)}
				</div>

				{/* Right: annotation toolbar */}
				{documentId && (
					<AnnotationToolbar mode={annotationMode} onModeChange={setAnnotationMode} />
				)}
			</div>

			{/* Body: optional ThumbnailStrip + viewer area */}
			<div className="flex-1 flex overflow-hidden">
				{/* Left thumbnail strip (collapsible) */}
				{stripOpen && documentId && totalPages > 1 && (
					<ThumbnailStrip
						documentId={documentId}
						pageCount={totalPages}
						currentPage={currentPageIndex + 1}
						onPageSelect={(page) => setCurrentPageIndex(page - 1)}
					/>
				)}

				{/* Main viewer area */}
				<div
					ref={viewerAreaRef}
					className="flex-1 overflow-auto p-4 flex justify-center"
					onWheel={handleWheel}
				>
					<div ref={containerRef}>
						{viewerMode === 'thumbnails' ? (
							<div className="grid grid-cols-4 gap-4">
								{pages.map((page, idx) => (
									<button
										key={page.id}
										onClick={() => {
											setCurrentPageIndex(idx);
											setViewerMode('single');
										}}
										className={cn(
											'relative rounded-lg overflow-hidden border-2 transition-colors',
											idx === currentPageIndex ? 'border-brass-500' : 'border-transparent hover:border-slate-600'
										)}
									>
										{page.thumbnailUrl ? (
											<img src={page.thumbnailUrl} alt={`Page ${idx + 1}`} className="w-full" />
										) : (
											<div className="w-full h-32 bg-slate-800 flex items-center justify-center">
												<FileText className="w-8 h-8 text-slate-600" />
											</div>
										)}
										<span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-slate-900/80 rounded text-xs text-slate-300">
											{idx + 1}
										</span>
									</button>
								))}
							</div>
						) : currentPage ? (
							<div
								className="relative transition-transform"
								style={{
									transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
									transformOrigin: 'top center',
								}}
							>
								{currentImageUrl ? (
									<>
									{!imageLoaded && (
										<Skeleton
											className="w-[600px] max-w-[75vw] rounded-lg bg-slate-800"
											style={{ aspectRatio: `${currentPage.width || 816} / ${currentPage.height || 1056}` }}
										/>
									)}
									<img
										src={currentImageUrl}
										alt={`Page ${currentPageNumber}`}
										onLoad={() => setImageLoaded(true)}
										className={cn('max-w-full shadow-xl', !imageLoaded && 'hidden')}
										style={fitToWidth ? { width: currentPage.width || 816 } : undefined}
									/>
									</>
								) : (
									<div className="w-[600px] h-[800px] bg-slate-800 flex items-center justify-center rounded-lg">
										<FileText className="w-16 h-16 text-slate-600" />
									</div>
								)}
								{documentId && (
									<AnnotationLayer
										documentId={documentId}
										pageNumber={currentPageIndex + 1}
										mode={annotationMode}
									/>
								)}
								{documentId && (
									<OcrConfidenceOverlay
										documentId={documentId}
										pageNumber={currentPageIndex + 1}
										show={showOcrOverlay}
										threshold={ocrThreshold}
									/>
								)}
							</div>
						) : (
							<div className="text-slate-500">No pages available</div>
						)}
					</div>
				</div>
			</div>
		</div>
		{documentId && (
			<ShareLinkDialog
				open={shareOpen}
				documentId={documentId}
				onClose={() => setShareOpen(false)}
			/>
		)}
		</>
	);
}
