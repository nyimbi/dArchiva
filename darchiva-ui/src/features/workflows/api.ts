// (c) Copyright Datacraft, 2026
/**
 * Workflow API client.
 *
 * The backend exposes step-based workflow definitions. The frontend uses
 * visual nodes/edges, so this module maps between both representations.
 */
import { apiClient } from '@/lib/api-client';
import type {
  Workflow,
  WorkflowEdge,
  WorkflowExecution,
  WorkflowNode,
  WorkflowTemplate,
} from './types';

const API_BASE = '/workflows';

const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
	return typeof value === 'string' && UUID_RE.test(value);
}

// Backend workflow types (step-based)
export interface WorkflowStep {
	id: string;
	name: string;
	step_order: number;
	assignee_type: 'user' | 'role' | 'group';
	assignee_id?: string;
	deadline_hours?: number;
}

interface BackendWorkflowSummary {
	id: string;
	name: string;
	description?: string;
	is_active: boolean;
	created_at?: string;
}

interface BackendWorkflowDetail extends BackendWorkflowSummary {
	steps?: WorkflowStep[];
}

interface BackendWorkflowExecution {
	id: string;
	workflow_id: string;
	workflow_name?: string | null;
	document_id: string;
	status: string;
	current_step_id?: string | null;
	started_at?: string | null;
	completed_at?: string | null;
	prefect_flow_run_id?: string | null;
}

function toFrontendStatus(status: string): WorkflowExecution['status'] {
	switch (status) {
		case 'in_progress':
			return 'running';
		case 'completed':
			return 'completed';
		case 'cancelled':
			return 'cancelled';
		case 'failed':
		case 'rejected':
			return 'failed';
		case 'on_hold':
			return 'on_hold';
		case 'pending':
		default:
			return 'pending';
	}
}

function toWorkflowNodes(steps: WorkflowStep[]): WorkflowNode[] {
	if (steps.length === 0) {
		return [
			{
				id: 'source-1',
				type: 'source',
				label: 'Start',
				config: {},
				position: { x: 120, y: 120 },
			},
		];
	}

	const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
	return sorted.map((step, index) => ({
		id: step.id,
		type: 'approval',
		label: step.name,
		config: {
			assigneeType: step.assignee_type,
			assigneeId: step.assignee_id,
			deadlineHours: step.deadline_hours,
		},
		position: { x: 220 + index * 240, y: 140 },
	}));
}

function toWorkflowEdges(steps: WorkflowStep[]): WorkflowEdge[] {
	const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
	if (sorted.length < 2) return [];

	const edges: WorkflowEdge[] = [];
	for (let i = 0; i < sorted.length - 1; i += 1) {
		edges.push({
			id: `edge-${sorted[i].id}-${sorted[i + 1].id}`,
			source: sorted[i].id,
			target: sorted[i + 1].id,
		});
	}
	return edges;
}

function toWorkflowModel(workflow: BackendWorkflowDetail): Workflow {
	const steps = workflow.steps ?? [];
	return {
		id: workflow.id,
		name: workflow.name,
		description: workflow.description ?? '',
		version: 1,
		status: workflow.is_active ? 'active' : 'archived',
		nodes: toWorkflowNodes(steps),
		edges: toWorkflowEdges(steps),
		trigger: {
			type: 'manual',
			config: {},
		},
		createdAt: workflow.created_at ?? new Date().toISOString(),
		updatedAt: workflow.created_at ?? new Date().toISOString(),
		createdBy: 'system',
	};
}

function toWorkflowExecutionModel(exec: BackendWorkflowExecution): WorkflowExecution {
	return {
		id: exec.id,
		workflowId: exec.workflow_id,
		workflowVersion: 1,
		status: toFrontendStatus(exec.status),
		startTime: exec.started_at ?? new Date().toISOString(),
		endTime: exec.completed_at ?? undefined,
		currentNodeId: exec.current_step_id ?? undefined,
		documentId: exec.document_id,
		error: undefined,
		nodeExecutions: [],
		prefectFlowRunId: exec.prefect_flow_run_id ?? undefined,
	};
}

