// (c) Copyright Datacraft, 2026
/**
 * User preferences panel with sections.
 */
import { useState } from 'react';
import {
	Settings,
	Palette,
	Folder,
	Globe,
	Bell,
	Keyboard,
	Shield,
	ScanLine,
	FileText,
	ScanText,
	RotateCcw,
	Loader2,
	Moon,
	Sun,
	Monitor,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePreferences, useUpdatePreferences, useResetPreferences } from '../api';
import type { UserPreferences, ThemeMode, ViewMode, SortOrder, DateFormat, Language } from '../types';
import { PREFERENCE_SECTIONS } from '../types';

const sectionIcons: Record<string, typeof Settings> = {
	appearance: Palette,
	browser: Folder,
	localization: Globe,
	notifications: Bell,
	keyboard: Keyboard,
	privacy: Shield,
	scanner: ScanLine,
	ocr: ScanText,
	editor: FileText,
};

export function PreferencesPanel() {
	const [activeSection, setActiveSection] = useState('appearance');
	const [showResetDialog, setShowResetDialog] = useState(false);

	const { data: preferences, isLoading } = usePreferences();
	const updatePrefs = useUpdatePreferences();
	const resetPrefs = useResetPreferences();

	const handleUpdate = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
		updatePrefs.mutate({ [key]: value });
	};

	const handleReset = async () => {
		await resetPrefs.mutateAsync();
		setShowResetDialog(false);
	};

	if (isLoading) {
		return (
			<div className="flex gap-6">
				<div className="w-56 space-y-2">
					{Array.from({ length: 9 }).map((_, i) => (
						<Skeleton key={i} className="h-10" />
					))}
				</div>
				<div className="flex-1 space-y-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-16" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="flex gap-6">
			{/* Section navigation */}
			<nav className="w-56 space-y-1">
				{PREFERENCE_SECTIONS.map((section) => {
					const Icon = sectionIcons[section.id] || Settings;
					return (
						<button
							key={section.id}
							onClick={() => setActiveSection(section.id)}
							className={cn(
								'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
								activeSection === section.id
									? 'bg-primary text-primary-foreground'
									: 'hover:bg-accent'
							)}
						>
							<Icon className="h-4 w-4" />
							<span className="text-sm font-medium">{section.label}</span>
						</button>
					);
				})}
				<div className="pt-4">
					<Button
						variant="outline"
						className="w-full gap-2"
						onClick={() => setShowResetDialog(true)}
					>
						<RotateCcw className="h-4 w-4" />
						Reset All
					</Button>
				</div>
			</nav>

			{/* Section content */}
			<div className="flex-1">
				{activeSection === 'appearance' && preferences && (
					<AppearanceSection preferences={preferences} onUpdate={handleUpdate} />
				)}
				{activeSection === 'browser' && preferences && (
					<BrowserSection preferences={preferences} onUpdate={handleUpdate} />
				)}
				{activeSection === 'localization' && preferences && (
					<LocalizationSection preferences={preferences} onUpdate={handleUpdate} />
				)}
				{activeSection === 'notifications' && preferences && (
					<NotificationsSection preferences={preferences} onUpdate={handleUpdate} />
				)}
				{activeSection === 'keyboard' && preferences && (
					<KeyboardSection preferences={preferences} onUpdate={handleUpdate} />
				)}
				{activeSection === 'privacy' && preferences && (
					<PrivacySection preferences={preferences} onUpdate={handleUpdate} />
				)}
				{activeSection === 'scanner' && preferences && (
					<ScannerSection preferences={preferences} onUpdate={handleUpdate} />
				)}
				{activeSection === 'ocr' && preferences && (
					<OCRSection preferences={preferences} onUpdate={handleUpdate} />
				)}
				{activeSection === 'editor' && preferences && (
					<EditorSection preferences={preferences} onUpdate={handleUpdate} />
				)}
			</div>

			{/* Reset confirmation */}
			<AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Reset Preferences</AlertDialogTitle>
						<AlertDialogDescription>
							This will reset all your preferences to their default values. This action cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction onClick={handleReset}>
							{resetPrefs.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
							Reset
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

interface SectionProps {
	preferences: UserPreferences;
	onUpdate: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;
}

function AppearanceSection({ preferences, onUpdate }: SectionProps) {
	const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
		{ value: 'light', label: 'Light', icon: Sun },
		{ value: 'dark', label: 'Dark', icon: Moon },
		{ value: 'system', label: 'System', icon: Monitor },
	];

	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">Appearance</h3>
				<p className="text-sm text-muted-foreground">Customize the look and feel</p>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label>Theme</Label>
					<div className="flex gap-2">
						{themeOptions.map((opt) => (
							<button
								key={opt.value}
								onClick={() => onUpdate('theme', opt.value)}
								className={cn(
									'flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors',
									preferences.theme === opt.value
										? 'bg-primary text-primary-foreground border-primary'
										: 'hover:bg-accent'
								)}
							>
								<opt.icon className="h-4 w-4" />
								{opt.label}
							</button>
						))}
					</div>
				</div>

				<PreferenceToggle
					label="Compact Mode"
					description="Use smaller spacing and text"
					checked={preferences.compact_mode}
					onCheckedChange={(v) => onUpdate('compact_mode', v)}
				/>

				<PreferenceToggle
					label="Animations"
					description="Enable motion and transitions"
					checked={preferences.animations_enabled}
					onCheckedChange={(v) => onUpdate('animations_enabled', v)}
				/>
			</div>
		</div>
	);
}

function BrowserSection({ preferences, onUpdate }: SectionProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">Document Browser</h3>
				<p className="text-sm text-muted-foreground">Default view and sorting options</p>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label>Default View</Label>
					<Select
						value={preferences.default_view}
						onValueChange={(v) => onUpdate('default_view', v as ViewMode)}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="grid">Grid</SelectItem>
							<SelectItem value="list">List</SelectItem>
							<SelectItem value="table">Table</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label>Default Sort</Label>
					<Select
						value={preferences.default_sort}
						onValueChange={(v) => onUpdate('default_sort', v as SortOrder)}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="name_asc">Name (A-Z)</SelectItem>
							<SelectItem value="name_desc">Name (Z-A)</SelectItem>
							<SelectItem value="date_asc">Date (Oldest)</SelectItem>
							<SelectItem value="date_desc">Date (Newest)</SelectItem>
							<SelectItem value="size_asc">Size (Smallest)</SelectItem>
							<SelectItem value="size_desc">Size (Largest)</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<PreferenceToggle
					label="Show Thumbnails"
					description="Display preview images for documents"
					checked={preferences.show_thumbnails}
					onCheckedChange={(v) => onUpdate('show_thumbnails', v)}
				/>

				<div className="space-y-2">
					<Label>Thumbnail Size</Label>
					<Select
						value={preferences.thumbnail_size}
						onValueChange={(v) => onUpdate('thumbnail_size', v as 'small' | 'medium' | 'large')}
						disabled={!preferences.show_thumbnails}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="small">Small</SelectItem>
							<SelectItem value="medium">Medium</SelectItem>
							<SelectItem value="large">Large</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<PreferenceToggle
					label="Show Hidden Files"
					description="Display files starting with a dot"
					checked={preferences.show_hidden_files}
					onCheckedChange={(v) => onUpdate('show_hidden_files', v)}
				/>

				<PreferenceToggle
					label="Show File Extensions"
					description="Display .pdf, .docx, etc."
					checked={preferences.show_file_extensions}
					onCheckedChange={(v) => onUpdate('show_file_extensions', v)}
				/>
			</div>
		</div>
	);
}

