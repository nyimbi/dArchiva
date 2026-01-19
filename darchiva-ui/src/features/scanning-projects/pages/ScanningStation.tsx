// (c) Copyright Datacraft, 2026
import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
	ArrowLeft,
	Play,
	Pause,
	Settings,
	RotateCw,
	RotateCcw,
	Trash2,
	RefreshCw,
	CheckCircle,
	AlertTriangle,
	AlertCircle,
	ChevronLeft,
	ChevronRight,
	ZoomIn,
	ZoomOut,
	Maximize2,
	Package,
	FileText,
	ScanLine,
	Eye,
	XCircle,
	Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as Dialog from '@radix-ui/react-dialog';

// Types for the scanning station
interface ScannedPage {
	id: string;
	pageNumber: number;
	thumbnailUrl: string;
	fullImageUrl: string;
	scannedAt: string;
	qualityScore: number;
	hasBlur: boolean;
	hasSkew: boolean;
	skewAngle: number;
	blurScore: number;
	needsReview: boolean;
	status: 'pending' | 'accepted' | 'rejected' | 'rescanning';
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

// Mock data for demonstration
const mockBatch: BatchInfo = {
	id: 'batch-001',
	batchNumber: 'BOX-2026-0142',
	projectId: 'proj-001',
	projectName: 'City Archives Digitization',
	estimatedPages: 250,
	scannedPages: 87,
	status: 'scanning',
};

const mockPages: ScannedPage[] = Array.from({ length: 12 }, (_, i) => ({
	id: `page-${i + 1}`,
	pageNumber: i + 1,
	thumbnailUrl: `https://picsum.photos/seed/${i + 100}/200/280`,
	fullImageUrl: `https://picsum.photos/seed/${i + 100}/1200/1600`,
	scannedAt: new Date(Date.now() - (12 - i) * 30000).toISOString(),
	qualityScore: 75 + Math.floor(Math.random() * 25),
	hasBlur: i === 3 || i === 7,
	hasSkew: i === 5,
	skewAngle: i === 5 ? 2.3 : 0,
	blurScore: i === 3 ? 35 : i === 7 ? 42 : 85 + Math.floor(Math.random() * 15),
	needsReview: i === 3 || i === 5 || i === 7,
	status: i === 3 || i === 5 || i === 7 ? 'pending' : 'accepted',
}));

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
	value: number;
	threshold: number;
	icon: typeof AlertTriangle;
}) {
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
			<img
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

function SettingsDialog({ open, onOpenChange, settings, onSave }: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	settings: ScanSettings;
	onSave: (settings: ScanSettings) => void;
}) {
	const [localSettings, setLocalSettings] = useState(settings);

	const handleSave = () => {
		onSave(localSettings);
		onOpenChange(false);
	};

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
							<div className="grid grid-cols-4 gap-2">
								{DPI_OPTIONS.map((opt) => (
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
							<div className="grid grid-cols-3 gap-2">
								{COLOR_MODE_OPTIONS.map((opt) => (
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
							<div className="grid grid-cols-4 gap-2">
								{FORMAT_OPTIONS.map((opt) => (
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
							{[
								{ key: 'duplex', label: 'Duplex Scanning (Double-sided)' },
								{ key: 'autoCrop', label: 'Auto Crop' },
								{ key: 'autoDeskew', label: 'Auto Deskew' },
								{ key: 'blankPageRemoval', label: 'Blank Page Removal' },
							].map(({ key, label }) => (
								<label key={key} className="flex items-center gap-3 cursor-pointer">
									<input
										type="checkbox"
										checked={localSettings[key as keyof ScanSettings] as boolean}
										onChange={(e) => setLocalSettings({ ...localSettings, [key]: e.target.checked })}
										className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-brass-500 focus:ring-brass-500 focus:ring-offset-slate-900"
									/>
									<span className="text-sm text-slate-300">{label}</span>
								</label>
							))}
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

export function ScanningStation() {
	const { projectId, batchId } = useParams<{ projectId: string; batchId: string }>();

	// State
	const [batch] = useState<BatchInfo>(mockBatch);
	const [pages, setPages] = useState<ScannedPage[]>(mockPages);
	const [selectedPageId, setSelectedPageId] = useState<string | null>(mockPages[0]?.id || null);
	const [isScanning, setIsScanning] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [zoom, setZoom] = useState(100);
	const [settings, setSettings] = useState<ScanSettings>({
		dpi: 300,
		colorMode: 'color',
		duplex: true,
		format: 'tiff',
		autoCrop: true,
		autoDeskew: true,
		blankPageRemoval: true,
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
		// In real implementation, this would call an API to rotate the image
		console.log(`Rotating ${selectedPageId} ${direction}`);
	}, [selectedPageId]);

	const handleDelete = useCallback(() => {
		if (!selectedPageId) return;
		setPages(prev => prev.filter(p => p.id !== selectedPageId));
		// Select next page or previous if at end
		const currentIndex = pages.findIndex(p => p.id === selectedPageId);
		const nextPage = pages[currentIndex + 1] || pages[currentIndex - 1];
		setSelectedPageId(nextPage?.id || null);
	}, [selectedPageId, pages]);

	const handleRescan = useCallback((pageId: string) => {
		setPages(prev => prev.map(p =>
			p.id === pageId ? { ...p, status: 'rescanning' as const } : p
		));
		// Simulate rescan completion
		setTimeout(() => {
			setPages(prev => prev.map(p =>
				p.id === pageId
					? { ...p, status: 'accepted' as const, needsReview: false, hasBlur: false, hasSkew: false, qualityScore: 95 }
					: p
			));
		}, 2000);
	}, []);

	const handleAcceptPage = useCallback(() => {
		if (!selectedPageId) return;
		setPages(prev => prev.map(p =>
			p.id === selectedPageId ? { ...p, status: 'accepted' as const, needsReview: false } : p
		));
	}, [selectedPageId]);

	const handleRejectPage = useCallback(() => {
		if (!selectedPageId) return;
		setPages(prev => prev.map(p =>
			p.id === selectedPageId ? { ...p, status: 'rejected' as const } : p
		));
	}, [selectedPageId]);

	// Scanning controls
	const toggleScanning = useCallback(() => {
		setIsScanning(prev => !prev);
	}, []);

	const handleCompleteBatch = useCallback(() => {
		// In real implementation, this would finalize the batch
		console.log('Completing batch', batchId);
	}, [batchId]);

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

					{/* Scanner controls */}
					<div className="flex items-center gap-2">
						<button
							onClick={() => setShowSettings(true)}
							className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
							title="Scan settings"
						>
							<Settings className="w-5 h-5" />
						</button>
						<button
							onClick={toggleScanning}
							className={cn(
								'inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors',
								isScanning
									? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
									: 'bg-brass-500 text-slate-900 hover:bg-brass-400'
							)}
						>
							{isScanning ? (
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
					</div>
				</div>

				{/* Settings summary bar */}
				<div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-800 text-sm text-slate-400">
					<span className="font-medium text-slate-300">Settings:</span>
					<span>{settings.dpi} DPI</span>
					<span className="capitalize">{settings.colorMode}</span>
					<span>{settings.duplex ? 'Duplex' : 'Simplex'}</span>
					<span className="uppercase">{settings.format}</span>
					{settings.autoDeskew && <span>Auto-Deskew</span>}
					{settings.autoCrop && <span>Auto-Crop</span>}
				</div>
			</header>

			{/* Main content */}
			<div className="flex-1 flex overflow-hidden">
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
				<main className="flex-1 flex flex-col bg-slate-950">
					{/* Preview toolbar */}
					<div className="flex-shrink-0 flex items-center justify-between px-4 py-2 bg-slate-900/50 border-b border-slate-800">
						<div className="flex items-center gap-2">
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

						<div className="flex items-center gap-1">
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

						<div className="flex items-center gap-1">
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
								style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center' }}
							>
								<img
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
												Blur Detected ({selectedPage.blurScore}%)
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
			</div>

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
			</footer>

			{/* Settings dialog */}
			<SettingsDialog
				open={showSettings}
				onOpenChange={setShowSettings}
				settings={settings}
				onSave={setSettings}
			/>
		</div>
	);
}
