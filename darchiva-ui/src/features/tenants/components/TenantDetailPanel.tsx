// (c) Copyright Datacraft, 2026
import { useState, useEffect } from 'react';
import type {
	TenantDetail,
	TenantUsage,
	TenantBranding,
	TenantSettings,
	BrandingUpdate,
	SettingsUpdate,
	TenantUpdate,
} from '../types';
import { TenantStatusBadge } from './TenantStatusBadge';
import { TenantUsageStats } from './TenantUsageStats';
import { TenantBrandingEditor } from './TenantBrandingEditor';
import { TenantSettingsEditor } from './TenantSettingsEditor';
import { TenantUsersList } from './TenantUsersList';
import styles from '../tenants.module.css';

type TabId = 'overview' | 'usage' | 'branding' | 'settings' | 'users';

interface TenantDetailPanelProps {
	tenant: TenantDetail;
	usage?: TenantUsage;
	onUpdate: (data: TenantUpdate) => Promise<void>;
	onUpdateBranding: (data: BrandingUpdate) => Promise<void>;
	onUpdateSettings: (data: SettingsUpdate) => Promise<void>;
	onClose: () => void;
}

function getInitials(name: string): string {
	return name
		.split(' ')
		.map((w) => w[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

const tabs: { id: TabId; label: string }[] = [
	{ id: 'overview', label: 'Overview' },
	{ id: 'usage', label: 'Usage' },
	{ id: 'branding', label: 'Branding' },
	{ id: 'settings', label: 'Settings' },
	{ id: 'users', label: 'Users' },
];

export function TenantDetailPanel({
	tenant,
	usage,
	onUpdate,
	onUpdateBranding,
	onUpdateSettings,
	onClose,
}: TenantDetailPanelProps) {
	const [activeTab, setActiveTab] = useState<TabId>('overview');
	const [editing, setEditing] = useState(false);
	const [formData, setFormData] = useState({
		name: tenant.name,
		contact_email: tenant.contact_email || '',
		contact_phone: tenant.contact_phone || '',
		billing_email: tenant.billing_email || '',
		custom_domain: tenant.custom_domain || '',
	});

	const handleSaveOverview = async () => {
		await onUpdate(formData);
		setEditing(false);
	};

	return (
		<div className={styles.detailPanel}>
			{/* Header */}
			<div className={styles.detailHeader}>
				<div className={styles.detailTitle}>
					<div className={styles.detailAvatar}>{getInitials(tenant.name)}</div>
					<div>
						<h2>{tenant.name}</h2>
						<p>
							<span className={styles.tenantSlug}>{tenant.slug}</span> · Created{' '}
							{new Date(tenant.created_at).toLocaleDateString()}
						</p>
					</div>
				</div>
				<div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
					<TenantStatusBadge status={tenant.status} />
					<button className={styles.iconButton} onClick={onClose} title="Close">
						<svg
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
						>
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					</button>
				</div>
			</div>

			{/* Tabs */}
			<div className={styles.tabs}>
				{tabs.map((tab) => (
					<button
						key={tab.id}
						className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
						onClick={() => setActiveTab(tab.id)}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Tab Content */}
			<div className={styles.tabContent}>
				{activeTab === 'overview' && (
					<div>
						<div className={styles.section}>
							<div
								style={{
									display: 'flex',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<h3 className={styles.sectionTitle}>Organization Details</h3>
								{!editing && (
									<button
										className={styles.secondaryButton}
										onClick={() => setEditing(true)}
									>
										Edit
									</button>
								)}
							</div>

							<div className={styles.formGrid}>
								<div className={styles.formGroup}>
									<label className={styles.formLabel}>Organization Name</label>
									{editing ? (
										<input
											type="text"
											className={styles.formInput}
											value={formData.name}
											onChange={(e) =>
												setFormData({ ...formData, name: e.target.value })
											}
										/>
									) : (
										<p style={{ margin: 0, color: 'var(--ink)' }}>{tenant.name}</p>
									)}
								</div>

								<div className={styles.formGroup}>
									<label className={styles.formLabel}>Slug</label>
									<p
										style={{
											margin: 0,
											color: 'var(--ink-muted)',
											fontFamily: "'JetBrains Mono', monospace",
										}}
									>
										{tenant.slug}
									</p>
								</div>

								<div className={styles.formGroup}>
									<label className={styles.formLabel}>Contact Email</label>
									{editing ? (
										<input
											type="email"
											className={styles.formInput}
											value={formData.contact_email}
											onChange={(e) =>
												setFormData({ ...formData, contact_email: e.target.value })
											}
											placeholder="contact@example.com"
										/>
									) : (
										<p style={{ margin: 0, color: 'var(--ink)' }}>
											{tenant.contact_email || '—'}
										</p>
									)}
								</div>

								<div className={styles.formGroup}>
									<label className={styles.formLabel}>Contact Phone</label>
									{editing ? (
										<input
											type="tel"
											className={styles.formInput}
											value={formData.contact_phone}
											onChange={(e) =>
												setFormData({ ...formData, contact_phone: e.target.value })
											}
											placeholder="+1 (555) 000-0000"
										/>
									) : (
										<p style={{ margin: 0, color: 'var(--ink)' }}>
											{tenant.contact_phone || '—'}
										</p>
									)}
								</div>

								<div className={styles.formGroup}>
									<label className={styles.formLabel}>Billing Email</label>
									{editing ? (
										<input
											type="email"
											className={styles.formInput}
											value={formData.billing_email}
											onChange={(e) =>
												setFormData({ ...formData, billing_email: e.target.value })
											}
											placeholder="billing@example.com"
										/>
									) : (
										<p style={{ margin: 0, color: 'var(--ink)' }}>
											{tenant.billing_email || '—'}
										</p>
									)}
								</div>

								<div className={styles.formGroup}>
									<label className={styles.formLabel}>Custom Domain</label>
									{editing ? (
										<input
											type="text"
											className={styles.formInput}
											value={formData.custom_domain}
											onChange={(e) =>
												setFormData({ ...formData, custom_domain: e.target.value })
											}
											placeholder="docs.company.com"
										/>
									) : (
										<p style={{ margin: 0, color: 'var(--ink)' }}>
											{tenant.custom_domain || '—'}
										</p>
									)}
								</div>
							</div>

							{editing && (
								<div
									style={{
										display: 'flex',
										gap: '0.75rem',
										marginTop: '1.5rem',
									}}
								>
									<button className={styles.primaryButton} onClick={handleSaveOverview}>
										Save Changes
									</button>
									<button
										className={styles.secondaryButton}
										onClick={() => setEditing(false)}
									>
										Cancel
									</button>
								</div>
							)}
						</div>

						<div className={styles.section}>
							<h3 className={styles.sectionTitle}>Plan & Limits</h3>
							<div className={styles.statsGrid}>
								<div className={styles.statCard}>
									<div className={styles.statLabel}>Current Plan</div>
									<div className={styles.statValue} style={{ textTransform: 'capitalize' }}>
										{tenant.plan}
									</div>
								</div>
								<div className={styles.statCard}>
									<div className={styles.statLabel}>User Limit</div>
									<div className={styles.statValue}>
										{tenant.max_users || '∞'}
									</div>
								</div>
								<div className={styles.statCard}>
									<div className={styles.statLabel}>Storage Limit</div>
									<div className={styles.statValue}>
										{tenant.max_storage_gb ? `${tenant.max_storage_gb} GB` : '∞'}
									</div>
								</div>
								{tenant.trial_ends_at && (
									<div className={styles.statCard}>
										<div className={styles.statLabel}>Trial Ends</div>
										<div className={styles.statValue}>
											{new Date(tenant.trial_ends_at).toLocaleDateString()}
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{activeTab === 'usage' && <TenantUsageStats tenant={tenant} usage={usage} />}

				{activeTab === 'branding' && (
					<TenantBrandingEditor
						branding={tenant.branding}
						onSave={onUpdateBranding}
					/>
				)}

				{activeTab === 'settings' && (
					<TenantSettingsEditor
						settings={tenant.settings}
						onSave={onUpdateSettings}
					/>
				)}

				{activeTab === 'users' && <TenantUsersList tenantId={tenant.id} />}
			</div>
		</div>
	);
}