function LocalizationSection({ preferences, onUpdate }: SectionProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">Language & Region</h3>
				<p className="text-sm text-muted-foreground">Language and date format settings</p>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label>Language</Label>
					<Select
						value={preferences.language}
						onValueChange={(v) => onUpdate('language', v as Language)}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="en">English</SelectItem>
							<SelectItem value="es">Español</SelectItem>
							<SelectItem value="fr">Français</SelectItem>
							<SelectItem value="de">Deutsch</SelectItem>
							<SelectItem value="pt">Português</SelectItem>
							<SelectItem value="it">Italiano</SelectItem>
							<SelectItem value="ja">日本語</SelectItem>
							<SelectItem value="zh">中文</SelectItem>
							<SelectItem value="ko">한국어</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label>Date Format</Label>
					<Select
						value={preferences.date_format}
						onValueChange={(v) => onUpdate('date_format', v as DateFormat)}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="relative">Relative (2 days ago)</SelectItem>
							<SelectItem value="short">Short (Jan 15)</SelectItem>
							<SelectItem value="long">Long (January 15, 2026)</SelectItem>
							<SelectItem value="iso">ISO (2026-01-15)</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}

function NotificationsSection({ preferences, onUpdate }: SectionProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">Notifications</h3>
				<p className="text-sm text-muted-foreground">How and when to be notified</p>
			</div>

			<div className="space-y-4">
				<PreferenceToggle
					label="Email Notifications"
					description="Receive notifications by email"
					checked={preferences.email_notifications}
					onCheckedChange={(v) => onUpdate('email_notifications', v)}
				/>

				<PreferenceToggle
					label="Browser Notifications"
					description="Show desktop notifications"
					checked={preferences.browser_notifications}
					onCheckedChange={(v) => onUpdate('browser_notifications', v)}
				/>

				<PreferenceToggle
					label="Notification Sound"
					description="Play a sound for notifications"
					checked={preferences.notification_sound}
					onCheckedChange={(v) => onUpdate('notification_sound', v)}
				/>

				<div className="pt-2 border-t">
					<Label className="text-muted-foreground">Notify me about</Label>
				</div>

				<PreferenceToggle
					label="Shares"
					description="When someone shares something with you"
					checked={preferences.notify_on_share}
					onCheckedChange={(v) => onUpdate('notify_on_share', v)}
				/>

				<PreferenceToggle
					label="Comments"
					description="When someone comments on your documents"
					checked={preferences.notify_on_comment}
					onCheckedChange={(v) => onUpdate('notify_on_comment', v)}
				/>

				<PreferenceToggle
					label="Workflows"
					description="When workflow tasks require action"
					checked={preferences.notify_on_workflow}
					onCheckedChange={(v) => onUpdate('notify_on_workflow', v)}
				/>

				<PreferenceToggle
					label="Daily Digest"
					description="Receive a daily summary email"
					checked={preferences.daily_digest}
					onCheckedChange={(v) => onUpdate('daily_digest', v)}
				/>
			</div>
		</div>
	);
}

