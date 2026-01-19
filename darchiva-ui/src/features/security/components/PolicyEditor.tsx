// (c) Copyright Datacraft, 2026
/**
 * Visual ABAC Policy Editor with condition builder and DSL preview.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Shield, ShieldOff, Plus, X, Code, Eye, Save, ChevronDown,
	User, File, Zap, Globe, Trash2, GripVertical, AlertCircle
} from 'lucide-react';
import type { PBACPolicy, PBACRule, PBACCondition, AttributeCategory, ConditionOperator, PolicyEffect } from '../types';
import { createPolicy, updatePolicy, validateDSL, createPolicyFromDSL } from '../api';

const CATEGORY_CONFIG: Record<AttributeCategory, { label: string; icon: typeof User; color: string; attributes: string[] }> = {
	subject: {
		label: 'Subject',
		icon: User,
		color: 'text-blue-600 bg-blue-50',
		attributes: ['id', 'username', 'email', 'roles', 'groups', 'department', 'department_hierarchy', 'is_superuser'],
	},
	resource: {
		label: 'Resource',
		icon: File,
		color: 'text-amber-600 bg-amber-50',
		attributes: ['id', 'type', 'owner_id', 'department', 'classification', 'tags'],
	},
	action: {
		label: 'Action',
		icon: Zap,
		color: 'text-purple-600 bg-purple-50',
		attributes: ['name'],
	},
	environment: {
		label: 'Environment',
		icon: Globe,
		color: 'text-teal-600 bg-teal-50',
		attributes: ['timestamp', 'ip_address', 'device_type', 'location', 'is_internal_network', 'mfa_verified'],
	},
};

const OPERATORS: { value: ConditionOperator; label: string; description: string }[] = [
	{ value: 'eq', label: '=', description: 'Equals' },
	{ value: 'ne', label: '!=', description: 'Not equals' },
	{ value: 'gt', label: '>', description: 'Greater than' },
	{ value: 'gte', label: '>=', description: 'Greater or equal' },
	{ value: 'lt', label: '<', description: 'Less than' },
	{ value: 'lte', label: '<=', description: 'Less or equal' },
	{ value: 'in', label: 'IN', description: 'In list' },
	{ value: 'not_in', label: 'NOT IN', description: 'Not in list' },
	{ value: 'contains', label: 'CONTAINS', description: 'Contains value' },
	{ value: 'starts_with', label: 'STARTS WITH', description: 'Starts with' },
	{ value: 'ends_with', label: 'ENDS WITH', description: 'Ends with' },
	{ value: 'matches', label: 'MATCHES', description: 'Regex match' },
	{ value: 'exists', label: 'EXISTS', description: 'Attribute exists' },
	{ value: 'not_exists', label: 'NOT EXISTS', description: 'Attribute missing' },
	{ value: 'is_member_of', label: 'MEMBER OF', description: 'Group membership' },
	{ value: 'has_role', label: 'HAS ROLE', description: 'Has specific role' },
	{ value: 'in_department', label: 'IN DEPT', description: 'In department' },
];

const COMMON_ACTIONS = ['view', 'edit', 'delete', 'share', 'download', 'print', 'export', 'move', 'copy'];
const COMMON_RESOURCES = ['document', 'folder', 'portfolio', 'case', 'workflow', 'user', 'role'];

interface ConditionEditorProps {
	condition: PBACCondition;
	onChange: (condition: PBACCondition) => void;
	onRemove: () => void;
}

function ConditionEditor({ condition, onChange, onRemove }: ConditionEditorProps) {
	const categoryConfig = CATEGORY_CONFIG[condition.category];
	const CategoryIcon = categoryConfig.icon;

	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: 'auto' }}
			exit={{ opacity: 0, height: 0 }}
			className="group flex items-center gap-2 rounded-lg border border-charcoal/10 bg-cream p-3"
		>
			<GripVertical className="h-4 w-4 cursor-grab text-charcoal/30" />

			{/* Category */}
			<select
				value={condition.category}
				onChange={(e) => onChange({ ...condition, category: e.target.value as AttributeCategory, attribute: '' })}
				className={`rounded-lg px-2 py-1.5 font-['DM_Sans'] text-xs font-medium ${categoryConfig.color}`}
			>
				{Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
					<option key={key} value={key}>{config.label}</option>
				))}
			</select>

			{/* Attribute */}
			<select
				value={condition.attribute}
				onChange={(e) => onChange({ ...condition, attribute: e.target.value })}
				className="flex-1 rounded-lg border border-charcoal/10 bg-parchment px-3 py-1.5 font-['DM_Sans'] text-sm focus:border-charcoal/30 focus:outline-none"
			>
				<option value="">Select attribute...</option>
				{categoryConfig.attributes.map(attr => (
					<option key={attr} value={attr}>{attr}</option>
				))}
			</select>

			{/* Operator */}
			<select
				value={condition.operator}
				onChange={(e) => onChange({ ...condition, operator: e.target.value as ConditionOperator })}
				className="rounded-lg border border-charcoal/10 bg-parchment px-2 py-1.5 font-['DM_Sans'] text-sm font-medium focus:border-charcoal/30 focus:outline-none"
			>
				{OPERATORS.map(op => (
					<option key={op.value} value={op.value}>{op.label}</option>
				))}
			</select>

			{/* Value */}
			{!['exists', 'not_exists'].includes(condition.operator) && (
				<input
					type="text"
					value={String(condition.value ?? '')}
					onChange={(e) => onChange({ ...condition, value: e.target.value })}
					placeholder="Value..."
					className="flex-1 rounded-lg border border-charcoal/10 bg-parchment px-3 py-1.5 font-['DM_Sans'] text-sm focus:border-charcoal/30 focus:outline-none"
				/>
			)}

			{/* Remove */}
			<button
				onClick={onRemove}
				className="rounded p-1 text-charcoal/30 opacity-0 transition-all hover:bg-terracotta/10 hover:text-terracotta group-hover:opacity-100"
			>
				<X className="h-4 w-4" />
			</button>
		</motion.div>
	);
}

