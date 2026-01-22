// (c) Copyright Datacraft, 2026
/**
 * Scanner feature exports.
 */

// Core Components
export * from './components/core/StatusLED';
export * from './components/core/TechPanel';

// Main Components
export { ScannerDashboard } from './components/ScannerDashboard';
export * from './components/ScannerList';
export * from './components/ScannerDetail';
export * from './components/ScannerCard';
export * from './components/ScannerDiscovery';
export * from './components/ScanPreview';
export * from './components/ScannerPanel';
export * from './components/ScanControlPanel';
export * from './components/ScanProfilesManager';

// API Hooks
export * from './api/hooks';

// Types (excluding ScannerDashboard interface to avoid conflict)
export type {
	ScannerProtocol, ScannerStatus, ScanJobStatus, ColorMode, InputSource, ImageFormat,
	ScannerCapabilities, DiscoveredScanner, Scanner, ScannerStatusInfo, ScanOptions,
	ScanJob, ScanJobResult, ScanProfile, GlobalScannerSettings, ScannerUsageStats,
	ScannerCreate, ScannerUpdate, ScanJobCreate, ScanProfileCreate, ScanProfileUpdate,
	ScanPreviewData, PaperSize, PaperSource,
} from './types';
export {
	DEFAULT_SCAN_OPTIONS, PROTOCOL_LABELS, STATUS_CONFIG, RESOLUTION_PRESETS,
	COLOR_MODE_OPTIONS, PAPER_SIZE_OPTIONS, PAPER_SOURCE_OPTIONS,
} from './types';
export type { ScannerDashboard as ScannerDashboardData } from './types';
