// (c) Copyright Datacraft, 2026
/**
 * Inventory API hooks using React Query.
 */
import { useMutation } from '@tanstack/react-query';
import type {
	QRCodeRequest,
	LabelSheetRequest,
	DuplicateCheckResult,
	ReconciliationResult,
	ReconcileRequest,
} from './types';

const API_BASE = '/api/inventory';

// ============ QR Code Generation ============

export function useGenerateQRCode() {
	return useMutation({
		mutationFn: async (data: QRCodeRequest): Promise<Blob> => {
			const response = await fetch(`${API_BASE}/qr/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					document_id: data.documentId,
					batch_id: data.batchId,
					location_code: data.locationCode,
					box_label: data.boxLabel,
					folder_label: data.folderLabel,
					sequence_number: data.sequenceNumber,
					format: data.format || 'compact',
					base_url: data.baseUrl,
					size: data.size || 200,
					include_label: data.includeLabel || false,
				}),
			});
			if (!response.ok) {
				throw new Error(`Failed to generate QR code: ${response.statusText}`);
			}
			return response.blob();
		},
	});
}

export function useGenerateDataMatrix() {
	return useMutation({
		mutationFn: async (data: QRCodeRequest): Promise<Blob> => {
			const response = await fetch(`${API_BASE}/qr/datamatrix`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					document_id: data.documentId,
					batch_id: data.batchId,
					location_code: data.locationCode,
					box_label: data.boxLabel,
					folder_label: data.folderLabel,
					sequence_number: data.sequenceNumber,
					size: data.size || 200,
				}),
			});
			if (!response.ok) {
				throw new Error(
					`Failed to generate Data Matrix: ${response.statusText}`
				);
			}
			return response.blob();
		},
	});
}

export function useGenerateLabelSheet() {
	return useMutation({
		mutationFn: async (data: LabelSheetRequest): Promise<Blob> => {
			const response = await fetch(`${API_BASE}/qr/sheet`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					documents: data.documents.map((doc) => ({
						document_id: doc.documentId,
						batch_id: doc.batchId,
						location_code: doc.locationCode,
						box_label: doc.boxLabel,
						folder_label: doc.folderLabel,
						sequence_number: doc.sequenceNumber,
					})),
					sheet_type: data.sheetType || 'letter',
					include_text: data.includeText !== false,
				}),
			});
			if (!response.ok) {
				throw new Error(
					`Failed to generate label sheet: ${response.statusText}`
				);
			}
			return response.blob();
		},
	});
}

// ============ Duplicate Detection ============

export function useCheckDuplicates() {
	return useMutation({
		mutationFn: async (data: {
			documentId: string;
			filePath?: string;
			similarityThreshold?: number;
		}): Promise<DuplicateCheckResult> => {
			const response = await fetch(`${API_BASE}/duplicates/check`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					document_id: data.documentId,
					file_path: data.filePath,
					similarity_threshold: data.similarityThreshold || 0.9,
				}),
			});
			if (!response.ok) {
				throw new Error(`Failed to check duplicates: ${response.statusText}`);
			}
			return response.json();
		},
	});
}

export function useBatchCheckDuplicates() {
	return useMutation({
		mutationFn: async (files: File[]): Promise<{
			totalFiles: number;
			duplicatesFound: number;
			results: Record<string, { matchDocumentId: string; similarity: number }[]>;
		}> => {
			const formData = new FormData();
			files.forEach((file) => formData.append('files', file));

			const response = await fetch(`${API_BASE}/duplicates/batch-check`, {
				method: 'POST',
				body: formData,
			});
			if (!response.ok) {
				throw new Error(
					`Failed to batch check duplicates: ${response.statusText}`
				);
			}
			return response.json();
		},
	});
}

// ============ Reconciliation ============

export function useReconcileInventory() {
	return useMutation({
		mutationFn: async (data: ReconcileRequest): Promise<ReconciliationResult> => {
			const response = await fetch(`${API_BASE}/reconcile`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					physical_records: data.physicalRecords.map((r) => ({
						barcode: r.barcode,
						location_code: r.locationCode,
						box_label: r.boxLabel,
						folder_label: r.folderLabel,
						sequence_number: r.sequenceNumber,
						description: r.description,
						page_count: r.pageCount,
						scanned_at: r.scannedAt,
						notes: r.notes,
					})),
					match_by: data.matchBy || ['barcode'],
					page_count_tolerance: data.pageCountTolerance || 0,
					require_quality_check: data.requireQualityCheck !== false,
					min_quality_score: data.minQualityScore || 70,
				}),
			});
			if (!response.ok) {
				throw new Error(
					`Failed to reconcile inventory: ${response.statusText}`
				);
			}
			return response.json();
		},
	});
}

export function useResolveDiscrepancy() {
	return useMutation({
		mutationFn: async (data: {
			discrepancyId: string;
			resolutionNotes: string;
		}): Promise<{
			discrepancyId: string;
			resolved: boolean;
			resolvedAt: string;
			resolvedBy: string;
			resolutionNotes: string;
		}> => {
			const response = await fetch(`${API_BASE}/reconcile/resolve`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					discrepancy_id: data.discrepancyId,
					resolution_notes: data.resolutionNotes,
				}),
			});
			if (!response.ok) {
				throw new Error(
					`Failed to resolve discrepancy: ${response.statusText}`
				);
			}
			return response.json();
		},
	});
}
