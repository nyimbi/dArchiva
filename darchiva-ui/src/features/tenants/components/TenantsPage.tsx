// (c) Copyright Datacraft, 2026
import { useState, useEffect, useCallback } from 'react';
import type { Tenant, TenantStatus, TenantDetail, TenantUsage, TenantUpdate, BrandingUpdate, SettingsUpdate } from '../types';
import {
	listTenants,
	getTenant,
	updateTenant,
	suspendTenant,
	activateTenant,
	deleteTenant,
	updateCurrentTenantBranding,
	updateCurrentTenantSettings,
} from '../api';
import { TenantTable } from './TenantTable';
import { TenantFilters } from './TenantFilters';
import { TenantDetailPanel } from './TenantDetailPanel';
import { TenantCreationWizard } from './TenantCreationWizard';
import styles from '../tenants.module.css';

type ViewMode = 'list' | 'detail' | 'create';

export function TenantsPage() {
	const [viewMode, setViewMode] = useState<ViewMode>('list');
	const [tenants, setTenants] = useState<Tenant[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);

	// Filters
	const [statusFilter, setStatusFilter] = useState<TenantStatus | ''>('');
	const [planFilter, setPlanFilter] = useState('');
	const [searchQuery, setSearchQuery] = useState('');

	// Pagination
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const pageSize = 20;

	const loadTenants = useCallback(async () => {
		setLoading(true);
		try {
			const response = await listTenants(page, pageSize, statusFilter || undefined);
			setTenants(response.items);
			setTotal(response.total);
		} catch (err) {
			console.error('Failed to load tenants:', err);
		} finally {
			setLoading(false);
		}
	}, [page, statusFilter]);

	useEffect(() => {
		loadTenants();
	}, [loadTenants]);

	const handleSelectTenant = async (tenant: Tenant) => {
		try {
			const detail = await getTenant(tenant.id);
			setSelectedTenant(detail);
			setViewMode('detail');
		} catch (err) {
			console.error('Failed to load tenant details:', err);
		}
	};

	const handleSuspendTenant = async (tenant: Tenant) => {
		if (!confirm(`Suspend ${tenant.name}? Users will not be able to access this organization.`)) {
			return;
		}
		try {
			await suspendTenant(tenant.id);
			await loadTenants();
		} catch (err) {
			console.error('Failed to suspend tenant:', err);
		}
	};

	const handleActivateTenant = async (tenant: Tenant) => {
		try {
			await activateTenant(tenant.id);
			await loadTenants();
		} catch (err) {
			console.error('Failed to activate tenant:', err);
		}
	};

	const handleDeleteTenant = async (tenant: Tenant) => {
		if (!confirm(`Delete ${tenant.name}? This action cannot be undone.`)) {
			return;
		}
		try {
			await deleteTenant(tenant.id);
			await loadTenants();
		} catch (err) {
			console.error('Failed to delete tenant:', err);
		}
	};

	const handleUpdateTenant = async (data: TenantUpdate) => {
		if (!selectedTenant) return;
		try {
			const updated = await updateTenant(selectedTenant.id, data);
			setSelectedTenant(updated);
			await loadTenants();
		} catch (err) {
			console.error('Failed to update tenant:', err);
		}
	};

	const handleUpdateBranding = async (data: BrandingUpdate) => {
		if (!selectedTenant) return;
		try {
			await updateCurrentTenantBranding(data);
			const updated = await getTenant(selectedTenant.id);
			setSelectedTenant(updated);
		} catch (err) {
			console.error('Failed to update branding:', err);
		}
	};

	const handleUpdateSettings = async (data: SettingsUpdate) => {
		if (!selectedTenant) return;
		try {
			await updateCurrentTenantSettings(data);
			const updated = await getTenant(selectedTenant.id);
			setSelectedTenant(updated);
		} catch (err) {
			console.error('Failed to update settings:', err);
		}
	};

	const handleCreateComplete = () => {
		setViewMode('list');
		loadTenants();
	};

	// Filter tenants locally
	const filteredTenants = tenants.filter((t) => {
		if (planFilter && t.plan !== planFilter) return false;
		if (searchQuery) {
			const q = searchQuery.toLowerCase();
			return (
				t.name.toLowerCase().includes(q) ||
				t.slug.toLowerCase().includes(q) ||
				t.contact_email?.toLowerCase().includes(q)
			);
		}
		return true;
	});

	return (
		<div className={styles.tenantsPage}>
			{viewMode === 'list' && (
				<>
					<div className={styles.pageHeader}>
						<div>
							<h1 className={styles.pageTitle}>Organizations</h1>
							<p className={styles.pageSubtitle}>
								{total} organization{total !== 1 ? 's' : ''} registered
							</p>
						</div>
						<button
							className={styles.primaryButton}
							onClick={() => setViewMode('create')}
						>
							<svg
								width="16"
								height="16"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
							>
								<line x1="12" y1="5" x2="12" y2="19" />
								<line x1="5" y1="12" x2="19" y2="12" />
							</svg>
							New Organization
						</button>
					</div>

					<TenantFilters
						statusFilter={statusFilter}
						planFilter={planFilter}
						searchQuery={searchQuery}
						onStatusChange={setStatusFilter}
						onPlanChange={setPlanFilter}
						onSearchChange={setSearchQuery}
					/>

					<TenantTable
						tenants={filteredTenants}
						loading={loading}
						onSelect={handleSelectTenant}
						onSuspend={handleSuspendTenant}
						onActivate={handleActivateTenant}
						onDelete={handleDeleteTenant}
					/>

					{/* Pagination */}
					{total > pageSize && (
						<div
							style={{
								display: 'flex',
								justifyContent: 'center',
								gap: '0.5rem',
								marginTop: '1.5rem',
							}}
						>
							<button
								className={styles.secondaryButton}
								disabled={page === 1}
								onClick={() => setPage((p) => p - 1)}
							>
								Previous
							</button>
							<span
								style={{
									padding: '0.625rem 1rem',
									color: 'var(--ink-muted)',
								}}
							>
								Page {page} of {Math.ceil(total / pageSize)}
							</span>
							<button
								className={styles.secondaryButton}
								disabled={page >= Math.ceil(total / pageSize)}
								onClick={() => setPage((p) => p + 1)}
							>
								Next
							</button>
						</div>
					)}
				</>
			)}

			{viewMode === 'detail' && selectedTenant && (
				<>
					<button
						className={styles.secondaryButton}
						onClick={() => setViewMode('list')}
						style={{ marginBottom: '1.5rem' }}
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<line x1="19" y1="12" x2="5" y2="12" />
							<polyline points="12 19 5 12 12 5" />
						</svg>
						Back to Organizations
					</button>
					<TenantDetailPanel
						tenant={selectedTenant}
						onUpdate={handleUpdateTenant}
						onUpdateBranding={handleUpdateBranding}
						onUpdateSettings={handleUpdateSettings}
						onClose={() => setViewMode('list')}
					/>
				</>
			)}

			{viewMode === 'create' && (
				<>
					<button
						className={styles.secondaryButton}
						onClick={() => setViewMode('list')}
						style={{ marginBottom: '1.5rem' }}
					>
						<svg
							width="16"
							height="16"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<line x1="19" y1="12" x2="5" y2="12" />
							<polyline points="12 19 5 12 12 5" />
						</svg>
						Back to Organizations
					</button>
					<TenantCreationWizard
						onComplete={handleCreateComplete}
						onCancel={() => setViewMode('list')}
					/>
				</>
			)}
		</div>
	);
}
