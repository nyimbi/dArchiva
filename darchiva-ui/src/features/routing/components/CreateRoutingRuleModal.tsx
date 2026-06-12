// (c) Copyright Datacraft, 2026
import { useFolderTree } from '@/features/documents/api';
import type { RoutingRule } from '@/types';
import { AnimatePresence,motion } from 'framer-motion';
import {
  FolderOpen,
  GitBranch,
  Inbox,
  Loader2,
  Plus,
  Route,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateRoutingRule } from '../api';

interface CreateRoutingRuleModalProps {
	onClose: () => void;
	onSuccess?: (rule: RoutingRule) => void;
}

type ConditionType = 'document_type' | 'tag' | 'filename' | 'metadata';
type ConditionOperator = 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'matches';

interface Condition {
	id: string;
	type: ConditionType;
	operator: ConditionOperator;
	value: string;
}

const DESTINATION_TYPES = [
	{ value: 'folder', label: 'Folder', icon: FolderOpen, color: 'text-brass-400' },
	{ value: 'workflow', label: 'Workflow', icon: GitBranch, color: 'text-emerald-400' },
	{ value: 'user_inbox', label: 'User Inbox', icon: Inbox, color: 'text-purple-400' },
] as const;

const CONDITION_TYPES: Array<{ value: ConditionType; label: string }> = [
	{ value: 'document_type', label: 'Document Type' },
	{ value: 'tag', label: 'Tag' },
	{ value: 'filename', label: 'Filename' },
	{ value: 'metadata', label: 'Metadata Field' },
];

const OPERATORS: Array<{ value: ConditionOperator; label: string }> = [
	{ value: 'equals', label: 'Equals' },
	{ value: 'contains', label: 'Contains' },
	{ value: 'starts_with', label: 'Starts with' },
	{ value: 'ends_with', label: 'Ends with' },
	{ value: 'matches', label: 'Matches (regex)' },
];

