// (c) Copyright Datacraft, 2026
// QR code and document label API hooks
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery } from '@tanstack/react-query';

// ── QR code query ─────────────────────────────────────────────────────────────

/**
 * Returns the full URL for the QR code image so it can be used directly in
 * an <img> src attribute (no auth header needed when the browser loads it).
 * The hook itself verifies the endpoint is reachable and returns the URL.
 */
export function useDocumentQRCode(documentId: string, size = 200) {
	return useQuery({
		queryKey: ['document-qr-code', documentId, size],
		queryFn: async () => {
			// HEAD-check that the endpoint is reachable and document exists.
			await apiClient.get(`/documents/${documentId}/qr-code`, {
				params: { size },
				responseType: 'blob',
			});
			// Return the URL; the component renders it as <img src=...> so the
			// browser will load it with cookies/session — no separate auth needed.
			return `/api/v1/documents/${documentId}/qr-code?size=${size}`;
		},
		enabled: Boolean(documentId),
		staleTime: 5 * 60 * 1000, // 5 min — QR codes are stable
	});
}

// ── Batch labels mutation ─────────────────────────────────────────────────────

interface BatchLabelsPayload {
	document_ids: string[];
}

async function fetchBatchLabels(payload: BatchLabelsPayload): Promise<Blob> {
	const { data } = await apiClient.post<Blob>(
		'/documents/batch-labels',
		payload,
		{ responseType: 'blob' },
	);
	return data;
}

/**
 * Mutation that posts a list of document IDs and receives a combined PDF blob.
 * On success the caller receives the Blob and can trigger a download.
 */
export function useBatchLabels() {
	return useMutation({
		mutationFn: (documentIds: string[]) =>
			fetchBatchLabels({ document_ids: documentIds }),
		onSuccess: (blob) => {
			// Auto-trigger browser download
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'batch-labels.pdf';
			a.click();
			URL.revokeObjectURL(url);
		},
	});
}
