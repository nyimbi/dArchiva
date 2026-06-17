// (c) Copyright Datacraft, 2026
import { useStore } from '@/hooks/useStore';
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

interface ViewerProps {
	documentId?: string;
	pages?: ViewerPage[];
	isLoading?: boolean;
}

export function Viewer({ documentId, pages = [], isLoading }: ViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const viewerAreaRef = useRef<HTMLDivElement>(null);
	const {
		currentPageIndex,
		setCurrentPageIndex,
		zoom,
		setZoom,
		zoomIn,
		zoomOut,
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

	const currentPage = pages[currentPageIndex];
	const totalPages = pages.length;

	// Persist zoom to localStorage per document
	useEffect(() => {
		if (!documentId) return;
		const stored = localStorage.getItem(`viewer_zoom_${documentId}`);
		if (stored) {
			const parsed = Number(stored);
			if (!Number.isNaN(parsed)) setZoom(parsed);
		}
	// Only run on mount / documentId change
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [documentId]);

	useEffect(() => {
		if (!documentId) return;
		localStorage.setItem(`viewer_zoom_${documentId}`, String(zoom));
	}, [zoom, documentId]);

	// Fit-width / fit-height helpers
	const handleFitWidth = useCallback(() => {
		setFitToWidth(true);
		setFitHeight(false);
	}, [setFitToWidth]);

	const handleFitHeight = useCallback(() => {
		if (!viewerAreaRef.current || !currentPage) return;
		const containerH = viewerAreaRef.current.clientHeight - 32; // 32px padding
		const pageH = currentPage.height || 1056; // fallback A4 height
		const computed = Math.round((containerH / pageH) * 100);
		setZoom(Math.max(25, Math.min(400, computed)));
		setFitToWidth(false);
		setFitHeight(true);
	}, [currentPage, setZoom, setFitToWidth]);

	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		// Only handle when focused inside the viewer container or no input focused
		const active = document.activeElement;
		if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

		switch (e.key) {
			case 'ArrowLeft':
			case 'ArrowUp':
			case 'PageUp':
				if (currentPageIndex > 0) {
					e.preventDefault();
					setCurrentPageIndex(currentPageIndex - 1);
				}
				break;
			case 'ArrowRight':
			case 'ArrowDown':
			case 'PageDown':
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
				zoomIn();
				break;
			case '-':
				zoomOut();
				break;
			case '0':
				setZoom(100);
				setFitToWidth(false);
				setFitHeight(false);
				break;
		}
	}, [currentPageIndex, totalPages, setCurrentPageIndex, zoomIn, zoomOut, setZoom, setFitToWidth]);

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleKeyDown]);

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
			<div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900">
				{/* Left: page navigation + strip toggle */}
				<div className="flex items-center gap-1">
					{/* Thumbnail strip toggle */}
					{totalPages > 1 && (
						<button
							onClick={() => setStripOpen((v) => !v)}
							className={cn(
								'p-1.5 rounded transition-colors mr-1',
								stripOpen ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
							)}
							title={stripOpen ? 'Hide page strip' : 'Show page strip'}
						>
							<LayoutList className="w-5 h-5" />
						</button>
					)}
					<div className="w-px h-5 bg-slate-700 mx-0.5" />
					<button
						onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
						disabled={currentPageIndex === 0}
						className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors hover:bg-slate-800"
						title="Previous page (←)"
					>
						<ChevronLeft className="w-5 h-5" />
					</button>
					<span className="text-sm text-slate-300 min-w-[80px] text-center">
						{currentPageIndex + 1} / {totalPages}
					</span>
					<button
						onClick={() => setCurrentPageIndex(Math.min(totalPages - 1, currentPageIndex + 1))}
						disabled={currentPageIndex === totalPages - 1}
						className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors hover:bg-slate-800"
						title="Next page (→)"
					>
						<ChevronRight className="w-5 h-5" />
					</button>
				</div>

				{/* Center: zoom + fit + rotate controls */}
				<div className="flex items-center gap-1">
					<button
						onClick={zoomOut}
						className="p-1.5 text-slate-400 hover:text-slate-100 rounded transition-colors hover:bg-slate-800"
						title="Zoom out (−)"
					>
						<ZoomOut className="w-5 h-5" />
					</button>
					<button
						onClick={() => { setZoom(100); setFitToWidth(false); setFitHeight(false); }}
						className="text-sm text-slate-300 min-w-[52px] text-center px-1 py-0.5 rounded hover:bg-slate-800 transition-colors"
						title="Reset zoom (0)"
					>
						{zoom}%
					</button>
					<button
						onClick={zoomIn}
						className="p-1.5 text-slate-400 hover:text-slate-100 rounded transition-colors hover:bg-slate-800"
						title="Zoom in (+)"
					>
						<ZoomIn className="w-5 h-5" />
					</button>
					<div className="w-px h-5 bg-slate-700 mx-1" />
					<button
						onClick={handleFitWidth}
						className={cn(
							'p-1.5 rounded transition-colors text-xs font-medium px-2',
							fitToWidth ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
						)}
						title="Fit width"
					>
						<Maximize className="w-4 h-4" />
					</button>
					<button
						onClick={handleFitHeight}
						className={cn(
							'p-1.5 rounded transition-colors',
							fitHeight ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
						)}
						title="Fit height"
					>
						<Minimize className="w-4 h-4" />
					</button>
					<div className="w-px h-5 bg-slate-700 mx-1" />
					<button
						onClick={rotateCounterClockwise}
						className="p-1.5 text-slate-400 hover:text-slate-100 rounded transition-colors hover:bg-slate-800"
						title="Rotate counter-clockwise"
					>
						<RotateCcw className="w-5 h-5" />
					</button>
					<button
						onClick={rotateClockwise}
						className="p-1.5 text-slate-400 hover:text-slate-100 rounded transition-colors hover:bg-slate-800"
						title="Rotate clockwise"
					>
						<RotateCw className="w-5 h-5" />
					</button>
					<div className="w-px h-5 bg-slate-700 mx-1" />
					<button
						className="p-1.5 text-slate-400 hover:text-slate-100 rounded transition-colors hover:bg-slate-800"
						title="Download"
					>
						<Download className="w-5 h-5" />
					</button>
					<button
						onClick={() => setShareOpen(true)}
						className="p-1.5 text-slate-400 hover:text-slate-100 rounded transition-colors hover:bg-slate-800"
						title="Share"
					>
						<Share2 className="w-5 h-5" />
					</button>
					<div className="w-px h-5 bg-slate-700 mx-1" />
					{/* OCR Quality overlay toggle */}
					<button
						onClick={() => setShowOcrOverlay(!showOcrOverlay)}
						className={cn(
							'p-1.5 rounded transition-colors',
							showOcrOverlay
								? 'bg-amber-600/30 text-amber-400 hover:bg-amber-600/40'
								: 'text-slate-400 hover:text-slate-100 hover:bg-slate-800',
						)}
						title={showOcrOverlay ? 'Hide OCR quality overlay' : 'Show OCR quality overlay'}
					>
						{showOcrOverlay ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
					</button>
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
				<div ref={viewerAreaRef} className="flex-1 overflow-auto p-4 flex justify-center">
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
								{currentPage.imageUrl ? (
									<img
										src={currentPage.imageUrl}
										alt={`Page ${currentPageIndex + 1}`}
										className="max-w-full shadow-xl"
										style={fitToWidth ? { width: '100%' } : undefined}
									/>
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
