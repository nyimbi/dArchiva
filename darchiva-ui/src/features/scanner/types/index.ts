// Scanner Management Types

export type ScannerProtocol = 'escl' | 'sane' | 'twain' | 'wia';
export type ScannerStatus = 'online' | 'offline' | 'busy' | 'error' | 'maintenance';
export type ScanJobStatus = 'pending' | 'scanning' | 'processing' | 'completed' | 'cancelled' | 'failed';
export type ColorMode = 'color' | 'grayscale' | 'monochrome';
export type InputSource = 'platen' | 'adf' | 'adf_duplex';
export type ImageFormat = 'jpeg' | 'png' | 'tiff' | 'pdf';

export interface ScannerCapabilities {
	platen: boolean;
	adf_present: boolean;
	adf_duplex: boolean;
	adf_capacity: number;
	resolutions: number[];
	color_modes: ColorMode[];
	formats: ImageFormat[];
	max_width_mm: number;
	max_height_mm: number;
	auto_crop: boolean;
	auto_deskew: boolean;
	blank_page_removal: boolean;
	brightness_control: boolean;
	contrast_control: boolean;
}

export interface DiscoveredScanner {
	name: string;
	host: string;
	port: number;
	protocol: ScannerProtocol;
	uuid: string | null;
	manufacturer: string | null;
	model: string | null;
	serial: string | null;
	root_url: string | null;
	discovered_at: string;
}

export interface Scanner {
	id: string;
	tenant_id: string;
	name: string;
	protocol: ScannerProtocol;
	connection_uri: string;
	manufacturer: string | null;
	model: string | null;
	serial_number: string | null;
	firmware_version: string | null;
	status: ScannerStatus;
	last_seen_at: string | null;
	location_id: string | null;
	is_default: boolean;
	is_active: boolean;
	notes: string | null;
	total_pages_scanned: number;
	capabilities: ScannerCapabilities | null;
	created_at: string;
	updated_at: string;
}

export interface ScannerStatusInfo {
	scanner_id: string;
	status: ScannerStatus;
	available: boolean;
	state: string | null;
	adf_state: string | null;
	active_jobs: number;
	error: string | null;
	last_checked: string;
}

export interface ScanOptions {
	resolution: number;
	color_mode: ColorMode;
	input_source: InputSource;
	format: ImageFormat;
	quality: number;
	x_offset: number | null;
	y_offset: number | null;
	width: number | null;
	height: number | null;
	duplex: boolean;
	auto_crop: boolean;
	auto_deskew: boolean;
	blank_page_removal: boolean;
	batch_mode: boolean;
	max_pages: number | null;
	brightness: number;
	contrast: number;
}

export interface ScanJob {
	id: string;
	scanner_id: string;
	user_id: string;
	status: ScanJobStatus;
	options: ScanOptions;
	pages_scanned: number;
	project_id: string | null;
	batch_id: string | null;
	destination_folder_id: string | null;
	error_message: string | null;
	created_at: string;
	started_at: string | null;
	completed_at: string | null;
}

export interface ScanJobResult {
	job_id: string;
	success: boolean;
	pages_scanned: number;
	format: ImageFormat;
	scan_time_ms: number;
	document_ids: string[];
	errors: string[];
}

export interface ScanProfile {
	id: string;
	tenant_id: string;
	created_by_id: string;
	name: string;
	description: string | null;
	is_default: boolean;
	options: ScanOptions;
	created_at: string;
	updated_at: string;
}

export interface GlobalScannerSettings {
	auto_discovery_enabled: boolean;
	discovery_interval_seconds: number;
	default_profile_id: string | null;
	auto_process_scans: boolean;
	default_destination_folder_id: string | null;
}

export interface ScannerUsageStats {
	scanner_id: string;
	scanner_name: string;
	total_jobs: number;
	total_pages: number;
	successful_jobs: number;
	failed_jobs: number;
	average_pages_per_job: number;
	average_scan_time_ms: number;
	uptime_percentage: number;
}

export interface ScannerDashboard {
	total_scanners: number;
	online_scanners: number;
	offline_scanners: number;
	busy_scanners: number;
	total_pages_today: number;
	total_jobs_today: number;
	scanners: Scanner[];
	recent_jobs: ScanJob[];
	usage_stats: ScannerUsageStats[];
}

// Form types
export interface ScannerCreate {
	name: string;
	protocol: ScannerProtocol;
	connection_uri: string;
	location_id?: string;
	is_default?: boolean;
	is_active?: boolean;
	notes?: string;
}

export interface ScannerUpdate {
	name?: string;
	location_id?: string;
	is_default?: boolean;
	is_active?: boolean;
	notes?: string;
}

export interface ScanJobCreate {
	scanner_id: string;
	options?: Partial<ScanOptions>;
	project_id?: string;
	batch_id?: string;
	destination_folder_id?: string;
	auto_process?: boolean;
}

export interface ScanProfileCreate {
	name: string;
	description?: string;
	is_default?: boolean;
	options: ScanOptions;
}

export interface ScanProfileUpdate {
	name?: string;
	description?: string;
	is_default?: boolean;
	options?: ScanOptions;
}

// Default scan options
export const DEFAULT_SCAN_OPTIONS: ScanOptions = {
	resolution: 300,
	color_mode: 'color',
	input_source: 'platen',
	format: 'jpeg',
	quality: 85,
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
};

// Protocol display names
export const PROTOCOL_LABELS: Record<ScannerProtocol, string> = {
	escl: 'eSCL/AirScan',
	sane: 'SANE',
	twain: 'TWAIN',
	wia: 'WIA',
};

// Status display info
export const STATUS_CONFIG: Record<ScannerStatus, { label: string; color: string; ledClass: string }> = {
	online: { label: 'Online', color: 'text-emerald-400', ledClass: 'led-online' },
	offline: { label: 'Offline', color: 'text-gray-400', ledClass: 'led-offline' },
	busy: { label: 'Busy', color: 'text-amber-400', ledClass: 'led-busy' },
	error: { label: 'Error', color: 'text-red-400', ledClass: 'led-error' },
	maintenance: { label: 'Maintenance', color: 'text-purple-400', ledClass: 'led-offline' },
};