interface RuleEditorProps {
	rule: PBACRule;
	index: number;
	onChange: (rule: PBACRule) => void;
	onRemove: () => void;
}

function RuleEditor({ rule, index, onChange, onRemove }: RuleEditorProps) {
	const addCondition = () => {
		onChange({
			...rule,
			conditions: [...rule.conditions, { category: 'subject', attribute: '', operator: 'eq', value: '' }],
		});
	};

	const updateCondition = (i: number, condition: PBACCondition) => {
		const conditions = [...rule.conditions];
		conditions[i] = condition;
		onChange({ ...rule, conditions });
	};

	const removeCondition = (i: number) => {
		onChange({ ...rule, conditions: rule.conditions.filter((_, idx) => idx !== i) });
	};

	return (
		<motion.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			className="rounded-xl border-2 border-charcoal/10 bg-parchment p-4"
		>
			<div className="mb-3 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className="flex h-6 w-6 items-center justify-center rounded-full bg-charcoal text-xs font-medium text-cream">
						{index + 1}
					</span>
					<span className="font-['Newsreader'] text-sm font-medium text-charcoal">Rule</span>
				</div>

				<div className="flex items-center gap-2">
					<select
						value={rule.logic}
						onChange={(e) => onChange({ ...rule, logic: e.target.value as 'AND' | 'OR' })}
						className="rounded-lg border border-charcoal/10 bg-cream px-2 py-1 font-['DM_Sans'] text-xs font-medium text-charcoal focus:outline-none"
					>
						<option value="AND">Match ALL</option>
						<option value="OR">Match ANY</option>
					</select>

					<button
						onClick={onRemove}
						className="rounded p-1 text-charcoal/40 hover:bg-terracotta/10 hover:text-terracotta"
					>
						<Trash2 className="h-4 w-4" />
					</button>
				</div>
			</div>

			<div className="space-y-2">
				<AnimatePresence>
					{rule.conditions.map((condition, i) => (
						<ConditionEditor
							key={i}
							condition={condition}
							onChange={(c) => updateCondition(i, c)}
							onRemove={() => removeCondition(i)}
						/>
					))}
				</AnimatePresence>

				<button
					onClick={addCondition}
					className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-charcoal/20 py-2 font-['DM_Sans'] text-sm text-charcoal/50 transition-colors hover:border-charcoal/30 hover:text-charcoal/70"
				>
					<Plus className="h-4 w-4" /> Add Condition
				</button>
			</div>
		</motion.div>
	);
}

