// (c) Copyright Datacraft, 2026
/**
 * Workflow API client.
 *
 * The backend has a step-based workflow system for document approvals,
 * while the frontend Designer uses a visual node/edge graph.
 */
import { apiClient } from '@/lib/api-client';
import type {
	Workflow,
	WorkflowExecution,
	WorkflowNode,
	WorkflowEdge,
	WorkflowTemplate,
} from './types';

const API_BASE = '/workflows';

// Backend workflow types (step-based)
export interface WorkflowStep {
	id: string;
	name: string;
	step_order: number;
	assignee_type: 'user' | 'role' | 'group';
	assignee_id?: string;
	deadline_hours?: number;
}

export interface BackendWorkflow {
	id: string;
	name: string;
	description?: string;
	is_active: boolean;
	steps: WorkflowStep[];
	created_at: string;
	updated_at: string;
}

export interface WorkflowInstance {
	id: string;
	workflow_id: string;
	workflow_name: string;
	document_id: string;
	document_title: string;
	current_step: number;
	status: 'pending' | 'in_progress' | 'on_hold' | 'completed' | 'rejected' | 'cancelled';
	started_at: string;
	completed_at?: string;
	/** Prefect flow run ID for execution tracking */
	prefect_flow_run_id?: string;
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
	if (status) params.append('status', status);

	const response = await apiClient.get<WorkflowListResponse>(`${API_BASE}/?${params}`);
	return response.data;
}

export async function getWorkflow(id: string): Promise<Workflow> {
	const response = await apiClient.get<Workflow>(`${API_BASE}/${id}`);
	return response.data;
}

export async function createWorkflow(data: WorkflowCreate): Promise<Workflow> {
	const response = await apiClient.post<Workflow>(API_BASE, data);
	return response.data;
}

export async function updateWorkflow(id: string, data: WorkflowUpdate): Promise<Workflow> {
	const response = await apiClient.patch<Workflow>(`${API_BASE}/${id}`, data);
	return response.data;
}

export async function deleteWorkflow(id: string): Promise<void> {
	await apiClient.delete(`${API_BASE}/${id}`);
}

export async function activateWorkflow(id: string): Promise<Workflow> {
	const response = await apiClient.post<Workflow>(`${API_BASE}/${id}/activate`);
	return response.data;
}

export async function deactivateWorkflow(id: string): Promise<Workflow> {
	const response = await apiClient.post<Workflow>(`${API_BASE}/${id}/deactivate`);
	return response.data;
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

	const response = await apiClient.get<WorkflowExecutionListResponse>(
		`${API_BASE}/executions/?${params}`,
	);
	return response.data;
}

export async function getExecution(id: string): Promise<WorkflowExecution> {
	const response = await apiClient.get<WorkflowExecution>(`${API_BASE}/executions/${id}`);
	return response.data;
}

export async function runWorkflow(
	id: string,
	input?: Record<string, unknown>,
): Promise<WorkflowExecution> {
	const response = await apiClient.post<WorkflowExecution>(`${API_BASE}/${id}/run`, {
		input,
	});
	return response.data;
}

export async function cancelExecution(executionId: string): Promise<WorkflowExecution> {
	const response = await apiClient.post<WorkflowExecution>(
		`${API_BASE}/executions/${executionId}/cancel`,
	);
	return response.data;
}

export async function retryExecution(executionId: string): Promise<WorkflowExecution> {
	const response = await apiClient.post<WorkflowExecution>(
		`${API_BASE}/executions/${executionId}/retry`,
	);
	return response.data;
}

// --- Templates ---

export async function listTemplates(): Promise<WorkflowTemplate[]> {
	const response = await apiClient.get<WorkflowTemplate[]>(`${API_BASE}/templates`);
	return response.data;
}

export async function getTemplate(id: string): Promise<WorkflowTemplate> {
	const response = await apiClient.get<WorkflowTemplate>(`${API_BASE}/templates/${id}`);
	return response.data;
}

export async function createFromTemplate(
	templateId: string,
	name: string,
	description?: string,
): Promise<Workflow> {
	const response = await apiClient.post<Workflow>(`${API_BASE}/templates/${templateId}/create`, {
		name,
		description,
	});
	return response.data;
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
	const response = await apiClient.post<ValidationResult>(`${API_BASE}/validate`, {
		nodes,
		edges,
	});
	return response.data;
}

// --- Test Run ---

export async function testRun(
	nodes: WorkflowNode[],
	edges: WorkflowEdge[],
	testDocument?: string,
): Promise<WorkflowExecution> {
	const response = await apiClient.post<WorkflowExecution>(`${API_BASE}/test-run`, {
		nodes,
		edges,
		test_document_id: testDocument,
	});
	return response.data;
}

// --- Pending Tasks (Step-Based Workflows) ---

export interface PendingTasksResponse {
	tasks: PendingTask[];
}

export async function getPendingTasks(): Promise<PendingTasksResponse> {
	const response = await apiClient.get<PendingTasksResponse>(`${API_BASE}/instances/pending`);
	return response.data;
}

export interface WorkflowActionRequest {
	execution_id: string;
	action: 'approved' | 'rejected' | 'returned' | 'forwarded';
	comments?: string;
}

export async function processWorkflowAction(
	instanceId: string,
	request: WorkflowActionRequest,
): Promise<WorkflowInstance> {
	const response = await apiClient.post<WorkflowInstance>(
		`${API_BASE}/instances/${instanceId}/actions`,
		request,
	);
	return response.data;
}

export async function startWorkflow(
	workflowId: string,
	documentId: string,
	context?: Record<string, unknown>,
): Promise<WorkflowInstance> {
	const response = await apiClient.post<WorkflowInstance>(`${API_BASE}/${workflowId}/start`, {
		document_id: documentId,
		context,
	});
	return response.data;
}

export async function cancelWorkflowInstance(
	instanceId: string,
	reason?: string,
): Promise<WorkflowInstance> {
	const response = await apiClient.post<WorkflowInstance>(
		`${API_BASE}/instances/${instanceId}/cancel`,
		{ reason },
	);
	return response.data;
}

/**
 * Resume a paused workflow (e.g., after human approval).
 * Used when a workflow is waiting for input at an approval node.
 */
export interface ResumeWorkflowRequest {
	decision: 'approved' | 'rejected' | 'returned';
	notes?: string;
}

export async function resumeWorkflow(
	instanceId: string,
	request: ResumeWorkflowRequest,
): Promise<WorkflowInstance> {
	const response = await apiClient.post<WorkflowInstance>(
		`${API_BASE}/instances/${instanceId}/resume`,
		request,
	);
	return response.data;
}

/**
 * Get real-time status of a workflow instance from Prefect.
 */
export async function getWorkflowInstanceStatus(
	instanceId: string,
): Promise<WorkflowInstance & { prefect_state?: string }> {
	const response = await apiClient.get<WorkflowInstance & { prefect_state?: string }>(
		`${API_BASE}/instances/${instanceId}/status`,
	);
	return response.data;
}

// --- Backend Workflow Management ---

export interface BackendWorkflowListResponse {
	items: BackendWorkflow[];
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
): Promise<BackendWorkflow> {
	const response = await apiClient.post<BackendWorkflow>(API_BASE, data);
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
