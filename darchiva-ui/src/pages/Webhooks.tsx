// (c) Copyright Datacraft, 2026.
import { useState } from 'react';
import {
	AlertCircle,
	ChevronDown,
	ChevronUp,
	CheckCircle2,
	Copy,
	Pencil,
	Plus,
	Power,
	RefreshCw,
	Trash2,
	Webhook,
	XCircle,
	Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import {
	useWebhooks,
	useCreateWebhook,
	useUpdateWebhook,
	useDeleteWebhook,
	useTestWebhook,
	useWebhookDeliveries,
	useRetryDelivery,
	type Webhook as WebhookType,
	type WebhookDelivery,
} from '@/features/webhooks/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ALL_EVENTS = [
	{ value: 'document.created', label: 'Document Created' },
	{ value: 'document.classified', label: 'Document Classified' },
	{ value: 'document.ocr_complete', label: 'OCR Complete' },
	{ value: 'scan.batch_complete', label: 'Scan Batch Complete' },
	{ value: 'routing.rule_applied', label: 'Routing Rule Applied' },
	{ value: 'document.expiring', label: 'Document Expiring' },
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
// Delivery status badge
// ---------------------------------------------------------------------------

function deliveryStatusBadge(status: WebhookDelivery['status']) {
	const map = {
		delivered: 'bg-emerald-900/40 text-emerald-400 border-emerald-700/40',
		failed: 'bg-red-900/40 text-red-400 border-red-700/40',
		pending: 'bg-amber-900/40 text-amber-400 border-amber-700/40',
	} as const;
	const Icon = {
		delivered: CheckCircle2,
		failed: XCircle,
		pending: AlertCircle,
	}[status];
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border',
				map[status] ?? map.pending,
			)}
		>
			<Icon className="w-3 h-3" />
			{status}
		</span>
	);
}

function activeStatusBadge(isActive: boolean) {
	return (
		<Badge
			variant="outline"
			className={cn(
				'gap-1 border text-xs',
				isActive
					? 'border-emerald-700/40 bg-emerald-900/40 text-emerald-400'
					: 'border-slate-700/50 bg-slate-800/70 text-slate-400',
			)}
		>
			<span
				className={cn(
					'h-1.5 w-1.5 rounded-full',
					isActive ? 'bg-emerald-400' : 'bg-slate-500',
				)}
			/>
			{isActive ? 'Active' : 'Inactive'}
		</Badge>
	);
}

// ---------------------------------------------------------------------------
// Delivery log sub-component
// ---------------------------------------------------------------------------

