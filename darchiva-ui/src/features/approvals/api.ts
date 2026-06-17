// Approval Workflow API hooks
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApprovalStep {
	id: string;
	step_order: number;
	approver_email: string;
	approver_user_id: string | null;
	status: 'pending' | 'approved' | 'rejected' | 'skipped';
	comment: string | null;
	decided_at: string | null;
}

export interface ApprovalWorkflow {
	id: string;
	document_id: string;
	name: string;
	status: 'in_review' | 'approved' | 'rejected';
	created_by_id: string;
	tenant_id: string;
	created_at: string;
	completed_at: string | null;
	steps: ApprovalStep[];
}

export interface StepIn {
	approver_email: string;
	approver_user_id?: string;
}

export interface CreateWorkflowPayload {
	name: string;
	steps: StepIn[];
}

export interface ApproveStepPayload {
	comment?: string;
}

export interface RejectStepPayload {
	comment: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────

const approvalKeys = {
	all: ['approvals'] as const,
	forDocument: (documentId: string) => ['approvals', 'document', documentId] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useDocumentApprovals(documentId: string) {
	return useQuery({
		queryKey: approvalKeys.forDocument(documentId),
		queryFn: async (): Promise<ApprovalWorkflow[]> => {
			const { data } = await apiClient.get<ApprovalWorkflow[]>(
				`/documents/${documentId}/approval-workflows`,
			);
			return data;
		},
		enabled: !!documentId,
		staleTime: 30_000,
	});
}

export function useCreateApprovalWorkflow(documentId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: CreateWorkflowPayload): Promise<ApprovalWorkflow> => {
			const { data } = await apiClient.post<ApprovalWorkflow>(
				`/documents/${documentId}/approval-workflows`,
				payload,
			);
			return data;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: approvalKeys.forDocument(documentId) });
		},
	});
}

export function useApproveStep(documentId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			workflowId,
			stepId,
			comment,
		}: {
			workflowId: string;
			stepId: string;
			comment?: string;
		}): Promise<ApprovalWorkflow> => {
			const { data } = await apiClient.post<ApprovalWorkflow>(
				`/approval-workflows/${workflowId}/steps/${stepId}/approve`,
				{ comment },
			);
			return data;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: approvalKeys.forDocument(documentId) });
		},
	});
}

export function useRejectStep(documentId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			workflowId,
			stepId,
			comment,
		}: {
			workflowId: string;
			stepId: string;
			comment: string;
		}): Promise<ApprovalWorkflow> => {
			const { data } = await apiClient.post<ApprovalWorkflow>(
				`/approval-workflows/${workflowId}/steps/${stepId}/reject`,
				{ comment },
			);
			return data;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: approvalKeys.forDocument(documentId) });
		},
	});
}
