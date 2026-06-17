// (c) Copyright Datacraft, 2026
/**
 * BulkExportDialog — modal that drives the ZIP export flow:
 *
 *  1. User picks options (include metadata CSV, include original files)
 *  2. Clicks Export → POST /api/v1/nodes/bulk-export
 *  3. Dialog shows a progress bar polling every 2 s
 *  4. On complete: "Download ZIP" button linking to the presigned URL
 *  5. On failure: error message shown
 *
 * Usage:
 *   <BulkExportDialog
 *     open={open}
 *     onOpenChange={setOpen}
 *     selectedIds={selectedDocumentIds}
 *   />
 */
import React, { useEffect, useState } from 'react';
import {
	useBulkExport,
	useBulkExportStatus,
	type BulkExportJobStatus,
} from '../api/export';

// ---------------------------------------------------------------------------
// Minimal headless primitives — replace with your design-system equivalents
// ---------------------------------------------------------------------------

interface DialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	children: React.ReactNode;
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
	if (!open) return null;
	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center"
			role="dialog"
			aria-modal="true"
		>
			{/* Backdrop */}
			<div
				className="absolute inset-0 bg-black/50"
				onClick={() => onOpenChange(false)}
			/>
			{/* Panel */}
			<div className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
				{children}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Progress bar
// ---------------------------------------------------------------------------

function ProgressBar({ value }: { value: number }) {
	const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
	return (
		<div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
			<div
				className="h-full rounded-full bg-blue-500 transition-all duration-300"
				style={{ width: `${pct}%` }}
			/>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Status label helper
// ---------------------------------------------------------------------------

function statusLabel(status: BulkExportJobStatus): string {
	switch (status) {
		case 'queued':     return 'Waiting in queue…';
		case 'processing': return 'Building ZIP…';
		case 'complete':   return 'Export ready';
		case 'failed':     return 'Export failed';
	}
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export interface BulkExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	/** UUIDs of the documents to export */
	selectedIds: string[];
}

export function BulkExportDialog({
	open,
	onOpenChange,
	selectedIds,
}: BulkExportDialogProps) {
	const [includeMetadata, setIncludeMetadata] = useState(true);
	const [includeOriginal, setIncludeOriginal] = useState(true);
	const [jobId, setJobId] = useState<string | null>(null);

	const startExport = useBulkExport();
	const jobStatus = useBulkExportStatus(jobId);

	// Reset local state whenever the dialog opens fresh
	useEffect(() => {
		if (open) {
			setJobId(null);
			startExport.reset();
		}
	}, [open]); // eslint-disable-line react-hooks/exhaustive-deps

	const isRunning =
		jobStatus.data?.status === 'queued' ||
		jobStatus.data?.status === 'processing';

	const isComplete = jobStatus.data?.status === 'complete';
	const isFailed   = jobStatus.data?.status === 'failed';

	function handleExport() {
		startExport.mutate(
			{
				document_ids: selectedIds,
				include_metadata: includeMetadata,
				include_original: includeOriginal,
			},
			{
				onSuccess: (data) => setJobId(data.job_id),
			},
		);
	}

	function handleClose() {
		if (isRunning) return; // block close while running
		onOpenChange(false);
	}

	const progress = jobStatus.data?.progress ?? 0;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			{/* Header */}
			<div className="mb-4 flex items-start justify-between gap-4">
				<div>
					<h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
						Export documents as ZIP
					</h2>
					<p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
						{selectedIds.length} document{selectedIds.length !== 1 ? 's' : ''} selected
					</p>
				</div>
				<button
					onClick={handleClose}
					disabled={isRunning}
					className="rounded p-1 text-zinc-400 hover:text-zinc-600 disabled:opacity-40 dark:hover:text-zinc-200"
					aria-label="Close"
				>
					✕
				</button>
			</div>

			{/* Options — only shown before job starts */}
			{!jobId && (
				<div className="mb-5 space-y-3">
					<label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
						<input
							type="checkbox"
							checked={includeMetadata}
							onChange={(e) => setIncludeMetadata(e.target.checked)}
							className="h-4 w-4 rounded border-zinc-300"
						/>
						Include metadata CSV (id, title, type, date, pages, quality)
					</label>
					<label className="flex cursor-pointer items-center gap-3 text-sm text-zinc-700 dark:text-zinc-300">
						<input
							type="checkbox"
							checked={includeOriginal}
							onChange={(e) => setIncludeOriginal(e.target.checked)}
							className="h-4 w-4 rounded border-zinc-300"
						/>
						Include original document files
					</label>
				</div>
			)}

			{/* Progress area — shown once job is queued */}
			{jobId && (
				<div className="mb-5 space-y-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-zinc-600 dark:text-zinc-400">
							{statusLabel(jobStatus.data?.status ?? 'queued')}
						</span>
						<span className="tabular-nums text-zinc-500">
							{Math.round(progress * 100)}%
						</span>
					</div>
					<ProgressBar value={progress} />

					{isFailed && (
						<p className="rounded bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
							{jobStatus.data?.error ?? 'An unexpected error occurred.'}
						</p>
					)}
				</div>
			)}

			{/* Action buttons */}
			<div className="flex justify-end gap-3">
				{!isComplete && (
					<>
						<button
							onClick={handleClose}
							disabled={isRunning}
							className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
						>
							Cancel
						</button>

						{!jobId && (
							<button
								onClick={handleExport}
								disabled={
									selectedIds.length === 0 ||
									startExport.isPending ||
									(!includeMetadata && !includeOriginal)
								}
								className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
							>
								{startExport.isPending ? 'Starting…' : 'Export'}
							</button>
						)}
					</>
				)}

				{isComplete && jobStatus.data?.download_url && (
					<a
						href={jobStatus.data.download_url}
						download="export.zip"
						target="_blank"
						rel="noopener noreferrer"
						className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
						onClick={() => setTimeout(() => onOpenChange(false), 500)}
					>
						Download ZIP
					</a>
				)}

				{isFailed && (
					<button
						onClick={() => setJobId(null)}
						className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
					>
						Try again
					</button>
				)}
			</div>
		</Dialog>
	);
}

export default BulkExportDialog;