function KeyboardSection({ preferences, onUpdate }: SectionProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">Keyboard</h3>
				<p className="text-sm text-muted-foreground">Shortcuts and navigation</p>
			</div>

			<div className="space-y-4">
				<PreferenceToggle
					label="Keyboard Shortcuts"
					description="Enable keyboard shortcuts throughout the app"
					checked={preferences.keyboard_shortcuts_enabled}
					onCheckedChange={(v) => onUpdate('keyboard_shortcuts_enabled', v)}
				/>

				<PreferenceToggle
					label="Vim Mode"
					description="Use Vim-style navigation (hjkl)"
					checked={preferences.vim_mode}
					onCheckedChange={(v) => onUpdate('vim_mode', v)}
				/>
			</div>
		</div>
	);
}

function PrivacySection({ preferences, onUpdate }: SectionProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">Privacy</h3>
				<p className="text-sm text-muted-foreground">Control what others can see</p>
			</div>

			<div className="space-y-4">
				<PreferenceToggle
					label="Activity Visible"
					description="Let others see your recent activity"
					checked={preferences.activity_visible}
					onCheckedChange={(v) => onUpdate('activity_visible', v)}
				/>

				<PreferenceToggle
					label="Online Status"
					description="Show when you're online"
					checked={preferences.online_status_visible}
					onCheckedChange={(v) => onUpdate('online_status_visible', v)}
				/>
			</div>
		</div>
	);
}

