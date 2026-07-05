// (c) Copyright Datacraft, 2026
import { motion } from 'framer-motion';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Tenant,
	useResetTenantAITokens,
	useTenant,
	useTenantActivity,
	useTenantAI,
	useTenantStorage,
	useTenantSubscription,
	useUpdateTenant,
	useVerifyTenantStorage,
} from '../api';
import styles from './TenantDetailPanel.module.css';

type Tab = 'overview' | 'storage' | 'ai' | 'subscription' | 'activity';

interface Props {
	tenant: Tenant;
	onClose: () => void;
}

export function TenantDetailPanel({ tenant, onClose }: Props) {
	const [activeTab, setActiveTab] = useState<Tab>('overview');

	const { data: tenantDetail } = useTenant(tenant.id);
	const { data: storage } = useTenantStorage(tenant.id);
	const { data: ai } = useTenantAI(tenant.id);
	const { data: subscription } = useTenantSubscription(tenant.id);
	const { data: activity = [], isLoading: activityLoading } = useTenantActivity(tenant.id);
	const recentActivity = [...activity]
		.sort((a, b) => getActivityDateValue(b) - getActivityDateValue(a))
		.slice(0, 10);

	const updateTenant = useUpdateTenant();
	const verifyStorage = useVerifyTenantStorage();
	const resetAITokens = useResetTenantAITokens();

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'overview', label: 'Overview' },
		{ id: 'storage', label: 'Storage' },
		{ id: 'ai', label: 'AI' },
		{ id: 'subscription', label: 'Plan' },
		{ id: 'activity', label: 'Activity' },
	];

	const statusConfig: Record<string, { color: string; label: string }> = {
		active: { color: '#4ade80', label: 'ACTIVE' },
		trial: { color: '#60a5fa', label: 'TRIAL' },
		suspended: { color: '#f87171', label: 'SUSPENDED' },
		cancelled: { color: '#6b7280', label: 'CANCELLED' },
	};

	const status = statusConfig[tenant.status] || statusConfig.cancelled;

	return (
		<motion.div
			className={styles.panel}
			initial={{ x: '100%', opacity: 0 }}
			animate={{ x: 0, opacity: 1 }}
			exit={{ x: '100%', opacity: 0 }}
			transition={{ type: 'spring', damping: 30, stiffness: 300 }}
		>
			{/* Header */}
			<div className={styles.header}>
				<button onClick={onClose} className={styles.closeBtn}>×</button>

				<div className={styles.headerContent}>
					<div className={styles.statusIndicator} style={{ background: status.color }} />
					<div className={styles.headerInfo}>
						<h2 className={styles.tenantName}>{tenant.name}</h2>
						<span className={styles.tenantSlug}>/{tenant.slug}</span>
					</div>
					<span className={styles.statusBadge} style={{ color: status.color, borderColor: status.color }}>
						{status.label}
					</span>
				</div>

				{/* Quick Actions */}
				<div className={styles.quickActions}>
					{tenant.status !== 'suspended' ? (
						<button
							onClick={() => updateTenant.mutate({ id: tenant.id, data: { status: 'suspended' } })}
							className={styles.actionBtnDanger}
							disabled={updateTenant.isPending}
						>
							Suspend
						</button>
					) : (
						<button
							onClick={() => updateTenant.mutate({ id: tenant.id, data: { status: 'active' } })}
							className={styles.actionBtnSuccess}
							disabled={updateTenant.isPending}
						>
							Activate
						</button>
					)}
				</div>
			</div>

			{/* Tabs */}
			<div className={styles.tabs}>
				{tabs.map((tab) => (
					<button
						key={tab.id}
						className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
						onClick={() => setActiveTab(tab.id)}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Content */}
			<div className={styles.content}>
				{activeTab === 'overview' && (
					<div className={styles.section}>
						<div className={styles.infoGrid}>
							<InfoItem label="Contact Email" value={tenantDetail?.contactEmail || '—'} />
							<InfoItem label="Billing Email" value={tenantDetail?.billingEmail || '—'} />
							<InfoItem label="Plan" value={tenant.plan} highlight />
							<InfoItem label="Max Users" value={tenant.maxUsers?.toString() || 'Unlimited'} />
							<InfoItem label="Storage Limit" value={tenant.maxStorageGb ? `${tenant.maxStorageGb} GB` : 'Unlimited'} />
							<InfoItem label="Created" value={new Date(tenant.createdAt).toLocaleDateString()} />
						</div>

						{/* Usage Meters */}
						<div className={styles.metersSection}>
							<h4 className={styles.sectionTitle}>Usage</h4>
							<div className={styles.meters}>
								<UsageMeter
									label="Storage"
									used={45}
									total={tenant.maxStorageGb || 100}
									unit="GB"
									color="#c9a227"
								/>
								<UsageMeter
									label="Users"
									used={8}
									total={tenant.maxUsers || 50}
									unit="users"
									color="#60a5fa"
								/>
							</div>
						</div>
					</div>
				)}

				{activeTab === 'storage' && (
					<div className={styles.section}>
						<div className={styles.infoGrid}>
							<InfoItem label="Provider" value={storage?.provider?.toUpperCase() || 'LOCAL'} highlight />
							<InfoItem label="Bucket" value={storage?.bucketName || '—'} />
							<InfoItem label="Region" value={storage?.region || '—'} />
							<InfoItem label="Base Path" value={storage?.basePath || '/'} />
							<InfoItem
								label="Status"
								value={storage?.isVerified ? 'Verified' : 'Not Verified'}
								valueColor={storage?.isVerified ? '#4ade80' : '#f87171'}
							/>
							<InfoItem label="Last Verified" value={storage?.lastVerifiedAt ? new Date(storage.lastVerifiedAt).toLocaleString() : 'Never'} />
						</div>

						<div className={styles.actionSection}>
							<button
								onClick={() => verifyStorage.mutate(tenant.id)}
								className={styles.actionBtn}
								disabled={verifyStorage.isPending}
							>
								{verifyStorage.isPending ? 'Verifying...' : 'Verify Connection'}
							</button>
						</div>
					</div>
				)}

				{activeTab === 'ai' && (
					<div className={styles.section}>
						<div className={styles.infoGrid}>
							<InfoItem label="Provider" value={ai?.provider || 'OpenAI'} highlight />
							<InfoItem label="Model" value={ai?.defaultModel || 'gpt-4o-mini'} />
							<InfoItem label="Embedding Model" value={ai?.embeddingModel || 'text-embedding-3-small'} />
						</div>

						{/* Token Usage */}
						<div className={styles.metersSection}>
							<h4 className={styles.sectionTitle}>Token Usage This Month</h4>
							<UsageMeter
								label="AI Tokens"
								used={ai?.tokensUsedThisMonth || 0}
								total={ai?.monthlyTokenLimit || 100000}
								unit="tokens"
								color="#a855f7"
								formatValue={(v) => `${(v / 1000).toFixed(1)}K`}
							/>
						</div>

						{/* Feature Toggles */}
						<div className={styles.featuresSection}>
							<h4 className={styles.sectionTitle}>Features</h4>
							<div className={styles.featureList}>
								<FeatureToggle label="Classification" enabled={ai?.classificationEnabled ?? true} />
								<FeatureToggle label="Extraction" enabled={ai?.extractionEnabled ?? true} />
								<FeatureToggle label="Summarization" enabled={ai?.summarizationEnabled ?? true} />
								<FeatureToggle label="Chat Assistant" enabled={ai?.chatEnabled ?? false} />
							</div>
						</div>

						<div className={styles.actionSection}>
							<button
								onClick={() => resetAITokens.mutate(tenant.id)}
								className={styles.actionBtn}
								disabled={resetAITokens.isPending}
							>
								{resetAITokens.isPending ? 'Resetting...' : 'Reset Token Count'}
							</button>
						</div>
					</div>
				)}

				{activeTab === 'subscription' && (
					<div className={styles.section}>
						<div className={styles.infoGrid}>
							<InfoItem label="Plan" value={subscription?.plan || 'Free'} highlight />
							<InfoItem label="Billing Cycle" value={subscription?.billingCycle || 'Monthly'} />
							<InfoItem
								label="Period End"
								value={subscription?.currentPeriodEnd ? new Date(subscription.currentPeriodEnd).toLocaleDateString() : '—'}
							/>
							<InfoItem
								label="Cancel at Period End"
								value={subscription?.cancelAtPeriodEnd ? 'Yes' : 'No'}
								valueColor={subscription?.cancelAtPeriodEnd ? '#f87171' : '#4ade80'}
							/>
						</div>

						<div className={styles.limitsSection}>
							<h4 className={styles.sectionTitle}>Plan Limits</h4>
							<div className={styles.limitsList}>
								<div className={styles.limitItem}>
									<span className={styles.limitLabel}>Max Users</span>
									<span className={styles.limitValue}>{subscription?.maxUsers ?? '∞'}</span>
								</div>
								<div className={styles.limitItem}>
									<span className={styles.limitLabel}>Max Storage</span>
									<span className={styles.limitValue}>{subscription?.maxStorageGb ? `${subscription.maxStorageGb} GB` : '∞'}</span>
								</div>
								<div className={styles.limitItem}>
									<span className={styles.limitLabel}>Max Documents</span>
									<span className={styles.limitValue}>{subscription?.maxDocuments ?? '∞'}</span>
								</div>
								<div className={styles.limitItem}>
									<span className={styles.limitLabel}>AI Tokens/Month</span>
									<span className={styles.limitValue}>{subscription?.aiTokensPerMonth ? `${(subscription.aiTokensPerMonth / 1000).toFixed(0)}K` : '∞'}</span>
								</div>
							</div>
						</div>
					</div>
				)}

				{activeTab === 'activity' && (
					<div className={styles.section}>
						{activityLoading ? (
							<div className={styles.activityList}>
								{Array.from({ length: 3 }).map((_, index) => (
									<div key={index} className={styles.activityItem}>
										<Skeleton className="h-2 w-2 rounded-full bg-primary/20" />
										<div className={styles.activityContent}>
											<Skeleton className="h-4 w-40 bg-primary/20" />
											<Skeleton className="h-3 w-56 bg-primary/20" />
										</div>
									</div>
								))}
							</div>
						) : recentActivity.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground text-sm">No recent activity</div>
						) : (
							<div className={styles.activityList}>
								{recentActivity.map((item, index) => (
									<ActivityItem
										key={item.id ?? `${item.action}-${item.timestamp ?? item.createdAt ?? index}`}
										action={item.action}
										user={item.userEmail ?? item.user ?? item.actor ?? 'Unknown user'}
										timestamp={formatActivityTimestamp(
											item.timestamp ?? item.occurredAt ?? item.createdAt
										)}
									/>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</motion.div>
	);
}

// Sub-components
function InfoItem({
	label,
	value,
	highlight,
	valueColor,
}: {
	label: string;
	value: string;
	highlight?: boolean;
	valueColor?: string;
}) {
	return (
		<div className={styles.infoItem}>
			<span className={styles.infoLabel}>{label}</span>
			<span
				className={`${styles.infoValue} ${highlight ? styles.highlight : ''}`}
				style={valueColor ? { color: valueColor } : undefined}
			>
				{value}
			</span>
		</div>
	);
}

function UsageMeter({
	label,
	used,
	total,
	unit,
	color,
	formatValue,
}: {
	label: string;
	used: number;
	total: number;
	unit: string;
	color: string;
	formatValue?: (v: number) => string;
}) {
	const percentage = Math.min((used / total) * 100, 100);
	const format = formatValue || ((v: number) => v.toString());

	return (
		<div className={styles.meter}>
			<div className={styles.meterHeader}>
				<span className={styles.meterLabel}>{label}</span>
				<span className={styles.meterValue}>
					{format(used)} / {format(total)} {unit}
				</span>
			</div>
			<div className={styles.meterTrack}>
				<motion.div
					className={styles.meterFill}
					style={{ background: color }}
					initial={{ width: 0 }}
					animate={{ width: `${percentage}%` }}
					transition={{ duration: 0.8, ease: 'easeOut' }}
				/>
			</div>
			<span className={styles.meterPercentage} style={{ color }}>
				{percentage.toFixed(1)}%
			</span>
		</div>
	);
}

function FeatureToggle({ label, enabled }: { label: string; enabled: boolean }) {
	return (
		<div className={styles.featureItem}>
			<span className={styles.featureLabel}>{label}</span>
			<span
				className={styles.featureStatus}
				style={{ color: enabled ? '#4ade80' : '#6b7280' }}
			>
				{enabled ? 'Enabled' : 'Disabled'}
			</span>
		</div>
	);
}

function formatActivityTimestamp(timestamp?: string) {
	if (!timestamp) return '—';

	const date = new Date(timestamp);
	if (Number.isNaN(date.getTime())) return timestamp;

	return date.toLocaleString();
}

function getActivityDateValue(item: {
	timestamp?: string;
	occurredAt?: string;
	createdAt?: string;
}) {
	const timestamp = item.timestamp ?? item.occurredAt ?? item.createdAt;
	if (!timestamp) return 0;

	const value = new Date(timestamp).getTime();
	return Number.isNaN(value) ? 0 : value;
}

function ActivityItem({
	action,
	user,
	timestamp,
}: {
	action: string;
	user: string;
	timestamp: string;
}) {
	return (
		<div className={styles.activityItem}>
			<div className={styles.activityDot} />
			<div className={styles.activityContent}>
				<span className={styles.activityAction}>{action}</span>
				<span className={styles.activityMeta}>
					<span className={styles.activityUser}>{user}</span>
					<span className={styles.activityTime}>{timestamp}</span>
				</span>
			</div>
		</div>
	);
}

export default TenantDetailPanel;
