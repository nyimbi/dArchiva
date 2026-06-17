// (c) Copyright Datacraft, 2026
/**
 * AutoRoutingRules — manage rules that automatically move classified documents
 * into target folders based on document type and confidence threshold.
 */
import { useFolderTree } from '@/features/documents/api';
import { AnimatePresence, motion } from 'framer-motion';
import {
	AlertTriangle,
	CheckCircle2,
	FlaskConical,
	FolderOpen,
	Loader2,
	MoreVertical,
	Plus,
	Route,
	Trash2,
	X,
	XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
	type AutoRoutingRule,
	type AutoRoutingRuleCreate,
	type AutoRoutingRuleUpdate,
	useAutoRoutingRules,
	useCreateAutoRoutingRule,
	useDeleteAutoRoutingRule,
	useTestAutoRoutingRule,
	useUpdateAutoRoutingRule,
} from './api';

// ── Constants ─────────────────────────────────────────────────────────────────

const DOCUMENT_TYPES = [
	'invoice',
	'receipt',
	'contract',
	'report',
	'letter',
	'form',
	'id_document',
	'bank_statement',
	'delivery_note',
	'purchase_order',
	'other',
] as const;

// ── Folder picker helper ───────────────────────────────────────────────────────

type FolderNode = { id: string; title: string; ctype: string; children?: FolderNode[] };

function flattenFolders(
	nodes: FolderNode[] | undefined,
	depth = 0,
): Array<{ id: string; title: string; depth: number }> {
	if (!nodes) return [];
	const result: Array<{ id: string; title: string; depth: number }> = [];
	for (const n of nodes) {
		if (n.ctype === 'folder') {
			result.push({ id: n.id, title: n.title, depth });
			if (n.children) result.push(...flattenFolders(n.children, depth + 1));
		}
	}
	return result;
}

// ── New Rule Dialog ────────────────────────────────────────────────────────────

interface RuleDialogProps {
	initial?: AutoRoutingRule;
	onClose: () => void;
}

