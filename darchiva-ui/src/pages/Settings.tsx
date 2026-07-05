// (c) Copyright Datacraft, 2026
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
	ArrowDown,
	ArrowUp,
	Bell,
	Building2,
	CheckCircle2,
	Database,
	Eye,
	EyeOff,
	Loader2,
	Mail,
	Palette,
	Plug,
	RefreshCw,
	Save,
	ScanText,
	Shield,
	TestTube2,
	Unplug,
	XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type TabId =
	| 'general'
	| 'appearance'
	| 'notifications'
	| 'security'
	| 'storage'
	| 'ocr'
	| 'integrations';

type Language = 'English' | 'French' | 'Spanish' | 'Swahili' | 'Arabic';
type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
type Currency = 'USD' | 'EUR' | 'GBP' | 'KES';
type Theme = 'Light' | 'Dark' | 'System';
type AccentColor = 'Brass' | 'Blue' | 'Green' | 'Purple';
type ItemsPerPage = '25' | '50' | '100';
type LoginAttempts = '3' | '5' | '10';
type StorageProvider = 'Local' | 'S3' | 'MinIO' | 'Azure';
type OcrEngine = 'Tesseract' | 'EasyOCR' | 'PaddleOCR' | 'Azure Vision';
type ServiceStatus = 'Connected' | 'Needs attention' | 'Disconnected';

interface GeneralSettingsState {
	orgName: string;
	logoUrl: string;
	timezone: string;
	language: Language;
	dateFormat: DateFormat;
	defaultCurrency: Currency;
}

interface AppearanceSettingsState {
	theme: Theme;
	accentColor: AccentColor;
	sidebarCollapsedByDefault: boolean;
	itemsPerPage: ItemsPerPage;
}

interface NotificationChannelState {
	inApp: boolean;
	email: boolean;
}

interface SecuritySettingsState {
	sessionTimeoutMinutes: number;
	maxLoginAttempts: LoginAttempts;
	require2fa: boolean;
	ipAllowlist: string;
	passwordMinLength: number;
}

interface StorageSettingsState {
	provider: StorageProvider;
	endpointUrl: string;
	bucket: string;
	accessKey: string;
}

interface OcrSettingsState {
	defaultEngine: OcrEngine;
	confidenceThreshold: number;
	autoReprocess: boolean;
	languagePriority: string[];
}

interface ConnectedService {
	name: 'GitHub' | 'Dropbox' | 'Google Drive';
	status: ServiceStatus;
}

interface IntegrationsSettingsState {
	smtpServer: string;
	smtpPort: string;
	smtpSsl: boolean;
	smtpFromAddress: string;
	webhookSecret: string;
	connectedServices: ConnectedService[];
}

interface SettingsState {
	general: GeneralSettingsState;
	appearance: AppearanceSettingsState;
	notifications: Record<string, NotificationChannelState>;
	security: SecuritySettingsState;
	storage: StorageSettingsState;
	ocr: OcrSettingsState;
	integrations: IntegrationsSettingsState;
}

type ApiSettingsResponse = Partial<{
	general: Partial<GeneralSettingsState>;
	appearance: Partial<AppearanceSettingsState>;
	notifications: Record<string, Partial<NotificationChannelState>>;
	security: Partial<SecuritySettingsState>;
	storage: Partial<StorageSettingsState>;
	ocr: Partial<OcrSettingsState>;
	integrations: Partial<IntegrationsSettingsState>;
}>;

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

const TIMEZONES = [
	'UTC',
	'Africa/Nairobi',
	'Africa/Lagos',
	'Africa/Johannesburg',
	'Europe/London',
	'Europe/Paris',
	'America/New_York',
	'America/Chicago',
	'America/Los_Angeles',
	'Asia/Dubai',
	'Asia/Kolkata',
	'Asia/Tokyo',
] as const;

