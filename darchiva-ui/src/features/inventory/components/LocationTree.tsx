// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { WarehouseLocation } from '../api';
import styles from './LocationTree.module.css';

interface Props {
	locations: WarehouseLocation[];
	selectedId?: string;
	onSelect: (location: WarehouseLocation) => void;
}

export function LocationTree({ locations, selectedId, onSelect }: Props) {
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

	// Build tree structure from flat list
	const locationMap = new Map(locations.map((l) => [l.id, l]));
	const rootLocations = locations.filter((l) => !l.parentId);

	const toggleExpand = (id: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	};

	const getChildren = (parentId: string) => {
		return locations.filter((l) => l.parentId === parentId);
	};

	return (
		<div className={styles.tree}>
			<div className={styles.header}>
				<h3 className={styles.title}>Warehouse Locations</h3>
				<span className={styles.count}>{locations.length} locations</span>
			</div>

			<div className={styles.treeContent}>
				{rootLocations.length === 0 ? (
					<div className={styles.empty}>
						<span className={styles.emptyIcon}>⌂</span>
						<p>No locations configured</p>
					</div>
				) : (
					rootLocations.map((location) => (
						<LocationNode
							key={location.id}
							location={location}
							selectedId={selectedId}
							expandedIds={expandedIds}
							onSelect={onSelect}
							onToggle={toggleExpand}
							getChildren={getChildren}
							level={0}
						/>
					))
				)}
			</div>
		</div>
	);
}

interface NodeProps {
	location: WarehouseLocation;
	selectedId?: string;
	expandedIds: Set<string>;
	onSelect: (location: WarehouseLocation) => void;
	onToggle: (id: string, e: React.MouseEvent) => void;
	getChildren: (parentId: string) => WarehouseLocation[];
	level: number;
}

function LocationNode({
	location,
	selectedId,
	expandedIds,
	onSelect,
	onToggle,
	getChildren,
	level,
}: NodeProps) {
	const children = getChildren(location.id);
	const hasChildren = children.length > 0;
	const isExpanded = expandedIds.has(location.id);
	const isSelected = selectedId === location.id;

	const getStatusColor = () => {
		if (location.capacity && location.currentCount >= location.capacity) {
			return '#f87171'; // Full
		}
		if (location.capacity && location.currentCount > location.capacity * 0.8) {
			return '#fb923c'; // Nearly full
		}
		return '#4ade80'; // Available
	};

	const getIcon = () => {
		if (level === 0) return '◫'; // Building
		if (level === 1) return '▣'; // Room/Area
		if (level === 2) return '▦'; // Shelf
		return '▪'; // Position
	};

	return (
		<div className={styles.node}>
			<motion.div
				className={`${styles.nodeContent} ${isSelected ? styles.selected : ''}`}
				style={{ paddingLeft: `${level * 1.5 + 0.5}rem` }}
				onClick={() => onSelect(location)}
				whileHover={{ x: 2 }}
			>
				{hasChildren ? (
					<button
						className={styles.expandBtn}
						onClick={(e) => onToggle(location.id, e)}
					>
						{isExpanded ? '▼' : '▶'}
					</button>
				) : (
					<span className={styles.expandPlaceholder} />
				)}

				<span className={styles.nodeIcon}>{getIcon()}</span>

				<div className={styles.nodeInfo}>
					<span className={styles.nodeCode}>{location.code}</span>
					<span className={styles.nodeName}>{location.name}</span>
				</div>

				<div className={styles.nodeMeta}>
					{location.capacity && (
						<span className={styles.nodeCapacity}>
							{location.currentCount}/{location.capacity}
						</span>
					)}
					<span
						className={styles.nodeStatus}
						style={{ background: getStatusColor() }}
					/>
				</div>

				{(location.climateControlled || location.fireSuppression || location.accessRestricted) && (
					<div className={styles.nodeTags}>
						{location.climateControlled && (
							<span className={styles.tag} title="Climate Controlled">❄</span>
						)}
						{location.fireSuppression && (
							<span className={styles.tag} title="Fire Suppression">🔥</span>
						)}
						{location.accessRestricted && (
							<span className={styles.tag} title="Access Restricted">🔒</span>
						)}
					</div>
				)}
			</motion.div>

			<AnimatePresence>
				{hasChildren && isExpanded && (
					<motion.div
						className={styles.children}
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						transition={{ duration: 0.2 }}
					>
						{children.map((child) => (
							<LocationNode
								key={child.id}
								location={child}
								selectedId={selectedId}
								expandedIds={expandedIds}
								onSelect={onSelect}
								onToggle={onToggle}
								getChildren={getChildren}
								level={level + 1}
							/>
						))}
					</motion.div>
				)}
			</AnimatePresence>
		</div>
	);
}

export default LocationTree;
