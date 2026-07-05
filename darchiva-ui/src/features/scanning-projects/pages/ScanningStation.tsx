// (c) Copyright Datacraft, 2026
import { AuthenticatedImage } from '@/components/AuthenticatedImage';
import type { ESCLCapabilities } from '@/lib/escl-scanner';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Eye,
  FileText,
  Keyboard,
  Loader2,
  Maximize2,
  Package,
  Pause,
  Play,
  Printer,
  RefreshCw,
  RotateCcw,
  RotateCw,
  ScanLine,
  Scissors,
  Settings,
  Sliders,
  Tag,
  Trash2,
  XCircle,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { useCallback,useEffect,useRef,useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { completeBatchScan,deleteBatchPage,getBatch,getBatchDocuments,getScannerCapabilities,getScanningProject,getScanners,quickScan,splitBatchAtPage,updateBatchPage,type BatchDocument,type ScanJobOptions,type ScannerCapabilities } from '../api';
import type { SeparatorEvent } from '../api';
import { BrowserScannerConfig,ScanModeIndicator,type ScanMode } from '../components/BrowserScannerConfig';
import { useSeparatorEvents } from '../hooks';
import { CalibrationWizard, loadCalibratedDpi } from '../components/CalibrationWizard';
import { CameraCapture } from '../components/CameraCapture';
import { ImageStitcher } from '../components/ImageStitcher';
import { useBrowserScanner } from '../hooks/useBrowserScanner';

type CaptureMode = 'scanner' | 'camera' | 'stitch';

// ─── Hotkey types & constants ───────────────────────────────────────────────

type HotkeyAction = 'scan_next' | 'accept_page' | 'reject_page' | 'end_batch' | 'camera_mode';

interface HotkeyBinding {
	key: string;
	label: string;
	description: string;
}

type HotkeyMap = Record<HotkeyAction, HotkeyBinding>;

const HOTKEY_ACTIONS: Record<HotkeyAction, Pick<HotkeyBinding, 'label' | 'description'>> = {
	scan_next:   { label: 'Scan Next',    description: 'Trigger next scan' },
	accept_page: { label: 'Accept Page',  description: 'Accept current previewed page' },
	reject_page: { label: 'Reject Page',  description: 'Reject & add to rescan queue' },
	end_batch:   { label: 'End Batch',    description: 'Complete current batch' },
	camera_mode: { label: 'Camera Mode',  description: 'Switch to camera capture mode' },
};

const DEFAULT_HOTKEYS: HotkeyMap = {
	scan_next:   { ...HOTKEY_ACTIONS.scan_next,   key: 'F9' },
	accept_page: { ...HOTKEY_ACTIONS.accept_page, key: 'F10' },
	reject_page: { ...HOTKEY_ACTIONS.reject_page, key: 'F11' },
	end_batch:   { ...HOTKEY_ACTIONS.end_batch,   key: 'F12' },
	camera_mode: { ...HOTKEY_ACTIONS.camera_mode, key: 'F8' },
};

const HOTKEYS_STORAGE_KEY = 'darchiva_scan_hotkeys';

function loadHotkeys(): HotkeyMap {
	try {
		const raw = localStorage.getItem(HOTKEYS_STORAGE_KEY);
		if (!raw) return DEFAULT_HOTKEYS;
		const parsed = JSON.parse(raw) as Partial<Record<HotkeyAction, string>>;
		const result = { ...DEFAULT_HOTKEYS };
		for (const action of Object.keys(HOTKEY_ACTIONS) as HotkeyAction[]) {
			if (typeof parsed[action] === 'string') {
				result[action] = { ...HOTKEY_ACTIONS[action], key: parsed[action] as string };
			}
		}
		return result;
	} catch {
		return DEFAULT_HOTKEYS;
	}
}

function saveHotkeys(map: HotkeyMap): void {
	const minimal: Partial<Record<HotkeyAction, string>> = {};
	for (const action of Object.keys(HOTKEY_ACTIONS) as HotkeyAction[]) {
		minimal[action] = map[action].key;
	}
	localStorage.setItem(HOTKEYS_STORAGE_KEY, JSON.stringify(minimal));
}

// ─── Hotkey config modal ─────────────────────────────────────────────────────

function HotkeyConfigModal({
	open,
	onOpenChange,
	hotkeys,
	onUpdateKey,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hotkeys: HotkeyMap;
	onUpdateKey: (action: HotkeyAction, key: string) => void;
}) {
	const [rebinding, setRebinding] = useState<HotkeyAction | null>(null);

	// Capture the next keydown when in rebind mode
	useEffect(() => {
		if (!rebinding) return;
		const handler = (e: KeyboardEvent) => {
			e.preventDefault();
			e.stopPropagation();
			// Ignore bare modifier keys
			if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
			onUpdateKey(rebinding, e.key);
			setRebinding(null);
		};
		window.addEventListener('keydown', handler, { capture: true });
		return () => window.removeEventListener('keydown', handler, { capture: true });
	}, [rebinding, onUpdateKey]);

	return (
		<Dialog.Root open={open} onOpenChange={(v) => { setRebinding(null); onOpenChange(v); }}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
					<Dialog.Title className="text-xl font-semibold text-slate-100 mb-1">
						Hotkey Configuration
					</Dialog.Title>
					<Dialog.Description className="text-sm text-slate-400 mb-5">
						Click a binding to rebind it, then press the desired key.
					</Dialog.Description>

					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-slate-500 border-b border-slate-800">
								<th className="pb-2 font-medium">Action</th>
								<th className="pb-2 font-medium">Binding</th>
								<th className="pb-2" />
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-800">
							{(Object.keys(HOTKEY_ACTIONS) as HotkeyAction[]).map((action) => {
								const binding = hotkeys[action];
								const isWaiting = rebinding === action;
								return (
									<tr key={action}>
										<td className="py-3 pr-4">
											<div className="text-slate-200 font-medium">{binding.label}</div>
											<div className="text-xs text-slate-500">{binding.description}</div>
										</td>
										<td className="py-3 pr-4">
											{isWaiting ? (
												<span className="px-2 py-1 rounded bg-brass-500/20 text-brass-400 text-xs animate-pulse">
													Press a key…
												</span>
											) : (
												<kbd className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-mono border border-slate-700">
													{binding.key}
												</kbd>
											)}
										</td>
										<td className="py-3">
											<button
												onClick={() => setRebinding(isWaiting ? null : action)}
												className={cn(
													'px-2 py-1 text-xs rounded transition-colors',
													isWaiting
														? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
														: 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
												)}
											>
												{isWaiting ? 'Cancel' : 'Rebind'}
											</button>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>

					<div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800">
						<button
							onClick={() => {
								for (const action of Object.keys(HOTKEY_ACTIONS) as HotkeyAction[]) {
									onUpdateKey(action, DEFAULT_HOTKEYS[action].key);
								}
							}}
							className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
						>
							Reset to defaults
						</button>
						<button
							onClick={() => { setRebinding(null); onOpenChange(false); }}
							className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 transition-colors"
						>
							Done
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

// Types for the scanning station
interface ScannedPage {
	id: string;
	pageNumber: number;
	thumbnailUrl: string;
	fullImageUrl: string;
	scannedAt: string;
	qualityScore?: number;
	hasBlur: boolean;
	hasSkew: boolean;
	skewAngle: number;
	blurScore?: number;
	needsReview: boolean;
	status: 'pending' | 'accepted' | 'rejected' | 'rescanning';
	rotation: number;
}

interface ScanSettings {
	dpi: 150 | 300 | 600 | 1200;
	colorMode: 'color' | 'grayscale' | 'monochrome';
	duplex: boolean;
	format: 'jpeg' | 'png' | 'tiff' | 'pdf';
	autoCrop: boolean;
	autoDeskew: boolean;
	blankPageRemoval: boolean;
}

interface BatchInfo {
	id: string;
	batchNumber: string;
	projectId: string;
	projectName: string;
	estimatedPages: number;
	scannedPages: number;
	status: 'pending' | 'scanning' | 'paused' | 'completed' | 'qc_pending';
}

type BatchWithProjectName = {
	project_name?: string;
	projectName?: string;
};

type ScanPageMetadata = {
	id?: string;
	documentId?: string;
	document_id?: string;
	pageId?: string;
	page_id?: string;
	qualityScore?: number;
	quality_score?: number;
	blurScore?: number;
	blur_score?: number;
	hasBlur?: boolean;
	has_blur?: boolean;
	hasSkew?: boolean;
	has_skew?: boolean;
	skewAngle?: number;
	skew_angle?: number;
	needsReview?: boolean;
	needs_review?: boolean;
	status?: ScannedPage['status'];
	scannedAt?: string;
	scanned_at?: string;
};

function readNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

function getScanPageMetadata(result: unknown, docId: string, index: number): ScanPageMetadata | undefined {
	const record = result as Record<string, unknown>;
	const arrays = [
		record.pageResults,
		record.page_results,
		record.documents,
		record.batchDocuments,
		record.batch_documents,
	].filter(Array.isArray) as ScanPageMetadata[][];

	for (const entries of arrays) {
		const byId = entries.find((entry) =>
			[entry.id, entry.documentId, entry.document_id, entry.pageId, entry.page_id].includes(docId),
		);
		if (byId) return byId;
		if (entries[index]) return entries[index];
	}

	return undefined;
}

// Transform BatchDocument from API to ScannedPage for UI
function transformBatchDocumentToScannedPage(doc: BatchDocument, index: number): ScannedPage {
	const issueDetails = doc.issueDetails ?? (doc as BatchDocument & { issue_details?: Record<string, unknown> }).issue_details;
	const qualityScore = readNumber(doc.qualityScore ?? (doc as BatchDocument & { quality_score?: number }).quality_score);
	const blurScore = readNumber(issueDetails?.blurScore ?? issueDetails?.blur_score);

	return {
		id: doc.id,
		pageNumber: doc.pageNumber || index + 1,
		thumbnailUrl: `/api/v1/thumbnails/${doc.documentId}`,
		fullImageUrl: `/api/v1/thumbnails/${doc.documentId}/full`,
		scannedAt: doc.scannedAt,
		...(qualityScore !== undefined ? { qualityScore } : {}),
		hasBlur: doc.hasIssues && issueDetails?.blur === true,
		hasSkew: doc.hasIssues && issueDetails?.skew === true,
		skewAngle: readNumber(issueDetails?.skewAngle ?? issueDetails?.skew_angle) ?? 0,
		...(blurScore !== undefined ? { blurScore } : {}),
		needsReview: doc.needsReview,
		status: doc.status,
		rotation: 0,
	};
}

const DPI_OPTIONS = [
	{ value: 150, label: '150 DPI', description: 'Draft' },
	{ value: 300, label: '300 DPI', description: 'Standard' },
	{ value: 600, label: '600 DPI', description: 'High' },
	{ value: 1200, label: '1200 DPI', description: 'Maximum' },
] as const;

const COLOR_MODE_OPTIONS = [
	{ value: 'color', label: 'Color' },
	{ value: 'grayscale', label: 'Grayscale' },
	{ value: 'monochrome', label: 'B&W' },
] as const;

const FORMAT_OPTIONS = [
	{ value: 'jpeg', label: 'JPEG' },
	{ value: 'png', label: 'PNG' },
	{ value: 'tiff', label: 'TIFF' },
	{ value: 'pdf', label: 'PDF' },
] as const;

function QualityIndicator({ label, value, threshold, icon: Icon }: {
	label: string;
	value: number | undefined;
	threshold: number;
	icon: typeof AlertTriangle;
}) {
	if (value === undefined) return null;
	const isGood = value >= threshold;
	return (
		<div className={cn(
			'flex items-center gap-2 px-2 py-1 rounded text-xs',
			isGood ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
		)}>
			<Icon className="w-3 h-3" />
			<span>{label}: {value}%</span>
		</div>
	);
}

function PageThumbnail({ page, isSelected, onSelect, onRescan }: {
	page: ScannedPage;
	isSelected: boolean;
	onSelect: () => void;
	onRescan: () => void;
}) {
	return (
		<div
			onClick={onSelect}
			className={cn(
				'relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all',
				isSelected
					? 'border-brass-500 ring-2 ring-brass-500/30'
					: 'border-slate-700 hover:border-slate-600'
			)}
		>
			<AuthenticatedImage
				src={page.thumbnailUrl}
				alt={`Page ${page.pageNumber}`}
				className="w-full aspect-[3/4] object-cover bg-slate-800"
			/>

			{/* Page number badge */}
			<div className="absolute top-1 left-1 px-1.5 py-0.5 bg-slate-900/80 rounded text-xs text-slate-300">
				{page.pageNumber}
			</div>

			{/* Status indicator */}
			<div className={cn(
				'absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center',
				page.status === 'accepted' && 'bg-emerald-500/20',
				page.status === 'rejected' && 'bg-rose-500/20',
				page.status === 'pending' && 'bg-amber-500/20',
				page.status === 'rescanning' && 'bg-blue-500/20'
			)}>
				{page.status === 'accepted' && <CheckCircle className="w-3 h-3 text-emerald-400" />}
				{page.status === 'rejected' && <XCircle className="w-3 h-3 text-rose-400" />}
				{page.status === 'pending' && <AlertTriangle className="w-3 h-3 text-amber-400" />}
				{page.status === 'rescanning' && <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />}
			</div>

			{/* Quality issues overlay */}
			{page.needsReview && (
				<div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-slate-900/90 to-transparent p-2">
					<div className="flex flex-wrap gap-1">
						{page.hasBlur && (
							<span className="px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">
								Blur
							</span>
						)}
						{page.hasSkew && (
							<span className="px-1 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">
								Skew
							</span>
						)}
					</div>
				</div>
			)}

			{/* Hover actions */}
			<div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
				<button
					onClick={(e) => { e.stopPropagation(); onRescan(); }}
					className="p-1.5 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
					title="Rescan page"
				>
					<RefreshCw className="w-4 h-4 text-slate-300" />
				</button>
			</div>
		</div>
	);
}

function SettingsDialog({ open, onOpenChange, settings, onSave, capabilities }: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	settings: ScanSettings;
	onSave: (settings: ScanSettings) => void;
	capabilities?: ScannerCapabilities;
}) {
	const [localSettings, setLocalSettings] = useState(settings);

	// Filter options based on scanner capabilities
	const availableDpiOptions = capabilities?.resolutions?.length
		? DPI_OPTIONS.filter(opt => capabilities.resolutions.includes(opt.value))
		: DPI_OPTIONS;

	const availableColorModes = capabilities?.colorModes?.length
		? COLOR_MODE_OPTIONS.filter(opt => capabilities.colorModes.includes(opt.value))
		: COLOR_MODE_OPTIONS;

	const availableFormats = capabilities?.formats?.length
		? FORMAT_OPTIONS.filter(opt => capabilities.formats.includes(opt.value))
		: FORMAT_OPTIONS;

	const supportsDuplex = capabilities?.adfDuplex ?? false;
	const supportsAutoCrop = capabilities?.autoCrop ?? true;
	const supportsAutoDeskew = capabilities?.autoDeskew ?? true;
	const supportsBlankPageRemoval = capabilities?.blankPageRemoval ?? true;

	const handleSave = () => {
		onSave(localSettings);
		onOpenChange(false);
	};

	// Calculate grid columns based on available options
	const dpiGridCols = availableDpiOptions.length <= 2 ? 2 : availableDpiOptions.length <= 4 ? availableDpiOptions.length : 4;
	const formatGridCols = availableFormats.length <= 2 ? 2 : availableFormats.length <= 4 ? availableFormats.length : 4;

	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md shadow-xl">
					<Dialog.Title className="text-xl font-semibold text-slate-100 mb-4">
						Scan Settings
					</Dialog.Title>

					<div className="space-y-5">
						{/* DPI Selection */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">Resolution (DPI)</label>
							<div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${dpiGridCols}, minmax(0, 1fr))` }}>
								{availableDpiOptions.map((opt) => (
									<button
										key={opt.value}
										onClick={() => setLocalSettings({ ...localSettings, dpi: opt.value })}
										className={cn(
											'px-3 py-2 rounded-lg border text-sm transition-colors',
											localSettings.dpi === opt.value
												? 'border-brass-500 bg-brass-500/10 text-brass-400'
												: 'border-slate-700 text-slate-400 hover:border-slate-600'
										)}
									>
										<div className="font-medium">{opt.value}</div>
										<div className="text-[10px] text-slate-500">{opt.description}</div>
									</button>
								))}
							</div>
						</div>

						{/* Color Mode */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">Color Mode</label>
							<div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${availableColorModes.length}, minmax(0, 1fr))` }}>
								{availableColorModes.map((opt) => (
									<button
										key={opt.value}
										onClick={() => setLocalSettings({ ...localSettings, colorMode: opt.value })}
										className={cn(
											'px-3 py-2 rounded-lg border text-sm transition-colors',
											localSettings.colorMode === opt.value
												? 'border-brass-500 bg-brass-500/10 text-brass-400'
												: 'border-slate-700 text-slate-400 hover:border-slate-600'
										)}
									>
										{opt.label}
									</button>
								))}
							</div>
						</div>

						{/* Format */}
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-2">Output Format</label>
							<div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${formatGridCols}, minmax(0, 1fr))` }}>
								{availableFormats.map((opt) => (
									<button
										key={opt.value}
										onClick={() => setLocalSettings({ ...localSettings, format: opt.value })}
										className={cn(
											'px-3 py-2 rounded-lg border text-sm transition-colors',
											localSettings.format === opt.value
												? 'border-brass-500 bg-brass-500/10 text-brass-400'
												: 'border-slate-700 text-slate-400 hover:border-slate-600'
										)}
									>
										{opt.label}
									</button>
								))}
							</div>
						</div>

						{/* Toggle options */}
						<div className="space-y-3">
							{supportsDuplex && (
								<label className="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										checked={localSettings.duplex}
										onChange={(e) => setLocalSettings({ ...localSettings, duplex: e.target.checked })}
										className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500 focus:ring-offset-slate-900"
									/>
									<span className="text-sm text-slate-300">Duplex Scanning (Double-sided)</span>
								</label>
							)}
							{supportsAutoCrop && (
								<label className="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										checked={localSettings.autoCrop}
										onChange={(e) => setLocalSettings({ ...localSettings, autoCrop: e.target.checked })}
										className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500 focus:ring-offset-slate-900"
									/>
									<span className="text-sm text-slate-300">Auto Crop</span>
								</label>
							)}
							{supportsAutoDeskew && (
								<label className="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										checked={localSettings.autoDeskew}
										onChange={(e) => setLocalSettings({ ...localSettings, autoDeskew: e.target.checked })}
										className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500 focus:ring-offset-slate-900"
									/>
									<span className="text-sm text-slate-300">Auto Deskew</span>
								</label>
							)}
							{supportsBlankPageRemoval && (
								<label className="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										checked={localSettings.blankPageRemoval}
										onChange={(e) => setLocalSettings({ ...localSettings, blankPageRemoval: e.target.checked })}
										className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500 focus:ring-offset-slate-900"
									/>
									<span className="text-sm text-slate-300">Blank Page Removal</span>
								</label>
							)}
						</div>
					</div>

					<div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-800">
						<button
							onClick={() => onOpenChange(false)}
							className="px-4 py-2 text-slate-400 hover:text-slate-300 transition-colors"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							className="px-4 py-2 bg-brass-500 text-slate-900 rounded-lg font-medium hover:bg-brass-400 transition-colors"
						>
							Save Settings
						</button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}

// ─── Separator Event Feed ────────────────────────────────────────────────────

function SeparatorEventRow({
	event,
	onSplitHere,
}: {
	event: SeparatorEvent;
	onSplitHere: (event: SeparatorEvent) => void;
}) {
	const isBarcode = event.separator_type === 'barcode_separator' || event.separator_type === 'barcode';
	const time = new Date(event.detected_at).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});

	return (
		<div
			className={cn(
				'flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-xs',
				isBarcode
					? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
					: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
			)}
		>
			<div className="flex items-center gap-2 min-w-0">
				{isBarcode ? (
					<Tag className="w-3.5 h-3.5 flex-shrink-0" />
				) : (
					<ScanLine className="w-3.5 h-3.5 flex-shrink-0" />
				)}
				<div className="min-w-0">
					<span className="font-medium">
						{isBarcode ? 'Barcode Separator' : 'Blank Separator'}
					</span>
					{event.project_code && (
						<span className="ml-2 px-1.5 py-0.5 bg-emerald-500/20 rounded font-mono text-emerald-200">
							{event.project_code}
						</span>
					)}
					{event.page_number !== null && (
						<span className="ml-2 text-slate-400">p.{event.page_number}</span>
					)}
				</div>
			</div>
			<div className="flex items-center gap-2 flex-shrink-0">
				<span className="text-slate-500 tabular-nums">{time}</span>
				<button
					onClick={() => onSplitHere(event)}
					title="Confirm split point here"
					className={cn(
						'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-medium transition-colors',
						isBarcode
							? 'border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-300'
							: 'border-amber-500/40 hover:bg-amber-500/20 text-amber-300',
					)}
				>
					<Scissors className="w-3 h-3" />
					Split Here
				</button>
			</div>
		</div>
	);
}

function SeparatorEventFeed({
	projectId,
	batchId,
	pages,
	isScanning,
}: {
	projectId: string;
	batchId?: string;
	pages: Pick<ScannedPage, 'id' | 'pageNumber'>[];
	isScanning: boolean;
}) {
	const { data: events = [], isLoading } = useSeparatorEvents(projectId, true);
	const queryClient = useQueryClient();
	const splitMutation = useMutation({
		mutationFn: ({ targetBatchId, pageId }: { targetBatchId: string; pageId: string | number }) =>
			splitBatchAtPage(targetBatchId, pageId),
		onSuccess: (_result, variables) => {
			toast.success('Batch split created');
			queryClient.invalidateQueries({ queryKey: ['batch-documents', projectId, variables.targetBatchId] });
			queryClient.invalidateQueries({ queryKey: ['scanning-batch', projectId, variables.targetBatchId] });
			queryClient.invalidateQueries({ queryKey: ['scanning-batch', projectId, batchId] });
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : 'Failed to split batch');
		},
	});

	const handleSplitHere = useCallback((event: SeparatorEvent) => {
		const targetBatchId = event.batch_id ?? batchId;
		if (!targetBatchId) {
			toast.error('Missing batch identifier for split');
			return;
		}
		if (event.page_number == null) {
			toast.error('Missing page identifier for split');
			return;
		}
		const page = pages.find((item) => item.pageNumber === event.page_number);
		if (!page) {
			toast.error('Split page is not loaded in this batch');
			return;
		}
		splitMutation.mutate({ targetBatchId, pageId: page.id });
	}, [batchId, pages, splitMutation]);

	if (!isScanning && events.length === 0) return null;

	return (
		<div className="flex-shrink-0 border-t border-slate-800 bg-slate-900/60">
			<div className="px-4 py-2 flex items-center justify-between">
				<h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
					<Scissors className="w-3.5 h-3.5" />
					Separator Events
				</h3>
				{isLoading && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
				<span className="text-[10px] text-slate-600">{events.length} detected</span>
			</div>

			{events.length === 0 ? (
				<div className="px-4 pb-3 text-xs text-slate-600 italic">
					No separators detected yet — feed polls every 5 s.
				</div>
			) : (
				<div className="px-4 pb-3 space-y-1.5 max-h-40 overflow-y-auto">
					{events.map((evt) => (
						<SeparatorEventRow
							key={evt.id}
							event={evt}
							onSplitHere={handleSplitHere}
						/>
					))}
				</div>
			)}
		</div>
	);
}

// ─── Main ScanningStation component ─────────────────────────────────────────

export function ScanningStation() {
	const { projectId, batchId } = useParams<{ projectId: string; batchId: string }>();
	const queryClient = useQueryClient();

	// Capture mode: which input UI is active (scanner / camera / stitch)
	const [captureMode, setCaptureMode] = useState<CaptureMode>('scanner');

	// Scan mode state (backend vs browser)
	const [scanMode, setScanMode] = useState<ScanMode>(() => {
		// Load from localStorage, default to 'backend'
		return (localStorage.getItem('scan-mode') as ScanMode) || 'backend';
	});
	const [showModeConfig, setShowModeConfig] = useState(false);

	// Save scan mode to localStorage
	useEffect(() => {
		localStorage.setItem('scan-mode', scanMode);
	}, [scanMode]);

	// Browser scanner hook
	const browserScanner = useBrowserScanner({
		autoDiscover: scanMode === 'browser',
	});

	// Fetch batch info from API
	const { data: batchData } = useQuery({
		queryKey: ['scanning-batch', projectId, batchId],
		queryFn: () => getBatch(projectId!, batchId!),
		enabled: !!projectId && !!batchId,
	});

	// Fetch batch documents from API
	const { data: batchDocuments = [] } = useQuery({
		queryKey: ['batch-documents', projectId, batchId],
		queryFn: () => getBatchDocuments(projectId!, batchId!),
		enabled: !!projectId && !!batchId,
	});

	const { data: projectData } = useQuery({
		queryKey: ['scanning-project', projectId],
		queryFn: () => getScanningProject(projectId!),
		enabled: !!projectId,
	});

	// Transform batch data to BatchInfo
	const batchProjectName = batchData
		? (batchData as typeof batchData & BatchWithProjectName).project_name
			?? (batchData as typeof batchData & BatchWithProjectName).projectName
			?? projectData?.name
			?? 'Loading...'
		: 'Loading...';
	const batch: BatchInfo = batchData ? {
		id: batchData.id,
		batchNumber: batchData.batchNumber,
		projectId: batchData.projectId,
		projectName: batchProjectName,
		estimatedPages: batchData.estimatedPages,
		scannedPages: batchData.scannedPages || 0,
		status: batchData.status as BatchInfo['status'],
	} : {
		id: batchId || '',
		batchNumber: 'Loading...',
		projectId: projectId || '',
		projectName: 'Loading...',
		estimatedPages: 0,
		scannedPages: 0,
		status: 'pending',
	};

	// Transform batch documents to ScannedPage format
	const fetchedPages: ScannedPage[] = batchDocuments.map((doc, index) =>
		transformBatchDocumentToScannedPage(doc, index)
	);

	// Fetch registered scanners
	const { data: scanners = [] } = useQuery({
		queryKey: ['scanners'],
		queryFn: () => getScanners(),
	});

	// Use first available scanner or allow selection
	const baseScannerInfo = scanners.find(s => s.status === 'online') || scanners[0];

	// Fetch capabilities for the active scanner
	const { data: scannerCapabilities } = useQuery({
		queryKey: ['scanner-capabilities', baseScannerInfo?.id],
		queryFn: () => getScannerCapabilities(baseScannerInfo!.id),
		enabled: !!baseScannerInfo?.id,
		staleTime: 5 * 60 * 1000, // Cache capabilities for 5 minutes
	});

	// Combine scanner info with fetched capabilities
	const activeScanner = baseScannerInfo ? {
		...baseScannerInfo,
		capabilities: scannerCapabilities || baseScannerInfo.capabilities,
	} : undefined;

	// State - initialize with fetched pages, update when they change
	const [pages, setPages] = useState<ScannedPage[]>([]);
	const [selectedPageId, setSelectedPageId] = useState<string | null>(null);

	// Sync pages state when fetchedPages changes
	useEffect(() => {
		if (fetchedPages.length > 0) {
			setPages(fetchedPages);
			if (!selectedPageId || !fetchedPages.find(p => p.id === selectedPageId)) {
				setSelectedPageId(fetchedPages[0]?.id || null);
			}
		}
	}, [fetchedPages, selectedPageId]);
	const [isScanning, setIsScanning] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [showHotkeyConfig, setShowHotkeyConfig] = useState(false);
	const [showCalibration, setShowCalibration] = useState(false);
	const [calibratedDpi, setCalibratedDpi] = useState<number | null>(() => loadCalibratedDpi());
	const [zoom, setZoom] = useState(100);

	// Hotkey bindings state
	const [hotkeys, setHotkeys] = useState<HotkeyMap>(() => loadHotkeys());

	const handleUpdateKey = useCallback((action: HotkeyAction, key: string) => {
		setHotkeys(prev => {
			const next = { ...prev, [action]: { ...prev[action], key } };
			saveHotkeys(next);
			return next;
		});
	}, []);
	const [scanError, setScanError] = useState<string | null>(null);
	const [settings, setSettings] = useState<ScanSettings>({
		dpi: 1200,
		colorMode: 'color',
		duplex: false,
		format: 'jpeg',
		autoCrop: true,
		autoDeskew: true,
		blankPageRemoval: true,
	});

	// Update settings when scanner capabilities change
	useEffect(() => {
		const caps = scannerCapabilities || baseScannerInfo?.capabilities;
		if (caps) {
			setSettings(prev => {
				const newSettings = { ...prev };

				// Set format to first available if current not supported
				if (caps.formats?.length && !caps.formats.includes(prev.format)) {
					newSettings.format = caps.formats[0] as ScanSettings['format'];
				}

				// Set color mode to first available if current not supported
				if (caps.colorModes?.length && !caps.colorModes.includes(prev.colorMode)) {
					newSettings.colorMode = caps.colorModes[0] as ScanSettings['colorMode'];
				}

				// Set DPI to closest available if current not supported
				if (caps.resolutions?.length && !caps.resolutions.includes(prev.dpi)) {
					// Find closest available resolution
					const closest = caps.resolutions.reduce((a, b) =>
						Math.abs(b - prev.dpi) < Math.abs(a - prev.dpi) ? b : a
					);
					newSettings.dpi = closest as ScanSettings['dpi'];
				}

				// Disable duplex if not supported
				if (!caps.adfDuplex) {
					newSettings.duplex = false;
				}

				return newSettings;
			});
		}
	}, [baseScannerInfo?.id, scannerCapabilities, baseScannerInfo?.capabilities]);

	// Scan mutation - calls the real scanner via eSCL/AirScan
	// Supports both backend mode (via server) and browser mode (direct connection)
	const scanMutation = useMutation({
		mutationFn: async () => {
			if (scanMode === 'browser') {
				// Browser-based direct scanning
				if (!browserScanner.activeScanner) {
					throw new Error('No browser scanner selected. Click the mode indicator to configure.');
				}

				const result = await browserScanner.scan({
					resolution: settings.dpi,
					colorMode: settings.colorMode,
					format: settings.format,
					duplex: settings.duplex,
					inputSource: 'platen',
					projectId,
					batchId,
				});

				if (!result.success) {
					throw new Error(result.errors.join(', ') || 'Browser scan failed');
				}

				// Return in the same format as backend quickScan
				return {
					jobId: `browser-${Date.now()}`,
					success: true,
					pagesScanned: result.pages.length,
					format: result.format,
					scanTimeMs: 0,
					documentIds: result.documentIds,
					errors: result.errors,
				};
			} else {
				// Backend mode - existing implementation
				if (!activeScanner) {
					throw new Error('No scanner available');
				}

				const options: ScanJobOptions = {
					resolution: settings.dpi,
					colorMode: settings.colorMode === 'monochrome' ? 'monochrome' : settings.colorMode,
					format: settings.format,
					duplex: settings.duplex,
					inputSource: 'platen',
				};

				return quickScan({
					scannerId: activeScanner.id,
					options,
					projectId,
					batchId,
				});
			}
		},
		onSuccess: (result) => {
			setScanError(null);

			// Refresh batch documents from server to get the persisted pages
			queryClient.invalidateQueries({ queryKey: ['batch-documents', projectId, batchId] });
			queryClient.invalidateQueries({ queryKey: ['scanning-batch', projectId, batchId] });

			// Also add to local state immediately for instant feedback
			if (result.pagesScanned > 0) {
				const newPages: ScannedPage[] = result.documentIds.map((docId, index) => {
					const metadata = getScanPageMetadata(result, docId, index);
					const qualityScore = readNumber(metadata?.qualityScore ?? metadata?.quality_score);
					const blurScore = readNumber(metadata?.blurScore ?? metadata?.blur_score);
					const hasBlur = readBoolean(metadata?.hasBlur ?? metadata?.has_blur) ?? false;
					const hasSkew = readBoolean(metadata?.hasSkew ?? metadata?.has_skew) ?? false;
					return {
						id: docId,
						pageNumber: pages.length + index + 1,
						thumbnailUrl: `/api/v1/thumbnails/${docId}`,
						fullImageUrl: `/api/v1/thumbnails/${docId}/full`,
						scannedAt: metadata?.scannedAt ?? metadata?.scanned_at ?? new Date().toISOString(),
						...(qualityScore !== undefined ? { qualityScore } : {}),
						hasBlur,
						hasSkew,
						skewAngle: readNumber(metadata?.skewAngle ?? metadata?.skew_angle) ?? 0,
						...(blurScore !== undefined ? { blurScore } : {}),
						needsReview: readBoolean(metadata?.needsReview ?? metadata?.needs_review) ?? false,
						status: metadata?.status ?? 'accepted' as const,
						rotation: 0,
					};
				});

				setPages(prev => [...prev, ...newPages]);
				if (newPages.length > 0) {
					setSelectedPageId(newPages[0].id);
				}
			}

			setIsScanning(false);
		},
		onError: (error) => {
			setScanError(error instanceof Error ? error.message : 'Scan failed');
			setIsScanning(false);
		},
	});

	const invalidateCurrentBatch = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ['batch-documents', projectId, batchId] });
		queryClient.invalidateQueries({ queryKey: ['scanning-batch', projectId, batchId] });
	}, [batchId, projectId, queryClient]);

	const updatePageMutation = useMutation({
		mutationFn: ({ pageId, status, rotation }: { pageId: string; status?: 'accepted' | 'rejected'; rotation?: number }) => {
			if (!batchId) throw new Error('Missing batch identifier');
			return updateBatchPage(batchId, pageId, { status, rotation });
		},
		onSuccess: () => {
			invalidateCurrentBatch();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : 'Failed to update page');
			invalidateCurrentBatch();
		},
	});

	const deletePageMutation = useMutation({
		mutationFn: (pageId: string) => {
			if (!batchId) throw new Error('Missing batch identifier');
			return deleteBatchPage(batchId, pageId);
		},
		onSuccess: () => {
			invalidateCurrentBatch();
		},
		onError: (error) => {
			toast.error(error instanceof Error ? error.message : 'Failed to delete page');
			invalidateCurrentBatch();
		},
	});

	const selectedPage = pages.find(p => p.id === selectedPageId);
	const issueCount = pages.filter(p => p.needsReview).length;
	const acceptedCount = pages.filter(p => p.status === 'accepted').length;
	const progress = batch.estimatedPages > 0
		? Math.round((batch.scannedPages / batch.estimatedPages) * 100)
		: 0;

	// Navigation
	const navigatePage = useCallback((direction: 'prev' | 'next') => {
		const currentIndex = pages.findIndex(p => p.id === selectedPageId);
		if (currentIndex === -1) return;

		const newIndex = direction === 'prev'
			? Math.max(0, currentIndex - 1)
			: Math.min(pages.length - 1, currentIndex + 1);

		setSelectedPageId(pages[newIndex].id);
	}, [pages, selectedPageId]);

	// Page actions
	const handleRotate = useCallback((direction: 'cw' | 'ccw') => {
		if (!selectedPageId) return;
		const delta = direction === 'cw' ? 90 : -90;
		const page = pages.find((item) => item.id === selectedPageId);
		if (!page) return;
		const rotation = (page.rotation + delta + 360) % 360;
		setPages((prev) =>
			prev.map((page) =>
				page.id === selectedPageId
					? { ...page, rotation }
					: page,
			),
		);
		updatePageMutation.mutate({ pageId: selectedPageId, rotation });
	}, [pages, selectedPageId, updatePageMutation]);

	const handleDelete = useCallback(() => {
		if (!selectedPageId) return;
		const currentIndex = pages.findIndex(p => p.id === selectedPageId);
		if (currentIndex === -1) return;
		deletePageMutation.mutate(selectedPageId, {
			onSuccess: () => {
				setPages(prev => prev.filter(p => p.id !== selectedPageId));
				// Select next page or previous if at end
				const nextPage = pages[currentIndex + 1] || pages[currentIndex - 1];
				setSelectedPageId(nextPage?.id || null);
			},
		});
	}, [deletePageMutation, selectedPageId, pages]);

	const handleRescan = useCallback((pageId: string) => {
		setPages((prev) =>
			prev.map((page) =>
				page.id === pageId ? { ...page, status: 'rescanning' as const } : page,
			),
		);
		setIsScanning(true);
		setScanError(null);
		scanMutation.mutate(undefined, {
			onSuccess: () => {
				setPages((prev) => prev.filter((page) => page.id !== pageId));
			},
			onError: () => {
				setPages((prev) =>
					prev.map((page) =>
						page.id === pageId ? { ...page, status: 'pending' as const } : page,
					),
				);
			},
		});
	}, [scanMutation]);

	const handleAcceptPage = useCallback(() => {
		if (!selectedPageId) return;
		setPages(prev => prev.map(p =>
			p.id === selectedPageId ? { ...p, status: 'accepted' as const, needsReview: false } : p
		));
		updatePageMutation.mutate({ pageId: selectedPageId, status: 'accepted' });
	}, [selectedPageId, updatePageMutation]);

	const handleRejectPage = useCallback(() => {
		if (!selectedPageId) return;
		setPages(prev => prev.map(p =>
			p.id === selectedPageId ? { ...p, status: 'rejected' as const } : p
		));
		updatePageMutation.mutate({ pageId: selectedPageId, status: 'rejected' });
	}, [selectedPageId, updatePageMutation]);

	// Scanning controls
	const toggleScanning = useCallback(() => {
		if (isScanning) {
			// Stop/pause scanning - just toggle state
			setIsScanning(false);
		} else {
			// Start scanning - call the real scanner via API
			setScanError(null);
			setIsScanning(true);
			scanMutation.mutate();
		}
	}, [isScanning, scanMutation]);

	const handleCompleteBatch = useCallback(() => {
		if (!projectId || !batchId) {
			toast.error('Missing project or batch identifier');
			return;
		}

		completeBatchScan(projectId, batchId, pages.length)
			.then(() => {
				toast.success('Batch marked as completed');
			})
			.catch((error: unknown) => {
				toast.error(error instanceof Error ? error.message : 'Failed to complete batch');
			});
	}, [batchId, pages.length, projectId]);

	// Stable refs so the keydown handler always sees current values
	const hotkeysRef = useRef(hotkeys);
	useEffect(() => { hotkeysRef.current = hotkeys; }, [hotkeys]);

	const actionsRef = useRef({
		toggleScanning,
		handleAcceptPage,
		handleRejectPage,
		handleCompleteBatch,
		setCaptureMode,
		showHotkeyConfig,
	});
	useEffect(() => {
		actionsRef.current = {
			toggleScanning,
			handleAcceptPage,
			handleRejectPage,
			handleCompleteBatch,
			setCaptureMode,
			showHotkeyConfig,
		};
	}, [toggleScanning, handleAcceptPage, handleRejectPage, handleCompleteBatch, showHotkeyConfig]);

	// Document-level hotkey listener
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			// Never fire when the user is typing in an input/textarea or a modal is open
			const target = e.target as HTMLElement;
			if (
				target.tagName === 'INPUT' ||
				target.tagName === 'TEXTAREA' ||
				target.isContentEditable ||
				actionsRef.current.showHotkeyConfig
			) return;

			const hk = hotkeysRef.current;
			switch (e.key) {
				case hk.scan_next.key:
					e.preventDefault();
					actionsRef.current.toggleScanning();
					break;
				case hk.accept_page.key:
					e.preventDefault();
					actionsRef.current.handleAcceptPage();
					break;
				case hk.reject_page.key:
					e.preventDefault();
					actionsRef.current.handleRejectPage();
					break;
				case hk.end_batch.key:
					e.preventDefault();
					actionsRef.current.handleCompleteBatch();
					break;
				case hk.camera_mode.key:
					e.preventDefault();
					actionsRef.current.setCaptureMode('camera');
					break;
			}
		};

		document.addEventListener('keydown', handler);
		return () => document.removeEventListener('keydown', handler);
	}, []); // intentionally empty — handler reads from refs

	return (
		<div className="h-screen flex flex-col bg-slate-950">
			{/* Header */}
			<header className="flex-shrink-0 bg-slate-900 border-b border-slate-800 px-6 py-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Link
							to={`/scanning-projects/${projectId}`}
							className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
						>
							<ArrowLeft className="w-5 h-5" />
						</Link>
						<div>
							<div className="flex items-center gap-2">
								<Package className="w-5 h-5 text-slate-500" />
								<h1 className="text-lg font-semibold text-slate-100">{batch.batchNumber}</h1>
								<span className={cn(
									'px-2 py-0.5 rounded-full text-xs font-medium capitalize',
									batch.status === 'scanning' && 'bg-blue-500/10 text-blue-400',
									batch.status === 'paused' && 'bg-amber-500/10 text-amber-400',
									batch.status === 'completed' && 'bg-emerald-500/10 text-emerald-400',
									batch.status === 'qc_pending' && 'bg-purple-500/10 text-purple-400',
									batch.status === 'pending' && 'bg-slate-500/10 text-slate-400'
								)}>
									{batch.status.replace('_', ' ')}
								</span>
							</div>
							<p className="text-sm text-slate-400">{batch.projectName}</p>
						</div>
					</div>

					{/* Progress indicator */}
					<div className="flex items-center gap-6">
						<div className="flex items-center gap-4 text-sm">
							<div className="flex items-center gap-2">
								<FileText className="w-4 h-4 text-slate-500" />
								<span className="text-slate-300">
									{batch.scannedPages} / {batch.estimatedPages} pages
								</span>
							</div>
							<div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
								<div
									className="h-full bg-brass-500 rounded-full transition-all"
									style={{ width: `${progress}%` }}
								/>
							</div>
							<span className="text-slate-400">{progress}%</span>
						</div>

						{issueCount > 0 && (
							<div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 rounded-lg">
								<AlertTriangle className="w-4 h-4 text-amber-400" />
								<span className="text-sm text-amber-400">{issueCount} issues</span>
							</div>
						)}
					</div>

					{/* Capture mode toggle + scanner controls */}
					<div className="flex items-center gap-2">
						{/* Separator sheet quick-print */}
						{projectId && (
							<a
								href={`/api/v1/scanning-projects/${projectId}/separator-sheet`}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-400 border border-slate-700 rounded-lg hover:text-slate-100 hover:border-slate-500 transition-colors"
								title="Download separator sheet PDF"
							>
								<Printer className="w-3.5 h-3.5" />
								Sep Sheet
							</a>
						)}
						{/* Capture mode toggle: Scanner | Camera | Stitch */}
						<div className="flex items-center rounded-lg border border-slate-700 overflow-hidden text-xs font-medium">
							{(['scanner', 'camera', 'stitch'] as CaptureMode[]).map((mode) => (
								<button
									key={mode}
									onClick={() => setCaptureMode(mode)}
									className={cn(
										'px-3 py-1.5 capitalize transition-colors',
										captureMode === mode
											? 'bg-brass-500 text-slate-900'
											: 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
									)}
								>
									{mode}
								</button>
							))}
						</div>

						{captureMode === 'scanner' && (
							<>
								<button
									onClick={() => setShowSettings(true)}
									className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
									title="Scan settings"
								>
									<Settings className="w-5 h-5" />
								</button>
								<button
									onClick={() => setShowHotkeyConfig(true)}
									className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
									title="Hotkey configuration"
								>
									<Keyboard className="w-5 h-5" />
								</button>
								<button
									onClick={toggleScanning}
									disabled={
										(scanMode === 'backend' ? !activeScanner : !browserScanner.activeScanner) ||
										scanMutation.isPending ||
										browserScanner.isScanning
									}
									className={cn(
										'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
										((scanMode === 'backend' ? !activeScanner : !browserScanner.activeScanner) ||
											scanMutation.isPending ||
											browserScanner.isScanning)
											? 'bg-slate-700 text-slate-500 cursor-not-allowed'
											: isScanning
												? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
												: 'bg-brass-500 text-slate-900 hover:bg-brass-400'
									)}
								>
									{scanMutation.isPending || browserScanner.isScanning ? (
										<>
											<Loader2 className="w-4 h-4 animate-spin" />
											{browserScanner.scanProgress
												? `Uploading ${browserScanner.scanProgress.current}/${browserScanner.scanProgress.total}...`
												: 'Scanning...'}
										</>
									) : isScanning ? (
										<>
											<Pause className="w-4 h-4" />
											Pause
										</>
									) : (
										<>
											<Play className="w-4 h-4" />
											Scan
										</>
									)}
								</button>
							</>
						)}
					</div>
				</div>

				{/* Settings summary bar */}
				<div className="flex items-center justify-between gap-4 mt-3 pt-3 border-t border-slate-800 text-sm text-slate-400">
					<div className="flex items-center gap-4">
						<span className="font-medium text-slate-300">Settings:</span>
						<span>{settings.dpi} DPI</span>
						<span className="capitalize">{settings.colorMode}</span>
						<span>{settings.duplex ? 'Duplex' : 'Simplex'}</span>
						<span className="uppercase">{settings.format}</span>
						{settings.autoDeskew && <span>Auto-Deskew</span>}
						{settings.autoCrop && <span>Auto-Crop</span>}
						{calibratedDpi !== null && (
							<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brass-500/10 border border-brass-500/30 text-brass-400 text-xs font-medium">
								<Crosshair className="w-3 h-3" />
								{calibratedDpi} DPI calibrated
							</span>
						)}
					</div>
					<div className="flex items-center gap-3">
						{/* Scan Mode Indicator */}
						<ScanModeIndicator mode={scanMode} onClick={() => setShowModeConfig(true)} />

						{/* Scanner Status */}
						{scanMode === 'backend' ? (
							// Backend mode - show registered scanner status
							activeScanner ? (
								<div className="flex items-center gap-2">
									<div className={cn(
										'w-2 h-2 rounded-full',
										activeScanner.status === 'online' ? 'bg-emerald-400' :
										activeScanner.status === 'busy' ? 'bg-amber-400 animate-pulse' :
										'bg-slate-500'
									)} />
									<span className="text-slate-300">{activeScanner.name}</span>
									<span className={cn(
										'text-xs capitalize',
										activeScanner.status === 'online' ? 'text-emerald-400' :
										activeScanner.status === 'busy' ? 'text-amber-400' :
										'text-slate-500'
									)}>
										({activeScanner.status})
									</span>
								</div>
							) : (
								<span className="text-amber-400 flex items-center gap-2">
									<AlertCircle className="w-4 h-4" />
									No scanner connected
								</span>
							)
						) : (
							// Browser mode - show browser scanner status
							browserScanner.activeScanner ? (
								<div className="flex items-center gap-2">
									<div className="w-2 h-2 rounded-full bg-emerald-400" />
									<span className="text-slate-300">
										{browserScanner.capabilities?.makeAndModel || browserScanner.activeScanner.name}
									</span>
									<span className="text-xs text-emerald-400">(Direct)</span>
								</div>
							) : (
								<button
									onClick={() => setShowModeConfig(true)}
									className="text-amber-400 flex items-center gap-2 hover:text-amber-300"
								>
									<AlertCircle className="w-4 h-4" />
									Configure scanner
								</button>
							)
						)}

						{/* Calibrate button */}
						<button
							onClick={() => setShowCalibration(true)}
							className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-400 hover:text-brass-300 hover:bg-slate-800 rounded-lg border border-slate-700 hover:border-brass-500/40 transition-colors"
							title="DPI calibration wizard"
						>
							<Crosshair className="w-3.5 h-3.5" />
							Calibrate
						</button>

						{/* Mode config button */}
						<button
							onClick={() => setShowModeConfig(true)}
							className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
							title="Scanner configuration"
						>
							<Sliders className="w-4 h-4" />
						</button>
					</div>
				</div>

				{/* Scan error alert */}
				{scanError && (
					<div className="mt-3 px-4 py-2 bg-rose-500/10 border border-rose-500/30 rounded-lg flex items-center justify-between">
						<div className="flex items-center gap-2 text-rose-400">
							<AlertCircle className="w-4 h-4" />
							<span className="text-sm">{scanError}</span>
						</div>
						<button
							onClick={() => setScanError(null)}
							className="text-rose-400 hover:text-rose-300"
						>
							<XCircle className="w-4 h-4" />
						</button>
					</div>
				)}
			</header>

			{/* Camera capture panel */}
			{captureMode === 'camera' && (
				<div className="flex-1 overflow-auto bg-slate-950 p-6">
					<CameraCapture
						onAccept={(_imageBase64, _dpi) => {
							// Accepted image: refresh batch documents to pick up server-side persist
							queryClient.invalidateQueries({ queryKey: ['batch-documents', projectId, batchId] });
							queryClient.invalidateQueries({ queryKey: ['scanning-batch', projectId, batchId] });
							setCaptureMode('scanner');
						}}
						onClose={() => setCaptureMode('scanner')}
					/>
				</div>
			)}

			{/* Image stitcher panel */}
			{captureMode === 'stitch' && (
				<div className="flex-1 overflow-auto bg-slate-950 p-6">
					<ImageStitcher
						batchId={batchId}
						onAccept={(_imageBase64) => {
							queryClient.invalidateQueries({ queryKey: ['batch-documents', projectId, batchId] });
							queryClient.invalidateQueries({ queryKey: ['scanning-batch', projectId, batchId] });
							setCaptureMode('scanner');
						}}
						onClose={() => setCaptureMode('scanner')}
					/>
				</div>
			)}

			{/* Main content */}
			{captureMode === 'scanner' && <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
				{/* Thumbnail panel */}
				<aside className="w-64 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
					<div className="p-3 border-b border-slate-800">
						<div className="flex items-center justify-between mb-2">
							<h2 className="text-sm font-medium text-slate-300">Scanned Pages</h2>
							<span className="text-xs text-slate-500">{pages.length} pages</span>
						</div>
						<div className="flex items-center gap-2 text-xs">
							<span className="flex items-center gap-1 text-emerald-400">
								<CheckCircle className="w-3 h-3" />
								{acceptedCount}
							</span>
							<span className="flex items-center gap-1 text-amber-400">
								<AlertTriangle className="w-3 h-3" />
								{issueCount}
							</span>
						</div>
					</div>

					<div className="flex-1 overflow-y-auto p-3">
						<div className="grid grid-cols-2 gap-2">
							{pages.map((page) => (
								<PageThumbnail
									key={page.id}
									page={page}
									isSelected={page.id === selectedPageId}
									onSelect={() => setSelectedPageId(page.id)}
									onRescan={() => handleRescan(page.id)}
								/>
							))}
						</div>
					</div>
				</aside>

				{/* Preview panel */}
				<main className="flex flex-col bg-slate-950 lg:flex-1">
					{/* Preview toolbar */}
					<div className="flex-shrink-0 flex flex-wrap items-center justify-between gap-1 px-4 py-2 bg-slate-900/50 border-b border-slate-800">
						<div className="flex flex-wrap items-center gap-1">
							<button
								onClick={() => navigatePage('prev')}
								disabled={!selectedPage || pages.indexOf(selectedPage) === 0}
								className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronLeft className="w-5 h-5" />
							</button>
							<span className="text-sm text-slate-300 min-w-[80px] text-center">
								Page {selectedPage?.pageNumber || 0} of {pages.length}
							</span>
							<button
								onClick={() => navigatePage('next')}
								disabled={!selectedPage || pages.indexOf(selectedPage) === pages.length - 1}
								className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
							>
								<ChevronRight className="w-5 h-5" />
							</button>
						</div>

						<div className="flex flex-wrap items-center gap-1">
							<button
								onClick={() => setZoom(z => Math.max(25, z - 25))}
								className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
								title="Zoom out"
							>
								<ZoomOut className="w-4 h-4" />
							</button>
							<span className="text-sm text-slate-400 min-w-[50px] text-center">{zoom}%</span>
							<button
								onClick={() => setZoom(z => Math.min(200, z + 25))}
								className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
								title="Zoom in"
							>
								<ZoomIn className="w-4 h-4" />
							</button>
							<button
								onClick={() => setZoom(100)}
								className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors ml-2"
								title="Fit to view"
							>
								<Maximize2 className="w-4 h-4" />
							</button>
						</div>

						<div className="flex flex-wrap items-center gap-1">
							<button
								onClick={() => handleRotate('ccw')}
								className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
								title="Rotate counter-clockwise"
							>
								<RotateCcw className="w-4 h-4" />
							</button>
							<button
								onClick={() => handleRotate('cw')}
								className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
								title="Rotate clockwise"
							>
								<RotateCw className="w-4 h-4" />
							</button>
							<div className="w-px h-5 bg-slate-700 mx-2" />
							<button
								onClick={() => selectedPageId && handleRescan(selectedPageId)}
								className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors"
								title="Rescan page"
							>
								<RefreshCw className="w-4 h-4" />
							</button>
							<button
								onClick={handleDelete}
								className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
								title="Delete page"
							>
								<Trash2 className="w-4 h-4" />
							</button>
						</div>
					</div>

					{/* Image preview */}
					<div className="flex-1 overflow-auto p-8 flex items-center justify-center">
						{selectedPage ? (
							<div
								className="relative bg-slate-900 rounded-lg shadow-xl overflow-hidden"
								style={{
									transform: `scale(${zoom / 100}) rotate(${selectedPage.rotation}deg)`,
									transformOrigin: 'center',
								}}
							>
								<AuthenticatedImage
									src={selectedPage.fullImageUrl}
									alt={`Page ${selectedPage.pageNumber}`}
									className="max-w-full max-h-[calc(100vh-300px)] object-contain"
								/>

								{/* Quality overlay indicators */}
								{selectedPage.needsReview && (
									<div className="absolute top-4 right-4 flex flex-col gap-2">
										{selectedPage.hasBlur && (
											<div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/90 text-slate-900 rounded-lg text-sm font-medium">
												<Eye className="w-4 h-4" />
												Blur Detected{selectedPage.blurScore !== undefined ? ` (${selectedPage.blurScore}%)` : ''}
											</div>
										)}
										{selectedPage.hasSkew && (
											<div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/90 text-slate-900 rounded-lg text-sm font-medium">
												<ScanLine className="w-4 h-4" />
												Skew: {selectedPage.skewAngle.toFixed(1)}°
											</div>
										)}
									</div>
								)}
							</div>
						) : (
							<div className="text-center text-slate-500">
								<ScanLine className="w-16 h-16 mx-auto mb-4 opacity-50" />
								<p>No page selected</p>
								<p className="text-sm">Click Scan to start scanning documents</p>
							</div>
						)}
					</div>

					{/* Quality panel and page actions */}
					{selectedPage && (
						<div className="flex-shrink-0 bg-slate-900 border-t border-slate-800 px-6 py-4">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-4">
									<h3 className="text-sm font-medium text-slate-300">Quality Check</h3>
									<QualityIndicator
										label="Focus"
										value={selectedPage.blurScore}
										threshold={70}
										icon={Eye}
									/>
									<QualityIndicator
										label="Quality"
										value={selectedPage.qualityScore}
										threshold={80}
										icon={CheckCircle}
									/>
									{selectedPage.hasSkew && (
										<div className="flex items-center gap-2 px-2 py-1 bg-amber-500/10 text-amber-400 rounded text-xs">
											<AlertCircle className="w-3 h-3" />
											<span>Skew: {selectedPage.skewAngle.toFixed(1)}°</span>
										</div>
									)}
								</div>

								<div className="flex items-center gap-2">
									{selectedPage.status === 'pending' && (
										<>
											<button
												onClick={handleRejectPage}
												className="inline-flex items-center gap-2 px-4 py-2 border border-rose-500/50 text-rose-400 rounded-lg text-sm font-medium hover:bg-rose-500/10 transition-colors"
											>
												<XCircle className="w-4 h-4" />
												Reject
											</button>
											<button
												onClick={handleAcceptPage}
												className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-slate-900 rounded-lg text-sm font-medium hover:bg-emerald-400 transition-colors"
											>
												<CheckCircle className="w-4 h-4" />
												Accept
											</button>
										</>
									)}
									{selectedPage.status === 'accepted' && (
										<span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-sm">
											<CheckCircle className="w-4 h-4" />
											Accepted
										</span>
									)}
									{selectedPage.status === 'rejected' && (
										<span className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 text-rose-400 rounded-lg text-sm">
											<XCircle className="w-4 h-4" />
											Rejected
										</span>
									)}
									{selectedPage.status === 'rescanning' && (
										<span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-sm">
											<Loader2 className="w-4 h-4 animate-spin" />
											Rescanning...
										</span>
									)}
								</div>
							</div>
						</div>
					)}
				</main>
			</div>}

			{/* Separator event live feed */}
			{projectId && (
				<SeparatorEventFeed
					projectId={projectId}
					batchId={batchId}
					pages={pages}
					isScanning={isScanning}
				/>
			)}

			{/* Footer - batch completion */}
			<footer className="flex-shrink-0 bg-slate-900 border-t border-slate-800 px-6 py-4">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-6 text-sm">
						<div className="flex items-center gap-2">
							<span className="text-slate-500">Total:</span>
							<span className="text-slate-300 font-medium">{pages.length} pages</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-slate-500">Accepted:</span>
							<span className="text-emerald-400 font-medium">{acceptedCount}</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-slate-500">Issues:</span>
							<span className={cn('font-medium', issueCount > 0 ? 'text-amber-400' : 'text-slate-400')}>
								{issueCount}
							</span>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-slate-500">Rejected:</span>
							<span className="text-rose-400 font-medium">
								{pages.filter(p => p.status === 'rejected').length}
							</span>
						</div>
					</div>

					<div className="flex items-center gap-3">
						{issueCount > 0 && (
							<span className="text-sm text-amber-400">
								Resolve {issueCount} issues before completing
							</span>
						)}
						<button
							onClick={handleCompleteBatch}
							disabled={issueCount > 0}
							className={cn(
								'inline-flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-colors',
								issueCount > 0
									? 'bg-slate-700 text-slate-500 cursor-not-allowed'
									: 'bg-brass-500 text-slate-900 hover:bg-brass-400'
							)}
						>
							<CheckCircle className="w-5 h-5" />
							Complete Batch
						</button>
					</div>
				</div>

				{/* Hotkey pill row */}
				<div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-800">
					<Keyboard className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
					<div className="flex items-center gap-1.5 flex-wrap">
						{(Object.keys(HOTKEY_ACTIONS) as HotkeyAction[]).map((action) => (
							<button
								key={action}
								onClick={() => setShowHotkeyConfig(true)}
								title={`${hotkeys[action].description} — click to reconfigure`}
								className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 hover:border-slate-600 transition-colors"
							>
								<kbd className="text-[10px] font-mono text-slate-300">{hotkeys[action].key}</kbd>
								<span className="text-[10px] text-slate-500">{hotkeys[action].label}</span>
							</button>
						))}
					</div>
				</div>
			</footer>

			{/* Settings dialog */}
			<SettingsDialog
				open={showSettings}
				onOpenChange={setShowSettings}
				settings={settings}
				onSave={setSettings}
				capabilities={scanMode === 'backend' ? activeScanner?.capabilities : convertESCLCapabilities(browserScanner.capabilities)}
			/>

			{/* Scanner Mode Configuration dialog */}
			<BrowserScannerConfig
				open={showModeConfig}
				onOpenChange={setShowModeConfig}
				scanMode={scanMode}
				onScanModeChange={setScanMode}
			/>

			{/* Hotkey Configuration dialog */}
			<HotkeyConfigModal
				open={showHotkeyConfig}
				onOpenChange={setShowHotkeyConfig}
				hotkeys={hotkeys}
				onUpdateKey={handleUpdateKey}
			/>

			{/* DPI Calibration wizard */}
			{showCalibration && projectId && (
				<CalibrationWizard
					projectId={projectId}
					onClose={() => setShowCalibration(false)}
					onCalibrated={(dpi) => {
						setCalibratedDpi(dpi);
						setShowCalibration(false);
					}}
				/>
			)}
		</div>
	);
}

/**
 * Convert eSCL capabilities to the internal ScannerCapabilities format
 */
function convertESCLCapabilities(caps: ESCLCapabilities | null): ScannerCapabilities | undefined {
	if (!caps) return undefined;

	return {
		platen: caps.platen.supported,
		adfPresent: caps.adf?.supported ?? false,
		adfDuplex: caps.adf?.duplex ?? false,
		adfCapacity: caps.adf?.capacity ?? 0,
		resolutions: caps.platen.resolutions,
		colorModes: caps.platen.colorModes.map(mode => {
			if (mode === 'RGB24' || mode === 'RGB48') return 'color';
			if (mode === 'Grayscale8' || mode === 'Grayscale16') return 'grayscale';
			if (mode === 'BlackAndWhite1') return 'monochrome';
			return 'color';
		}).filter((v, i, a) => a.indexOf(v) === i) as Array<'color' | 'grayscale' | 'monochrome'>,
		formats: caps.platen.formats.map(fmt => {
			if (fmt.includes('jpeg') || fmt.includes('jpg')) return 'jpeg';
			if (fmt.includes('png')) return 'png';
			if (fmt.includes('tiff') || fmt.includes('tif')) return 'tiff';
			if (fmt.includes('pdf')) return 'pdf';
			return 'jpeg';
		}).filter((v, i, a) => a.indexOf(v) === i) as Array<'jpeg' | 'png' | 'tiff' | 'pdf'>,
		maxWidthMm: Math.round(caps.platen.maxWidth / 300 * 25.4),
		maxHeightMm: Math.round(caps.platen.maxHeight / 300 * 25.4),
		autoCrop: true, // Assumed
		autoDeskew: true, // Assumed
		blankPageRemoval: true, // Assumed
		brightnessControl: true, // Assumed
		contrastControl: true, // Assumed
	};
}
