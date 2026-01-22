// (c) Copyright Datacraft, 2026
/**
 * React Query hooks for workflow operations.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from './api';
import type { WorkflowNode, WorkflowEdge } from './types';

// Query keys
export const workflowKeys = {
	all: ['workflows'] as const,
	lists: () => [...workflowKeys.all, 'list'] as const,
	list: (filters: { page?: number; status?: string }) =>
		[...workflowKeys.lists(), filters] as const,
	details: () => [...workflowKeys.all, 'detail'] as const,
	detail: (id: string) => [...workflowKeys.details(), id] as const,
	executions: () => [...workflowKeys.all, 'executions'] as const,
	executionList: (filters: { workflowId?: string; page?: number; status?: string }) =>
		[...workflowKeys.executions(), 'list', filters] as const,
	execution: (id: string) => [...workflowKeys.executions(), id] as const,
	pendingTasks: () => [...workflowKeys.all, 'pending-tasks'] as const,
	templates: () => [...workflowKeys.all, 'templates'] as const,
	template: (id: string) => [...workflowKeys.templates(), id] as const,
	validation: () => [...workflowKeys.all, 'validation'] as const,
};

// --- Workflows ---

export function useWorkflows(page = 1, pageSize = 20, status?: string) {
	return useQuery({
		queryKey: workflowKeys.list({ page, status }),
		queryFn: () => api.listWorkflows(page, pageSize, status),
	});
}

export function useWorkflow(id: string) {
	return useQuery({
		queryKey: workflowKeys.detail(id),
		queryFn: () => api.getWorkflow(id),
		enabled: !!id,
	});
}

export function useCreateWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.createWorkflow,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
		},
	});
}

export function useUpdateWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: api.WorkflowUpdate }) =>
			api.updateWorkflow(id, data),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
			queryClient.invalidateQueries({ queryKey: workflowKeys.detail(id) });
		},
	});
}

export function useDeleteWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.deleteWorkflow,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
		},
	});
}

export function useActivateWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.activateWorkflow,
		onSuccess: (workflow) => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
			queryClient.invalidateQueries({ queryKey: workflowKeys.detail(workflow.id) });
		},
	});
}

export function useDeactivateWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.deactivateWorkflow,
		onSuccess: (workflow) => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
			queryClient.invalidateQueries({ queryKey: workflowKeys.detail(workflow.id) });
		},
	});
}

// --- Executions ---

export function useExecutions(workflowId?: string, page = 1, pageSize = 20, status?: string) {
	return useQuery({
		queryKey: workflowKeys.executionList({ workflowId, page, status }),
		queryFn: () => api.listExecutions(workflowId, page, pageSize, status),
	});
}

export function useExecution(id: string) {
	return useQuery({
		queryKey: workflowKeys.execution(id),
		queryFn: () => api.getExecution(id),
		enabled: !!id,
	});
}

export function useRunWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, input }: { id: string; input?: Record<string, unknown> }) =>
			api.runWorkflow(id, input),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.executions() });
		},
	});
}

export function useCancelExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.cancelExecution,
		onSuccess: (_, executionId) => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.execution(executionId) });
			queryClient.invalidateQueries({ queryKey: workflowKeys.executions() });
		},
	});
}

export function useRetryExecution() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.retryExecution,
		onSuccess: (_, executionId) => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.execution(executionId) });
			queryClient.invalidateQueries({ queryKey: workflowKeys.executions() });
		},
	});
}

// --- Templates ---

export function useTemplates() {
	return useQuery({
		queryKey: workflowKeys.templates(),
		queryFn: api.listTemplates,
	});
}

export function useTemplate(id: string) {
	return useQuery({
		queryKey: workflowKeys.template(id),
		queryFn: () => api.getTemplate(id),
		enabled: !!id,
	});
}

export function useCreateFromTemplate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			templateId,
			name,
			description,
		}: {
			templateId: string;
			name: string;
			description?: string;
		}) => api.createFromTemplate(templateId, name, description),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.lists() });
		},
	});
}

// --- Validation ---

export function useValidateWorkflow() {
	return useMutation({
		mutationFn: ({ nodes, edges }: { nodes: WorkflowNode[]; edges: WorkflowEdge[] }) =>
			api.validateWorkflow(nodes, edges),
	});
}

export function useTestRun() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			nodes,
			edges,
			testDocument,
		}: {
			nodes: WorkflowNode[];
			edges: WorkflowEdge[];
			testDocument?: string;
		}) => api.testRun(nodes, edges, testDocument),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.executions() });
		},
	});
}

// --- Pending Tasks (Step-Based Workflows) ---

export function usePendingTasks() {
	return useQuery({
		queryKey: workflowKeys.pendingTasks(),
		queryFn: api.getPendingTasks,
		refetchInterval: 30000, // Refresh every 30 seconds
	});
}

export function useProcessWorkflowAction() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			instanceId,
			request,
		}: {
			instanceId: string;
			request: api.WorkflowActionRequest;
		}) => api.processWorkflowAction(instanceId, request),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.pendingTasks() });
			queryClient.invalidateQueries({ queryKey: workflowKeys.executions() });
		},
	});
}

export function useStartWorkflow() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			workflowId,
			documentId,
			context,
		}: {
			workflowId: string;
			documentId: string;
			context?: Record<string, unknown>;
		}) => api.startWorkflow(workflowId, documentId, context),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.pendingTasks() });
			queryClient.invalidateQueries({ queryKey: workflowKeys.executions() });
		},
	});
}

export function useCancelWorkflowInstance() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ instanceId, reason }: { instanceId: string; reason?: string }) =>
			api.cancelWorkflowInstance(instanceId, reason),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.pendingTasks() });
			queryClient.invalidateQueries({ queryKey: workflowKeys.executions() });
		},
	});
}

// ============================================================================
// SLA Monitoring Hooks
// ============================================================================

// SLA Query keys
export const slaKeys = {
	all: ['sla'] as const,
	dashboard: (periodDays: number) => [...slaKeys.all, 'dashboard', periodDays] as const,
	metrics: (filters: { page?: number; workflowId?: string; slaStatus?: string }) =>
		[...slaKeys.all, 'metrics', filters] as const,
	alerts: (filters: { page?: number; acknowledged?: boolean; severity?: string }) =>
		[...slaKeys.all, 'alerts', filters] as const,
	configs: (workflowId?: string) => [...slaKeys.all, 'configs', workflowId] as const,
};

export function useSLADashboard(periodDays = 30) {
	return useQuery({
		queryKey: slaKeys.dashboard(periodDays),
		queryFn: () => api.getSLADashboard(periodDays),
		refetchInterval: 60000, // Refresh every minute
	});
}

export function useSLAMetrics(
	page = 1,
	pageSize = 20,
	workflowId?: string,
	slaStatus?: string,
) {
	return useQuery({
		queryKey: slaKeys.metrics({ page, workflowId, slaStatus }),
		queryFn: () => api.getSLAMetrics(page, pageSize, workflowId, slaStatus),
	});
}

export function useSLAAlerts(
	page = 1,
	pageSize = 20,
	acknowledged?: boolean,
	severity?: string,
) {
	return useQuery({
		queryKey: slaKeys.alerts({ page, acknowledged, severity }),
		queryFn: () => api.getSLAAlerts(page, pageSize, acknowledged, severity),
	});
}

export function useAcknowledgeSLAAlert() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ alertId, notes }: { alertId: string; notes?: string }) =>
			api.acknowledgeSLAAlert(alertId, notes),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: slaKeys.all });
		},
	});
}

export function useSLAConfigs(workflowId?: string) {
	return useQuery({
		queryKey: slaKeys.configs(workflowId),
		queryFn: () => api.getSLAConfigs(workflowId),
	});
}

export function useCreateSLAConfig() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: api.createSLAConfig,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: slaKeys.configs() });
		},
	});
}

export function useDelegateApproval() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			requestId,
			delegateToId,
			reason,
		}: {
			requestId: string;
			delegateToId: string;
			reason?: string;
		}) => api.delegateApprovalRequest(requestId, { delegate_to_id: delegateToId, reason }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: workflowKeys.pendingTasks() });
		},
	});
}