function RuleDialog({ initial, onClose }: RuleDialogProps) {
	const isEdit = !!initial;
	const [name, setName] = useState(initial?.name ?? '');
	const [documentType, setDocumentType] = useState(initial?.document_type ?? 'invoice');
	const [threshold, setThreshold] = useState(initial?.confidence_threshold ?? 0.75);
	const [folderId, setFolderId] = useState(initial?.destination_folder_id ?? '');
	const [projectId] = useState(initial?.project_id ?? '');
	const [priority, setPriority] = useState(initial?.priority ?? 0);
	const [isActive, setIsActive] = useState(initial?.is_active ?? true);

	const createMutation = useCreateAutoRoutingRule();
	const updateMutation = useUpdateAutoRoutingRule();
	const { data: folderData } = useFolderTree();
	const flatFolders = flattenFolders(folderData as FolderNode[] | undefined);

	const isPending = createMutation.isPending || updateMutation.isPending;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || !folderId) return;

		const payload: AutoRoutingRuleCreate = {
			name: name.trim(),
			document_type: documentType,
			confidence_threshold: threshold,
			destination_folder_id: folderId,
			project_id: projectId || null,
			priority,
			is_active: isActive,
		};

		try {
			if (isEdit && initial) {
				const updates: AutoRoutingRuleUpdate = {};
				const initialAsAny = initial as unknown as Record<string, unknown>;
				for (const [k, v] of Object.entries(payload) as [keyof AutoRoutingRuleCreate, unknown][]) {
					if (v !== initialAsAny[k]) {
						(updates as Record<string, unknown>)[k] = v;
					}
				}
				await updateMutation.mutateAsync({ id: initial.id, data: updates });
				toast.success('Rule updated');
			} else {
				await createMutation.mutateAsync(payload);
				toast.success('Auto-routing rule created');
			}
			onClose();
		} catch {
			toast.error(isEdit ? 'Failed to update rule' : 'Failed to create rule');
		}
	};

	return (
		<div
			className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				className="glass-card w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="p-6 border-b border-slate-800/50 flex items-center justify-between shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-lg bg-brass-500/10 flex items-center justify-center text-brass-400">
							<Route className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-xl font-display font-semibold text-slate-100">
								{isEdit ? 'Edit Auto-Routing Rule' : 'New Auto-Routing Rule'}
							</h2>
							<p className="text-sm text-slate-500 mt-0.5">
								Route classified documents automatically
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
					>
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Form */}
				<form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
					<div className="p-6 space-y-5 overflow-y-auto flex-1">
						{/* Name + Priority */}
						<div className="grid grid-cols-3 gap-4">
							<div className="col-span-2 space-y-2">
								<label className="text-sm font-medium text-slate-400">
									Rule Name <span className="text-brass-400">*</span>
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g. Invoices to Accounting"
									className="input-field w-full"
									autoFocus
									required
								/>
							</div>
							<div className="space-y-2">
								<label className="text-sm font-medium text-slate-400">Priority</label>
								<input
									type="number"
									value={priority}
									onChange={(e) => setPriority(parseInt(e.target.value) || 0)}
									className="input-field w-full"
								/>
								<p className="text-xs text-slate-500">Higher = runs first</p>
							</div>
						</div>

						{/* Document Type */}
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-400">
								Document Type <span className="text-brass-400">*</span>
							</label>
							<select
								value={documentType}
								onChange={(e) => setDocumentType(e.target.value)}
								className="input-field w-full"
								required
							>
								{DOCUMENT_TYPES.map((dt) => (
									<option key={dt} value={dt}>
										{dt.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
									</option>
								))}
							</select>
							<p className="text-xs text-slate-500">
								Matches the classified document_type from AI extraction.
							</p>
						</div>

						{/* Confidence Threshold */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium text-slate-400">
									Min Confidence Threshold
								</label>
								<span className="text-sm font-mono text-brass-400">
									{(threshold * 100).toFixed(0)}%
								</span>
							</div>
							<input
								type="range"
								min={0}
								max={1}
								step={0.05}
								value={threshold}
								onChange={(e) => setThreshold(parseFloat(e.target.value))}
								className="w-full accent-brass-400"
							/>
							<div className="flex justify-between text-xs text-slate-500">
								<span>0% (always route)</span>
								<span>100% (only certain)</span>
							</div>
						</div>

						{/* Destination Folder */}
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-400">
								Destination Folder <span className="text-brass-400">*</span>
							</label>
							<div className="flex items-center gap-2">
								<FolderOpen className="w-4 h-4 text-brass-400 shrink-0" />
								<select
									value={folderId}
									onChange={(e) => setFolderId(e.target.value)}
									className="input-field flex-1"
									required
								>
									<option value="">-- Select target folder --</option>
									{flatFolders.map((f) => (
										<option key={f.id} value={f.id}>
											{'  '.repeat(f.depth)}
											{f.title}
										</option>
									))}
								</select>
							</div>
						</div>

						{/* Active toggle */}
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => setIsActive(!isActive)}
								className={`relative w-11 h-6 rounded-full transition-colors ${
									isActive ? 'bg-brass-500' : 'bg-slate-700'
								}`}
							>
								<span
									className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
										isActive ? 'translate-x-5' : 'translate-x-0'
									}`}
								/>
							</button>
							<span className="text-sm text-slate-400">
								Rule is {isActive ? 'active' : 'inactive'}
							</span>
						</div>
					</div>

					{/* Footer */}
					<div className="p-6 border-t border-slate-800/50 flex items-center justify-end gap-3 bg-slate-900/50 shrink-0">
						<button
							type="button"
							onClick={onClose}
							className="btn-ghost"
							disabled={isPending}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="btn-primary min-w-[140px]"
							disabled={!name.trim() || !folderId || isPending}
						>
							{isPending ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									{isEdit ? 'Saving...' : 'Creating...'}
								</>
							) : isEdit ? (
								'Save Changes'
							) : (
								'Create Rule'
							)}
						</button>
					</div>
				</form>
			</motion.div>
		</div>
	);
}

// ── Test Dialog ────────────────────────────────────────────────────────────────

function TestDialog({ rule, onClose }: { rule: AutoRoutingRule; onClose: () => void }) {
	const [documentId, setDocumentId] = useState('');
	const [manualType, setManualType] = useState('');
	const [manualConf, setManualConf] = useState('');
	const testMutation = useTestAutoRoutingRule();

	const handleTest = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!documentId.trim()) return;
		try {
			await testMutation.mutateAsync({
				ruleId: rule.id,
				document_id: documentId.trim(),
				document_type: manualType || undefined,
				confidence: manualConf ? parseFloat(manualConf) : undefined,
			});
		} catch {
			toast.error('Test request failed');
		}
	};

	const result = testMutation.data;

	return (
		<div
			className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				className="glass-card w-full max-w-md"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<FlaskConical className="w-5 h-5 text-purple-400" />
						<h3 className="font-semibold text-slate-100">Test Rule: {rule.name}</h3>
					</div>
					<button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded">
						<X className="w-4 h-4" />
					</button>
				</div>

				<form onSubmit={handleTest} className="p-6 space-y-4">
					<div className="space-y-2">
						<label className="text-sm font-medium text-slate-400">
							Document ID <span className="text-brass-400">*</span>
						</label>
						<input
							type="text"
							value={documentId}
							onChange={(e) => setDocumentId(e.target.value)}
							placeholder="UUID of document to test"
							className="input-field w-full"
							autoFocus
							required
						/>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-400">
								Override type <span className="text-slate-600">(optional)</span>
							</label>
							<input
								type="text"
								value={manualType}
								onChange={(e) => setManualType(e.target.value)}
								placeholder="e.g. invoice"
								className="input-field w-full"
							/>
						</div>
						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-400">
								Override confidence
							</label>
							<input
								type="number"
								value={manualConf}
								onChange={(e) => setManualConf(e.target.value)}
								placeholder="0.0–1.0"
								min={0}
								max={1}
								step={0.01}
								className="input-field w-full"
							/>
						</div>
					</div>

					{/* Result */}
					<AnimatePresence>
						{result && (
							<motion.div
								initial={{ opacity: 0, height: 0 }}
								animate={{ opacity: 1, height: 'auto' }}
								className={`p-4 rounded-lg border ${
									result.would_route
										? 'border-emerald-500/30 bg-emerald-500/10'
										: 'border-red-500/30 bg-red-500/10'
								}`}
							>
								<div className="flex items-center gap-2 mb-1">
									{result.would_route ? (
										<CheckCircle2 className="w-4 h-4 text-emerald-400" />
									) : (
										<XCircle className="w-4 h-4 text-red-400" />
									)}
									<span
										className={`text-sm font-medium ${
											result.would_route ? 'text-emerald-300' : 'text-red-300'
										}`}
									>
										{result.would_route ? 'Rule would match' : 'Rule would NOT match'}
									</span>
								</div>
								{result.would_route && result.destination_folder_id && (
									<p className="text-xs text-slate-400 mt-1">
										Would route to folder:{' '}
										<span className="font-mono text-slate-300">
											{result.destination_folder_id}
										</span>
									</p>
								)}
							</motion.div>
						)}
					</AnimatePresence>

					<div className="flex justify-end gap-3 pt-2">
						<button type="button" onClick={onClose} className="btn-ghost">
							Close
						</button>
						<button
							type="submit"
							className="btn-primary"
							disabled={!documentId.trim() || testMutation.isPending}
						>
							{testMutation.isPending ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Testing...
								</>
							) : (
								'Run Test'
							)}
						</button>
					</div>
				</form>
			</motion.div>
		</div>
	);
}

// ── Row actions menu ───────────────────────────────────────────────────────────

function RowMenu({
	rule,
	onEdit,
	onTest,
	onDelete,
}: {
	rule: AutoRoutingRule;
	onEdit: () => void;
	onTest: () => void;
	onDelete: () => void;
}) {
	const [open, setOpen] = useState(false);

	return (
		<div className="relative">
			<button
				onClick={() => setOpen((v) => !v)}
				className="p-1.5 text-slate-500 hover:text-slate-200 rounded transition-colors"
			>
				<MoreVertical className="w-4 h-4" />
			</button>
			<AnimatePresence>
				{open && (
					<>
						<div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							exit={{ opacity: 0, scale: 0.95 }}
							className="absolute right-0 top-8 z-20 glass-card w-40 py-1 shadow-xl"
						>
							{[
								{ label: 'Edit', onClick: onEdit },
								{ label: 'Test (dry-run)', onClick: onTest },
							].map((action) => (
								<button
									key={action.label}
									onClick={() => {
										setOpen(false);
										action.onClick();
									}}
									className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700/50 transition-colors"
								>
									{action.label}
								</button>
							))}
							<div className="border-t border-slate-700/50 my-1" />
							<button
								onClick={() => {
									setOpen(false);
									onDelete();
								}}
								className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
							>
								Delete
							</button>
						</motion.div>
					</>
				)}
			</AnimatePresence>
		</div>
	);
}

// ── Main component ─────────────────────────────────────────────────────────────

export function AutoRoutingRules() {
	const [showCreate, setShowCreate] = useState(false);
	const [editRule, setEditRule] = useState<AutoRoutingRule | null>(null);
	const [testRule, setTestRule] = useState<AutoRoutingRule | null>(null);
	const [deleteRule, setDeleteRule] = useState<AutoRoutingRule | null>(null);

	const { data, isLoading, isError } = useAutoRoutingRules(1, 100);
	const updateMutation = useUpdateAutoRoutingRule();
	const deleteMutation = useDeleteAutoRoutingRule();

	const rules = data?.items ?? [];

	const handleToggle = async (rule: AutoRoutingRule) => {
		try {
			await updateMutation.mutateAsync({
				id: rule.id,
				data: { is_active: !rule.is_active },
			});
			toast.success(rule.is_active ? 'Rule disabled' : 'Rule enabled');
		} catch {
			toast.error('Failed to update rule');
		}
	};

	const handleDelete = async () => {
		if (!deleteRule) return;
		try {
			await deleteMutation.mutateAsync(deleteRule.id);
			toast.success('Rule deleted');
			setDeleteRule(null);
		} catch {
			toast.error('Failed to delete rule');
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-2xl font-display font-bold text-slate-100 flex items-center gap-2">
						<Route className="w-6 h-6 text-brass-400" />
						Auto-Routing Rules
					</h2>
					<p className="text-slate-400 mt-1 text-sm">
						Automatically move classified documents to the correct folder.
					</p>
				</div>
				<button
					onClick={() => setShowCreate(true)}
					className="btn-primary flex items-center gap-2"
				>
					<Plus className="w-4 h-4" />
					New Rule
				</button>
			</div>

			{/* Table */}
			<div className="glass-card overflow-hidden">
				{isLoading ? (
					<div className="flex items-center justify-center py-16">
						<Loader2 className="w-6 h-6 animate-spin text-brass-400" />
					</div>
				) : isError ? (
					<div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
						<AlertTriangle className="w-8 h-8 text-red-400" />
						<p>Failed to load auto-routing rules.</p>
					</div>
				) : rules.length === 0 ? (
					<div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
						<Route className="w-10 h-10 text-slate-600" />
						<p className="text-sm">No auto-routing rules configured.</p>
						<button
							onClick={() => setShowCreate(true)}
							className="btn-ghost text-xs flex items-center gap-1"
						>
							<Plus className="w-3 h-3" /> Create your first rule
						</button>
					</div>
				) : (
					<table className="w-full">
						<thead>
							<tr className="border-b border-slate-800/50 text-left">
								{[
									'Name',
									'Document Type',
									'Min Confidence',
									'Priority',
									'Applied',
									'Status',
									'',
								].map((h) => (
									<th
										key={h}
										className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider"
									>
										{h}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							<AnimatePresence initial={false}>
								{rules.map((rule) => (
									<motion.tr
										key={rule.id}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors"
									>
										{/* Name */}
										<td className="px-4 py-3">
											<span className="text-sm font-medium text-slate-200">
												{rule.name}
											</span>
										</td>

										{/* Document Type */}
										<td className="px-4 py-3">
											<span className="px-2 py-0.5 rounded-full text-xs bg-brass-500/10 text-brass-400 border border-brass-500/20 font-mono">
												{rule.document_type}
											</span>
										</td>

										{/* Confidence */}
										<td className="px-4 py-3">
											<div className="flex items-center gap-2">
												<div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
													<div
														className="h-full bg-brass-400 rounded-full"
														style={{ width: `${rule.confidence_threshold * 100}%` }}
													/>
												</div>
												<span className="text-xs text-slate-400 font-mono">
													{(rule.confidence_threshold * 100).toFixed(0)}%
												</span>
											</div>
										</td>

										{/* Priority */}
										<td className="px-4 py-3">
											<span className="text-sm text-slate-400 font-mono">
												{rule.priority}
											</span>
										</td>

										{/* Applied count */}
										<td className="px-4 py-3">
											<span className="text-sm text-slate-400">
												{rule.applied_count.toLocaleString()}
											</span>
										</td>

										{/* Status toggle */}
										<td className="px-4 py-3">
											<button
												onClick={() => handleToggle(rule)}
												disabled={updateMutation.isPending}
												className={`relative w-10 h-5 rounded-full transition-colors ${
													rule.is_active ? 'bg-brass-500' : 'bg-slate-700'
												}`}
											>
												<span
													className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
														rule.is_active ? 'translate-x-5' : 'translate-x-0'
													}`}
												/>
											</button>
										</td>

										{/* Actions */}
										<td className="px-4 py-3 text-right">
											<RowMenu
												rule={rule}
												onEdit={() => setEditRule(rule)}
												onTest={() => setTestRule(rule)}
												onDelete={() => setDeleteRule(rule)}
											/>
										</td>
									</motion.tr>
								))}
							</AnimatePresence>
						</tbody>
					</table>
				)}
			</div>

			{/* Modals */}
			<AnimatePresence>
				{showCreate && (
					<RuleDialog onClose={() => setShowCreate(false)} />
				)}
				{editRule && (
					<RuleDialog
						initial={editRule}
						onClose={() => setEditRule(null)}
					/>
				)}
				{testRule && (
					<TestDialog rule={testRule} onClose={() => setTestRule(null)} />
				)}
				{deleteRule && (
					<div
						className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
						onClick={() => setDeleteRule(null)}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.95 }}
							animate={{ opacity: 1, scale: 1 }}
							className="glass-card w-full max-w-sm p-6 space-y-4"
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex items-center gap-3">
								<div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
									<Trash2 className="w-5 h-5 text-red-400" />
								</div>
								<div>
									<h3 className="font-semibold text-slate-100">Delete Rule</h3>
									<p className="text-sm text-slate-400">This cannot be undone.</p>
								</div>
							</div>
							<p className="text-sm text-slate-300">
								Delete{' '}
								<span className="font-medium text-slate-100">{deleteRule.name}</span>?
							</p>
							<div className="flex justify-end gap-3">
								<button
									onClick={() => setDeleteRule(null)}
									className="btn-ghost"
									disabled={deleteMutation.isPending}
								>
									Cancel
								</button>
								<button
									onClick={handleDelete}
									className="btn-danger flex items-center gap-2"
									disabled={deleteMutation.isPending}
								>
									{deleteMutation.isPending ? (
										<Loader2 className="w-4 h-4 animate-spin" />
									) : (
										<Trash2 className="w-4 h-4" />
									)}
									Delete
								</button>
							</div>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</div>
	);
}
