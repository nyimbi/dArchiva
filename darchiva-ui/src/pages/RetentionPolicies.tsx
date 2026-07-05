// (c) Copyright Datacraft, 2026.
import { useState } from 'react';
import {
	AlertCircle,
	CheckCircle2,
	Clock,
	Edit2,
	Eye,
	Loader2,
	Play,
	Plus,
	Trash2,
	XCircle,
} from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import {
	useRetentionPolicies,
	useCreatePolicy,
	useUpdatePolicy,
	useDeletePolicy,
	useRunPolicy,
	useDryRunRetentionPolicy,
	type RetentionPolicy,
	type CreateRetentionPolicyInput,
	type RetentionDryRunDocument,
	type RetentionDryRunResult,
} from '@/features/retention/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const POLICY_TYPE_LABELS: Record<string, string> = {
	archive: 'Archive',
	delete: 'Delete',
	move: 'Move to folder',
};

const POLICY_TYPE_COLORS: Record<string, string> = {
	archive: 'bg-amber-900/40 text-amber-300 border border-amber-700/40',
	delete: 'bg-red-900/40 text-red-400 border border-red-700/40',
	move: 'bg-blue-900/40 text-blue-300 border border-blue-700/40',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(iso: string | null): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function actionVerb(type: RetentionPolicy['policy_type']): string {
	switch (type) {
		case 'archive':
			return 'archived';
		case 'delete':
			return 'deleted';
		case 'move':
			return 'moved';
		default:
			return 'processed';
	}
}

function dryRunCount(result: RetentionDryRunResult | null): number {
	if (!result) return 0;
	return result.count ?? result.affectedCount ?? result.docsProcessed ?? dryRunDocuments(result).length;
}

function dryRunDocuments(result: RetentionDryRunResult | null): RetentionDryRunDocument[] {
	if (!result) return [];
	return result.affectedDocuments ?? result.affectedDocs ?? result.documents ?? [];
}

function dryRunDocumentTitle(doc: RetentionDryRunDocument): string {
	return doc.title ?? doc.documentTitle ?? doc.name ?? doc.id ?? 'Untitled document';
}

function dryRunDocumentPath(doc: RetentionDryRunDocument): string {
	return doc.path ?? doc.fullPath ?? doc.folderPath ?? 'No path available';
}

function PolicyTypeBadge({ type }: { type: string }) {
	return (
		<span
			className={cn(
				'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
				POLICY_TYPE_COLORS[type] ?? 'bg-slate-700 text-slate-300',
			)}
		>
			{POLICY_TYPE_LABELS[type] ?? type}
		</span>
	);
}

function StatusBadge({ active }: { active: boolean }) {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
				active
					? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/40'
					: 'bg-slate-700 text-slate-400 border border-slate-600',
			)}
		>
			{active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
			{active ? 'Active' : 'Inactive'}
		</span>
	);
}

// ---------------------------------------------------------------------------
// Preview dialog
// ---------------------------------------------------------------------------

