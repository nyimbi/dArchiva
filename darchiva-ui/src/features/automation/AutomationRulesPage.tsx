import { useState } from 'react';
import { Loader2, Pencil, Play, Plus, Trash2, X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

import type {
	Action,
	ActionType,
	AutomationRule,
	Condition,
	ConditionField,
	ConditionOperator,
	CreateRulePayload,
	TriggerEvent,
} from './api';
import {
	useAutomationRules,
	useCreateAutomationRule,
	useDeleteAutomationRule,
	useTestAutomationRule,
	useUpdateAutomationRule,
} from './api';

// ── Constants ─────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<TriggerEvent, string> = {
	'document.classified': 'Document Classified',
	'document.uploaded': 'Document Uploaded',
	'document.expiring': 'Document Expiring',
	'scan.batch_complete': 'Scan Batch Complete',
};

const CONDITION_FIELDS: { value: ConditionField | string; label: string }[] = [
	{ value: 'document_type', label: 'Document Type' },
	{ value: 'tag_id', label: 'Tag ID' },
	{ value: 'page_count', label: 'Page Count' },
	{ value: 'confidence_score', label: 'Confidence Score' },
];

const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
	{ value: 'equals', label: 'Equals' },
	{ value: 'not_equals', label: 'Not Equals' },
	{ value: 'contains', label: 'Contains' },
	{ value: 'greater_than', label: 'Greater Than' },
	{ value: 'less_than', label: 'Less Than' },
];

const ACTION_TYPES: { value: ActionType; label: string }[] = [
	{ value: 'notify_user', label: 'Notify User' },
	{ value: 'route_to_folder', label: 'Route to Folder' },
	{ value: 'apply_tag', label: 'Apply Tag' },
	{ value: 'assign_approval_workflow', label: 'Assign Approval Workflow' },
	{ value: 'set_document_type', label: 'Set Document Type' },
	{ value: 'send_webhook', label: 'Send Webhook' },
];

// ── Action Params Editor ───────────────────────────────────────────────────────

function ActionParamsEditor({
	actionType,
	params,
	onChange,
}: {
	actionType: ActionType | string;
	params: Record<string, unknown>;
	onChange: (params: Record<string, unknown>) => void;
}) {
	const update = (key: string, value: string) => onChange({ ...params, [key]: value });

	switch (actionType) {
		case 'notify_user':
			return (
				<div className="flex flex-col gap-2">
					<Input
						placeholder="User ID"
						value={(params.user_id as string) ?? ''}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('user_id', e.target.value)}
					/>
					<Input
						placeholder="Title"
						value={(params.title as string) ?? ''}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('title', e.target.value)}
					/>
					<Input
						placeholder="Message"
						value={(params.message as string) ?? ''}
						onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('message', e.target.value)}
					/>
				</div>
			);
		case 'route_to_folder':
			return (
				<Input
					placeholder="Folder ID"
					value={(params.folder_id as string) ?? ''}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('folder_id', e.target.value)}
				/>
			);
		case 'apply_tag':
			return (
				<Input
					placeholder="Tag ID"
					value={(params.tag_id as string) ?? ''}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('tag_id', e.target.value)}
				/>
			);
		case 'set_document_type':
			return (
				<Input
					placeholder="Document Type ID"
					value={(params.document_type_id as string) ?? ''}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('document_type_id', e.target.value)}
				/>
			);
		case 'assign_approval_workflow':
			return (
				<Input
					placeholder="Workflow Name"
					value={(params.workflow_name as string) ?? ''}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('workflow_name', e.target.value)}
				/>
			);
		case 'send_webhook':
			return (
				<Input
					placeholder="Webhook URL"
					value={(params.url as string) ?? ''}
					onChange={(e: React.ChangeEvent<HTMLInputElement>) => update('url', e.target.value)}
				/>
			);
		default:
			return null;
	}
}

// ── Rule Builder Dialog ────────────────────────────────────────────────────────

interface RuleBuilderDialogProps {
	open: boolean;
	onClose: () => void;
	existing?: AutomationRule | null;
}

