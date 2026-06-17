// (c) Copyright Datacraft, 2026
/**
 * BulkImportDialog — drag-and-drop ZIP upload with live progress polling.
 *
 * Props:
 *   isOpen          — controlled visibility
 *   onClose         — called when user dismisses
 *   destinationFolderId — optional target folder
 *   projectId           — optional project context
 */
import { useCallback, useRef, useState } from 'react';
import { useBulkImport, useBulkImportStatus } from '../api/bulk';
import type { BulkJobStatus, BulkJobFailure } from '../api/bulk';
import styles from './BulkImportDialog.module.css';

interface Props {
	isOpen: boolean;
	onClose: () => void;
	destinationFolderId?: string;
	projectId?: string;
}

type DialogPhase = 'idle' | 'uploading' | 'polling' | 'done' | 'error';

const STATUS_LABEL: Record<BulkJobStatus, string> = {
	queued: 'Queued — waiting for workers',
	processing: 'Processing files…',
	completed: 'Import complete',
	partial: 'Import finished with errors',
	failed: 'Import failed',
	unknown: 'Unknown state',
};

export function BulkImportDialog({ isOpen, onClose, destinationFolderId, projectId }: Props) {
	const [file, setFile] = useState<File | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [phase, setPhase] = useState<DialogPhase>('idle');
	const [jobId, setJobId] = useState<string | null>(null);
	const [uploadError, setUploadError] = useState<string | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const bulkImport = useBulkImport();
	const { data: jobStatus } = useBulkImportStatus(jobId);

	// Derive phase from job status automatically
	const effectivePhase: DialogPhase = (() => {
		if (phase === 'error') return 'error';
		if (phase === 'uploading') return 'uploading';
		if (!jobStatus) return phase;
		if (jobStatus.status === 'completed' || jobStatus.status === 'partial' || jobStatus.status === 'failed') return 'done';
		return 'polling';
	})();

	const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
	const handleDragLeave = () => setIsDragging(false);
	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		const dropped = e.dataTransfer.files[0];
		if (dropped?.name.toLowerCase().endsWith('.zip')) {
			setFile(dropped);
			setUploadError(null);
		} else {
			setUploadError('Only .zip files are accepted.');
		}
	}, []);

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const selected = e.target.files?.[0];
		if (!selected) return;
		if (!selected.name.toLowerCase().endsWith('.zip')) {
			setUploadError('Only .zip files are accepted.');
			return;
		}
		setFile(selected);
		setUploadError(null);
	};

	const handleUpload = async () => {
		if (!file) return;
		setPhase('uploading');
		setUploadError(null);
		try {
			const result = await bulkImport.mutateAsync({ file, destinationFolderId, projectId });
			setJobId(result.job_id);
			setPhase('polling');
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Upload failed';
			setUploadError(message);
			setPhase('error');
		}
	};

	const handleClose = () => {
		setFile(null);
		setIsDragging(false);
		setPhase('idle');
		setJobId(null);
		setUploadError(null);
		onClose();
	};

	const formatSize = (bytes: number) => {
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	};

	const progressPct = (() => {
		if (!jobStatus || jobStatus.total_files === 0) return 0;
		return Math.round(((jobStatus.processed + jobStatus.failed) / jobStatus.total_files) * 100);
	})();

	if (!isOpen) return null;

	return (
		<div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
			<div className={styles.dialog} role="dialog" aria-modal="true" aria-label="Bulk ZIP Import">
				{/* ── Header ── */}
				<div className={styles.header}>
					<h2 className={styles.title}>Bulk ZIP Import</h2>
					<button className={styles.closeBtn} onClick={handleClose} aria-label="Close">&#x2715;</button>
				</div>

				{/* ── Idle / file selection phase ── */}
				{(effectivePhase === 'idle' || effectivePhase === 'error') && (
					<>
						<p className={styles.subtitle}>
							Drop a ZIP archive containing PDFs, images, DOCX or XLSX files.
							Files are extracted and each document is queued through the OCR pipeline.
						</p>

						<div
							className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${file ? styles.hasFile : ''}`}
							onDragOver={handleDragOver}
							onDragLeave={handleDragLeave}
							onDrop={handleDrop}
							onClick={() => !file && fileInputRef.current?.click()}
						>
							<input
								ref={fileInputRef}
								type="file"
								accept=".zip"
								onChange={handleFileSelect}
								className={styles.hiddenInput}
							/>
							{file ? (
								<div className={styles.fileInfo}>
									<span className={styles.fileIcon}>&#x1F5C2;</span>
									<div className={styles.fileMeta}>
										<span className={styles.fileName}>{file.name}</span>
										<span className={styles.fileSize}>{formatSize(file.size)}</span>
									</div>
									<button
										className={styles.removeFile}
										onClick={(e) => { e.stopPropagation(); setFile(null); setUploadError(null); }}
										aria-label="Remove file"
									>
										&#x2715;
									</button>
								</div>
							) : (
								<div className={styles.dropPrompt}>
									<span className={styles.uploadIcon}>&#x2B06;</span>
									<p>Drop .zip here or <span className={styles.browseLink}>browse</span></p>
									<span className={styles.hint}>PDF, TIFF, JPG, PNG, DOCX, XLSX accepted inside the archive</span>
								</div>
							)}
						</div>

						{uploadError && (
							<div className={styles.errorBanner}>
								<span>&#x26A0;</span> {uploadError}
							</div>
						)}

						<div className={styles.actions}>
							<button className={styles.cancelBtn} onClick={handleClose}>Cancel</button>
							<button
								className={styles.uploadBtn}
								disabled={!file || bulkImport.isPending}
								onClick={handleUpload}
							>
								{bulkImport.isPending ? 'Uploading…' : 'Upload & Import'}
							</button>
						</div>
					</>
				)}

				{/* ── Upload in flight ── */}
				{effectivePhase === 'uploading' && (
					<div className={styles.progressSection}>
						<p className={styles.progressLabel}>Uploading archive…</p>
						<div className={styles.progressTrack}>
							<div className={styles.progressBarIndeterminate} />
						</div>
					</div>
				)}

				{/* ── Polling / processing ── */}
				{(effectivePhase === 'polling' || effectivePhase === 'done') && jobStatus && (
					<div className={styles.progressSection}>
						<div className={styles.statusRow}>
							<span className={`${styles.statusBadge} ${styles[`status_${jobStatus.status}`]}`}>
								{STATUS_LABEL[jobStatus.status]}
							</span>
							<span className={styles.jobIdLabel}>Job {jobId?.slice(0, 8)}</span>
						</div>

						<div className={styles.counters}>
							<div className={styles.counter}>
								<span className={styles.counterValue}>{jobStatus.total_files}</span>
								<span className={styles.counterLabel}>Total</span>
							</div>
							<div className={styles.counter}>
								<span className={`${styles.counterValue} ${styles.counterOk}`}>{jobStatus.processed}</span>
								<span className={styles.counterLabel}>Queued for OCR</span>
							</div>
							<div className={styles.counter}>
								<span className={`${styles.counterValue} ${jobStatus.failed > 0 ? styles.counterFail : ''}`}>
									{jobStatus.failed}
								</span>
								<span className={styles.counterLabel}>Failed</span>
							</div>
						</div>

						<div className={styles.progressTrack}>
							<div
								className={styles.progressBar}
								style={{ width: `${progressPct}%` }}
							/>
						</div>
						<span className={styles.progressPct}>{progressPct}%</span>

						{/* Failure list */}
						{jobStatus.failures.length > 0 && (
							<details className={styles.failureDetails}>
								<summary className={styles.failureSummary}>
									{jobStatus.failures.length} file{jobStatus.failures.length !== 1 ? 's' : ''} failed
								</summary>
								<ul className={styles.failureList}>
									{jobStatus.failures.map((f: BulkJobFailure, i: number) => (
										<li key={i} className={styles.failureItem}>
											<span className={styles.failureFile}>{f.file}</span>
											<span className={styles.failureError}>{f.error}</span>
										</li>
									))}
								</ul>
							</details>
						)}

						<div className={styles.actions}>
							{effectivePhase === 'done' ? (
								<button className={styles.uploadBtn} onClick={handleClose}>Done</button>
							) : (
								<span className={styles.pollingHint}>Refreshing every 2 s…</span>
							)}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default BulkImportDialog;
