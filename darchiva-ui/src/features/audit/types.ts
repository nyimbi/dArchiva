// (c) Copyright Datacraft, 2026
/**
 * Audit log feature types.
 */

export type AuditAction =
	| 'create'
	| 'update'
	| 'delete'
	| 'view'
	| 'download'
	| 'upload'
	| 'share'
	| 'unshare'
	| 'move'
	| 'copy'
	| 'rename'
	| 'tag'
	| 'untag'
	| 'ocr'
	| 'login'
	| 'logout'
	| 'permission_change';

export type AuditResourceType =
	| 'document'
	| 'folder'
	| 'user'
	| 'group'
	| 'role'
	| 'tag'
	| 'workflow'
	| 'email'
	| 'system';

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

export interface AuditListResponse {
	items: AuditEntry[];
	total: number;
	page: number;
	page_size: number;
}

export interface AuditFilters {
	action?: AuditAction;
	resource_type?: AuditResourceType;
	resource_id?: string;
	user_id?: string;
	date_from?: string;
	date_to?: string;
}

export const ACTION_LABELS: Record<AuditAction, string> = {
	create: 'Created',
	update: 'Updated',
	delete: 'Deleted',
	view: 'Viewed',
	download: 'Downloaded',
	upload: 'Uploaded',
	share: 'Shared',
	unshare: 'Unshared',
	move: 'Moved',
	copy: 'Copied',
	rename: 'Renamed',
	tag: 'Tagged',
	untag: 'Untagged',
	ocr: 'OCR Processed',
	login: 'Logged In',
	logout: 'Logged Out',
	permission_change: 'Permission Changed',
};

export const RESOURCE_LABELS: Record<AuditResourceType, string> = {
	document: 'Document',
	folder: 'Folder',
	user: 'User',
	group: 'Group',
	role: 'Role',
	tag: 'Tag',
	workflow: 'Workflow',
	email: 'Email',
	system: 'System',
};