function RuleBuilderDialog({ open, onClose, existing }: RuleBuilderDialogProps) {
	const [name, setName] = useState(existing?.name ?? '');
	const [description, setDescription] = useState(existing?.description ?? '');
	const [trigger, setTrigger] = useState<TriggerEvent>(
		existing?.trigger_event ?? 'document.uploaded',
	);
	const [conditions, setConditions] = useState<Condition[]>(
		existing?.conditions ?? [],
	);
	const [actions, setActions] = useState<Action[]>(existing?.actions ?? []);
	const [isActive, setIsActive] = useState(existing?.is_active ?? true);
	const [testDocId, setTestDocId] = useState('');
	const [testResults, setTestResults] = useState<unknown[]>([]);

	const createMutation = useCreateAutomationRule();
	const updateMutation = useUpdateAutomationRule();
	const testMutation = useTestAutomationRule(existing?.id ?? '');

	const busy = createMutation.isPending || updateMutation.isPending;

	const addCondition = () =>
		setConditions(prev => [
			...prev,
			{ field: 'document_type', operator: 'equals', value: '' },
		]);

	const removeCondition = (i: number) =>
		setConditions(prev => prev.filter((_, idx) => idx !== i));

	const updateCondition = (i: number, patch: Partial<Condition>) =>
		setConditions(prev =>
			prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
		);

	const addAction = () =>
		setActions(prev => [...prev, { type: 'notify_user', params: {} }]);

	const removeAction = (i: number) =>
		setActions(prev => prev.filter((_, idx) => idx !== i));

	const updateAction = (i: number, patch: Partial<Action>) =>
		setActions(prev =>
			prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
		);

	const handleSave = async () => {
		const payload: CreateRulePayload = {
			name,
			description,
			trigger_event: trigger,
			conditions,
			actions,
			is_active: isActive,
		};
		if (existing) {
			await updateMutation.mutateAsync({ id: existing.id, payload });
		} else {
			await createMutation.mutateAsync(payload);
		}
		onClose();
	};

	const handleTest = async () => {
		if (!existing?.id || !testDocId) return;
		const results = await testMutation.mutateAsync({ document_id: testDocId });
		setTestResults(results);
	};

	return (
		<Dialog open={open} onOpenChange={(v: boolean) => !v && onClose()}>
			<DialogContent className="max-w-[700px] max-h-[90vh] flex flex-col">
				<DialogHeader>
					<DialogTitle>{existing ? 'Edit Rule' : 'New Automation Rule'}</DialogTitle>
				</DialogHeader>

				<div className="flex-1 overflow-y-auto">
					<div className="flex flex-col gap-4 p-2">
						{/* Name & description */}
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium">Name</span>
							<Input
								placeholder="Rule name"
								value={name}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
							/>
						</div>

						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium">Description</span>
							<Textarea
								placeholder="Optional description"
								value={description}
								onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
								rows={2}
							/>
						</div>

						{/* Trigger */}
						<div className="flex flex-col gap-2">
							<span className="text-sm font-medium">Trigger Event</span>
							<Select
								value={trigger}
								onValueChange={(v: string) => setTrigger(v as TriggerEvent)}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{Object.entries(TRIGGER_LABELS).map(([val, label]) => (
										<SelectItem key={val} value={val}>
											{label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Conditions */}
						<div className="flex flex-col gap-2">
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium">Conditions (AND)</span>
								<Button size="sm" variant="outline" onClick={addCondition}>
									<Plus className="h-3 w-3 mr-1" /> Add
								</Button>
							</div>
							{conditions.length === 0 && (
								<span className="text-xs text-muted-foreground">No conditions — rule fires on every matching event.</span>
							)}
							{conditions.map((cond, i) => (
								<div key={i} className="flex gap-2 items-center">
									<Select
										value={cond.field}
										onValueChange={(v: string) => updateCondition(i, { field: v as ConditionField })}
									>
										<SelectTrigger className="flex-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{CONDITION_FIELDS.map(f => (
												<SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
											))}
										</SelectContent>
									</Select>

									<Select
										value={cond.operator}
										onValueChange={(v: string) => updateCondition(i, { operator: v as ConditionOperator })}
									>
										<SelectTrigger className="flex-1">
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{CONDITION_OPERATORS.map(op => (
												<SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
											))}
										</SelectContent>
									</Select>

									<Input
										placeholder="Value"
										value={cond.value}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateCondition(i, { value: e.target.value })}
										className="flex-1"
									/>

									<Button
										size="icon"
										variant="ghost"
										className="text-destructive hover:text-destructive"
										onClick={() => removeCondition(i)}
									>
										<X className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>

						{/* Actions */}
						<div className="flex flex-col gap-2">
							<div className="flex justify-between items-center">
								<span className="text-sm font-medium">Actions</span>
								<Button size="sm" variant="outline" onClick={addAction}>
									<Plus className="h-3 w-3 mr-1" /> Add
								</Button>
							</div>
							{actions.length === 0 && (
								<span className="text-xs text-muted-foreground">No actions — add at least one.</span>
							)}
							{actions.map((action, i) => (
								<div
									key={i}
									className="p-3 border rounded-md"
								>
									<div className="flex justify-between items-start gap-2">
										<div className="flex flex-col gap-2 flex-1">
											<Select
												value={action.type}
												onValueChange={(v: string) =>
													updateAction(i, { type: v as ActionType, params: {} })
												}
											>
												<SelectTrigger>
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{ACTION_TYPES.map(a => (
														<SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
													))}
												</SelectContent>
											</Select>
											<ActionParamsEditor
												actionType={action.type}
												params={action.params}
												onChange={params => updateAction(i, { params })}
											/>
										</div>
										<Button
											size="icon"
											variant="ghost"
											className="text-destructive hover:text-destructive"
											onClick={() => removeAction(i)}
										>
											<X className="h-4 w-4" />
										</Button>
									</div>
								</div>
							))}
						</div>

						{/* Enable toggle */}
						<div className="flex items-center gap-3">
							<Switch checked={isActive} onCheckedChange={setIsActive} />
							<span className="text-sm">Rule enabled</span>
						</div>

						{/* Test panel (only available when editing an existing rule) */}
						{existing && (
							<div className="p-3 border border-blue-200 rounded-md bg-blue-50">
								<span className="text-sm font-medium text-blue-700">Test Rule (Dry Run)</span>
								<div className="flex gap-2 mt-2 items-center">
									<Input
										placeholder="Document ID"
										value={testDocId}
										onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTestDocId(e.target.value)}
										className="flex-1"
									/>
									<Button
										size="default"
										variant="outline"
										onClick={handleTest}
										disabled={!testDocId || testMutation.isPending}
									>
										{testMutation.isPending
											? <Loader2 className="h-4 w-4 animate-spin mr-1" />
											: <Play className="h-4 w-4 mr-1" />}
										Run Test
									</Button>
								</div>
								{testResults.length > 0 && (
									<div className="mt-2">
										<span className="text-xs font-medium">Results:</span>
										<pre className="mt-1 p-2 bg-muted rounded text-xs whitespace-pre-wrap break-all">
											{JSON.stringify(testResults, null, 2)}
										</pre>
									</div>
								)}
								{testResults.length === 0 && testMutation.isSuccess && (
									<span className="text-xs text-muted-foreground mt-2 block">No rules matched (conditions not met).</span>
								)}
							</div>
						)}
					</div>
				</div>

				<DialogFooter className="mt-4">
					<DialogClose asChild>
						<Button variant="outline">Cancel</Button>
					</DialogClose>
					<Button onClick={handleSave} disabled={!name || busy}>
						{busy && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
						{existing ? 'Save Changes' : 'Create Rule'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function AutomationRulesPage() {
	const { data: rules, isLoading } = useAutomationRules();
	const updateMutation = useUpdateAutomationRule();
	const deleteMutation = useDeleteAutomationRule();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editing, setEditing] = useState<AutomationRule | null>(null);

	const handleToggle = (rule: AutomationRule) => {
		updateMutation.mutate({ id: rule.id, payload: { is_active: !rule.is_active } });
	};

	const handleDelete = (id: string) => {
		if (confirm('Delete this automation rule?')) {
			deleteMutation.mutate(id);
		}
	};

	const openNew = () => {
		setEditing(null);
		setDialogOpen(true);
	};

	const openEdit = (rule: AutomationRule) => {
		setEditing(rule);
		setDialogOpen(true);
	};

	return (
		<div className="p-5">
			<div className="flex justify-between items-center mb-4">
				<h2 className="text-xl font-semibold">Automation Rules</h2>
				<Button onClick={openNew}>
					<Plus className="h-4 w-4 mr-1" /> New Rule
				</Button>
			</div>

			{isLoading && (
				<div className="flex justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
				</div>
			)}

			{!isLoading && (!rules || rules.length === 0) && (
				<div className="flex flex-col items-center py-8 gap-2">
					<span className="text-muted-foreground">No automation rules yet.</span>
					<Button variant="outline" onClick={openNew}>
						<Plus className="h-4 w-4 mr-1" /> Create your first rule
					</Button>
				</div>
			)}

			{rules && rules.length > 0 && (
				<div className="rounded-md border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Trigger</TableHead>
								<TableHead>Conditions</TableHead>
								<TableHead>Actions</TableHead>
								<TableHead>Runs</TableHead>
								<TableHead>Last Run</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{rules.map(rule => (
								<TableRow key={rule.id}>
									<TableCell>
										<div className="flex flex-col">
											<span className="text-sm font-medium">{rule.name}</span>
											{rule.description && (
												<span className="text-xs text-muted-foreground">{rule.description}</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<Badge variant="secondary">
											{TRIGGER_LABELS[rule.trigger_event] ?? rule.trigger_event}
										</Badge>
									</TableCell>
									<TableCell>
										<span className="text-sm">{rule.conditions.length}</span>
									</TableCell>
									<TableCell>
										<span className="text-sm">{rule.actions.length}</span>
									</TableCell>
									<TableCell>
										<span className="text-sm">{rule.run_count}</span>
									</TableCell>
									<TableCell>
										<span className="text-sm text-muted-foreground">
											{rule.last_run_at
												? new Date(rule.last_run_at).toLocaleString()
												: 'Never'}
										</span>
									</TableCell>
									<TableCell>
										<Switch
											checked={rule.is_active}
											onCheckedChange={() => handleToggle(rule)}
											disabled={updateMutation.isPending}
										/>
									</TableCell>
									<TableCell>
										<div className="flex gap-2">
											<Button
												size="icon"
												variant="ghost"
												onClick={() => openEdit(rule)}
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												size="icon"
												variant="ghost"
												className="text-destructive hover:text-destructive"
												onClick={() => handleDelete(rule.id)}
												disabled={deleteMutation.isPending}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{dialogOpen && (
				<RuleBuilderDialog
					open={dialogOpen}
					onClose={() => setDialogOpen(false)}
					existing={editing}
				/>
			)}
		</div>
	);
}
