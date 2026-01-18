// (c) Copyright Datacraft, 2026
/**
 * User preferences types.
 */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ViewMode = 'grid' | 'list' | 'table';
export type SortOrder = 'name_asc' | 'name_desc' | 'date_asc' | 'date_desc' | 'size_asc' | 'size_desc';
export type DateFormat = 'relative' | 'short' | 'long' | 'iso';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'pt' | 'it' | 'ja' | 'zh' | 'ko';

export interface UserPreferences {
	// Appearance
	theme: ThemeMode;
	accent_color?: string;
	compact_mode: boolean;
	animations_enabled: boolean;

	// Document browser
	default_view: ViewMode;
	default_sort: SortOrder;
	show_thumbnails: boolean;
	thumbnail_size: 'small' | 'medium' | 'large';
	show_hidden_files: boolean;
	show_file_extensions: boolean;

	// Dates & localization
	date_format: DateFormat;
	language: Language;
	timezone?: string;

	// Notifications
	email_notifications: boolean;
	browser_notifications: boolean;
	notification_sound: boolean;
	notify_on_share: boolean;
	notify_on_comment: boolean;
	notify_on_workflow: boolean;
	daily_digest: boolean;

	// Keyboard shortcuts
	keyboard_shortcuts_enabled: boolean;
	vim_mode: boolean;

	// Privacy
	activity_visible: boolean;
	online_status_visible: boolean;

	// Scanner
	default_scanner_id?: string;
	default_scan_resolution: number;
	default_scan_color_mode: 'color' | 'grayscale' | 'bw';
	default_scan_format: 'pdf' | 'png' | 'jpg' | 'tiff';
	auto_ocr_on_scan: boolean;

	// OCR
	default_ocr_engine: 'tesseract' | 'paddleocr' | 'qwen-vl' | 'auto';
	default_ocr_language: string;

	// Editor
	pdf_viewer_mode: 'single' | 'double' | 'continuous';
	auto_save_interval: number;
	confirm_on_delete: boolean;
}

export interface PreferencesSection {
	id: string;
	label: string;
	icon: string;
	description: string;
}

export const PREFERENCE_SECTIONS: PreferencesSection[] = [
	{ id: 'appearance', label: 'Appearance', icon: 'palette', description: 'Theme, colors, and display settings' },
	{ id: 'browser', label: 'Document Browser', icon: 'folder', description: 'Default views and sorting' },
	{ id: 'localization', label: 'Language & Region', icon: 'globe', description: 'Language, date format, timezone' },
	{ id: 'notifications', label: 'Notifications', icon: 'bell', description: 'Email and browser notifications' },
	{ id: 'keyboard', label: 'Keyboard', icon: 'keyboard', description: 'Shortcuts and navigation' },
	{ id: 'privacy', label: 'Privacy', icon: 'shield', description: 'Activity visibility settings' },
	{ id: 'scanner', label: 'Scanner', icon: 'scan', description: 'Default scanner settings' },
	{ id: 'ocr', label: 'OCR', icon: 'scan-text', description: 'Text recognition settings' },
	{ id: 'editor', label: 'Editor', icon: 'file-text', description: 'Document viewing settings' },
];

export const DEFAULT_PREFERENCES: UserPreferences = {
	theme: 'system',
	compact_mode: false,
	animations_enabled: true,
	default_view: 'grid',
	default_sort: 'name_asc',
	show_thumbnails: true,
	thumbnail_size: 'medium',
	show_hidden_files: false,
	show_file_extensions: true,
	date_format: 'relative',
	language: 'en',
	email_notifications: true,
	browser_notifications: true,
	notification_sound: true,
	notify_on_share: true,
	notify_on_comment: true,
	notify_on_workflow: true,
	daily_digest: false,
	keyboard_shortcuts_enabled: true,
	vim_mode: false,
	activity_visible: true,
	online_status_visible: true,
	default_scan_resolution: 300,
	default_scan_color_mode: 'color',
	default_scan_format: 'pdf',
	auto_ocr_on_scan: true,
	default_ocr_engine: 'auto',
	default_ocr_language: 'eng',
	pdf_viewer_mode: 'continuous',
	auto_save_interval: 30,
	confirm_on_delete: true,
};
