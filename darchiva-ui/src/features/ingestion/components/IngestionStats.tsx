// (c) Copyright Datacraft, 2026
import { useIngestionStatsData, useIngestionJobs } from '../api';
import styles from './IngestionStats.module.css';

export function IngestionStats() {
	const { data: stats, isLoading } = useIngestionStatsData();
	const { data: recentJobs } = useIngestionJobs({ limit: 5 });

	if (isLoading) {
		return <div className={styles.loading}>Loading stats...</div>;
	}

	const cards = [
		{ label: 'Active Sources', value: stats?.active ?? 0, color: '#4ade80' },
		{ label: 'Total Sources', value: stats?.total ?? 0, color: '#c9a227' },
		{ label: 'Jobs Today', value: stats?.jobsToday ?? 0, color: '#60a5fa' },
		{ label: 'Failed', value: stats?.failed ?? 0, color: '#ef4444' },
	];

	return (
		<div className={styles.container}>
			<h3>Ingestion Overview</h3>

			<div className={styles.statsGrid}>
				{cards.map((card) => (
					<div key={card.label} className={styles.statCard}>
						<span className={styles.statValue} style={{ color: card.color }}>
							{card.value}
						</span>
						<span className={styles.statLabel}>{card.label}</span>
					</div>
				))}
			</div>

			<div className={styles.recentSection}>
				<h4>Recent Activity</h4>
				{recentJobs?.items.length === 0 && (
					<p className={styles.empty}>No recent jobs</p>
				)}
				<div className={styles.activityList}>
					{recentJobs?.items.map((job) => (
						<div key={job.id} className={styles.activityItem}>
							<span
								className={styles.statusDot}
								style={{
									background:
										job.status === 'completed' ? '#4ade80' :
										job.status === 'failed' ? '#ef4444' :
										job.status === 'processing' ? '#c9a227' : '#8a8a9e'
								}}
							/>
							<span className={styles.activitySource}>{job.sourceName}</span>
							<span className={styles.activityDocs}>{job.documentsProcessed} docs</span>
							<span className={styles.activityTime}>
								{new Date(job.startedAt).toLocaleTimeString()}
							</span>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default IngestionStats;
