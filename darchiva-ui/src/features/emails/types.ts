// (c) Copyright Datacraft, 2026
/**
 * Email feature TypeScript types.
 */

export type EmailImportStatus = 'pending' | 'processing' | 'completed' | 'failed';
export type EmailSource = 'upload' | 'imap' | 'api' | 'outlook' | 'gmail';
export type AttachmentStatus = 'pending' | 'imported' | 'skipped' | 'failed';
export type EmailAccountType = 'imap' | 'graph_api' | 'gmail_api';
export type ConnectionStatus = 'unknown' | 'connected' | 'error';

export interface EmailAttachment {
	id: string;
	filename: string;
	content_type: string;
	size_bytes: number;
	content_id?: string;
	is_inline: boolean;
	document_id?: string;
	import_status: AttachmentStatus;
	import_error?: string;
}

export interface EmailImport {
	id: string;
	message_id: string;
	thread_id?: string;
	document_id?: string;
	subject?: string;
	from_address: string;
	from_name?: string;
	to_addresses: string[];
	cc_addresses: string[];
	bcc_addresses?: string[];
	reply_to?: string;
	sent_date?: string;
	received_date?: string;
	body_text?: string;
	body_html?: string;
	has_attachments: boolean;
	attachment_count: number;
	source: EmailSource;
	source_account_id?: string;
	import_status: EmailImportStatus;
	import_error?: string;
	folder_id?: string;
	attachments: EmailAttachment[];
	created_at: string;
}

export interface EmailImportListResponse {
	items: EmailImport[];
	total: number;
	page: number;
	page_size: number;
}

export interface EmailAddress {
	address: string;
	name?: string;
}

export interface EmailThread {
	id: string;
	thread_id: string;
	subject: string;
	message_count: number;
	first_message_date?: string;
	last_message_date?: string;
	participants: EmailAddress[];
	folder_id?: string;
}

export interface EmailThreadDetail extends EmailThread {
	messages: EmailImport[];
}

export interface EmailThreadListResponse {
	items: EmailThread[];
	total: number;
	page: number;
	page_size: number;
}

export interface EmailAccount {
	id: string;
	name: string;
	account_type: EmailAccountType;
	email_address: string;
	sync_enabled: boolean;
	sync_folders: string[];
	last_sync_at?: string;
	sync_interval_minutes: number;
	target_folder_id?: string;
	auto_process: boolean;
	import_attachments: boolean;
	is_active: boolean;
	connection_status: ConnectionStatus;
	connection_error?: string;
	created_at: string;
}

export interface EmailAccountCreate {
	name: string;
	account_type: EmailAccountType;
	email_address: string;
	imap_host?: string;
	imap_port?: number;
	imap_use_ssl?: boolean;
	imap_username?: string;
	imap_password?: string;
	oauth_provider?: string;
	oauth_tenant_id?: string;
	oauth_client_id?: string;
	oauth_client_secret?: string;
	sync_enabled?: boolean;
	sync_folders?: string[];
	sync_interval_minutes?: number;
	target_folder_id?: string;
	auto_process?: boolean;
	import_attachments?: boolean;
	attachment_filter?: string[];
}

export interface EmailAccountUpdate {
	name?: string;
	imap_host?: string;
	imap_port?: number;
	imap_use_ssl?: boolean;
	imap_username?: string;
	imap_password?: string;
	sync_enabled?: boolean;
	sync_folders?: string[];
	sync_interval_minutes?: number;
	target_folder_id?: string;
	auto_process?: boolean;
	import_attachments?: boolean;
	attachment_filter?: string[];
	is_active?: boolean;
}

export interface EmailAccountListResponse {
	items: EmailAccount[];
	total: number;
}

export interface RuleCondition {
	field: 'from' | 'to' | 'cc' | 'subject' | 'body' | 'attachment_name' | 'attachment_type';
	operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'matches' | 'exists';
	value?: string;
}

export interface RuleAction {
	action: 'move_to_folder' | 'add_tag' | 'set_document_type' | 'skip_import' | 'extract_attachments_only' | 'notify' | 'run_workflow' | 'set_custom_field';
	value?: string;
	params?: Record<string, unknown>;
}

export interface EmailRule {
	id: string;
	name: string;
	description?: string;
	account_id?: string;
	is_active: boolean;
	priority: number;
	conditions: RuleCondition[];
	actions: RuleAction[];
	created_at: string;
}

export interface EmailRuleCreate {
	name: string;
	description?: string;
	account_id?: string;
	is_active?: boolean;
	priority?: number;
	conditions: RuleCondition[];
	actions: RuleAction[];
}

export interface EmailRuleUpdate {
	name?: string;
	description?: string;
	is_active?: boolean;
	priority?: number;
	conditions?: RuleCondition[];
	actions?: RuleAction[];
}

export interface EmailRuleListResponse {
	items: EmailRule[];
	total: number;
}

export interface SyncStatus {
	account_id: string;
	account_name: string;
	is_syncing: boolean;
	last_sync_at?: string;
	next_sync_at?: string;
	messages_synced: number;
	messages_pending: number;
	error?: string;
}
