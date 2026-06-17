// (c) Copyright Datacraft, 2026
/**
 * Document annotations — API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type AnnotationType = 'highlight' | 'note' | 'rect' | 'underline';

export interface DocumentAnnotation {
	id: string;
	document_id: string;
	page_number: number;
	annotation_type: AnnotationType;
	x: number;
	y: number;
	width: number;
	height: number;
	content: string | null;
	color: string;
	created_by_id: string;
	tenant_id: string;
	created_at: string;
	updated_at: string;
}

export interface CreateAnnotationPayload {
	page_number: number;
	annotation_type: AnnotationType;
	x: number;
	y: number;
	width: number;
	height: number;
	text?: string;
	color?: string;
}

export interface UpdateAnnotationPayload {
	x?: number;
	y?: number;
	width?: number;
	height?: number;
	content?: string;
	color?: string;
}

export const annotationKeys = {
	all: ['document-annotations'] as const,
	list: (documentId: string) => [...annotationKeys.all, documentId] as const,
};

export function useDocumentAnnotations(documentId: string) {
	return useQuery({
		queryKey: annotationKeys.list(documentId),
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentAnnotation[]>(
				`/documents/${documentId}/annotations`,
			);
			return data;
		},
		enabled: !!documentId,
	});
}

export function useCreateAnnotation(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: CreateAnnotationPayload) => {
			const body = {
				page_number: payload.page_number,
				annotation_type: payload.annotation_type,
				x: payload.x,
				y: payload.y,
				width: payload.width,
				height: payload.height,
				content: payload.text ?? null,
				color: payload.color ?? '#FFD700',
			};
			const { data } = await apiClient.post<DocumentAnnotation>(
				`/documents/${documentId}/annotations`,
				body,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: annotationKeys.list(documentId) });
		},
	});
}

export function useUpdateAnnotation(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			annotationId,
			payload,
		}: {
			annotationId: string;
			payload: UpdateAnnotationPayload;
		}) => {
			const { data } = await apiClient.patch<DocumentAnnotation>(
				`/documents/${documentId}/annotations/${annotationId}`,
				payload,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: annotationKeys.list(documentId) });
		},
	});
}

export function useDeleteAnnotation(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (annotationId: string) => {
			await apiClient.delete(
				`/documents/${documentId}/annotations/${annotationId}`,
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: annotationKeys.list(documentId) });
		},
	});
}
