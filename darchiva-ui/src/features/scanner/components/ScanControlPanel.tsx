// Scan Control Panel - Live Scanning Interface
import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { TechPanel, TechButton, Gauge, Readout, ActivityDisplay } from './core/TechPanel';
import { StatusLED } from './core/StatusLED';
import { ScannerMiniCard } from './ScannerCard';
import {
	useScanners, useScannerCapabilities, useScanProfiles,
	useCreateScanJob, useCancelScanJob, useScanJob,
} from '../api/hooks';
import type { Scanner, ScanOptions, ScanProfile, ScanJob } from '../types';
import { DEFAULT_SCAN_OPTIONS } from '../types';
import {
	PlayIcon,
	StopIcon,
	EyeIcon,
	Cog6ToothIcon,
	ChevronDownIcon,
	DocumentIcon,
	FolderIcon,
} from '@heroicons/react/24/outline';

interface ScanControlPanelProps {
	selectedScannerId?: string;
	targetFolderId?: string;
	onFolderSelect?: () => void;
	onScanComplete?: (job: ScanJob) => void;
	className?: string;
}

export function ScanControlPanel({
	selectedScannerId,
	targetFolderId,
	onFolderSelect,
	onScanComplete,
	className,
}: ScanControlPanelProps) {
	const [scannerId, setScannerId] = useState(selectedScannerId || '');
	const [options, setOptions] = useState<ScanOptions>({ ...DEFAULT_SCAN_OPTIONS });
	const [activeJobId, setActiveJobId] = useState<string | null>(null);
	const [showAdvanced, setShowAdvanced] = useState(false);
	const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

	const { data: scanners } = useScanners();
	const { data: capabilities } = useScannerCapabilities(scannerId);
	const { data: profiles } = useScanProfiles();
	const { data: activeJob } = useScanJob(activeJobId || '');
	const createJobMutation = useCreateScanJob();
	const cancelJobMutation = useCancelScanJob();

	const selectedScanner = scanners?.find((s) => s.id === scannerId);
	const isScanning = activeJob?.status === 'scanning' || activeJob?.status === 'processing';
	const canScan = selectedScanner?.status === 'online' && !isScanning;

	// Apply profile
	const applyProfile = useCallback((profile: ScanProfile) => {
		setOptions(profile.options);
		setSelectedProfileId(profile.id);
	}, []);

	// Update option helper
	const updateOption = <K extends keyof ScanOptions>(key: K, value: ScanOptions[K]) => {
		setOptions((prev) => ({ ...prev, [key]: value }));
		setSelectedProfileId(null); // Clear profile when manual edit
	};

	// Start scan
	const handleScan = async () => {
		if (!scannerId) return;

		try {
			const job = await createJobMutation.mutateAsync({
				scanner_id: scannerId,
				options,
				destination_folder_id: targetFolderId,
				auto_process: true,
			});
			setActiveJobId(job.id);
		} catch (error) {
			console.error('Failed to start scan:', error);
		}
	};

	// Cancel scan
	const handleCancel = () => {
		if (activeJobId) {
			cancelJobMutation.mutate(activeJobId);
		}
	};

	// Watch for completion
	if (activeJob?.status === 'completed') {
		onScanComplete?.(activeJob);
		setActiveJobId(null);
	}

	return (
		<div className={cn('flex gap-6 h-full', className)}>
			{/* Left: Controls */}
			<div className="w-80 flex-shrink-0 space-y-4">
				{/* Scanner Selector */}
				<TechPanel title="Scanner">
					{scanners && scanners.length > 0 ? (
						<div className="space-y-2">
							{scanners
								.filter((s) => s.is_active && s.status === 'online')
								.slice(0, 4)
								.map((scanner) => (
									<ScannerMiniCard
										key={scanner.id}
										scanner={scanner}
										selected={scanner.id === scannerId}
										onClick={() => setScannerId(scanner.id)}
									/>
								))}
							{scanners.filter((s) => s.status !== 'online' && s.is_active).length > 0 && (
								<div className="text-[10px] text-[var(--scan-text-muted)] mt-2">
									{scanners.filter((s) => s.status !== 'online').length} offline
								</div>
							)}
						</div>
					) : (
						<p className="text-sm text-[var(--scan-text-muted)]">No scanners available</p>
					)}
				</TechPanel>

				{/* Profile Quick Select */}
				{profiles && profiles.length > 0 && (
					<TechPanel title="Profile">
						<div className="flex flex-wrap gap-2">
							{profiles.map((profile) => (
								<button
									key={profile.id}
									onClick={() => applyProfile(profile)}
									className={cn(
										'px-3 py-1.5 rounded text-xs font-mono transition-all',
										'border',
										selectedProfileId === profile.id
											? 'bg-[var(--scan-accent)] border-[var(--scan-accent)] text-[var(--scan-bg-primary)]'
											: 'bg-[var(--scan-bg-tertiary)] border-[var(--scan-border)] text-[var(--scan-text-secondary)] hover:border-[var(--scan-border-active)]'
									)}
								>
									{profile.name}
								</button>
							))}
						</div>
					</TechPanel>
				)}

				{/* Scan Options */}
				<TechPanel title="Options">
					<div className="space-y-4">
						{/* Resolution */}
						<div>
							<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
								Resolution
							</label>
							<div className="flex flex-wrap gap-2">
								{(capabilities?.resolutions || [150, 300, 600]).map((res) => (
									<button
										key={res}
										onClick={() => updateOption('resolution', res)}
										className={cn(
											'px-3 py-1.5 rounded text-xs font-mono transition-all',
											'border',
											options.resolution === res
												? 'bg-[var(--scan-accent)] border-[var(--scan-accent)] text-[var(--scan-bg-primary)]'
												: 'bg-[var(--scan-bg-tertiary)] border-[var(--scan-border)] text-[var(--scan-text-secondary)] hover:border-[var(--scan-border-active)]'
										)}
									>
										{res} DPI
									</button>
								))}
							</div>
						</div>

						{/* Color Mode */}
						<div>
							<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
								Color Mode
							</label>
							<div className="flex gap-2">
								{(capabilities?.color_modes || ['color', 'grayscale']).map((mode) => (
									<button
										key={mode}
										onClick={() => updateOption('color_mode', mode)}
										className={cn(
											'flex-1 px-3 py-1.5 rounded text-xs font-mono uppercase transition-all',
											'border',
											options.color_mode === mode
												? 'bg-[var(--scan-accent)] border-[var(--scan-accent)] text-[var(--scan-bg-primary)]'
												: 'bg-[var(--scan-bg-tertiary)] border-[var(--scan-border)] text-[var(--scan-text-secondary)] hover:border-[var(--scan-border-active)]'
										)}
									>
										{mode}
									</button>
								))}
							</div>
						</div>

						{/* Source */}
						<div>
							<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
								Source
							</label>
							<select
								value={options.input_source}
								onChange={(e) => updateOption('input_source', e.target.value as any)}
								className={cn(
									'w-full px-3 py-2 rounded',
									'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
									'text-[var(--scan-text-primary)] font-mono text-xs',
									'focus:outline-none focus:border-[var(--scan-accent)]'
								)}
							>
								<option value="platen">Platen (Flatbed)</option>
								{capabilities?.adf_present && <option value="adf">ADF (Feeder)</option>}
								{capabilities?.adf_duplex && <option value="adf_duplex">ADF Duplex</option>}
							</select>
						</div>

						{/* Format */}
						<div>
							<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-2">
								Format
							</label>
							<div className="flex flex-wrap gap-2">
								{(capabilities?.formats || ['jpeg', 'png', 'pdf']).map((fmt) => (
									<button
										key={fmt}
										onClick={() => updateOption('format', fmt)}
										className={cn(
											'px-3 py-1.5 rounded text-xs font-mono uppercase transition-all',
											'border',
											options.format === fmt
												? 'bg-[var(--scan-accent)] border-[var(--scan-accent)] text-[var(--scan-bg-primary)]'
												: 'bg-[var(--scan-bg-tertiary)] border-[var(--scan-border)] text-[var(--scan-text-secondary)] hover:border-[var(--scan-border-active)]'
										)}
									>
										{fmt}
									</button>
								))}
							</div>
						</div>

						{/* Advanced Toggle */}
						<button
							onClick={() => setShowAdvanced(!showAdvanced)}
							className="flex items-center gap-2 text-xs text-[var(--scan-text-muted)] hover:text-[var(--scan-text-secondary)]"
						>
							<Cog6ToothIcon className="w-4 h-4" />
							Advanced Options
							<ChevronDownIcon className={cn('w-4 h-4 transition-transform', showAdvanced && 'rotate-180')} />
						</button>

						{/* Advanced Options */}
						{showAdvanced && (
							<div className="space-y-4 pt-2 border-t border-[var(--scan-border)]">
								{/* Duplex */}
								{capabilities?.adf_duplex && options.input_source.startsWith('adf') && (
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={options.duplex}
											onChange={(e) => updateOption('duplex', e.target.checked)}
											className="rounded border-[var(--scan-border)] bg-[var(--scan-bg-tertiary)]"
										/>
										<span className="text-sm text-[var(--scan-text-secondary)]">Double-sided</span>
									</label>
								)}

								{/* Batch Mode */}
								<label className="flex items-center gap-2 cursor-pointer">
									<input
										type="checkbox"
										checked={options.batch_mode}
										onChange={(e) => updateOption('batch_mode', e.target.checked)}
										className="rounded border-[var(--scan-border)] bg-[var(--scan-bg-tertiary)]"
									/>
									<span className="text-sm text-[var(--scan-text-secondary)]">Batch Mode</span>
								</label>

								{/* Auto Enhancements */}
								{capabilities?.auto_crop && (
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={options.auto_crop}
											onChange={(e) => updateOption('auto_crop', e.target.checked)}
											className="rounded border-[var(--scan-border)] bg-[var(--scan-bg-tertiary)]"
										/>
										<span className="text-sm text-[var(--scan-text-secondary)]">Auto Crop</span>
									</label>
								)}

								{capabilities?.auto_deskew && (
									<label className="flex items-center gap-2 cursor-pointer">
										<input
											type="checkbox"
											checked={options.auto_deskew}
											onChange={(e) => updateOption('auto_deskew', e.target.checked)}
											className="rounded border-[var(--scan-border)] bg-[var(--scan-bg-tertiary)]"
										/>
										<span className="text-sm text-[var(--scan-text-secondary)]">Auto Deskew</span>
									</label>
								)}

								{/* Brightness/Contrast */}
								<div>
									<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-1">
										Brightness: {options.brightness}
									</label>
									<input
										type="range"
										min="-100"
										max="100"
										value={options.brightness}
										onChange={(e) => updateOption('brightness', parseInt(e.target.value))}
										className="w-full accent-[var(--scan-accent)]"
									/>
								</div>

								<div>
									<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-1">
										Contrast: {options.contrast}
									</label>
									<input
										type="range"
										min="-100"
										max="100"
										value={options.contrast}
										onChange={(e) => updateOption('contrast', parseInt(e.target.value))}
										className="w-full accent-[var(--scan-accent)]"
									/>
								</div>

								{/* Quality */}
								<div>
									<label className="block text-[10px] font-mono text-[var(--scan-text-muted)] uppercase mb-1">
										Quality: {options.quality}%
									</label>
									<input
										type="range"
										min="1"
										max="100"
										value={options.quality}
										onChange={(e) => updateOption('quality', parseInt(e.target.value))}
										className="w-full accent-[var(--scan-accent)]"
									/>
								</div>
							</div>
						)}
					</div>
				</TechPanel>

				{/* Destination */}
				<TechPanel title="Destination">
					<button
						onClick={onFolderSelect}
						className={cn(
							'w-full flex items-center gap-2 px-3 py-2 rounded text-left',
							'bg-[var(--scan-bg-tertiary)] border border-[var(--scan-border)]',
							'text-sm text-[var(--scan-text-secondary)]',
							'hover:border-[var(--scan-border-active)] transition-colors'
						)}
					>
						<FolderIcon className="w-4 h-4 text-[var(--scan-text-muted)]" />
						{targetFolderId ? 'Folder selected' : 'Choose destination...'}
					</button>
				</TechPanel>

				{/* Action Buttons */}
				<div className="flex gap-2">
					<TechButton
						className="flex-1"
						disabled={!canScan}
					>
						<EyeIcon className="w-4 h-4" />
						Preview
					</TechButton>

					{isScanning ? (
						<TechButton
							variant="danger"
							className="flex-1"
							onClick={handleCancel}
							loading={cancelJobMutation.isPending}
						>
							<StopIcon className="w-4 h-4" />
							Cancel
						</TechButton>
					) : (
						<TechButton
							variant="primary"
							className="flex-1"
							onClick={handleScan}
							disabled={!canScan}
							loading={createJobMutation.isPending}
						>
							<PlayIcon className="w-4 h-4" />
							Scan
						</TechButton>
					)}
				</div>

				{/* Active Job Progress */}
				{activeJob && isScanning && (
					<TechPanel title="Scanning">
						<div className="space-y-3">
							<ActivityDisplay active />
							<div className="flex justify-between text-sm">
								<span className="text-[var(--scan-text-muted)]">Pages scanned</span>
								<span className="font-mono text-[var(--scan-accent)]">
									{activeJob.pages_scanned}
								</span>
							</div>
							<Gauge
								value={activeJob.pages_scanned}
								max={options.max_pages || 100}
								variant="default"
							/>
						</div>
					</TechPanel>
				)}
			</div>

			{/* Right: Preview Area */}
			<div className="flex-1 scan-panel overflow-hidden">
				<div className="h-full flex flex-col">
					<div className="scan-panel-header">
						<span>Preview</span>
					</div>
					<div className="flex-1 flex items-center justify-center bg-[var(--scan-readout-bg)]">
						{isScanning ? (
							<div className="text-center">
								<div className="scan-activity w-48 mb-4">
									<div className="scan-activity-wave" />
								</div>
								<p className="font-mono text-xs text-[var(--scan-text-muted)] uppercase">
									Scanning in progress...
								</p>
							</div>
						) : (
							<div className="text-center text-[var(--scan-text-muted)]">
								<DocumentIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
								<p className="text-sm">Click "Preview" to scan a preview</p>
								<p className="text-xs mt-1">or "Scan" to start scanning</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
