// (c) Copyright Datacraft, 2026
/**
 * Quality rules configuration UI.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Plus,
	Pencil,
	Trash2,
	MoreVertical,
	Power,
	PowerOff,
	GripVertical,
	AlertCircle,
	CheckCircle,
	XCircle,
	Info,
} from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/utils';
import type {
	QualityRule,
	QualityMetricType,
	RuleOperator,
	RuleSeverity,
	RuleAction,
} from '../types';
import { METRIC_LABELS, OPERATOR_LABELS, SEVERITY_CONFIG } from '../types';

interface QualityRulesProps {
	rules: QualityRule[];
	onCreateRule: (rule: Omit<QualityRule, 'id' | 'createdAt'>) => void;
	onUpdateRule: (id: string, updates: Partial<QualityRule>) => void;
	onDeleteRule: (id: string) => void;
	onToggleRule: (id: string, isActive: boolean) => void;
}

const METRICS: QualityMetricType[] = [
	'resolution_dpi',
	'skew_angle',
	'brightness',
	'contrast',
	'sharpness',
	'noise_level',
	'blur_score',
	'ocr_confidence',
	'quality_score',
];

const OPERATORS: RuleOperator[] = [
	'gte',
	'gt',
	'lte',
	'lt',
	'eq',
	'neq',
	'between',
	'not_between',
];

const SEVERITIES: RuleSeverity[] = ['info', 'warning', 'error', 'critical'];

const ACTIONS: { value: RuleAction; label: string }[] = [
	{ value: 'log', label: 'Log Only' },
	{ value: 'flag', label: 'Flag for Review' },
	{ value: 'notify', label: 'Send Notification' },
	{ value: 'auto_fix', label: 'Auto-Fix' },
	{ value: 'quarantine', label: 'Quarantine' },
	{ value: 'reject', label: 'Reject' },
];

export function QualityRules({
	rules,
	onCreateRule,
	onUpdateRule,
	onDeleteRule,
	onToggleRule,
}: QualityRulesProps) {
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [editingRule, setEditingRule] = useState<QualityRule | null>(null);

	const handleSave = (ruleData: Omit<QualityRule, 'id' | 'createdAt'>) => {
		if (editingRule) {
			onUpdateRule(editingRule.id, ruleData);
		} else {
			onCreateRule(ruleData);
		}
		setIsDialogOpen(false);
		setEditingRule(null);
	};

	const handleEdit = (rule: QualityRule) => {
		setEditingRule(rule);
		setIsDialogOpen(true);
	};

	const handleCreate = () => {
		setEditingRule(null);
		setIsDialogOpen(true);
	};

	// Group rules by metric
	const rulesByMetric = rules.reduce((acc, rule) => {
		const metric = rule.metric;
		if (!acc[metric]) acc[metric] = [];
		acc[metric].push(rule);
		return acc;
	}, {} as Record<string, QualityRule[]>);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-display font-semibold text-slate-100">
						Quality Rules
					</h2>
					<p className="mt-1 text-sm text-slate-500">
						Configure automated quality checks for scanned documents
					</p>
				</div>
				<button onClick={handleCreate} className="btn-primary">
					<Plus className="w-4 h-4" />
					Add Rule
				</button>
			</div>

			{/* Rules List */}
			<div className="space-y-4">
				{Object.entries(rulesByMetric)
					.sort((a, b) => a[0].localeCompare(b[0]))
					.map(([metric, metricRules]) => (
						<motion.div
							key={metric}
							initial={{ opacity: 0, y: 10 }}
							animate={{ opacity: 1, y: 0 }}
							className="glass-card overflow-hidden"
						>
							<div className="px-4 py-3 bg-slate-800/50 border-b border-slate-700/50">
								<h3 className="text-sm font-medium text-slate-200 capitalize">
									{METRIC_LABELS[metric as QualityMetricType] ||
										metric.replace(/_/g, ' ')}
								</h3>
							</div>
							<div className="divide-y divide-slate-700/50">
								{metricRules
									.sort((a, b) => a.priority - b.priority)
									.map((rule) => (
										<RuleRow
											key={rule.id}
											rule={rule}
											onEdit={() => handleEdit(rule)}
											onDelete={() => onDeleteRule(rule.id)}
											onToggle={(active) => onToggleRule(rule.id, active)}
										/>
									))}
							</div>
						</motion.div>
					))}

				{rules.length === 0 && (
					<div className="glass-card p-12 text-center">
						<AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-4" />
						<h3 className="text-lg font-medium text-slate-300">
							No quality rules configured
						</h3>
						<p className="mt-2 text-sm text-slate-500">
							Create rules to automatically assess document quality
						</p>
						<button onClick={handleCreate} className="btn-primary mt-4">
							<Plus className="w-4 h-4" />
							Create First Rule
						</button>
					</div>
				)}
			</div>

			{/* Create/Edit Dialog */}
			<RuleDialog
				isOpen={isDialogOpen}
				onClose={() => {
					setIsDialogOpen(false);
					setEditingRule(null);
				}}
				rule={editingRule}
				onSave={handleSave}
			/>
		</div>
	);
}