export function CreateRoutingRuleModal({ onClose, onSuccess }: CreateRoutingRuleModalProps) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const [priority, setPriority] = useState(100);
	const [destinationType, setDestinationType] = useState<'folder' | 'workflow' | 'user_inbox'>('folder');
	const [destinationId, setDestinationId] = useState('');
	const [mode, setMode] = useState<'operational' | 'archival' | 'both'>('both');
	const [conditions, setConditions] = useState<Condition[]>([
		{ id: crypto.randomUUID(), type: 'document_type', operator: 'equals', value: '' },
	]);

	const createMutation = useCreateRoutingRule();
	const { data: folders } = useFolderTree();

	const addCondition = () => {
		setConditions([
			...conditions,
			{ id: crypto.randomUUID(), type: 'document_type', operator: 'equals', value: '' },
		]);
	};

	const removeCondition = (id: string) => {
		if (conditions.length > 1) {
			setConditions(conditions.filter((c) => c.id !== id));
		}
	};

	const updateCondition = (id: string, updates: Partial<Condition>) => {
		setConditions(conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)));
	};

	const buildConditionsObject = (): Record<string, unknown> => {
		const result: Record<string, unknown> = {};
		for (const cond of conditions) {
			if (cond.value) {
				const key = `${cond.type}_${cond.operator}`;
				result[key] = cond.value;
			}
		}
		return result;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;

		try {
			const rule = await createMutation.mutateAsync({
				name: name.trim(),
				description: description.trim() || undefined,
				priority,
				conditions: buildConditionsObject(),
				destinationType,
				destinationId: destinationId || undefined,
				mode,
				isActive: true,
			});
			toast.success('Routing rule created');
			onSuccess?.(rule);
			onClose();
		} catch {
			toast.error('Failed to create routing rule');
		}
	};

	const flattenFolders = (nodes: typeof folders, depth = 0): Array<{ id: string; title: string; depth: number }> => {
		if (!nodes) return [];
		const result: Array<{ id: string; title: string; depth: number }> = [];
		for (const node of nodes) {
			if (node.ctype === 'folder') {
				result.push({ id: node.id, title: node.title, depth });
				if (node.children) {
					result.push(...flattenFolders(node.children, depth + 1));
				}
			}
		}
		return result;
	};

	const flatFolders = flattenFolders(folders);

	return (
		<div
			className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
			onClick={onClose}
		>
			<motion.div
				initial={{ opacity: 0, scale: 0.95 }}
				animate={{ opacity: 1, scale: 1 }}
				className="glass-card w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="p-6 border-b border-slate-800/50 flex items-center justify-between shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
							<Route className="w-5 h-5" />
						</div>
						<div>
							<h2 className="text-xl font-display font-semibold text-slate-100">New Routing Rule</h2>
							<p className="text-sm text-slate-500 mt-0.5">Automate document routing</p>
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
						{/* Basic Info */}
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2 col-span-2 sm:col-span-1">
								<label className="text-sm font-medium text-slate-400">
									Rule Name <span className="text-brass-400">*</span>
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g. Invoice Router"
									className="input-field w-full"
									autoFocus
									required
								/>
							</div>
							<div className="space-y-2 col-span-2 sm:col-span-1">
								<label className="text-sm font-medium text-slate-400">Priority</label>
								<input
									type="number"
									value={priority}
									onChange={(e) => setPriority(parseInt(e.target.value) || 100)}
									min={1}
									max={1000}
									className="input-field w-full"
								/>
								<p className="text-xs text-slate-500">Lower = higher priority</p>
							</div>
						</div>

						<div className="space-y-2">
							<label className="text-sm font-medium text-slate-400">Description</label>
							<textarea
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Optional description..."
								className="input-field w-full resize-none"
								rows={2}
							/>
						</div>

						{/* Conditions */}
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<label className="text-sm font-medium text-slate-400">Match Conditions</label>
								<button
									type="button"
									onClick={addCondition}
									className="text-xs text-brass-400 hover:text-brass-300 flex items-center gap-1"
								>
									<Plus className="w-3 h-3" /> Add Condition
								</button>
							</div>

							<AnimatePresence>
								{conditions.map((cond) => (
									<motion.div
										key={cond.id}
										initial={{ opacity: 0, height: 0 }}
										animate={{ opacity: 1, height: 'auto' }}
										exit={{ opacity: 0, height: 0 }}
										className="flex items-center gap-2 p-3 bg-slate-800/30 rounded-lg border border-slate-700/50"
									>
										<select
											value={cond.type}
											onChange={(e) => updateCondition(cond.id, { type: e.target.value as ConditionType })}
											className="input-field flex-1"
										>
											{CONDITION_TYPES.map((t) => (
												<option key={t.value} value={t.value}>
													{t.label}
												</option>
											))}
										</select>
										<select
											value={cond.operator}
											onChange={(e) =>
												updateCondition(cond.id, { operator: e.target.value as ConditionOperator })
											}
											className="input-field w-32"
										>
											{OPERATORS.map((op) => (
												<option key={op.value} value={op.value}>
													{op.label}
												</option>
											))}
										</select>
										<input
											type="text"
											value={cond.value}
											onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
											placeholder="Value..."
											className="input-field flex-1"
										/>
										{conditions.length > 1 && (
											<button
												type="button"
												onClick={() => removeCondition(cond.id)}
												className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
											>
												<Trash2 className="w-4 h-4" />
											</button>
										)}
									</motion.div>
								))}
							</AnimatePresence>
						</div>

						{/* Destination Type */}
						<div className="space-y-3">
							<label className="text-sm font-medium text-slate-400">Destination</label>
							<div className="grid grid-cols-3 gap-2">
								{DESTINATION_TYPES.map((dt) => (
									<button
										key={dt.value}
										type="button"
										onClick={() => {
											setDestinationType(dt.value);
											setDestinationId('');
										}}
										className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-2 ${
											destinationType === dt.value
												? 'border-brass-500/50 bg-brass-500/10'
												: 'border-slate-700/50 hover:border-slate-600'
										}`}
									>
										<dt.icon className={`w-5 h-5 ${dt.color}`} />
										<span className="text-sm text-slate-300">{dt.label}</span>
									</button>
								))}
							</div>
						</div>

						{/* Destination Selection */}
						{destinationType === 'folder' && (
							<div className="space-y-2">
								<label className="text-sm font-medium text-slate-400">Select Folder</label>
								<select
									value={destinationId}
									onChange={(e) => setDestinationId(e.target.value)}
									className="input-field w-full"
								>
									<option value="">-- Select folder --</option>
									{flatFolders.map((f) => (
										<option key={f.id} value={f.id}>
											{'  '.repeat(f.depth)}{f.title}
										</option>
									))}
								</select>
							</div>
						)}

						{/* Mode */}
						<div className="space-y-3">
							<label className="text-sm font-medium text-slate-400">Apply To</label>
							<div className="flex gap-2">
								{(['operational', 'archival', 'both'] as const).map((m) => (
									<button
										key={m}
										type="button"
										onClick={() => setMode(m)}
										className={`px-4 py-2 rounded-lg border text-sm capitalize transition-all ${
											mode === m
												? 'border-brass-500/50 bg-brass-500/10 text-brass-400'
												: 'border-slate-700/50 text-slate-400 hover:border-slate-600'
										}`}
									>
										{m}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Footer */}
					<div className="p-6 border-t border-slate-800/50 flex items-center justify-end gap-3 bg-slate-900/50 shrink-0">
						<button
							type="button"
							onClick={onClose}
							className="btn-ghost"
							disabled={createMutation.isPending}
						>
							Cancel
						</button>
						<button
							type="submit"
							className="btn-primary min-w-[140px]"
							disabled={!name.trim() || createMutation.isPending}
						>
							{createMutation.isPending ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin" />
									Creating...
								</>
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
