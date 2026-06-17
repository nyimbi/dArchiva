// (c) Copyright Datacraft, 2026
/**
 * Document relationship linking — API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type RelationshipType =
	| 'related'
	| 'supersedes'
	| 'amendment_of'
	| 'attachment_to'
	| 'version_of';

export const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
	related: 'Related',
	supersedes: 'Supersedes',
	amendment_of: 'Amendment Of',
	attachment_to: 'Attachment To',
	version_of: 'Version Of',
};

export interface DocumentRelationship {
	id: string;
	source_document_id: string;
	target_document_id: string;
	relationship_type: RelationshipType;
	note: string | null;
	tenant_id: string | null;
	created_by_id: string;
	created_at: string;
	source_title: string | null;
	target_title: string | null;
}

export interface CreateRelationshipPayload {
	target_document_id: string;
	relationship_type: RelationshipType;
	note?: string;
}

export const relationshipKeys = {
	all: ['document-relationships'] as const,
	list: (documentId: string) => [...relationshipKeys.all, documentId] as const,
};

export function useDocumentRelationships(documentId: string) {
	return useQuery({
		queryKey: relationshipKeys.list(documentId),
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentRelationship[]>(
				`/documents/${documentId}/relationships`,
			);
			return data;
		},
		enabled: !!documentId,
	});
}

export function useCreateRelationship(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: CreateRelationshipPayload) => {
			const { data } = await apiClient.post<DocumentRelationship>(
				`/documents/${documentId}/relationships`,
				payload,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: relationshipKeys.list(documentId) });
		},
	});
}

export function useDeleteRelationship(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (relationshipId: string) => {
			await apiClient.delete(
				`/documents/${documentId}/relationships/${relationshipId}`,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: relationshipKeys.list(documentId) });
		},
	});
}
