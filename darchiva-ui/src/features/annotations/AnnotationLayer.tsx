// (c) Copyright Datacraft, 2026
import { cn } from '@/lib/utils';
import { Trash2, X } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import {
	Annotation,
	AnnotationType,
	useAnnotations,
	useCreateAnnotation,
	useDeleteAnnotation,
	useUpdateAnnotation,
} from './api';
import type { AnnotationMode } from './AnnotationToolbar';
import { MODE_CURSORS } from './AnnotationToolbar';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<AnnotationType, string> = {
	highlight: 'bg-yellow-400/40 border border-yellow-400/60',
	note:      'bg-blue-400/30 border border-blue-400/60',
	redaction: 'bg-slate-900/90 border border-slate-600',
};

const DEFAULT_COLORS: Record<AnnotationType, string> = {
	highlight: '#FFD700',
	note:      '#60A5FA',
	redaction: '#1E293B',
};

interface DragRect {
	startX: number;
	startY: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

interface AnnotationLayerProps {
	documentId: string;
	pageNumber: number;
	mode: AnnotationMode;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnotationLayer({ documentId, pageNumber, mode }: AnnotationLayerProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	// API hooks
	const { data: annotations = [] } = useAnnotations(documentId, pageNumber);
	const createAnnotation = useCreateAnnotation(documentId);
	const updateAnnotation = useUpdateAnnotation(documentId);
	const deleteAnnotation = useDeleteAnnotation(documentId);

	// Draw state
	const [dragging, setDragging] = useState(false);
	const [dragRect, setDragRect] = useState<DragRect | null>(null);

	// Popover state
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [editContent, setEditContent] = useState('');

	const selectedAnnotation = annotations.find((a) => a.id === selectedId) ?? null;

	// ------------------------------------------------------------------
	// Coordinate helpers — convert px position to 0-1 fraction
	// ------------------------------------------------------------------
	const toFraction = useCallback(
		(px: number, axis: 'x' | 'y'): number => {
			const el = containerRef.current;
			if (!el) return 0;
			const rect = el.getBoundingClientRect();
			const size = axis === 'x' ? rect.width : rect.height;
			return Math.max(0, Math.min(1, px / size));
		},
		[],
	);

	// ------------------------------------------------------------------
	// Mouse handlers for drawing
	// ------------------------------------------------------------------
	const handleMouseDown = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (mode === 'view') return;
			e.preventDefault();
			const el = containerRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const y = e.clientY - rect.top;
			setDragging(true);
			setDragRect({ startX: x, startY: y, x, y, width: 0, height: 0 });
			setSelectedId(null);
		},
		[mode],
	);

	const handleMouseMove = useCallback(
		(e: React.MouseEvent<HTMLDivElement>) => {
			if (!dragging || !dragRect) return;
			const el = containerRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			const curX = e.clientX - rect.left;
			const curY = e.clientY - rect.top;
			const x = Math.min(curX, dragRect.startX);
			const y = Math.min(curY, dragRect.startY);
			const width = Math.abs(curX - dragRect.startX);
			const height = Math.abs(curY - dragRect.startY);
			setDragRect((prev) => prev ? { ...prev, x, y, width, height } : null);
		},
		[dragging, dragRect],
	);

	const handleMouseUp = useCallback(async () => {
		if (!dragging || !dragRect || mode === 'view') {
			setDragging(false);
			setDragRect(null);
			return;
		}
		setDragging(false);

		const el = containerRef.current;
		if (!el) { setDragRect(null); return; }
		const { width: elW, height: elH } = el.getBoundingClientRect();

		const MIN_PX = 4;
		if (dragRect.width < MIN_PX || dragRect.height < MIN_PX) {
			setDragRect(null);
			return;
		}

		const x = dragRect.x / elW;
		const y = dragRect.y / elH;
		const w = dragRect.width / elW;
		const h = dragRect.height / elH;

		try {
			await createAnnotation.mutateAsync({
				pageNumber,
				annotationType: mode as AnnotationType,
				x: Math.max(0, Math.min(1, x)),
				y: Math.max(0, Math.min(1, y)),
				width: Math.max(0, Math.min(1 - x, w)),
				height: Math.max(0, Math.min(1 - y, h)),
				color: DEFAULT_COLORS[mode as AnnotationType],
			});
		} catch {
			// error toast handled upstream
		}
		setDragRect(null);
	}, [dragging, dragRect, mode, pageNumber, createAnnotation]);

