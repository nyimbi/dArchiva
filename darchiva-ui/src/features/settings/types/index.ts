// Unified Settings Types
import type { UserPreferences } from '../../preferences/types';
import type { GlobalScannerSettings } from '../../scanner/types/index';

// === System Settings ===

export interface TenantSettings {
	id: string;
	name: string;
	domain: string;
	logo_url: string | null;
	primary_color: string | null;
	timezone: string;
	default_language: string;
	date_format: string;
	number_format: string;
	created_at: string;
	updated_at: string;
}

export interface StorageSettings {
	provider: 'local' | 's3' | 'linode' | 'r2';
	bucket_name: string | null;
	region: string | null;
	total_storage_bytes: number;
	used_storage_bytes: number;
	max_file_size_mb: number;
	allowed_file_types: string[];
	auto_archive_days: number | null;
	archive_tier: 'hot' | 'cold' | 'archive';
	versioning_enabled: boolean;
	max_versions: number;
}

export interface OCRSettings {
	default_engine: 'tesseract' | 'paddleocr' | 'qwen-vl' | 'hybrid';
	default_language: string;
	supported_languages: string[];
	auto_ocr_enabled: boolean;
	auto_classify_enabled: boolean;
	confidence_threshold: number;
	fallback_engine: string | null;
	gpu_acceleration: boolean;
}

export interface SearchSettings {
	backend: 'postgres' | 'elasticsearch' | 'meilisearch';
	semantic_search_enabled: boolean;
	embedding_model: string;
	index_on_upload: boolean;
	fuzzy_matching: boolean;
	min_score_threshold: number;
	max_results: number;
	highlight_enabled: boolean;
}

export interface WorkflowSettings {
	auto_routing_enabled: boolean;
	approval_timeout_hours: number;
	escalation_enabled: boolean;
	max_parallel_tasks: number;
	retry_failed_tasks: boolean;
	max_retries: number;
	email_notifications: boolean;
	slack_notifications: boolean;
	webhook_notifications: boolean;
}

export interface EmailSettings {
	smtp_host: string | null;
	smtp_port: number;
	smtp_username: string | null;
	smtp_use_tls: boolean;
	from_address: string;
	from_name: string;
	reply_to: string | null;
	email_templates_enabled: boolean;
	imap_enabled: boolean;
	imap_host: string | null;
	imap_port: number;
	auto_import_enabled: boolean;
	import_folder: string;
}

export interface SecuritySettings {
	mfa_required: boolean;
	mfa_methods: ('totp' | 'sms' | 'email' | 'webauthn')[];
	passkeys_enabled: boolean;
	session_timeout_minutes: number;
	password_min_length: number;
	password_require_special: boolean;
	password_require_numbers: boolean;
	password_require_uppercase: boolean;
	password_expiry_days: number | null;
	max_login_attempts: number;
	lockout_duration_minutes: number;
	ip_whitelist: string[];
	audit_log_retention_days: number;
	sensitive_data_masking: boolean;
}

export interface IntegrationSettings {
	oauth_providers: OAuthProvider[];
	webhooks: WebhookConfig[];
	api_rate_limit: number;
	api_key_enabled: boolean;
}

export interface OAuthProvider {
	id: string;
	name: string;
	enabled: boolean;
	client_id: string | null;
	scopes: string[];
}

export interface WebhookConfig {
	id: string;
	name: string;
	url: string;
	events: string[];
	active: boolean;
	secret: string | null;
	created_at: string;
}

// === Settings Sections ===

export type SettingsSectionId =
	| 'general'
	| 'appearance'
	| 'storage'
	| 'ocr'
	| 'search'
	| 'scanner'
	| 'workflow'
	| 'email'
	| 'security'
	| 'integrations'
	| 'notifications'
	| 'privacy'
	| 'users-access';

export interface SettingsSection {
	id: SettingsSectionId;
	label: string;
	description: string;
	icon: string;
	category: 'personal' | 'system' | 'integration';
	adminOnly?: boolean;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
	// Personal Settings
	{ id: 'general', label: 'General', description: 'Basic account settings', icon: 'user', category: 'personal' },
	{ id: 'appearance', label: 'Appearance', description: 'Theme and display preferences', icon: 'palette', category: 'personal' },
	{ id: 'notifications', label: 'Notifications', description: 'Email and browser alerts', icon: 'bell', category: 'personal' },
	{ id: 'privacy', label: 'Privacy', description: 'Activity and visibility settings', icon: 'eye-off', category: 'personal' },

	// System Settings (Admin only)
	{ id: 'storage', label: 'Storage', description: 'File storage configuration', icon: 'database', category: 'system', adminOnly: true },
	{ id: 'ocr', label: 'OCR & AI', description: 'Text recognition settings', icon: 'scan', category: 'system', adminOnly: true },
	{ id: 'search', label: 'Search', description: 'Search engine configuration', icon: 'search', category: 'system', adminOnly: true },
	{ id: 'scanner', label: 'Scanners', description: 'Scanner device settings', icon: 'printer', category: 'system', adminOnly: true },
	{ id: 'workflow', label: 'Workflows', description: 'Automation settings', icon: 'workflow', category: 'system', adminOnly: true },
	{ id: 'security', label: 'Security', description: 'Authentication and access control', icon: 'shield', category: 'system', adminOnly: true },

