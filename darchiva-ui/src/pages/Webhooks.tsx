// (c) Copyright Datacraft, 2026.
import { useState } from 'react';
import {
	AlertCircle,
	ChevronDown,
	ChevronUp,
	CheckCircle2,
	Copy,
	Plus,
	RefreshCw,
	Trash2,
	Webhook,
	XCircle,
	Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	useWebhooks,
	useCreateWebhook,
	useDeleteWebhook,
	useTestWebhook,
	useWebhookDeliveries,
	type Webhook as WebhookType,
} from '@/features/webhooks/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_EVENTS = [
	{ value: 'document.created', label: 'Document Created' },
	{ value: 'document.ocr_complete', label: 'OCR Complete' },
	{ value: 'batch.complete', label: 'Batch Complete' },
	{ value: 'exception.raised', label: 'Exception Raised' },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function statusBadge(status: number | null) {
	if (status === null) return <span className="text-slate-500 text-xs">—</span>;
	const ok = status >= 200 && status < 300;
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
				ok
					? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
					: 'bg-red-900/40 text-red-400 border border-red-700/40',
			)}
		>
			{ok ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
			{status}
		</span>
	);
}

function generateSecret(len = 32): string {
	const arr = crypto.getRandomValues(new Uint8Array(len));
	return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------------------
// Delivery log sub-component
// ---------------------------------------------------------------------------

function DeliveryLog({ webhookId }: { webhookId: string }) {
	const { data, isLoading } = useWebhookDeliveries(webhookId);

	if (isLoading)
		return <p className="text-xs text-slate-500 py-2">Loading deliveries…</p>;
	if (!data?.length)
		return <p className="text-xs text-slate-500 py-2">No deliveries yet.</p>;

	return (
		<div className="mt-3 space-y-1">
			{data.map((d) => (
				<div
					key={d.id}
					className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-800/50 last:border-0"
				>
					<span className="text-slate-400 font-mono w-36 truncate">{d.event_type}</span>
					{statusBadge(d.response_status)}
					<span className="text-slate-500 ml-auto">
						{d.delivered_at
							? new Date(d.delivered_at).toLocaleString()
							: new Date(d.created_at).toLocaleString()}
					</span>
				</div>
			))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Webhook row
// ---------------------------------------------------------------------------

function WebhookRow({ wh }: { wh: WebhookType }) {
	const [expanded, setExpanded] = useState(false);
	const deleteWh = useDeleteWebhook();
	const testWh = useTestWebhook();

	return (
		<div className="glass-card overflow-hidden">
			<div className="flex items-start gap-4 p-4">
				{/* Status dot */}
				<div
					className={cn(
						'mt-1 w-2 h-2 rounded-full flex-shrink-0',
						wh.is_active ? 'bg-emerald-400' : 'bg-slate-600',
					)}
				/>

				{/* URL + events */}
				<div className="flex-1 min-w-0">
					<p className="text-sm font-mono text-slate-200 truncate" title={wh.url}>
						{wh.url}
					</p>
					<div className="flex flex-wrap gap-1 mt-1.5">
						{wh.events.map((e) => (
							<span
								key={e}
								className="text-2xs px-1.5 py-0.5 rounded bg-brass-500/10 text-brass-400 border border-brass-700/30"
							>
								{e}
							</span>
						))}
					</div>
				</div>

				{/* Last delivery */}
				<div className="text-right flex-shrink-0 hidden sm:block">
					<p className="text-xs text-slate-500">Last delivery</p>
					<div className="mt-0.5">{statusBadge(wh.last_delivery_status)}</div>
					{wh.last_delivery_at && (
						<p className="text-2xs text-slate-600 mt-0.5">
							{new Date(wh.last_delivery_at).toLocaleDateString()}
						</p>
					)}
				</div>

				{/* Actions */}
				<div className="flex items-center gap-2 flex-shrink-0">
					<button
						onClick={() => testWh.mutate(wh.id)}
						disabled={testWh.isPending}
						title="Send test ping"
						className="p-1.5 rounded text-slate-400 hover:text-brass-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
					>
						<Zap className="w-4 h-4" />
					</button>
					<button
						onClick={() =>
							deleteWh.mutate(wh.id)
						}
						disabled={deleteWh.isPending}
						title="Delete webhook"
						className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
					>
						<Trash2 className="w-4 h-4" />
					</button>
					<button
						onClick={() => setExpanded((x) => !x)}
						title="View recent deliveries"
						className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
					>
						{expanded ? (
							<ChevronUp className="w-4 h-4" />
						) : (
							<ChevronDown className="w-4 h-4" />
						)}
					</button>
				</div>
			</div>

			{expanded && (
				<div className="px-4 pb-4 border-t border-slate-800/50 pt-3">
					<p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
						Recent deliveries
					</p>
					<DeliveryLog webhookId={wh.id} />
				</div>
			)}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Add webhook form
// ---------------------------------------------------------------------------

function AddWebhookForm({ onCancel }: { onCancel: () => void }) {
	const [url, setUrl] = useState('');
	const [events, setEvents] = useState<string[]>([]);
	const [secret, setSecret] = useState('');
	const [copied, setCopied] = useState(false);
	const create = useCreateWebhook();

	function toggleEvent(e: string) {
		setEvents((prev) =>
			prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
		);
	}

	function handleGenerate() {
		setSecret(generateSecret());
	}

	function handleCopy() {
		navigator.clipboard.writeText(secret);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	async function handleSubmit(ev: React.FormEvent) {
		ev.preventDefault();
		if (!url || events.length === 0 || !secret) return;
		await create.mutateAsync({ url, events, secret });
		onCancel();
	}

	return (
		<form onSubmit={handleSubmit} className="glass-card p-5 space-y-4">
			<h3 className="text-sm font-semibold text-slate-200">Add Webhook</h3>

			{/* URL */}
			<div>
				<label className="block text-xs text-slate-400 mb-1">Endpoint URL</label>
				<input
					type="url"
					value={url}
					onChange={(e) => setUrl(e.target.value)}
					placeholder="https://example.com/webhook"
					required
					className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brass-500"
				/>
			</div>

			{/* Events */}
			<div>
				<label className="block text-xs text-slate-400 mb-2">Events to subscribe</label>
				<div className="grid grid-cols-2 gap-2">
					{ALL_EVENTS.map(({ value, label }) => (
						<label
							key={value}
							className={cn(
								'flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm transition-colors',
								events.includes(value)
									? 'border-brass-600/60 bg-brass-500/10 text-brass-300'
									: 'border-slate-700 text-slate-400 hover:border-slate-600',
							)}
						>
							<input
								type="checkbox"
								className="accent-brass-500"
								checked={events.includes(value)}
								onChange={() => toggleEvent(value)}
							/>
							{label}
						</label>
					))}
				</div>
			</div>

			{/* Secret */}
			<div>
				<label className="block text-xs text-slate-400 mb-1">Signing Secret</label>
				<div className="flex gap-2">
					<input
						type="text"
						value={secret}
						onChange={(e) => setSecret(e.target.value)}
						placeholder="min 8 chars"
						required
						minLength={8}
						className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-brass-500"
					/>
					<button
						type="button"
						onClick={handleGenerate}
						title="Generate random secret"
						className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
					>
						<RefreshCw className="w-4 h-4" />
					</button>
					<button
						type="button"
						onClick={handleCopy}
						title="Copy secret"
						className="px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
					>
						{copied ? (
							<CheckCircle2 className="w-4 h-4 text-emerald-400" />
						) : (
							<Copy className="w-4 h-4" />
						)}
					</button>
				</div>
				<p className="mt-1 text-2xs text-slate-600">
					Used to compute HMAC-SHA256 signature in X-Webhook-Signature header.
				</p>
			</div>

			{create.isError && (
				<div className="flex items-center gap-2 text-xs text-red-400">
					<AlertCircle className="w-3.5 h-3.5" />
					Failed to create webhook. Check the URL and try again.
				</div>
			)}

			<div className="flex gap-3 pt-1">
				<button
					type="submit"
					disabled={create.isPending || events.length === 0}
					className="px-4 py-2 rounded-lg bg-brass-500 text-slate-900 text-sm font-semibold hover:bg-brass-400 disabled:opacity-50 transition-colors"
				>
					{create.isPending ? 'Saving…' : 'Create Webhook'}
				</button>
				<button
					type="button"
					onClick={onCancel}
					className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm hover:bg-slate-700 transition-colors"
				>
					Cancel
				</button>
			</div>
		</form>
	);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function Webhooks() {
	const { data: webhooks, isLoading, isError } = useWebhooks();
	const [showForm, setShowForm] = useState(false);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Outbound Webhooks
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Deliver signed document events to external systems via HTTP POST
					</p>
				</div>
				{!showForm && (
					<button
						onClick={() => setShowForm(true)}
						className="flex items-center gap-2 px-4 py-2 rounded-lg bg-brass-500 text-slate-900 text-sm font-semibold hover:bg-brass-400 transition-colors"
					>
						<Plus className="w-4 h-4" />
						Add Webhook
					</button>
				)}
			</div>

			{/* Add form */}
			{showForm && <AddWebhookForm onCancel={() => setShowForm(false)} />}

			{/* Event legend */}
			<div className="glass-card p-4">
				<p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
					Available Events
				</p>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					{ALL_EVENTS.map(({ value, label }) => (
						<div key={value} className="space-y-0.5">
							<p className="text-xs font-mono text-brass-400">{value}</p>
							<p className="text-xs text-slate-500">{label}</p>
						</div>
					))}
				</div>
			</div>

			{/* List */}
			{isLoading && (
				<div className="flex items-center gap-2 text-sm text-slate-500">
					<RefreshCw className="w-4 h-4 animate-spin" />
					Loading webhooks…
				</div>
			)}

			{isError && (
				<div className="flex items-center gap-2 text-sm text-red-400">
					<AlertCircle className="w-4 h-4" />
					Failed to load webhooks.
				</div>
			)}

			{!isLoading && !isError && webhooks?.length === 0 && (
				<div className="glass-card p-12 text-center">
					<Webhook className="w-10 h-10 text-slate-600 mx-auto mb-3" />
					<p className="text-slate-400 font-medium">No webhooks configured</p>
					<p className="text-sm text-slate-600 mt-1">
						Add one above to start receiving document events.
					</p>
				</div>
			)}

			{webhooks && webhooks.length > 0 && (
				<div className="space-y-3">
					{webhooks.map((wh) => (
						<WebhookRow key={wh.id} wh={wh} />
					))}
				</div>
			)}
		</div>
	);
}

export default Webhooks;
