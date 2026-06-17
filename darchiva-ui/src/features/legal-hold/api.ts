// Legal Hold API hooks
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LegalHold {
	id: string;
	document_id: string;
	hold_name: string;
	hold_reason: string;
	held_by_id: string;
	released_by_id: string | null;
	held_at: string;
	released_at: string | null;
	tenant_id: string;
}

export interface PlaceHoldPayload {
	hold_name: string;
	hold_reason: string;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const legalHoldKeys = {
	all: ['legal-holds'] as const,
	forDocument: (documentId: string) => ['legal-holds', 'document', documentId] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useLegalHolds(documentId: string) {
	return useQuery({
		queryKey: legalHoldKeys.forDocument(documentId),
		queryFn: async (): Promise<LegalHold[]> => {
			const { data } = await apiClient.get<LegalHold[]>(
				`/documents/${documentId}/legal-holds`,
			);
			return data;
		},
		enabled: !!documentId,
		staleTime: 30_000,
	});
}

export function usePlaceLegalHold(documentId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: PlaceHoldPayload): Promise<LegalHold> => {
			const { data } = await apiClient.post<LegalHold>(
				`/documents/${documentId}/legal-holds`,
				payload,
			);
			return data;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: legalHoldKeys.forDocument(documentId) });
		},
	});
}

export function useReleaseLegalHold(documentId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (holdId: string): Promise<LegalHold> => {
			const { data } = await apiClient.delete<LegalHold>(`/legal-holds/${holdId}`);
			return data;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: legalHoldKeys.forDocument(documentId) });
		},
	});
}
