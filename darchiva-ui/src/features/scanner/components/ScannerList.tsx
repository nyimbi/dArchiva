// Scanner List/Grid View
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TechPanel, TechButton, GridOverlay } from './core/TechPanel';
import { ScannerCard } from './ScannerCard';
import { useScanners } from '../api/hooks';
import type { Scanner, ScannerStatus, ScannerProtocol } from '../types';
import { PROTOCOL_LABELS, STATUS_CONFIG } from '../types';
import {
	Squares2X2Icon,
	ListBulletIcon,
	FunnelIcon,
	MagnifyingGlassIcon,
	PlusIcon,
} from '@heroicons/react/24/outline';

interface ScannerListProps {
	onScannerSelect?: (scanner: Scanner) => void;
	onAddScanner?: () => void;
	className?: string;
}

export function ScannerList({ onScannerSelect, onAddScanner, className }: ScannerListProps) {
	const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<ScannerStatus | 'all'>('all');
	const [protocolFilter, setProtocolFilter] = useState<ScannerProtocol | 'all'>('all');
	const [includeInactive, setIncludeInactive] = useState(false);

	const { data: scanners, isLoading, error } = useScanners(includeInactive);

	// Filter scanners
	const filteredScanners = scanners?.filter((scanner) => {
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			if (
				!scanner.name.toLowerCase().includes(query) &&
				!scanner.manufacturer?.toLowerCase().includes(query) &&
				!scanner.model?.toLowerCase().includes(query)
			) {
				return false;
			}
		}
		if (statusFilter !== 'all' && scanner.status !== statusFilter) return false;
		if (protocolFilter !== 'all' && scanner.protocol !== protocolFilter) return false;
		return true;
	}) || [];

	const statusCounts = scanners?.reduce((acc, s) => {
		acc[s.status] = (acc[s.status] || 0) + 1;
		return acc;
	}, {} as Record<string, number>) || {};

	return (
		<div className={cn('relative min-h-screen', className)}>
			<GridOverlay className="fixed" />

			<div className="relative z-10 p-6 space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-semibold text-[var(--scan-text-bright)]">
							Scanners
						</h1>
						<p className="text-sm text-[var(--scan-text-muted)] font-mono">
							// {scanners?.length || 0} REGISTERED DEVICES
						</p>
					</div>
					<TechButton variant="primary" onClick={onAddScanner}>
						<span className="inline-flex items-center gap-1.5">
							<PlusIcon className="w-4 h-4" />
							Add Scanner
						</span>
					</TechButton>
				</div>

				{/* Filters Bar */}
				<div className="scan-panel p-4">
					<div className="flex flex-wrap items-center gap-4">
						{/* Search */}
						<div className="flex-1 min-w-[200px] relative">
							<MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--scan-text-muted)]" />
							<input
								type="text"
								placeholder="Search scanners..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className={cn(
									'w-full pl-9 pr-4 py-2 rounded',
									'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
									'text-[var(--scan-text-primary)] placeholder:text-[var(--scan-text-muted)]',
									'font-mono text-sm',
									'focus:outline-none focus:border-[var(--scan-accent)]'
								)}
							/>
						</div>

						{/* Status Filter */}
						<div className="flex items-center gap-2">
							<FunnelIcon className="w-4 h-4 text-[var(--scan-text-muted)]" />
							<select
								value={statusFilter}
								onChange={(e) => setStatusFilter(e.target.value as ScannerStatus | 'all')}
								className={cn(
									'px-3 py-2 rounded',
									'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
									'text-[var(--scan-text-primary)] font-mono text-xs',
									'focus:outline-none focus:border-[var(--scan-accent)]'
								)}
							>
								<option value="all">All Status</option>
								{Object.entries(STATUS_CONFIG).map(([key, config]) => (
									<option key={key} value={key}>
										{config.label} ({statusCounts[key] || 0})
									</option>
								))}
							</select>
						</div>

						{/* Protocol Filter */}
						<select
							value={protocolFilter}
							onChange={(e) => setProtocolFilter(e.target.value as ScannerProtocol | 'all')}
							className={cn(
								'px-3 py-2 rounded',
								'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
								'text-[var(--scan-text-primary)] font-mono text-xs',
								'focus:outline-none focus:border-[var(--scan-accent)]'
							)}
						>
							<option value="all">All Protocols</option>
							{Object.entries(PROTOCOL_LABELS).map(([key, label]) => (
								<option key={key} value={key}>{label}</option>
							))}
						</select>

						{/* Include Inactive */}
						<label className="flex items-center gap-2 text-xs text-[var(--scan-text-secondary)] cursor-pointer">
							<input
								type="checkbox"
								checked={includeInactive}
								onChange={(e) => setIncludeInactive(e.target.checked)}
								className="rounded border-[var(--scan-border)] bg-[var(--scan-bg-tertiary)]"
							/>
							Show Inactive
						</label>

						{/* View Toggle */}
						<div className="flex border border-[var(--scan-border)] rounded overflow-hidden">
							<button
								onClick={() => setViewMode('grid')}
								className={cn(
									'p-2 transition-colors',
									viewMode === 'grid'
										? 'bg-[var(--scan-accent)] text-[var(--scan-bg-primary)]'
										: 'bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-muted)] hover:text-[var(--scan-text-primary)]'
								)}
							>
								<Squares2X2Icon className="w-4 h-4" />
							</button>
							<button
								onClick={() => setViewMode('list')}
								className={cn(
									'p-2 transition-colors',
									viewMode === 'list'
										? 'bg-[var(--scan-accent)] text-[var(--scan-bg-primary)]'
										: 'bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-muted)] hover:text-[var(--scan-text-primary)]'
								)}
							>
								<ListBulletIcon className="w-4 h-4" />
							</button>
						</div>
					</div>
				</div>

				{/* Scanner Grid/List */}
				{isLoading ? (
					<div className="text-center py-12">
						<div className="scan-activity w-48 mx-auto mb-4">
							<div className="scan-activity-wave" />
						</div>
						<span className="font-mono text-xs text-[var(--scan-text-muted)] uppercase">
							Loading scanners...
						</span>
					</div>
				) : filteredScanners.length === 0 ? (
					<div className="text-center py-12 text-[var(--scan-text-muted)]">
						<p className="text-sm">No scanners found</p>
						{searchQuery && (
							<p className="text-xs mt-1">Try adjusting your search or filters</p>
						)}
					</div>
				) : viewMode === 'grid' ? (
					<div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 scan-stagger">
						{filteredScanners.map((scanner) => (
							<ScannerCard
								key={scanner.id}
								scanner={scanner}
								onClick={() => onScannerSelect?.(scanner)}
							/>
						))}
					</div>
				) : (
					<div className="scan-panel overflow-hidden">
						<table className="w-full">
							<thead>
								<tr className="border-b border-[var(--scan-border)]">
									<th className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--scan-text-muted)] px-4 py-3">
										Status
									</th>
									<th className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--scan-text-muted)] px-4 py-3">
										Name
									</th>
									<th className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--scan-text-muted)] px-4 py-3">
										Protocol
									</th>
									<th className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--scan-text-muted)] px-4 py-3">
										Model
									</th>
									<th className="text-right text-[10px] font-mono uppercase tracking-wider text-[var(--scan-text-muted)] px-4 py-3">
										Pages
									</th>
									<th className="text-right text-[10px] font-mono uppercase tracking-wider text-[var(--scan-text-muted)] px-4 py-3">
										Last Seen
									</th>
								</tr>
							</thead>
							<tbody className="scan-stagger">
								{filteredScanners.map((scanner) => (
									<tr
										key={scanner.id}
										onClick={() => onScannerSelect?.(scanner)}
										className={cn(
											'border-b border-[var(--scan-border)] cursor-pointer transition-colors',
											'hover:bg-[var(--scan-bg-tertiary)]',
											!scanner.is_active && 'opacity-50'
										)}
									>
										<td className="px-4 py-3">
											<div className={cn('w-2.5 h-2.5 rounded-full', STATUS_CONFIG[scanner.status].ledClass)} />
										</td>
										<td className="px-4 py-3">
											<span className="font-medium text-[var(--scan-text-primary)]">
												{scanner.name}
											</span>
										</td>
										<td className="px-4 py-3">
											<span className="font-mono text-xs text-[var(--scan-text-secondary)] uppercase">
												{PROTOCOL_LABELS[scanner.protocol]}
											</span>
										</td>
										<td className="px-4 py-3 text-sm text-[var(--scan-text-secondary)]">
											{scanner.manufacturer} {scanner.model}
										</td>
										<td className="px-4 py-3 text-right font-mono text-sm text-[var(--scan-text-secondary)]">
											{scanner.total_pages_scanned.toLocaleString()}
										</td>
										<td className="px-4 py-3 text-right text-xs text-[var(--scan-text-muted)]">
											{scanner.last_seen_at
												? new Date(scanner.last_seen_at).toLocaleString()
												: 'Never'}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
