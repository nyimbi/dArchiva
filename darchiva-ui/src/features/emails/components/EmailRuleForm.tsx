// (c) Copyright Datacraft, 2026
/**
 * Email rule configuration form.
 */
import { useState } from 'react';
import { Plus, Trash2, GripVertical, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useCreateEmailRule, useUpdateEmailRule } from '../api';
import type { EmailRule, RuleCondition, RuleAction, EmailRuleCreate } from '../types';

const CONDITION_FIELDS = [
	{ value: 'from', label: 'From Address' },
	{ value: 'to', label: 'To Address' },
	{ value: 'cc', label: 'CC Address' },
	{ value: 'subject', label: 'Subject' },
	{ value: 'body', label: 'Body' },
	{ value: 'attachment_name', label: 'Attachment Name' },
	{ value: 'attachment_type', label: 'Attachment Type' },
];

const CONDITION_OPERATORS = [
	{ value: 'equals', label: 'Equals' },
	{ value: 'contains', label: 'Contains' },
	{ value: 'starts_with', label: 'Starts With' },
	{ value: 'ends_with', label: 'Ends With' },
	{ value: 'matches', label: 'Matches (Regex)' },
	{ value: 'exists', label: 'Exists' },
];

const ACTIONS = [
	{ value: 'move_to_folder', label: 'Move to Folder', needsValue: true },
	{ value: 'add_tag', label: 'Add Tag', needsValue: true },
	{ value: 'set_document_type', label: 'Set Document Type', needsValue: true },
	{ value: 'skip_import', label: 'Skip Import', needsValue: false },
	{ value: 'extract_attachments_only', label: 'Extract Attachments Only', needsValue: false },
	{ value: 'notify', label: 'Send Notification', needsValue: true },
];

interface EmailRuleFormProps {
	rule?: EmailRule;
	accountId?: string;
	onSuccess?: () => void;
	onCancel?: () => void;
}

