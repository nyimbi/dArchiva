// (c) Copyright Datacraft, 2026
/**
 * Email Ingest Configs page — IMAP mailbox monitoring.
 * Route: /settings/email-ingest
 */
import { useState } from 'react';
import {
	AlertCircle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Loader2,
	Mail,
	Plus,
	RefreshCw,
	Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import {
	useCreateEmailIngestConfig,
	useDeleteEmailIngestConfig,
	useEmailIngestConfigs,
	useTestEmailIngestConfig,
	useToggleEmailIngestConfig,
	useTriggerEmailIngest,
	useUpdateEmailIngestConfig,
	type EmailIngestConfig,
	type EmailIngestConfigCreate,
	type EmailTestResult,
} from './api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmtDate(iso: string | null): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
}

function isToday(iso: string | null): boolean {
	if (!iso) return false;
	const d = new Date(iso);
	const now = new Date();
	return (
		d.getFullYear() === now.getFullYear() &&
		d.getMonth() === now.getMonth() &&
		d.getDate() === now.getDate()
	);
}

function configStatus(c: EmailIngestConfig): 'Active' | 'Paused' | 'Pending' {
	if (!c.is_active) return 'Paused';
	if (!c.last_checked_at) return 'Pending';
	return 'Active';
}

function statusVariant(
	status: ReturnType<typeof configStatus>,
): 'default' | 'secondary' | 'outline' {
	if (status === 'Active') return 'default';
	if (status === 'Paused') return 'secondary';
	return 'outline';
}

// ---------------------------------------------------------------------------
// Stats Cards
// ---------------------------------------------------------------------------

