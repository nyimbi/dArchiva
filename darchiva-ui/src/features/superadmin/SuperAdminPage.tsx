// (c) Copyright Datacraft, 2026
/**
 * Super-Admin Panel — platform-wide tenant management.
 * Gated: renders "Access denied" if current user is not a superuser.
 */
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useCurrentUser } from '@/features/users/api';
import {
	Building2,
	FileText,
	HardDrive,
	Plus,
	RefreshCw,
	Search,
	ShieldAlert,
	Trash2,
	Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
	type BackgroundJob,
	type FeatureFlag,
	type SystemConfigEntry,
	type TenantStats,
	useBackgroundJobs,
	useClearCaches,
	useCreateSuperAdminTenant,
	useFeatureFlags,
	usePurgeQueue,
	useRebuildSearchIndex,
	useSystemConfig,
	useSystemStats,
	useTenantDetail,
	useTenants,
	useToggleFeatureFlag,
	useUpdateSystemConfig,
	useUpdateTenant,
} from './api';

// ── Default data for tabs when API returns empty ───────────────────────────────

const DEFAULT_CONFIG: SystemConfigEntry[] = [
	{ key: 'ocr_engine', value: 'tesseract', description: 'OCR engine (tesseract | google | azure)' },
	{ key: 'max_file_size_mb', value: '50', description: 'Maximum upload size in MB' },
	{ key: 'allowed_file_types', value: 'pdf,jpg,png,tiff,docx', description: 'Comma-separated allowed upload types' },
	{ key: 'default_retention_days', value: '365', description: 'Default document retention in days' },
	{ key: 'max_ocr_concurrent', value: '4', description: 'Max concurrent OCR jobs' },
	{ key: 'thumbnail_quality', value: '85', description: 'JPEG quality for thumbnails (1–100)' },
];

const DEFAULT_FLAGS: FeatureFlag[] = [
	{ key: 'bulk_ocr', label: 'Bulk OCR', description: 'Process multiple documents simultaneously', enabled: false },
	{ key: 'ai_classification', label: 'AI Classification', description: 'Auto-classify documents using AI', enabled: false },
	{ key: 'smart_search', label: 'Smart Search', description: 'Semantic search powered by embeddings', enabled: false },
	{ key: 'version_diff', label: 'Version Diff Viewer', description: 'Side-by-side document version comparison', enabled: true },
	{ key: 'document_chat', label: 'Document Chat', description: 'Converse with documents using LLM', enabled: false },
	{ key: 'auto_tagging', label: 'Auto Tagging', description: 'Suggest tags based on content analysis', enabled: false },
];

// ── KPI tile ──────────────────────────────────────────────────────────────────

interface KpiTileProps {
	label: string;
	value: string | number;
	icon: React.ReactNode;
	sub?: string;
}

function KpiTile({ label, value, icon, sub }: KpiTileProps) {
	return (
		<div className="rounded-lg border bg-card p-5 flex flex-col gap-2">
			<div className="flex items-center justify-between text-muted-foreground text-sm">
				<span>{label}</span>
				{icon}
			</div>
			<div className="text-3xl font-bold tabular-nums">{value}</div>
			{sub && <div className="text-xs text-muted-foreground">{sub}</div>}
		</div>
	);
}

// ── Storage bar ───────────────────────────────────────────────────────────────

function StorageBar({ mb, quotaGb }: { mb: number; quotaGb: number | null }) {
	if (!quotaGb) {
		return <span className="text-xs text-muted-foreground">{mb.toFixed(0)} MB</span>;
	}
	const pct = Math.min((mb / (quotaGb * 1024)) * 100, 100);
	const color = pct > 90 ? 'bg-destructive' : pct > 70 ? 'bg-amber-500' : 'bg-primary';
	return (
		<div className="flex items-center gap-2 min-w-[120px]">
			<div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
				<div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
			</div>
			<span className="text-xs text-muted-foreground whitespace-nowrap">
				{mb.toFixed(0)} / {quotaGb * 1024} MB
			</span>
		</div>
	);
}

