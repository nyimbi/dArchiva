// (c) Copyright Datacraft, 2026
/**
 * Smart filing suggestions API hooks.
 *
 * Suggestions are derived server-side by analysing where peer documents of
 * the same document_type have been filed.  The document must have a
 * document_type assigned before suggestions are available.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SuggestedFolder {
	folder_id: string;
	folder_path: string;
	confidence: number;   // 0..1
	document_count: number;
}

export interface SuggestedTag {
	tag_id: string;
	tag_name: string;
	tag_color: string;
	confidence: number;   // 0..1
	document_count: number;
}

export interface FilingSuggestionsResponse {
	suggested_folders: SuggestedFolder[];
	suggested_tags: SuggestedTag[];
	suggested_document_type: string | null;
	based_on_type: string | null;
	peer_count: number;
}

export interface ApplyFilingSuggestionRequest {
	folder_id?: string;
	tag_ids?: string[];
}

export interface ApplyFilingSuggestionResponse {
	moved: boolean;
	tags_added: number;
	folder_id: string | null;
	tag_ids: string[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const filingSuggestionKeys = {
	all: ['filing-suggestions'] as const,
	document: (documentId: string) =>
		[...filingSuggestionKeys.all, documentId] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch smart filing suggestions for a document.
 *
 * Returns empty suggestion lists when the document has no document_type
 * assigned yet — never throws 404.
 */
export function useFilingSuggestions(documentId: string) {
	return useQuery({
		queryKey: filingSuggestionKeys.document(documentId),
		queryFn: async (): Promise<FilingSuggestionsResponse> => {
			const { data } = await apiClient.get<FilingSuggestionsResponse>(
				`/documents/${documentId}/filing-suggestions`,
			);
			return data;
		},
		enabled: !!documentId,
		staleTime: 5 * 60 * 1000,
	});
}

/**
 * Apply a filing suggestion (move to folder and/or add tags).
 *
 * Invalidates the suggestions query on success so confidence scores
 * reflect the newly filed document.
 */
export function useApplyFilingSuggestion(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation<
		ApplyFilingSuggestionResponse,
		Error,
		ApplyFilingSuggestionRequest
	>({
		mutationFn: async (body) => {
			const { data } = await apiClient.post<ApplyFilingSuggestionResponse>(
				`/documents/${documentId}/apply-filing-suggestion`,
				body,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: filingSuggestionKeys.document(documentId),
			});
		},
	});
}
