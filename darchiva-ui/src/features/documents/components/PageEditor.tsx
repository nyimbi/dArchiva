// (c) Copyright Datacraft, 2026
// PageEditor — full-width panel for per-page rotate / delete / reorder.
// Props:
//   documentId  — UUID string of the document
//   pageCount   — current page count (1-based)
//   onClose     — called when the panel should close (Cancel or after Apply)
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	useRotatePage,
	useDeletePage,
	useReorderPages,
} from '../api/pageOps';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Rotation = 0 | 90 | 180 | 270;

interface PageState {
	/** original 1-based page number in the source document */
	originalPageNum: number;
	/** accumulated CW rotation that will be applied (0|90|180|270) */
	rotation: Rotation;
	/** if true this page will be deleted */
	deleted: boolean;
}

export interface PageEditorProps {
	documentId: string;
	pageCount: number;
	onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function thumbnailUrl(documentId: string, pageNum: number): string {
	// Prefer the standard thumbnail endpoint; falls back gracefully if unavailable
	return `/api/v1/documents/${documentId}/pages/${pageNum}/thumbnail`;
}

function mod360(n: number): Rotation {
	return ((n % 360) + 360) % 360 as Rotation;
}

function clsx(...classes: (string | false | undefined | null)[]): string {
	return classes.filter(Boolean).join(' ');
}

// ---------------------------------------------------------------------------
// Single page card
// ---------------------------------------------------------------------------

interface PageCardProps {
	page: PageState;
	index: number;            // position in the live (non-deleted) order
	total: number;            // total live pages
	onRotateCCW: () => void;
	onRotateCW: () => void;
	onDelete: () => void;
	onMoveUp: () => void;
	onMoveDown: () => void;
	isDragging: boolean;
	onDragStart: (e: React.DragEvent) => void;
	onDragOver: (e: React.DragEvent) => void;
	onDrop: (e: React.DragEvent) => void;
	onDragEnd: (e: React.DragEvent) => void;
	documentId: string;
	isModified: boolean;
}

function PageCard({
	page,
	index,
	total,
	onRotateCCW,
	onRotateCW,
	onDelete,
	onMoveUp,
	onMoveDown,
	isDragging,
	onDragStart,
	onDragOver,
	onDrop,
	onDragEnd,
	documentId,
	isModified,
}: PageCardProps) {
	const [imgError, setImgError] = useState(false);

	return (
		<div
			draggable
			onDragStart={onDragStart}
			onDragOver={onDragOver}
			onDrop={onDrop}
			onDragEnd={onDragEnd}
			className={clsx(
				'relative flex flex-col items-center rounded-lg border-2 p-2 cursor-grab select-none transition-all',
				isDragging ? 'opacity-40 border-blue-400' : 'border-gray-200 hover:border-blue-300',
				'bg-white shadow-sm',
			)}
			style={{ minWidth: 0 }}
		>
			{/* Modified badge */}
			{isModified && (
				<span className="absolute top-1 right-1 z-10 bg-amber-400 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
					edited
				</span>
			)}

			{/* Position label */}
			<div className="text-xs text-gray-400 mb-1">#{index + 1}</div>

			{/* Thumbnail */}
			<div
				className="relative flex items-center justify-center bg-gray-50 rounded overflow-hidden"
				style={{ width: 120, height: 160 }}
			>
				{imgError ? (
					<div className="flex flex-col items-center justify-center text-gray-400 text-xs gap-1">
						<svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
						<span>p.{page.originalPageNum}</span>
					</div>
				) : (
					<img
						src={thumbnailUrl(documentId, page.originalPageNum)}
						alt={`Page ${page.originalPageNum}`}
						className="object-contain max-w-full max-h-full"
						style={{ transform: `rotate(${page.rotation}deg)`, transition: 'transform 0.2s' }}
						onError={() => setImgError(true)}
					/>
				)}
			</div>

			{/* Action buttons */}
			<div className="flex items-center gap-1 mt-2">
				{/* Move up */}
				<button
					onClick={onMoveUp}
					disabled={index === 0}
					title="Move up"
					className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
					</svg>
				</button>

				{/* Rotate CCW */}
				<button
					onClick={onRotateCCW}
					title="Rotate 90° counter-clockwise"
					className="p-1 rounded hover:bg-gray-100 text-gray-600"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
							d="M10 19l-7-7m0 0l7-7m-7 7h18" />
					</svg>
				</button>

				{/* Rotate CW */}
				<button
					onClick={onRotateCW}
					title="Rotate 90° clockwise"
					className="p-1 rounded hover:bg-gray-100 text-gray-600"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
							d="M14 5l7 7m0 0l-7 7m7-7H3" />
					</svg>
				</button>

				{/* Delete */}
				<button
					onClick={onDelete}
					title="Delete page"
					className="p-1 rounded hover:bg-red-50 text-red-500 hover:text-red-700"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
				</button>

				{/* Move down */}
				<button
					onClick={onMoveDown}
					disabled={index === total - 1}
					title="Move down"
					className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
				>
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// PageEditor
// ---------------------------------------------------------------------------

export function PageEditor({ documentId, pageCount, onClose }: PageEditorProps) {
	// Build initial page state
	const initialPages = useMemo<PageState[]>(
		() =>
			Array.from({ length: pageCount }, (_, i) => ({
				originalPageNum: i + 1,
				rotation: 0,
				deleted: false,
			})),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[],
	);

	const [pages, setPages] = useState<PageState[]>(initialPages);
	const [dragSrcIdx, setDragSrcIdx] = useState<number | null>(null);
	const [applyStatus, setApplyStatus] = useState<'idle' | 'applying' | 'done' | 'error'>('idle');
	const [applyError, setApplyError] = useState<string | null>(null);
	const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });

	const rotateMut = useRotatePage();
	const deleteMut = useDeletePage();
	const reorderMut = useReorderPages();

	// Live (non-deleted) pages for display
	const livePages = useMemo(() => pages.filter(p => !p.deleted), [pages]);

	// Whether anything has changed from the original
	const hasChanges = useMemo(() => {
		const deletedAny = pages.some(p => p.deleted);
		const rotatedAny = pages.some(p => p.rotation !== 0);
		const reorderedAny = livePages.some((p, i) => p.originalPageNum !== i + 1);
		return deletedAny || rotatedAny || reorderedAny;
	}, [pages, livePages]);

	// Is a specific page modified?
	function isModified(p: PageState): boolean {
		return p.rotation !== 0;
	}

	// ---------------------------------------------------------------------------
	// Per-page mutations (on the display array, livePages index)
	// ---------------------------------------------------------------------------

	function rotateLivePage(liveIdx: number, delta: 90 | -90) {
		const target = livePages[liveIdx];
		setPages(prev =>
			prev.map(p =>
				p === target
					? { ...p, rotation: mod360(p.rotation + delta) }
					: p,
			),
		);
	}

	function deleteLivePage(liveIdx: number) {
		const target = livePages[liveIdx];
		if (livePages.length <= 1) {
			alert('Cannot delete the only remaining page.');
			return;
		}
		setPages(prev => prev.map(p => (p === target ? { ...p, deleted: true } : p)));
	}

	function moveLivePage(liveIdx: number, direction: -1 | 1) {
		const newLive = [...livePages];
		const swapIdx = liveIdx + direction;
		if (swapIdx < 0 || swapIdx >= newLive.length) return;
		[newLive[liveIdx], newLive[swapIdx]] = [newLive[swapIdx], newLive[liveIdx]];

		// Reconstruct pages: keep deleted pages in their original positions, splice in the reordered live pages
		const deletedPages = pages.filter(p => p.deleted);
		// Build a new full-order array: deleted pages keep their slot (based on originalPageNum order)
		// Simplest approach: replace live pages in order, keep deleted as-is
		setPages(() => {
			const result: PageState[] = [];
			let liveI = 0;
			for (const p of pages) {
				if (p.deleted) {
					result.push(p);
				} else {
					result.push(newLive[liveI++]);
				}
			}
			return result;
		});
	}

	// ---------------------------------------------------------------------------
	// Drag-and-drop reorder
	// ---------------------------------------------------------------------------

	function handleDragStart(liveIdx: number) {
		setDragSrcIdx(liveIdx);
	}

	function handleDragOver(e: React.DragEvent) {
		e.preventDefault();
	}

	function handleDrop(liveIdx: number, e: React.DragEvent) {
		e.preventDefault();
		if (dragSrcIdx === null || dragSrcIdx === liveIdx) return;

		const newLive = [...livePages];
		const [moved] = newLive.splice(dragSrcIdx, 1);
		newLive.splice(liveIdx, 0, moved);

		setPages(() => {
			const result: PageState[] = [];
			let liveI = 0;
			for (const p of pages) {
				if (p.deleted) {
					result.push(p);
				} else {
					result.push(newLive[liveI++]);
				}
			}
			return result;
		});
		setDragSrcIdx(null);
	}

	function handleDragEnd() {
		setDragSrcIdx(null);
	}

	// ---------------------------------------------------------------------------
	// Apply all changes
	// ---------------------------------------------------------------------------

	async function handleApply() {
		if (!hasChanges) return;

		setApplyStatus('applying');
		setApplyError(null);

		// Collect operations:
		// 1. Rotate pages (each rotation is a separate API call)
		// 2. Delete pages (each deletion adjusts page numbers, so we do them in reverse order)
		// 3. Reorder (single call if needed)

		try {
			// Step 1: Rotations — apply in originalPageNum order
			const rotations = pages.filter(p => !p.deleted && p.rotation !== 0);
			const deletions = pages
				.filter(p => p.deleted)
				.map(p => p.originalPageNum)
				.sort((a, b) => b - a); // descending so page numbers stay valid
			const finalOrder = livePages.map(p => p.originalPageNum);
			const defaultOrder = livePages.map((_, i) => i + 1);
			const needsReorder = finalOrder.some((n, i) => n !== defaultOrder[i]);

			const totalOps = rotations.length + deletions.length + (needsReorder ? 1 : 0);
			setProgress({ done: 0, total: totalOps });
			let done = 0;

			// Rotations
			for (const p of rotations) {
				await rotateMut.mutateAsync({
					documentId,
					pageNum: p.originalPageNum,
					degrees: p.rotation as 90 | 180 | 270,
				});
				done++;
				setProgress({ done, total: totalOps });
			}

			// Deletions (reverse order to keep page numbers stable)
			for (const pageNum of deletions) {
				await deleteMut.mutateAsync({ documentId, pageNum });
				done++;
				setProgress({ done, total: totalOps });
			}

			// Reorder
			if (needsReorder) {
				await reorderMut.mutateAsync({ documentId, pageOrder: finalOrder });
				done++;
				setProgress({ done, total: totalOps });
			}

			setApplyStatus('done');
			setTimeout(onClose, 800);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err);
			setApplyError(msg);
			setApplyStatus('error');
		}
	}

