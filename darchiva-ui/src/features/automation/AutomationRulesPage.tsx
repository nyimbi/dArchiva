import { useState } from 'react';
import {
	Badge,
	Box,
	Button,
	Dialog,
	Flex,
	Heading,
	IconButton,
	ScrollArea,
	Select,
	Spinner,
	Switch,
	Table,
	Text,
	TextField,
	TextArea,
} from '@radix-ui/themes';
import {
	PlusIcon,
	Pencil1Icon,
	TrashIcon,
	PlayIcon,
	Cross2Icon,
} from '@radix-ui/react-icons';
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
				<Flex gap="2" direction="column">
					<TextField.Root
						placeholder="User ID"
						value={(params.user_id as string) ?? ''}
						onChange={e => update('user_id', e.target.value)}
					/>
					<TextField.Root
						placeholder="Title"
						value={(params.title as string) ?? ''}
						onChange={e => update('title', e.target.value)}
					/>
					<TextField.Root
						placeholder="Message"
						value={(params.message as string) ?? ''}
						onChange={e => update('message', e.target.value)}
					/>
				</Flex>
			);
		case 'route_to_folder':
			return (
				<TextField.Root
					placeholder="Folder ID"
					value={(params.folder_id as string) ?? ''}
					onChange={e => update('folder_id', e.target.value)}
				/>
			);
		case 'apply_tag':
			return (
				<TextField.Root
					placeholder="Tag ID"
					value={(params.tag_id as string) ?? ''}
					onChange={e => update('tag_id', e.target.value)}
				/>
			);
		case 'set_document_type':
			return (
				<TextField.Root
					placeholder="Document Type ID"
					value={(params.document_type_id as string) ?? ''}
					onChange={e => update('document_type_id', e.target.value)}
				/>
			);
		case 'assign_approval_workflow':
			return (
				<TextField.Root
					placeholder="Workflow Name"
					value={(params.workflow_name as string) ?? ''}
					onChange={e => update('workflow_name', e.target.value)}
				/>
			);
		case 'send_webhook':
			return (
				<TextField.Root
					placeholder="Webhook URL"
					value={(params.url as string) ?? ''}
					onChange={e => update('url', e.target.value)}
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
		<Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
			<Dialog.Content style={{ maxWidth: 700, maxHeight: '90vh' }}>
				<Dialog.Title>{existing ? 'Edit Rule' : 'New Automation Rule'}</Dialog.Title>

				<ScrollArea style={{ maxHeight: 'calc(90vh - 120px)' }}>
					<Flex direction="column" gap="4" p="2">
						{/* Name & description */}
						<Flex direction="column" gap="2">
							<Text size="2" weight="medium">Name</Text>
							<TextField.Root
								placeholder="Rule name"
								value={name}
								onChange={e => setName(e.target.value)}
							/>
						</Flex>

						<Flex direction="column" gap="2">
							<Text size="2" weight="medium">Description</Text>
							<TextArea
								placeholder="Optional description"
								value={description}
								onChange={e => setDescription(e.target.value)}
								rows={2}
							/>
						</Flex>

						{/* Trigger */}
						<Flex direction="column" gap="2">
							<Text size="2" weight="medium">Trigger Event</Text>
							<Select.Root
								value={trigger}
								onValueChange={v => setTrigger(v as TriggerEvent)}
							>
								<Select.Trigger />
								<Select.Content>
									{Object.entries(TRIGGER_LABELS).map(([val, label]) => (
										<Select.Item key={val} value={val}>
											{label}
										</Select.Item>
									))}
								</Select.Content>
							</Select.Root>
						</Flex>

						{/* Conditions */}
						<Flex direction="column" gap="2">
							<Flex justify="between" align="center">
								<Text size="2" weight="medium">Conditions (AND)</Text>
								<Button size="1" variant="soft" onClick={addCondition}>
									<PlusIcon /> Add
								</Button>
							</Flex>
							{conditions.length === 0 && (
								<Text size="1" color="gray">No conditions — rule fires on every matching event.</Text>
							)}
							{conditions.map((cond, i) => (
								<Flex key={i} gap="2" align="center">
									<Select.Root
										value={cond.field}
										onValueChange={v => updateCondition(i, { field: v as ConditionField })}
									>
										<Select.Trigger style={{ flex: 1 }} />
										<Select.Content>
											{CONDITION_FIELDS.map(f => (
												<Select.Item key={f.value} value={f.value}>{f.label}</Select.Item>
											))}
										</Select.Content>
									</Select.Root>

									<Select.Root
										value={cond.operator}
										onValueChange={v => updateCondition(i, { operator: v as ConditionOperator })}
									>
										<Select.Trigger style={{ flex: 1 }} />
										<Select.Content>
											{CONDITION_OPERATORS.map(op => (
												<Select.Item key={op.value} value={op.value}>{op.label}</Select.Item>
											))}
										</Select.Content>
									</Select.Root>

									<TextField.Root
										placeholder="Value"
										value={cond.value}
										onChange={e => updateCondition(i, { value: e.target.value })}
										style={{ flex: 1 }}
									/>

									<IconButton
										size="1"
										variant="ghost"
										color="red"
										onClick={() => removeCondition(i)}
									>
										<Cross2Icon />
									</IconButton>
								</Flex>
							))}
						</Flex>

						{/* Actions */}
						<Flex direction="column" gap="2">
							<Flex justify="between" align="center">
								<Text size="2" weight="medium">Actions</Text>
								<Button size="1" variant="soft" onClick={addAction}>
									<PlusIcon /> Add
								</Button>
							</Flex>
							{actions.length === 0 && (
								<Text size="1" color="gray">No actions — add at least one.</Text>
							)}
							{actions.map((action, i) => (
								<Box
									key={i}
									p="3"
									style={{
										border: '1px solid var(--gray-6)',
										borderRadius: 'var(--radius-2)',
									}}
								>
									<Flex justify="between" align="start" gap="2">
										<Flex direction="column" gap="2" style={{ flex: 1 }}>
											<Select.Root
												value={action.type}
												onValueChange={v =>
													updateAction(i, { type: v as ActionType, params: {} })
												}
											>
												<Select.Trigger />
												<Select.Content>
													{ACTION_TYPES.map(a => (
														<Select.Item key={a.value} value={a.value}>{a.label}</Select.Item>
													))}
												</Select.Content>
											</Select.Root>
											<ActionParamsEditor
												actionType={action.type}
												params={action.params}
												onChange={params => updateAction(i, { params })}
											/>
										</Flex>
										<IconButton
											size="1"
											variant="ghost"
											color="red"
											onClick={() => removeAction(i)}
										>
											<Cross2Icon />
										</IconButton>
									</Flex>
								</Box>
							))}
						</Flex>

						{/* Enable toggle */}
						<Flex align="center" gap="3">
							<Switch checked={isActive} onCheckedChange={setIsActive} />
							<Text size="2">Rule enabled</Text>
						</Flex>

						{/* Test panel (only available when editing an existing rule) */}
						{existing && (
							<Box
								p="3"
								style={{
									border: '1px solid var(--blue-6)',
									borderRadius: 'var(--radius-2)',
									background: 'var(--blue-2)',
								}}
							>
								<Text size="2" weight="medium" color="blue">Test Rule (Dry Run)</Text>
								<Flex gap="2" mt="2" align="center">
									<TextField.Root
										placeholder="Document ID"
										value={testDocId}
										onChange={e => setTestDocId(e.target.value)}
										style={{ flex: 1 }}
									/>
									<Button
										size="2"
										variant="soft"
										onClick={handleTest}
										disabled={!testDocId || testMutation.isPending}
									>
										{testMutation.isPending ? <Spinner /> : <PlayIcon />}
										Run Test
									</Button>
								</Flex>
								{testResults.length > 0 && (
									<Box mt="2">
										<Text size="1" weight="medium">Results:</Text>
										<Box
											p="2"
											mt="1"
											style={{
												background: 'var(--gray-2)',
												borderRadius: 'var(--radius-1)',
												fontFamily: 'monospace',
												fontSize: 11,
												whiteSpace: 'pre-wrap',
												wordBreak: 'break-all',
											}}
										>
											{JSON.stringify(testResults, null, 2)}
										</Box>
									</Box>
								)}
								{testResults.length === 0 && testMutation.isSuccess && (
									<Text size="1" color="gray" mt="2">No rules matched (conditions not met).</Text>
								)}
							</Box>
						)}
					</Flex>
				</ScrollArea>

				<Flex gap="3" justify="end" mt="4">
					<Dialog.Close>
						<Button variant="soft" color="gray">Cancel</Button>
					</Dialog.Close>
					<Button onClick={handleSave} disabled={!name || busy}>
						{busy ? <Spinner /> : null}
						{existing ? 'Save Changes' : 'Create Rule'}
					</Button>
				</Flex>
			</Dialog.Content>
		</Dialog.Root>
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
		<Box p="5">
			<Flex justify="between" align="center" mb="4">
				<Heading size="5">Automation Rules</Heading>
				<Button onClick={openNew}>
					<PlusIcon /> New Rule
				</Button>
			</Flex>

			{isLoading && (
				<Flex justify="center" py="8">
					<Spinner size="3" />
				</Flex>
			)}

			{!isLoading && (!rules || rules.length === 0) && (
				<Flex direction="column" align="center" py="8" gap="2">
					<Text color="gray">No automation rules yet.</Text>
					<Button variant="soft" onClick={openNew}>
						<PlusIcon /> Create your first rule
					</Button>
				</Flex>
			)}

			{rules && rules.length > 0 && (
				<Table.Root variant="surface">
					<Table.Header>
						<Table.Row>
							<Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Trigger</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Conditions</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Runs</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Last Run</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
							<Table.ColumnHeaderCell>Actions</Table.ColumnHeaderCell>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{rules.map(rule => (
							<Table.Row key={rule.id}>
								<Table.Cell>
									<Flex direction="column">
										<Text size="2" weight="medium">{rule.name}</Text>
										{rule.description && (
											<Text size="1" color="gray">{rule.description}</Text>
										)}
									</Flex>
								</Table.Cell>
								<Table.Cell>
									<Badge color="blue" variant="soft">
										{TRIGGER_LABELS[rule.trigger_event] ?? rule.trigger_event}
									</Badge>
								</Table.Cell>
								<Table.Cell>
									<Text size="2">{rule.conditions.length}</Text>
								</Table.Cell>
								<Table.Cell>
									<Text size="2">{rule.actions.length}</Text>
								</Table.Cell>
								<Table.Cell>
									<Text size="2">{rule.run_count}</Text>
								</Table.Cell>
								<Table.Cell>
									<Text size="2" color="gray">
										{rule.last_run_at
											? new Date(rule.last_run_at).toLocaleString()
											: 'Never'}
									</Text>
								</Table.Cell>
								<Table.Cell>
									<Switch
										checked={rule.is_active}
										onCheckedChange={() => handleToggle(rule)}
										disabled={updateMutation.isPending}
									/>
								</Table.Cell>
								<Table.Cell>
									<Flex gap="2">
										<IconButton
											size="1"
											variant="ghost"
											onClick={() => openEdit(rule)}
										>
											<Pencil1Icon />
										</IconButton>
										<IconButton
											size="1"
											variant="ghost"
											color="red"
											onClick={() => handleDelete(rule.id)}
											disabled={deleteMutation.isPending}
										>
											<TrashIcon />
										</IconButton>
									</Flex>
								</Table.Cell>
							</Table.Row>
						))}
					</Table.Body>
				</Table.Root>
			)}

			{dialogOpen && (
				<RuleBuilderDialog
					open={dialogOpen}
					onClose={() => setDialogOpen(false)}
					existing={editing}
				/>
			)}
		</Box>
	);
}
