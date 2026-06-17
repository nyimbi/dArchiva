// (c) Copyright Datacraft, 2026
// POST /api/v1/documents/{documentId}/watermark
import { apiClient } from '@/lib/api-client';
import { useMutation } from '@tanstack/react-query';

export type WatermarkPosition = 'diagonal' | 'header' | 'footer' | 'corner';

export interface WatermarkRequest {
	text: string;
	position?: WatermarkPosition;
	opacity?: number;       // 0.05 – 1.0
	pages?: string | number[]; // "all" or 1-based page list
	font_size?: number;
	color?: string;         // "#RRGGBB"
}

export interface WatermarkResponse {
	task_id: string;
	status: 'queued';
}

async function applyWatermark(
	documentId: string,
	params: WatermarkRequest,
): Promise<WatermarkResponse> {
	const { data } = await apiClient.post<WatermarkResponse>(
		`/documents/${documentId}/watermark`,
		params,
	);
	return data;
}

export function useApplyWatermark() {
	return useMutation({
		mutationFn: ({
			documentId,
			params,
		}: {
			documentId: string;
			params: WatermarkRequest;
		}) => applyWatermark(documentId, params),
	});
}
