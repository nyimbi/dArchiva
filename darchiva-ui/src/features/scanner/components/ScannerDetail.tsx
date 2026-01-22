// Scanner Detail View with Tabs
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { TechPanel, Readout, Gauge, TechButton, ActivityDisplay, GridOverlay } from './core/TechPanel';
import { StatusLED, StatusBadge } from './core/StatusLED';
import {
	useScanner, useScannerStatus, useScannerCapabilities, useRefreshCapabilities,
	useScanJobs, useScanProfiles, useUpdateScanner, useDeleteScanner,
} from '../api/hooks';
import type { Scanner, ScannerCapabilities, ScanProfile, ScanJob } from '../types';
import { PROTOCOL_LABELS, STATUS_CONFIG } from '../types';
import {
	ArrowLeftIcon,
	ArrowPathIcon,
	CogIcon,
	DocumentDuplicateIcon,
	ClockIcon,
	WrenchIcon,
	TrashIcon,
	StarIcon,
	CheckIcon,
	XMarkIcon,
} from '@heroicons/react/24/outline';

type TabId = 'status' | 'capabilities' | 'profiles' | 'jobs' | 'settings';

interface ScannerDetailProps {
	scannerId: string;
	onBack?: () => void;
	onStartScan?: (scanner: Scanner, profileId?: string) => void;
	className?: string;
}

export function ScannerDetail({ scannerId, onBack, onStartScan, className }: ScannerDetailProps) {
	const [activeTab, setActiveTab] = useState<TabId>('status');

	const { data: scanner, isLoading } = useScanner(scannerId);
	const { data: liveStatus } = useScannerStatus(scannerId);
	const { data: capabilities } = useScannerCapabilities(scannerId);
	const refreshCapsMutation = useRefreshCapabilities();
	const { data: jobs } = useScanJobs({ scannerId, limit: 20 });
	const { data: profiles } = useScanProfiles();

	const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
		{ id: 'status', label: 'Status', icon: <ActivityDisplay active={liveStatus?.available} className="w-6 h-3" /> },
		{ id: 'capabilities', label: 'Capabilities', icon: <WrenchIcon className="w-4 h-4" /> },
		{ id: 'profiles', label: 'Profiles', icon: <DocumentDuplicateIcon className="w-4 h-4" /> },
		{ id: 'jobs', label: 'Job History', icon: <ClockIcon className="w-4 h-4" /> },
		{ id: 'settings', label: 'Settings', icon: <CogIcon className="w-4 h-4" /> },
	];

	if (isLoading || !scanner) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="scan-activity w-48">
					<div className="scan-activity-wave" />
				</div>
			</div>
		);
	}

	return (
		<div className={cn('relative min-h-screen', className)}>
			<GridOverlay className="fixed" />

			<div className="relative z-10 p-6 space-y-6">
				{/* Header */}
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-4">
						{onBack && (
							<button
								onClick={onBack}
								className="p-2 rounded hover:bg-[var(--scan-bg-tertiary)] transition-colors"
							>
								<ArrowLeftIcon className="w-5 h-5 text-[var(--scan-text-muted)]" />
							</button>
						)}
						<div>
							<div className="flex items-center gap-3">
								<h1 className="text-2xl font-semibold text-[var(--scan-text-bright)]">
									{scanner.name}
								</h1>
								{scanner.is_default && (
									<StarIcon className="w-5 h-5 text-amber-400 fill-amber-400" />
								)}
								<StatusBadge status={liveStatus?.status || scanner.status} />
							</div>
							<p className="text-sm text-[var(--scan-text-muted)] font-mono">
								// {PROTOCOL_LABELS[scanner.protocol]} • {scanner.connection_uri}
							</p>
						</div>
					</div>
					<TechButton
						variant="primary"
						onClick={() => onStartScan?.(scanner)}
						disabled={!liveStatus?.available}
					>
						Start Scan
					</TechButton>
				</div>

				{/* Tabs */}
				<div className="flex gap-1 border-b border-[var(--scan-border)]">
					{tabs.map((tab) => (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={cn(
								'flex items-center gap-2 px-4 py-3 text-xs font-mono uppercase tracking-wider transition-colors',
								'border-b-2 -mb-px',
								activeTab === tab.id
									? 'border-[var(--scan-accent)] text-[var(--scan-accent)]'
									: 'border-transparent text-[var(--scan-text-muted)] hover:text-[var(--scan-text-secondary)]'
							)}
						>
							{tab.icon}
							{tab.label}
						</button>
					))}
				</div>

				{/* Tab Content */}
				<div className="animate-in fade-in duration-200">
					{activeTab === 'status' && (
						<StatusTab scanner={scanner} status={liveStatus} />
					)}
					{activeTab === 'capabilities' && (
						<CapabilitiesTab
							capabilities={capabilities || scanner.capabilities}
							onRefresh={() => refreshCapsMutation.mutate(scannerId)}
							isRefreshing={refreshCapsMutation.isPending}
						/>
					)}
					{activeTab === 'profiles' && (
						<ProfilesTab
							profiles={profiles || []}
							onSelectProfile={(p) => onStartScan?.(scanner, p.id)}
						/>
					)}
					{activeTab === 'jobs' && (
						<JobHistoryTab jobs={jobs || []} />
					)}
					{activeTab === 'settings' && (
						<SettingsTab scanner={scanner} />
					)}
				</div>
			</div>
		</div>
	);
}