function RuleRow({
	rule,
	onEdit,
	onDelete,
	onToggle,
}: {
	rule: QualityRule;
	onEdit: () => void;
	onDelete: () => void;
	onToggle: (active: boolean) => void;
}) {
	const severityConfig = SEVERITY_CONFIG[rule.severity];
	const SeverityIcon =
		rule.severity === 'critical' || rule.severity === 'error'
			? XCircle
			: rule.severity === 'warning'
			? AlertCircle
			: Info;

	return (
		<div
			className={cn(
				'px-4 py-3 flex items-center gap-4 transition-colors',
				!rule.isActive && 'opacity-50'
			)}
		>
			<div className="flex-shrink-0 cursor-grab">
				<GripVertical className="w-4 h-4 text-slate-600" />
			</div>

			<div
				className={cn(
					'flex-shrink-0 p-1.5 rounded',
					severityConfig.bgColor
				)}
			>
				<SeverityIcon className={cn('w-4 h-4', severityConfig.color)} />
			</div>

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-slate-200">
						{rule.name}
					</span>
					{!rule.isActive && (
						<span className="badge badge-gray text-2xs">Disabled</span>
					)}
				</div>
				<div className="mt-0.5 text-xs text-slate-500">
					{OPERATOR_LABELS[rule.operator]} {rule.threshold}
					{rule.thresholdUpper !== undefined &&
						` and ${rule.thresholdUpper}`}{' '}
					• {rule.action.replace(/_/g, ' ')}
				</div>
			</div>

			<div className="flex items-center gap-2">
				<span className="text-xs text-slate-500">Priority: {rule.priority}</span>

				<DropdownMenu.Root>
					<DropdownMenu.Trigger asChild>
						<button className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded">
							<MoreVertical className="w-4 h-4" />
						</button>
					</DropdownMenu.Trigger>
					<DropdownMenu.Portal>
						<DropdownMenu.Content
							className="min-w-[160px] bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-1 z-50"
							sideOffset={5}
						>
							<DropdownMenu.Item
								className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded cursor-pointer outline-none"
								onSelect={onEdit}
							>
								<Pencil className="w-4 h-4" />
								Edit Rule
							</DropdownMenu.Item>
							<DropdownMenu.Item
								className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-slate-700 rounded cursor-pointer outline-none"
								onSelect={() => onToggle(!rule.isActive)}
							>
								{rule.isActive ? (
									<>
										<PowerOff className="w-4 h-4" />
										Disable
									</>
								) : (
									<>
										<Power className="w-4 h-4" />
										Enable
									</>
								)}
							</DropdownMenu.Item>
							<DropdownMenu.Separator className="h-px bg-slate-700 my-1" />
							<DropdownMenu.Item
								className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded cursor-pointer outline-none"
								onSelect={onDelete}
							>
								<Trash2 className="w-4 h-4" />
								Delete
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>
			</div>
		</div>
	);
}

