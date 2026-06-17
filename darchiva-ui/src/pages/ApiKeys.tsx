// (c) Copyright Datacraft, 2026.
import { useState } from 'react';
import {
	AlertTriangle,
	CheckCircle2,
	ClipboardCopy,
	Key,
	Plus,
	ShieldOff,
	Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	useApiKeys,
	useCreateApiKey,
	useRevokeApiKey,
	type ApiKey,
	type ApiKeyCreated,
} from '@/features/api-keys/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_SCOPES = [
	{ value: 'read',     label: 'Read',     description: 'Read documents and metadata' },
	{ value: 'write',    label: 'Write',    description: 'Create and update documents' },
	{ value: 'webhooks', label: 'Webhooks', description: 'Manage webhook subscriptions' },
	{ value: 'admin',    label: 'Admin',    description: 'Full administrative access' },
] as const;

const EXPIRY_OPTIONS = [
	{ label: '30 days',  days: 30 },
	{ label: '90 days',  days: 90 },
	{ label: '1 year',   days: 365 },
	{ label: 'Never',    days: null },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addDays(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString();
}

function formatDate(iso: string | null): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleDateString(undefined, {
		year: 'numeric', month: 'short', day: 'numeric',
	});
}

function ScopeBadge({ scope }: { scope: string }) {
	const colours: Record<string, string> = {
		read:     'bg-blue-900/40 text-blue-400 border-blue-700/40',
		write:    'bg-amber-900/40 text-amber-400 border-amber-700/40',
		webhooks: 'bg-purple-900/40 text-purple-400 border-purple-700/40',
		admin:    'bg-red-900/40 text-red-400 border-red-700/40',
	};
	return (
		<span
			className={cn(
				'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full border',
				colours[scope] ?? 'bg-slate-800 text-slate-400 border-slate-700',
			)}
		>
			{scope}
		</span>
	);
}

function StatusBadge({ isActive, expiresAt }: { isActive: boolean; expiresAt: string | null }) {
	const expired = expiresAt ? new Date(expiresAt) < new Date() : false;
	if (!isActive || expired) {
		return (
			<span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-900/40 text-red-400 border border-red-700/40">
				<ShieldOff className="w-3 h-3" />
				{expired ? 'Expired' : 'Revoked'}
			</span>
		);
	}
	return (
		<span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-900/40 text-emerald-400 border border-emerald-700/40">
			<CheckCircle2 className="w-3 h-3" />
			Active
		</span>
	);
}

// ---------------------------------------------------------------------------
// Reveal modal — shown once after creation
// ---------------------------------------------------------------------------

interface RevealModalProps {
	created: ApiKeyCreated;
	onClose: () => void;
}

function RevealModal({ created, onClose }: RevealModalProps) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		await navigator.clipboard.writeText(created.key);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
			<div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 space-y-5">
				<div className="flex items-center gap-3">
					<Key className="w-6 h-6 text-emerald-400" />
					<h2 className="text-lg font-semibold text-white">API Key Created</h2>
				</div>

				<div className="flex items-start gap-2 rounded-lg bg-amber-900/30 border border-amber-700/40 p-3">
					<AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
					<p className="text-sm text-amber-300">
						Copy this key now — it will <strong>not</strong> be shown again.
					</p>
				</div>

				<div>
					<label className="block text-xs font-medium text-slate-400 mb-1">
						Your new API key
					</label>
					<div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2">
						<code className="flex-1 text-sm text-emerald-300 font-mono break-all select-all">
							{created.key}
						</code>
						<button
							onClick={handleCopy}
							className="shrink-0 p-1.5 rounded hover:bg-slate-700 transition-colors"
							title="Copy to clipboard"
						>
							{copied
								? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
								: <ClipboardCopy className="w-4 h-4 text-slate-400" />
							}
						</button>
					</div>
				</div>

				<div className="text-sm text-slate-400 space-y-1">
					<div><span className="text-slate-500">Name:</span> {created.name}</div>
					<div>
						<span className="text-slate-500">Scopes:</span>{' '}
						{created.scopes.length > 0
							? created.scopes.join(', ')
							: <em className="text-slate-500">none</em>
						}
					</div>
					{created.expires_at && (
						<div><span className="text-slate-500">Expires:</span> {formatDate(created.expires_at)}</div>
					)}
				</div>

				<button
					onClick={onClose}
					className="w-full mt-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
				>
					I've copied the key, close
				</button>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Create dialog
