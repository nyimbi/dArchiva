// (c) Copyright Datacraft, 2026
/**
 * Main scanner control panel.
 */
import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Printer, Play, Square, Eye, Settings, Folder, FileText, Loader2, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useScanner, useScanPreview, useStartScan, useCancelScan, useScanJob } from '../api';
import { ScanPreview } from './ScanPreview';
import type { Scanner, ScanOptions, ScanJob, ColorMode, InputSource } from '../types';
import { DEFAULT_SCAN_OPTIONS, RESOLUTION_PRESETS, COLOR_MODE_OPTIONS, PAPER_SOURCE_OPTIONS } from '../types';

interface ScannerPanelProps {
	scanner: Scanner;
	targetFolderId?: string;
	onFolderSelect?: () => void;
	onScanComplete?: (job: ScanJob) => void;
}

export function ScannerPanel({ scanner, targetFolderId, onFolderSelect, onScanComplete }: ScannerPanelProps) {
	const [options, setOptions] = useState<ScanOptions>({ ...DEFAULT_SCAN_OPTIONS });
	const [activeJobId, setActiveJobId] = useState<string | null>(null);
	const [showAdvanced, setShowAdvanced] = useState(false);

	const { data: scannerData } = useScanner(scanner.id);
	const preview = useScanPreview(scanner.id);
	const startScan = useStartScan();
	const cancelScan = useCancelScan();
	const { data: activeJob } = useScanJob(activeJobId || '');

	const currentScanner = scannerData || scanner;
	const capabilities = currentScanner.capabilities;
	const isScanning = activeJob?.status === 'scanning' || activeJob?.status === 'processing';
	const canScan = currentScanner.status === 'online' && !isScanning;

	const updateOption = <K extends keyof ScanOptions>(key: K, value: ScanOptions[K]) => {
		setOptions((prev) => ({ ...prev, [key]: value }));
	};

	const handlePreview = useCallback(() => {
		preview.mutate({
			resolution: Math.min(options.resolution, 150),
			color_mode: options.color_mode,
			input_source: 'platen',
			format: options.format,
			quality: options.quality,
			x_offset: null,
			y_offset: null,
			width: null,
			height: null,
			duplex: false,
			auto_crop: false,
			auto_deskew: false,
			blank_page_removal: false,
			batch_mode: false,
			max_pages: null,
			brightness: 0,
			contrast: 0,
		});
	}, [preview, options]);

	const handleScan = useCallback(async () => {
		const job = await startScan.mutateAsync({
			scannerId: scanner.id,
			options,
			targetFolderId,
		});
		setActiveJobId(job.id);
	}, [startScan, scanner.id, options, targetFolderId]);

	const handleCancel = useCallback(() => {
		if (activeJobId) cancelScan.mutate(activeJobId);
	}, [cancelScan, activeJobId]);

	// Watch for scan completion
	useEffect(() => {
		if (activeJob?.status === 'completed' && onScanComplete) {
			onScanComplete(activeJob);
			setActiveJobId(null);
		}
	}, [activeJob, onScanComplete]);

	// Get available resolutions from capabilities
	const availableResolutions = capabilities?.resolutions || [150, 300, 600];
	const availableColorModes = capabilities?.color_modes || ['color', 'grayscale'];

	return (
		<div className="flex gap-6 h-full">
			{/* Controls Panel */}
			<div className="w-80 flex-shrink-0 space-y-4">
				{/* Scanner Status */}
				<div className="glass-card p-4">
					<div className="flex items-center gap-3">
						<div className={cn('p-3 rounded-xl', currentScanner.status === 'online' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-brass-500/10 text-brass-400')}>
							<Printer className="w-6 h-6" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-slate-200 truncate">{currentScanner.name}</p>
							<p className="text-sm text-slate-500 capitalize">{currentScanner.status.replace('_', ' ')}</p>
						</div>
					</div>
				</div>

				{/* Scan Settings */}
				<div className="glass-card p-4 space-y-4">
					<h3 className="font-medium text-slate-200">Scan Settings</h3>

					{/* Resolution */}
					<div>
						<label className="text-sm text-slate-400 mb-2 block">Resolution</label>
						<div className="grid grid-cols-2 gap-2">
							{RESOLUTION_PRESETS.filter((r) => availableResolutions.includes(r.value)).map((res) => (
								<button key={res.value} onClick={() => updateOption('resolution', res.value)} className={cn('px-3 py-2 rounded-lg text-sm transition-colors', options.resolution === res.value ? 'bg-brass-500 text-slate-900 font-medium' : 'bg-slate-800 text-slate-400 hover:bg-slate-700')}>
									{res.label}
								</button>
							))}
						</div>
					</div>

					{/* Color Mode */}
					<div>
						<label className="text-sm text-slate-400 mb-2 block">Color Mode</label>
						<div className="flex gap-2">
							{COLOR_MODE_OPTIONS.filter((c) => availableColorModes.includes(c.value)).map((mode) => (
								<button key={mode.value} onClick={() => updateOption('color_mode', mode.value)} className={cn('flex-1 px-3 py-2 rounded-lg text-sm transition-colors', options.color_mode === mode.value ? 'bg-brass-500 text-slate-900 font-medium' : 'bg-slate-800 text-slate-400 hover:bg-slate-700')}>
									{mode.label}
								</button>
							))}
						</div>
					</div>

					{/* Paper Source */}
					<div>
						<label className="text-sm text-slate-400 mb-2 block">Paper Source</label>
						<select value={options.input_source} onChange={(e) => updateOption('input_source', e.target.value as InputSource)} className="input-field w-full">
							{PAPER_SOURCE_OPTIONS.filter((s) => (s.value === 'flatbed' && capabilities?.platen) || (s.value.startsWith('adf') && capabilities?.adf_present)).map((source) => (
								<option key={source.value} value={source.value === 'flatbed' ? 'platen' : source.value === 'adf_simplex' ? 'adf' : 'adf_duplex'}>{source.label}</option>
							))}
						</select>
					</div>

					{/* Advanced Settings */}
					<button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200">
						<Settings className="w-4 h-4" />
						Advanced Settings
						<ChevronDown className={cn('w-4 h-4 transition-transform', showAdvanced && 'rotate-180')} />
					</button>
					{showAdvanced && (
						<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3 pt-2">
							<div>
								<label className="text-sm text-slate-400 mb-1 block">Brightness: {options.brightness}</label>
								<input type="range" min="-100" max="100" value={options.brightness} onChange={(e) => updateOption('brightness', parseInt(e.target.value))} className="w-full accent-brass-500" />
							</div>
							<div>
								<label className="text-sm text-slate-400 mb-1 block">Contrast: {options.contrast}</label>
								<input type="range" min="-100" max="100" value={options.contrast} onChange={(e) => updateOption('contrast', parseInt(e.target.value))} className="w-full accent-brass-500" />
							</div>
							{capabilities?.adf_duplex && options.input_source.startsWith('adf') && (
								<label className="flex items-center gap-2 cursor-pointer">
									<input type="checkbox" checked={options.duplex} onChange={(e) => updateOption('duplex', e.target.checked)} className="rounded border-slate-600 bg-slate-800 text-brass-500" />
									<span className="text-sm text-slate-300">Double-sided (Duplex)</span>
								</label>
							)}
						</motion.div>
					)}
				</div>

				{/* Target Folder */}
				<div className="glass-card p-4">
					<label className="text-sm text-slate-400 mb-2 block">Save to Folder</label>
					<button onClick={onFolderSelect} className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
						<Folder className="w-4 h-4 text-slate-500" />
						{targetFolderId ? 'Selected folder' : 'Choose folder...'}
					</button>
				</div>

				{/* Action Buttons */}
				<div className="flex gap-2">
					<button onClick={handlePreview} disabled={!canScan || preview.isPending} className="btn-ghost flex-1">
						{preview.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
						Preview
					</button>
					{isScanning ? (
						<button onClick={handleCancel} className="btn-ghost flex-1 text-red-400 hover:bg-red-500/10">
							<Square className="w-4 h-4" />
							Cancel
						</button>
					) : (
						<button onClick={handleScan} disabled={!canScan} className="btn-primary flex-1">
							{startScan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
							Scan
						</button>
					)}
				</div>

				{/* Active Job Progress */}
				{activeJob && isScanning && (
					<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-4">
						<div className="flex items-center gap-3 mb-3">
							<div className="w-8 h-8 rounded-full bg-brass-500/10 flex items-center justify-center">
								<Loader2 className="w-4 h-4 text-brass-400 animate-spin" />
							</div>
							<div className="flex-1">
								<p className="text-sm font-medium text-slate-200">Scanning...</p>
								<p className="text-xs text-slate-500">{activeJob.pages_scanned} pages scanned</p>
							</div>
						</div>
						<div className="h-2 bg-slate-800 rounded-full overflow-hidden">
							<motion.div className="h-full bg-brass-500" initial={{ width: 0 }} animate={{ width: '50%' }} />
						</div>
					</motion.div>
				)}
			</div>

			{/* Preview Panel */}
			<div className="flex-1">
				<ScanPreview preview={preview.data || null} isLoading={preview.isPending} onRefresh={handlePreview} className="h-full" />
			</div>
		</div>
	);
}
