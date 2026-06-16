// Share link hooks for document expiring links
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface ShareLink {
	id: string;
	documentId: string;
	token: string;
	url: string;
	expiresAt: string | null;
	passwordProtected: boolean;
	maxViews: number | null;
	viewCount: number;
	isActive: boolean;
	isValid: boolean;
	createdAt: string;
}

export interface CreateShareLinkRequest {
	expiry: '1h' | '24h' | '7d' | '30d' | 'never';
	password?: string;
	maxViews?: number;
}

const shareLinksKeys = {
	all: ['share-links'] as const,
	forDocument: (documentId: string) => [...shareLinksKeys.all, documentId] as const,
};

export function useShareLinks(documentId: string) {
	return useQuery({
		queryKey: shareLinksKeys.forDocument(documentId),
		queryFn: async () => {
			const { data } = await apiClient.get<ShareLink[]>(
				`/documents/${documentId}/share-links`,
			);
			return data;
		},
		enabled: !!documentId,
	});
}

export function useCreateShareLink(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (req: CreateShareLinkRequest) => {
			const payload: Record<string, unknown> = { expiry: req.expiry };
			if (req.password) payload.password = req.password;
			if (req.maxViews != null) payload.max_views = req.maxViews;
			const { data } = await apiClient.post<ShareLink>(
				`/documents/${documentId}/share-links`,
				payload,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: shareLinksKeys.forDocument(documentId) });
		},
	});
}

export function useDeactivateShareLink(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (linkId: string) => {
			await apiClient.delete(
				`/documents/${documentId}/share-links/${linkId}`,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: shareLinksKeys.forDocument(documentId) });
		},
	});
}
