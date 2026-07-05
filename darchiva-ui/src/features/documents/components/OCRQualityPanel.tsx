// (c) Copyright Datacraft, 2026
/**
 * OCRQualityPanel
 *
 * Displays per-page OCR quality scores for a document and lets the user
 * queue a re-OCR run.  No chart library — bars use inline CSS widths.
 *
 * Props:
 *   documentId — string UUID of the document to inspect
 */

import React from 'react';
import { useOCRQuality, useReOCR } from '../api/ocrQuality';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function confidenceColor(score: number): string {
	if (score >= 0.8) return '#22c55e'; // green-500
	if (score >= 0.6) return '#f59e0b'; // amber-500
	return '#ef4444'; // red-500
}

function confidenceTextClass(score: number): string {
	if (score >= 0.8) return 'text-green-400';
	if (score >= 0.6) return 'text-amber-400';
	return 'text-red-400';
}

function confidenceLabel(score: number): string {
	if (score >= 0.8) return 'Good';
	if (score >= 0.6) return 'Fair';
	return 'Poor';
}

function pct(score: number): string {
	return `${Math.round(score * 100)}%`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface PageBarProps {
	pageNumber: number;
	wordCount: number;
	confidence: number;
	isLow: boolean;
	onJumpToPage?: (page: number) => void;
}

function PageBar({ pageNumber, wordCount, confidence, isLow, onJumpToPage }: PageBarProps) {
	const color = confidenceColor(confidence);
	const width = `${Math.round(confidence * 100)}%`;

	return (
		<div className="flex items-center gap-2 border-b border-slate-100 py-1">
			{/* Page number */}
			<span
				className={`min-w-[52px] text-xs ${
					isLow ? 'font-semibold text-red-400' : 'text-slate-500'
				}`}
			>
				pg {pageNumber}
			</span>

			{/* Bar track */}
			<div className="h-2.5 flex-1 overflow-hidden rounded-[5px] bg-slate-200">
				<div
					className="h-full rounded-[5px] transition-[width] duration-300 ease-in-out"
					style={{
						width,
						backgroundColor: color,
					}}
				/>
			</div>

			{/* Score */}
			<span className={`min-w-9 text-xs font-semibold ${confidenceTextClass(confidence)}`}>
				{pct(confidence)}
			</span>

			{/* Word count */}
			<span className="min-w-[52px] text-[11px] text-slate-400">
				{wordCount}w
			</span>

			{/* Jump link */}
			{onJumpToPage && (
				<button
					onClick={() => onJumpToPage(pageNumber)}
					className="cursor-pointer px-1 text-[11px] text-indigo-500 underline"
				>
					jump
				</button>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface OCRQualityPanelProps {
	documentId: string;
	/** Optional callback so "Jump to page" can navigate the viewer */
	onJumpToPage?: (page: number) => void;
}

export function OCRQualityPanel({ documentId, onJumpToPage }: OCRQualityPanelProps) {
	const { data, isLoading, isError } = useOCRQuality(documentId);
	const reOcr = useReOCR(documentId);

	// ---------------------------------------------------------------------------
	// Loading / error / empty states
	// ---------------------------------------------------------------------------

	if (isLoading) {
		return (
			<div className="p-4 text-sm text-slate-500">
				Loading OCR quality data…
			</div>
		);
	}

	if (isError) {
		return (
			<div className="p-4 text-sm text-red-400">
				Failed to load OCR quality data.
			</div>
		);
	}

	if (!data || data.page_count === 0) {
		return (
			<div className="p-4 text-sm text-slate-400">
				No OCR data available for this document yet.
				<br />
				<button
					onClick={() => reOcr.mutate()}
					disabled={reOcr.isPending}
					className="mt-2.5 rounded-md bg-indigo-500 px-3.5 py-1.5 text-[13px] text-white disabled:cursor-not-allowed disabled:opacity-70"
				>
					{reOcr.isPending ? 'Queuing…' : 'Run OCR'}
				</button>
			</div>
		);
	}

	const { overall_confidence, page_count, pages_with_text, page_scores, low_confidence_pages, ocr_status } = data;
	const isProcessing = ocr_status === 'RECEIVED' || ocr_status === 'STARTED';

	return (
		<div className="py-3 px-4">
			{/* ---------------------------------------------------------------- */}
			{/* Header: overall score + status badge                             */}
			{/* ---------------------------------------------------------------- */}
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-baseline gap-2">
					<span
						className={`text-[36px] font-bold leading-none ${confidenceTextClass(overall_confidence)}`}
					>
						{pct(overall_confidence)}
					</span>
					<span className={`text-sm font-semibold ${confidenceTextClass(overall_confidence)}`}>
						{confidenceLabel(overall_confidence)}
					</span>
				</div>

				{isProcessing && (
					<span
						className="rounded-[10px] bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800"
					>
						OCR in progress…
					</span>
				)}
			</div>

			{/* ---------------------------------------------------------------- */}
			{/* Summary stats                                                    */}
			{/* ---------------------------------------------------------------- */}
			<div className="mb-3.5 flex gap-4 text-xs text-slate-500">
				<span>{page_count} pages</span>
				<span>{pages_with_text} with text</span>
				{low_confidence_pages.length > 0 && (
					<span className="font-semibold text-red-400">
						{low_confidence_pages.length} low-confidence
					</span>
				)}
			</div>

			{/* ---------------------------------------------------------------- */}
			{/* Per-page bars                                                    */}
			{/* ---------------------------------------------------------------- */}
			<div className="mb-3.5">
				<div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-400">
					Per-page confidence
				</div>
				{page_scores.map((s) => (
					<PageBar
						key={s.page_number}
						pageNumber={s.page_number}
						wordCount={s.word_count}
						confidence={s.estimated_confidence}
						isLow={low_confidence_pages.includes(s.page_number)}
						onJumpToPage={onJumpToPage}
					/>
				))}
			</div>

			{/* ---------------------------------------------------------------- */}
			{/* Low-confidence page list (quick reference)                       */}
			{/* ---------------------------------------------------------------- */}
			{low_confidence_pages.length > 0 && (
				<div className="mb-3.5">
					<div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-red-400">
						Low-confidence pages
					</div>
					<div className="flex flex-wrap gap-1.5">
						{low_confidence_pages.map((pg) => (
							<button
								key={pg}
								onClick={() => onJumpToPage?.(pg)}
								className={`rounded-xl border border-red-200 bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700 ${
									onJumpToPage ? 'cursor-pointer' : 'cursor-default'
								}`}
							>
								pg {pg}
							</button>
						))}
					</div>
				</div>
			)}

			{/* ---------------------------------------------------------------- */}
			{/* Re-OCR button                                                    */}
			{/* ---------------------------------------------------------------- */}
			<div className="mt-2 flex items-center gap-2.5">
				<button
					onClick={() => reOcr.mutate()}
					disabled={reOcr.isPending || isProcessing}
					className="flex items-center gap-1.5 rounded-md bg-indigo-500 px-4 py-[7px] text-[13px] font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:bg-indigo-300"
				>
					{reOcr.isPending || isProcessing ? (
						<>
							<SpinnerIcon />
							{reOcr.isPending ? 'Queuing…' : 'Processing…'}
						</>
					) : (
						'Re-run OCR'
					)}
				</button>

				{reOcr.isSuccess && (
					<span className="text-xs font-semibold text-green-400">
						Queued successfully
					</span>
				)}
				{reOcr.isError && (
					<span className="text-xs text-red-400">
						Failed to queue re-OCR
					</span>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Inline spinner (no dependency)
// ---------------------------------------------------------------------------

function SpinnerIcon() {
	return (
		<svg
			width="14"
			height="14"
			viewBox="0 0 14 14"
			fill="none"
			className="animate-spin"
		>
			<circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.4)" strokeWidth="2" />
			<path
				d="M7 1.5A5.5 5.5 0 0 1 12.5 7"
				stroke="white"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export default OCRQualityPanel;