	// Integration Settings
	{ id: 'email', label: 'Email', description: 'Email server configuration', icon: 'mail', category: 'integration', adminOnly: true },
	{ id: 'integrations', label: 'Integrations', description: 'OAuth, webhooks, and APIs', icon: 'plug', category: 'integration', adminOnly: true },
];

// === Services & Workers ===

export type ServiceStatus = 'running' | 'stopped' | 'error' | 'starting' | 'stopping' | 'unknown';

export interface ServiceInfo {
	id: string;
	name: string;
	type: 'api' | 'worker' | 'scheduler' | 'indexer' | 'cache' | 'database' | 'storage' | 'external';
	status: ServiceStatus;
	host: string;
	port: number | null;
	version: string;
	uptime_seconds: number | null;
	last_heartbeat: string | null;
	memory_mb: number | null;
	cpu_percent: number | null;
	healthy: boolean;
	error_message: string | null;
	config: Record<string, any>;
	metrics: ServiceMetrics | null;
}

export interface ServiceMetrics {
	requests_per_second: number;
	avg_response_ms: number;
	error_rate: number;
	active_connections: number;
	queue_depth: number;
}

export interface WorkerInfo {
	id: string;
	name: string;
	queue: string;
	status: ServiceStatus;
	concurrency: number;
	active_tasks: number;
	completed_tasks: number;
	failed_tasks: number;
	last_task_at: string | null;
	current_task: string | null;
	memory_mb: number | null;
	cpu_percent: number | null;
	started_at: string | null;
}

export interface QueueInfo {
	name: string;
	pending: number;
	active: number;
	completed: number;
	failed: number;
	delayed: number;
	priority_pending: Record<string, number>;
	oldest_message_age_seconds: number | null;
	consumers: number;
}

export interface ScheduledTask {
	id: string;
	name: string;
	task_name: string;
	schedule: string; // cron expression
	category: string;
	enabled: boolean;
	is_running: boolean;
	last_run: string | null;
	next_run: string | null;
	last_status: 'success' | 'failed' | 'skipped' | null;
	last_run_success: boolean | null;
	last_duration_ms: number | null;
	last_duration_seconds: number | null;
	timeout_seconds: number | null;
	error_count: number;
	description: string | null;
	args: Record<string, unknown>;
}

export interface SystemHealth {
	overall_status: 'healthy' | 'degraded' | 'unhealthy';
	services: ServiceInfo[];
	workers: WorkerInfo[];
	queues: QueueInfo[];
	scheduled_tasks: ScheduledTask[];
	database: DatabaseHealth;
	storage: StorageHealth;
	cache: CacheHealth;
}

export interface DatabaseHealth {
	connected: boolean;
	latency_ms: number;
	active_connections: number;
	max_connections: number;
	disk_usage_bytes: number;
	disk_total_bytes: number;
	replication_lag_ms: number | null;
	last_backup: string | null;
}

export interface StorageHealth {
	available: boolean;
	latency_ms: number;
	used_bytes: number;
	total_bytes: number;
	objects_count: number;
}

export interface CacheHealth {
	connected: boolean;
	latency_ms: number;
	memory_used_bytes: number;
	memory_max_bytes: number;
	hit_rate: number;
	keys_count: number;
}

// === Service Configuration ===

export interface ServiceConfig {
	id: string;
	name: string;
	environment: Record<string, string>;
	enabled: boolean;
	auto_restart: boolean;
	restart_delay_seconds: number;
	max_restarts: number;
	healthcheck_interval_seconds: number;
	log_level: 'debug' | 'info' | 'warning' | 'error';
}

export interface WorkerConfig {
	queue: string;
	concurrency: number;
	enabled: boolean;
	prefetch_count: number;
	task_timeout_seconds: number;
	max_retries: number;
	retry_delay_seconds: number;
	priority_queues: string[];
}

// === Combined Settings State ===

export interface AllSettings {
	user: UserPreferences;
	tenant: TenantSettings;
	storage: StorageSettings;
	ocr: OCRSettings;
	search: SearchSettings;
	scanner: GlobalScannerSettings;
	workflow: WorkflowSettings;
	email: EmailSettings;
	security: SecuritySettings;
	integrations: IntegrationSettings;
}

// Update sections to include services
export const EXTENDED_SETTINGS_SECTIONS: SettingsSection[] = [
	...SETTINGS_SECTIONS,
	{ id: 'users-access', label: 'Users & Access', description: 'Manage users, groups, and roles', icon: 'users', category: 'system', adminOnly: true },
	{ id: 'services' as SettingsSectionId, label: 'Services', description: 'Manage running services', icon: 'server', category: 'system', adminOnly: true },
	{ id: 'workers' as SettingsSectionId, label: 'Workers', description: 'Background task workers', icon: 'cog', category: 'system', adminOnly: true },
	{ id: 'queues' as SettingsSectionId, label: 'Queues', description: 'Task queue monitoring', icon: 'list', category: 'system', adminOnly: true },
	{ id: 'scheduler' as SettingsSectionId, label: 'Scheduler', description: 'Scheduled tasks', icon: 'clock', category: 'system', adminOnly: true },
];
