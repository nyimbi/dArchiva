// (c) Copyright Datacraft, 2026.
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ConnectorConfig {
	id: string;
	name: string;
	connector_type: 'google_drive' | 'dropbox' | 'onedrive' | 'local_folder';
	watch_folder_id: string | null;
	watch_folder_name: string | null;
	destination_folder_id: string | null;
	last_sync_at: string | null;
	last_file_count: number;
	is_active: boolean;
	sync_interval_minutes: number;
	tenant_id: string;
	created_by_id: string;
	created_at: string;
}

export interface CreateConnectorInput {
	name: string;
	connector_type: ConnectorConfig['connector_type'];
	config_json: string;
	watch_folder_id?: string;
	watch_folder_name?: string;
	destination_folder_id?: string;
	sync_interval_minutes?: number;
}

export interface UpdateConnectorInput {
	name?: string;
	config_json?: string;
	watch_folder_id?: string;
	watch_folder_name?: string;
	destination_folder_id?: string;
	is_active?: boolean;
	sync_interval_minutes?: number;
}

export interface SyncResult {
	new_files: number;
	status: 'ok' | 'error';
	message?: string;
}

export interface DropboxFolder {
	id: string;
	name: string;
	path: string;
}

export interface PreviewFile {
	name: string;
	path: string;
	size: number;
	modified?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const CONNECTORS_KEY = ['connectors'] as const;
const previewKey = (id: string) => ['connectors', id, 'preview'] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useConnectors() {
	return useQuery({
		queryKey: CONNECTORS_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<ConnectorConfig[]>('/connectors/');
			return data;
		},
	});
}

export function useCreateConnector() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateConnectorInput) => {
			const { data } = await apiClient.post<ConnectorConfig>('/connectors/', input);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: CONNECTORS_KEY }),
	});
}

export function useUpdateConnector() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...input }: UpdateConnectorInput & { id: string }) => {
			const { data } = await apiClient.patch<ConnectorConfig>(`/connectors/${id}`, input);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: CONNECTORS_KEY }),
	});
}

export function useDeleteConnector() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/connectors/${id}`);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: CONNECTORS_KEY }),
	});
}

export function useSyncConnector() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<SyncResult>(`/connectors/${id}/sync`);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: CONNECTORS_KEY }),
	});
}

export function useConnectorPreview(id: string, enabled: boolean) {
	return useQuery({
		queryKey: previewKey(id),
		queryFn: async () => {
			const { data } = await apiClient.get<PreviewFile[]>(`/connectors/${id}/preview`);
			return data;
		},
		enabled: enabled && !!id,
	});
}

export function useExchangeDropboxToken() {
	return useMutation({
		mutationFn: async (payload: { code: string; redirect_uri?: string }) => {
			const { data } = await apiClient.post<{
				access_token: string;
				token_type: string;
				account_id: string;
				uid: string;
			}>('/connectors/dropbox/exchange-token', payload);
			return data;
		},
	});
}

export async function fetchDropboxFolders(access_token: string): Promise<DropboxFolder[]> {
	const { data } = await apiClient.get<DropboxFolder[]>(
		`/connectors/dropbox/folders?access_token=${encodeURIComponent(access_token)}`,
	);
	return data;
}
