// (c) Copyright Datacraft, 2026
import { useEffect, useRef, useState, useCallback } from 'react';
import {
	ZoomIn,
	ZoomOut,
	RotateCw,
	RotateCcw,
	Download,
	ChevronLeft,
	ChevronRight,
	Maximize,
	FileText,
} from 'lucide-react';
import { useStore } from '@/hooks/useStore';
import { cn } from '@/lib/utils';
import type { ViewerPage } from '@/types';

interface ViewerProps {
	documentId?: string;
	pages?: ViewerPage[];
	isLoading?: boolean;
}

export function Viewer({ documentId, pages = [], isLoading }: ViewerProps) {
	const containerRef = useRef<HTMLDivElement>(null);
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
		selectedPages,
		togglePageSelection,
	} = useStore();

	const currentPage = pages[currentPageIndex];
	const totalPages = pages.length;

	const handleKeyDown = useCallback((e: KeyboardEvent) => {
		switch (e.key) {
			case 'ArrowLeft':
			case 'ArrowUp':
				if (currentPageIndex > 0) setCurrentPageIndex(currentPageIndex - 1);
				break;
			case 'ArrowRight':
			case 'ArrowDown':
				if (currentPageIndex < totalPages - 1) setCurrentPageIndex(currentPageIndex + 1);
				break;
			case '+':
			case '=':
				zoomIn();
				break;
			case '-':
				zoomOut();
				break;
		}
	}, [currentPageIndex, totalPages, setCurrentPageIndex, zoomIn, zoomOut]);

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
		<div className="h-full flex flex-col bg-slate-950">
			{/* Toolbar */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-slate-800 bg-slate-900">
				<div className="flex items-center gap-2">
					<button
						onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
						disabled={currentPageIndex === 0}
						className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors hover:bg-slate-800"
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
					>
						<ChevronRight className="w-5 h-5" />
					</button>
				</div>

				<div className="flex items-center gap-1">
					<button
						onClick={zoomOut}
						className="p-1.5 text-slate-400 hover:text-slate-100 rounded transition-colors hover:bg-slate-800"
						title="Zoom out"
					>
						<ZoomOut className="w-5 h-5" />
					</button>
					<span className="text-sm text-slate-300 min-w-[50px] text-center">{zoom}%</span>
					<button
						onClick={zoomIn}
						className="p-1.5 text-slate-400 hover:text-slate-100 rounded transition-colors hover:bg-slate-800"
						title="Zoom in"
					>
						<ZoomIn className="w-5 h-5" />
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
						onClick={() => setFitToWidth(!fitToWidth)}
						className={cn('p-1.5 rounded transition-colors', fitToWidth ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800')}
						title="Fit to width"
					>
						<Maximize className="w-5 h-5" />
					</button>
					<button
						className="p-1.5 text-slate-400 hover:text-slate-100 rounded transition-colors hover:bg-slate-800"
						title="Download"
					>
						<Download className="w-5 h-5" />
					</button>
				</div>
			</div>

			{/* Viewer area */}
			<div ref={containerRef} className="flex-1 overflow-auto p-4 flex justify-center">
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
					</div>
				) : (
					<div className="text-slate-500">No pages available</div>
				)}
			</div>

			{/* Thumbnail strip */}
			{viewerMode === 'single' && totalPages > 1 && (
				<div className="h-20 border-t border-slate-800 bg-slate-900 flex items-center gap-2 px-4 overflow-x-auto">
					{pages.map((page, idx) => (
						<button
							key={page.id}
							onClick={() => setCurrentPageIndex(idx)}
							className={cn(
								'flex-shrink-0 w-12 h-16 rounded border-2 transition-colors overflow-hidden',
								idx === currentPageIndex ? 'border-brass-500' : 'border-transparent hover:border-slate-600'
							)}
						>
							{page.thumbnailUrl ? (
								<img src={page.thumbnailUrl} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
							) : (
								<div className="w-full h-full bg-slate-800 flex items-center justify-center text-xs text-slate-500">
									{idx + 1}
								</div>
							)}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
