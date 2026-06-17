// (c) Copyright Datacraft, 2026
/**
 * Classification feedback API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDocumentTypes as _useDocumentTypes } from '@/features/document-types/api';

// Re-export so callers can import everything from this module.
export { _useDocumentTypes as useDocumentTypes };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FeedbackRecord {
	id: string;
	document_id: string;
	predicted_type: string | null;
	predicted_confidence: number | null;
	corrected_type: string;
	feedback_by_id: string;
	created_at: string;
}

export interface FeedbackCreate {
	corrected_type: string;
	predicted_type?: string;
	predicted_confidence?: number;
}

export interface CorrectionByType {
	predicted: string | null;
	corrected: string;
	count: number;
}

export interface FeedbackStats {
	total_corrections: number;
	accuracy_rate: number;
	corrections_by_type: CorrectionByType[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const classificationKeys = {
	all: ['classification-feedback'] as const,
	document: (documentId: string) =>
		[...classificationKeys.all, 'document', documentId] as const,
	stats: () => [...classificationKeys.all, 'stats'] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useDocumentClassificationFeedback(documentId: string) {
	return useQuery({
		queryKey: classificationKeys.document(documentId),
		queryFn: async () => {
			const { data } = await apiClient.get<FeedbackRecord[]>(
				`/documents/${documentId}/classification-feedback`,
			);
			return data;
		},
		enabled: !!documentId,
	});
}

export function useSubmitClassificationFeedback(documentId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (body: FeedbackCreate) => {
			const { data } = await apiClient.post<FeedbackRecord>(
				`/documents/${documentId}/classification-feedback`,
				body,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: classificationKeys.document(documentId),
			});
			// Refresh the document itself so document_type badge updates
			queryClient.invalidateQueries({ queryKey: ['documents', 'detail', documentId] });
		},
	});
}

export function useFeedbackStats() {
	return useQuery({
		queryKey: classificationKeys.stats(),
		queryFn: async () => {
			const { data } = await apiClient.get<FeedbackStats>('/classification/feedback-stats');
			return data;
		},
	});
}
