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
		<div
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: '8px',
				padding: '4px 0',
				borderBottom: '1px solid #f1f5f9',
			}}
		>
			{/* Page number */}
			<span
				style={{
					minWidth: '52px',
					fontSize: '12px',
					color: isLow ? '#ef4444' : '#64748b',
					fontWeight: isLow ? 600 : 400,
				}}
			>
				pg {pageNumber}
			</span>

			{/* Bar track */}
			<div
				style={{
					flex: 1,
					height: '10px',
					background: '#e2e8f0',
					borderRadius: '5px',
					overflow: 'hidden',
				}}
			>
				<div
					style={{
						width,
						height: '100%',
						background: color,
						borderRadius: '5px',
						transition: 'width 0.3s ease',
					}}
				/>
			</div>

			{/* Score */}
			<span style={{ minWidth: '36px', fontSize: '12px', color, fontWeight: 600 }}>
				{pct(confidence)}
			</span>

			{/* Word count */}
			<span style={{ minWidth: '52px', fontSize: '11px', color: '#94a3b8' }}>
				{wordCount}w
			</span>

			{/* Jump link */}
			{onJumpToPage && (
				<button
					onClick={() => onJumpToPage(pageNumber)}
					style={{
						fontSize: '11px',
						color: '#6366f1',
						background: 'none',
						border: 'none',
						cursor: 'pointer',
						padding: '0 4px',
						textDecoration: 'underline',
					}}
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
			<div style={{ padding: '16px', color: '#64748b', fontSize: '14px' }}>
				Loading OCR quality data…
			</div>
		);
	}

	if (isError) {
		return (
			<div style={{ padding: '16px', color: '#ef4444', fontSize: '14px' }}>
				Failed to load OCR quality data.
			</div>
		);
	}

	if (!data || data.page_count === 0) {
		return (
			<div style={{ padding: '16px', color: '#94a3b8', fontSize: '14px' }}>
				No OCR data available for this document yet.
				<br />
				<button
					onClick={() => reOcr.mutate()}
					disabled={reOcr.isPending}
					style={{
						marginTop: '10px',
						padding: '6px 14px',
						background: '#6366f1',
						color: '#fff',
						border: 'none',
						borderRadius: '6px',
						cursor: reOcr.isPending ? 'not-allowed' : 'pointer',
						fontSize: '13px',
						opacity: reOcr.isPending ? 0.7 : 1,
					}}
				>
					{reOcr.isPending ? 'Queuing…' : 'Run OCR'}
				</button>
			</div>
		);
	}

	const { overall_confidence, page_count, pages_with_text, page_scores, low_confidence_pages, ocr_status } = data;
	const isProcessing = ocr_status === 'RECEIVED' || ocr_status === 'STARTED';
	const overallColor = confidenceColor(overall_confidence);

	return (
		<div style={{ padding: '12px 16px', fontFamily: 'inherit' }}>
			{/* ---------------------------------------------------------------- */}
			{/* Header: overall score + status badge                             */}
			{/* ---------------------------------------------------------------- */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: '12px',
				}}
			>
				<div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
					<span
						style={{
							fontSize: '36px',
							fontWeight: 700,
							color: overallColor,
							lineHeight: 1,
						}}
					>
						{pct(overall_confidence)}
					</span>
					<span style={{ fontSize: '14px', color: overallColor, fontWeight: 600 }}>
						{confidenceLabel(overall_confidence)}
					</span>
				</div>

				{isProcessing && (
					<span
						style={{
							fontSize: '12px',
							padding: '2px 8px',
							background: '#fef3c7',
							color: '#92400e',
							borderRadius: '10px',
							fontWeight: 600,
						}}
					>
						OCR in progress…
					</span>
				)}
			</div>

			{/* ---------------------------------------------------------------- */}
			{/* Summary stats                                                    */}
			{/* ---------------------------------------------------------------- */}
			<div
				style={{
					display: 'flex',
					gap: '16px',
					marginBottom: '14px',
					fontSize: '12px',
					color: '#64748b',
				}}
			>
				<span>{page_count} pages</span>
				<span>{pages_with_text} with text</span>
				{low_confidence_pages.length > 0 && (
					<span style={{ color: '#ef4444', fontWeight: 600 }}>
						{low_confidence_pages.length} low-confidence
					</span>
				)}
			</div>

			{/* ---------------------------------------------------------------- */}
			{/* Per-page bars                                                    */}
			{/* ---------------------------------------------------------------- */}
			<div style={{ marginBottom: '14px' }}>
				<div
					style={{
						fontSize: '11px',
						fontWeight: 600,
						color: '#94a3b8',
						textTransform: 'uppercase',
						letterSpacing: '0.06em',
						marginBottom: '6px',
					}}
				>
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
				<div style={{ marginBottom: '14px' }}>
					<div
						style={{
							fontSize: '11px',
							fontWeight: 600,
							color: '#ef4444',
							textTransform: 'uppercase',
							letterSpacing: '0.06em',
							marginBottom: '6px',
						}}
					>
						Low-confidence pages
					</div>
					<div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
						{low_confidence_pages.map((pg) => (
							<button
								key={pg}
								onClick={() => onJumpToPage?.(pg)}
								style={{
									padding: '2px 10px',
									background: '#fee2e2',
									color: '#b91c1c',
									border: '1px solid #fecaca',
									borderRadius: '12px',
									cursor: onJumpToPage ? 'pointer' : 'default',
									fontSize: '12px',
									fontWeight: 600,
								}}
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
			<div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
				<button
					onClick={() => reOcr.mutate()}
					disabled={reOcr.isPending || isProcessing}
					style={{
						padding: '7px 16px',
						background: reOcr.isPending || isProcessing ? '#a5b4fc' : '#6366f1',
						color: '#fff',
						border: 'none',
						borderRadius: '6px',
						cursor: reOcr.isPending || isProcessing ? 'not-allowed' : 'pointer',
						fontSize: '13px',
						fontWeight: 600,
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
						transition: 'background 0.2s',
					}}
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
					<span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 600 }}>
						Queued successfully
					</span>
				)}
				{reOcr.isError && (
					<span style={{ fontSize: '12px', color: '#ef4444' }}>
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
			style={{ animation: 'spin 1s linear infinite' }}
		>
			<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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