// === Tab Components ===

function StatusTab({ scanner, status }: { scanner: Scanner; status?: any }) {
	return (
		<div className="grid lg:grid-cols-2 gap-6">
			<TechPanel title="Device Status">
				<div className="grid grid-cols-2 gap-4">
					<Readout label="Status" value={STATUS_CONFIG[status?.status as keyof typeof STATUS_CONFIG || scanner.status]?.label || status?.status || scanner.status} highlight={status?.available} />
					<Readout label="Active Jobs" value={status?.active_jobs || 0} />
					<Readout label="State" value={status?.state || 'Idle'} />
					<Readout label="ADF State" value={status?.adf_state || 'N/A'} />
				</div>
				{status?.error && (
					<div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
						{status.error}
					</div>
				)}
			</TechPanel>

			<TechPanel title="Device Info">
				<div className="space-y-3 text-sm">
					<InfoRow label="Manufacturer" value={scanner.manufacturer} />
					<InfoRow label="Model" value={scanner.model} />
					<InfoRow label="Serial Number" value={scanner.serial_number} />
					<InfoRow label="Firmware" value={scanner.firmware_version} />
					<InfoRow label="Connection" value={scanner.connection_uri} mono />
				</div>
			</TechPanel>

			<TechPanel title="Statistics" className="lg:col-span-2">
				<div className="grid sm:grid-cols-3 gap-4">
					<Readout label="Total Pages" value={scanner.total_pages_scanned.toLocaleString()} highlight />
					<Readout label="Registered" value={new Date(scanner.created_at).toLocaleDateString()} />
					<Readout label="Last Seen" value={scanner.last_seen_at ? new Date(scanner.last_seen_at).toLocaleString() : 'Never'} />
				</div>
			</TechPanel>
		</div>
	);
}

