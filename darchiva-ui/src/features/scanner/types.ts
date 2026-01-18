// (c) Copyright Datacraft, 2026
/**
 * Scanner feature types.
 */

export type ScannerProtocol = 'escl' | 'sane' | 'wia';
export type ScannerStatus = 'idle' | 'warming_up' | 'scanning' | 'busy' | 'error' | 'offline';
export type ScanJobStatus = 'pending' | 'scanning' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type ColorMode = 'color' | 'grayscale' | 'blackwhite';
export type PaperSize = 'a4' | 'a3' | 'letter' | 'legal' | 'auto';
export type PaperSource = 'flatbed' | 'adf_simplex' | 'adf_duplex';

export interface Scanner {
	id: string;
	name: string;
	manufacturer?: string;
	model?: string;
	protocol: ScannerProtocol;
	connectionUri: string;
	status: ScannerStatus;
	capabilities: ScannerCapabilities;
	isActive: boolean;
	lastSeenAt?: string;
	createdAt: string;
}

export interface ScannerCapabilities {
	colorModes: ColorMode[];
	paperSizes: PaperSize[];
	paperSources: PaperSource[];
	resolutions: number[]; // DPI values
	maxResolution: number;
	minResolution: number;
	hasFlatbed: boolean;
	hasAdf: boolean;
	adfCapacity?: number;
	supportsDuplex: boolean;
	supportsPreview: boolean;
}

export interface ScanOptions {
	resolution: number;
	colorMode: ColorMode;
	paperSize: PaperSize;
	paperSource: PaperSource;
	brightness?: number; // -100 to 100
	contrast?: number; // -100 to 100
	duplex?: boolean;
	pageCount?: number; // For ADF, 0 = all pages
}

export interface ScanJob {
	id: string;
	scannerId: string;
	userId: string;
	status: ScanJobStatus;
	options: ScanOptions;
	pagesScanned: number;
	totalPages?: number;
	progress: number; // 0-100
	startedAt?: string;
	completedAt?: string;
	error?: string;
	outputDocumentId?: string;
}

export interface ScanPreviewData {
	imageUrl: string;
	width: number;
	height: number;
	format: 'jpeg' | 'png';
}

export interface DiscoveredScanner {
	name: string;
	manufacturer?: string;
	model?: string;
	protocol: ScannerProtocol;
	connectionUri: string;
	capabilities?: Partial<ScannerCapabilities>;
}

export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
	resolution: 300,
	colorMode: 'color',
	paperSize: 'a4',
	paperSource: 'flatbed',
	brightness: 0,
	contrast: 0,
	duplex: false,
};

export const RESOLUTION_PRESETS = [
	{ value: 150, label: '150 DPI', description: 'Draft quality, fast' },
	{ value: 300, label: '300 DPI', description: 'Standard quality' },
	{ value: 600, label: '600 DPI', description: 'High quality' },
	{ value: 1200, label: '1200 DPI', description: 'Maximum quality, slow' },
];

export const COLOR_MODE_OPTIONS: Array<{ value: ColorMode; label: string; icon: string }> = [
	{ value: 'color', label: 'Color', icon: 'palette' },
	{ value: 'grayscale', label: 'Grayscale', icon: 'contrast' },
	{ value: 'blackwhite', label: 'Black & White', icon: 'circle' },
];

export const PAPER_SIZE_OPTIONS: Array<{ value: PaperSize; label: string; dimensions: string }> = [
	{ value: 'a4', label: 'A4', dimensions: '210 × 297 mm' },
	{ value: 'a3', label: 'A3', dimensions: '297 × 420 mm' },
	{ value: 'letter', label: 'Letter', dimensions: '8.5 × 11 in' },
	{ value: 'legal', label: 'Legal', dimensions: '8.5 × 14 in' },
	{ value: 'auto', label: 'Auto Detect', dimensions: 'Automatic' },
];

export const PAPER_SOURCE_OPTIONS: Array<{ value: PaperSource; label: string; description: string }> = [
	{ value: 'flatbed', label: 'Flatbed', description: 'Single page on glass' },
	{ value: 'adf_simplex', label: 'ADF (Single-sided)', description: 'Automatic document feeder' },
	{ value: 'adf_duplex', label: 'ADF (Double-sided)', description: 'Scan both sides' },
];
