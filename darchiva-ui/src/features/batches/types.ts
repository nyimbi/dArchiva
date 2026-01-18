// (c) Copyright Datacraft, 2026
/**
 * TypeScript types for batch tracking.
 */

export type LocationType =
	| 'archive_box'
	| 'filing_cabinet'
	| 'drawer'
	| 'shelf'
	| 'room'
	| 'building'
	| 'offsite_storage'
	| 'department'
	| 'folder'
	| 'other';

export type BatchStatus =
	| 'created'
	| 'in_progress'
	| 'paused'
	| 'completed'
	| 'failed'
	| 'cancelled'
	| 'under_review'
	| 'approved';

export interface SourceLocation {
	id: string;
	name: string;
	code: string | null;
	locationType: LocationType;
	description: string | null;
	parentId: string | null;
	address: string | null;
	metadata: Record<string, unknown> | null;
	barcode: string | null;
	isActive: boolean;
	tenantId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface SourceLocationTree extends SourceLocation {
	children: SourceLocationTree[];
}

export interface ScanBatch {
	id: string;
	batchNumber: string;
	name: string | null;
	description: string | null;
	sourceLocationId: string | null;
	scannerId: string | null;
	operatorId: string | null;
	projectId: string | null;
	status: BatchStatus;
	totalDocuments: number;
	totalPages: number;
	processedDocuments: number;
	processedPages: number;
	failedDocuments: number;
	averageQualityScore: number | null;
	documentsRequiringRescan: number;
	boxLabel: string | null;
	folderLabel: string | null;
	scanSettings: Record<string, unknown> | null;
	metadata: Record<string, unknown> | null;
	notes: string | null;
	startedAt: string | null;
	completedAt: string | null;
	tenantId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ScanBatchSummary {
	id: string;
	batchNumber: string;
	name: string | null;
	status: BatchStatus;
	totalDocuments: number;
	totalPages: number;
	processedDocuments: number;
	averageQualityScore: number | null;
	createdAt: string;
}

export interface BatchDashboardStats {
	totalBatches: number;
	activeBatches: number;
	completedBatches: number;
	totalDocumentsScanned: number;
	totalPagesScanned: number;
	documentsRequiringRescan: number;
	averageQualityScore: number | null;
	batchesByStatus: Record<string, number>;
	recentBatches: ScanBatchSummary[];
}

export interface CreateBatchInput {
	name?: string;
	description?: string;
	sourceLocationId?: string;
	scannerId?: string;
	projectId?: string;
	boxLabel?: string;
	folderLabel?: string;
	scanSettings?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	notes?: string;
}

export interface UpdateBatchInput {
	name?: string;
	description?: string;
	sourceLocationId?: string;
	scannerId?: string;
	projectId?: string;
	status?: BatchStatus;
	boxLabel?: string;
	folderLabel?: string;
	scanSettings?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	notes?: string;
}

export interface CreateLocationInput {
	name: string;
	code?: string;
	locationType?: LocationType;
	description?: string;
	parentId?: string;
	address?: string;
	metadata?: Record<string, unknown>;
	barcode?: string;
	isActive?: boolean;
}
