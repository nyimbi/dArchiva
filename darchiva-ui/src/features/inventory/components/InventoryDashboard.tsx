// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	useInventorySummary,
	useContainers,
	useLocations,
	useScanBarcode,
	useScanHistory,
	PhysicalContainer,
	WarehouseLocation,
} from '../api';
import { LocationTree } from './LocationTree';
import { ContainerList } from './ContainerList';
import { ContainerDetail } from './ContainerDetail';
import { BarcodeScanner } from './BarcodeScanner';
import { CreateContainerModal } from './CreateContainerModal';
import { CreateLocationModal } from './CreateLocationModal';
import styles from './InventoryDashboard.module.css';

type Tab = 'overview' | 'containers' | 'locations' | 'scanner' | 'reports';

export function InventoryDashboard() {
	const [activeTab, setActiveTab] = useState<Tab>('overview');
	const [selectedContainer, setSelectedContainer] = useState<PhysicalContainer | null>(null);
	const [selectedLocation, setSelectedLocation] = useState<WarehouseLocation | null>(null);
	const [showCreateContainer, setShowCreateContainer] = useState(false);
	const [showCreateLocation, setShowCreateLocation] = useState(false);
	const [filterStatus, setFilterStatus] = useState<string>('all');

	const { data: summary } = useInventorySummary();
	const { data: containers = [] } = useContainers({
		status: filterStatus !== 'all' ? filterStatus : undefined,
		limit: 100,
	});
	const { data: locations = [] } = useLocations();
	const { data: scanHistory = [] } = useScanHistory(20);

	const tabs: { id: Tab; label: string; icon: string }[] = [
		{ id: 'overview', label: 'Overview', icon: '◎' },
		{ id: 'containers', label: 'Containers', icon: '▣' },
		{ id: 'locations', label: 'Locations', icon: '⌂' },
		{ id: 'scanner', label: 'Scanner', icon: '⌘' },
		{ id: 'reports', label: 'Reports', icon: '▤' },
	];

	const statusColors: Record<string, string> = {
		in_storage: '#4ade80',
		checked_out: '#60a5fa',
		in_transit: '#fbbf24',
		missing: '#f87171',
		destroyed: '#6b7280',
		transferred: '#a78bfa',
		pending_review: '#fb923c',
	};

	return (
		<div className={styles.container}>
			{/* Grid overlay */}
			<div className={styles.gridOverlay} />

			{/* Header */}
			<header className={styles.header}>
				<div className={styles.headerLeft}>
					<div className={styles.systemBadge}>
						<span className={styles.systemDot} />
						PHYSICAL INVENTORY
					</div>
					<h1 className={styles.title}>Document Warehouse</h1>
					<p className={styles.subtitle}>Physical document tracking and chain of custody management</p>
				</div>
				<div className={styles.headerActions}>
					<button className={styles.actionBtn} onClick={() => setShowCreateContainer(true)}>
						<span>+</span> New Container
					</button>
					<button className={styles.actionBtnSecondary} onClick={() => setShowCreateLocation(true)}>
						<span>+</span> New Location
					</button>
				</div>
			</header>

			{/* Stats Bar */}
			{summary && (
				<motion.div
					className={styles.statsBar}
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
				>
					<div className={styles.statCard}>
						<div className={styles.statHeader}>
							<span className={styles.statIndicator} style={{ background: '#c9a227' }} />
							<span className={styles.statLabel}>TOTAL CONTAINERS</span>
						</div>
						<span className={styles.statValue} style={{ color: '#c9a227' }}>
							{Object.values(summary.containersByStatus).reduce((a, b) => a + b, 0)}
						</span>
					</div>

					<div className={styles.statCard}>
						<div className={styles.statHeader}>
							<span className={styles.statIndicator} style={{ background: '#4ade80' }} />
							<span className={styles.statLabel}>IN STORAGE</span>
						</div>
						<span className={styles.statValue} style={{ color: '#4ade80' }}>
							{summary.containersByStatus['in_storage'] || 0}
						</span>
					</div>

					<div className={styles.statCard}>
						<div className={styles.statHeader}>
							<span className={styles.statIndicator} style={{ background: '#60a5fa' }} />
							<span className={styles.statLabel}>CHECKED OUT</span>
						</div>
						<span className={styles.statValue} style={{ color: '#60a5fa' }}>
							{summary.containersByStatus['checked_out'] || 0}
						</span>
					</div>

					<div className={styles.statCard}>
						<div className={styles.statHeader}>
							<span className={styles.statIndicator} style={{ background: '#f87171' }} />
							<span className={styles.statLabel}>LEGAL HOLDS</span>
						</div>
						<span className={styles.statValue} style={{ color: '#f87171' }}>
							{summary.legalHolds}
						</span>
					</div>

					<div className={styles.statCard}>
						<div className={styles.statHeader}>
							<span className={styles.statIndicator} style={{ background: '#a78bfa' }} />
							<span className={styles.statLabel}>LOCATIONS</span>
						</div>
						<span className={styles.statValue} style={{ color: '#a78bfa' }}>
							{summary.totalLocations}
						</span>
					</div>
				</motion.div>
			)}

			{/* Tab Navigation */}
			<div className={styles.tabNav}>
				{tabs.map((tab) => (
					<button
						key={tab.id}
						className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
						onClick={() => setActiveTab(tab.id)}
					>
						<span className={styles.tabIcon}>{tab.icon}</span>
						{tab.label}
					</button>
				))}
			</div>

			{/* Main Content */}
			<div className={styles.mainContent}>
				<AnimatePresence mode="wait">
					{activeTab === 'overview' && (
						<motion.div
							key="overview"
							className={styles.overviewGrid}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							{/* Recent Activity */}
							<div className={styles.card}>
								<h3 className={styles.cardTitle}>Recent Scans</h3>
								<div className={styles.activityList}>
									{scanHistory.slice(0, 8).map((scan) => (
										<div key={scan.id} className={styles.activityItem}>
											<span
												className={styles.activityDot}
												style={{ background: scan.success ? '#4ade80' : '#f87171' }}
											/>
											<div className={styles.activityInfo}>
												<span className={styles.activityCode}>{scan.scannedCode}</span>
												<span className={styles.activityMeta}>
													{scan.scanPurpose} · {new Date(scan.createdAt).toLocaleTimeString()}
												</span>
											</div>
										</div>
									))}
									{scanHistory.length === 0 && (
										<p className={styles.emptyText}>No recent scans</p>
									)}
								</div>
							</div>

							{/* Container Distribution */}
							<div className={styles.card}>
								<h3 className={styles.cardTitle}>Container Status</h3>
								<div className={styles.statusBars}>
									{summary && Object.entries(summary.containersByStatus).map(([status, count]) => {
										const total = Object.values(summary.containersByStatus).reduce((a, b) => a + b, 0);
										const percent = total > 0 ? (count / total) * 100 : 0;
										return (
											<div key={status} className={styles.statusBar}>
												<div className={styles.statusBarHeader}>
													<span className={styles.statusLabel}>
														{status.replace('_', ' ').toUpperCase()}
													</span>
													<span className={styles.statusCount}>{count}</span>
												</div>
												<div className={styles.statusTrack}>
													<motion.div
														className={styles.statusFill}
														style={{ background: statusColors[status] || '#6b7280' }}
														initial={{ width: 0 }}
														animate={{ width: `${percent}%` }}
														transition={{ duration: 0.8 }}
													/>
												</div>
											</div>
										);
									})}
								</div>
							</div>

							{/* Quick Actions */}
							<div className={styles.card}>
								<h3 className={styles.cardTitle}>Quick Actions</h3>
								<div className={styles.quickActions}>
									<button className={styles.quickAction} onClick={() => setActiveTab('scanner')}>
										<span className={styles.quickIcon}>⌘</span>
										<span className={styles.quickLabel}>Scan Barcode</span>
									</button>
									<button className={styles.quickAction} onClick={() => setShowCreateContainer(true)}>
										<span className={styles.quickIcon}>▣</span>
										<span className={styles.quickLabel}>New Container</span>
									</button>
									<button className={styles.quickAction} onClick={() => setShowCreateLocation(true)}>
										<span className={styles.quickIcon}>⌂</span>
										<span className={styles.quickLabel}>New Location</span>
									</button>
									<button className={styles.quickAction} onClick={() => setActiveTab('reports')}>
										<span className={styles.quickIcon}>▤</span>
										<span className={styles.quickLabel}>View Reports</span>
									</button>
								</div>
							</div>

							{/* Alerts */}
							<div className={styles.card}>
								<h3 className={styles.cardTitle}>Alerts</h3>
								<div className={styles.alertsList}>
									{summary && summary.overdueForRetention > 0 && (
										<div className={styles.alertItem} style={{ borderColor: '#fb923c' }}>
											<span className={styles.alertIcon} style={{ color: '#fb923c' }}>⚠</span>
											<div className={styles.alertInfo}>
												<span className={styles.alertTitle}>Retention Overdue</span>
												<span className={styles.alertDesc}>
													{summary.overdueForRetention} containers past retention date
												</span>
											</div>
										</div>
									)}
									{summary && summary.legalHolds > 0 && (
										<div className={styles.alertItem} style={{ borderColor: '#f87171' }}>
											<span className={styles.alertIcon} style={{ color: '#f87171' }}>⛔</span>
											<div className={styles.alertInfo}>
												<span className={styles.alertTitle}>Legal Holds Active</span>
												<span className={styles.alertDesc}>
													{summary.legalHolds} containers under legal hold
												</span>
											</div>
										</div>
									)}
									{(!summary || (summary.overdueForRetention === 0 && summary.legalHolds === 0)) && (
										<p className={styles.emptyText}>No alerts</p>
									)}
								</div>
							</div>
						</motion.div>
					)}

					{activeTab === 'containers' && (
						<motion.div
							key="containers"
							className={styles.containersView}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							<div className={styles.filterBar}>
								<div className={styles.filterGroup}>
									{['all', 'in_storage', 'checked_out', 'in_transit', 'missing'].map((status) => (
										<button
											key={status}
											className={`${styles.filterBtn} ${filterStatus === status ? styles.active : ''}`}
											onClick={() => setFilterStatus(status)}
										>
											{status.replace('_', ' ').toUpperCase()}
										</button>
									))}
								</div>
							</div>

							<div className={styles.containerLayout}>
								<ContainerList
									containers={containers}
									selectedId={selectedContainer?.id}
									onSelect={setSelectedContainer}
								/>

								<AnimatePresence>
									{selectedContainer && (
										<ContainerDetail
											container={selectedContainer}
											onClose={() => setSelectedContainer(null)}
										/>
									)}
								</AnimatePresence>
							</div>
						</motion.div>
					)}

					{activeTab === 'locations' && (
						<motion.div
							key="locations"
							className={styles.locationsView}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							<LocationTree
								locations={locations}
								selectedId={selectedLocation?.id}
								onSelect={setSelectedLocation}
							/>
						</motion.div>
					)}

					{activeTab === 'scanner' && (
						<motion.div
							key="scanner"
							className={styles.scannerView}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							<BarcodeScanner
								onScanResult={(result) => {
									if (result.resolvedType === 'container' && result.resolvedId) {
										const container = containers.find((c) => c.id === result.resolvedId);
										if (container) {
											setSelectedContainer(container);
											setActiveTab('containers');
										}
									}
								}}
							/>
						</motion.div>
					)}

					{activeTab === 'reports' && (
						<motion.div
							key="reports"
							className={styles.reportsView}
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							exit={{ opacity: 0 }}
						>
							<div className={styles.reportCards}>
								<div className={styles.reportCard}>
									<h4 className={styles.reportTitle}>Inventory Count Report</h4>
									<p className={styles.reportDesc}>Full inventory count by location and status</p>
									<button className={styles.reportBtn}>Generate</button>
								</div>
								<div className={styles.reportCard}>
									<h4 className={styles.reportTitle}>Chain of Custody Report</h4>
									<p className={styles.reportDesc}>Custody history for selected containers</p>
									<button className={styles.reportBtn}>Generate</button>
								</div>
								<div className={styles.reportCard}>
									<h4 className={styles.reportTitle}>Retention Schedule</h4>
									<p className={styles.reportDesc}>Containers approaching retention dates</p>
									<button className={styles.reportBtn}>Generate</button>
								</div>
								<div className={styles.reportCard}>
									<h4 className={styles.reportTitle}>Location Utilization</h4>
									<p className={styles.reportDesc}>Capacity usage across all locations</p>
									<button className={styles.reportBtn}>Generate</button>
								</div>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</div>

			{/* Modals */}
			<AnimatePresence>
				{showCreateContainer && (
					<CreateContainerModal
						locations={locations}
						onClose={() => setShowCreateContainer(false)}
						onCreated={(container) => {
							setShowCreateContainer(false);
							setSelectedContainer(container);
							setActiveTab('containers');
						}}
					/>
				)}
				{showCreateLocation && (
					<CreateLocationModal
						locations={locations}
						onClose={() => setShowCreateLocation(false)}
						onCreated={() => setShowCreateLocation(false)}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}

export default InventoryDashboard;