// ── Edit tenant dialog ─────────────────────────────────────────────────────────

interface EditTenantDialogProps {
	tenantId: string | null;
	onClose: () => void;
}

function EditTenantDialog({ tenantId, onClose }: EditTenantDialogProps) {
	const { data: detail, isLoading } = useTenantDetail(tenantId);
	const updateTenant = useUpdateTenant();

	const [isActive, setIsActive] = useState<boolean | undefined>(undefined);
	const [quotaGb, setQuotaGb] = useState('');
	const [featureFlagsRaw, setFeatureFlagsRaw] = useState('');
	const [flagsError, setFlagsError] = useState('');

	const initialised =
		detail &&
		isActive === undefined &&
		featureFlagsRaw === '' &&
		quotaGb === '';

	if (initialised) {
		setIsActive(detail.is_active);
		setQuotaGb(detail.max_storage_gb != null ? String(detail.max_storage_gb) : '');
		setFeatureFlagsRaw(detail.features ? JSON.stringify(detail.features, null, 2) : '{}');
	}

	function handleSave() {
		setFlagsError('');
		let flags: Record<string, boolean> | undefined;
		if (featureFlagsRaw.trim()) {
			try {
				flags = JSON.parse(featureFlagsRaw);
			} catch {
				setFlagsError('Invalid JSON');
				return;
			}
		}
		updateTenant.mutate(
			{
				id: tenantId!,
				patch: {
					is_active: isActive,
					storage_quota_gb: quotaGb ? parseFloat(quotaGb) : undefined,
					feature_flags: flags,
				},
			},
			{ onSuccess: onClose },
		);
	}

	return (
		<Dialog open={!!tenantId} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Tenant</DialogTitle>
					<DialogDescription>
						{detail ? `${detail.name} (${detail.slug})` : 'Loading…'}
					</DialogDescription>
				</DialogHeader>

				{isLoading ? (
					<div className="space-y-3 py-4">
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-8 w-full" />
						<Skeleton className="h-24 w-full" />
					</div>
				) : detail ? (
					<div className="space-y-5 py-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="active-toggle">Active</Label>
							<Switch
								id="active-toggle"
								checked={isActive ?? detail.is_active}
								onCheckedChange={setIsActive}
							/>
						</div>

						<div className="space-y-1">
							<Label htmlFor="quota-input">Storage quota (GB)</Label>
							<Input
								id="quota-input"
								type="number"
								min={0}
								placeholder="Unlimited"
								value={quotaGb}
								onChange={(e) => setQuotaGb(e.target.value)}
							/>
						</div>

						<div className="space-y-1">
							<Label htmlFor="flags-input">Feature flags (JSON)</Label>
							<Textarea
								id="flags-input"
								rows={5}
								className="font-mono text-xs"
								value={featureFlagsRaw}
								onChange={(e) => {
									setFeatureFlagsRaw(e.target.value);
									setFlagsError('');
								}}
							/>
							{flagsError && (
								<p className="text-xs text-destructive">{flagsError}</p>
							)}
						</div>

						{detail.recent_activity.length > 0 && (
							<div className="space-y-1">
								<Label>Recent activity</Label>
								<ul className="text-xs text-muted-foreground space-y-1 max-h-32 overflow-y-auto pr-1">
									{detail.recent_activity.map((a, i) => (
										<li key={i} className="flex gap-2">
											<span className="shrink-0">
												{new Date(a.timestamp).toLocaleString()}
											</span>
											<span>{a.description}</span>
										</li>
									))}
								</ul>
							</div>
						)}
					</div>
				) : null}

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={updateTenant.isPending || isLoading || !detail}
					>
						{updateTenant.isPending ? 'Saving…' : 'Save'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Create tenant dialog ───────────────────────────────────────────────────────

interface CreateTenantDialogProps {
	open: boolean;
	onClose: () => void;
}

function CreateTenantDialog({ open, onClose }: CreateTenantDialogProps) {
	const createTenant = useCreateSuperAdminTenant();
	const [name, setName] = useState('');
	const [slug, setSlug] = useState('');
	const [error, setError] = useState('');

	function handleCreate() {
		setError('');
		if (!name.trim() || !slug.trim()) {
			setError('Name and slug are required.');
			return;
		}
		createTenant.mutate(
			{ name: name.trim(), slug: slug.trim() },
			{
				onSuccess: () => {
					setName('');
					setSlug('');
					onClose();
				},
				onError: (err: unknown) => {
					const msg =
						(err as { response?: { data?: { detail?: string } } })?.response?.data
							?.detail ?? 'Failed to create tenant';
					setError(msg);
				},
			},
		);
	}

	return (
		<Dialog open={open} onOpenChange={(o) => !o && onClose()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Create Tenant</DialogTitle>
					<DialogDescription>Add a new organization to the platform.</DialogDescription>
				</DialogHeader>

				<div className="space-y-4 py-2">
					<div className="space-y-1">
						<Label htmlFor="tenant-name">Name</Label>
						<Input
							id="tenant-name"
							placeholder="Acme Corp"
							value={name}
							onChange={(e) => setName(e.target.value)}
						/>
					</div>
					<div className="space-y-1">
						<Label htmlFor="tenant-slug">Slug</Label>
						<Input
							id="tenant-slug"
							placeholder="acme-corp"
							value={slug}
							onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
						/>
					</div>
					{error && <p className="text-xs text-destructive">{error}</p>}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={handleCreate} disabled={createTenant.isPending}>
						{createTenant.isPending ? 'Creating…' : 'Create'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Tenants table ─────────────────────────────────────────────────────────────

interface TenantsTableProps {
	tenants: TenantStats[];
	onEdit: (id: string) => void;
	onToggleActive: (t: TenantStats) => void;
	isUpdating: boolean;
}

function TenantsTable({ tenants, onEdit, onToggleActive, isUpdating }: TenantsTableProps) {
	return (
		<div className="rounded-md border overflow-hidden">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Plan</TableHead>
						<TableHead className="text-right">Users</TableHead>
						<TableHead className="text-right">Documents</TableHead>
						<TableHead>Storage</TableHead>
						<TableHead>Created</TableHead>
						<TableHead>Status</TableHead>
						<TableHead className="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{tenants.length === 0 && (
						<TableRow>
							<TableCell colSpan={8} className="text-center text-muted-foreground py-8">
								No tenants found.
							</TableCell>
						</TableRow>
					)}
					{tenants.map((t) => (
						<TableRow key={t.id}>
							<TableCell>
								<div className="font-medium">{t.name}</div>
								<div className="text-xs text-muted-foreground">{t.slug}</div>
							</TableCell>
							<TableCell>
								<Badge variant="outline" className="capitalize">
									{t.plan}
								</Badge>
							</TableCell>
							<TableCell className="text-right tabular-nums">{t.user_count}</TableCell>
							<TableCell className="text-right tabular-nums">{t.document_count}</TableCell>
							<TableCell>
								<StorageBar mb={t.storage_mb} quotaGb={null} />
							</TableCell>
							<TableCell className="text-xs text-muted-foreground">
								{t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
							</TableCell>
							<TableCell>
								<Switch
									checked={t.is_active}
									disabled={isUpdating}
									onCheckedChange={() => onToggleActive(t)}
									aria-label={t.is_active ? 'Active' : 'Suspended'}
								/>
							</TableCell>
							<TableCell className="text-right">
								<Button size="sm" variant="outline" onClick={() => onEdit(t.id)}>
									Edit
								</Button>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

// ── System Config tab ─────────────────────────────────────────────────────────

function SystemConfigTab() {
	const { data: remoteConfig = [], isLoading } = useSystemConfig();
	const updateConfig = useUpdateSystemConfig();
	const [entries, setEntries] = useState<SystemConfigEntry[]>([]);
	const [dirty, setDirty] = useState(false);

	useEffect(() => {
		if (remoteConfig.length > 0) {
			setEntries(remoteConfig);
			setDirty(false);
		}
	}, [remoteConfig]);

	const displayEntries = entries.length > 0 ? entries : DEFAULT_CONFIG;

	function handleValueChange(key: string, value: string) {
		setEntries((prev) =>
			prev.length > 0
				? prev.map((e) => (e.key === key ? { ...e, value } : e))
				: DEFAULT_CONFIG.map((e) => (e.key === key ? { ...e, value } : e)),
		);
		setDirty(true);
	}

	function handleSave() {
		updateConfig.mutate(displayEntries, { onSuccess: () => setDirty(false) });
	}

	if (isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-10 w-full" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Global settings applied platform-wide. Changes take effect immediately.
				</p>
				<Button
					size="sm"
					disabled={!dirty || updateConfig.isPending}
					onClick={handleSave}
				>
					{updateConfig.isPending ? 'Saving…' : 'Save Changes'}
				</Button>
			</div>
			<div className="rounded-md border overflow-hidden">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-56">Key</TableHead>
							<TableHead className="w-64">Value</TableHead>
							<TableHead>Description</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{displayEntries.map((entry) => (
							<TableRow key={entry.key}>
								<TableCell>
									<code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
										{entry.key}
									</code>
								</TableCell>
								<TableCell>
									<Input
										value={entry.value}
										onChange={(e) => handleValueChange(entry.key, e.target.value)}
										className="h-7 text-sm"
									/>
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{entry.description ?? '—'}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}

// ── Background Jobs tab ───────────────────────────────────────────────────────

function JobStateBadge({ state }: { state: BackgroundJob['state'] }) {
	const styles: Record<BackgroundJob['state'], string> = {
		pending: 'bg-muted text-muted-foreground',
		running: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
		failed: 'bg-destructive/20 text-destructive',
		success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
	};
	return (
		<span
			className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[state]}`}
		>
			{state}
		</span>
	);
}

function BackgroundJobsTab() {
	const { data: jobs = [], isLoading } = useBackgroundJobs();
	const purgeQueue = usePurgeQueue();

	const queues = [...new Set(jobs.map((j) => j.queue))];

	if (isLoading) {
		return (
			<div className="space-y-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton key={i} className="h-10 w-full" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-sm text-muted-foreground">
					Live Celery task queue — auto-refreshes every 5 s.
				</p>
				{queues.length > 0 && (
					<div className="flex gap-2">
						{queues.map((q) => (
							<AlertDialog key={q}>
								<AlertDialogTrigger asChild>
									<Button variant="destructive" size="sm">
										<Trash2 className="h-3.5 w-3.5 mr-1" />
										Purge {q}
									</Button>
								</AlertDialogTrigger>
								<AlertDialogContent>
									<AlertDialogHeader>
										<AlertDialogTitle>Purge queue "{q}"?</AlertDialogTitle>
										<AlertDialogDescription>
											All pending tasks in this queue will be removed. Running tasks
											are not affected.
										</AlertDialogDescription>
									</AlertDialogHeader>
									<AlertDialogFooter>
										<AlertDialogCancel>Cancel</AlertDialogCancel>
										<AlertDialogAction
											onClick={() => purgeQueue.mutate(q)}
											className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
										>
											Purge
										</AlertDialogAction>
									</AlertDialogFooter>
								</AlertDialogContent>
							</AlertDialog>
						))}
					</div>
				)}
			</div>

			{jobs.length === 0 ? (
				<div className="flex items-center justify-center h-32 text-muted-foreground text-sm border rounded-md">
					No active tasks.
				</div>
			) : (
				<div className="rounded-md border overflow-hidden">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Task</TableHead>
								<TableHead>Worker</TableHead>
								<TableHead>Queue</TableHead>
								<TableHead>ETA</TableHead>
								<TableHead className="text-right">Retries</TableHead>
								<TableHead className="w-32">Progress</TableHead>
								<TableHead>State</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{jobs.map((job) => (
								<TableRow key={job.id}>
									<TableCell>
										<div className="font-medium text-sm">{job.name}</div>
										<div className="text-xs text-muted-foreground font-mono">{job.id.slice(0, 8)}…</div>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">{job.worker}</TableCell>
									<TableCell>
										<Badge variant="outline">{job.queue}</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{job.eta ? new Date(job.eta).toLocaleString() : '—'}
									</TableCell>
									<TableCell className="text-right tabular-nums text-sm">
										{job.retries}/{job.max_retries}
									</TableCell>
									<TableCell>
										{job.progress != null ? (
											<div className="flex items-center gap-2">
												<div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
													<div
														className="h-full bg-primary transition-all"
														style={{ width: `${job.progress}%` }}
													/>
												</div>
												<span className="text-xs text-muted-foreground tabular-nums w-8">
													{job.progress}%
												</span>
											</div>
										) : (
											<span className="text-xs text-muted-foreground">—</span>
										)}
									</TableCell>
									<TableCell>
										<JobStateBadge state={job.state} />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}
		</div>
	);
}

// ── Feature Flags tab ─────────────────────────────────────────────────────────

function FeatureFlagsTab() {
	const { data: flags, isLoading } = useFeatureFlags();
	const toggleFlag = useToggleFeatureFlag();

	const displayFlags = flags && flags.length > 0 ? flags : DEFAULT_FLAGS;

	if (isLoading) {
		return (
			<div className="space-y-3">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-16 w-full rounded-lg" />
				))}
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{displayFlags.map((flag) => (
				<div
					key={flag.key}
					className="flex items-center justify-between p-4 rounded-lg border bg-card"
				>
					<div className="space-y-0.5">
						<div className="font-medium">{flag.label}</div>
						{flag.description && (
							<div className="text-sm text-muted-foreground">{flag.description}</div>
						)}
						<code className="text-xs text-muted-foreground/70 font-mono">{flag.key}</code>
					</div>
					<Switch
						checked={flag.enabled}
						onCheckedChange={(enabled) => toggleFlag.mutate({ key: flag.key, enabled })}
						disabled={toggleFlag.isPending}
						aria-label={flag.label}
					/>
				</div>
			))}
		</div>
	);
}

// ── Danger Zone ───────────────────────────────────────────────────────────────

function DangerZone() {
	const rebuildIndex = useRebuildSearchIndex();
	const clearCaches = useClearCaches();

	return (
		<div className="rounded-lg border border-destructive/40 p-5 space-y-4">
			<div>
				<h3 className="text-base font-semibold text-destructive">Danger Zone</h3>
				<p className="text-sm text-muted-foreground mt-0.5">
					These actions affect the entire platform and cannot be easily undone.
				</p>
			</div>
			<div className="flex flex-wrap gap-3">
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							variant="outline"
							className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
							disabled={rebuildIndex.isPending}
						>
							<Search className="h-4 w-4 mr-1.5" />
							{rebuildIndex.isPending ? 'Rebuilding…' : 'Rebuild Search Index'}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Rebuild search index?</AlertDialogTitle>
							<AlertDialogDescription>
								This re-indexes all documents. The process may take several minutes and will
								temporarily degrade search performance for all users.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction onClick={() => rebuildIndex.mutate()}>
								Rebuild
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>

				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							variant="outline"
							className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:border-destructive"
							disabled={clearCaches.isPending}
						>
							<Trash2 className="h-4 w-4 mr-1.5" />
							{clearCaches.isPending ? 'Clearing…' : 'Clear All Caches'}
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Clear all caches?</AlertDialogTitle>
							<AlertDialogDescription>
								Flushes Redis and in-memory application caches platform-wide. Users may see
								slower responses for a few minutes until caches warm up again.
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								onClick={() => clearCaches.mutate()}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								Clear
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</div>
	);
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function SuperAdminPage() {
	const { data: currentUser, isLoading: userLoading } = useCurrentUser();
	const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useSystemStats();
	const { data: tenants, isLoading: tenantsLoading, refetch: refetchTenants } = useTenants();
	const updateTenant = useUpdateTenant();

	const [editingTenantId, setEditingTenantId] = useState<string | null>(null);
	const [showCreateDialog, setShowCreateDialog] = useState(false);

	if (userLoading) {
		return (
			<div className="p-8 space-y-4">
				<Skeleton className="h-8 w-48" />
				<Skeleton className="h-4 w-64" />
			</div>
		);
	}

	if (!currentUser?.is_superuser) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-4 p-16 text-center">
				<ShieldAlert className="h-12 w-12 text-destructive" />
				<h2 className="text-xl font-semibold">Access denied</h2>
				<p className="text-muted-foreground max-w-sm">
					The super-admin panel is restricted to platform administrators. Contact your system
					admin if you believe this is an error.
				</p>
			</div>
		);
	}

	function handleToggleActive(t: TenantStats) {
		updateTenant.mutate({ id: t.id, patch: { is_active: !t.is_active } });
	}

	function handleRefresh() {
		refetchStats();
		refetchTenants();
	}

	return (
		<div className="p-6 space-y-6 max-w-7xl mx-auto">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Super-Admin Panel</h1>
					<p className="text-muted-foreground text-sm mt-0.5">
						Platform-wide tenant and system management
					</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={handleRefresh}>
						<RefreshCw className="h-4 w-4 mr-1.5" />
						Refresh
					</Button>
					<Button size="sm" onClick={() => setShowCreateDialog(true)}>
						<Plus className="h-4 w-4 mr-1.5" />
						Create Tenant
					</Button>
				</div>
			</div>

			{/* KPI bar */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				{statsLoading ? (
					Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-28 rounded-lg" />
					))
				) : (
					<>
						<KpiTile
							label="Tenants"
							value={stats?.total_tenants ?? 0}
							icon={<Building2 className="h-4 w-4" />}
						/>
						<KpiTile
							label="Users"
							value={stats?.total_users ?? 0}
							icon={<Users className="h-4 w-4" />}
							sub={`+${stats?.new_users_today ?? 0} today`}
						/>
						<KpiTile
							label="Documents"
							value={stats?.total_documents ?? 0}
							icon={<FileText className="h-4 w-4" />}
							sub={`+${stats?.documents_today ?? 0} today`}
						/>
						<KpiTile
							label="Storage"
							value={`${(stats?.total_storage_gb ?? 0).toFixed(2)} GB`}
							icon={<HardDrive className="h-4 w-4" />}
						/>
					</>
				)}
			</div>

			{/* Tabs */}
			<Tabs defaultValue="tenants">
				<TabsList className="mb-4">
					<TabsTrigger value="tenants">Tenants</TabsTrigger>
					<TabsTrigger value="system-config">System Config</TabsTrigger>
					<TabsTrigger value="jobs">Background Jobs</TabsTrigger>
					<TabsTrigger value="feature-flags">Feature Flags</TabsTrigger>
				</TabsList>

				<TabsContent value="tenants">
					{tenantsLoading ? (
						<Skeleton className="h-64 w-full rounded-lg" />
					) : (
						<TenantsTable
							tenants={tenants ?? []}
							onEdit={setEditingTenantId}
							onToggleActive={handleToggleActive}
							isUpdating={updateTenant.isPending}
						/>
					)}
				</TabsContent>

				<TabsContent value="system-config">
					<SystemConfigTab />
				</TabsContent>

				<TabsContent value="jobs">
					<BackgroundJobsTab />
				</TabsContent>

				<TabsContent value="feature-flags">
					<FeatureFlagsTab />
				</TabsContent>
			</Tabs>

			{/* Danger zone */}
			<DangerZone />

			{/* Dialogs */}
			<EditTenantDialog
				tenantId={editingTenantId}
				onClose={() => setEditingTenantId(null)}
			/>
			<CreateTenantDialog
				open={showCreateDialog}
				onClose={() => setShowCreateDialog(false)}
			/>
		</div>
	);
}
