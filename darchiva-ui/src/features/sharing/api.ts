// (c) Copyright Datacraft, 2026
/**
 * External document sharing API hooks.
 * Targets: POST/GET /documents/{id}/share-links, DELETE /documents/{id}/share-links/{link_id}
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShareLink {
	id: string;
	document_id: string;
	token: string;
	url: string;
	expires_at: string | null;
	password_protected: boolean;
	max_views: number | null;
	view_count: number;
	is_active: boolean;
	is_valid: boolean;
	created_at: string;
}

export interface CreateShareLinkInput {
	expiry: '1h' | '24h' | '7d' | '30d' | 'never';
	password?: string;
	max_views?: number;
}

export interface PublicShareInfo {
	document_id: string;
	token: string;
	view_count: number;
	expires_at: string | null;
	password_protected: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const shareKeys = {
	all: ['document-share-links'] as const,
	byDocument: (documentId: string) =>
		[...shareKeys.all, 'document', documentId] as const,
	public: (token: string) => [...shareKeys.all, 'public', token] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/** List all share links for a document (active and inactive). */
export function useDocumentShares(documentId: string) {
	return useQuery({
		queryKey: shareKeys.byDocument(documentId),
		queryFn: async () => {
			const { data } = await apiClient.get<ShareLink[]>(
				`/documents/${documentId}/share-links`,
			);
			return Array.isArray(data) ? data : [];
		},
		enabled: !!documentId,
	});
}

/** Create a new expiring share link for a document. */
export function useCreateShare() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			documentId,
			input,
		}: {
			documentId: string;
			input: CreateShareLinkInput;
		}) => {
			const { data } = await apiClient.post<ShareLink>(
				`/documents/${documentId}/share-links`,
				input,
			);
			return data;
		},
		onSuccess: (_, { documentId }) => {
			queryClient.invalidateQueries({
				queryKey: shareKeys.byDocument(documentId),
			});
		},
	});
}

/** Deactivate (soft-delete) a share link. */
export function useRevokeShare() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			documentId,
			linkId,
		}: {
			documentId: string;
			linkId: string;
		}) => {
			await apiClient.delete(
				`/documents/${documentId}/share-links/${linkId}`,
			);
		},
		onSuccess: (_, { documentId }) => {
			queryClient.invalidateQueries({
				queryKey: shareKeys.byDocument(documentId),
			});
		},
	});
}

/** Resolve a public share token (no auth). Used on the public share page. */
export function usePublicShare(token: string, password?: string) {
	return useQuery({
		queryKey: shareKeys.public(token),
		queryFn: async () => {
			const params = password ? { password } : {};
			const { data } = await apiClient.get<PublicShareInfo>(
				`/share/${token}`,
				{ params },
			);
			return data;
		},
		enabled: !!token,
		retry: false,
	});
}
