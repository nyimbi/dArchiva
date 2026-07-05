// (c) Copyright Datacraft, 2026
import { useCallback,useEffect,useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  activateTenant,
  deleteTenant,
  getTenant,
  listTenants,
  suspendTenant,
  updateTenantBranding,
  updateTenantSettings,
  updateTenant,
} from '../api';
import styles from '../tenants.module.css';
import type { BrandingUpdate,SettingsUpdate,Tenant,TenantDetail,TenantStatus,TenantUpdate } from '../types';
import { TenantCreationWizard } from './TenantCreationWizard';
import { TenantDetailPanel } from './TenantDetailPanel';
import { TenantFilters } from './TenantFilters';
import { TenantTable } from './TenantTable';

type ViewMode = 'list' | 'detail' | 'create';

export function TenantsPage() {
	const [viewMode, setViewMode] = useState<ViewMode>('list');
	const [tenants, setTenants] = useState<Tenant[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedTenant, setSelectedTenant] = useState<TenantDetail | null>(null);
	const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

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
			toast.error(err instanceof Error ? err.message : 'Failed to load tenants');
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
			toast.error(err instanceof Error ? err.message : 'Failed to load tenant details');
		}
	};

	const handleSuspendTenant = async (tenant: Tenant) => {
		setConfirmDialog({
			message: `Suspend ${tenant.name}? Users will not be able to access this organization.`,
			onConfirm: async () => {
				try {
					await suspendTenant(tenant.id);
					await loadTenants();
				} catch (err) {
					toast.error(err instanceof Error ? err.message : 'Failed to suspend tenant');
				}
			},
		});
	};

	const handleActivateTenant = async (tenant: Tenant) => {
		setConfirmDialog({
			message: `Activate ${tenant.name}? Users will be able to access this organization.`,
			onConfirm: async () => {
				try {
					await activateTenant(tenant.id);
					await loadTenants();
				} catch (err) {
					toast.error(err instanceof Error ? err.message : 'Failed to activate tenant');
				}
			},
		});
	};

	const handleDeleteTenant = async (tenant: Tenant) => {
		setConfirmDialog({
			message: `Delete ${tenant.name}? This action cannot be undone.`,
			onConfirm: async () => {
				try {
					await deleteTenant(tenant.id);
					await loadTenants();
				} catch (err) {
					toast.error(err instanceof Error ? err.message : 'Failed to delete tenant');
				}
			},
		});
	};

	const handleUpdateTenant = async (data: TenantUpdate) => {
		if (!selectedTenant) return;
		try {
			const updated = await updateTenant(selectedTenant.id, data);
			setSelectedTenant(updated);
			await loadTenants();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update tenant');
		}
	};

	const handleUpdateBranding = async (data: BrandingUpdate) => {
		if (!selectedTenant) return;
		try {
			await updateTenantBranding(selectedTenant.id, data);
			const updated = await getTenant(selectedTenant.id);
			setSelectedTenant(updated);
		} catch (err) {
			throw err instanceof Error ? err : new Error('Failed to update branding');
		}
	};

	const handleUpdateSettings = async (data: SettingsUpdate) => {
		if (!selectedTenant) return;
		try {
			await updateTenantSettings(selectedTenant.id, data);
			const updated = await getTenant(selectedTenant.id);
			setSelectedTenant(updated);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : 'Failed to update settings');
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
			<AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm</AlertDialogTitle>
						<AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}
							className="bg-red-600 hover:bg-red-700"
						>
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
