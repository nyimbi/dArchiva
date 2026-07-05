// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { IngestionBatch,IngestionJob,JobStatus,useIngestionBatches,useIngestionJobs,useRetryIngestionJob } from '../api';
import styles from './JobQueueDashboard.module.css';

const STATUS_COLORS: Record<string, string> = {
	pending: '#8a8a9e',
	processing: '#c9a227',
	completed: '#4ade80',
	failed: '#ef4444',
};

export function JobQueueDashboard() {
	const [view, setView] = useState<'jobs' | 'batches'>('jobs');
	const [statusFilter, setStatusFilter] = useState<JobStatus | ''>('');
	const retryJobMutation = useRetryIngestionJob();

	const { data: jobsData, isLoading: jobsLoading, isError: jobsError } = useIngestionJobs(
		statusFilter ? { status: statusFilter } : undefined
	);
	const { data: batchesData, isLoading: batchesLoading, isError: batchesError } = useIngestionBatches(
		statusFilter ? { status: statusFilter } : undefined
	);

	const formatDate = (dateStr?: string) => {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleString();
	};

	const isStuckJob = (job: IngestionJob) => {
		if (job.status !== 'processing' || !job.startedAt) return false;
		return Date.now() - new Date(job.startedAt).getTime() > 30 * 60 * 1000;
	};

	const renderJob = (job: IngestionJob) => {
		const canRetry = job.status === 'failed' || isStuckJob(job);

		return (
			<div key={job.id} className={styles.queueItem}>
				<div className={styles.itemHeader}>
					<span className={styles.itemStatus} style={{ background: STATUS_COLORS[job.status] }}>
						{job.status}
					</span>
					<span className={styles.itemSource}>{job.sourceName}</span>
					{canRetry && (
						<button
							type="button"
							onClick={() => retryJobMutation.mutate(job.id)}
							disabled={retryJobMutation.isPending}
							style={{
								marginLeft: 'auto',
								border: '1px solid rgba(201, 162, 39, 0.45)',
								borderRadius: '4px',
								background: 'rgba(201, 162, 39, 0.12)',
								color: '#e5b82a',
								cursor: retryJobMutation.isPending ? 'not-allowed' : 'pointer',
								fontSize: '0.75rem',
								padding: '0.25rem 0.5rem',
							}}
						>
							{retryJobMutation.isPending ? 'Retrying...' : 'Retry'}
						</button>
					)}
				</div>
				<div className={styles.itemDetails}>
					<span>Processed: {job.documentsProcessed}</span>
					<span>Failed: {job.documentsFailed}</span>
					<span>Started: {formatDate(job.startedAt)}</span>
				</div>
				{isStuckJob(job) && <p className={styles.error}>Job appears stuck and can be retried.</p>}
				{job.error && <p className={styles.error}>{job.error}</p>}
			</div>
		);
	};

	const renderBatch = (batch: IngestionBatch) => {
		const progress = batch.totalFiles > 0
			? Math.round((batch.processedFiles / batch.totalFiles) * 100)
			: 0;

		return (
			<div key={batch.id} className={styles.queueItem}>
				<div className={styles.itemHeader}>
					<span className={styles.itemStatus} style={{ background: STATUS_COLORS[batch.status] }}>
						{batch.status}
					</span>
					<span className={styles.batchName}>{batch.name || 'Unnamed batch'}</span>
				</div>
				<div className={styles.progressSection}>
					<div className={styles.progressBar}>
						<div className={styles.progressFill} style={{ width: `${progress}%` }} />
					</div>
					<span className={styles.progressText}>{progress}%</span>
				</div>
				<div className={styles.itemDetails}>
					<span>Total: {batch.totalFiles}</span>
					<span>Done: {batch.processedFiles}</span>
					<span>Failed: {batch.failedFiles}</span>
				</div>
			</div>
		);
	};

	const isLoading = view === 'jobs' ? jobsLoading : batchesLoading;
	const isError = view === 'jobs' ? jobsError : batchesError;
	const items = view === 'jobs' ? jobsData?.items : batchesData?.items;

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<h3>Job Queue</h3>
				<div className={styles.controls}>
					<div className={styles.tabs}>
						<button
							className={`${styles.tab} ${view === 'jobs' ? styles.active : ''}`}
							onClick={() => setView('jobs')}
						>
							Jobs
						</button>
						<button
							className={`${styles.tab} ${view === 'batches' ? styles.active : ''}`}
							onClick={() => setView('batches')}
						>
							Batches
						</button>
					</div>
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value as JobStatus | '')}
						className={styles.filter}
					>
						<option value="">All statuses</option>
						<option value="pending">Pending</option>
						<option value="processing">Processing</option>
						<option value="completed">Completed</option>
						<option value="failed">Failed</option>
					</select>
				</div>
			</div>

			<div className={styles.queueList}>
				{isLoading && <p className={styles.loading}>Loading...</p>}
				{isError && (
					<div
						style={{
							alignItems: 'center',
							background: 'rgba(239, 68, 68, 0.1)',
							border: '1px solid rgba(239, 68, 68, 0.35)',
							borderRadius: '6px',
							color: '#f87171',
							display: 'flex',
							gap: '0.5rem',
							padding: '0.75rem',
						}}
					>
						<AlertCircle size={16} />
						Failed to load {view}. Try again or refresh the page.
					</div>
				)}
				{!isLoading && !isError && items?.length === 0 && (
					<p className={styles.empty}>No {view} found</p>
				)}
				{!isError && (view === 'jobs'
					? jobsData?.items.map(renderJob)
					: batchesData?.items.map(renderBatch)
				)}
			</div>
		</div>
	);
}

export default JobQueueDashboard;
