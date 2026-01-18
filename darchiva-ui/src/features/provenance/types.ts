// (c) Copyright Datacraft, 2026
/**
 * TypeScript types for document provenance.
 */

export type VerificationStatus =
	| 'unverified'
	| 'pending'
	| 'verified'
	| 'rejected'
	| 'expired';

export type EventType =
	| 'created'
	| 'scanned'
	| 'imported'
	| 'uploaded'
	| 'email_received'
	| 'ocr_started'
	| 'ocr_completed'
	| 'ocr_failed'
	| 'classified'
	| 'metadata_extracted'
	| 'quality_assessed'
	| 'edited'
	| 'annotated'
	| 'redacted'
	| 'merged'
	| 'split'
	| 'rotated'
	| 'cropped'
	| 'page_added'
	| 'page_removed'
	| 'page_reordered'
	| 'version_created'
	| 'version_restored'
	| 'moved'
	| 'copied'
	| 'archived'
	| 'restored'
	| 'deleted'
	| 'permanently_deleted'
	| 'viewed'
	| 'downloaded'
	| 'printed'
	| 'shared'
	| 'shared_revoked'
	| 'verified'
	| 'signature_added'
	| 'signature_verified'
	| 'checksum_verified'
	| 'workflow_started'
	| 'workflow_step_completed'
	| 'workflow_completed'
	| 'approval_requested'
	| 'approved'
	| 'rejected'
	| 'exported'
	| 'synced';

export interface ProvenanceEvent {
	id: string;
	provenanceId: string;
	eventType: EventType;
	timestamp: string;
	actorId: string | null;
	actorType: string | null;
	description: string | null;
	previousState: Record<string, unknown> | null;
	newState: Record<string, unknown> | null;
	relatedDocumentId: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	workflowId: string | null;
	workflowStepId: string | null;
	details: Record<string, unknown> | null;
	eventHash: string | null;
	previousEventHash: string | null;
}

export interface ProvenanceEventSummary {
	id: string;
	eventType: EventType;
	timestamp: string;
	description: string | null;
	actorId: string | null;
}

export interface DocumentProvenance {
	id: string;
	documentId: string;
	batchId: string | null;
	originalFilename: string | null;
	originalFileHash: string | null;
	originalFileSize: number | null;
	originalMimeType: string | null;
	currentFileHash: string | null;
	lastHashVerifiedAt: string | null;
	sourceLocationDetail: string | null;
	physicalReference: string | null;
	ingestionSource: string | null;
	ingestionTimestamp: string | null;
	ingestionUserId: string | null;
	scannerModel: string | null;
	scanResolutionDpi: number | null;
	scanColorMode: string | null;
	scanSettings: Record<string, unknown> | null;
	originalPageCount: number | null;
	currentPageCount: number | null;
	verificationStatus: VerificationStatus;
	verifiedAt: string | null;
	verifiedById: string | null;
	verificationNotes: string | null;
	digitalSignature: string | null;
	signatureAlgorithm: string | null;
	signatureTimestamp: string | null;
	isDuplicate: boolean;
	duplicateOfId: string | null;
	similarityHash: string | null;
	metadata: Record<string, unknown> | null;
	tenantId: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface DocumentProvenanceWithEvents extends DocumentProvenance {
	events: ProvenanceEventSummary[];
}

export interface DocumentProvenanceSummary {
	id: string;
	documentId: string;
	batchId: string | null;
	ingestionSource: string | null;
	verificationStatus: VerificationStatus;
	isDuplicate: boolean;
	eventCount: number;
	lastEventAt: string | null;
}

export interface VerificationResult {
	documentId: string;
	provenanceId: string;
	verificationStatus: VerificationStatus;
	verifiedAt: string;
	verifiedById: string;
	integrityCheckPassed: boolean;
	hashMatch: boolean;
	currentHash: string;
	originalHash: string | null;
}

export interface ChainOfCustodyEntry {
	timestamp: string;
	eventType: EventType;
	actorId: string | null;
	actorName: string | null;
	description: string;
	location: string | null;
	verified: boolean;
}

export interface ChainOfCustody {
	documentId: string;
	provenanceId: string;
	originalSource: string | null;
	ingestionTimestamp: string | null;
	entries: ChainOfCustodyEntry[];
	currentVerificationStatus: VerificationStatus;
	isComplete: boolean;
}

export interface ProvenanceStats {
	totalDocuments: number;
	verifiedCount: number;
	pendingCount: number;
	unverifiedCount: number;
	duplicateCount: number;
	documentsBySource: Record<string, number>;
	documentsByStatus: Record<string, number>;
	recentEvents: ProvenanceEventSummary[];
}
