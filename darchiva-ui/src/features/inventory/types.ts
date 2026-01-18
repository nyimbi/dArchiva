// (c) Copyright Datacraft, 2026
/**
 * TypeScript types for physical inventory management.
 */

export interface LabelData {
	documentId: string;
	batchId?: string;
	locationCode?: string;
	boxLabel?: string;
	folderLabel?: string;
	sequenceNumber?: number;
}

export interface QRCodeRequest {
	documentId: string;
	batchId?: string;
	locationCode?: string;
	boxLabel?: string;
	folderLabel?: string;
	sequenceNumber?: number;
	format?: 'compact' | 'json' | 'url';
	baseUrl?: string;
	size?: number;
	includeLabel?: boolean;
}

export interface LabelSheetRequest {
	documents: QRCodeRequest[];
	sheetType?: 'letter' | 'a4' | 'avery5160';
	includeText?: boolean;
}

export interface DuplicateMatch {
	documentId: string;
	similarity: number;
}

export interface DuplicateCheckResult {
	documentId: string;
	isDuplicate: boolean;
	matches: DuplicateMatch[];
	phash?: string;
	dhash?: string;
}

export type DiscrepancyType =
	| 'missing_digital'
	| 'missing_physical'
	| 'location_mismatch'
	| 'count_mismatch'
	| 'quality_issue'
	| 'duplicate_found'
	| 'metadata_mismatch';

export type DiscrepancySeverity = 'info' | 'warning' | 'error' | 'critical';

export interface Discrepancy {
	id: string;
	type: DiscrepancyType;
	severity: DiscrepancySeverity;
	description: string;
	suggestedAction: string;
	physicalBarcode?: string;
	digitalId?: string;
}

export interface ReconciliationResult {
	id: string;
	status: 'in_progress' | 'completed' | 'failed';
	totalPhysical: number;
	totalDigital: number;
	matched: number;
	discrepanciesFound: number;
	missingDigitalCount: number;
	missingPhysicalCount: number;
	locationMismatchCount: number;
	otherIssuesCount: number;
	discrepancies: Discrepancy[];
}

export interface PhysicalRecordInput {
	barcode: string;
	locationCode?: string;
	boxLabel?: string;
	folderLabel?: string;
	sequenceNumber?: number;
	description?: string;
	pageCount?: number;
	scannedAt?: string;
	notes?: string;
}

export interface ReconcileRequest {
	physicalRecords: PhysicalRecordInput[];
	matchBy?: string[];
	pageCountTolerance?: number;
	requireQualityCheck?: boolean;
	minQualityScore?: number;
}
