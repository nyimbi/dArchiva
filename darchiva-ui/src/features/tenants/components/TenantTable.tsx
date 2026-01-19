// (c) Copyright Datacraft, 2026
import { useState, useEffect } from 'react';
import type { Tenant, TenantStatus, TenantUsage } from '../types';
import { TenantStatusBadge } from './TenantStatusBadge';
import { formatBytes, formatUserLimit, formatStorageQuota } from '../api';
import styles from '../tenants.module.css';

interface TenantTableProps {
	tenants: Tenant[];
	usage?: Record<string, TenantUsage>;
	onSelect: (tenant: Tenant) => void;
	onSuspend: (tenant: Tenant) => void;
	onActivate: (tenant: Tenant) => void;
	onDelete: (tenant: Tenant) => void;
	loading?: boolean;
}

function getInitials(name: string): string {
	return name
		.split(' ')
		.map((w) => w[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

function getPlanBadgeClass(plan: string): string {
	switch (plan.toLowerCase()) {
		case 'enterprise':
			return styles.planEnterprise;
		case 'professional':
			return styles.planProfessional;
		default:
			return '';
	}
}

function getUsageBarClass(percentage: number): string {
	if (percentage >= 90) return styles.critical;
	if (percentage >= 75) return styles.warning;
	return '';
}

export function TenantTable({
	tenants,
	usage = {},
	onSelect,
	onSuspend,
	onActivate,
	onDelete,
	loading,
}: TenantTableProps) {
	if (loading) {
		return (
			<div className={styles.tableContainer}>
				<div className={styles.loading}>
					<div className={styles.spinner} />
				</div>
			</div>
		);
	}

	if (tenants.length === 0) {
		return (
			<div className={styles.tableContainer}>
				<div className={styles.emptyState}>
					<div className={styles.emptyIcon}>🏛️</div>
					<h3>No tenants found</h3>
					<p>Create your first tenant to get started</p>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.tableContainer}>
			<table className={styles.table}>
				<thead className={styles.tableHead}>
					<tr>
						<th>Organization</th>
						<th>Status</th>
						<th>Plan</th>
						<th>Users</th>
						<th>Storage</th>
						<th>Created</th>
						<th></th>
					</tr>
				</thead>
				<tbody className={styles.tableBody}>
					{tenants.map((tenant) => {
						const tenantUsage = usage[tenant.id];
						const userCount = tenantUsage?.total_users ?? 0;
						const userLimit = tenant.max_users;
						const storageUsed = tenantUsage?.storage_used_bytes ?? 0;
						const storageQuota = tenant.max_storage_gb
							? tenant.max_storage_gb * 1024 * 1024 * 1024
							: null;
						const storagePercent = storageQuota
							? Math.min((storageUsed / storageQuota) * 100, 100)
							: 0;

						return (
							<tr key={tenant.id}>
								<td>
									<div className={styles.tenantCell}>
										<div className={styles.tenantAvatar}>
											{getInitials(tenant.name)}
										</div>
										<div className={styles.tenantInfo}>
											<h4>{tenant.name}</h4>
											<span className={styles.tenantSlug}>{tenant.slug}</span>
										</div>
									</div>
								</td>
								<td>
									<TenantStatusBadge status={tenant.status} />
								</td>
								<td>
									<span
										className={`${styles.planBadge} ${getPlanBadgeClass(tenant.plan)}`}
									>
										{tenant.plan}
									</span>
								</td>
								<td>
									<div className={styles.usageCell}>
										{userLimit ? (
											<>
												<div className={styles.usageBar}>
													<div
														className={`${styles.usageBarFill} ${getUsageBarClass((userCount / userLimit) * 100)}`}
														style={{
															width: `${Math.min((userCount / userLimit) * 100, 100)}%`,
														}}
													/>
												</div>
												<span className={styles.usageText}>
													{userCount} / {userLimit}
												</span>
											</>
										) : (
											<span className={styles.usageText}>{userCount}</span>
										)}
									</div>
								</td>
								<td>
									<div className={styles.usageCell}>
										{storageQuota ? (
											<>
												<div className={styles.usageBar}>
													<div
														className={`${styles.usageBarFill} ${getUsageBarClass(storagePercent)}`}
														style={{ width: `${storagePercent}%` }}
													/>
												</div>
												<span className={styles.usageText}>
													{formatBytes(storageUsed)} /{' '}
													{formatStorageQuota(tenant.max_storage_gb)}
												</span>
											</>
										) : (
											<span className={styles.usageText}>
												{formatBytes(storageUsed)}
											</span>
										)}
									</div>
								</td>
								<td>
									<span className={styles.usageText}>
										{new Date(tenant.created_at).toLocaleDateString('en-US', {
											year: 'numeric',
											month: 'short',
											day: 'numeric',
										})}
									</span>
								</td>
								<td>
									<div className={styles.actionsCell}>
										<button
											className={styles.iconButton}
											onClick={() => onSelect(tenant)}
											title="View details"
										>
											<svg
												width="18"
												height="18"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
											>
												<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
												<circle cx="12" cy="12" r="3" />
											</svg>
										</button>
										{tenant.status === 'active' ? (
											<button
												className={styles.iconButton}
												onClick={() => onSuspend(tenant)}
												title="Suspend tenant"
											>
												<svg
													width="18"
													height="18"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
												>
													<rect x="6" y="4" width="4" height="16" />
													<rect x="14" y="4" width="4" height="16" />
												</svg>
											</button>
										) : (
											<button
												className={styles.iconButton}
												onClick={() => onActivate(tenant)}
												title="Activate tenant"
											>
												<svg
													width="18"
													height="18"
													viewBox="0 0 24 24"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
												>
													<polygon points="5 3 19 12 5 21 5 3" />
												</svg>
											</button>
										)}
										<button
											className={styles.iconButton}
											onClick={() => onDelete(tenant)}
											title="Delete tenant"
										>
											<svg
												width="18"
												height="18"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
											>
												<polyline points="3 6 5 6 21 6" />
												<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
											</svg>
										</button>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
}
