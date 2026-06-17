// (c) Copyright Datacraft, 2026
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export interface SimilarDocument {
	document_id: string;
	title: string;
	/** Similarity as 0–100 percentage */
	score: number;
	snippet: string;
}

interface SimilarDocumentsResponse {
	similar: SimilarDocument[];
}

export function useDocumentSimilar(documentId: string | undefined, enabled = true) {
	return useQuery({
		queryKey: ['documents', documentId, 'similar'],
		queryFn: async (): Promise<SimilarDocument[]> => {
			const { data } = await apiClient.get<SimilarDocumentsResponse>(
				`/search/documents/${documentId}/similar`,
				{ params: { limit: 5 } },
			);
			return data.similar ?? [];
		},
		enabled: enabled && !!documentId,
		staleTime: 5 * 60 * 1000,   // 5 min — similarity doesn't change often
		retry: false,               // no embeddings → 500; don't spam
	});
}
