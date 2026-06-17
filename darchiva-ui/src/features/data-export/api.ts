// (c) Copyright Datacraft, 2026
/**
 * Data export and GDPR feature — API client + React Query hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── types ─────────────────────────────────────────────────────────────────────

export type ExportJobStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type ExportJobType = 'full_tenant' | 'bundle' | 'gdpr_subject';

export interface ExportJob {
	id: string;
	job_type: ExportJobType;
	status: ExportJobStatus;
	requested_by_id: string;
	tenant_id: string;
	file_size_bytes: number | null;
	error_message: string | null;
	created_at: string;
	completed_at: string | null;
}

export interface StartExportResponse {
	job_id: string;
	status: string;
	message: string;
}

export interface BundleRequest {
	document_ids: string[];
	include_metadata?: boolean;
}

export interface GdprSubjectRequest {
	email: string;
}

// ── query keys ────────────────────────────────────────────────────────────────

const EXPORT_JOBS_KEY = ['data-export', 'jobs'] as const;
const exportJobKey = (jobId: string) => ['data-export', 'job', jobId] as const;

// ── raw API calls ─────────────────────────────────────────────────────────────

export async function fetchExportJobs(limit = 20): Promise<ExportJob[]> {
	const { data } = await apiClient.get<ExportJob[]>('/admin/data-export', { params: { limit } });
	return data;
}

export async function fetchExportJob(jobId: string): Promise<ExportJob> {
	const { data } = await apiClient.get<ExportJob>(`/admin/data-export/${jobId}`);
	return data;
}

export async function startFullTenantExport(): Promise<StartExportResponse> {
	const { data } = await apiClient.post<StartExportResponse>('/admin/data-export');
	return data;
}

/** Downloads the completed ZIP for a job; triggers a browser save-as dialog. */
export async function downloadExport(jobId: string, fileName?: string): Promise<void> {
	const { data } = await apiClient.get<Blob>(`/admin/data-export/${jobId}/download`, {
		responseType: 'blob',
	});
	const url = URL.createObjectURL(data);
	const a = document.createElement('a');
	a.href = url;
	a.download = fileName ?? `export_${jobId.slice(0, 8)}.zip`;
	a.click();
	URL.revokeObjectURL(url);
}

/** Immediate bundle download (≤10 docs); triggers browser save-as. */
export async function downloadBundle(req: BundleRequest): Promise<void> {
	const { data } = await apiClient.post<Blob>('/documents/bundle', req, {
		responseType: 'blob',
	});
	const url = URL.createObjectURL(data);
	const a = document.createElement('a');
	a.href = url;
	a.download = 'document_bundle.zip';
	a.click();
	URL.revokeObjectURL(url);
}

/** Immediate GDPR subject export; triggers browser save-as. */
export async function downloadGdprSubject(req: GdprSubjectRequest): Promise<void> {
	const { data } = await apiClient.post<Blob>('/admin/gdpr/subject-request', req, {
		responseType: 'blob',
	});
	const safe = req.email.replace('@', '_at_').replace(/\./g, '_').slice(0, 50);
	const url = URL.createObjectURL(data);
	const a = document.createElement('a');
	a.href = url;
	a.download = `gdpr_${safe}.zip`;
	a.click();
	URL.revokeObjectURL(url);
}

// ── hooks ─────────────────────────────────────────────────────────────────────

export function useDataExportJobs(limit = 20) {
	return useQuery({
		queryKey: [...EXPORT_JOBS_KEY, limit],
		queryFn: () => fetchExportJobs(limit),
		staleTime: 10_000,
	});
}

export function useDataExportJob(jobId: string | null) {
	return useQuery({
		queryKey: exportJobKey(jobId ?? ''),
		queryFn: () => fetchExportJob(jobId!),
		enabled: !!jobId,
		refetchInterval: (query) => {
			const status = query.state.data?.status;
			return status === 'pending' || status === 'processing' ? 3000 : false;
		},
	});
}

export function useStartExport() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: startFullTenantExport,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EXPORT_JOBS_KEY });
		},
	});
}

export function useDownloadExport() {
	return useMutation({
		mutationFn: ({ jobId, fileName }: { jobId: string; fileName?: string }) =>
			downloadExport(jobId, fileName),
	});
}

export function useDownloadBundle() {
	return useMutation({
		mutationFn: (req: BundleRequest) => downloadBundle(req),
	});
}

export function useGdprExport() {
	return useMutation({
		mutationFn: (req: GdprSubjectRequest) => downloadGdprSubject(req),
	});
}
