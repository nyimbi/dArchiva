// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AnnotationType = 'highlight' | 'note' | 'redaction';

export interface Annotation {
	id: string;
	documentId: string;
	pageNumber: number;
	annotationType: AnnotationType;
	/** Normalised 0–1 fraction of page width/height */
	x: number;
	y: number;
	width: number;
	height: number;
	content: string | null;
	color: string;
	/** True once the redaction has been permanently burned into the document */
	applied?: boolean;
	createdById: string;
	tenantId: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateAnnotationRequest {
	pageNumber: number;
	annotationType: AnnotationType;
	x: number;
	y: number;
	width: number;
	height: number;
	content?: string | null;
	color?: string;
}

export interface UpdateAnnotationRequest {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	content?: string | null;
	color?: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const annotationKeys = {
	all: ['annotations'] as const,
	byDocument: (documentId: string) => [...annotationKeys.all, documentId] as const,
	byPage: (documentId: string, pageNumber: number) =>
		[...annotationKeys.byDocument(documentId), pageNumber] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useAnnotations(documentId: string, pageNumber?: number) {
	return useQuery({
		queryKey: pageNumber != null
			? annotationKeys.byPage(documentId, pageNumber)
			: annotationKeys.byDocument(documentId),
		queryFn: async () => {
			const params: Record<string, unknown> = {};
			if (pageNumber != null) params.page_number = pageNumber;
			const { data } = await apiClient.get<Annotation[]>(
				`/documents/${documentId}/annotations`,
				{ params },
			);
			return data;
		},
		enabled: !!documentId,
	});
}

export function useCreateAnnotation(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: CreateAnnotationRequest) => {
			const { data } = await apiClient.post<Annotation>(
				`/documents/${documentId}/annotations`,
				body,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: annotationKeys.byDocument(documentId) });
		},
	});
}

export function useUpdateAnnotation(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ annotationId, ...body }: UpdateAnnotationRequest & { annotationId: string }) => {
			const { data } = await apiClient.patch<Annotation>(
				`/documents/${documentId}/annotations/${annotationId}`,
				body,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: annotationKeys.byDocument(documentId) });
		},
	});
}

export function useDeleteAnnotation(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (annotationId: string) => {
			await apiClient.delete(`/documents/${documentId}/annotations/${annotationId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: annotationKeys.byDocument(documentId) });
		},
	});
}

export interface ApplyRedactionsResponse {
	applied: number;
}

export function useApplyRedactions(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			const { data } = await apiClient.post<ApplyRedactionsResponse>(
				`/documents/${documentId}/annotations/apply-redactions`,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: annotationKeys.byDocument(documentId) });
		},
	});
}
