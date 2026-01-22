// (c) Copyright Datacraft, 2026
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	useTenants,
	Tenant,
} from '../api';
import { TenantProvisionWizard } from './TenantProvisionWizard';
import { TenantDetailPanel } from './TenantDetailPanel';
import styles from './TenantManagement.module.css';

type View = 'dashboard' | 'provision';

export function TenantManagement() {
	const [view, setView] = useState<View>('dashboard');
	const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<string>('all');

	const { data: tenantsData, isLoading } = useTenants();

	const stats = useMemo(() => {
		const tenants = tenantsData?.items || [];
		return {
			total: tenants.length,
			active: tenants.filter(t => t.status === 'active').length,
			trial: tenants.filter(t => t.status === 'trial').length,
			suspended: tenants.filter(t => t.status === 'suspended').length,
		};
	}, [tenantsData]);

	const filteredTenants = useMemo(() => {
		let tenants = tenantsData?.items || [];

		if (statusFilter !== 'all') {
			tenants = tenants.filter(t => t.status === statusFilter);
		}

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			tenants = tenants.filter(t =>
				t.name.toLowerCase().includes(query) ||
				t.slug.toLowerCase().includes(query) ||
				t.contactEmail?.toLowerCase().includes(query)
			);
		}

		return tenants;
	}, [tenantsData, statusFilter, searchQuery]);

	return (
		<div className={styles.container}>
			{/* Background grid effect */}
			<div className={styles.gridOverlay} />

			{/* Header */}
			<header className={styles.header}>
				<div className={styles.headerLeft}>
					<div className={styles.systemBadge}>
						<span className={styles.systemDot} />
						SYSTEM ADMIN
					</div>
					<h1 className={styles.title}>Tenant Control Center</h1>
					<p className={styles.subtitle}>Provision and manage customer organizations</p>
				</div>
				<div className={styles.headerRight}>
					<div className={styles.timestamp}>
						<span className={styles.timestampLabel}>SESSION</span>
						<span className={styles.timestampValue}>{new Date().toLocaleTimeString()}</span>
					</div>
				</div>
			</header>

			{/* Stats Dashboard */}
			<motion.div
				className={styles.statsBar}
				initial={{ opacity: 0, y: -20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<StatCard label="TOTAL TENANTS" value={stats.total} color="amber" />
				<StatCard label="ACTIVE" value={stats.active} color="green" pulse />
				<StatCard label="TRIAL" value={stats.trial} color="blue" />
				<StatCard label="SUSPENDED" value={stats.suspended} color="red" />

				<button
					className={styles.provisionBtn}
					onClick={() => setView('provision')}
				>
					<span className={styles.provisionIcon}>+</span>
					<span>PROVISION NEW</span>
				</button>
			</motion.div>

			{/* Main Content Area */}
			<div className={styles.mainArea}>
				<AnimatePresence mode="wait">
					{view === 'dashboard' && (
						<motion.div
							key="dashboard"
							className={styles.dashboard}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							{/* Search and Filter Bar */}
							<div className={styles.controlBar}>
								<div className={styles.searchBox}>
									<span className={styles.searchIcon}>⌕</span>
									<input
										type="text"
										placeholder="Search tenants..."
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										className={styles.searchInput}
									/>
								</div>

								<div className={styles.filterGroup}>
									{['all', 'active', 'trial', 'suspended'].map((status) => (
										<button
											key={status}
											className={`${styles.filterBtn} ${statusFilter === status ? styles.active : ''}`}
											onClick={() => setStatusFilter(status)}
										>
											{status.toUpperCase()}
										</button>
									))}
								</div>
							</div>

							{/* Tenant Grid */}
							<div className={styles.tenantGrid}>
								{isLoading ? (
									<div className={styles.loadingState}>
										<div className={styles.spinner} />
										<span>Loading tenant data...</span>
									</div>
								) : filteredTenants.length === 0 ? (
									<div className={styles.emptyState}>
										<span className={styles.emptyIcon}>◇</span>
										<p>No tenants found</p>
									</div>
								) : (
									filteredTenants.map((tenant, index) => (
										<TenantCard
											key={tenant.id}
											tenant={tenant}
											index={index}
											onClick={() => setSelectedTenant(tenant)}
											isSelected={selectedTenant?.id === tenant.id}
										/>
									))
								)}
							</div>
						</motion.div>
					)}

					{view === 'provision' && (
						<motion.div
							key="provision"
							initial={{ opacity: 0, x: 50 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -50 }}
						>
							<TenantProvisionWizard
								onComplete={() => setView('dashboard')}
								onCancel={() => setView('dashboard')}
							/>
						</motion.div>
					)}
				</AnimatePresence>

				{/* Detail Panel */}
				<AnimatePresence>
					{selectedTenant && view === 'dashboard' && (
						<TenantDetailPanel
							tenant={selectedTenant}
							onClose={() => setSelectedTenant(null)}
						/>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
}

// Stat Card Component
function StatCard({
	label,
	value,
	color,
	pulse
}: {
	label: string;
	value: number;
	color: 'amber' | 'green' | 'blue' | 'red';
	pulse?: boolean;
}) {
	const colorMap = {
		amber: '#c9a227',
		green: '#4ade80',
		blue: '#60a5fa',
		red: '#f87171',
	};

	return (
		<div className={styles.statCard}>
			<div className={styles.statHeader}>
				<span
					className={`${styles.statIndicator} ${pulse ? styles.pulse : ''}`}
					style={{ background: colorMap[color] }}
				/>
				<span className={styles.statLabel}>{label}</span>
			</div>
			<span className={styles.statValue} style={{ color: colorMap[color] }}>
				{value}
			</span>
		</div>
	);
}

// Tenant Card Component
function TenantCard({
	tenant,
	index,
	onClick,
	isSelected,
}: {
	tenant: Tenant;
	index: number;
	onClick: () => void;
	isSelected: boolean;
}) {
	const statusConfig: Record<string, { color: string; bg: string }> = {
		active: { color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)' },
		trial: { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)' },
		suspended: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)' },
		cancelled: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)' },
	};

	const config = statusConfig[tenant.status] || statusConfig.cancelled;

	return (
		<motion.div
			className={`${styles.tenantCard} ${isSelected ? styles.selected : ''}`}
			onClick={onClick}
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: index * 0.05 }}
			whileHover={{ scale: 1.02 }}
			whileTap={{ scale: 0.98 }}
		>
			{/* Corner accent */}
			<div className={styles.cardCorner} style={{ borderColor: config.color }} />

			<div className={styles.cardHeader}>
				<h3 className={styles.cardTitle}>{tenant.name}</h3>
				<span
					className={styles.statusBadge}
					style={{ color: config.color, background: config.bg }}
				>
					{tenant.status}
				</span>
			</div>

			<div className={styles.cardSlug}>/{tenant.slug}</div>

			<div className={styles.cardMeta}>
				<div className={styles.metaItem}>
					<span className={styles.metaLabel}>PLAN</span>
					<span className={styles.metaValue}>{tenant.plan}</span>
				</div>
				<div className={styles.metaItem}>
					<span className={styles.metaLabel}>USERS</span>
					<span className={styles.metaValue}>{tenant.maxUsers ?? '∞'}</span>
				</div>
				<div className={styles.metaItem}>
					<span className={styles.metaLabel}>STORAGE</span>
					<span className={styles.metaValue}>{tenant.maxStorageGb ? `${tenant.maxStorageGb}GB` : '∞'}</span>
				</div>
			</div>

			<div className={styles.cardFooter}>
				<span className={styles.cardDate}>
					Created {new Date(tenant.createdAt).toLocaleDateString()}
				</span>
				<span className={styles.cardArrow}>→</span>
			</div>
		</motion.div>
	);
}

export default TenantManagement;