	// ------------------------------------------------------------------
	// Annotation click — open popover
	// ------------------------------------------------------------------
	const handleAnnotationClick = useCallback(
		(e: React.MouseEvent, annotation: Annotation) => {
			e.stopPropagation();
			if (mode !== 'view') return;
			setSelectedId(annotation.id);
			setEditContent(annotation.content ?? '');
		},
		[mode],
	);

	const handleSaveNote = async () => {
		if (!selectedId) return;
		await updateAnnotation.mutateAsync({ annotationId: selectedId, content: editContent });
		setSelectedId(null);
	};

	const handleDelete = async (id: string) => {
		await deleteAnnotation.mutateAsync(id);
		setSelectedId(null);
	};

	// ------------------------------------------------------------------
	// Render
	// ------------------------------------------------------------------
	const cursorClass = MODE_CURSORS[mode];

	return (
		<div
			ref={containerRef}
			className={cn('absolute inset-0', cursorClass)}
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}
		>
			{/* Existing annotations */}
			{annotations.map((ann) => (
				<div
					key={ann.id}
					className={cn(
						'absolute transition-opacity',
						TYPE_STYLES[ann.annotationType as AnnotationType],
						mode === 'view' ? 'hover:opacity-80 cursor-pointer' : 'pointer-events-none',
						selectedId === ann.id && 'ring-2 ring-white/60',
					)}
					style={{
						left: `${ann.x * 100}%`,
						top: `${ann.y * 100}%`,
						width: `${ann.width * 100}%`,
						height: `${ann.height * 100}%`,
					}}
					onClick={(e) => handleAnnotationClick(e, ann)}
				/>
			))}

			{/* Ghost rect while drawing */}
			{dragging && dragRect && dragRect.width > 2 && dragRect.height > 2 && (
				<div
					className={cn(
						'absolute pointer-events-none border-2 border-dashed',
						mode === 'highlight' && 'bg-yellow-400/20 border-yellow-400',
						mode === 'note' && 'bg-blue-400/20 border-blue-400',
						mode === 'redaction' && 'bg-slate-900/50 border-slate-400',
					)}
					style={{
						left: dragRect.x,
						top: dragRect.y,
						width: dragRect.width,
						height: dragRect.height,
					}}
				/>
			)}

			{/* Popover for selected annotation */}
			{selectedAnnotation && (
				<div
					className="absolute z-50 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 min-w-[200px] max-w-[280px]"
					style={{
						left: `${selectedAnnotation.x * 100}%`,
						top: `calc(${selectedAnnotation.y * 100}% + ${selectedAnnotation.height * 100}% + 4px)`,
					}}
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex items-center justify-between mb-2">
						<span className="text-xs text-slate-400 capitalize">{selectedAnnotation.annotationType}</span>
						<button
							onClick={() => setSelectedId(null)}
							className="text-slate-500 hover:text-slate-300 transition-colors"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>

					{selectedAnnotation.annotationType === 'note' && (
						<div className="mb-2">
							<textarea
								value={editContent}
								onChange={(e) => setEditContent(e.target.value)}
								className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-brass-500"
								rows={3}
								placeholder="Add a note…"
							/>
							<button
								onClick={handleSaveNote}
								className="mt-1 px-2 py-1 bg-brass-600 hover:bg-brass-500 text-white text-xs rounded transition-colors w-full"
							>
								Save
							</button>
						</div>
					)}

					<button
						onClick={() => handleDelete(selectedAnnotation.id)}
						className="flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs transition-colors w-full"
					>
						<Trash2 className="w-3.5 h-3.5" />
						Delete annotation
					</button>
				</div>
			)}

			{/* Dismiss popover on outside click */}
			{selectedId && (
				<div
					className="fixed inset-0 z-40"
					onClick={() => setSelectedId(null)}
				/>
			)}
		</div>
	);
}
