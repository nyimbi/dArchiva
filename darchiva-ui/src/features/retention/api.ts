// (c) Copyright Datacraft, 2026.
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetentionPolicy {
	id: string;
	name: string;
	description: string | null;
	policy_type: 'archive' | 'delete' | 'move';
	after_days: number;
	applies_to_project_id: string | null;
	applies_to_document_type: string | null;
	destination_folder_id: string | null;
	is_active: boolean;
	tenant_id: string;
	created_by_id: string | null;
	created_at: string;
	last_run_at: string | null;
	docs_processed: number;
}

export interface CreateRetentionPolicyInput {
	name: string;
	description?: string;
	policy_type: 'archive' | 'delete' | 'move';
	after_days: number;
	applies_to_project_id?: string;
	applies_to_document_type?: string;
	destination_folder_id?: string;
	is_active: boolean;
}

export interface UpdateRetentionPolicyInput {
	name?: string;
	description?: string;
	policy_type?: 'archive' | 'delete' | 'move';
	after_days?: number;
	applies_to_project_id?: string | null;
	applies_to_document_type?: string | null;
	destination_folder_id?: string | null;
	is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const POLICIES_KEY = ['retention', 'policies'] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useRetentionPolicies() {
	return useQuery({
		queryKey: POLICIES_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<RetentionPolicy[]>('/retention/policies');
			return data;
		},
	});
}

export function useCreatePolicy() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateRetentionPolicyInput) => {
			const { data } = await apiClient.post<RetentionPolicy>('/retention/policies', input);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
	});
}

export function useUpdatePolicy() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...input }: UpdateRetentionPolicyInput & { id: string }) => {
			const { data } = await apiClient.patch<RetentionPolicy>(
				`/retention/policies/${id}`,
				input,
			);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
	});
}

export function useDeletePolicy() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/retention/policies/${id}`);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
	});
}

export function useRunPolicy() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, dryRun = false }: { id: string; dryRun?: boolean }) => {
			const { data } = await apiClient.post<{ policy_id: string; docs_processed: number; dry_run: boolean }>(
				`/retention/policies/${id}/run-now?dry_run=${dryRun}`,
			);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: POLICIES_KEY }),
	});
}
