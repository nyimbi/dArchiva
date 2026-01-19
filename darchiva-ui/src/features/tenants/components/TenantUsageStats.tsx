// (c) Copyright Datacraft, 2026
import type { TenantDetail, TenantUsage } from '../types';
import { formatBytes } from '../api';
import styles from '../tenants.module.css';

interface TenantUsageStatsProps {
	tenant: TenantDetail;
	usage?: TenantUsage;
}

function getProgressClass(percentage: number): string {
	if (percentage >= 90) return styles.danger;
	if (percentage >= 75) return styles.warning;
	return styles.safe;
}

export function TenantUsageStats({ tenant, usage }: TenantUsageStatsProps) {
	const userCount = usage?.total_users ?? 0;
	const userLimit = tenant.max_users;
	const userPercent = userLimit ? Math.min((userCount / userLimit) * 100, 100) : 0;

	const docCount = usage?.total_documents ?? 0;

	const storageUsed = usage?.storage_used_bytes ?? 0;
	const storageQuota = tenant.max_storage_gb
		? tenant.max_storage_gb * 1024 * 1024 * 1024
		: null;
	const storagePercent = storageQuota
		? Math.min((storageUsed / storageQuota) * 100, 100)
		: 0;

	return (
		<div>
			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>Current Usage</h3>
				<div className={styles.statsGrid}>
					<div className={styles.statCard}>
						<div className={styles.statLabel}>Total Users</div>
						<div className={styles.statValue}>{userCount.toLocaleString()}</div>
						{userLimit && (
							<div className={styles.progressBar}>
								<div className={styles.progressTrack}>
									<div
										className={`${styles.progressFill} ${getProgressClass(userPercent)}`}
										style={{ width: `${userPercent}%` }}
									/>
								</div>
								<div className={styles.progressLabels}>
									<span>{userPercent.toFixed(1)}% used</span>
									<span>{userLimit} limit</span>
								</div>
							</div>
						)}
					</div>

					<div className={styles.statCard}>
						<div className={styles.statLabel}>Total Documents</div>
						<div className={styles.statValue}>{docCount.toLocaleString()}</div>
						<div className={styles.statSubtext}>Across all versions</div>
					</div>

					<div className={styles.statCard}>
						<div className={styles.statLabel}>Storage Used</div>
						<div className={styles.statValue}>{formatBytes(storageUsed)}</div>
						{storageQuota && (
							<div className={styles.progressBar}>
								<div className={styles.progressTrack}>
									<div
										className={`${styles.progressFill} ${getProgressClass(storagePercent)}`}
										style={{ width: `${storagePercent}%` }}
									/>
								</div>
								<div className={styles.progressLabels}>
									<span>{storagePercent.toFixed(1)}% used</span>
									<span>{tenant.max_storage_gb} GB limit</span>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>Usage Trends</h3>
				<div
					style={{
						padding: '3rem',
						textAlign: 'center',
						background: 'var(--cream)',
						borderRadius: '8px',
						color: 'var(--ink-muted)',
					}}
				>
					<svg
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						style={{ opacity: 0.5, marginBottom: '1rem' }}
					>
						<path d="M3 3v18h18" />
						<path d="M18 9l-5 5-4-4-4 4" />
					</svg>
					<p style={{ margin: 0 }}>Usage analytics charts coming soon</p>
				</div>
			</div>

			<div className={styles.section}>
				<h3 className={styles.sectionTitle}>Quotas & Warnings</h3>
				<div className={styles.formGrid}>
					<div className={styles.statCard}>
						<div className={styles.statLabel}>Warning Threshold</div>
						<div className={styles.statValue}>
							{tenant.settings?.warn_at_percentage ?? 80}%
						</div>
						<div className={styles.statSubtext}>
							Alert when storage reaches this level
						</div>
					</div>
					<div className={styles.statCard}>
						<div className={styles.statLabel}>Auto-Archive</div>
						<div className={styles.statValue}>
							{tenant.settings?.auto_archive_days
								? `${tenant.settings.auto_archive_days} days`
								: 'Disabled'}
						</div>
						<div className={styles.statSubtext}>
							Documents older than this are archived
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