function toBackendSteps(nodes: WorkflowNode[]): Array<{
	name: string;
	assignee_type: 'user' | 'role' | 'group';
	assignee_id?: string;
	deadline_hours?: number;
}> {
	const sorted = [...nodes]
		.filter((node) => node.type !== 'source')
		.sort((a, b) => a.position.x - b.position.x);

	const effective = sorted.length > 0
		? sorted
		: [{ id: 'generated-step', type: 'approval', label: 'Review', config: {}, position: { x: 0, y: 0 } } as WorkflowNode];

	return effective.map((node, index) => {
		const assigneeTypeRaw = node.config?.assigneeType;
		const assigneeType =
			assigneeTypeRaw === 'role' || assigneeTypeRaw === 'group' ? assigneeTypeRaw : 'user';

		const assigneeIdRaw = node.config?.assigneeId;
		const deadlineRaw = node.config?.deadlineHours;

		const step: {
			name: string;
			assignee_type: 'user' | 'role' | 'group';
			assignee_id?: string;
			deadline_hours?: number;
		} = {
			name: node.label?.trim() || `Step ${index + 1}`,
			assignee_type: assigneeType,
		};

		if (isUuid(assigneeIdRaw)) {
			step.assignee_id = assigneeIdRaw;
		}
		if (typeof deadlineRaw === 'number' && Number.isFinite(deadlineRaw)) {
			step.deadline_hours = Math.max(1, Math.floor(deadlineRaw));
		}

		return step;
	});
}

export interface PendingTask {
	id: string;
	instance_id: string;
	step_name: string;
	document_id: string;
	document_title: string;
	workflow_name: string;
	assigned_at: string;
	deadline?: string;
	priority: 'low' | 'normal' | 'high' | 'urgent';
}

function toPendingTask(raw: Record<string, unknown>): PendingTask {
	const id = String(raw.id ?? '');
	const instanceId = String(raw.instance_id ?? raw.instanceId ?? '');
	const documentId = String(raw.document_id ?? raw.documentId ?? '');
	const assignedAt = String(raw.assigned_at ?? raw.assignedAt ?? raw.started_at ?? new Date().toISOString());
	const deadline = raw.deadline ?? raw.deadline_at ?? raw.deadlineAt;
	const priorityRaw = raw.priority;

	const priority: PendingTask['priority'] =
		priorityRaw === 'low' || priorityRaw === 'high' || priorityRaw === 'urgent'
			? priorityRaw
			: 'normal';

	return {
		id,
		instance_id: instanceId,
		step_name: String(raw.step_name ?? raw.stepName ?? raw.status ?? 'Review'),
		document_id: documentId,
		document_title: String(raw.document_title ?? raw.documentTitle ?? documentId ?? 'Document'),
		workflow_name: String(raw.workflow_name ?? raw.workflowName ?? 'Workflow'),
		assigned_at: assignedAt,
		deadline: typeof deadline === 'string' ? deadline : undefined,
		priority,
	};
}

export interface WorkflowListResponse {
	items: Workflow[];
	total: number;
	page: number;
	page_size: number;
}

export interface WorkflowExecutionListResponse {
	items: WorkflowExecution[];
	total: number;
	page: number;
	page_size: number;
}

export interface WorkflowCreate {
	name: string;
	description?: string;
	nodes: WorkflowNode[];
	edges: WorkflowEdge[];
	trigger?: {
		type: 'document_upload' | 'schedule' | 'manual' | 'api' | 'folder_watch';
		config: Record<string, unknown>;
	};
}

