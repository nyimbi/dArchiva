// (c) Copyright Datacraft, 2026
/**
 * Audit log feature types — aligned with backend schema.AuditLog.
 *
 * Backend fields (papermerge/core/features/audit/schema.py):
 *   id, table_name, record_id, operation, timestamp, user_id, username
 *
 * Backend operation values (AuditOperation enum):
 *   INSERT | UPDATE | DELETE | TRUNCATE
 */

export type AuditOperation = 'INSERT' | 'UPDATE' | 'DELETE' | 'TRUNCATE';

/** Shape returned by GET /audit-logs (paginated list items). */
export interface AuditLogEntry {
	id: string;
	tableName: string;       // snake→camelCase by apiClient
	recordId: string;        // snake→camelCase
	operation: AuditOperation;
	timestamp: string;       // ISO-8601
	userId?: string;         // snake→camelCase
	username?: string;
}

/** Paginated wrapper returned by GET /audit-logs. */
export interface AuditListResponse {
	items: AuditLogEntry[];
	pageSize: number;        // snake→camelCase
	pageNumber: number;      // snake→camelCase
	numPages: number;        // snake→camelCase
	totalItems: number;      // snake→camelCase
}

/** Filter state used by the UI — maps to backend query params. */
export interface AuditFilters {
	filterOperation?: string;        // comma-sep: INSERT,UPDATE,...
	filterUsername?: string;         // partial match
	filterUserId?: string;           // exact UUID
	filterTableName?: string;        // comma-sep table names
	filterRecordId?: string;         // exact record UUID
	filterTimestampFrom?: string;    // ISO date string YYYY-MM-DD
	filterTimestampTo?: string;      // ISO date string YYYY-MM-DD
	filterFreeText?: string;
}

/** Human-readable labels for AuditOperation values. */
export const OPERATION_LABELS: Record<AuditOperation, string> = {
	INSERT: 'Created',
	UPDATE: 'Updated',
	DELETE: 'Deleted',
	TRUNCATE: 'Truncated',
};

/** Color classes for operations. */
export const OPERATION_COLORS: Record<AuditOperation, string> = {
	INSERT: 'text-green-500',
	UPDATE: 'text-blue-500',
	DELETE: 'text-red-500',
	TRUNCATE: 'text-orange-500',
};

/** Badge variant for operations. */
export const OPERATION_BADGE_VARIANTS: Record<AuditOperation, string> = {
	INSERT: 'bg-green-500/10 text-green-400 border-green-500/20',
	UPDATE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
	DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
	TRUNCATE: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

/** All operations available as filter options. */
export const ALL_OPERATIONS: AuditOperation[] = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'];

// ── Legacy types kept for backward compat with any remaining usages ──────────
export type AuditAction =
	| 'create' | 'update' | 'delete' | 'view' | 'download' | 'upload'
	| 'share' | 'unshare' | 'move' | 'copy' | 'rename' | 'tag' | 'untag'
	| 'ocr' | 'login' | 'logout' | 'permission_change';

export type AuditResourceType =
	| 'document' | 'folder' | 'user' | 'group' | 'role' | 'tag'
	| 'workflow' | 'email' | 'system';

/** @deprecated Use AuditLogEntry */
export interface AuditEntry {
	id: string;
	action: AuditAction;
	resource_type: AuditResourceType;
	resource_id?: string;
	resource_name?: string;
	user_id: string;
	user_name: string;
	user_email: string;
	ip_address?: string;
	user_agent?: string;
	details?: Record<string, unknown>;
	created_at: string;
}