function CapabilitiesTab({ capabilities, onRefresh, isRefreshing }: { capabilities?: ScannerCapabilities | null; onRefresh: () => void; isRefreshing: boolean }) {
	if (!capabilities) {
		return (
			<div className="text-center py-12">
				<p className="text-[var(--scan-text-muted)] mb-4">Capabilities not loaded</p>
				<TechButton onClick={onRefresh} loading={isRefreshing}>
					Fetch Capabilities
				</TechButton>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex justify-end">
				<TechButton size="sm" onClick={onRefresh} loading={isRefreshing}>
					<ArrowPathIcon className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
					Refresh
				</TechButton>
			</div>

			<div className="grid lg:grid-cols-2 gap-6">
				<TechPanel title="Paper Handling">
					<div className="grid grid-cols-2 gap-4">
						<CapabilityBadge label="Platen" enabled={capabilities.platen} />
						<CapabilityBadge label="ADF" enabled={capabilities.adf_present} />
						<CapabilityBadge label="Duplex" enabled={capabilities.adf_duplex} />
						<CapabilityBadge label="Auto Crop" enabled={capabilities.auto_crop} />
						<CapabilityBadge label="Auto Deskew" enabled={capabilities.auto_deskew} />
						<CapabilityBadge label="Blank Removal" enabled={capabilities.blank_page_removal} />
					</div>
					{capabilities.adf_present && (
						<div className="mt-4">
							<Readout label="ADF Capacity" value={capabilities.adf_capacity} unit="sheets" />
						</div>
					)}
				</TechPanel>

				<TechPanel title="Scan Area">
					<div className="grid grid-cols-2 gap-4">
						<Readout label="Max Width" value={capabilities.max_width_mm.toFixed(1)} unit="mm" />
						<Readout label="Max Height" value={capabilities.max_height_mm.toFixed(1)} unit="mm" />
					</div>
				</TechPanel>

				<TechPanel title="Resolutions">
					<div className="flex flex-wrap gap-2">
						{capabilities.resolutions.map((res) => (
							<span
								key={res}
								className="px-3 py-1 rounded bg-[var(--scan-bg-tertiary)] font-mono text-sm text-[var(--scan-text-secondary)]"
							>
								{res} DPI
							</span>
						))}
					</div>
				</TechPanel>

				<TechPanel title="Output">
					<div className="space-y-4">
						<div>
							<div className="text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">Color Modes</div>
							<div className="flex flex-wrap gap-2">
								{capabilities.color_modes.map((mode) => (
									<span
										key={mode}
										className="px-3 py-1 rounded bg-[var(--scan-bg-tertiary)] font-mono text-sm text-[var(--scan-text-secondary)] uppercase"
									>
										{mode}
									</span>
								))}
							</div>
						</div>
						<div>
							<div className="text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">Formats</div>
							<div className="flex flex-wrap gap-2">
								{capabilities.formats.map((fmt) => (
									<span
										key={fmt}
										className="px-3 py-1 rounded bg-[var(--scan-bg-tertiary)] font-mono text-sm text-[var(--scan-text-secondary)] uppercase"
									>
										{fmt}
									</span>
								))}
							</div>
						</div>
					</div>
				</TechPanel>

				<TechPanel title="Adjustments" className="lg:col-span-2">
					<div className="grid grid-cols-2 gap-4">
						<CapabilityBadge label="Brightness Control" enabled={capabilities.brightness_control} />
						<CapabilityBadge label="Contrast Control" enabled={capabilities.contrast_control} />
					</div>
				</TechPanel>
			</div>
		</div>
	);
}

function ProfilesTab({ profiles, onSelectProfile }: { profiles: ScanProfile[]; onSelectProfile: (p: ScanProfile) => void }) {
	if (profiles.length === 0) {
		return (
			<div className="text-center py-12 text-[var(--scan-text-muted)]">
				<p>No scan profiles configured</p>
			</div>
		);
	}

	return (
		<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
			{profiles.map((profile) => (
				<button
					key={profile.id}
					onClick={() => onSelectProfile(profile)}
					className={cn(
						'scan-panel p-4 text-left transition-all',
						'hover:border-[var(--scan-accent)]',
						profile.is_default && 'border-amber-500/30'
					)}
				>
					<div className="flex items-center gap-2 mb-2">
						<span className="font-medium text-[var(--scan-text-primary)]">{profile.name}</span>
						{profile.is_default && <StarIcon className="w-4 h-4 text-amber-400" />}
					</div>
					{profile.description && (
						<p className="text-xs text-[var(--scan-text-muted)] mb-3">{profile.description}</p>
					)}
					<div className="flex flex-wrap gap-1 text-[10px] font-mono">
						<span className="px-2 py-0.5 rounded bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-secondary)]">
							{profile.options.resolution} DPI
						</span>
						<span className="px-2 py-0.5 rounded bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-secondary)] uppercase">
							{profile.options.color_mode}
						</span>
						<span className="px-2 py-0.5 rounded bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-secondary)] uppercase">
							{profile.options.format}
						</span>
					</div>
				</button>
			))}
		</div>
	);
}

function JobHistoryTab({ jobs }: { jobs: ScanJob[] }) {
	const statusColors: Record<string, string> = {
		completed: 'text-emerald-400',
		failed: 'text-red-400',
		cancelled: 'text-gray-400',
		scanning: 'text-amber-400',
		processing: 'text-[var(--scan-accent)]',
		pending: 'text-[var(--scan-text-muted)]',
	};

	if (jobs.length === 0) {
		return (
			<div className="text-center py-12 text-[var(--scan-text-muted)]">
				<p>No scan jobs found</p>
			</div>
		);
	}

	return (
		<div className="scan-panel overflow-hidden">
			<table className="w-full">
				<thead>
					<tr className="border-b border-[var(--scan-border)]">
						<th className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--scan-text-muted)] px-4 py-3">Status</th>
						<th className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--scan-text-muted)] px-4 py-3">Date</th>
						<th className="text-right text-[10px] font-mono uppercase tracking-wider text-[var(--scan-text-muted)] px-4 py-3">Pages</th>
						<th className="text-left text-[10px] font-mono uppercase tracking-wider text-[var(--scan-text-muted)] px-4 py-3">Options</th>
					</tr>
				</thead>
				<tbody>
					{jobs.map((job) => (
						<tr key={job.id} className="border-b border-[var(--scan-border)]">
							<td className="px-4 py-3">
								<span className={cn('font-mono text-xs uppercase', statusColors[job.status])}>
									{job.status}
								</span>
							</td>
							<td className="px-4 py-3 text-sm text-[var(--scan-text-secondary)]">
								{new Date(job.created_at).toLocaleString()}
							</td>
							<td className="px-4 py-3 text-right font-mono text-sm text-[var(--scan-text-primary)]">
								{job.pages_scanned}
							</td>
							<td className="px-4 py-3">
								<div className="flex gap-1 text-[10px] font-mono">
									<span className="px-2 py-0.5 rounded bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-muted)]">
										{job.options.resolution} DPI
									</span>
									<span className="px-2 py-0.5 rounded bg-[var(--scan-bg-tertiary)] text-[var(--scan-text-muted)] uppercase">
										{job.options.color_mode}
									</span>
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

function SettingsTab({ scanner }: { scanner: Scanner }) {
	const updateMutation = useUpdateScanner();
	const deleteMutation = useDeleteScanner();
	const [editName, setEditName] = useState(scanner.name);
	const [editNotes, setEditNotes] = useState(scanner.notes || '');

	const handleSave = () => {
		updateMutation.mutate({ id: scanner.id, data: { name: editName, notes: editNotes } });
	};

	const handleToggleDefault = () => {
		updateMutation.mutate({ id: scanner.id, data: { is_default: !scanner.is_default } });
	};

	const handleToggleActive = () => {
		updateMutation.mutate({ id: scanner.id, data: { is_active: !scanner.is_active } });
	};

	return (
		<div className="space-y-6 max-w-2xl">
			<TechPanel title="General">
				<div className="space-y-4">
					<div>
						<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
							Display Name
						</label>
						<input
							type="text"
							value={editName}
							onChange={(e) => setEditName(e.target.value)}
							className={cn(
								'w-full px-4 py-2 rounded',
								'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
								'text-[var(--scan-text-primary)] font-mono',
								'focus:outline-none focus:border-[var(--scan-accent)]'
							)}
						/>
					</div>
					<div>
						<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
							Notes
						</label>
						<textarea
							value={editNotes}
							onChange={(e) => setEditNotes(e.target.value)}
							rows={3}
							className={cn(
								'w-full px-4 py-2 rounded resize-none',
								'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
								'text-[var(--scan-text-primary)]',
								'focus:outline-none focus:border-[var(--scan-accent)]'
							)}
						/>
					</div>
					<TechButton onClick={handleSave} loading={updateMutation.isPending}>
						Save Changes
					</TechButton>
				</div>
			</TechPanel>

			<TechPanel title="Flags">
				<div className="space-y-3">
					<label className="flex items-center justify-between p-3 rounded bg-[var(--scan-bg-tertiary)] cursor-pointer">
						<div>
							<span className="text-[var(--scan-text-primary)]">Default Scanner</span>
							<p className="text-xs text-[var(--scan-text-muted)]">Use as default for new scans</p>
						</div>
						<button
							onClick={handleToggleDefault}
							className={cn(
								'w-10 h-6 rounded-full relative transition-colors',
								scanner.is_default ? 'bg-[var(--scan-accent)]' : 'bg-[var(--scan-bg-secondary)]'
							)}
						>
							<div
								className={cn(
									'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform',
									scanner.is_default ? 'translate-x-5' : 'translate-x-1'
								)}
							/>
						</button>
					</label>
					<label className="flex items-center justify-between p-3 rounded bg-[var(--scan-bg-tertiary)] cursor-pointer">
						<div>
							<span className="text-[var(--scan-text-primary)]">Active</span>
							<p className="text-xs text-[var(--scan-text-muted)]">Scanner is available for use</p>
						</div>
						<button
							onClick={handleToggleActive}
							className={cn(
								'w-10 h-6 rounded-full relative transition-colors',
								scanner.is_active ? 'bg-emerald-500' : 'bg-[var(--scan-bg-secondary)]'
							)}
						>
							<div
								className={cn(
									'w-4 h-4 rounded-full bg-white absolute top-1 transition-transform',
									scanner.is_active ? 'translate-x-5' : 'translate-x-1'
								)}
							/>
						</button>
					</label>
				</div>
			</TechPanel>

			<TechPanel title="Danger Zone">
				<TechButton variant="danger" onClick={() => deleteMutation.mutate(scanner.id)}>
					<TrashIcon className="w-4 h-4" />
					Delete Scanner
				</TechButton>
			</TechPanel>
		</div>
	);
}

// === Helper Components ===

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
	return (
		<div className="flex justify-between">
			<span className="text-[var(--scan-text-muted)]">{label}</span>
			<span className={cn('text-[var(--scan-text-primary)]', mono && 'font-mono text-xs')}>
				{value || '—'}
			</span>
		</div>
	);
}

function CapabilityBadge({ label, enabled }: { label: string; enabled: boolean }) {
	return (
		<div className={cn(
			'flex items-center gap-2 p-2 rounded',
			enabled ? 'bg-emerald-500/10' : 'bg-[var(--scan-bg-tertiary)]'
		)}>
			{enabled ? (
				<CheckIcon className="w-4 h-4 text-emerald-400" />
			) : (
				<XMarkIcon className="w-4 h-4 text-[var(--scan-text-muted)]" />
			)}
			<span className={cn('text-sm', enabled ? 'text-emerald-400' : 'text-[var(--scan-text-muted)]')}>
				{label}
			</span>
		</div>
	);
}