export interface WorkflowUpdate {
	name?: string;
	description?: string;
	status?: 'draft' | 'active' | 'archived';
	nodes?: WorkflowNode[];
	edges?: WorkflowEdge[];
	trigger?: {
		type: 'document_upload' | 'schedule' | 'manual' | 'api' | 'folder_watch';
		config: Record<string, unknown>;
	};
}

// --- Workflows ---

export async function listWorkflows(
	page = 1,
	pageSize = 20,
	status?: string,
): Promise<WorkflowListResponse> {
	const params = new URLSearchParams({
		page: String(page),
		page_size: String(pageSize),
	});

	const response = await apiClient.get<{
		items: BackendWorkflowSummary[];
		total: number;
		page: number;
		page_size: number;
	}>(`${API_BASE}/?${params.toString()}`);

	const mapped = response.data.items.map((item) => toWorkflowModel(item));
	const filtered =
		status != null ? mapped.filter((item) => item.status === status) : mapped;

	return {
		items: filtered,
		total: status != null ? filtered.length : response.data.total,
		page: response.data.page,
		page_size: response.data.page_size,
	};
}

export async function getWorkflow(id: string): Promise<Workflow> {
	const response = await apiClient.get<BackendWorkflowDetail>(`${API_BASE}/${id}`);
	return toWorkflowModel(response.data);
}

export async function createWorkflow(data: WorkflowCreate): Promise<Workflow> {
	const response = await apiClient.post<BackendWorkflowDetail>(API_BASE, {
		name: data.name,
		description: data.description,
		steps: toBackendSteps(data.nodes),
	});
	return toWorkflowModel(response.data);
}

export async function updateWorkflow(id: string, data: WorkflowUpdate): Promise<Workflow> {
	const response = await apiClient.patch<BackendWorkflowDetail>(`${API_BASE}/${id}`, {
		name: data.name,
		description: data.description,
		steps: data.nodes ? toBackendSteps(data.nodes) : undefined,
	});
	return toWorkflowModel(response.data);
}

export async function deleteWorkflow(id: string): Promise<void> {
	await apiClient.delete(`${API_BASE}/${id}`);
}

export async function activateWorkflow(id: string): Promise<Workflow> {
	const response = await apiClient.post<BackendWorkflowDetail>(`${API_BASE}/${id}/activate`, {});
	return toWorkflowModel(response.data);
}

export async function deactivateWorkflow(id: string): Promise<Workflow> {
	const response = await apiClient.post<BackendWorkflowDetail>(
		`${API_BASE}/${id}/deactivate`,
		{},
	);
	return toWorkflowModel(response.data);
}

// --- Executions ---

export async function listExecutions(
	workflowId?: string,
	page = 1,
	pageSize = 20,
	status?: string,
): Promise<WorkflowExecutionListResponse> {
	const params = new URLSearchParams({
		page: String(page),
		page_size: String(pageSize),
	});
	if (workflowId) params.append('workflow_id', workflowId);
	if (status) params.append('status', status);

	const response = await apiClient.get<{
		items: BackendWorkflowExecution[];
		total: number;
		page: number;
		page_size: number;
	}>(`${API_BASE}/executions/?${params.toString()}`);

	return {
		items: response.data.items.map(toWorkflowExecutionModel),
		total: response.data.total,
		page: response.data.page,
		page_size: response.data.page_size,
	};
}

export async function getExecution(id: string): Promise<WorkflowExecution> {
	const response = await apiClient.get<BackendWorkflowExecution>(
		`${API_BASE}/instances/${id}`,
	);
	return toWorkflowExecutionModel(response.data);
}

export async function runWorkflow(
	id: string,
	input?: Record<string, unknown>,
): Promise<WorkflowExecution> {
	const documentId = input?.documentId;
	if (!isUuid(documentId)) {
		throw new Error('A valid documentId is required to start a workflow.');
	}

	const response = await apiClient.post<BackendWorkflowExecution>(`${API_BASE}/${id}/start`, {
		documentId,
		context: input ?? {},
	});
	return toWorkflowExecutionModel(response.data);
}