	// ---------------------------------------------------------------------------
	// Render
	// ---------------------------------------------------------------------------

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-white">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-3 border-b bg-gray-50 shrink-0">
				<div>
					<h2 className="text-lg font-semibold text-gray-800">Edit Pages</h2>
					<p className="text-xs text-gray-500 mt-0.5">
						Drag to reorder · Use arrows or drag handles · Rotate or delete per page
					</p>
				</div>
				<div className="flex items-center gap-3">
					{applyStatus === 'applying' && (
						<span className="text-sm text-blue-600">
							Applying {progress.done}/{progress.total}…
						</span>
					)}
					{applyStatus === 'done' && (
						<span className="text-sm text-green-600 font-medium">Done!</span>
					)}
					{applyStatus === 'error' && applyError && (
						<span className="text-sm text-red-600 max-w-xs truncate" title={applyError}>
							Error: {applyError}
						</span>
					)}
					<button
						onClick={onClose}
						disabled={applyStatus === 'applying'}
						className="px-4 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-100 disabled:opacity-50"
					>
						Cancel
					</button>
					<button
						onClick={handleApply}
						disabled={!hasChanges || applyStatus === 'applying' || applyStatus === 'done'}
						className="px-4 py-1.5 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{applyStatus === 'applying' ? 'Applying…' : 'Apply All Changes'}
					</button>
				</div>
			</div>

