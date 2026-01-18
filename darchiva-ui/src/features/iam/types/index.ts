// IAM System Types - Identity & Access Management

// Permission levels
export type PermissionLevel = 'none' | 'read' | 'write' | 'admin' | 'owner';

// Permission categories aligned with backend scopes
export const PERMISSION_CATEGORIES = [
	'node', 'document', 'page', 'tag', 'user', 'group', 'role',
	'workflow', 'portfolio', 'case', 'bundle', 'scanning', 'billing',
	'settings', 'audit', 'tenant', 'system',
] as const;

export type PermissionCategory = (typeof PERMISSION_CATEGORIES)[number];

export interface Permission {
	id: string;
	codename: string;
	name: string;
	category: PermissionCategory;
	description?: string;
	is_dangerous?: boolean;
}

export interface PermissionGroup {
	category: PermissionCategory;
	label: string;
	permissions: Permission[];
}

// Role with full permission details
export interface Role {
	id: string;
	name: string;
	description?: string;
	is_system: boolean;
	is_default?: boolean;
	permissions: Permission[];
	user_count: number;
	group_count: number;
	created_at: string;
	updated_at?: string;
}

export interface RoleTemplate {
	id: string;
	name: string;
	description: string;
	icon: string;
	permission_ids: string[];
}

// Department/Team hierarchy
export interface Department {
	id: string;
	name: string;
	code: string;
	parent_id?: string;
	head_user_id?: string;
	member_count: number;
	children?: Department[];
}

// Enhanced user with IAM details
export interface IAMUser {
	id: string;
	username: string;
	email: string;
	first_name?: string;
	last_name?: string;
	avatar_url?: string;
	is_active: boolean;
	is_superuser: boolean;
	department_id?: string;
	department?: Department;
	groups: GroupRef[];
	roles: RoleRef[];
	direct_permissions: Permission[];
	effective_permissions: string[]; // Computed: roles + groups + direct
	mfa_enabled: boolean;
	passkey_enabled: boolean;
	last_login?: string;
	created_at: string;
	updated_at?: string;
	sessions: UserSession[];
}

export interface GroupRef {
	id: string;
	name: string;
}

export interface RoleRef {
	id: string;
	name: string;
}

// User sessions
export interface UserSession {
	id: string;
	user_id: string;
	ip_address: string;
	user_agent: string;
	device_type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
	location?: string;
	is_current: boolean;
	created_at: string;
	last_active_at: string;
	expires_at: string;
}

// Group with hierarchy
export interface Group {
	id: string;
	name: string;
	description?: string;
	parent_id?: string;
	path: string[]; // Ancestry path
	depth: number;
	member_count: number;
	direct_member_count: number;
	roles: RoleRef[];
	permissions: Permission[];
	inherited_permissions: Permission[];
	children?: Group[];
	created_at: string;
}

export interface GroupMember {
	id: string;
	username: string;
	email: string;
	first_name?: string;
	last_name?: string;
	avatar_url?: string;
	is_active: boolean;
	joined_at: string;
	is_inherited: boolean; // Member via parent group
	source_group_id?: string;
}

// Permission matrix
export interface PermissionMatrixRow {
	entity_type: 'user' | 'group';
	entity_id: string;
	entity_name: string;
	permissions: Record<string, PermissionLevel>;
}

export interface PermissionMatrixCell {
	level: PermissionLevel;
	is_inherited: boolean;
	source?: string; // Role or group that grants this
}

// Access events for audit
export interface AccessEvent {
	id: string;
	timestamp: string;
	user_id: string;
	user_name: string;
	action: string;
	resource_type: string;
	resource_id?: string;
	resource_name?: string;
	ip_address: string;
	success: boolean;
	details?: Record<string, unknown>;
}

// IAM Dashboard stats
export interface IAMStats {
	total_users: number;
	active_users: number;
	inactive_users: number;
	active_sessions: number;
	pending_invitations: number;
	total_roles: number;
	total_groups: number;
	total_permissions: number;
	users_by_role: Record<string, number>;
	users_by_department: Record<string, number>;
	login_activity: { date: string; count: number }[];
	permission_coverage: { category: string; granted: number; total: number }[];
}

// User invitation
export interface UserInvitation {
	id: string;
	email: string;
	role_ids: string[];
	group_ids: string[];
	invited_by: string;
	invited_at: string;
	expires_at: string;
	accepted_at?: string;
	status: 'pending' | 'accepted' | 'expired' | 'revoked';
}

// Bulk operations
export interface BulkUserOperation {
	user_ids: string[];
	operation: 'activate' | 'deactivate' | 'delete' | 'assign_role' | 'remove_role' | 'assign_group' | 'remove_group';
	role_id?: string;
	group_id?: string;
}

// User home page types
export interface WorkflowTask {
	id: string;
	title: string;
	description?: string;
	workflow_name: string;
	document_id?: string;
	document_title?: string;
	task_type: 'approval' | 'review' | 'sign' | 'classify' | 'custom';
	priority: 'low' | 'medium' | 'high' | 'urgent';
	due_date?: string;
	assigned_at: string;
	status: 'pending' | 'in_progress' | 'completed' | 'overdue';
}

export interface RecentDocument {
	id: string;
	title: string;
	document_type?: string;
	thumbnail_url?: string;
	accessed_at: string;
	action: 'viewed' | 'edited' | 'shared' | 'uploaded' | 'downloaded';
	folder_path?: string;
}

export interface FavoriteItem {
	id: string;
	item_type: 'document' | 'folder' | 'search' | 'workflow';
	item_id: string;
	title: string;
	icon?: string;
	added_at: string;
}

export interface ActivityItem {
	id: string;
	type: 'document' | 'workflow' | 'share' | 'comment' | 'mention' | 'system';
	title: string;
	description?: string;
	actor_name?: string;
	actor_avatar?: string;
	timestamp: string;
	link?: string;
}

export interface CalendarEvent {
	id: string;
	title: string;
	date: string;
	type: 'deadline' | 'review' | 'meeting' | 'reminder';
	document_id?: string;
	workflow_id?: string;
}

export interface UserNotification {
	id: string;
	type: 'info' | 'success' | 'warning' | 'error';
	title: string;
	message?: string;
	read: boolean;
	created_at: string;
	action_url?: string;
}

export interface UserHomeData {
	tasks: WorkflowTask[];
	recent_documents: RecentDocument[];
	favorites: FavoriteItem[];
	activity: ActivityItem[];
	calendar: CalendarEvent[];
	notifications: UserNotification[];
	quick_stats: {
		pending_tasks: number;
		documents_today: number;
		storage_used_pct: number;
		unread_notifications: number;
	};
}

// API input types
export interface CreateRoleInput {
	name: string;
	description?: string;
	permission_ids: string[];
	template_id?: string;
}

export interface UpdateRoleInput {
	name?: string;
	description?: string;
	permission_ids?: string[];
}

export interface InviteUserInput {
	email: string;
	role_ids?: string[];
	group_ids?: string[];
	department_id?: string;
	message?: string;
}

export interface CreateGroupInput {
	name: string;
	description?: string;
	parent_id?: string;
	role_ids?: string[];
}
