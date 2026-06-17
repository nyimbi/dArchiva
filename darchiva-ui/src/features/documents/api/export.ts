// (c) Copyright Datacraft, 2026
/**
 * Bulk ZIP export API hooks.
 *
 * POST /api/v1/nodes/bulk-export  → enqueue job, returns {job_id, status_url}
 * GET  /api/v1/nodes/bulk-export/{job_id} → poll status
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BulkExportRequest {
	document_ids: string[];
	include_metadata?: boolean;
	include_original?: boolean;
}

export interface BulkExportStartResponse {
	job_id: string;
	status_url: string;
}

export type BulkExportJobStatus = 'queued' | 'processing' | 'complete' | 'failed';

export interface BulkExportStatusResponse {
	status: BulkExportJobStatus;
	/** 0.0 – 1.0 */
	progress: number;
	download_url?: string;
	error?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const exportKeys = {
	all: ['bulk-export'] as const,
	job: (jobId: string) => [...exportKeys.all, jobId] as const,
};

// ---------------------------------------------------------------------------
// useBulkExport — starts the export job
// ---------------------------------------------------------------------------

export function useBulkExport() {
	return useMutation<BulkExportStartResponse, Error, BulkExportRequest>({
		mutationFn: async (body) => {
			const { data } = await apiClient.post<BulkExportStartResponse>(
				'/nodes/bulk-export',
				{
					document_ids: body.document_ids,
					include_metadata: body.include_metadata ?? true,
					include_original: body.include_original ?? true,
				},
			);
			return data;
		},
	});
}

// ---------------------------------------------------------------------------
// useBulkExportStatus — polls a single job (disabled when jobId is null)
// ---------------------------------------------------------------------------

export function useBulkExportStatus(jobId: string | null) {
	return useQuery<BulkExportStatusResponse, Error>({
		queryKey: exportKeys.job(jobId ?? ''),
		queryFn: async () => {
			const { data } = await apiClient.get<BulkExportStatusResponse>(
				`/nodes/bulk-export/${jobId}`,
			);
			return data;
		},
		enabled: !!jobId,
		// Poll every 2 s while the job is running; stop once done or failed
		refetchInterval: (query) => {
			const status = query.state.data?.status;
			if (status === 'complete' || status === 'failed') return false;
			return 2000;
		},
		staleTime: 0,
	});
}