export async function cancelExecution(executionId: string): Promise<WorkflowExecution> {
	const response = await apiClient.post<BackendWorkflowExecution>(
		`${API_BASE}/instances/${executionId}/cancel`,
		{},
	);
	return toWorkflowExecutionModel(response.data);
}

export async function retryExecution(executionId: string): Promise<WorkflowExecution> {
	const response = await apiClient.post<BackendWorkflowExecution>(
		`${API_BASE}/instances/${executionId}/retry`,
		{},
	);
	return toWorkflowExecutionModel(response.data);
}

// --- Templates ---

interface BackendWorkflowTemplate {
	id: string;
	name: string;
	description?: string;
	steps: WorkflowStep[];
	created_at: string;
	updated_at?: string;
}

function toWorkflowTemplateModel(t: BackendWorkflowTemplate): WorkflowTemplate {
	return {
		id: t.id,
		name: t.name,
		description: t.description ?? '',
		category: 'custom',
		nodes: toWorkflowNodes(t.steps ?? []),
		edges: toWorkflowEdges(t.steps ?? []),
	};
}

export async function listTemplates(): Promise<WorkflowTemplate[]> {
	const response = await apiClient.get<BackendWorkflowTemplate[]>(`${API_BASE}/templates/`);
	return response.data.map(toWorkflowTemplateModel);
}

export async function getTemplate(id: string): Promise<WorkflowTemplate> {
	const response = await apiClient.get<BackendWorkflowTemplate>(`${API_BASE}/templates/${id}`);
	return toWorkflowTemplateModel(response.data);
}

export async function createFromTemplate(
	templateId: string,
	name: string,
	description?: string,
): Promise<Workflow> {
	const response = await apiClient.post<BackendWorkflowDetail>(
		`${API_BASE}/templates/${templateId}/instantiate`,
		{ name, description },
	);
	return toWorkflowModel(response.data);
}

// --- Validation ---

export interface ValidationResult {
	valid: boolean;
	errors: Array<{
		nodeId?: string;
		edgeId?: string;
		message: string;
		severity: 'error' | 'warning';
	}>;
}

export async function validateWorkflow(
	nodes: WorkflowNode[],
	edges: WorkflowEdge[],
): Promise<ValidationResult> {
	const errors: ValidationResult['errors'] = [];

	if (nodes.length === 0) {
		errors.push({ message: 'Workflow must contain at least one node.', severity: 'error' });
	}

	const nodeIds = new Set<string>();
	for (const node of nodes) {
		if (nodeIds.has(node.id)) {
			errors.push({ nodeId: node.id, message: 'Duplicate node id.', severity: 'error' });
		}
		nodeIds.add(node.id);
	}

	for (const edge of edges) {
		if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
			errors.push({
				edgeId: edge.id,
				message: 'Edge source/target must reference existing nodes.',
				severity: 'error',
			});
		}
	}

	return {
		valid: errors.every((e) => e.severity !== 'error'),
		errors,
	};
}

// --- Test Run ---

export async function testRun(
	_nodes: WorkflowNode[],
	_edges: WorkflowEdge[],
	_testDocument?: string,
): Promise<WorkflowExecution> {
	throw new Error('Workflow test-run is not supported by the backend API yet.');
}

// --- Pending Tasks (Step-Based Workflows) ---

export interface PendingTasksResponse {
	tasks: PendingTask[];
}

export async function getPendingTasks(): Promise<PendingTasksResponse> {
	const response = await apiClient.get<{ tasks: Array<Record<string, unknown>> }>(
		`${API_BASE}/instances/pending`,
	);

	return {
		tasks: (response.data.tasks ?? []).map(toPendingTask),
	};
}

export interface WorkflowActionRequest {
	execution_id: string;
	action: 'approved' | 'rejected' | 'returned' | 'forwarded';
	comments?: string;
}

