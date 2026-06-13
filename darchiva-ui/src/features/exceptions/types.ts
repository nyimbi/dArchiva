// (c) Copyright Datacraft, 2026
/**
 * Exception queue types.
 */

export type ExceptionType =
	| 'scan_quality'
	| 'ocr_failure'
	| 'missing_pages'
	| 'duplicate_document'
	| 'classification_error'
	| 'validation_failure'
	| 'routing_error'
	| 'ingestion_error'
	| 'metadata_incomplete'
	| 'other';

export type ExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ExceptionStatus = 'open' | 'in_progress' | 'resolved' | 'dismissed';

export interface DocumentException {
	id: string;
	type: ExceptionType;
	severity: ExceptionSeverity;
	status: ExceptionStatus;
	documentId?: string;
	documentTitle?: string;
	batchId?: string;
	batchNumber?: string;
	description: string;
	details?: Record<string, unknown>;
	createdAt: string;
	updatedAt: string;
	resolvedAt?: string;
	resolvedBy?: string;
	resolutionNotes?: string;
	dismissedAt?: string;
	dismissedBy?: string;
}

export interface ExceptionStats {
	total: number;
	open: number;
	inProgress: number;
	resolved: number;
	dismissed: number;
	bySeverity: Record<ExceptionSeverity, number>;
	byType: Record<ExceptionType, number>;
}

export interface ExceptionFilters {
	status?: ExceptionStatus;
	type?: ExceptionType;
	severity?: ExceptionSeverity;
	batchId?: string;
	page?: number;
	pageSize?: number;
}

export const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
	scan_quality: 'Scan Quality',
	ocr_failure: 'OCR Failure',
	missing_pages: 'Missing Pages',
	duplicate_document: 'Duplicate',
	classification_error: 'Classification Error',
	validation_failure: 'Validation Failure',
	routing_error: 'Routing Error',
	ingestion_error: 'Ingestion Error',
	metadata_incomplete: 'Incomplete Metadata',
	other: 'Other',
};

export const EXCEPTION_SEVERITY_CONFIG: Record<
	ExceptionSeverity,
	{ label: string; color: string; bgColor: string; borderColor: string }
> = {
	low: {
		label: 'Low',
		color: 'text-blue-400',
		bgColor: 'bg-blue-500/10',
		borderColor: 'border-blue-500/30',
	},
	medium: {
		label: 'Medium',
		color: 'text-yellow-400',
		bgColor: 'bg-yellow-500/10',
		borderColor: 'border-yellow-500/30',
	},
	high: {
		label: 'High',
		color: 'text-orange-400',
		bgColor: 'bg-orange-500/10',
		borderColor: 'border-orange-500/30',
	},
	critical: {
		label: 'Critical',
		color: 'text-red-400',
		bgColor: 'bg-red-500/10',
		borderColor: 'border-red-500/30',
	},
};

export const EXCEPTION_STATUS_CONFIG: Record<
	ExceptionStatus,
	{ label: string; color: string; bgColor: string }
> = {
	open: { label: 'Open', color: 'text-slate-300', bgColor: 'bg-slate-500/10' },
	in_progress: { label: 'In Progress', color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
	resolved: { label: 'Resolved', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
	dismissed: { label: 'Dismissed', color: 'text-slate-500', bgColor: 'bg-slate-600/10' },
};