interface DSLEditorProps {
	dslText: string;
	onChange: (text: string) => void;
	error?: string;
}

function DSLEditor({ dslText, onChange, error }: DSLEditorProps) {
	return (
		<div className="space-y-2">
			<div className="flex items-center gap-2 text-charcoal/60">
				<Code className="h-4 w-4" />
				<span className="font-['DM_Sans'] text-sm font-medium">Policy DSL</span>
			</div>

			<div className="relative">
				<textarea
					value={dslText}
					onChange={(e) => onChange(e.target.value)}
					placeholder={`ALLOW view, edit ON document WHERE\n  subject.department = resource.department\n  AND subject.roles CONTAINS "editor"`}
					className={`h-48 w-full resize-none rounded-xl border-2 bg-charcoal p-4 font-mono text-sm text-green-400 placeholder:text-charcoal/30 focus:outline-none ${
						error ? 'border-terracotta' : 'border-charcoal/20 focus:border-charcoal/40'
					}`}
					spellCheck={false}
				/>

				{/* Syntax highlighting overlay would go here */}
			</div>

			{error && (
				<div className="flex items-center gap-2 rounded-lg bg-terracotta/10 px-3 py-2 text-terracotta">
					<AlertCircle className="h-4 w-4 flex-shrink-0" />
					<span className="font-['DM_Sans'] text-sm">{error}</span>
				</div>
			)}
		</div>
	);
}

interface PolicyEditorProps {
	policy?: PBACPolicy;
	onSave: (policy: PBACPolicy) => void;
	onCancel: () => void;
}

