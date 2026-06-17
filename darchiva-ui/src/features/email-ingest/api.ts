// (c) Copyright Datacraft, 2026
/**
 * Email ingestion (IMAP) API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EmailIngestConfig {
	id: string;
	name: string;
	host: string;
	port: number;
	username: string;
	use_ssl: boolean;
	mailbox_folder: string;
	check_interval_minutes: number;
	destination_folder_id: string | null;
	project_id: string | null;
	is_active: boolean;
	allowed_senders: string;
	last_processed_uid: number;
	last_checked_at: string | null;
	documents_ingested: number;
	tenant_id: string;
	created_by_id: string;
	created_at: string;
}

export interface EmailIngestConfigCreate {
	name: string;
	host: string;
	port?: number;
	username: string;
	password: string;
	use_ssl?: boolean;
	mailbox_folder?: string;
	check_interval_minutes?: number;
	destination_folder_id?: string | null;
	project_id?: string | null;
	is_active?: boolean;
	allowed_senders?: string;
}

export type EmailIngestConfigUpdate = Partial<EmailIngestConfigCreate>;

export interface EmailTestResult {
	success: boolean;
	error?: string;
	folders?: string[];
	unseen_count?: number;
}

export interface TriggerResult {
	queued: number;
	error?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const EMAIL_INGEST_KEY = ['email-ingest-configs'] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useEmailIngestConfigs() {
	return useQuery({
		queryKey: EMAIL_INGEST_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<EmailIngestConfig[]>('/email-ingest/configs');
			return data;
		},
	});
}

export function useCreateEmailIngestConfig() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: EmailIngestConfigCreate) => {
			const { data } = await apiClient.post<EmailIngestConfig>('/email-ingest/configs', payload);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EMAIL_INGEST_KEY });
		},
	});
}

export function useUpdateEmailIngestConfig() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...payload }: EmailIngestConfigUpdate & { id: string }) => {
			const { data } = await apiClient.patch<EmailIngestConfig>(
				`/email-ingest/configs/${id}`,
				payload,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EMAIL_INGEST_KEY });
		},
	});
}

export function useDeleteEmailIngestConfig() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/email-ingest/configs/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EMAIL_INGEST_KEY });
		},
	});
}

export function useTestEmailIngestConfig() {
	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<EmailTestResult>(
				`/email-ingest/configs/${id}/test`,
			);
			return data;
		},
	});
}

export function useTriggerEmailIngest() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<TriggerResult>(
				`/email-ingest/configs/${id}/trigger`,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EMAIL_INGEST_KEY });
		},
	});
}

export function useToggleEmailIngestConfig() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
			const { data } = await apiClient.patch<EmailIngestConfig>(
				`/email-ingest/configs/${id}`,
				{ is_active },
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EMAIL_INGEST_KEY });
		},
	});
}