			{/* Deleted pages indicator */}
			{pages.some(p => p.deleted) && (
				<div className="px-6 py-2 bg-amber-50 border-b text-xs text-amber-700 flex items-center gap-2 shrink-0">
					<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
							d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
					</svg>
					{pages.filter(p => p.deleted).length} page(s) marked for deletion (shown below, greyed out).
					<button
						className="underline text-amber-800 hover:text-amber-900"
						onClick={() => setPages(prev => prev.map(p => ({ ...p, deleted: false })))}
					>
						Undo all deletions
					</button>
				</div>
			)}

			{/* Page grid */}
			<div className="flex-1 overflow-y-auto p-6">
				<div className="flex flex-wrap gap-4">
					{/* Live pages */}
					{livePages.map((page, liveIdx) => (
						<PageCard
							key={page.originalPageNum}
							page={page}
							index={liveIdx}
							total={livePages.length}
							documentId={documentId}
							isModified={isModified(page)}
							onRotateCCW={() => rotateLivePage(liveIdx, -90)}
							onRotateCW={() => rotateLivePage(liveIdx, 90)}
							onDelete={() => deleteLivePage(liveIdx)}
							onMoveUp={() => moveLivePage(liveIdx, -1)}
							onMoveDown={() => moveLivePage(liveIdx, 1)}
							isDragging={dragSrcIdx === liveIdx}
							onDragStart={() => handleDragStart(liveIdx)}
							onDragOver={handleDragOver}
							onDrop={e => handleDrop(liveIdx, e)}
							onDragEnd={handleDragEnd}
						/>
					))}

					{/* Deleted pages — shown greyed out with undo button */}
					{pages
						.filter(p => p.deleted)
						.map(page => (
							<div
								key={`deleted-${page.originalPageNum}`}
								className="flex flex-col items-center rounded-lg border-2 border-dashed border-red-200 p-2 opacity-50 bg-red-50"
								style={{ minWidth: 0 }}
							>
								<div className="text-xs text-red-400 mb-1 line-through">p.{page.originalPageNum}</div>
								<div
									className="flex items-center justify-center bg-red-50 rounded"
									style={{ width: 120, height: 160 }}
								>
									<span className="text-xs text-red-400">deleted</span>
								</div>
								<button
									className="mt-2 text-xs text-red-600 underline hover:text-red-800"
									onClick={() =>
										setPages(prev =>
											prev.map(p => (p === page ? { ...p, deleted: false } : p)),
										)
									}
								>
									Undo
								</button>
							</div>
						))}
				</div>
			</div>
		</div>
	);
}

export default PageEditor;
