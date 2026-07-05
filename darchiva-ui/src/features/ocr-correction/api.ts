// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OCRCorrection, PageOCRText } from './types';

export function usePageOCRText(documentId: string, pageNumber: number) {
	return useQuery({
		queryKey: ['ocr-text', documentId, pageNumber],
		queryFn: async () => {
			const { data } = await apiClient.get<PageOCRText>(
				`/documents/${documentId}/pages/${pageNumber}/ocr-text`,
			);
			return data;
		},
		enabled: !!documentId && pageNumber > 0,
	});
}

export function useSaveOCRCorrection(documentId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (payload: { pageNumber: number; correctedText: string }) => {
			const { data } = await apiClient.post<OCRCorrection>(
				`/documents/${documentId}/pages/${payload.pageNumber}/ocr-correction`,
				{ corrected_text: payload.correctedText },
			);
			return data;
		},
		onSuccess: (_, vars) => {
			qc.invalidateQueries({ queryKey: ['ocr-text', documentId, vars.pageNumber] });
		},
	});
}

export function useReprocessPageOCR(documentId: string) {
	return useMutation({
		mutationFn: async (pageNumber: number) => {
			const { data } = await apiClient.post<{ queued: boolean; message: string }>(
				`/documents/${documentId}/pages/${pageNumber}/reprocess`,
			);
			return data;
		},
	});
}