export async function processWorkflowAction(
	instanceId: string,
	request: WorkflowActionRequest,
): Promise<WorkflowExecution> {
	const response = await apiClient.post<BackendWorkflowExecution>(
		`${API_BASE}/instances/${instanceId}/actions`,
		request,
	);
	return toWorkflowExecutionModel(response.data);
}

export async function startWorkflow(
	workflowId: string,
	documentId: string,
	context?: Record<string, unknown>,
): Promise<WorkflowExecution> {
	const response = await apiClient.post<BackendWorkflowExecution>(`${API_BASE}/${workflowId}/start`, {
		documentId,
		context,
	});
	return toWorkflowExecutionModel(response.data);
}

export async function cancelWorkflowInstance(
	instanceId: string,
	reason?: string,
): Promise<WorkflowExecution> {
	const response = await apiClient.post<BackendWorkflowExecution>(
		`${API_BASE}/instances/${instanceId}/cancel`,
		{ reason },
	);
	return toWorkflowExecutionModel(response.data);
}

/**
 * Resume a paused workflow (e.g., after human approval).
 */
export interface ResumeWorkflowRequest {
	decision: 'approved' | 'rejected' | 'returned';
	notes?: string;
}

export async function resumeWorkflow(
	instanceId: string,
	request: ResumeWorkflowRequest,
): Promise<WorkflowExecution> {
	const response = await apiClient.post<BackendWorkflowExecution>(
		`${API_BASE}/instances/${instanceId}/resume`,
		request,
	);
	return toWorkflowExecutionModel(response.data);
}

/**
 * Get real-time status of a workflow instance from Prefect.
 */
export async function getWorkflowInstanceStatus(
	instanceId: string,
): Promise<WorkflowExecution & { prefect_state?: string }> {
	const response = await apiClient.get<
		BackendWorkflowExecution & { prefect_state?: string }
	>(`${API_BASE}/instances/${instanceId}/status`);

	const mapped = toWorkflowExecutionModel(response.data);
	return {
		...mapped,
		prefect_state: response.data.prefect_state,
	};
}

// --- Backend Workflow Management ---

export interface BackendWorkflowListResponse {
	items: BackendWorkflowDetail[];
	total: number;
	page: number;
	page_size: number;
}

export async function listBackendWorkflows(
	page = 1,
	pageSize = 20,
): Promise<BackendWorkflowListResponse> {
	const response = await apiClient.get<BackendWorkflowListResponse>(`${API_BASE}/`, {
		params: { page, page_size: pageSize },
	});
	return response.data;
}

export interface BackendWorkflowCreate {
	name: string;
	description?: string;
	steps: Array<{
		name: string;
		assignee_type: 'user' | 'role' | 'group';
		assignee_id?: string;
		deadline_hours?: number;
	}>;
}

export async function createBackendWorkflow(
	data: BackendWorkflowCreate,
): Promise<BackendWorkflowDetail> {
	const response = await apiClient.post<BackendWorkflowDetail>(API_BASE, data);
	return response.data;
}

// ============================================================================
// SLA Monitoring API
// ============================================================================

export interface SLADashboardStats {
	total_tasks: number;
	on_track: number;
	warning: number;
	breached: number;
	compliance_rate: number;
	period_days: number;
}

export interface TaskMetric {
	id: string;
	workflow_id: string;
	instance_id: string;
	step_id?: string;
	step_type?: string;
	started_at: string;
	completed_at?: string;
	target_at?: string;
	duration_seconds?: number;
	target_seconds?: number;
	sla_status: 'on_track' | 'warning' | 'breached';
	breached_at?: string;
}

export interface SLAAlert {
	id: string;
	alert_type: 'warning' | 'breach' | 'escalation' | 'escalation_max';
	severity: 'low' | 'medium' | 'high' | 'critical';
	title: string;
	message?: string;
	workflow_id?: string;
	instance_id?: string;
	step_id?: string;
	assignee_id?: string;
	acknowledged: boolean;
	acknowledged_by?: string;
	acknowledged_at?: string;
	created_at: string;
}

