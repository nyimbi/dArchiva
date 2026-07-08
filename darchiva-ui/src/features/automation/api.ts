// Automation Rules Engine API hooks
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────

export type TriggerEvent =
	| 'document.classified'
	| 'document.uploaded'
	| 'document.expiring'
	| 'scan.batch_complete'
	| 'email_received'
	| 'webhook_received'
	| 'schedule';

export type ConditionOperator =
	| 'equals'
	| 'not_equals'
	| 'contains'
	| 'greater_than'
	| 'less_than';

export type ConditionField =
	| 'document_type'
	| 'tag_id'
	| 'page_count'
	| 'confidence_score';

export type ActionType =
	| 'notify_user'
	| 'assign_approval_workflow'
	| 'route_to_folder'
	| 'apply_tag'
	| 'send_webhook'
	| 'set_document_type';

export interface Condition {
	field: ConditionField | string;
	operator: ConditionOperator;
	value: string;
}

export interface Action {
	type: ActionType | string;
	params: Record<string, unknown>;
}

export interface AutomationRule {
	id: string;
	name: string;
	description: string;
	trigger_event: TriggerEvent;
	conditions: Condition[];
	actions: Action[];
	is_active: boolean;
	priority: number;
	run_count: number;
	last_run_at: string | null;
	tenant_id: string;
	created_by_id: string;
	created_at: string;
}

export interface CreateRulePayload {
	name: string;
	description?: string;
	trigger_event: TriggerEvent;
	conditions: Condition[];
	actions: Action[];
	is_active?: boolean;
	priority?: number;
}

export interface UpdateRulePayload {
	name?: string;
	description?: string;
	trigger_event?: TriggerEvent;
	conditions?: Condition[];
	actions?: Action[];
	is_active?: boolean;
	priority?: number;
}

export interface TestRulePayload {
	document_id: string;
}

export interface TestRuleResult {
	rule_id: string;
	rule_name: string;
	conditions_matched: number;
	actions: Array<{ type: string; status: string; [key: string]: unknown }>;
}

export interface RuleHistory {
	rule_id: string;
	rule_name: string;
	run_count: number;
	last_run_at: string | null;
	is_active: boolean;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const automationKeys = {
	all: ['automation', 'rules'] as const,
	list: () => ['automation', 'rules', 'list'] as const,
	history: (id: string) => ['automation', 'rules', id, 'history'] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useAutomationRules() {
	return useQuery({
		queryKey: automationKeys.list(),
		queryFn: async (): Promise<AutomationRule[]> => {
			const { data } = await apiClient.get<AutomationRule[]>('/automation/rules');
			return data;
		},
		staleTime: 30_000,
	});
}

export function useCreateAutomationRule() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: CreateRulePayload): Promise<AutomationRule> => {
			const { data } = await apiClient.post<AutomationRule>('/automation/rules', payload);
			return data;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: automationKeys.list() });
		},
	});
}

export function useUpdateAutomationRule() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({
			id,
			payload,
		}: {
			id: string;
			payload: UpdateRulePayload;
		}): Promise<AutomationRule> => {
			const { data } = await apiClient.patch<AutomationRule>(
				`/automation/rules/${id}`,
				payload,
			);
			return data;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: automationKeys.list() });
		},
	});
}

export function useDeleteAutomationRule() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			await apiClient.delete(`/automation/rules/${id}`);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: automationKeys.list() });
		},
	});
}

export function useTestAutomationRule(ruleId: string) {
	return useMutation({
		mutationFn: async (payload: TestRulePayload): Promise<TestRuleResult[]> => {
			const { data } = await apiClient.post<TestRuleResult[]>(
				`/automation/rules/${ruleId}/test`,
				payload,
			);
			return data;
		},
	});
}

export function useRuleHistory(ruleId: string) {
	return useQuery({
		queryKey: automationKeys.history(ruleId),
		queryFn: async (): Promise<RuleHistory> => {
			const { data } = await apiClient.get<RuleHistory>(
				`/automation/rules/${ruleId}/history`,
			);
			return data;
		},
		enabled: !!ruleId,
		staleTime: 60_000,
	});
}
