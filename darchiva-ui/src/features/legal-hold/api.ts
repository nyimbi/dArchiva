// Legal Hold API hooks
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LegalHold {
	id: string;
	document_id: string;
	documentId?: string;
	hold_name: string;
	holdName?: string;
	hold_reason: string;
	holdReason?: string;
	held_by_id: string;
	heldById?: string;
	released_by_id: string | null;
	releasedById?: string | null;
	held_at: string;
	heldAt?: string;
	released_at: string | null;
	releasedAt?: string | null;
	expires_at?: string | null;
	expiresAt?: string | null;
	case_id?: string | null;
	caseId?: string | null;
	case_reference?: string | null;
	caseReference?: string | null;
	release_reason?: string | null;
	releaseReason?: string | null;
	tenant_id: string;
	tenantId?: string;
}

export interface PlaceHoldPayload {
	hold_name: string;
	hold_reason: string;
	expires_at?: string | null;
	case_reference?: string | null;
}

export interface ReleaseHoldPayload {
	holdId: string;
	reason: string;
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
		mutationFn: async ({ holdId, reason }: ReleaseHoldPayload): Promise<LegalHold> => {
			const { data } = await apiClient.delete<LegalHold>(`/legal-holds/${holdId}`, {
				data: { reason },
			});
			return data;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: legalHoldKeys.forDocument(documentId) });
		},
	});
}