export interface SLADashboardResponse {
	stats: SLADashboardStats;
	recent_alerts: SLAAlert[];
	recent_metrics: TaskMetric[];
}

export interface SLAConfig {
	id: string;
	name: string;
	workflow_id?: string;
	step_id?: string;
	target_hours: number;
	warning_threshold_percent: number;
	critical_threshold_percent: number;
	reminder_enabled: boolean;
	reminder_thresholds?: number[];
	escalation_chain_id?: string;
	is_active: boolean;
	created_at: string;
}

export interface SLAConfigCreate {
	name: string;
	workflow_id?: string;
	step_id?: string;
	target_hours: number;
	warning_threshold_percent?: number;
	critical_threshold_percent?: number;
	reminder_enabled?: boolean;
	reminder_thresholds?: number[];
	escalation_chain_id?: string;
}

export interface SLAMetricsResponse {
	items: TaskMetric[];
	total: number;
	page: number;
	page_size: number;
}

export interface SLAAlertsResponse {
	items: SLAAlert[];
	total: number;
	page: number;
	page_size: number;
}

export interface DelegationRequest {
	delegate_to_id: string;
	reason?: string;
}

// --- SLA Dashboard ---

export async function getSLADashboard(periodDays = 30): Promise<SLADashboardResponse> {
	const response = await apiClient.get<SLADashboardResponse>(
		`${API_BASE}/sla/dashboard?period_days=${periodDays}`,
	);
	return response.data;
}

// --- SLA Metrics ---

export async function getSLAMetrics(
	page = 1,
	pageSize = 20,
	workflowId?: string,
	slaStatus?: string,
): Promise<SLAMetricsResponse> {
	const params = new URLSearchParams({
		page: String(page),
		page_size: String(pageSize),
	});
	if (workflowId) params.append('workflow_id', workflowId);
	if (slaStatus) params.append('sla_status', slaStatus);

	const response = await apiClient.get<SLAMetricsResponse>(
		`${API_BASE}/sla/metrics?${params}`,
	);
	return response.data;
}

// --- SLA Alerts ---

export async function getSLAAlerts(
	page = 1,
	pageSize = 20,
	acknowledged?: boolean,
	severity?: string,
): Promise<SLAAlertsResponse> {
	const params = new URLSearchParams({
		page: String(page),
		page_size: String(pageSize),
	});
	if (acknowledged !== undefined) params.append('acknowledged', String(acknowledged));
	if (severity) params.append('severity', severity);

	const response = await apiClient.get<SLAAlertsResponse>(
		`${API_BASE}/sla/alerts?${params}`,
	);
	return response.data;
}

export async function acknowledgeSLAAlert(alertId: string, notes?: string): Promise<SLAAlert> {
	const response = await apiClient.post<SLAAlert>(
		`${API_BASE}/sla/alerts/${alertId}/acknowledge`,
		{ notes },
	);
	return response.data;
}

// --- SLA Configs ---

export async function getSLAConfigs(workflowId?: string): Promise<SLAConfig[]> {
	const params = workflowId ? `?workflow_id=${workflowId}` : '';
	const response = await apiClient.get<SLAConfig[]>(`${API_BASE}/sla/configs${params}`);
	return response.data;
}

export async function createSLAConfig(data: SLAConfigCreate): Promise<SLAConfig> {
	const response = await apiClient.post<SLAConfig>(`${API_BASE}/sla/configs`, data);
	return response.data;
}

// --- Delegation ---

export async function delegateApprovalRequest(
	requestId: string,
	delegation: DelegationRequest,
): Promise<{ status: string; delegated_to: string }> {
	const response = await apiClient.post<{ status: string; delegated_to: string }>(
		`${API_BASE}/approval-requests/${requestId}/delegate`,
		delegation,
	);
	return response.data;
}
