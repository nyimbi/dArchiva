// (c) Copyright Datacraft, 2026
import { motion } from 'framer-motion';
import type { PhysicalContainer } from '../api';
import styles from './ContainerList.module.css';

interface Props {
	containers: PhysicalContainer[];
	selectedId?: string;
	onSelect: (container: PhysicalContainer) => void;
}

export function ContainerList({ containers, selectedId, onSelect }: Props) {
	const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
		in_storage: { color: '#4ade80', bg: 'rgba(74, 222, 128, 0.1)', label: 'IN STORAGE' },
		checked_out: { color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.1)', label: 'CHECKED OUT' },
		in_transit: { color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.1)', label: 'IN TRANSIT' },
		missing: { color: '#f87171', bg: 'rgba(248, 113, 113, 0.1)', label: 'MISSING' },
		destroyed: { color: '#6b7280', bg: 'rgba(107, 114, 128, 0.1)', label: 'DESTROYED' },
		transferred: { color: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)', label: 'TRANSFERRED' },
		pending_review: { color: '#fb923c', bg: 'rgba(251, 146, 60, 0.1)', label: 'PENDING' },
	};

	const typeIcons: Record<string, string> = {
		box: '▣',
		folder: '▤',
		crate: '▥',
		shelf: '▦',
		cabinet: '▧',
		pallet: '▨',
		room: '▩',
		building: '◫',
	};

	return (
		<div className={styles.list}>
			{containers.length === 0 ? (
				<div className={styles.empty}>
					<span className={styles.emptyIcon}>▣</span>
					<p>No containers found</p>
				</div>
			) : (
				containers.map((container, index) => {
					const status = statusConfig[container.status] || statusConfig.in_storage;
					return (
						<motion.div
							key={container.id}
							className={`${styles.card} ${selectedId === container.id ? styles.selected : ''}`}
							onClick={() => onSelect(container)}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: index * 0.03 }}
							whileHover={{ scale: 1.01 }}
							whileTap={{ scale: 0.99 }}
						>
							{/* Corner accent */}
							<div className={styles.cardCorner} style={{ borderColor: status.color }} />

							<div className={styles.cardHeader}>
								<div className={styles.typeIcon}>{typeIcons[container.containerType] || '▣'}</div>
								<div className={styles.cardInfo}>
									<h4 className={styles.cardBarcode}>{container.barcode}</h4>
									{container.label && (
										<span className={styles.cardLabel}>{container.label}</span>
									)}
								</div>
								<span
									className={styles.statusBadge}
									style={{ color: status.color, background: status.bg }}
								>
									{status.label}
								</span>
							</div>

							<div className={styles.cardMeta}>
								<div className={styles.metaItem}>
									<span className={styles.metaLabel}>TYPE</span>
									<span className={styles.metaValue}>{container.containerType.toUpperCase()}</span>
								</div>
								<div className={styles.metaItem}>
									<span className={styles.metaLabel}>ITEMS</span>
									<span className={styles.metaValue}>{container.itemCount}</span>
								</div>
								{container.lastVerifiedAt && (
									<div className={styles.metaItem}>
										<span className={styles.metaLabel}>VERIFIED</span>
										<span className={styles.metaValue}>
											{new Date(container.lastVerifiedAt).toLocaleDateString()}
										</span>
									</div>
								)}
							</div>

							<div className={styles.cardFooter}>
								<span className={styles.cardDate}>
									Created {new Date(container.createdAt).toLocaleDateString()}
								</span>
								{container.legalHold && (
									<span className={styles.holdBadge}>⛔ LEGAL HOLD</span>
								)}
								<span className={styles.cardArrow}>→</span>
							</div>
						</motion.div>
					);
				})
			)}
		</div>
	);
}

export default ContainerList;