const LANGUAGES: Language[] = ['English', 'French', 'Spanish', 'Swahili', 'Arabic'];
const DATE_FORMATS: DateFormat[] = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const CURRENCIES: Currency[] = ['USD', 'EUR', 'GBP', 'KES'];
const THEMES: Theme[] = ['Light', 'Dark', 'System'];
const ITEMS_PER_PAGE: ItemsPerPage[] = ['25', '50', '100'];
const LOGIN_ATTEMPTS: LoginAttempts[] = ['3', '5', '10'];
const STORAGE_PROVIDERS: StorageProvider[] = ['Local', 'S3', 'MinIO', 'Azure'];
const OCR_ENGINES: OcrEngine[] = ['Tesseract', 'EasyOCR', 'PaddleOCR', 'Azure Vision'];
const NOTIFICATION_EVENTS = [
	{ label: 'Document Uploaded', key: 'document_uploaded' },
	{ label: 'OCR Complete', key: 'ocr_complete' },
	{ label: 'Classification Done', key: 'classification_done' },
	{ label: 'Workflow Triggered', key: 'workflow_triggered' },
	{ label: 'Approval Needed', key: 'approval_needed' },
	{ label: 'Share Received', key: 'document_shared' },
	{ label: 'System Error', key: 'error' },
	{ label: 'Warning', key: 'warning' },
	{ label: 'System Alerts', key: 'system_alert' },
] as const;

const OCR_LANGUAGES = ['English', 'French', 'Arabic', 'Spanish', 'Swahili', 'German'];

const ACCENT_COLORS: Array<{ label: AccentColor; className: string }> = [
	{ label: 'Brass', className: 'bg-amber-500' },
	{ label: 'Blue', className: 'bg-blue-500' },
	{ label: 'Green', className: 'bg-emerald-500' },
	{ label: 'Purple', className: 'bg-violet-500' },
];

const TABS: Array<{ id: TabId; label: string; icon: typeof Building2 }> = [
	{ id: 'general', label: 'General', icon: Building2 },
	{ id: 'appearance', label: 'Appearance', icon: Palette },
	{ id: 'notifications', label: 'Notifications', icon: Bell },
	{ id: 'security', label: 'Security', icon: Shield },
	{ id: 'storage', label: 'Storage', icon: Database },
	{ id: 'ocr', label: 'OCR', icon: ScanText },
	{ id: 'integrations', label: 'Integrations', icon: Plug },
];

const DEFAULT_SETTINGS: SettingsState = {
	general: {
		orgName: 'Datacraft Archives',
		logoUrl: '',
		timezone: 'Africa/Nairobi',
		language: 'English',
		dateFormat: 'DD/MM/YYYY',
		defaultCurrency: 'KES',
	},
	appearance: {
		theme: 'System',
		accentColor: 'Brass',
		sidebarCollapsedByDefault: false,
		itemsPerPage: '50',
	},
	notifications: Object.fromEntries(
		NOTIFICATION_EVENTS.map((event) => [
			event.key,
			{ inApp: true, email: event.key === 'approval_needed' },
		])
	),
	security: {
		sessionTimeoutMinutes: 30,
		maxLoginAttempts: '5',
		require2fa: false,
		ipAllowlist: '',
		passwordMinLength: 12,
	},
	storage: {
		provider: 'Local',
		endpointUrl: '',
		bucket: '',
		accessKey: '',
	},
	ocr: {
		defaultEngine: 'Tesseract',
		confidenceThreshold: 80,
		autoReprocess: true,
		languagePriority: OCR_LANGUAGES,
	},
	integrations: {
		smtpServer: '',
		smtpPort: '587',
		smtpSsl: true,
		smtpFromAddress: '',
		webhookSecret: 'whsec_live_masked',
		connectedServices: [
			{ name: 'GitHub', status: 'Connected' },
			{ name: 'Dropbox', status: 'Needs attention' },
			{ name: 'Google Drive', status: 'Disconnected' },
		],
	},
};

function mergeSettings(data?: ApiSettingsResponse): SettingsState {
	return {
		general: { ...DEFAULT_SETTINGS.general, ...data?.general },
		appearance: { ...DEFAULT_SETTINGS.appearance, ...data?.appearance },
		notifications: {
			...DEFAULT_SETTINGS.notifications,
			...Object.fromEntries(
				Object.entries(data?.notifications ?? {}).map(([event, value]) => [
					event,
					{ ...DEFAULT_SETTINGS.notifications[event], ...value },
				])
			),
		},
		security: { ...DEFAULT_SETTINGS.security, ...data?.security },
		storage: { ...DEFAULT_SETTINGS.storage, ...data?.storage },
		ocr: {
			...DEFAULT_SETTINGS.ocr,
			...data?.ocr,
			languagePriority:
				data?.ocr?.languagePriority && data.ocr.languagePriority.length > 0
					? data.ocr.languagePriority
					: DEFAULT_SETTINGS.ocr.languagePriority,
		},
		integrations: {
			...DEFAULT_SETTINGS.integrations,
			...data?.integrations,
			connectedServices:
				data?.integrations?.connectedServices &&
				data.integrations.connectedServices.length > 0
					? data.integrations.connectedServices
					: DEFAULT_SETTINGS.integrations.connectedServices,
		},
	};
}