// ---------------------------------------------------------------------------

interface CreateDialogProps {
	onClose: () => void;
	onCreated: (key: ApiKeyCreated) => void;
}

function CreateDialog({ onClose, onCreated }: CreateDialogProps) {
	const [name, setName] = useState('');
	const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
	const [expiryDays, setExpiryDays] = useState<number | null>(90);
	const createMutation = useCreateApiKey();

	function toggleScope(scope: string) {
		setSelectedScopes(prev =>
			prev.includes(scope) ? prev.filter(s => s !== scope) : [...prev, scope]
		);
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;

		const expires_at = expiryDays != null ? addDays(expiryDays) : null;
		const result = await createMutation.mutateAsync({
			name: name.trim(),
			scopes: selectedScopes,
			expires_at,
		});
		onCreated(result);
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
			<div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-5">
				<h2 className="text-lg font-semibold text-white flex items-center gap-2">
					<Key className="w-5 h-5 text-indigo-400" />
					Create API Key
				</h2>

				<form onSubmit={handleSubmit} className="space-y-4">
					{/* Name */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-1">
							Name <span className="text-red-400">*</span>
						</label>
						<input
							type="text"
							value={name}
							onChange={e => setName(e.target.value)}
							placeholder="e.g. Production webhook"
							maxLength={255}
							required
							className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
						/>
					</div>

					{/* Scopes */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-2">Scopes</label>
						<div className="space-y-2">
							{ALL_SCOPES.map(s => (
								<label key={s.value} className="flex items-start gap-2.5 cursor-pointer group">
									<input
										type="checkbox"
										checked={selectedScopes.includes(s.value)}
										onChange={() => toggleScope(s.value)}
										className="mt-0.5 accent-indigo-500"
									/>
									<div>
										<span className="text-sm text-white font-medium">{s.label}</span>
										<p className="text-xs text-slate-500">{s.description}</p>
									</div>
								</label>
							))}
						</div>
					</div>

					{/* Expiry */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-1">Expiry</label>
						<select
							value={expiryDays ?? ''}
							onChange={e => setExpiryDays(e.target.value === '' ? null : Number(e.target.value))}
							className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
						>
							{EXPIRY_OPTIONS.map(opt => (
								<option key={opt.label} value={opt.days ?? ''}>
									{opt.label}
								</option>
							))}
						</select>
					</div>

					{createMutation.isError && (
						<p className="text-sm text-red-400">
							Failed to create API key. Please try again.
						</p>
					)}

					<div className="flex items-center justify-end gap-3 pt-1">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={createMutation.isPending || !name.trim()}
							className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
						>
							{createMutation.isPending ? 'Creating…' : 'Create Key'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Key row
// ---------------------------------------------------------------------------

function KeyRow({ apiKey }: { apiKey: ApiKey }) {
	const revoke = useRevokeApiKey();
	const [confirming, setConfirming] = useState(false);

	async function handleRevoke() {
		if (!confirming) { setConfirming(true); return; }
		await revoke.mutateAsync(apiKey.id);
		setConfirming(false);
	}

	return (
		<tr className="border-b border-slate-800 hover:bg-slate-800/40 transition-colors">
			<td className="px-4 py-3">
				<div className="font-medium text-white text-sm">{apiKey.name}</div>
				<div className="text-xs text-slate-500 mt-0.5">{apiKey.id.slice(0, 8)}…</div>
			</td>
			<td className="px-4 py-3">
				<code className="text-xs text-indigo-300 font-mono bg-slate-800 px-1.5 py-0.5 rounded">
					{apiKey.key_prefix}…
				</code>
			</td>
			<td className="px-4 py-3">
				<div className="flex flex-wrap gap-1">
					{apiKey.scopes.length > 0
						? apiKey.scopes.map(s => <ScopeBadge key={s} scope={s} />)
						: <span className="text-xs text-slate-500 italic">none</span>
					}
				</div>
			</td>
			<td className="px-4 py-3 text-sm text-slate-400">
				{formatDate(apiKey.last_used_at)}
			</td>
			<td className="px-4 py-3 text-sm text-slate-400">
				{apiKey.expires_at ? formatDate(apiKey.expires_at) : <span className="italic">Never</span>}
			</td>
			<td className="px-4 py-3">
				<StatusBadge isActive={apiKey.is_active} expiresAt={apiKey.expires_at} />
			</td>
			<td className="px-4 py-3 text-right">
				{apiKey.is_active && (
					<button
						onClick={handleRevoke}
						disabled={revoke.isPending}
						className={cn(
							'inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50',
							confirming
								? 'bg-red-600 hover:bg-red-500 text-white'
								: 'bg-slate-700 hover:bg-red-900/60 text-slate-300 hover:text-red-300',
						)}
					>
						<Trash2 className="w-3 h-3" />
						{confirming ? 'Confirm revoke' : 'Revoke'}
					</button>
				)}
			</td>
		</tr>
	);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ApiKeys() {
	const { data: keys = [], isLoading, isError } = useApiKeys();
	const [showCreate, setShowCreate] = useState(false);
	const [createdKey, setCreatedKey] = useState<ApiKeyCreated | null>(null);

	function handleCreated(key: ApiKeyCreated) {
		setShowCreate(false);
		setCreatedKey(key);
	}

	return (
		<div className="flex flex-col h-full min-h-0 bg-slate-950 text-white">
			{/* Header */}
			<div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 shrink-0">
				<div className="flex items-center gap-3">
					<Key className="w-6 h-6 text-indigo-400" />
					<div>
						<h1 className="text-xl font-semibold">API Keys</h1>
						<p className="text-sm text-slate-400 mt-0.5">
							Long-lived credentials for external integrations and automation
						</p>
					</div>
				</div>
				<button
					onClick={() => setShowCreate(true)}
					className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
				>
					<Plus className="w-4 h-4" />
					Create API Key
				</button>
			</div>

			{/* Body */}
			<div className="flex-1 overflow-auto px-6 py-4">
				{isLoading && (
					<div className="flex items-center justify-center h-40 text-slate-400">
						Loading API keys…
					</div>
				)}

				{isError && (
					<div className="flex items-center gap-2 text-red-400 text-sm p-4 bg-red-900/20 border border-red-800/30 rounded-lg">
						<AlertTriangle className="w-4 h-4" />
						Failed to load API keys.
					</div>
				)}

				{!isLoading && !isError && keys.length === 0 && (
					<div className="flex flex-col items-center justify-center h-48 text-slate-500 space-y-2">
						<Key className="w-10 h-10 opacity-30" />
						<p className="text-sm">No API keys yet.</p>
						<button
							onClick={() => setShowCreate(true)}
							className="text-indigo-400 hover:text-indigo-300 text-sm underline underline-offset-2"
						>
							Create your first key
						</button>
					</div>
				)}

				{!isLoading && !isError && keys.length > 0 && (
					<div className="overflow-x-auto rounded-xl border border-slate-800">
						<table className="w-full text-left">
							<thead>
								<tr className="border-b border-slate-800 bg-slate-900/60">
									<th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
									<th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Key prefix</th>
									<th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Scopes</th>
									<th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Last used</th>
									<th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Expires</th>
									<th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
									<th className="px-4 py-3" />
								</tr>
							</thead>
							<tbody>
								{keys.map(key => (
									<KeyRow key={key.id} apiKey={key} />
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Modals */}
			{showCreate && (
				<CreateDialog
					onClose={() => setShowCreate(false)}
					onCreated={handleCreated}
				/>
			)}

			{createdKey && (
				<RevealModal
					created={createdKey}
					onClose={() => setCreatedKey(null)}
				/>
			)}
		</div>
	);
}