function StatsCards({ configs }: { configs: EmailIngestConfig[] }) {
	const total = configs.length;
	const active = configs.filter(c => c.is_active).length;
	const checkedToday = configs.filter(c => isToday(c.last_checked_at)).length;
	const totalDocs = configs.reduce((sum, c) => sum + c.documents_ingested, 0);

	const stats: { label: string; value: string | number; Icon: typeof Mail }[] = [
		{ label: 'Total Configs', value: total, Icon: Mail },
		{ label: 'Active', value: active, Icon: CheckCircle2 },
		{ label: 'Checked Today', value: checkedToday, Icon: RefreshCw },
		{ label: 'Docs Ingested', value: totalDocs.toLocaleString(), Icon: AlertCircle },
	];

	return (
		<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
			{stats.map(({ label, value, Icon }) => (
				<Card key={label}>
					<CardContent className="flex items-center gap-3 pb-4 pt-5">
						<Icon className="h-5 w-5 text-muted-foreground shrink-0" />
						<div>
							<p className="text-2xl font-bold leading-none">{value}</p>
							<p className="mt-1 text-xs text-muted-foreground">{label}</p>
						</div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Expandable sync-log detail row
// ---------------------------------------------------------------------------

function SyncLogRow({ config }: { config: EmailIngestConfig }) {
	return (
		<tr className="bg-muted/20">
			<td colSpan={10} className="px-6 py-4">
				<div className="space-y-2 text-sm">
					<p className="font-medium text-muted-foreground">Sync Details</p>
					<div className="grid max-w-xl grid-cols-2 gap-x-8 gap-y-1">
						<span className="text-muted-foreground">Last checked:</span>
						<span>{fmtDate(config.last_checked_at)}</span>
						<span className="text-muted-foreground">Docs ingested (lifetime):</span>
						<span>{config.documents_ingested}</span>
						<span className="text-muted-foreground">Last processed UID:</span>
						<span>{config.last_processed_uid || '—'}</span>
						<span className="text-muted-foreground">Allowed senders:</span>
						<span className="truncate">{config.allowed_senders || 'All'}</span>
					</div>
					<p className="mt-1 text-xs italic text-muted-foreground">
						Per-email log (subject, from, status) requires backend log access.
					</p>
				</div>
			</td>
		</tr>
	);
}

// ---------------------------------------------------------------------------
// Config table row (with inline test + expandable log)
// ---------------------------------------------------------------------------

interface ConfigRowProps {
	config: EmailIngestConfig;
	onEdit: (c: EmailIngestConfig) => void;
	onDelete: (c: EmailIngestConfig) => void;
	onToggle: (c: EmailIngestConfig) => void;
	onTrigger: (c: EmailIngestConfig) => void;
	triggerMsg: string | undefined;
}

function ConfigRow({ config, onEdit, onDelete, onToggle, onTrigger, triggerMsg }: ConfigRowProps) {
	const [expanded, setExpanded] = useState(false);
	const [testResult, setTestResult] = useState<EmailTestResult | null>(null);
	const testMutation = useTestEmailIngestConfig();

	async function handleTest() {
		setTestResult(null);
		const result = await testMutation.mutateAsync(config.id);
		setTestResult(result);
	}

	const status = configStatus(config);

	return (
		<>
			<tr className="transition-colors hover:bg-muted/30">
				{/* expand toggle */}
				<td className="pl-3 pr-1 py-3 w-8">
					<button
						onClick={() => setExpanded(v => !v)}
						className="text-muted-foreground hover:text-foreground"
						aria-label={expanded ? 'Collapse' : 'Expand'}
					>
						{expanded
							? <ChevronDown className="h-4 w-4" />
							: <ChevronRight className="h-4 w-4" />}
					</button>
				</td>
				<td className="px-4 py-3 text-sm font-medium">{config.name}</td>
				<td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
					{config.host}:{config.port}
				</td>
				<td className="px-4 py-3 text-sm text-muted-foreground">{config.username}</td>
				<td className="px-4 py-3 text-sm text-muted-foreground">{config.mailbox_folder}</td>
				<td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
					{config.check_interval_minutes}m
				</td>
				<td className="whitespace-nowrap px-4 py-3 text-sm text-muted-foreground">
					{fmtDate(config.last_checked_at)}
				</td>
				<td className="px-4 py-3 text-sm text-muted-foreground">{config.documents_ingested}</td>
				<td className="px-4 py-3">
					<Badge variant={statusVariant(status)}>{status}</Badge>
				</td>
				<td className="px-4 py-3">
					<div className="flex flex-wrap items-center gap-1">
						<Button
							size="sm"
							variant="outline"
							onClick={handleTest}
							disabled={testMutation.isPending}
							className="h-7 px-2 text-xs"
						>
							{testMutation.isPending
								? <Loader2 className="h-3 w-3 animate-spin" />
								: 'Test'}
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => onTrigger(config)}
							className="h-7 px-2"
							title="Check now"
						>
							{triggerMsg
								? <CheckCircle2 className="h-3 w-3 text-green-500" />
								: <RefreshCw className="h-3 w-3" />}
						</Button>
						<Switch
							checked={config.is_active}
							onCheckedChange={() => onToggle(config)}
							className="scale-75"
						/>
						<Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onEdit(config)}>
							Edit
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="h-7 px-2 text-destructive hover:text-destructive"
							onClick={() => onDelete(config)}
						>
							<Trash2 className="h-3 w-3" />
						</Button>
					</div>
					{testResult && (
						<p className={`mt-1 text-xs ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}>
							{testResult.success
								? `Connected — ${testResult.unseen_count ?? 0} unseen`
								: `Error: ${testResult.error}`}
						</p>
					)}
				</td>
			</tr>
			{expanded && <SyncLogRow config={config} />}
		</>
	);
}

// ---------------------------------------------------------------------------
// Config Form Dialog
// ---------------------------------------------------------------------------

interface ConfigFormState {
	name: string;
	host: string;
	port: string;
	username: string;
	password: string;
	use_ssl: boolean;
	mailbox_folder: string;
	check_interval_minutes: string;
	destination_folder_id: string;
	project_id: string;
	is_active: boolean;
	allowed_senders: string;
}

function defaultForm(c?: EmailIngestConfig): ConfigFormState {
	return {
		name: c?.name ?? '',
		host: c?.host ?? '',
		port: String(c?.port ?? 993),
		username: c?.username ?? '',
		password: '',
		use_ssl: c?.use_ssl ?? true,
		mailbox_folder: c?.mailbox_folder ?? 'INBOX',
		check_interval_minutes: String(c?.check_interval_minutes ?? 15),
		destination_folder_id: c?.destination_folder_id ?? '',
		project_id: c?.project_id ?? '',
		is_active: c?.is_active ?? true,
		allowed_senders: c?.allowed_senders ?? '',
	};
}

const INTERVAL_OPTIONS = [
	{ value: '5', label: 'Every 5 minutes' },
	{ value: '15', label: 'Every 15 minutes' },
	{ value: '30', label: 'Every 30 minutes' },
	{ value: '60', label: 'Every hour' },
	{ value: '360', label: 'Every 6 hours' },
	{ value: '1440', label: 'Daily' },
];

interface ConfigDialogProps {
	open: boolean;
	existing?: EmailIngestConfig;
	onClose: () => void;
}

function ConfigDialog({ open, existing, onClose }: ConfigDialogProps) {
	const isEdit = !!existing;
	const [form, setForm] = useState<ConfigFormState>(() => defaultForm(existing));
	const [showPassword, setShowPassword] = useState(false);

	const create = useCreateEmailIngestConfig();
	const update = useUpdateEmailIngestConfig();
	const isSaving = create.isPending || update.isPending;

	function str(key: keyof ConfigFormState): string {
		return form[key] as string;
	}

	function setStr(key: keyof ConfigFormState) {
		return (e: React.ChangeEvent<HTMLInputElement>) =>
			setForm(prev => ({ ...prev, [key]: e.target.value }));
	}

	function buildPayload(): EmailIngestConfigCreate {
		return {
			name: form.name.trim(),
			host: form.host.trim(),
			port: parseInt(form.port, 10) || 993,
			username: form.username.trim(),
			password: form.password,
			use_ssl: form.use_ssl,
			mailbox_folder: form.mailbox_folder.trim() || 'INBOX',
			check_interval_minutes: parseInt(form.check_interval_minutes, 10) || 15,
			destination_folder_id: form.destination_folder_id.trim() || null,
			project_id: form.project_id.trim() || null,
			is_active: form.is_active,
			allowed_senders: form.allowed_senders.trim(),
		};
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const payload = buildPayload();
		if (isEdit && existing) {
			await update.mutateAsync({ id: existing.id, ...payload });
		} else {
			await create.mutateAsync(payload);
		}
		onClose();
	}

	return (
		<Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
			<DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>{isEdit ? 'Edit IMAP Config' : 'New IMAP Config'}</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="ei-name">Display Name</Label>
						<Input
							id="ei-name"
							required
							placeholder="e.g. Accounts invoices inbox"
							value={str('name')}
							onChange={setStr('name')}
						/>
					</div>

					<div className="grid grid-cols-3 gap-3">
						<div className="col-span-2 space-y-1">
							<Label htmlFor="ei-host">IMAP Host</Label>
							<Input
								id="ei-host"
								required
								placeholder="imap.example.com"
								value={str('host')}
								onChange={setStr('host')}
							/>
						</div>
						<div className="space-y-1">
							<Label htmlFor="ei-port">Port</Label>
							<Input
								id="ei-port"
								type="number"
								min={1}
								max={65535}
								value={str('port')}
								onChange={setStr('port')}
							/>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<Switch
							id="ei-ssl"
							checked={form.use_ssl}
							onCheckedChange={v => setForm(prev => ({ ...prev, use_ssl: v }))}
						/>
						<Label htmlFor="ei-ssl">Use SSL/TLS (IMAPS)</Label>
					</div>

					<div className="space-y-1">
						<Label htmlFor="ei-username">Username / Email</Label>
						<Input
							id="ei-username"
							required
							autoComplete="username"
							placeholder="user@example.com"
							value={str('username')}
							onChange={setStr('username')}
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="ei-password">
							Password
							{isEdit && (
								<span className="ml-1 text-xs font-normal text-muted-foreground">
									(blank = keep existing)
								</span>
							)}
						</Label>
						<div className="relative">
							<Input
								id="ei-password"
								type={showPassword ? 'text' : 'password'}
								autoComplete="new-password"
								required={!isEdit}
								placeholder={isEdit ? '••••••••' : 'Enter password'}
								value={str('password')}
								onChange={setStr('password')}
								className="pr-16"
							/>
							<button
								type="button"
								onClick={() => setShowPassword(v => !v)}
								className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
							>
								{showPassword ? 'Hide' : 'Show'}
							</button>
						</div>
					</div>

					<div className="space-y-1">
						<Label htmlFor="ei-folder">Mailbox Folder</Label>
						<Input
							id="ei-folder"
							placeholder="INBOX"
							value={str('mailbox_folder')}
							onChange={setStr('mailbox_folder')}
						/>
					</div>

					<div className="space-y-1">
						<Label>Check Interval</Label>
						<Select
							value={form.check_interval_minutes}
							onValueChange={v => setForm(prev => ({ ...prev, check_interval_minutes: v }))}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{INTERVAL_OPTIONS.map(o => (
									<SelectItem key={o.value} value={o.value}>
										{o.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1">
						<Label htmlFor="ei-dest">
							Destination Folder ID{' '}
							<span className="text-xs font-normal text-muted-foreground">(optional)</span>
						</Label>
						<Input
							id="ei-dest"
							placeholder="UUID of target folder"
							value={str('destination_folder_id')}
							onChange={setStr('destination_folder_id')}
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="ei-senders">
							Allowed Senders{' '}
							<span className="text-xs font-normal text-muted-foreground">
								(comma-separated; empty = all)
							</span>
						</Label>
						<Input
							id="ei-senders"
							placeholder="alice@example.com, scanner@hq.org"
							value={str('allowed_senders')}
							onChange={setStr('allowed_senders')}
						/>
					</div>

					<div className="flex items-center gap-2">
						<Switch
							id="ei-active"
							checked={form.is_active}
							onCheckedChange={v => setForm(prev => ({ ...prev, is_active: v }))}
						/>
						<Label htmlFor="ei-active">Active (poll on schedule)</Label>
					</div>

					{(create.isError || update.isError) && (
						<p className="text-sm text-destructive">
							{(create.error || update.error)?.message ?? 'An error occurred.'}
						</p>
					)}

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSaving}>
							{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{isEdit ? 'Save Changes' : 'Create Config'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function EmailIngestConfigs() {
	const { data: configs = [], isLoading, isError } = useEmailIngestConfigs();
	const deleteConfig = useDeleteEmailIngestConfig();
	const toggle = useToggleEmailIngestConfig();
	const trigger = useTriggerEmailIngest();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<EmailIngestConfig | undefined>();
	const [triggerMsg, setTriggerMsg] = useState<Record<string, string>>({});

	function openCreate() {
		setEditing(undefined);
		setDialogOpen(true);
	}

	function openEdit(c: EmailIngestConfig) {
		setEditing(c);
		setDialogOpen(true);
	}

	async function handleDelete(c: EmailIngestConfig) {
		if (!window.confirm(`Delete config "${c.name}"? This cannot be undone.`)) return;
		await deleteConfig.mutateAsync(c.id);
	}

	async function handleToggle(c: EmailIngestConfig) {
		await toggle.mutateAsync({ id: c.id, is_active: !c.is_active });
	}

	async function handleTrigger(c: EmailIngestConfig) {
		const result = await trigger.mutateAsync(c.id);
		setTriggerMsg(prev => ({
			...prev,
			[c.id]: result.error ? `Error: ${result.error}` : 'Triggered',
		}));
		setTimeout(
			() => setTriggerMsg(prev => { const n = { ...prev }; delete n[c.id]; return n; }),
			4000,
		);
	}

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Email Ingest (IMAP)</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Monitor IMAP mailboxes and ingest PDF / image attachments automatically.
					</p>
				</div>
				<Button onClick={openCreate}>
					<Plus className="mr-2 h-4 w-4" />
					New Config
				</Button>
			</div>

			{/* Stats */}
			{configs.length > 0 && <StatsCards configs={configs} />}

			{/* Loading / error / empty */}
			{isLoading && (
				<div className="flex items-center gap-2 py-8 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin" />
					Loading…
				</div>
			)}
			{isError && (
				<p className="text-sm text-destructive">Failed to load configs.</p>
			)}
			{!isLoading && !isError && configs.length === 0 && (
				<div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
					No IMAP configs yet. Click "New Config" to add one.
				</div>
			)}

			{/* Table */}
			{configs.length > 0 && (
				<div className="overflow-x-auto rounded-lg border">
					<table className="min-w-full divide-y divide-border text-sm">
						<thead className="bg-muted/50">
							<tr>
								<th className="w-8" />
								{['Name', 'Host', 'Username', 'Folder', 'Interval', 'Last Checked', 'Docs', 'Status', 'Actions'].map(h => (
									<th
										key={h}
										className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground"
									>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-border bg-background">
							{configs.map(c => (
								<ConfigRow
									key={c.id}
									config={c}
									onEdit={openEdit}
									onDelete={handleDelete}
									onToggle={handleToggle}
									onTrigger={handleTrigger}
									triggerMsg={triggerMsg[c.id]}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}

			<ConfigDialog
				open={dialogOpen}
				existing={editing}
				onClose={() => { setDialogOpen(false); setEditing(undefined); }}
			/>
		</div>
	);
}

export default EmailIngestConfigs;
