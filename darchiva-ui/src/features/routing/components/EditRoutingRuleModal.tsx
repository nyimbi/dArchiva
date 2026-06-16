// (c) Copyright Datacraft, 2026
import { useUpdateRoutingRule } from '@/features/routing/api';
import { useFolderTree } from '@/features/documents/api';
import type { RoutingRule } from '@/types';
import { AnimatePresence, motion } from 'framer-motion';
import { FolderOpen, GitBranch, Inbox, Loader2, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
	rule: RoutingRule;
}

type ConditionType = 'document_type' | 'tag' | 'filename' | 'metadata';
type ConditionOperator = 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'matches';

interface Condition {
	id: string;
	type: ConditionType;
	operator: ConditionOperator;
	value: string;
}

const DEST_TYPES = [
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

function conditionsFromRecord(rec: Record<string, unknown>): Condition[] {
	return Object.entries(rec).map(([key, val]) => {
		const parts = key.split('_');
		const operator = parts.pop() as ConditionOperator;
		const type = parts.join('_') as ConditionType;
		return { id: crypto.randomUUID(), type, operator, value: String(val) };
	});
}

export function EditRoutingRuleModal({ onClose, rule }: Props) {
	const [name, setName] = useState(rule.name);
	const [description, setDescription] = useState(rule.description ?? '');
	const [priority, setPriority] = useState(rule.priority);
	const [destinationType, setDestinationType] = useState(rule.destinationType);
	const [destinationId, setDestinationId] = useState(rule.destinationId ?? '');
	const [mode, setMode] = useState(rule.mode);
	const [conditions, setConditions] = useState<Condition[]>(
		conditionsFromRecord(rule.conditions).length
			? conditionsFromRecord(rule.conditions)
			: [{ id: crypto.randomUUID(), type: 'document_type', operator: 'equals', value: '' }]
	);

	const updateMutation = useUpdateRoutingRule();
	const { data: folders } = useFolderTree();

	const addCondition = () =>
		setConditions([...conditions, { id: crypto.randomUUID(), type: 'document_type', operator: 'equals', value: '' }]);

	const removeCondition = (id: string) => {
		if (conditions.length > 1) setConditions(conditions.filter((c) => c.id !== id));
	};

	const updateCondition = (id: string, updates: Partial<Condition>) =>
		setConditions(conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)));

	const buildConditionsObject = () => {
		const result: Record<string, unknown> = {};
		for (const cond of conditions) {
			if (cond.value) result[`${cond.type}_${cond.operator}`] = cond.value;
		}
		return result;
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		try {
			await updateMutation.mutateAsync({
				id: rule.id,
				data: {
					name: name.trim(),
					description: description.trim() || undefined,
					priority,
					destinationType,
					destinationId: destinationId || undefined,
					mode,
					conditions: buildConditionsObject(),
				},
			});
			toast.success('Routing rule updated');
			onClose();
		} catch {
			toast.error('Failed to update routing rule');
		}
	};

	return (
		<AnimatePresence>
			<motion.div
				className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				onClick={(e) => e.target === e.currentTarget && onClose()}
			>
				<motion.div
					className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
					initial={{ scale: 0.95 }}
					animate={{ scale: 1 }}
					exit={{ scale: 0.95 }}
				>
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-lg font-semibold text-slate-100">Edit Routing Rule</h2>
						<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded">
							<X className="w-5 h-5" />
						</button>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
						<div>
							<label className="block text-sm text-slate-400 mb-1">Rule Name *</label>
							<input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} required />
						</div>

						<div className="grid grid-cols-2 gap-3">
							<div>
								<label className="block text-sm text-slate-400 mb-1">Priority</label>
								<input type="number" className="input w-full" value={priority} onChange={(e) => setPriority(Number(e.target.value))} min={1} max={1000} />
							</div>
							<div>
								<label className="block text-sm text-slate-400 mb-1">Mode</label>
								<select className="input w-full" value={mode} onChange={(e) => setMode(e.target.value as typeof mode)}>
									<option value="both">Both</option>
									<option value="operational">Operational</option>
									<option value="archival">Archival</option>
								</select>
							</div>
						</div>

						<div>
							<label className="block text-sm text-slate-400 mb-2">Destination</label>
							<div className="flex gap-2">
								{DEST_TYPES.map(({ value, label, icon: Icon, color }) => (
									<button
										key={value}
										type="button"
										onClick={() => setDestinationType(value)}
										className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors ${
											destinationType === value
												? 'border-brass-500 bg-brass-500/10'
												: 'border-slate-700 hover:border-slate-600'
										}`}
									>
										<Icon className={`w-5 h-5 ${destinationType === value ? color : 'text-slate-500'}`} />
										<span className="text-xs text-slate-300">{label}</span>
									</button>
								))}
							</div>
						</div>

						{destinationType === 'folder' && (
							<div>
								<label className="block text-sm text-slate-400 mb-1">Destination Folder</label>
								<select className="input w-full" value={destinationId} onChange={(e) => setDestinationId(e.target.value)}>
									<option value="">Select folder...</option>
									{folders?.map((f) => (
										<option key={f.id} value={f.id}>{f.title}</option>
									))}
								</select>
							</div>
						)}

						<div>
							<div className="flex items-center justify-between mb-2">
								<label className="text-sm text-slate-400">Conditions</label>
								<button type="button" onClick={addCondition} className="text-xs text-brass-400 hover:text-brass-300 flex items-center gap-1">
									<Plus className="w-3 h-3" /> Add
								</button>
							</div>
							<div className="space-y-2">
								{conditions.map((cond) => (
									<div key={cond.id} className="flex gap-2 items-center">
										<select className="input flex-1" value={cond.type} onChange={(e) => updateCondition(cond.id, { type: e.target.value as ConditionType })}>
											{CONDITION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
										</select>
										<select className="input flex-1" value={cond.operator} onChange={(e) => updateCondition(cond.id, { operator: e.target.value as ConditionOperator })}>
											{OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
										</select>
										<input className="input flex-1" placeholder="Value" value={cond.value} onChange={(e) => updateCondition(cond.id, { value: e.target.value })} />
										<button type="button" onClick={() => removeCondition(cond.id)} className="p-1.5 text-slate-500 hover:text-red-400">
											<Trash2 className="w-4 h-4" />
										</button>
									</div>
								))}
							</div>
						</div>

						<div className="flex gap-2 pt-2">
							<button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
							<button type="submit" disabled={updateMutation.isPending} className="btn-primary flex-1">
								{updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
							</button>
						</div>
					</form>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
