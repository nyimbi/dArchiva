// (c) Copyright Datacraft, 2026.
import { useState } from 'react';
import {
	Cloud,
	FolderOpen,
	HardDrive,
	Loader2,
	Plus,
	RefreshCw,
	Settings,
	Trash2,
	Unplug,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
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
	useConnectors,
	useCreateConnector,
	useDeleteConnector,
	useSyncConnector,
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
		if (type === 'dropbox') {
			return JSON.stringify({ access_token: accessToken });
		}
		if (type === 'local_folder') {
			return JSON.stringify({ folder_path: folderPath });
		}
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
		<Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
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
							onChange={(e) => setName(e.target.value)}
							required
						/>
					</div>

					<div className="space-y-1">
						<Label>Connector Type</Label>
						<Select value={type} onValueChange={(v) => setType(v as ConnectorType)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(CONNECTOR_META) as ConnectorType[]).map((t) => (
									<SelectItem key={t} value={t}>
										{CONNECTOR_META[t].label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Credentials vary by type */}
					{type === 'dropbox' && (
						<div className="space-y-1">
							<Label htmlFor="cc-token">Dropbox Access Token</Label>
							<Input
								id="cc-token"
								type="password"
								placeholder="sl.xxxxx..."
								value={accessToken}
								onChange={(e) => setAccessToken(e.target.value)}
								required
							/>
							<p className="text-xs text-muted-foreground">
								Generate a token in the Dropbox App Console or use OAuth flow.
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
								onChange={(e) => setFolderPath(e.target.value)}
								required
							/>
						</div>
					)}

					{(type === 'google_drive' || type === 'onedrive') && (
						<p className="text-sm text-muted-foreground border rounded p-3 bg-muted">
							OAuth flow for {CONNECTOR_META[type].label} is not yet configured. Contact
							your administrator to set up the OAuth application credentials.
						</p>
					)}

					<div className="space-y-1">
						<Label htmlFor="cc-dest">Destination Folder ID (optional)</Label>
						<Input
							id="cc-dest"
							placeholder="Papermerge folder UUID"
							value={destinationFolderId}
							onChange={(e) => setDestinationFolderId(e.target.value)}
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
							onChange={(e) => setInterval(Number(e.target.value))}
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
// Connector Card
// ---------------------------------------------------------------------------

interface ConnectorCardProps {
	connector: ConnectorConfig;
	onDelete: (id: string) => void;
}

function ConnectorCard({ connector, onDelete }: ConnectorCardProps) {
	const meta = CONNECTOR_META[connector.connector_type] ?? CONNECTOR_META.local_folder;
	const syncMutation = useSyncConnector();
	const isSyncing = syncMutation.isPending;

	async function handleSync() {
		await syncMutation.mutateAsync(connector.id);
	}

	return (
		<Card className="flex flex-col gap-0 overflow-hidden">
			{/* Colored header strip */}
			<div className={`${meta.color} flex items-center gap-3 px-5 py-4`}>
				{meta.icon}
				<div className="flex-1 min-w-0">
					<p className="font-semibold text-white truncate">{connector.name}</p>
					<p className="text-white/75 text-xs">{meta.label}</p>
				</div>
				<Badge
					variant="outline"
					className={
						connector.is_active
							? 'border-white/50 text-white bg-white/20'
							: 'border-white/30 text-white/60 bg-transparent'
					}
				>
					{connector.is_active ? 'Active' : 'Paused'}
				</Badge>
			</div>

			<CardContent className="pt-4 pb-4 flex flex-col gap-3">
				{connector.watch_folder_name && (
					<div className="flex items-center gap-2 text-sm text-muted-foreground">
						<FolderOpen className="h-4 w-4 flex-shrink-0" />
						<span className="truncate">{connector.watch_folder_name}</span>
					</div>
				)}

				<div className="grid grid-cols-2 gap-2 text-sm">
					<div>
						<p className="text-muted-foreground text-xs">Last sync</p>
						<p className="font-medium">{formatRelative(connector.last_sync_at)}</p>
					</div>
					<div>
						<p className="text-muted-foreground text-xs">Files synced</p>
						<p className="font-medium">{connector.last_file_count.toLocaleString()}</p>
					</div>
				</div>

				{syncMutation.data && (
					<p className="text-xs text-muted-foreground">
						Last sync: {syncMutation.data.new_files} new file(s) —{' '}
						<span
							className={
								syncMutation.data.status === 'ok' ? 'text-green-600' : 'text-red-500'
							}
						>
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
						onClick={handleSync}
						disabled={isSyncing}
					>
						{isSyncing ? (
							<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
						) : (
							<RefreshCw className="mr-1.5 h-3.5 w-3.5" />
						)}
						{isSyncing ? 'Syncing…' : 'Sync Now'}
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
	);
}

// ---------------------------------------------------------------------------
// Available Connector Type Card (for unconnected types)
// ---------------------------------------------------------------------------

interface TypeCardProps {
	type: ConnectorType;
	onConnect: () => void;
}

function TypeCard({ type, onConnect }: TypeCardProps) {
	const meta = CONNECTOR_META[type];
	return (
		<Card className="flex flex-col overflow-hidden border-dashed opacity-70 hover:opacity-100 transition-opacity">
			<div className={`${meta.color}/20 flex items-center gap-3 px-5 py-4 border-b`}>
				<div className={`${meta.color} rounded-lg p-1.5`}>{meta.icon}</div>
				<div>
					<p className="font-semibold">{meta.label}</p>
					<p className="text-xs text-muted-foreground">{meta.description}</p>
				</div>
			</div>
			<CardContent className="pt-4 pb-4">
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
	const { data: connectors = [], isLoading } = useConnectors();
	const deleteMutation = useDeleteConnector();

	const [showAdd, setShowAdd] = useState(false);
	const [deleteId, setDeleteId] = useState<string | null>(null);

	const connectedTypes = new Set(connectors.map((c) => c.connector_type));
	const unconnectedTypes = (Object.keys(CONNECTOR_META) as ConnectorType[]).filter(
		(t) => !connectedTypes.has(t),
	);

	async function confirmDelete() {
		if (!deleteId) return;
		await deleteMutation.mutateAsync(deleteId);
		setDeleteId(null);
	}

	return (
		<div className="p-6 max-w-5xl mx-auto space-y-8">
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">External Connectors</h1>
					<p className="text-muted-foreground text-sm mt-1">
						Import documents automatically from cloud storage and local folders.
					</p>
				</div>
				<Button onClick={() => setShowAdd(true)}>
					<Plus className="mr-2 h-4 w-4" />
					Add Connector
				</Button>
			</div>

			{/* Active connectors */}
			{isLoading ? (
				<div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
					<Loader2 className="h-5 w-5 animate-spin" />
					Loading connectors…
				</div>
			) : connectors.length > 0 ? (
				<section className="space-y-3">
					<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
						Connected ({connectors.length})
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{connectors.map((c) => (
							<ConnectorCard key={c.id} connector={c} onDelete={setDeleteId} />
						))}
					</div>
				</section>
			) : null}

			{/* Available (not yet connected) types */}
			{unconnectedTypes.length > 0 && (
				<section className="space-y-3">
					<h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
						Available
					</h2>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
						{unconnectedTypes.map((t) => (
							<TypeCard key={t} type={t} onConnect={() => setShowAdd(true)} />
						))}
					</div>
				</section>
			)}

			{/* Empty state */}
			{!isLoading && connectors.length === 0 && (
				<div className="text-center py-16 text-muted-foreground">
					<Unplug className="mx-auto h-10 w-10 mb-3 opacity-40" />
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

			{/* Dialogs */}
			<AddConnectorDialog open={showAdd} onClose={() => setShowAdd(false)} />

			<AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete connector?</AlertDialogTitle>
						<AlertDialogDescription>
							This will permanently remove the connector configuration. No documents already
							imported will be deleted.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={confirmDelete}
						>
							{deleteMutation.isPending ? (
								<Loader2 className="mr-2 h-4 w-4 animate-spin" />
							) : null}
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