export function EmailRuleForm({ rule, accountId, onSuccess, onCancel }: EmailRuleFormProps) {
	const { toast } = useToast();

	const [name, setName] = useState(rule?.name ?? '');
	const [description, setDescription] = useState(rule?.description ?? '');
	const [isActive, setIsActive] = useState(rule?.is_active ?? true);
	const [priority, setPriority] = useState(rule?.priority ?? 100);
	const [conditions, setConditions] = useState<RuleCondition[]>(
		rule?.conditions ?? [{ field: 'from', operator: 'contains', value: '' }]
	);
	const [actions, setActions] = useState<RuleAction[]>(
		rule?.actions ?? [{ action: 'move_to_folder', value: '' }]
	);

	const createMutation = useCreateEmailRule();
	const updateMutation = useUpdateEmailRule();

	const addCondition = () => {
		setConditions([...conditions, { field: 'from', operator: 'contains', value: '' }]);
	};

	const removeCondition = (index: number) => {
		setConditions(conditions.filter((_, i) => i !== index));
	};

	const updateCondition = (index: number, updates: Partial<RuleCondition>) => {
		setConditions(conditions.map((c, i) => (i === index ? { ...c, ...updates } : c)));
	};

	const addAction = () => {
		setActions([...actions, { action: 'add_tag', value: '' }]);
	};

	const removeAction = (index: number) => {
		setActions(actions.filter((_, i) => i !== index));
	};

	const updateAction = (index: number, updates: Partial<RuleAction>) => {
		setActions(actions.map((a, i) => (i === index ? { ...a, ...updates } : a)));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!name.trim()) {
			toast({ title: 'Name is required', variant: 'destructive' });
			return;
		}

		if (conditions.length === 0) {
			toast({ title: 'At least one condition is required', variant: 'destructive' });
			return;
		}

		if (actions.length === 0) {
			toast({ title: 'At least one action is required', variant: 'destructive' });
			return;
		}

		const payload: EmailRuleCreate = {
			name,
			description: description || undefined,
			account_id: accountId,
			is_active: isActive,
			priority,
			conditions: conditions as RuleCondition[],
			actions: actions as RuleAction[],
		};

		try {
			if (rule) {
				await updateMutation.mutateAsync({ ruleId: rule.id, data: payload });
				toast({ title: 'Rule updated successfully' });
			} else {
				await createMutation.mutateAsync(payload);
				toast({ title: 'Rule created successfully' });
			}
			onSuccess?.();
		} catch (error) {
			toast({
				title: 'Error',
				description: 'Failed to save rule',
				variant: 'destructive',
			});
		}
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6">
			{/* Basic Info */}
			<Card>
				<CardHeader>
					<CardTitle>Rule Details</CardTitle>
					<CardDescription>Configure the rule name and settings</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="name">Rule Name</Label>
							<Input
								id="name"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g., Archive Invoices"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="priority">Priority</Label>
							<Input
								id="priority"
								type="number"
								value={priority}
								onChange={(e) => setPriority(Number(e.target.value))}
								min={1}
								max={1000}
							/>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">Description</Label>
						<Textarea
							id="description"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="Describe what this rule does..."
							rows={2}
						/>
					</div>

					<div className="flex items-center space-x-2">
						<Switch id="active" checked={isActive} onCheckedChange={setIsActive} />
						<Label htmlFor="active">Rule is active</Label>
					</div>
				</CardContent>
			</Card>

			{/* Conditions */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Conditions</CardTitle>
							<CardDescription>All conditions must match (AND logic)</CardDescription>
						</div>
						<Button type="button" variant="outline" size="sm" onClick={addCondition}>
							<Plus className="h-4 w-4 mr-2" />
							Add Condition
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{conditions.map((condition, index) => (
						<div key={index} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
							<GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

							<Select
								value={condition.field}
								onValueChange={(v) => updateCondition(index, { field: v as RuleCondition['field'] })}
							>
								<SelectTrigger className="w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CONDITION_FIELDS.map((f) => (
										<SelectItem key={f.value} value={f.value}>
											{f.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							<Select
								value={condition.operator}
								onValueChange={(v) => updateCondition(index, { operator: v as RuleCondition['operator'] })}
							>
								<SelectTrigger className="w-36">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{CONDITION_OPERATORS.map((o) => (
										<SelectItem key={o.value} value={o.value}>
											{o.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>

							{condition.operator !== 'exists' && (
								<Input
									className="flex-1"
									value={condition.value ?? ''}
									onChange={(e) => updateCondition(index, { value: e.target.value })}
									placeholder="Value..."
								/>
							)}

							<Button
								type="button"
								variant="ghost"
								size="icon"
								onClick={() => removeCondition(index)}
								disabled={conditions.length === 1}
							>
								<Trash2 className="h-4 w-4 text-destructive" />
							</Button>
						</div>
					))}
				</CardContent>
			</Card>

			{/* Actions */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Actions</CardTitle>
							<CardDescription>Actions to perform when conditions match</CardDescription>
						</div>
						<Button type="button" variant="outline" size="sm" onClick={addAction}>
							<Plus className="h-4 w-4 mr-2" />
							Add Action
						</Button>
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					{actions.map((action, index) => {
						const actionDef = ACTIONS.find((a) => a.value === action.action);

						return (
							<div key={index} className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
								<GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

								<Select
									value={action.action}
									onValueChange={(v) => updateAction(index, { action: v as RuleAction['action'] })}
								>
									<SelectTrigger className="w-48">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{ACTIONS.map((a) => (
											<SelectItem key={a.value} value={a.value}>
												{a.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								{actionDef?.needsValue && (
									<Input
										className="flex-1"
										value={action.value ?? ''}
										onChange={(e) => updateAction(index, { value: e.target.value })}
										placeholder={
											action.action === 'move_to_folder'
												? 'Folder ID'
												: action.action === 'add_tag'
												? 'Tag name'
												: 'Value...'
										}
									/>
								)}

								<Button
									type="button"
									variant="ghost"
									size="icon"
									onClick={() => removeAction(index)}
									disabled={actions.length === 1}
								>
									<Trash2 className="h-4 w-4 text-destructive" />
								</Button>
							</div>
						);
					})}
				</CardContent>
			</Card>

			{/* Form Actions */}
			<div className="flex items-center justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancel
				</Button>
				<Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
					{createMutation.isPending || updateMutation.isPending ? (
						<Loader2 className="h-4 w-4 mr-2 animate-spin" />
					) : null}
					{rule ? 'Save Changes' : 'Create Rule'}
				</Button>
			</div>
		</form>
	);
}