function ScannerSection({ preferences, onUpdate }: SectionProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">Scanner</h3>
				<p className="text-sm text-muted-foreground">Default scanning settings</p>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label>Default Resolution (DPI)</Label>
					<div className="flex items-center gap-4">
						<Slider
							value={[preferences.default_scan_resolution]}
							onValueChange={([v]) => onUpdate('default_scan_resolution', v)}
							min={75}
							max={600}
							step={75}
							className="flex-1"
						/>
						<span className="w-12 text-sm text-muted-foreground">
							{preferences.default_scan_resolution}
						</span>
					</div>
				</div>

				<div className="space-y-2">
					<Label>Color Mode</Label>
					<Select
						value={preferences.default_scan_color_mode}
						onValueChange={(v) => onUpdate('default_scan_color_mode', v as 'color' | 'grayscale' | 'bw')}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="color">Color</SelectItem>
							<SelectItem value="grayscale">Grayscale</SelectItem>
							<SelectItem value="bw">Black & White</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label>Output Format</Label>
					<Select
						value={preferences.default_scan_format}
						onValueChange={(v) => onUpdate('default_scan_format', v as 'pdf' | 'png' | 'jpg' | 'tiff')}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="pdf">PDF</SelectItem>
							<SelectItem value="png">PNG</SelectItem>
							<SelectItem value="jpg">JPEG</SelectItem>
							<SelectItem value="tiff">TIFF</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<PreferenceToggle
					label="Auto-OCR on Scan"
					description="Automatically run OCR after scanning"
					checked={preferences.auto_ocr_on_scan}
					onCheckedChange={(v) => onUpdate('auto_ocr_on_scan', v)}
				/>
			</div>
		</div>
	);
}

function OCRSection({ preferences, onUpdate }: SectionProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">OCR</h3>
				<p className="text-sm text-muted-foreground">Text recognition settings</p>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label>Default OCR Engine</Label>
					<Select
						value={preferences.default_ocr_engine}
						onValueChange={(v) => onUpdate('default_ocr_engine', v as 'tesseract' | 'paddleocr' | 'qwen-vl' | 'auto')}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="auto">Auto (Recommended)</SelectItem>
							<SelectItem value="tesseract">Tesseract</SelectItem>
							<SelectItem value="paddleocr">PaddleOCR</SelectItem>
							<SelectItem value="qwen-vl">Qwen-VL (AI)</SelectItem>
						</SelectContent>
					</Select>
					<p className="text-xs text-muted-foreground">
						Auto selects the best engine based on document type
					</p>
				</div>

				<div className="space-y-2">
					<Label>Default Language</Label>
					<Select
						value={preferences.default_ocr_language}
						onValueChange={(v) => onUpdate('default_ocr_language', v)}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="eng">English</SelectItem>
							<SelectItem value="spa">Spanish</SelectItem>
							<SelectItem value="fra">French</SelectItem>
							<SelectItem value="deu">German</SelectItem>
							<SelectItem value="por">Portuguese</SelectItem>
							<SelectItem value="ita">Italian</SelectItem>
							<SelectItem value="jpn">Japanese</SelectItem>
							<SelectItem value="chi_sim">Chinese (Simplified)</SelectItem>
							<SelectItem value="kor">Korean</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>
		</div>
	);
}

function EditorSection({ preferences, onUpdate }: SectionProps) {
	return (
		<div className="space-y-6">
			<div>
				<h3 className="text-lg font-semibold">Editor</h3>
				<p className="text-sm text-muted-foreground">Document viewing and editing</p>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label>PDF Viewer Mode</Label>
					<Select
						value={preferences.pdf_viewer_mode}
						onValueChange={(v) => onUpdate('pdf_viewer_mode', v as 'single' | 'double' | 'continuous')}
					>
						<SelectTrigger className="w-48">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="single">Single Page</SelectItem>
							<SelectItem value="double">Two Pages</SelectItem>
							<SelectItem value="continuous">Continuous Scroll</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<div className="space-y-2">
					<Label>Auto-Save Interval (seconds)</Label>
					<div className="flex items-center gap-4">
						<Slider
							value={[preferences.auto_save_interval]}
							onValueChange={([v]) => onUpdate('auto_save_interval', v)}
							min={5}
							max={120}
							step={5}
							className="flex-1"
						/>
						<span className="w-12 text-sm text-muted-foreground">
							{preferences.auto_save_interval}s
						</span>
					</div>
				</div>

				<PreferenceToggle
					label="Confirm on Delete"
					description="Ask for confirmation before deleting"
					checked={preferences.confirm_on_delete}
					onCheckedChange={(v) => onUpdate('confirm_on_delete', v)}
				/>
			</div>
		</div>
	);
}

interface PreferenceToggleProps {
	label: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
}

function PreferenceToggle({ label, description, checked, onCheckedChange, disabled }: PreferenceToggleProps) {
	return (
		<div className="flex items-center justify-between">
			<div>
				<Label className={cn(disabled && 'text-muted-foreground')}>{label}</Label>
				<p className="text-sm text-muted-foreground">{description}</p>
			</div>
			<Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
		</div>
	);
}
