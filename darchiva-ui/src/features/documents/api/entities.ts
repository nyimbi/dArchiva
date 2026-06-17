// (c) Copyright Datacraft, 2026
/**
 * Named entity extraction API hooks.
 *
 * Entities are extracted from document text by the darchiva.documents.extract_entities
 * Celery task (runs ~130s after upload). Results live in document_metadata.entities on
 * the Document model and are served by GET /documents/{id}/entities.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EntityItem {
	entity_type: string;
	value: string;
	confidence?: number | null;
	page_number?: number | null;
	bbox?: { x: number; y: number; w: number; h: number } | null;
}

export interface EntitiesResponse {
	entities: EntityItem[];
}

export interface ReExtractResponse {
	queued: boolean;
	message: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const entityKeys = {
	all: ['entities'] as const,
	document: (documentId: string) => [...entityKeys.all, documentId] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch named entities for a document.
 * Returns an empty list when extraction has not run yet — never throws 404.
 */
export function useDocumentEntities(documentId: string) {
	return useQuery({
		queryKey: entityKeys.document(documentId),
		queryFn: async (): Promise<EntitiesResponse> => {
			const { data } = await apiClient.get<EntitiesResponse>(
				`/documents/${documentId}/entities`,
			);
			return data;
		},
		enabled: !!documentId,
		staleTime: 2 * 60 * 1000, // entities change rarely after first extraction
	});
}

/**
 * Trigger entity re-extraction for a document.
 * Invalidates the entity query so the panel refetches after ~130s when the
 * task completes (callers may add a manual refresh button or poll).
 */
export function useReExtractEntities(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation<ReExtractResponse, Error>({
		mutationFn: async () => {
			const { data } = await apiClient.post<ReExtractResponse>(
				`/documents/${documentId}/re-extract-entities`,
			);
			return data;
		},
		onSuccess: () => {
			// Invalidate so the panel shows updated results once the worker finishes.
			// The user can manually refresh or we rely on stale-time expiry.
			queryClient.invalidateQueries({ queryKey: entityKeys.document(documentId) });
		},
	});
}
