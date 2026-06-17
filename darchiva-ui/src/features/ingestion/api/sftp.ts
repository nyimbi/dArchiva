// (c) Copyright Datacraft, 2026
/**
 * SFTP/FTP ingestion connector API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SftpConnection {
	id: string;
	name: string;
	host: string;
	port: number;
	username: string;
	remote_path: string;
	file_pattern: string;
	poll_interval_minutes: number;
	destination_folder_id: string | null;
	is_active: boolean;
	last_polled_at: string | null;
	last_error: string | null;
	docs_ingested_total: number;
	tenant_id: string;
	created_at: string;
}

export interface SftpConnectionCreate {
	name: string;
	host: string;
	port?: number;
	username: string;
	password?: string;
	ssh_key?: string;
	remote_path?: string;
	file_pattern?: string;
	poll_interval_minutes?: number;
	destination_folder_id?: string | null;
	is_active?: boolean;
}

export type SftpConnectionUpdate = Partial<SftpConnectionCreate>;

export interface SftpTestResult {
	success: boolean;
	error?: string;
	file_count?: number;
}

export interface SftpActivityItem {
	id: string;
	remote_path: string;
	file_size: number;
	downloaded_at: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const SFTP_KEY = ['sftp-connections'] as const;
const sftpActivityKey = (id: string) => ['sftp-activity', id] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useSftpConnections() {
	return useQuery({
		queryKey: SFTP_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<SftpConnection[]>('/ingestion/sftp-connections');
			return data;
		},
	});
}

export function useCreateSftpConnection() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: SftpConnectionCreate) => {
			const { data } = await apiClient.post<SftpConnection>(
				'/ingestion/sftp-connections',
				payload,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SFTP_KEY });
		},
	});
}

export function useUpdateSftpConnection() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...payload }: SftpConnectionUpdate & { id: string }) => {
			const { data } = await apiClient.patch<SftpConnection>(
				`/ingestion/sftp-connections/${id}`,
				payload,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SFTP_KEY });
		},
	});
}

export function useDeleteSftpConnection() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/ingestion/sftp-connections/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: SFTP_KEY });
		},
	});
}

export function useTestSftpConnection() {
	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<SftpTestResult>(
				`/ingestion/sftp-connections/${id}/test`,
			);
			return data;
		},
	});
}

export function useSftpActivity(connectionId: string) {
	return useQuery({
		queryKey: sftpActivityKey(connectionId),
		queryFn: async () => {
			const { data } = await apiClient.get<SftpActivityItem[]>(
				`/ingestion/sftp-connections/${connectionId}/activity`,
			);
			return data;
		},
		enabled: !!connectionId,
	});
}