function DeliveryLog({ webhookId }: { webhookId: string }) {
	const { data, isLoading } = useWebhookDeliveries(webhookId);
	const retry = useRetryDelivery();

	if (isLoading)
		return <p className="text-xs text-slate-500 py-2">Loading deliveries…</p>;
	if (!data?.length)
		return <p className="text-xs text-slate-500 py-2">No deliveries yet.</p>;

	return (
		<div className="mt-3 overflow-x-auto">
			<table className="w-full text-xs">
				<thead>
					<tr className="text-slate-600 uppercase tracking-wider border-b border-slate-800">
						<th className="text-left pb-1.5 pr-3 font-medium">Event</th>
						<th className="text-left pb-1.5 pr-3 font-medium">Status</th>
						<th className="text-left pb-1.5 pr-3 font-medium">Attempts</th>
						<th className="text-left pb-1.5 pr-3 font-medium">HTTP</th>
						<th className="text-left pb-1.5 pr-3 font-medium">Time</th>
						<th className="pb-1.5" />
					</tr>
				</thead>
				<tbody>
					{data.map((d) => (
						<tr
							key={d.id}
							className="border-b border-slate-800/40 last:border-0 hover:bg-slate-800/20 transition-colors"
						>
							<td className="py-1.5 pr-3 font-mono text-slate-300 truncate max-w-[10rem]">
								{d.event_type}
							</td>
							<td className="py-1.5 pr-3">
								{deliveryStatusBadge(d.status ?? 'pending')}
							</td>
							<td className="py-1.5 pr-3 text-slate-400 tabular-nums">
								{d.attempts ?? 0}
							</td>
							<td className="py-1.5 pr-3">
								{statusBadge(d.response_status)}
							</td>
							<td className="py-1.5 pr-3 text-slate-500 whitespace-nowrap">
								{new Date(
									d.delivered_at ?? d.last_attempt_at ?? d.created_at,
								).toLocaleString()}
							</td>
							<td className="py-1.5 text-right">
								{d.status !== 'delivered' && (
									<button
										onClick={() =>
											retry.mutate({ webhookId, deliveryId: d.id })
										}
										disabled={retry.isPending}
										title="Retry delivery"
										className="p-1 rounded text-slate-500 hover:text-brass-400 hover:bg-slate-800 transition-colors disabled:opacity-40"
									>
										<RefreshCw
											className={cn(
												'w-3.5 h-3.5',
												retry.isPending && 'animate-spin',
											)}
										/>
									</button>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Edit webhook dialog
// ---------------------------------------------------------------------------

function EditWebhookDialog({ webhook }: { webhook: WebhookType }) {
	const [open, setOpen] = useState(false);
	const [url, setUrl] = useState(webhook.url);
	const [events, setEvents] = useState<string[]>(webhook.events);
	const update = useUpdateWebhook();

	function handleOpenChange(nextOpen: boolean) {
		if (nextOpen) {
			setUrl(webhook.url);
			setEvents(webhook.events);
		}
		setOpen(nextOpen);
	}

	function toggleEvent(e: string) {
		setEvents((prev) =>
			prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e],
		);
	}

	async function handleSubmit(ev: React.FormEvent) {
		ev.preventDefault();
		if (!url || events.length === 0) return;
		await update.mutateAsync({ id: webhook.id, url, events });
		setOpen(false);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<button
					type="button"
					title="Edit webhook"
					className="p-1.5 rounded text-slate-400 hover:text-brass-400 hover:bg-slate-800 transition-colors"
				>
					<Pencil className="w-4 h-4" />
				</button>
			</DialogTrigger>
			<DialogContent className="border-slate-800 bg-slate-950 text-slate-100 sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Edit Webhook</DialogTitle>
					<DialogDescription>
						Update the endpoint URL and subscribed document events.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
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

					<div>
						<label className="block text-xs text-slate-400 mb-2">
							Events to subscribe
						</label>
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

					{update.isError && (
						<div className="flex items-center gap-2 text-xs text-red-400">
							<AlertCircle className="w-3.5 h-3.5" />
							Failed to update webhook. Check the URL and try again.
						</div>
					)}

					<DialogFooter className="gap-2 sm:gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={update.isPending}
							className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={update.isPending || events.length === 0}
							className="bg-brass-500 text-slate-900 hover:bg-brass-400"
						>
							{update.isPending ? 'Saving…' : 'Save Changes'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Webhook row
// ---------------------------------------------------------------------------

function WebhookRow({ wh }: { wh: WebhookType }) {
	const [expanded, setExpanded] = useState(false);
	const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
	const deleteWh = useDeleteWebhook();
	const testWh = useTestWebhook();
	const updateWh = useUpdateWebhook();

	function toggleActive() {
		updateWh.mutate({ id: wh.id, is_active: !wh.is_active });
	}

	return (
		<>
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
					<div className="flex flex-wrap items-center gap-2">
						<p className="min-w-0 flex-1 text-sm font-mono text-slate-200 truncate" title={wh.url}>
							{wh.url}
						</p>
						{activeStatusBadge(wh.is_active)}
					</div>
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
					<EditWebhookDialog webhook={wh} />
					<button
						onClick={toggleActive}
						disabled={updateWh.isPending}
						title={wh.is_active ? 'Disable webhook' : 'Enable webhook'}
						className={cn(
							'p-1.5 rounded transition-colors disabled:opacity-50',
							wh.is_active
								? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-400/10'
								: 'text-slate-500 hover:text-slate-200 hover:bg-slate-800',
						)}
					>
						<Power className="w-4 h-4" />
					</button>
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
							setConfirmDialog({
								message: 'Delete this webhook? This action cannot be undone.',
								onConfirm: () => deleteWh.mutate(wh.id),
							})
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
			<AlertDialog open={!!confirmDialog} onOpenChange={(o) => { if (!o) setConfirmDialog(null); }}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm</AlertDialogTitle>
						<AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								confirmDialog?.onConfirm();
								setConfirmDialog(null);
							}}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
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