function isDirty<T>(current: T, loaded: T) {
	return JSON.stringify(current) !== JSON.stringify(loaded);
}

function createWebhookSecret() {
	const bytes = new Uint8Array(18);
	crypto.getRandomValues(bytes);
	return `whsec_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function Field({
	label,
	children,
	description,
}: {
	label: string;
	children: React.ReactNode;
	description?: string;
}) {
	return (
		<div className="space-y-2">
			<Label className="text-sm font-medium text-slate-200">{label}</Label>
			{children}
			{description ? <p className="text-xs text-slate-500">{description}</p> : null}
		</div>
	);
}

function SettingsSelect<T extends string>({
	value,
	options,
	onChange,
	placeholder = 'Select value',
}: {
	value: T;
	options: readonly T[];
	onChange: (value: T) => void;
	placeholder?: string;
}) {
	return (
		<Select value={value} onValueChange={(nextValue) => onChange(nextValue as T)}>
			<SelectTrigger>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{options.map((option) => (
					<SelectItem key={option} value={option}>
						{option}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function SaveFooter({
	isSaving,
	isChanged,
	onSave,
}: {
	isSaving: boolean;
	isChanged: boolean;
	onSave: () => void;
}) {
	return (
		<CardFooter className="flex items-center justify-between border-t border-slate-800/80 px-6 py-4">
			<div className="text-sm text-slate-500">
				{isChanged ? 'Unsaved changes in this section' : 'All changes saved'}
			</div>
			<Button onClick={onSave} disabled={isSaving || !isChanged}>
				{isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
				Save Changes
			</Button>
		</CardFooter>
	);
}

function TestStatusBadge({ status }: { status: TestStatus }) {
	if (status === 'idle') return null;

	const statusConfig = {
		testing: {
			label: 'Testing',
			icon: Loader2,
			className: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
		},
		success: {
			label: 'Connected',
			icon: CheckCircle2,
			className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
		},
		error: {
			label: 'Failed',
			icon: XCircle,
			className: 'border-red-500/30 bg-red-500/10 text-red-300',
		},
	} satisfies Record<Exclude<TestStatus, 'idle'>, { label: string; icon: typeof Loader2; className: string }>;

	const config = statusConfig[status];
	const Icon = config.icon;

	return (
		<Badge variant="outline" className={config.className}>
			<Icon className={cn('mr-1 h-3.5 w-3.5', status === 'testing' && 'animate-spin')} />
			{config.label}
		</Badge>
	);
}

export function Settings() {
	const [activeTab, setActiveTab] = useState<TabId>('general');
	const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
	const [loadedSettings, setLoadedSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
	const [isLoading, setIsLoading] = useState(true);
	const [savingTab, setSavingTab] = useState<TabId | null>(null);
	const [showAccessKey, setShowAccessKey] = useState(false);
	const [showWebhookSecret, setShowWebhookSecret] = useState(false);
	const [storageTestStatus, setStorageTestStatus] = useState<TestStatus>('idle');
	const [emailTestStatus, setEmailTestStatus] = useState<TestStatus>('idle');

	useEffect(() => {
		let isMounted = true;

		async function loadSettings() {
			try {
				const { data } = await apiClient.get<ApiSettingsResponse>('/settings');
				if (!isMounted) return;
				const nextSettings = mergeSettings(data);
				setSettings(nextSettings);
				setLoadedSettings(nextSettings);
			} catch {
				if (isMounted) {
					toast.error('Failed to load settings');
				}
			} finally {
				if (isMounted) setIsLoading(false);
			}
		}

		void loadSettings();

		return () => {
			isMounted = false;
		};
	}, []);

	const dirtyTabs = useMemo(
		() =>
			Object.fromEntries(
				TABS.map((tab) => [tab.id, isDirty(settings[tab.id], loadedSettings[tab.id])])
			) as Record<TabId, boolean>,
		[settings, loadedSettings]
	);

	const updateSection = useCallback(
		<K extends TabId>(section: K, patch: Partial<SettingsState[K]>) => {
			setSettings((current) => ({
				...current,
				[section]: {
					...current[section],
					...patch,
				},
			}));
		},
		[]
	);

	const updateNotification = useCallback(
		(event: string, channel: keyof NotificationChannelState, value: boolean) => {
			setSettings((current) => ({
				...current,
				notifications: {
					...current.notifications,
					[event]: {
						...current.notifications[event],
						[channel]: value,
					},
				},
			}));
		},
		[]
	);

	const moveOcrLanguage = useCallback((index: number, direction: -1 | 1) => {
		setSettings((current) => {
			const nextIndex = index + direction;
			if (nextIndex < 0 || nextIndex >= current.ocr.languagePriority.length) {
				return current;
			}

			const languagePriority = [...current.ocr.languagePriority];
			const [item] = languagePriority.splice(index, 1);
			languagePriority.splice(nextIndex, 0, item);

			return {
				...current,
				ocr: {
					...current.ocr,
					languagePriority,
				},
			};
		});
	}, []);

	const disconnectService = useCallback((name: ConnectedService['name']) => {
		setSettings((current) => ({
			...current,
			integrations: {
				...current.integrations,
				connectedServices: current.integrations.connectedServices.map((service) =>
					service.name === name ? { ...service, status: 'Disconnected' } : service
				),
			},
		}));
	}, []);

	const saveTab = useCallback(
		async (tab: TabId) => {
			setSavingTab(tab);
			try {
				const payload = { [tab]: settings[tab] };
				await apiClient.patch('/settings', payload);
				setLoadedSettings((current) => ({
					...current,
					[tab]: settings[tab],
				}));
				toast.success('Settings saved');
			} catch {
				toast.error('Failed to save settings');
			} finally {
				setSavingTab(null);
			}
		},
		[settings]
	);

	const testStorageConnection = useCallback(async () => {
		setStorageTestStatus('testing');
		try {
			await apiClient.post('/settings/storage/test', settings.storage);
			setStorageTestStatus('success');
		} catch {
			setStorageTestStatus('error');
		}
	}, [settings.storage]);

	const testEmail = useCallback(async () => {
		setEmailTestStatus('testing');
		try {
			await apiClient.post('/settings/integrations/test-email', settings.integrations);
			setEmailTestStatus('success');
		} catch {
			setEmailTestStatus('error');
		}
	}, [settings.integrations]);

	const statusBadgeClass = (status: ServiceStatus) =>
		status === 'Connected'
			? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
			: status === 'Needs attention'
				? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
				: 'border-slate-600 bg-slate-800 text-slate-300';

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">Settings</h1>
					<p className="mt-1 text-sm text-slate-500">
						Manage organization preferences, security controls, and system integrations.
					</p>
				</div>
				{isLoading ? (
					<Badge variant="outline" className="w-fit border-slate-700 text-slate-400">
						<Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
						Loading settings
					</Badge>
				) : null}
			</div>

			<Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabId)}>
				<TabsList className="flex h-auto w-full flex-wrap items-stretch justify-start gap-1 rounded-lg border border-slate-800 bg-slate-950/60 p-1">
					{TABS.map((tab) => {
						const Icon = tab.icon;
						return (
							<TabsTrigger
								key={tab.id}
								value={tab.id}
								className="relative min-h-10 flex-1 basis-40 gap-2 data-[state=active]:bg-slate-800 data-[state=active]:text-slate-100"
							>
								<Icon className="h-4 w-4" />
								<span>{tab.label}</span>
								{dirtyTabs[tab.id] ? (
									<span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-orange-400" />
								) : null}
							</TabsTrigger>
						);
					})}
				</TabsList>

				<TabsContent value="general" className="mt-6">
					<Card className="border-slate-800 bg-slate-950/60">
						<CardHeader>
							<CardTitle className="text-slate-100">General</CardTitle>
							<CardDescription>Core organization defaults for every workspace user.</CardDescription>
						</CardHeader>
						<CardContent className="grid gap-5 md:grid-cols-2">
							<Field label="Organization name">
								<Input
									value={settings.general.orgName}
									onChange={(event) =>
										updateSection('general', { orgName: event.target.value })
									}
									placeholder="Organization name"
								/>
							</Field>
							<Field label="Logo URL">
								<Input
									value={settings.general.logoUrl}
									onChange={(event) =>
										updateSection('general', { logoUrl: event.target.value })
									}
									placeholder="https://example.com/logo.svg"
								/>
							</Field>
							<Field label="Timezone">
								<SettingsSelect
									value={settings.general.timezone}
									options={TIMEZONES}
									onChange={(timezone) => updateSection('general', { timezone })}
								/>
							</Field>
							<Field label="Language">
								<SettingsSelect
									value={settings.general.language}
									options={LANGUAGES}
									onChange={(language) => updateSection('general', { language })}
								/>
							</Field>
							<Field label="Date format">
								<SettingsSelect
									value={settings.general.dateFormat}
									options={DATE_FORMATS}
									onChange={(dateFormat) => updateSection('general', { dateFormat })}
								/>
							</Field>
							<Field label="Default currency">
								<SettingsSelect
									value={settings.general.defaultCurrency}
									options={CURRENCIES}
									onChange={(defaultCurrency) =>
										updateSection('general', { defaultCurrency })
									}
								/>
							</Field>
						</CardContent>
						<SaveFooter
							isSaving={savingTab === 'general'}
							isChanged={dirtyTabs.general}
							onSave={() => void saveTab('general')}
						/>
					</Card>
				</TabsContent>

				<TabsContent value="appearance" className="mt-6">
					<Card className="border-slate-800 bg-slate-950/60">
						<CardHeader>
							<CardTitle className="text-slate-100">Appearance</CardTitle>
							<CardDescription>Set the default visual profile for the archive UI.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid gap-5 md:grid-cols-2">
								<Field label="Theme">
									<SettingsSelect
										value={settings.appearance.theme}
										options={THEMES}
										onChange={(theme) => updateSection('appearance', { theme })}
									/>
								</Field>
								<Field label="Items per page">
									<SettingsSelect
										value={settings.appearance.itemsPerPage}
										options={ITEMS_PER_PAGE}
										onChange={(itemsPerPage) =>
											updateSection('appearance', { itemsPerPage })
										}
									/>
								</Field>
							</div>
							<Field label="Accent color">
								<div className="grid gap-3 sm:grid-cols-4" role="radiogroup">
									{ACCENT_COLORS.map((accent) => (
										<button
											key={accent.label}
											type="button"
											role="radio"
											aria-checked={settings.appearance.accentColor === accent.label}
											onClick={() =>
												updateSection('appearance', { accentColor: accent.label })
											}
											className={cn(
												'flex items-center gap-3 rounded-md border border-slate-800 px-3 py-2 text-left text-sm text-slate-300 transition-colors hover:border-slate-600',
												settings.appearance.accentColor === accent.label &&
													'border-primary bg-primary/10 text-slate-100'
											)}
										>
											<span className={cn('h-5 w-5 rounded-full', accent.className)} />
											{accent.label}
										</button>
									))}
								</div>
							</Field>
							<div className="flex items-center justify-between rounded-md border border-slate-800 px-4 py-3">
								<div>
									<Label className="text-sm font-medium text-slate-200">
										Sidebar collapsed by default
									</Label>
									<p className="mt-1 text-xs text-slate-500">
										Start sessions with the navigation rail minimized.
									</p>
								</div>
								<Switch
									checked={settings.appearance.sidebarCollapsedByDefault}
									onCheckedChange={(sidebarCollapsedByDefault) =>
										updateSection('appearance', { sidebarCollapsedByDefault })
									}
								/>
							</div>
						</CardContent>
						<SaveFooter
							isSaving={savingTab === 'appearance'}
							isChanged={dirtyTabs.appearance}
							onSave={() => void saveTab('appearance')}
						/>
					</Card>
				</TabsContent>

				<TabsContent value="notifications" className="mt-6">
					<Card className="border-slate-800 bg-slate-950/60">
						<CardHeader>
							<CardTitle className="text-slate-100">Notifications</CardTitle>
							<CardDescription>Choose how users hear about document and workflow events.</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="overflow-hidden rounded-md border border-slate-800">
								<table className="w-full min-w-[560px] text-sm">
									<thead className="bg-slate-900/70 text-slate-400">
										<tr>
											<th className="px-4 py-3 text-left font-medium">Event</th>
											<th className="px-4 py-3 text-center font-medium">In-App</th>
											<th className="px-4 py-3 text-center font-medium">Email</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-800">
										{NOTIFICATION_EVENTS.map((event) => (
											<tr key={event.key}>
												<td className="px-4 py-3 font-medium text-slate-200">{event.label}</td>
												<td className="px-4 py-3 text-center">
													<Switch
														checked={settings.notifications[event.key]?.inApp ?? false}
														onCheckedChange={(value) =>
															updateNotification(event.key, 'inApp', value)
														}
														aria-label={`${event.label} in-app notifications`}
													/>
												</td>
												<td className="px-4 py-3 text-center">
													<Switch
														checked={settings.notifications[event.key]?.email ?? false}
														onCheckedChange={(value) =>
															updateNotification(event.key, 'email', value)
														}
														aria-label={`${event.label} email notifications`}
													/>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</CardContent>
						<SaveFooter
							isSaving={savingTab === 'notifications'}
							isChanged={dirtyTabs.notifications}
							onSave={() => void saveTab('notifications')}
						/>
					</Card>
				</TabsContent>

				<TabsContent value="security" className="mt-6">
					<Card className="border-slate-800 bg-slate-950/60">
						<CardHeader>
							<CardTitle className="text-slate-100">Security</CardTitle>
							<CardDescription>Control session policies and account protection requirements.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<Field
								label={`Session timeout: ${settings.security.sessionTimeoutMinutes} minutes`}
								description="Automatically sign users out after a period of inactivity."
							>
								<Slider
									min={5}
									max={120}
									step={5}
									value={[settings.security.sessionTimeoutMinutes]}
									onValueChange={([sessionTimeoutMinutes]) =>
										updateSection('security', { sessionTimeoutMinutes })
									}
								/>
							</Field>
							<div className="grid gap-5 md:grid-cols-2">
								<Field label="Max login attempts">
									<SettingsSelect
										value={settings.security.maxLoginAttempts}
										options={LOGIN_ATTEMPTS}
										onChange={(maxLoginAttempts) =>
											updateSection('security', { maxLoginAttempts })
										}
									/>
								</Field>
								<div className="flex items-center justify-between rounded-md border border-slate-800 px-4 py-3">
									<div>
										<Label className="text-sm font-medium text-slate-200">
											Require 2FA
										</Label>
										<p className="mt-1 text-xs text-slate-500">
											Require a second factor for all users.
										</p>
									</div>
									<Switch
										checked={settings.security.require2fa}
										onCheckedChange={(require2fa) =>
											updateSection('security', { require2fa })
										}
									/>
								</div>
							</div>
							<Field
								label="IP allowlist"
								description="One CIDR block or IP address per line. Leave empty to allow all networks."
							>
								<Textarea
									value={settings.security.ipAllowlist}
									onChange={(event) =>
										updateSection('security', { ipAllowlist: event.target.value })
									}
									placeholder={'203.0.113.10\n198.51.100.0/24'}
									className="min-h-28"
								/>
							</Field>
							<Field label={`Password minimum length: ${settings.security.passwordMinLength}`}>
								<Slider
									min={8}
									max={32}
									step={1}
									value={[settings.security.passwordMinLength]}
									onValueChange={([passwordMinLength]) =>
										updateSection('security', { passwordMinLength })
									}
								/>
							</Field>
						</CardContent>
						<SaveFooter
							isSaving={savingTab === 'security'}
							isChanged={dirtyTabs.security}
							onSave={() => void saveTab('security')}
						/>
					</Card>
				</TabsContent>

				<TabsContent value="storage" className="mt-6">
					<Card className="border-slate-800 bg-slate-950/60">
						<CardHeader>
							<CardTitle className="text-slate-100">Storage</CardTitle>
							<CardDescription>Configure the object store used for uploaded documents.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-5">
							<div className="grid gap-5 md:grid-cols-2">
								<Field label="Provider">
									<SettingsSelect
										value={settings.storage.provider}
										options={STORAGE_PROVIDERS}
										onChange={(provider) => updateSection('storage', { provider })}
									/>
								</Field>
								<Field label="Endpoint URL">
									<Input
										value={settings.storage.endpointUrl}
										onChange={(event) =>
											updateSection('storage', { endpointUrl: event.target.value })
										}
										placeholder="https://storage.example.com"
									/>
								</Field>
								<Field label="Bucket">
									<Input
										value={settings.storage.bucket}
										onChange={(event) =>
											updateSection('storage', { bucket: event.target.value })
										}
										placeholder="archive-documents"
									/>
								</Field>
								<Field label="Access key">
									<div className="flex gap-2">
										<Input
											type={showAccessKey ? 'text' : 'password'}
											value={settings.storage.accessKey}
											onChange={(event) =>
												updateSection('storage', { accessKey: event.target.value })
											}
											placeholder="Access key"
										/>
										<Button
											type="button"
											variant="outline"
											size="icon"
											onClick={() => setShowAccessKey((current) => !current)}
											aria-label={showAccessKey ? 'Hide access key' : 'Show access key'}
										>
											{showAccessKey ? <EyeOff /> : <Eye />}
										</Button>
									</div>
								</Field>
							</div>
							<div className="flex flex-wrap items-center gap-3">
								<Button
									type="button"
									variant="outline"
									onClick={() => void testStorageConnection()}
									disabled={storageTestStatus === 'testing'}
								>
									<TestTube2 className="h-4 w-4" />
									Test connection
								</Button>
								<TestStatusBadge status={storageTestStatus} />
							</div>
						</CardContent>
						<SaveFooter
							isSaving={savingTab === 'storage'}
							isChanged={dirtyTabs.storage}
							onSave={() => void saveTab('storage')}
						/>
					</Card>
				</TabsContent>

				<TabsContent value="ocr" className="mt-6">
					<Card className="border-slate-800 bg-slate-950/60">
						<CardHeader>
							<CardTitle className="text-slate-100">OCR</CardTitle>
							<CardDescription>Tune extraction defaults and language priority.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="grid gap-5 md:grid-cols-2">
								<Field label="Default engine">
									<SettingsSelect
										value={settings.ocr.defaultEngine}
										options={OCR_ENGINES}
										onChange={(defaultEngine) =>
											updateSection('ocr', { defaultEngine })
										}
									/>
								</Field>
								<div className="flex items-center justify-between rounded-md border border-slate-800 px-4 py-3">
									<div>
										<Label className="text-sm font-medium text-slate-200">
											Auto-reprocess
										</Label>
										<p className="mt-1 text-xs text-slate-500">
											Re-run OCR when extraction quality falls below threshold.
										</p>
									</div>
									<Switch
										checked={settings.ocr.autoReprocess}
										onCheckedChange={(autoReprocess) =>
											updateSection('ocr', { autoReprocess })
										}
									/>
								</div>
							</div>
							<Field label={`Confidence threshold: ${settings.ocr.confidenceThreshold}%`}>
								<Slider
									min={50}
									max={100}
									step={1}
									value={[settings.ocr.confidenceThreshold]}
									onValueChange={([confidenceThreshold]) =>
										updateSection('ocr', { confidenceThreshold })
									}
								/>
							</Field>
							<Field label="Language priority">
								<div className="divide-y divide-slate-800 overflow-hidden rounded-md border border-slate-800">
									{settings.ocr.languagePriority.map((language, index) => (
										<div
											key={language}
											className="flex items-center justify-between gap-3 px-4 py-3"
										>
											<div className="flex items-center gap-3">
												<Badge variant="outline" className="border-slate-700 text-slate-400">
													{index + 1}
												</Badge>
												<span className="font-medium text-slate-200">{language}</span>
											</div>
											<div className="flex gap-2">
												<Button
													type="button"
													variant="outline"
													size="icon"
													onClick={() => moveOcrLanguage(index, -1)}
													disabled={index === 0}
													aria-label={`Move ${language} up`}
												>
													<ArrowUp />
												</Button>
												<Button
													type="button"
													variant="outline"
													size="icon"
													onClick={() => moveOcrLanguage(index, 1)}
													disabled={index === settings.ocr.languagePriority.length - 1}
													aria-label={`Move ${language} down`}
												>
													<ArrowDown />
												</Button>
											</div>
										</div>
									))}
								</div>
							</Field>
						</CardContent>
						<SaveFooter
							isSaving={savingTab === 'ocr'}
							isChanged={dirtyTabs.ocr}
							onSave={() => void saveTab('ocr')}
						/>
					</Card>
				</TabsContent>

				<TabsContent value="integrations" className="mt-6">
					<Card className="border-slate-800 bg-slate-950/60">
						<CardHeader>
							<CardTitle className="text-slate-100">Integrations</CardTitle>
							<CardDescription>Manage outbound email, webhooks, and connected services.</CardDescription>
						</CardHeader>
						<CardContent className="space-y-7">
							<section className="space-y-5">
								<div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
									<Mail className="h-4 w-4" />
									SMTP
								</div>
								<div className="grid gap-5 md:grid-cols-2">
									<Field label="Server">
										<Input
											value={settings.integrations.smtpServer}
											onChange={(event) =>
												updateSection('integrations', { smtpServer: event.target.value })
											}
											placeholder="smtp.example.com"
										/>
									</Field>
									<Field label="Port">
										<Input
											inputMode="numeric"
											value={settings.integrations.smtpPort}
											onChange={(event) =>
												updateSection('integrations', { smtpPort: event.target.value })
											}
											placeholder="587"
										/>
									</Field>
									<Field label="From address">
										<Input
											type="email"
											value={settings.integrations.smtpFromAddress}
											onChange={(event) =>
												updateSection('integrations', {
													smtpFromAddress: event.target.value,
												})
											}
											placeholder="archive@example.com"
										/>
									</Field>
									<div className="flex items-center justify-between rounded-md border border-slate-800 px-4 py-3">
										<div>
											<Label className="text-sm font-medium text-slate-200">SSL</Label>
											<p className="mt-1 text-xs text-slate-500">
												Use encrypted transport for SMTP.
											</p>
										</div>
										<Switch
											checked={settings.integrations.smtpSsl}
											onCheckedChange={(smtpSsl) =>
												updateSection('integrations', { smtpSsl })
											}
										/>
									</div>
								</div>
								<div className="flex flex-wrap items-center gap-3">
									<Button
										type="button"
										variant="outline"
										onClick={() => void testEmail()}
										disabled={emailTestStatus === 'testing'}
									>
										<TestTube2 className="h-4 w-4" />
										Test email
									</Button>
									<TestStatusBadge status={emailTestStatus} />
								</div>
							</section>

							<Separator className="bg-slate-800" />

							<section className="space-y-5">
								<div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
									<Plug className="h-4 w-4" />
									Webhooks
								</div>
								<Field label="Webhook secret">
									<div className="flex flex-col gap-2 sm:flex-row">
										<div className="flex min-w-0 flex-1 gap-2">
											<Input
												type={showWebhookSecret ? 'text' : 'password'}
												value={settings.integrations.webhookSecret}
												onChange={(event) =>
													updateSection('integrations', {
														webhookSecret: event.target.value,
													})
												}
											/>
											<Button
												type="button"
												variant="outline"
												size="icon"
												onClick={() => setShowWebhookSecret((current) => !current)}
												aria-label={
													showWebhookSecret ? 'Hide webhook secret' : 'Show webhook secret'
												}
											>
												{showWebhookSecret ? <EyeOff /> : <Eye />}
											</Button>
										</div>
										<Button
											type="button"
											variant="outline"
											onClick={() =>
												updateSection('integrations', {
													webhookSecret: createWebhookSecret(),
												})
											}
										>
											<RefreshCw className="h-4 w-4" />
											Regenerate
										</Button>
									</div>
								</Field>
							</section>

							<Separator className="bg-slate-800" />

							<section className="space-y-4">
								<div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
									<CheckCircle2 className="h-4 w-4" />
									Connected services
								</div>
								<div className="divide-y divide-slate-800 overflow-hidden rounded-md border border-slate-800">
									{settings.integrations.connectedServices.map((service) => (
										<div
											key={service.name}
											className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
										>
											<div className="flex items-center gap-3">
												<span className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-800 bg-slate-900 text-slate-300">
													<Plug className="h-4 w-4" />
												</span>
												<div>
													<div className="font-medium text-slate-200">{service.name}</div>
													<Badge
														variant="outline"
														className={cn('mt-1', statusBadgeClass(service.status))}
													>
														{service.status}
													</Badge>
												</div>
											</div>
											<Button
												type="button"
												variant="outline"
												onClick={() => disconnectService(service.name)}
												disabled={service.status === 'Disconnected'}
											>
												<Unplug className="h-4 w-4" />
												Disconnect
											</Button>
										</div>
									))}
								</div>
							</section>
						</CardContent>
						<SaveFooter
							isSaving={savingTab === 'integrations'}
							isChanged={dirtyTabs.integrations}
							onSave={() => void saveTab('integrations')}
						/>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
}
