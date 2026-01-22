// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
	PhysicalContainer,
	useContainerCustodyHistory,
	useContainerDocuments,
	useVerifyContainer,
	useMoveContainer,
	useCheckoutContainer,
	useCheckinContainer,
	useGenerateQRCode,
} from '../api';
import styles from './ContainerDetail.module.css';

interface Props {
	container: PhysicalContainer;
	onClose: () => void;
}

type Tab = 'details' | 'documents' | 'custody' | 'actions';

export function ContainerDetail({ container, onClose }: Props) {
	const [activeTab, setActiveTab] = useState<Tab>('details');

	const { data: custodyHistory = [] } = useContainerCustodyHistory(container.id);
	const { data: documents = [] } = useContainerDocuments(container.id);
	const verifyContainer = useVerifyContainer();
	const moveContainer = useMoveContainer();
	const checkoutContainer = useCheckoutContainer();
	const checkinContainer = useCheckinContainer();
	const generateQRCode = useGenerateQRCode();

	const statusConfig: Record<string, { color: string; label: string }> = {
		in_storage: { color: '#4ade80', label: 'IN STORAGE' },
		checked_out: { color: '#60a5fa', label: 'CHECKED OUT' },
		in_transit: { color: '#fbbf24', label: 'IN TRANSIT' },
		missing: { color: '#f87171', label: 'MISSING' },
		destroyed: { color: '#6b7280', label: 'DESTROYED' },
		transferred: { color: '#a78bfa', label: 'TRANSFERRED' },
		pending_review: { color: '#fb923c', label: 'PENDING REVIEW' },
	};

	const status = statusConfig[container.status] || statusConfig.in_storage;

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'details', label: 'Details' },
		{ id: 'documents', label: `Documents (${documents.length})` },
		{ id: 'custody', label: 'Custody' },
		{ id: 'actions', label: 'Actions' },
	];

	const handleVerify = async () => {
		await verifyContainer.mutateAsync(container.id);
	};

	const handleDownloadQR = async () => {
		const blob = await generateQRCode.mutateAsync({
			documentId: container.barcode,
			format: 'compact',
			size: 300,
			includeLabel: true,
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `qr_${container.barcode}.png`;
		a.click();
		URL.revokeObjectURL(url);
	};

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
						<h2 className={styles.barcode}>{container.barcode}</h2>
						{container.label && <span className={styles.label}>{container.label}</span>}
					</div>
					<span
						className={styles.statusBadge}
						style={{ color: status.color, borderColor: status.color }}
					>
						{status.label}
					</span>
				</div>

				{container.legalHold && (
					<div className={styles.legalHoldBanner}>
						<span>⛔</span> LEGAL HOLD - This container cannot be modified
					</div>
				)}
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
				{activeTab === 'details' && (
					<div className={styles.section}>
						<div className={styles.infoGrid}>
							<InfoItem label="Type" value={container.containerType.toUpperCase()} highlight />
							<InfoItem label="Items" value={container.itemCount.toString()} />
							<InfoItem
								label="Weight"
								value={container.weightKg ? `${container.weightKg} kg` : '—'}
							/>
							{container.dimensions && (
								<InfoItem
									label="Dimensions"
									value={`${container.dimensions.width}×${container.dimensions.height}×${container.dimensions.depth} cm`}
								/>
							)}
							<InfoItem
								label="Created"
								value={new Date(container.createdAt).toLocaleDateString()}
							/>
							<InfoItem
								label="Last Verified"
								value={
									container.lastVerifiedAt
										? new Date(container.lastVerifiedAt).toLocaleString()
										: 'Never'
								}
							/>
							{container.retentionDate && (
								<InfoItem
									label="Retention Date"
									value={new Date(container.retentionDate).toLocaleDateString()}
									valueColor={
										new Date(container.retentionDate) < new Date() ? '#f87171' : undefined
									}
								/>
							)}
							<InfoItem
								label="Destruction Eligible"
								value={container.destructionEligible ? 'Yes' : 'No'}
								valueColor={container.destructionEligible ? '#fb923c' : '#4ade80'}
							/>
						</div>

						{container.description && (
							<div className={styles.descriptionSection}>
								<h4 className={styles.sectionTitle}>Description</h4>
								<p className={styles.description}>{container.description}</p>
							</div>
						)}

						<div className={styles.quickActions}>
							<button
								className={styles.actionBtn}
								onClick={handleVerify}
								disabled={verifyContainer.isPending || container.legalHold}
							>
								{verifyContainer.isPending ? 'Verifying...' : '✓ Verify Inventory'}
							</button>
							<button
								className={styles.actionBtn}
								onClick={handleDownloadQR}
								disabled={generateQRCode.isPending}
							>
								{generateQRCode.isPending ? 'Generating...' : '⬇ Download QR'}
							</button>
						</div>
					</div>
				)}

				{activeTab === 'documents' && (
					<div className={styles.section}>
						{documents.length === 0 ? (
							<div className={styles.emptyState}>
								<span className={styles.emptyIcon}>▤</span>
								<p>No documents in this container</p>
							</div>
						) : (
							<div className={styles.documentList}>
								{documents.map((doc) => (
									<div key={doc.id} className={styles.documentItem}>
										<div className={styles.docNumber}>
											{doc.sequenceNumber !== undefined ? `#${doc.sequenceNumber}` : '—'}
										</div>
										<div className={styles.docInfo}>
											<span className={styles.docId}>{doc.documentId}</span>
											<span className={styles.docMeta}>
												{doc.pageCount ? `${doc.pageCount} pages` : 'Unknown pages'}
												{' · '}
												{doc.hasPhysical ? 'Physical exists' : 'Digital only'}
											</span>
										</div>
										<span
											className={styles.docVerified}
											style={{ color: doc.verified ? '#4ade80' : '#f87171' }}
										>
											{doc.verified ? '✓' : '○'}
										</span>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{activeTab === 'custody' && (
					<div className={styles.section}>
						{custodyHistory.length === 0 ? (
							<div className={styles.emptyState}>
								<span className={styles.emptyIcon}>⟳</span>
								<p>No custody events recorded</p>
							</div>
						) : (
							<div className={styles.custodyTimeline}>
								{custodyHistory.map((event, index) => (
									<div key={event.id} className={styles.custodyEvent}>
										<div className={styles.eventLine}>
											<div className={styles.eventDot} />
											{index < custodyHistory.length - 1 && (
												<div className={styles.eventConnector} />
											)}
										</div>
										<div className={styles.eventContent}>
											<span className={styles.eventType}>
												{event.eventType.replace('_', ' ').toUpperCase()}
											</span>
											<span className={styles.eventTime}>
												{new Date(event.createdAt).toLocaleString()}
											</span>
											{event.reason && (
												<span className={styles.eventReason}>{event.reason}</span>
											)}
											{event.notes && (
												<span className={styles.eventNotes}>{event.notes}</span>
											)}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{activeTab === 'actions' && (
					<div className={styles.section}>
						<div className={styles.actionsGrid}>
							{container.status === 'in_storage' && (
								<ActionCard
									icon="↗"
									title="Check Out"
									description="Assign container to a person"
									disabled={container.legalHold}
									onClick={() => {
										// Would open checkout modal
									}}
								/>
							)}

							{container.status === 'checked_out' && (
								<ActionCard
									icon="↙"
									title="Check In"
									description="Return container to storage"
									onClick={() => {
										// Would open checkin modal
									}}
								/>
							)}

							<ActionCard
								icon="↔"
								title="Move"
								description="Transfer to different location"
								disabled={container.legalHold}
								onClick={() => {
									// Would open move modal
								}}
							/>

							<ActionCard
								icon="✓"
								title="Verify"
								description="Mark as physically verified"
								disabled={container.legalHold}
								onClick={handleVerify}
								loading={verifyContainer.isPending}
							/>

							<ActionCard
								icon="⬇"
								title="Print Label"
								description="Generate barcode label sheet"
								onClick={handleDownloadQR}
								loading={generateQRCode.isPending}
							/>

							{!container.legalHold && (
								<ActionCard
									icon="⛔"
									title="Legal Hold"
									description="Place under legal hold"
									variant="danger"
									onClick={() => {
										// Would toggle legal hold
									}}
								/>
							)}

							{container.legalHold && (
								<ActionCard
									icon="✓"
									title="Release Hold"
									description="Remove legal hold status"
									variant="success"
									onClick={() => {
										// Would release legal hold
									}}
								/>
							)}
						</div>
					</div>
				)}
			</div>
		</motion.div>
	);
}

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

function ActionCard({
	icon,
	title,
	description,
	disabled,
	loading,
	variant = 'default',
	onClick,
}: {
	icon: string;
	title: string;
	description: string;
	disabled?: boolean;
	loading?: boolean;
	variant?: 'default' | 'danger' | 'success';
	onClick: () => void;
}) {
	return (
		<button
			className={`${styles.actionCard} ${styles[variant]} ${disabled ? styles.disabled : ''}`}
			onClick={onClick}
			disabled={disabled || loading}
		>
			<span className={styles.actionIcon}>{loading ? '⟳' : icon}</span>
			<span className={styles.actionTitle}>{title}</span>
			<span className={styles.actionDesc}>{description}</span>
		</button>
	);
}

export default ContainerDetail;