function RuleDialog({
	isOpen,
	onClose,
	rule,
	onSave,
}: {
	isOpen: boolean;
	onClose: () => void;
	rule: QualityRule | null;
	onSave: (rule: Omit<QualityRule, 'id' | 'createdAt'>) => void;
}) {
	const [formData, setFormData] = useState<Omit<QualityRule, 'id' | 'createdAt'>>({
		name: rule?.name || '',
		description: rule?.description || '',
		metric: rule?.metric || 'resolution_dpi',
		operator: rule?.operator || 'gte',
		threshold: rule?.threshold || 200,
		thresholdUpper: rule?.thresholdUpper,
		severity: rule?.severity || 'warning',
		action: rule?.action || 'flag',
		messageTemplate: rule?.messageTemplate || '',
		priority: rule?.priority || 100,
		isActive: rule?.isActive ?? true,
		appliesToAll: rule?.appliesToAll ?? true,
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSave(formData);
	};

	return (
		<Dialog.Root open={isOpen} onOpenChange={onClose}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
				<Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg max-h-[90vh] overflow-auto bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50">
					<form onSubmit={handleSubmit}>
						<div className="p-6 border-b border-slate-700">
							<Dialog.Title className="text-lg font-display font-semibold text-slate-100">
								{rule ? 'Edit Rule' : 'Create Quality Rule'}
							</Dialog.Title>
						</div>

						<div className="p-6 space-y-4">
							{/* Name */}
							<div>
								<label className="block text-sm text-slate-400 mb-1">
									Rule Name
								</label>
								<input
									type="text"
									value={formData.name}
									onChange={(e) =>
										setFormData({ ...formData, name: e.target.value })
									}
									className="input w-full"
									placeholder="e.g., Minimum Resolution"
									required
								/>
							</div>

							{/* Metric & Operator */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm text-slate-400 mb-1">
										Metric
									</label>
									<select
										value={formData.metric}
										onChange={(e) =>
											setFormData({
												...formData,
												metric: e.target.value as QualityMetricType,
											})
										}
										className="input w-full"
									>
										{METRICS.map((m) => (
											<option key={m} value={m}>
												{METRIC_LABELS[m]}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm text-slate-400 mb-1">
										Condition
									</label>
									<select
										value={formData.operator}
										onChange={(e) =>
											setFormData({
												...formData,
												operator: e.target.value as RuleOperator,
											})
										}
										className="input w-full"
									>
										{OPERATORS.map((op) => (
											<option key={op} value={op}>
												{OPERATOR_LABELS[op]}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Threshold */}
							<div
								className={cn(
									'grid gap-4',
									formData.operator.includes('between')
										? 'grid-cols-2'
										: 'grid-cols-1'
								)}
							>
								<div>
									<label className="block text-sm text-slate-400 mb-1">
										Threshold
									</label>
									<input
										type="number"
										step="any"
										value={formData.threshold}
										onChange={(e) =>
											setFormData({
												...formData,
												threshold: parseFloat(e.target.value),
											})
										}
										className="input w-full"
										required
									/>
								</div>
								{formData.operator.includes('between') && (
									<div>
										<label className="block text-sm text-slate-400 mb-1">
											Upper Threshold
										</label>
										<input
											type="number"
											step="any"
											value={formData.thresholdUpper || ''}
											onChange={(e) =>
												setFormData({
													...formData,
													thresholdUpper: e.target.value
														? parseFloat(e.target.value)
														: undefined,
												})
											}
											className="input w-full"
											required
										/>
									</div>
								)}
							</div>

							{/* Severity & Action */}
							<div className="grid grid-cols-2 gap-4">
								<div>
									<label className="block text-sm text-slate-400 mb-1">
										Severity
									</label>
									<select
										value={formData.severity}
										onChange={(e) =>
											setFormData({
												...formData,
												severity: e.target.value as RuleSeverity,
											})
										}
										className="input w-full"
									>
										{SEVERITIES.map((s) => (
											<option key={s} value={s}>
												{SEVERITY_CONFIG[s].label}
											</option>
										))}
									</select>
								</div>
								<div>
									<label className="block text-sm text-slate-400 mb-1">
										Action
									</label>
									<select
										value={formData.action}
										onChange={(e) =>
											setFormData({
												...formData,
												action: e.target.value as RuleAction,
											})
										}
										className="input w-full"
									>
										{ACTIONS.map((a) => (
											<option key={a.value} value={a.value}>
												{a.label}
											</option>
										))}
									</select>
								</div>
							</div>

							{/* Priority */}
							<div>
								<label className="block text-sm text-slate-400 mb-1">
									Priority (lower = higher priority)
								</label>
								<input
									type="number"
									value={formData.priority}
									onChange={(e) =>
										setFormData({
											...formData,
											priority: parseInt(e.target.value),
										})
									}
									className="input w-full"
									min={1}
									max={1000}
								/>
							</div>

							{/* Description */}
							<div>
								<label className="block text-sm text-slate-400 mb-1">
									Description (optional)
								</label>
								<textarea
									value={formData.description || ''}
									onChange={(e) =>
										setFormData({ ...formData, description: e.target.value })
									}
									className="input w-full"
									rows={2}
									placeholder="Describe what this rule checks for..."
								/>
							</div>
						</div>

						<div className="p-6 border-t border-slate-700 flex justify-end gap-3">
							<button type="button" onClick={onClose} className="btn-ghost">
								Cancel
							</button>
							<button type="submit" className="btn-primary">
								{rule ? 'Save Changes' : 'Create Rule'}
							</button>
						</div>
					</form>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
