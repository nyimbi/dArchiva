// (c) Copyright Datacraft, 2026
// Page-level operation hooks: rotate, delete, reorder.
// Wraps POST/DELETE /api/v1/documents/{id}/pages/...
import { apiClient } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface PageOpResult {
	version: number;
	page_count: number;
}

// ---------------------------------------------------------------------------
// Rotate
// ---------------------------------------------------------------------------

export interface RotatePageVars {
	documentId: string;
	pageNum: number;
	/** 90 | 180 | 270 (positive = CW, negative = CCW) */
	degrees: 90 | 180 | 270 | -90 | -180 | -270;
}

async function rotatePage(vars: RotatePageVars): Promise<PageOpResult> {
	const { data } = await apiClient.post<PageOpResult>(
		`/documents/${vars.documentId}/pages/${vars.pageNum}/rotate`,
		{ degrees: vars.degrees },
	);
	return data;
}

export function useRotatePage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: rotatePage,
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['documents', 'detail', vars.documentId] });
			qc.invalidateQueries({ queryKey: ['documents', vars.documentId, 'pages'] });
		},
	});
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export interface DeletePageVars {
	documentId: string;
	pageNum: number;
}

async function deletePage(vars: DeletePageVars): Promise<PageOpResult> {
	const { data } = await apiClient.delete<PageOpResult>(
		`/documents/${vars.documentId}/pages/${vars.pageNum}`,
	);
	return data;
}

export function useDeletePage() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: deletePage,
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['documents', 'detail', vars.documentId] });
			qc.invalidateQueries({ queryKey: ['documents', vars.documentId, 'pages'] });
		},
	});
}

// ---------------------------------------------------------------------------
// Reorder
// ---------------------------------------------------------------------------

export interface ReorderPagesVars {
	documentId: string;
	/** 1-based page numbers in desired output order, e.g. [3,1,2] */
	pageOrder: number[];
}

async function reorderPages(vars: ReorderPagesVars): Promise<PageOpResult> {
	const { data } = await apiClient.post<PageOpResult>(
		`/documents/${vars.documentId}/pages/reorder`,
		{ page_order: vars.pageOrder },
	);
	return data;
}

export function useReorderPages() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: reorderPages,
		onSuccess: (_data, vars) => {
			qc.invalidateQueries({ queryKey: ['documents', 'detail', vars.documentId] });
			qc.invalidateQueries({ queryKey: ['documents', vars.documentId, 'pages'] });
		},
	});
}
