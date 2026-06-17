// (c) Copyright Datacraft, 2026
/**
 * Document expiry — API types and React Query hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DocumentExpiryRecord {
	document_id: string;
	expires_at: string; // ISO 8601
	reminder_days: number[];
	notified_milestones: number[];
	created_by_id: string | null;
	tenant_id: string;
	created_at: string;
	updated_at: string;
}

export interface ExpiryUpsertPayload {
	expires_at: string; // ISO 8601
	reminder_days: number[];
}

export interface UpcomingExpiryItem {
	document_id: string;
	expires_at: string;
	days_until_expiry: number;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const expiryKeys = {
	all: ['document-expiry'] as const,
	document: (documentId: string) => [...expiryKeys.all, documentId] as const,
	upcoming: (days: number) => [...expiryKeys.all, 'upcoming', days] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the expiry record for a single document.
 * Returns `null` (not throws) when no expiry is set (404).
 */
export function useDocumentExpiry(documentId: string) {
	return useQuery<DocumentExpiryRecord | null>({
		queryKey: expiryKeys.document(documentId),
		queryFn: async () => {
			try {
				const { data } = await apiClient.get<DocumentExpiryRecord>(
					`/documents/${documentId}/expiry`,
				);
				return data;
			} catch (err: any) {
				if (err?.response?.status === 404) return null;
				throw err;
			}
		},
		enabled: !!documentId,
	});
}

/** Create or update expiry settings for a document. */
export function useSetDocumentExpiry(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation<DocumentExpiryRecord, Error, ExpiryUpsertPayload>({
		mutationFn: async (payload) => {
			const { data } = await apiClient.put<DocumentExpiryRecord>(
				`/documents/${documentId}/expiry`,
				payload,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: expiryKeys.document(documentId) });
			queryClient.invalidateQueries({ queryKey: expiryKeys.all });
		},
	});
}

/** Remove expiry settings for a document. */
export function useRemoveDocumentExpiry(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation<void, Error, void>({
		mutationFn: async () => {
			await apiClient.delete(`/documents/${documentId}/expiry`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: expiryKeys.document(documentId) });
			queryClient.invalidateQueries({ queryKey: expiryKeys.all });
		},
	});
}

/** List all documents expiring within the next N days for the current tenant. */
export function useUpcomingExpiries(days = 30) {
	return useQuery<UpcomingExpiryItem[]>({
		queryKey: expiryKeys.upcoming(days),
		queryFn: async () => {
			const { data } = await apiClient.get<UpcomingExpiryItem[]>('/expiry/upcoming', {
				params: { days },
			});
			return data;
		},
	});
}
