// (c) Copyright Datacraft, 2026
/**
 * Bulk ZIP import API hooks.
 *
 * POST /api/v1/ingestion/bulk-upload   — upload ZIP, get job_id back
 * GET  /api/v1/ingestion/bulk-upload/{job_id} — poll progress
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const API_BASE = '/api/v1/ingestion';

// ── Types ──────────────────────────────────────────────────────────────────

export interface BulkUploadResponse {
	job_id: string;
	total_files: number;
	status: string;
	status_url: string;
}

export type BulkJobStatus = 'queued' | 'processing' | 'completed' | 'partial' | 'failed' | 'unknown';

export interface BulkJobFailure {
	file: string;
	error: string;
}

export interface BulkUploadJobStatus {
	job_id: string;
	status: BulkJobStatus;
	total_files: number;
	processed: number;
	failed: number;
	created_at: string;
	completed_at: string | null;
	failures: BulkJobFailure[];
}

export interface BulkUploadParams {
	file: File;
	destinationFolderId?: string;
	projectId?: string;
}

// ── Query keys ─────────────────────────────────────────────────────────────

export const bulkKeys = {
	all: ['ingestion', 'bulk'] as const,
	job: (jobId: string) => [...bulkKeys.all, jobId] as const,
};

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Upload a ZIP archive for bulk import.
 * Returns { job_id, total_files, status, status_url }.
 */
export function useBulkImport() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ file, destinationFolderId, projectId }: BulkUploadParams) => {
			const form = new FormData();
			form.append('file', file);
			if (destinationFolderId) form.append('destination_folder_id', destinationFolderId);
			if (projectId) form.append('project_id', projectId);

			const { data } = await apiClient.post<BulkUploadResponse>(
				`${API_BASE}/bulk-upload`,
				form,
				{ headers: { 'Content-Type': 'multipart/form-data' } },
			);
			return data;
		},
		onSuccess: (data) => {
			// Seed the cache with initial state so the status hook has something to show instantly
			qc.setQueryData(bulkKeys.job(data.job_id), {
				job_id: data.job_id,
				status: data.status,
				total_files: data.total_files,
				processed: 0,
				failed: 0,
				created_at: new Date().toISOString(),
				completed_at: null,
				failures: [],
			} satisfies BulkUploadJobStatus);
		},
	});
}

/**
 * Poll job status every 2 s while the job is in flight.
 * Polling stops automatically once status is completed/partial/failed.
 */
export function useBulkImportStatus(jobId: string | null) {
	return useQuery({
		queryKey: bulkKeys.job(jobId ?? ''),
		queryFn: async () => {
			const { data } = await apiClient.get<BulkUploadJobStatus>(
				`${API_BASE}/bulk-upload/${jobId}`,
			);
			return data;
		},
		enabled: !!jobId,
		refetchInterval: (query) => {
			const s = query.state.data?.status;
			if (!s || s === 'completed' || s === 'partial' || s === 'failed') return false;
			return 2_000;
		},
	});
}
