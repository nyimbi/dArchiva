// (c) Copyright Datacraft, 2026.
import { useState } from 'react';
import {
	AlertCircle,
	Cloud,
	FileStack,
	FolderOpen,
	HardDrive,
	Loader2,
	Plus,
	RefreshCw,
	Settings,
	Timer,
	Trash2,
	Unplug,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
} from '@/components/ui/card';
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
import {
	type ConnectorConfig,
	type CreateConnectorInput,
	type UpdateConnectorInput,
	useConnectors,
	useCreateConnector,
	useDeleteConnector,
	useSyncConnector,
	useUpdateConnector,
} from './api';

// ---------------------------------------------------------------------------
// Connector type metadata
// ---------------------------------------------------------------------------

type ConnectorType = ConnectorConfig['connector_type'];

const CONNECTOR_META: Record<
	ConnectorType,
	{ label: string; description: string; color: string; icon: React.ReactNode }
> = {
	dropbox: {
		label: 'Dropbox',
		description: 'Import documents from a Dropbox folder automatically.',
		color: 'bg-blue-600',
		icon: <Cloud className="h-8 w-8 text-white" />,
	},
	google_drive: {
		label: 'Google Drive',
		description: 'Sync documents from Google Drive into dArchiva.',
		color: 'bg-green-600',
		icon: <Cloud className="h-8 w-8 text-white" />,
	},
	onedrive: {
		label: 'OneDrive',
		description: 'Pull documents from Microsoft OneDrive.',
		color: 'bg-blue-500',
		icon: <Cloud className="h-8 w-8 text-white" />,
	},
	local_folder: {
		label: 'Local Folder',
		description: 'Watch a server-local directory for new files.',
		color: 'bg-gray-600',
		icon: <HardDrive className="h-8 w-8 text-white" />,
	},
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelative(isoStr: string | null): string {
	if (!isoStr) return 'Never';
	const diff = Date.now() - new Date(isoStr).getTime();
	const minutes = Math.floor(diff / 60_000);
	if (minutes < 1) return 'Just now';
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	return `${Math.floor(hours / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Stats Cards
// ---------------------------------------------------------------------------

function StatsCards({ connectors }: { connectors: ConnectorConfig[] }) {
	const total = connectors.length;

	// most recent sync across all connectors
	const lastSync = connectors
		.map(c => c.last_sync_at)
		.filter(Boolean)
		.sort()
		.at(-1) ?? null;

	// total files synced across all last syncs
	const totalFiles = connectors.reduce((sum, c) => sum + c.last_file_count, 0);

	const stats: { label: string; value: string | number; Icon: typeof FileStack }[] = [
		{ label: 'Total Connectors', value: total, Icon: Unplug },
		{ label: 'Last Sync', value: formatRelative(lastSync), Icon: Timer },
		{ label: 'Files Synced (last runs)', value: totalFiles.toLocaleString(), Icon: FileStack },
	];

	return (
		<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
			{stats.map(({ label, value, Icon }) => (
				<Card key={label}>
					<CardContent className="flex items-center gap-3 pb-4 pt-5">
						<Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
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
// Add Connector Dialog
// ---------------------------------------------------------------------------

interface AddDialogProps {
	open: boolean;
	onClose: () => void;
}

function AddConnectorDialog({ open, onClose }: AddDialogProps) {
	const createMutation = useCreateConnector();

	const [name, setName] = useState('');
	const [type, setType] = useState<ConnectorType>('dropbox');
	const [accessToken, setAccessToken] = useState('');
	const [folderPath, setFolderPath] = useState('');
	const [destinationFolderId, setDestinationFolderId] = useState('');
	const [interval, setInterval] = useState(60);

	function reset() {
		setName('');
		setType('dropbox');
		setAccessToken('');
		setFolderPath('');
		setDestinationFolderId('');
		setInterval(60);
	}

	function buildConfigJson(): string {
		if (type === 'dropbox') return JSON.stringify({ access_token: accessToken });
		if (type === 'local_folder') return JSON.stringify({ folder_path: folderPath });
		return '{}';
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const payload: CreateConnectorInput = {
			name: name.trim(),
			connector_type: type,
			config_json: buildConfigJson(),
			watch_folder_id: type === 'local_folder' ? folderPath : undefined,
			destination_folder_id: destinationFolderId || undefined,
			sync_interval_minutes: interval,
		};
		await createMutation.mutateAsync(payload);
		reset();
		onClose();
	}

	return (
		<Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
			<DialogContent className="max-w-lg">
				<DialogHeader>
					<DialogTitle>Add Connector</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					<div className="space-y-1">
						<Label htmlFor="cc-name">Name</Label>
						<Input
							id="cc-name"
							placeholder="My Dropbox"
							value={name}
							onChange={e => setName(e.target.value)}
							required
						/>
					</div>

					<div className="space-y-1">
						<Label>Connector Type</Label>
						<Select value={type} onValueChange={v => setType(v as ConnectorType)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(CONNECTOR_META) as ConnectorType[]).map(t => (
									<SelectItem key={t} value={t}>
										{CONNECTOR_META[t].label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{type === 'dropbox' && (
						<div className="space-y-1">
							<Label htmlFor="cc-token">Dropbox Access Token</Label>
							<Input
								id="cc-token"
								type="password"
								placeholder="sl.xxxxx…"
								value={accessToken}
								onChange={e => setAccessToken(e.target.value)}
								required
							/>
							<p className="text-xs text-muted-foreground">
								Generate a token in the Dropbox App Console or use the OAuth flow.
							</p>
						</div>
					)}

					{type === 'local_folder' && (
						<div className="space-y-1">
							<Label htmlFor="cc-path">Folder Path (server-side)</Label>
							<Input
								id="cc-path"
								placeholder="/data/incoming"
								value={folderPath}
								onChange={e => setFolderPath(e.target.value)}
								required
							/>
						</div>
					)}

					{(type === 'google_drive' || type === 'onedrive') && (
						<p className="rounded border bg-muted p-3 text-sm text-muted-foreground">
							OAuth flow for {CONNECTOR_META[type].label} is not yet configured.
							Contact your administrator to set up OAuth application credentials.
						</p>
					)}

					<div className="space-y-1">
						<Label htmlFor="cc-dest">Destination Folder ID (optional)</Label>
						<Input
							id="cc-dest"
							placeholder="Folder UUID"
							value={destinationFolderId}
							onChange={e => setDestinationFolderId(e.target.value)}
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="cc-interval">Sync Interval (minutes)</Label>
						<Input
							id="cc-interval"
							type="number"
							min={5}
							max={10080}
							value={interval}
							onChange={e => setInterval(Number(e.target.value))}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={createMutation.isPending}>
							{createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Add Connector
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Configure Connector Dialog
// ---------------------------------------------------------------------------

interface ConfigureDialogProps {
	connector: ConnectorConfig;
	onClose: () => void;
}

function ConfigureConnectorDialog({ connector, onClose }: ConfigureDialogProps) {
	const updateMutation = useUpdateConnector();

	const [name, setName] = useState(connector.name);
	const [interval, setInterval] = useState(connector.sync_interval_minutes);
	const [destFolder, setDestFolder] = useState(connector.destination_folder_id ?? '');

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const payload: UpdateConnectorInput = {
			name: name.trim(),
			sync_interval_minutes: interval,
			destination_folder_id: destFolder.trim() || undefined,
		};
		await updateMutation.mutateAsync({ id: connector.id, ...payload });
		onClose();
	}

	return (
		<Dialog open onOpenChange={v => { if (!v) onClose(); }}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Configure — {CONNECTOR_META[connector.connector_type]?.label}</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4 pt-2">
					<div className="space-y-1">
						<Label htmlFor="cfg-name">Name</Label>
						<Input
							id="cfg-name"
							value={name}
							onChange={e => setName(e.target.value)}
							required
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="cfg-interval">Sync Interval (minutes)</Label>
						<Input
							id="cfg-interval"
							type="number"
							min={5}
							max={10080}
							value={interval}
							onChange={e => setInterval(Number(e.target.value))}
						/>
					</div>

					<div className="space-y-1">
						<Label htmlFor="cfg-dest">Destination Folder ID (optional)</Label>
						<Input
							id="cfg-dest"
							placeholder="Folder UUID"
							value={destFolder}
							onChange={e => setDestFolder(e.target.value)}
						/>
					</div>

					{updateMutation.isError && (
						<p className="text-sm text-destructive">
							{updateMutation.error?.message ?? 'Update failed.'}
						</p>
					)}

					<DialogFooter>
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Save
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Connector Card (connected)
// ---------------------------------------------------------------------------

interface ConnectorCardProps {
	connector: ConnectorConfig;
	onDelete: (id: string) => void;
}

function ConnectorCard({ connector, onDelete }: ConnectorCardProps) {
	const meta = CONNECTOR_META[connector.connector_type] ?? CONNECTOR_META.local_folder;
	const syncMutation = useSyncConnector();
	const [configuring, setConfiguring] = useState(false);

	return (
		<>
			<Card className="flex flex-col gap-0 overflow-hidden">
				{/* Colored header strip */}
				<div className={`${meta.color} flex items-center gap-3 px-5 py-4`}>
					{meta.icon}
					<div className="min-w-0 flex-1">
						<p className="truncate font-semibold text-white">{connector.name}</p>
						<p className="text-xs text-white/75">{meta.label}</p>
					</div>
					<Badge
						variant="outline"
						className={
							connector.is_active
								? 'border-white/50 bg-white/20 text-white'
								: 'border-white/30 bg-transparent text-white/60'
						}
					>
						{connector.is_active ? 'Active' : 'Paused'}
					</Badge>
				</div>

				<CardContent className="flex flex-col gap-3 pb-4 pt-4">
					{connector.watch_folder_name && (
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<FolderOpen className="h-4 w-4 shrink-0" />
							<span className="truncate">{connector.watch_folder_name}</span>
						</div>
					)}

					<div className="grid grid-cols-2 gap-2 text-sm">
						<div>
							<p className="text-xs text-muted-foreground">Last sync</p>
							<p className="font-medium">{formatRelative(connector.last_sync_at)}</p>
						</div>
						<div>
							<p className="text-xs text-muted-foreground">Files synced</p>
							<p className="font-medium">{connector.last_file_count.toLocaleString()}</p>
						</div>
					</div>

					{syncMutation.data && (
						<p className="text-xs text-muted-foreground">
							Last result: {syncMutation.data.new_files} new —{' '}
							<span className={syncMutation.data.status === 'ok' ? 'text-green-600' : 'text-destructive'}>
								{syncMutation.data.status}
							</span>
							{syncMutation.data.message && ` · ${syncMutation.data.message}`}
						</p>
					)}

					<div className="flex gap-2 pt-1">
						<Button
							size="sm"
							variant="outline"
							className="flex-1"
							onClick={() => syncMutation.mutate(connector.id)}
							disabled={syncMutation.isPending}
						>
							{syncMutation.isPending
								? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
								: <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
							{syncMutation.isPending ? 'Syncing…' : 'Sync Now'}
						</Button>
						<Button
							size="sm"
							variant="outline"
							onClick={() => setConfiguring(true)}
							title="Configure"
						>
							<Settings className="h-3.5 w-3.5" />
						</Button>
						<Button
							size="sm"
							variant="ghost"
							className="text-destructive hover:text-destructive"
							onClick={() => onDelete(connector.id)}
						>
							<Trash2 className="h-3.5 w-3.5" />
						</Button>
					</div>
				</CardContent>
			</Card>

			{configuring && (
				<ConfigureConnectorDialog
					connector={connector}
					onClose={() => setConfiguring(false)}
				/>
			)}
		</>
	);
}

// ---------------------------------------------------------------------------
// Available Connector Type Card (not yet connected)
// ---------------------------------------------------------------------------

interface TypeCardProps {
	type: ConnectorType;
	onConnect: () => void;
}

function TypeCard({ type, onConnect }: TypeCardProps) {
	const meta = CONNECTOR_META[type];
	return (
		<Card className="flex flex-col overflow-hidden border-dashed opacity-70 transition-opacity hover:opacity-100">
			<div className={`${meta.color}/20 flex items-center gap-3 border-b px-5 py-4`}>
				<div className={`${meta.color} rounded-lg p-1.5`}>{meta.icon}</div>
				<div>
					<p className="font-semibold">{meta.label}</p>
					<p className="text-xs text-muted-foreground">{meta.description}</p>
				</div>
			</div>
			<CardContent className="pb-4 pt-4">
				<Button size="sm" variant="outline" className="w-full" onClick={onConnect}>
					<Plus className="mr-1.5 h-3.5 w-3.5" />
					Connect
				</Button>
			</CardContent>
		</Card>
	);
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function ConnectorsPage() {
	const { data: connectors = [], isLoading, isError } = useConnectors();
	const deleteMutation = useDeleteConnector();

	const [showAdd, setShowAdd] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const connectedTypes = new Set(connectors.map(c => c.connector_type));
	const unconnectedTypes = (Object.keys(CONNECTOR_META) as ConnectorType[]).filter(
		t => !connectedTypes.has(t),
	);

	async function confirmDelete() {
		if (!deleteId) return;
		await deleteMutation.mutateAsync(deleteId);
		setDeleteId(null);
	}

	return (
		<div className="mx-auto max-w-5xl space-y-8 p-6">
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">External Connectors</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Import documents automatically from cloud storage and local folders.
					</p>
				</div>
				<Button onClick={() => setShowAdd(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Add Connector
				</Button>
			</div>

			{/* Stats */}
			{!isLoading && connectors.length > 0 && (
				<StatsCards connectors={connectors} />
			)}

			{/* Loading / Error */}
			{isLoading ? (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="rounded-xl border border-border p-5 space-y-3">
							<div className="flex items-center gap-3">
								<div className="h-10 w-10 rounded-lg bg-muted animate-pulse shrink-0" />
								<div className="space-y-1.5 flex-1">
									<div className="h-4 w-28 rounded bg-muted animate-pulse" />
									<div className="h-3 w-16 rounded bg-muted animate-pulse" />
								</div>
							</div>
							<div className="h-3 w-full rounded bg-muted animate-pulse" />
							<div className="h-8 w-24 rounded bg-muted animate-pulse" />
						</div>
					))}
				</div>
			) : isError ? (
				<div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
					<AlertCircle className="h-4 w-4 shrink-0" />
					Failed to load connectors. Check your connection and try refreshing.
				</div>
			) : (
				<>
					{/* Active connectors */}
					{connectors.length > 0 && (
						<section className="space-y-3">
							<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
								Connected ({connectors.length})
							</h2>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{connectors.map(c => (
									<ConnectorCard key={c.id} connector={c} onDelete={setDeleteId} />
								))}
							</div>
						</section>
					)}

					{/* Available (not yet connected) types */}
					{unconnectedTypes.length > 0 && (
						<section className="space-y-3">
							<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
								Available
							</h2>
							<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
								{unconnectedTypes.map(t => (
									<TypeCard key={t} type={t} onConnect={() => setShowAdd(true)} />
								))}
							</div>
						</section>
					)}

					{/* Empty state */}
					{connectors.length === 0 && (
						<div className="py-16 text-center text-muted-foreground">
							<Unplug className="mx-auto mb-3 h-10 w-10 opacity-40" />
							<p className="text-base font-medium">No connectors configured</p>
							<p className="text-sm">
								Connect Dropbox, Google Drive, OneDrive, or a local folder to start importing
								documents automatically.
							</p>
							<Button className="mt-4" onClick={() => setShowAdd(true)}>
								<Plus className="mr-2 h-4 w-4" />
								Add your first connector
							</Button>
						</div>
					)}
				</>
			)}

			{/* Dialogs */}
			<AddConnectorDialog open={showAdd} onClose={() => setShowAdd(false)} />

			<AlertDialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete connector?</AlertDialogTitle>
						<AlertDialogDescription>
							This permanently removes the connector configuration. Already-imported documents
							are not affected.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={confirmDelete}
						>
							{deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