export function PolicyEditor({ policy, onSave, onCancel }: PolicyEditorProps) {
	const [mode, setMode] = useState<'visual' | 'dsl'>('visual');
	const [name, setName] = useState(policy?.name ?? '');
	const [description, setDescription] = useState(policy?.description ?? '');
	const [effect, setEffect] = useState<PolicyEffect>(policy?.effect ?? 'allow');
	const [priority, setPriority] = useState(policy?.priority ?? 100);
	const [rules, setRules] = useState<PBACRule[]>(policy?.rules ?? [{ conditions: [], logic: 'AND' }]);
	const [actions, setActions] = useState<string[]>(policy?.actions ?? []);
	const [resourceTypes, setResourceTypes] = useState<string[]>(policy?.resource_types ?? []);
	const [dslText, setDslText] = useState(policy?.dsl_text ?? '');
	const [dslError, setDslError] = useState<string>();
	const [saving, setSaving] = useState(false);

	const addRule = () => {
		setRules([...rules, { conditions: [], logic: 'AND' }]);
	};

	const updateRule = (i: number, rule: PBACRule) => {
		const newRules = [...rules];
		newRules[i] = rule;
		setRules(newRules);
	};

	const removeRule = (i: number) => {
		setRules(rules.filter((_, idx) => idx !== i));
	};

	const toggleAction = (action: string) => {
		setActions(prev => prev.includes(action) ? prev.filter(a => a !== action) : [...prev, action]);
	};

	const toggleResourceType = (rt: string) => {
		setResourceTypes(prev => prev.includes(rt) ? prev.filter(r => r !== rt) : [...prev, rt]);
	};

	const handleValidateDSL = async () => {
		if (!dslText.trim()) return;
		try {
			const result = await validateDSL(dslText);
			if (result.valid) {
				setDslError(undefined);
			} else {
				setDslError(result.error);
			}
		} catch (err) {
			setDslError('Failed to validate DSL');
		}
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			let savedPolicy: PBACPolicy;

			if (mode === 'dsl' && dslText.trim()) {
				savedPolicy = await createPolicyFromDSL({
					name,
					description,
					dsl_text: dslText,
					priority,
				});
			} else if (policy?.id) {
				savedPolicy = await updatePolicy(policy.id, {
					name,
					description,
					effect,
					priority,
					rules,
					actions,
					resource_types: resourceTypes,
				});
			} else {
				savedPolicy = await createPolicy({
					name,
					description,
					effect,
					priority,
					rules,
					actions,
					resource_types: resourceTypes,
				});
			}

			onSave(savedPolicy);
		} catch (err) {
			console.error('Failed to save policy:', err);
		} finally {
			setSaving(false);
		}
	};

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 p-4 backdrop-blur-sm"
		>
			<motion.div
				initial={{ scale: 0.95, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border-2 border-charcoal/10 bg-cream shadow-2xl"
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-charcoal/10 bg-parchment px-6 py-4">
					<div className="flex items-center gap-3">
						{effect === 'allow' ? (
							<Shield className="h-6 w-6 text-sage" />
						) : (
							<ShieldOff className="h-6 w-6 text-terracotta" />
						)}
						<h2 className="font-['Newsreader'] text-xl font-semibold text-charcoal">
							{policy ? 'Edit Policy' : 'Create Policy'}
						</h2>
					</div>

					<button
						onClick={onCancel}
						className="rounded-lg p-2 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Mode Toggle */}
				<div className="flex gap-2 border-b border-charcoal/10 bg-cream/50 px-6 py-3">
					<button
						onClick={() => setMode('visual')}
						className={`flex items-center gap-2 rounded-lg px-4 py-2 font-['DM_Sans'] text-sm font-medium transition-colors ${
							mode === 'visual' ? 'bg-charcoal text-cream' : 'text-charcoal/60 hover:bg-charcoal/5'
						}`}
					>
						<Eye className="h-4 w-4" /> Visual Builder
					</button>
					<button
						onClick={() => setMode('dsl')}
						className={`flex items-center gap-2 rounded-lg px-4 py-2 font-['DM_Sans'] text-sm font-medium transition-colors ${
							mode === 'dsl' ? 'bg-charcoal text-cream' : 'text-charcoal/60 hover:bg-charcoal/5'
						}`}
					>
						<Code className="h-4 w-4" /> DSL Editor
					</button>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-6">
					<div className="space-y-6">
						{/* Basic Info */}
						<div className="grid gap-4 sm:grid-cols-2">
							<div>
								<label className="mb-1 block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
									Policy Name
								</label>
								<input
									type="text"
									value={name}
									onChange={(e) => setName(e.target.value)}
									placeholder="e.g., Department Document Access"
									className="w-full rounded-lg border-2 border-charcoal/10 bg-parchment px-4 py-2.5 font-['DM_Sans'] text-charcoal placeholder:text-charcoal/30 focus:border-charcoal/30 focus:outline-none"
								/>
							</div>

							<div className="flex gap-3">
								<div className="flex-1">
									<label className="mb-1 block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
										Effect
									</label>
									<select
										value={effect}
										onChange={(e) => setEffect(e.target.value as PolicyEffect)}
										className="w-full rounded-lg border-2 border-charcoal/10 bg-parchment px-4 py-2.5 font-['DM_Sans'] text-charcoal focus:border-charcoal/30 focus:outline-none"
									>
										<option value="allow">ALLOW</option>
										<option value="deny">DENY</option>
									</select>
								</div>
								<div className="w-24">
									<label className="mb-1 block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
										Priority
									</label>
									<input
										type="number"
										value={priority}
										onChange={(e) => setPriority(Number(e.target.value))}
										min={0}
										max={1000}
										className="w-full rounded-lg border-2 border-charcoal/10 bg-parchment px-3 py-2.5 font-['DM_Sans'] text-charcoal focus:border-charcoal/30 focus:outline-none"
									/>
								</div>
							</div>
						</div>

						<div>
							<label className="mb-1 block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
								Description
							</label>
							<input
								type="text"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="Brief description of what this policy does..."
								className="w-full rounded-lg border-2 border-charcoal/10 bg-parchment px-4 py-2.5 font-['DM_Sans'] text-charcoal placeholder:text-charcoal/30 focus:border-charcoal/30 focus:outline-none"
							/>
						</div>

						{mode === 'visual' ? (
							<>
								{/* Actions */}
								<div>
									<label className="mb-2 block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
										Actions
									</label>
									<div className="flex flex-wrap gap-2">
										{COMMON_ACTIONS.map(action => (
											<button
												key={action}
												onClick={() => toggleAction(action)}
												className={`rounded-lg px-3 py-1.5 font-['DM_Sans'] text-sm font-medium transition-colors ${
													actions.includes(action)
														? 'bg-charcoal text-cream'
														: 'bg-charcoal/5 text-charcoal/60 hover:bg-charcoal/10'
												}`}
											>
												{action}
											</button>
										))}
									</div>
								</div>

								{/* Resource Types */}
								<div>
									<label className="mb-2 block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
										Resource Types
									</label>
									<div className="flex flex-wrap gap-2">
										{COMMON_RESOURCES.map(rt => (
											<button
												key={rt}
												onClick={() => toggleResourceType(rt)}
												className={`rounded-lg px-3 py-1.5 font-['DM_Sans'] text-sm font-medium transition-colors ${
													resourceTypes.includes(rt)
														? 'bg-gold text-charcoal'
														: 'bg-gold/10 text-gold hover:bg-gold/20'
												}`}
											>
												{rt}
											</button>
										))}
									</div>
								</div>

								{/* Rules */}
								<div>
									<label className="mb-2 block font-['DM_Sans'] text-sm font-medium text-charcoal/70">
										Conditions (any rule matching grants access)
									</label>
									<div className="space-y-3">
										{rules.map((rule, i) => (
											<RuleEditor
												key={i}
												rule={rule}
												index={i}
												onChange={(r) => updateRule(i, r)}
												onRemove={() => removeRule(i)}
											/>
										))}

										<button
											onClick={addRule}
											className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-charcoal/20 py-4 font-['DM_Sans'] text-sm font-medium text-charcoal/50 transition-colors hover:border-charcoal/30 hover:text-charcoal/70"
										>
											<Plus className="h-4 w-4" /> Add Rule
										</button>
									</div>
								</div>
							</>
						) : (
							<DSLEditor
								dslText={dslText}
								onChange={(text) => { setDslText(text); setDslError(undefined); }}
								error={dslError}
							/>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-between border-t border-charcoal/10 bg-parchment px-6 py-4">
					{mode === 'dsl' && (
						<button
							onClick={handleValidateDSL}
							className="flex items-center gap-2 rounded-lg bg-charcoal/5 px-4 py-2 font-['DM_Sans'] text-sm font-medium text-charcoal transition-colors hover:bg-charcoal/10"
						>
							<Code className="h-4 w-4" /> Validate DSL
						</button>
					)}
					{mode !== 'dsl' && <div />}

					<div className="flex gap-3">
						<button
							onClick={onCancel}
							className="rounded-lg px-4 py-2 font-['DM_Sans'] text-sm font-medium text-charcoal/60 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
						>
							Cancel
						</button>
						<button
							onClick={handleSave}
							disabled={saving || !name.trim() || (mode === 'visual' && (actions.length === 0 || resourceTypes.length === 0))}
							className="flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 font-['DM_Sans'] text-sm font-medium text-cream transition-colors hover:bg-charcoal/90 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<Save className="h-4 w-4" /> {saving ? 'Saving...' : 'Save Policy'}
						</button>
					</div>
				</div>
			</motion.div>
		</motion.div>
	);
}
