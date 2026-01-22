// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { useIngestionJobs, useIngestionBatches, JobStatus, IngestionJob, IngestionBatch } from '../api';
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

	const { data: jobsData, isLoading: jobsLoading } = useIngestionJobs(
		statusFilter ? { status: statusFilter } : undefined
	);
	const { data: batchesData, isLoading: batchesLoading } = useIngestionBatches(
		statusFilter ? { status: statusFilter } : undefined
	);

	const formatDate = (dateStr?: string) => {
		if (!dateStr) return '-';
		return new Date(dateStr).toLocaleString();
	};

	const renderJob = (job: IngestionJob) => (
		<div key={job.id} className={styles.queueItem}>
			<div className={styles.itemHeader}>
				<span className={styles.itemStatus} style={{ background: STATUS_COLORS[job.status] }}>
					{job.status}
				</span>
				<span className={styles.itemSource}>{job.sourceName}</span>
			</div>
			<div className={styles.itemDetails}>
				<span>Processed: {job.documentsProcessed}</span>
				<span>Failed: {job.documentsFailed}</span>
				<span>Started: {formatDate(job.startedAt)}</span>
			</div>
			{job.error && <p className={styles.error}>{job.error}</p>}
		</div>
	);

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
				{!isLoading && items?.length === 0 && (
					<p className={styles.empty}>No {view} found</p>
				)}
				{view === 'jobs'
					? jobsData?.items.map(renderJob)
					: batchesData?.items.map(renderBatch)
				}
			</div>
		</div>
	);
}

export default JobQueueDashboard;
