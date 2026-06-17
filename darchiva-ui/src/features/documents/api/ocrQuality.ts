// (c) Copyright Datacraft, 2026
/**
 * OCR quality and re-OCR API hooks.
 *
 * Backed by:
 *   GET  /documents/{id}/ocr-quality
 *   POST /documents/{id}/re-ocr
 *   GET  /ocr/quality-report
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PageQualityScore {
	page_number: number;
	word_count: number;
	estimated_confidence: number; // 0.0–1.0
}

export interface OcrQualityResponse {
	document_id: string;
	ocr_status: string;
	overall_confidence: number;
	page_count: number;
	pages_with_text: number;
	page_scores: PageQualityScore[];
	low_confidence_pages: number[];
}

export interface ReOcrResponse {
	task_id: string;
	status: string; // "queued"
}

export interface QualityReportItem {
	document_id: string;
	title: string;
	estimated_quality: number;
	page_count: number;
	low_confidence_pages: number[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const ocrQualityKeys = {
	all: ['ocr-quality'] as const,
	document: (documentId: string) => [...ocrQualityKeys.all, documentId] as const,
	report: (threshold: number) => ['ocr-quality-report', threshold] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch per-page OCR quality scores for a document.
 *
 * Polls every 5 s while ocr_status is "RECEIVED" or "STARTED" so the UI
 * refreshes automatically as the OCR worker runs.
 */
export function useOCRQuality(documentId: string) {
	return useQuery({
		queryKey: ocrQualityKeys.document(documentId),
		queryFn: async (): Promise<OcrQualityResponse> => {
			const { data } = await apiClient.get<OcrQualityResponse>(
				`/documents/${documentId}/ocr-quality`,
			);
			return data;
		},
		enabled: !!documentId,
		staleTime: 30_000,
		refetchInterval: (query) => {
			const status = query.state.data?.ocr_status;
			if (status === 'RECEIVED' || status === 'STARTED') {
				return 5_000;
			}
			return false;
		},
	});
}

/**
 * Trigger re-OCR for a document.
 * Invalidates the quality query so the panel reflects the new "RECEIVED"
 * status immediately and starts polling.
 */
export function useReOCR(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation<ReOcrResponse, Error>({
		mutationFn: async () => {
			const { data } = await apiClient.post<ReOcrResponse>(
				`/documents/${documentId}/re-ocr`,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ocrQualityKeys.document(documentId),
			});
		},
	});
}

/**
 * Fetch the fleet-wide OCR quality report.
 * Returns documents below the given confidence threshold, worst first.
 */
export function useOCRQualityReport(threshold = 0.7, limit = 50) {
	return useQuery({
		queryKey: ocrQualityKeys.report(threshold),
		queryFn: async (): Promise<QualityReportItem[]> => {
			const { data } = await apiClient.get<QualityReportItem[]>(
				`/ocr/quality-report`,
				{ params: { threshold, limit } },
			);
			return data;
		},
		staleTime: 5 * 60_000,
	});
}
