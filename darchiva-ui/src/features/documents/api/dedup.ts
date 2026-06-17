// (c) Copyright Datacraft, 2026
/**
 * Smart duplicate detection — API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery } from '@tanstack/react-query';

export type MatchType = 'exact' | 'content';

export interface DuplicateEntry {
	document_id: string;
	title: string | null;
	created_at: string | null;
	match_type: MatchType;
}

export interface CheckDuplicateResponse {
	is_duplicate: boolean;
	existing_documents: DuplicateEntry[];
}

export const dedupKeys = {
	all: ['document-duplicates'] as const,
	list: (documentId: string) => [...dedupKeys.all, documentId] as const,
};

export function useDocumentDuplicates(documentId: string) {
	return useQuery({
		queryKey: dedupKeys.list(documentId),
		queryFn: async () => {
			const { data } = await apiClient.get<DuplicateEntry[]>(
				`/documents/${documentId}/duplicates`,
			);
			return data;
		},
		enabled: !!documentId,
	});
}

export function useCheckDuplicate() {
	return useMutation({
		mutationFn: async (fileHash: string) => {
			const { data } = await apiClient.post<CheckDuplicateResponse>(
				'/documents/check-duplicate',
				{ file_hash: fileHash },
			);
			return data;
		},
	});
}
