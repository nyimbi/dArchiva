// (c) Copyright Datacraft, 2026
/**
 * SLA Dashboard component for workflow compliance monitoring.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
	getSLADashboard,
	getSLAAlerts,
	acknowledgeSLAAlert,
	type SLADashboardResponse,
	type SLAAlert,
} from '../api';

import styles from './SLADashboard.module.css';

interface SLADashboardProps {
	className?: string;
}

type PeriodOption = 7 | 30 | 90;

export function SLADashboard({ className }: SLADashboardProps) {
	const [periodDays, setPeriodDays] = useState<PeriodOption>(30);
	const queryClient = useQueryClient();

	const { data: dashboard, isLoading, error } = useQuery({
		queryKey: ['sla-dashboard', periodDays],
		queryFn: () => getSLADashboard(periodDays),
		refetchInterval: 60000, // Refresh every minute
	});

	const acknowledgeMutation = useMutation({
		mutationFn: (alertId: string) => acknowledgeSLAAlert(alertId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sla-dashboard'] });
		},
	});

	if (isLoading) {
		return <div className={styles.loading}>Loading SLA Dashboard...</div>;
	}

	if (error) {
		return <div className={styles.error}>Failed to load SLA dashboard</div>;
	}

	if (!dashboard) {
		return null;
	}

	const { stats, recent_alerts, recent_metrics } = dashboard;

	return (
		<div className={`${styles.dashboard} ${className || ''}`}>
			<header className={styles.header}>
				<h2>SLA Compliance Dashboard</h2>
				<div className={styles.periodSelector}>
					<label>Period:</label>
					<select
						value={periodDays}
						onChange={(e) => setPeriodDays(Number(e.target.value) as PeriodOption)}
					>
						<option value={7}>Last 7 days</option>
						<option value={30}>Last 30 days</option>
						<option value={90}>Last 90 days</option>
					</select>
				</div>
			</header>

			{/* Stats Cards */}
			<div className={styles.statsGrid}>
				<StatCard
					label="Compliance Rate"
					value={`${stats.compliance_rate.toFixed(1)}%`}
					variant={stats.compliance_rate >= 90 ? 'success' : stats.compliance_rate >= 70 ? 'warning' : 'danger'}
				/>
				<StatCard
					label="Total Tasks"
					value={stats.total_tasks}
					variant="neutral"
				/>
				<StatCard
					label="On Track"
					value={stats.on_track}
					variant="success"
				/>
				<StatCard
					label="Warning"
					value={stats.warning}
					variant="warning"
				/>
				<StatCard
					label="Breached"
					value={stats.breached}
					variant="danger"
				/>
			</div>

			{/* Compliance Gauge */}
			<div className={styles.gaugeSection}>
				<h3>Compliance Overview</h3>
				<ComplianceGauge
					onTrack={stats.on_track}
					warning={stats.warning}
					breached={stats.breached}
				/>
			</div>

			{/* Recent Alerts */}
			<div className={styles.alertsSection}>
				<h3>Recent Alerts ({recent_alerts.filter(a => !a.acknowledged).length} unacknowledged)</h3>
				{recent_alerts.length === 0 ? (
					<p className={styles.noAlerts}>No recent alerts</p>
				) : (
					<ul className={styles.alertsList}>
						{recent_alerts.map((alert) => (
							<AlertItem
								key={alert.id}
								alert={alert}
								onAcknowledge={() => acknowledgeMutation.mutate(alert.id)}
								isAcknowledging={acknowledgeMutation.isPending}
							/>
						))}
					</ul>
				)}
			</div>

			{/* Recent Metrics */}
			<div className={styles.metricsSection}>
				<h3>Recent Task Metrics</h3>
				{recent_metrics.length === 0 ? (
					<p className={styles.noMetrics}>No recent metrics</p>
				) : (
					<table className={styles.metricsTable}>
						<thead>
							<tr>
								<th>Step Type</th>
								<th>Started</th>
								<th>Duration</th>
								<th>Target</th>
								<th>Status</th>
							</tr>
						</thead>
						<tbody>
							{recent_metrics.map((metric) => (
								<tr key={metric.id}>
									<td>{metric.step_type || 'N/A'}</td>
									<td>{formatDate(metric.started_at)}</td>
									<td>{formatDuration(metric.duration_seconds)}</td>
									<td>{formatDuration(metric.target_seconds)}</td>
									<td>
										<StatusBadge status={metric.sla_status} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	);
}

// --- Sub-components ---

interface StatCardProps {
	label: string;
	value: string | number;
	variant: 'success' | 'warning' | 'danger' | 'neutral';
}

function StatCard({ label, value, variant }: StatCardProps) {
	return (
		<div className={`${styles.statCard} ${styles[variant]}`}>
			<span className={styles.statValue}>{value}</span>
			<span className={styles.statLabel}>{label}</span>
		</div>
	);
}

interface ComplianceGaugeProps {
	onTrack: number;
	warning: number;
	breached: number;
}

function ComplianceGauge({ onTrack, warning, breached }: ComplianceGaugeProps) {
	const total = onTrack + warning + breached;
	if (total === 0) {
		return <div className={styles.gaugeEmpty}>No data</div>;
	}

	const onTrackPercent = (onTrack / total) * 100;
	const warningPercent = (warning / total) * 100;
	const breachedPercent = (breached / total) * 100;

	return (
		<div className={styles.gauge}>
			<div className={styles.gaugeBar}>
				<div
					className={`${styles.gaugeSegment} ${styles.success}`}
					style={{ width: `${onTrackPercent}%` }}
					title={`On Track: ${onTrack} (${onTrackPercent.toFixed(1)}%)`}
				/>
				<div
					className={`${styles.gaugeSegment} ${styles.warning}`}
					style={{ width: `${warningPercent}%` }}
					title={`Warning: ${warning} (${warningPercent.toFixed(1)}%)`}
				/>
				<div
					className={`${styles.gaugeSegment} ${styles.danger}`}
					style={{ width: `${breachedPercent}%` }}
					title={`Breached: ${breached} (${breachedPercent.toFixed(1)}%)`}
				/>
			</div>
			<div className={styles.gaugeLegend}>
				<span className={styles.legendItem}>
					<span className={`${styles.legendDot} ${styles.success}`} />
					On Track ({onTrackPercent.toFixed(1)}%)
				</span>
				<span className={styles.legendItem}>
					<span className={`${styles.legendDot} ${styles.warning}`} />
					Warning ({warningPercent.toFixed(1)}%)
				</span>
				<span className={styles.legendItem}>
					<span className={`${styles.legendDot} ${styles.danger}`} />
					Breached ({breachedPercent.toFixed(1)}%)
				</span>
			</div>
		</div>
	);
}

interface AlertItemProps {
	alert: SLAAlert;
	onAcknowledge: () => void;
	isAcknowledging: boolean;
}

function AlertItem({ alert, onAcknowledge, isAcknowledging }: AlertItemProps) {
	const severityClass = {
		low: styles.severityLow,
		medium: styles.severityMedium,
		high: styles.severityHigh,
		critical: styles.severityCritical,
	}[alert.severity];

	return (
		<li className={`${styles.alertItem} ${severityClass}`}>
			<div className={styles.alertContent}>
				<span className={styles.alertTitle}>{alert.title}</span>
				{alert.message && <span className={styles.alertMessage}>{alert.message}</span>}
				<span className={styles.alertTime}>{formatDate(alert.created_at)}</span>
			</div>
			{!alert.acknowledged && (
				<button
					className={styles.acknowledgeBtn}
					onClick={onAcknowledge}
					disabled={isAcknowledging}
				>
					Acknowledge
				</button>
			)}
			{alert.acknowledged && (
				<span className={styles.acknowledgedBadge}>Acknowledged</span>
			)}
		</li>
	);
}

interface StatusBadgeProps {
	status: 'on_track' | 'warning' | 'breached';
}

function StatusBadge({ status }: StatusBadgeProps) {
	const labels = {
		on_track: 'On Track',
		warning: 'Warning',
		breached: 'Breached',
	};

	return (
		<span className={`${styles.statusBadge} ${styles[status.replace('_', '')]}`}>
			{labels[status]}
		</span>
	);
}

// --- Utilities ---

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function formatDuration(seconds?: number): string {
	if (!seconds) return 'N/A';
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
	const hours = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	return `${hours}h ${mins}m`;
}

export default SLADashboard;
