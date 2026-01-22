// (c) Copyright Datacraft, 2026
/**
 * Workflow Alerts List - Filterable alert management console
 * with bulk actions and expandable detail views.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSLAAlerts, acknowledgeSLAAlert, type SLAAlert } from '../api';
import styles from './WorkflowAlertsList.module.css';

interface WorkflowAlertsListProps {
	className?: string;
}

type Severity = 'low' | 'medium' | 'high' | 'critical';
const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];

export function WorkflowAlertsList({ className }: WorkflowAlertsListProps) {
	const [page, setPage] = useState(1);
	const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);
	const [showAcknowledged, setShowAcknowledged] = useState(false);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const queryClient = useQueryClient();

	const { data, isLoading } = useQuery({
		queryKey: ['sla-alerts', page, severityFilter, showAcknowledged],
		queryFn: () => getSLAAlerts(page, 20, showAcknowledged ? undefined : false, severityFilter || undefined),
	});

	const acknowledgeMutation = useMutation({
		mutationFn: (alertId: string) => acknowledgeSLAAlert(alertId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sla-alerts'] });
			queryClient.invalidateQueries({ queryKey: ['sla-dashboard'] });
		},
	});

	const handleAcknowledgeBulk = useCallback(async () => {
		const promises = Array.from(selectedIds).map(id => acknowledgeSLAAlert(id));
		await Promise.all(promises);
		setSelectedIds(new Set());
		queryClient.invalidateQueries({ queryKey: ['sla-alerts'] });
		queryClient.invalidateQueries({ queryKey: ['sla-dashboard'] });
	}, [selectedIds, queryClient]);

	const toggleSelect = (id: string) => {
		setSelectedIds(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const unackCount = data?.items.filter(a => !a.acknowledged).length || 0;

	if (isLoading) {
		return (
			<div className={`${styles.container} ${className || ''}`}>
				<div className={styles.loading}>
					<span className={styles.spinner} />
					Loading alerts...
				</div>
			</div>
		);
	}

	return (
		<div className={`${styles.container} ${className || ''}`}>
			<header className={styles.header}>
				<div className={styles.headerLeft}>
					<div className={styles.headerIcon}>
						<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
							<path d="M13.73 21a2 2 0 0 1-3.46 0" />
						</svg>
					</div>
					<h3 className={styles.headerTitle}>
						Workflow Alerts
						<span className={`${styles.alertCount} ${unackCount === 0 ? styles.none : ''}`}>
							{unackCount}
						</span>
					</h3>
				</div>
			</header>

			<div className={styles.filters}>
				<div className={styles.filterGroup}>
					<span className={styles.filterLabel}>Severity</span>
					<div className={styles.severityFilters}>
						{SEVERITIES.map(sev => (
							<button
								key={sev}
								className={`${styles.severityBtn} ${styles[sev]} ${severityFilter === sev ? styles.active : ''}`}
								onClick={() => setSeverityFilter(prev => prev === sev ? null : sev)}
							>
								{sev}
							</button>
						))}
					</div>
				</div>

				<div
					className={`${styles.ackToggle} ${showAcknowledged ? styles.active : ''}`}
					onClick={() => setShowAcknowledged(!showAcknowledged)}
				>
					<span className={styles.checkbox}>
						<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
							<polyline points="20 6 9 17 4 12" />
						</svg>
					</span>
					<span>Show Acknowledged</span>
				</div>

				{selectedIds.size > 0 && (
					<div className={styles.bulkActions}>
						<button className={styles.bulkBtn} onClick={handleAcknowledgeBulk}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<polyline points="20 6 9 17 4 12" />
							</svg>
							Acknowledge ({selectedIds.size})
						</button>
					</div>
				)}
			</div>

			<div className={styles.alertList}>
				{!data?.items.length ? (
					<div className={styles.emptyState}>
						<svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
							<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
							<path d="M13.73 21a2 2 0 0 1-3.46 0" />
						</svg>
						<p>No alerts match your filters</p>
					</div>
				) : (
					data.items.map(alert => (
						<AlertCard
							key={alert.id}
							alert={alert}
							isExpanded={expandedId === alert.id}
							isSelected={selectedIds.has(alert.id)}
							onToggleExpand={() => setExpandedId(prev => prev === alert.id ? null : alert.id)}
							onToggleSelect={() => toggleSelect(alert.id)}
							onAcknowledge={() => acknowledgeMutation.mutate(alert.id)}
							isAcknowledging={acknowledgeMutation.isPending}
						/>
					))
				)}
			</div>

			{data && data.total > 20 && (
				<div className={styles.pagination}>
					<button
						className={styles.pageBtn}
						onClick={() => setPage(p => Math.max(1, p - 1))}
						disabled={page === 1}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<polyline points="15 18 9 12 15 6" />
						</svg>
					</button>
					<span className={styles.pageInfo}>
						Page {page} of {Math.ceil(data.total / 20)}
					</span>
					<button
						className={styles.pageBtn}
						onClick={() => setPage(p => p + 1)}
						disabled={page >= Math.ceil(data.total / 20)}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<polyline points="9 18 15 12 9 6" />
						</svg>
					</button>
				</div>
			)}
		</div>
	);
}

interface AlertCardProps {
	alert: SLAAlert;
	isExpanded: boolean;
	isSelected: boolean;
	onToggleExpand: () => void;
	onToggleSelect: () => void;
	onAcknowledge: () => void;
	isAcknowledging: boolean;
}

function AlertCard({
	alert,
	isExpanded,
	isSelected,
	onToggleExpand,
	onToggleSelect,
	onAcknowledge,
	isAcknowledging,
}: AlertCardProps) {
	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	};

	const formatAlertType = (type: string) => {
		return type.replace(/_/g, ' ');
	};

	return (
		<div className={`${styles.alertCard} ${styles[alert.severity]} ${alert.acknowledged ? styles.acknowledged : ''}`}>
			<div className={styles.alertCardHeader} onClick={onToggleExpand}>
				<div className={styles.alertMain}>
					<div className={styles.alertTitleRow}>
						<span className={`${styles.severityIndicator} ${styles[alert.severity]}`} />
						<span className={styles.alertTitle}>{alert.title}</span>
					</div>
					<div className={styles.alertMeta}>
						<span className={styles.alertType}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
								<line x1="12" y1="9" x2="12" y2="13" />
								<line x1="12" y1="17" x2="12.01" y2="17" />
							</svg>
							{formatAlertType(alert.alert_type)}
						</span>
						<span className={styles.alertTime}>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
							{formatDate(alert.created_at)}
						</span>
					</div>
				</div>

				<div className={styles.alertActions}>
					{!alert.acknowledged ? (
						<button
							className={styles.acknowledgeBtn}
							onClick={e => { e.stopPropagation(); onAcknowledge(); }}
							disabled={isAcknowledging}
						>
							<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<polyline points="20 6 9 17 4 12" />
							</svg>
							Ack
						</button>
					) : (
						<span className={styles.acknowledgedBadge}>
							<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
								<polyline points="20 6 9 17 4 12" />
							</svg>
							Acknowledged
						</span>
					)}
					<button
						className={`${styles.expandBtn} ${isExpanded ? styles.expanded : ''}`}
						onClick={e => { e.stopPropagation(); onToggleExpand(); }}
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
							<polyline points="6 9 12 15 18 9" />
						</svg>
					</button>
				</div>
			</div>

			{isExpanded && (
				<div className={styles.alertDetails}>
					{alert.message && (
						<div className={styles.alertMessage}>{alert.message}</div>
					)}
					<div className={styles.detailsGrid}>
						{alert.workflow_id && (
							<div className={styles.detailItem}>
								<span className={styles.detailLabel}>Workflow</span>
								<span className={styles.detailValue}>{alert.workflow_id}</span>
							</div>
						)}
						{alert.instance_id && (
							<div className={styles.detailItem}>
								<span className={styles.detailLabel}>Instance</span>
								<span className={styles.detailValue}>{alert.instance_id.slice(0, 8)}...</span>
							</div>
						)}
						{alert.assignee_id && (
							<div className={styles.detailItem}>
								<span className={styles.detailLabel}>Assignee</span>
								<span className={styles.detailValue}>{alert.assignee_id}</span>
							</div>
						)}
						{alert.acknowledged_at && (
							<div className={styles.detailItem}>
								<span className={styles.detailLabel}>Acknowledged At</span>
								<span className={styles.detailValue}>{formatDate(alert.acknowledged_at)}</span>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

export default WorkflowAlertsList;