function PreviewDialog({
	policy,
	result,
	isLoading,
	error,
	isRunning,
	onRunNow,
	onClose,
}: {
	policy: RetentionPolicy;
	result: RetentionDryRunResult | null;
	isLoading: boolean;
	error: string | null;
	isRunning: boolean;
	onRunNow: () => void;
	onClose: () => void;
}) {
	const count = dryRunCount(result);
	const documents = dryRunDocuments(result).slice(0, 10);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg">
				<div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
					<h2 className="text-base font-semibold text-white">Preview: {policy.name}</h2>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-white transition-colors"
					>
						<XCircle className="w-5 h-5" />
					</button>
				</div>

				<div className="px-6 py-5 space-y-4">
					{isLoading ? (
						<div className="flex items-center justify-center py-10 text-slate-400 gap-2">
							<Loader2 className="w-5 h-5 animate-spin" />
							<span>Loading preview…</span>
						</div>
					) : error ? (
						<div className="flex items-center gap-2 text-red-400 text-sm">
							<AlertCircle className="w-4 h-4 flex-shrink-0" />
							{error}
						</div>
					) : count === 0 ? (
						<p className="text-sm text-slate-300">No documents affected</p>
					) : (
						<>
							<p className="text-sm text-slate-300">
								<span className="font-semibold text-white">{count.toLocaleString()}</span>{' '}
								document{count === 1 ? '' : 's'} would be {actionVerb(policy.policy_type)}.
							</p>
							{documents.length > 0 && (
								<div className="border border-slate-700 rounded-lg overflow-hidden">
									<ul className="divide-y divide-slate-800">
										{documents.map((doc, index) => (
											<li key={doc.id ?? `${dryRunDocumentTitle(doc)}-${index}`} className="px-3 py-2">
												<p className="text-sm font-medium text-slate-100 truncate">
													{dryRunDocumentTitle(doc)}
												</p>
												<p className="text-xs text-slate-500 truncate">
													{dryRunDocumentPath(doc)}
												</p>
											</li>
										))}
									</ul>
								</div>
							)}
						</>
					)}

					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
						>
							Close
						</button>
						<button
							type="button"
							onClick={onRunNow}
							disabled={isLoading || isRunning}
							className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
						>
							{isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
							Run Now
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Stat card
// ---------------------------------------------------------------------------

function StatCard({
	label,
	value,
	sub,
	icon: Icon,
	color,
}: {
	label: string;
	value: string | number;
	sub?: string;
	icon: React.ElementType;
	color: string;
}) {
	return (
		<div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex items-center gap-4">
			<div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
				<Icon className="w-5 h-5" />
			</div>
			<div className="min-w-0">
				<p className="text-2xl font-semibold text-white leading-none">{value}</p>
				<p className="text-xs text-slate-400 mt-1">{label}</p>
				{sub && <p className="text-xs text-slate-600 mt-0.5 truncate">{sub}</p>}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Form dialog
// ---------------------------------------------------------------------------

interface PolicyFormState {
	name: string;
	description: string;
	policy_type: 'archive' | 'delete' | 'move';
	after_days: number;
	scope: 'all' | 'project' | 'doctype';
	applies_to_project_id: string;
	applies_to_document_type: string;
	destination_folder_id: string;
	is_active: boolean;
}

const defaultForm = (): PolicyFormState => ({
	name: '',
	description: '',
	policy_type: 'archive',
	after_days: 365,
	scope: 'all',
	applies_to_project_id: '',
	applies_to_document_type: '',
	destination_folder_id: '',
	is_active: true,
});

function policyToForm(p: RetentionPolicy): PolicyFormState {
	return {
		name: p.name,
		description: p.description ?? '',
		policy_type: p.policy_type,
		after_days: p.after_days,
		scope: p.applies_to_project_id
			? 'project'
			: p.applies_to_document_type
			? 'doctype'
			: 'all',
		applies_to_project_id: p.applies_to_project_id ?? '',
		applies_to_document_type: p.applies_to_document_type ?? '',
		destination_folder_id: p.destination_folder_id ?? '',
		is_active: p.is_active,
	};
}

interface PolicyDialogProps {
	editing: RetentionPolicy | null;
	onClose: () => void;
}

function PolicyDialog({ editing, onClose }: PolicyDialogProps) {
	const [form, setForm] = useState<PolicyFormState>(
		editing ? policyToForm(editing) : defaultForm(),
	);
	const [error, setError] = useState<string | null>(null);

	const createPolicy = useCreatePolicy();
	const updatePolicy = useUpdatePolicy();
	const isPending = createPolicy.isPending || updatePolicy.isPending;

	function set<K extends keyof PolicyFormState>(key: K, value: PolicyFormState[K]) {
		setForm((prev) => ({ ...prev, [key]: value }));
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError(null);

		if (!form.name.trim()) {
			setError('Name is required.');
			return;
		}
		if (form.after_days < 1) {
			setError('After days must be at least 1.');
			return;
		}
		if (form.policy_type === 'move' && !form.destination_folder_id.trim()) {
			setError('Destination folder ID is required for "Move" policy type.');
			return;
		}

		const payload: CreateRetentionPolicyInput = {
			name: form.name.trim(),
			description: form.description.trim() || undefined,
			policy_type: form.policy_type,
			after_days: form.after_days,
			applies_to_project_id:
				form.scope === 'project' ? form.applies_to_project_id.trim() || undefined : undefined,
			applies_to_document_type:
				form.scope === 'doctype'
					? form.applies_to_document_type.trim() || undefined
					: undefined,
			destination_folder_id:
				form.policy_type === 'move' ? form.destination_folder_id.trim() || undefined : undefined,
			is_active: form.is_active,
		};

		try {
			if (editing) {
				await updatePolicy.mutateAsync({ id: editing.id, ...payload });
			} else {
				await createPolicy.mutateAsync(payload);
			}
			onClose();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Unknown error';
			setError(msg);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg">
				<div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
					<h2 className="text-base font-semibold text-white">
						{editing ? 'Edit Policy' : 'New Retention Policy'}
					</h2>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-white transition-colors"
					>
						<XCircle className="w-5 h-5" />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
					{/* Name */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-1">Name</label>
						<input
							type="text"
							value={form.name}
							onChange={(e) => set('name', e.target.value)}
							placeholder="e.g. Archive invoices after 3 years"
							className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
						/>
					</div>

					{/* Description */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-1">
							Description <span className="text-slate-500">(optional)</span>
						</label>
						<textarea
							value={form.description}
							onChange={(e) => set('description', e.target.value)}
							rows={2}
							className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
						/>
					</div>

					{/* Policy type + after_days row */}
					<div className="grid grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1">
								Action
							</label>
							<select
								value={form.policy_type}
								onChange={(e) =>
									set('policy_type', e.target.value as PolicyFormState['policy_type'])
								}
								className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
							>
								<option value="archive">Archive</option>
								<option value="delete">Delete</option>
								<option value="move">Move to folder</option>
							</select>
						</div>

						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1">
								After days
							</label>
							<input
								type="number"
								min={1}
								value={form.after_days}
								onChange={(e) => set('after_days', parseInt(e.target.value, 10) || 1)}
								className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
							/>
						</div>
					</div>

					{/* Destination folder — only for "move" */}
					{form.policy_type === 'move' && (
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1">
								Destination folder ID
							</label>
							<input
								type="text"
								value={form.destination_folder_id}
								onChange={(e) => set('destination_folder_id', e.target.value)}
								placeholder="Folder node UUID"
								className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
							/>
						</div>
					)}

					{/* Scope */}
					<div>
						<label className="block text-sm font-medium text-slate-300 mb-1">
							Applies to
						</label>
						<select
							value={form.scope}
							onChange={(e) =>
								set('scope', e.target.value as PolicyFormState['scope'])
							}
							className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
						>
							<option value="all">All documents</option>
							<option value="project">Specific project</option>
							<option value="doctype">Specific document type</option>
						</select>
					</div>

					{form.scope === 'project' && (
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1">
								Project ID
							</label>
							<input
								type="text"
								value={form.applies_to_project_id}
								onChange={(e) => set('applies_to_project_id', e.target.value)}
								placeholder="Scanning project UUID"
								className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
							/>
						</div>
					)}

					{form.scope === 'doctype' && (
						<div>
							<label className="block text-sm font-medium text-slate-300 mb-1">
								Document type name
							</label>
							<input
								type="text"
								value={form.applies_to_document_type}
								onChange={(e) => set('applies_to_document_type', e.target.value)}
								placeholder="e.g. Invoice"
								className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
							/>
						</div>
					)}

					{/* Active toggle */}
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => set('is_active', !form.is_active)}
							className={cn(
								'relative inline-flex h-5 w-9 rounded-full transition-colors focus:outline-none',
								form.is_active ? 'bg-indigo-600' : 'bg-slate-600',
							)}
						>
							<span
								className={cn(
									'absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
									form.is_active ? 'translate-x-4' : 'translate-x-0',
								)}
							/>
						</button>
						<span className="text-sm text-slate-300">
							{form.is_active ? 'Active' : 'Inactive'}
						</span>
					</div>

					{error && (
						<div className="flex items-center gap-2 text-red-400 text-sm">
							<AlertCircle className="w-4 h-4 flex-shrink-0" />
							{error}
						</div>
					)}

					<div className="flex justify-end gap-3 pt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isPending}
							className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
						>
							{isPending && <Loader2 className="w-4 h-4 animate-spin" />}
							{editing ? 'Save changes' : 'Create policy'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Delete confirm dialog
// ---------------------------------------------------------------------------

function DeleteConfirm({
	policy,
	onConfirm,
	onCancel,
}: {
	policy: RetentionPolicy;
	onConfirm: () => void;
	onCancel: () => void;
}) {
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
			<div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
				<div className="flex items-center gap-3">
					<AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
					<h3 className="text-base font-semibold text-white">Delete policy</h3>
				</div>
				<p className="text-sm text-slate-300">
					Delete <span className="font-medium text-white">{policy.name}</span>? This action
					cannot be undone.
				</p>
				<div className="flex justify-end gap-3">
					<button
						onClick={onCancel}
						className="px-4 py-2 text-sm text-slate-300 hover:text-white transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={onConfirm}
						className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
					>
						Delete
					</button>
				</div>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function RetentionPolicies() {
	const { data: policies, isLoading, isError } = useRetentionPolicies();
	const deletePolicy = useDeletePolicy();
	const runPolicy = useRunPolicy();
	const dryRunPolicy = useDryRunRetentionPolicy();

	const [showDialog, setShowDialog] = useState(false);
	const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(null);
	const [deletingPolicy, setDeletingPolicy] = useState<RetentionPolicy | null>(null);
	const [previewPolicy, setPreviewPolicy] = useState<RetentionPolicy | null>(null);
	const [previewResult, setPreviewResult] = useState<RetentionDryRunResult | null>(null);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [runningId, setRunningId] = useState<string | null>(null);
	const [runFeedback, setRunFeedback] = useState<Record<string, string>>({});

	function openCreate() {
		setEditingPolicy(null);
		setShowDialog(true);
	}

	function openEdit(p: RetentionPolicy) {
		setEditingPolicy(p);
		setShowDialog(true);
	}

	function closeDialog() {
		setShowDialog(false);
		setEditingPolicy(null);
	}

	async function handleDelete(p: RetentionPolicy) {
		await deletePolicy.mutateAsync(p.id);
		setDeletingPolicy(null);
	}

	async function handleRunNow(p: RetentionPolicy) {
		setRunningId(p.id);
		try {
			await runPolicy.mutateAsync({ id: p.id });
			setRunFeedback((prev) => ({ ...prev, [p.id]: 'Sweep queued' }));
			setTimeout(
				() => setRunFeedback((prev) => ({ ...prev, [p.id]: '' })),
				3000,
			);
		} finally {
			setRunningId(null);
		}
	}

	async function handlePreview(p: RetentionPolicy) {
		setPreviewPolicy(p);
		setPreviewResult(null);
		setPreviewError(null);
		try {
			const result = await dryRunPolicy.mutateAsync(p.id);
			setPreviewResult(result);
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Unknown error';
			setPreviewError(msg);
		}
	}

	async function handlePreviewRunNow(p: RetentionPolicy) {
		await handleRunNow(p);
		setPreviewPolicy(null);
	}

	return (
		<div className="p-6 max-w-6xl mx-auto space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<Clock className="w-6 h-6 text-indigo-400" />
					<div>
						<h1 className="text-xl font-semibold text-white">Retention Policies</h1>
						<p className="text-sm text-slate-400 mt-0.5">
							Automate archive, delete, and move actions after a set number of days.
						</p>
					</div>
				</div>
				<button
					onClick={openCreate}
					className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
				>
					<Plus className="w-4 h-4" />
					New Policy
				</button>
			</div>

			{/* Stats cards */}
			{!isLoading && !isError && policies && (
				<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
					<StatCard
						label="Total Policies"
						value={policies.length}
						icon={Clock}
						color="bg-indigo-500/20 text-indigo-400"
					/>
					<StatCard
						label="Active"
						value={policies.filter((p) => p.is_active).length}
						sub={`${policies.filter((p) => !p.is_active).length} inactive`}
						icon={CheckCircle2}
						color="bg-emerald-500/20 text-emerald-400"
					/>
					<StatCard
						label="Docs Processed"
						value={policies.reduce((s, p) => s + p.docs_processed, 0).toLocaleString()}
						icon={Play}
						color="bg-amber-500/20 text-amber-400"
					/>
					<StatCard
						label="Last Sweep Ran"
						value={(() => {
							const dates = policies.map((p) => p.last_run_at).filter(Boolean) as string[];
							if (!dates.length) return '—';
							return formatDate(dates.reduce((a, b) => (a > b ? a : b)));
						})()}
						icon={AlertCircle}
						color="bg-slate-500/20 text-slate-400"
					/>
				</div>
			)}

			{/* Body */}
			{isLoading && (
				<div className="flex items-center justify-center py-16 text-slate-400 gap-2">
					<Loader2 className="w-5 h-5 animate-spin" />
					<span>Loading policies…</span>
				</div>
			)}

			{isError && (
				<div className="flex items-center gap-2 text-red-400 py-8">
					<AlertCircle className="w-5 h-5" />
					Failed to load retention policies.
				</div>
			)}

			{!isLoading && !isError && policies?.length === 0 && (
				<div className="text-center py-16 text-slate-500">
					<EmptyState
						icon={Clock}
						title="No retention policies"
						description="Add a retention policy to automatically manage document lifecycle."
					/>
				</div>
			)}

			{!isLoading && !isError && policies && policies.length > 0 && (
				<div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-slate-700 text-left text-xs text-slate-400 uppercase tracking-wider">
								<th className="px-4 py-3 font-medium">Name</th>
								<th className="px-4 py-3 font-medium">Type</th>
								<th className="px-4 py-3 font-medium">Trigger</th>
								<th className="px-4 py-3 font-medium">Applies to</th>
								<th className="px-4 py-3 font-medium">Status</th>
								<th className="px-4 py-3 font-medium">Last run</th>
								<th className="px-4 py-3 font-medium text-right">Docs processed</th>
								<th className="px-4 py-3 font-medium text-right">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-800">
							{policies.map((p) => (
								<tr key={p.id} className="hover:bg-slate-800/50 transition-colors">
									<td className="px-4 py-3">
										<div className="font-medium text-white">{p.name}</div>
										{p.description && (
											<div className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">
												{p.description}
											</div>
										)}
									</td>
									<td className="px-4 py-3">
										<PolicyTypeBadge type={p.policy_type} />
									</td>
									<td className="px-4 py-3 text-slate-300">
										After {p.after_days} day{p.after_days !== 1 ? 's' : ''}
									</td>
									<td className="px-4 py-3 text-slate-400 text-xs">
										{p.applies_to_project_id ? (
											<span>
												Project{' '}
												<span className="font-mono text-slate-300">
													{p.applies_to_project_id.slice(0, 8)}…
												</span>
											</span>
										) : p.applies_to_document_type ? (
											<span>Type: {p.applies_to_document_type}</span>
										) : (
											<span className="text-slate-500">All documents</span>
										)}
									</td>
									<td className="px-4 py-3">
										<StatusBadge active={p.is_active} />
									</td>
									<td className="px-4 py-3 text-slate-400 text-xs">
										{formatDate(p.last_run_at)}
									</td>
									<td className="px-4 py-3 text-right text-slate-300">
										{p.docs_processed.toLocaleString()}
									</td>
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-1">
											{runFeedback[p.id] && (
												<span className="text-xs text-emerald-400 mr-2">
													{runFeedback[p.id]}
												</span>
											)}
											<button
												title="Preview"
												onClick={() => handlePreview(p)}
												disabled={dryRunPolicy.isPending && previewPolicy?.id === p.id}
												className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40"
											>
												{dryRunPolicy.isPending && previewPolicy?.id === p.id ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<Eye className="w-4 h-4" />
												)}
											</button>
											<button
												title="Run now"
												onClick={() => handleRunNow(p)}
												disabled={runningId === p.id}
												className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-40"
											>
												{runningId === p.id ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<Play className="w-4 h-4" />
												)}
											</button>
											<button
												title="Edit"
												onClick={() => openEdit(p)}
												className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
											>
												<Edit2 className="w-4 h-4" />
											</button>
											<button
												title="Delete"
												onClick={() => setDeletingPolicy(p)}
												className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Dialogs */}
			{showDialog && (
				<PolicyDialog editing={editingPolicy} onClose={closeDialog} />
			)}

			{deletingPolicy && (
				<DeleteConfirm
					policy={deletingPolicy}
					onConfirm={() => handleDelete(deletingPolicy)}
					onCancel={() => setDeletingPolicy(null)}
				/>
			)}

			{previewPolicy && (
				<PreviewDialog
					policy={previewPolicy}
					result={previewResult}
					isLoading={dryRunPolicy.isPending}
					error={previewError}
					isRunning={runningId === previewPolicy.id}
					onRunNow={() => handlePreviewRunNow(previewPolicy)}
					onClose={() => setPreviewPolicy(null)}
				/>
			)}
		</div>
	);
}
