// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import type { TenantStatus } from '../types';
import styles from '../tenants.module.css';

interface TenantFiltersProps {
	onStatusChange: (status: TenantStatus | '') => void;
	onPlanChange: (plan: string) => void;
	onSearchChange: (search: string) => void;
	statusFilter: TenantStatus | '';
	planFilter: string;
	searchQuery: string;
}

const statusOptions: { value: TenantStatus | ''; label: string }[] = [
	{ value: '', label: 'All Statuses' },
	{ value: 'active', label: 'Active' },
	{ value: 'trial', label: 'Trial' },
	{ value: 'suspended', label: 'Suspended' },
	{ value: 'cancelled', label: 'Cancelled' },
];

const planOptions = [
	{ value: '', label: 'All Plans' },
	{ value: 'free', label: 'Free' },
	{ value: 'professional', label: 'Professional' },
	{ value: 'enterprise', label: 'Enterprise' },
];

export function TenantFilters({
	onStatusChange,
	onPlanChange,
	onSearchChange,
	statusFilter,
	planFilter,
	searchQuery,
}: TenantFiltersProps) {
	return (
		<div className={styles.filtersBar}>
			<div className={styles.filterGroup}>
				<label className={styles.filterLabel}>Status</label>
				<select
					className={styles.filterSelect}
					value={statusFilter}
					onChange={(e) => onStatusChange(e.target.value as TenantStatus | '')}
				>
					{statusOptions.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
			</div>

			<div className={styles.filterGroup}>
				<label className={styles.filterLabel}>Plan</label>
				<select
					className={styles.filterSelect}
					value={planFilter}
					onChange={(e) => onPlanChange(e.target.value)}
				>
					{planOptions.map((opt) => (
						<option key={opt.value} value={opt.value}>
							{opt.label}
						</option>
					))}
				</select>
			</div>

			<div className={styles.filterGroup} style={{ flex: 1 }}>
				<label className={styles.filterLabel}>Search</label>
				<input
					type="text"
					className={styles.searchInput}
					placeholder="Search by name or slug..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
			</div>
		</div>
	);
}
