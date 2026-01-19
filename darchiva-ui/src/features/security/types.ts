// (c) Copyright Datacraft, 2026
/**
 * Security feature type definitions.
 */

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'share' | 'approve' | 'admin';

export interface Permission {
	id: string;
	action: PermissionAction;
	granted: boolean;
	inherited?: boolean;
	inheritedFrom?: string;
}

export interface Role {
	id: string;
	name: string;
	description: string;
	permissions: Permission[];
	isSystem: boolean;
	userCount: number;
}

export interface Department {
	id: string;
	name: string;
	parentId: string | null;
	headUserId: string | null;
	userCount: number;
	children?: Department[];
}

export interface User {
	id: string;
	email: string;
	displayName: string;
	avatarUrl?: string;
	roles: Role[];
	departments: Department[];
	clearanceLevel: number;
	mfaEnabled: boolean;
	lastLogin: string;
	status: 'active' | 'inactive' | 'locked';
}

export interface PolicyRule {
	id: string;
	name: string;
	effect: 'allow' | 'deny';
	subjects: string[];
	resources: string[];
	actions: PermissionAction[];
	conditions: PolicyCondition[];
	priority: number;
}

export interface PolicyCondition {
	attribute: string;
	operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains' | 'matches';
	value: string | number | boolean | string[];
}

export interface ABACPolicy {
	id: string;
	name: string;
	description: string;
	version: number;
	status: 'draft' | 'active' | 'archived';
	rules: PolicyRule[];
	createdAt: string;
	updatedAt: string;
}

export interface RelationTuple {
	objectType: string;
	objectId: string;
	relation: string;
	subjectType: string;
	subjectId: string;
}

export interface AccessRequest {
	user: User;
	resource: string;
	action: PermissionAction;
	context: Record<string, unknown>;
}

export interface AccessDecision {
	allowed: boolean;
	reason: string;
	matchedPolicies: string[];
	evaluationTime: number;
}

export interface AuditLogEntry {
	id: string;
	timestamp: string;
	userId: string;
	userName: string;
	action: string;
	resourceType: string;
	resourceId: string;
	resourceName: string;
	outcome: 'success' | 'failure' | 'denied';
	ipAddress: string;
	userAgent: string;
	details: Record<string, unknown>;
}

export interface PermissionMatrixCell {
	roleId: string;
	resourceType: string;
	permissions: Record<PermissionAction, boolean>;
}

export interface AccessGraphNode {
	id: string;
	type: 'user' | 'role' | 'group' | 'department' | 'resource';
	label: string;
	data: Record<string, unknown>;
}

export interface AccessGraphEdge {
	id: string;
	source: string;
	target: string;
	relation: string;
	inherited?: boolean;
}

// PBAC Policy Types
export type PolicyEffect = 'allow' | 'deny';
export type PolicyStatus = 'draft' | 'pending_approval' | 'active' | 'inactive' | 'archived';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type AttributeCategory = 'subject' | 'resource' | 'action' | 'environment';
export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'starts_with' | 'ends_with' | 'matches' | 'exists' | 'not_exists' | 'is_member_of' | 'has_role' | 'in_department';

export interface PBACCondition {
	category: AttributeCategory;
	attribute: string;
	operator: ConditionOperator;
	value: unknown;
}

export interface PBACRule {
	conditions: PBACCondition[];
	logic: 'AND' | 'OR';
}

export interface PBACPolicy {
	id: string;
	name: string;
	description: string;
	effect: PolicyEffect;
	status: PolicyStatus;
	priority: number;
	rules: PBACRule[];
	actions: string[];
	resource_types: string[];
	tenant_id?: string;
	created_by?: string;
	created_at: string;
	updated_at: string;
	valid_from?: string;
	valid_until?: string;
	dsl_text?: string;
}

export interface PolicyApproval {
	id: string;
	policy_id: string;
	policy_name?: string;
	requested_by?: string;
	requester_name?: string;
	requested_at: string;
	status: ApprovalStatus;
	reviewed_by?: string;
	reviewed_at?: string;
	comments?: string;
	changes_summary?: string;
}

export interface PolicyAnalytics {
	total_policies: number;
	active_policies: number;
	pending_approvals: number;
	evaluations_today: number;
	allow_rate: number;
	deny_rate: number;
	top_denied_actions: { action: string; count: number }[];
	evaluation_latency_avg_ms: number;
}

export interface EvaluationLog {
	id: string;
	policy_id?: string;
	timestamp: string;
	subject_id: string;
	subject_username?: string;
	resource_id: string;
	resource_type: string;
	action: string;
	allowed: boolean;
	effect: PolicyEffect;
	reason?: string;
	evaluation_time_ms: number;
}

// Encryption Types
export interface EncryptionKey {
	id: string;
	key_version: number;
	is_active: boolean;
	created_at?: string;
	rotated_at?: string;
	expires_at?: string;
}

export interface HiddenAccessRequest {
	id: string;
	document_id: string;
	document_name?: string;
	requested_by: string;
	requester_name?: string;
	requested_at: string;
	reason: string;
	status: 'pending' | 'approved' | 'denied' | 'expired';
	approved_by?: string;
	approved_at?: string;
	expires_at?: string;
}

export interface DepartmentAccess {
	id: string;
	user_id: string;
	user_name?: string;
	department_id: string;
	department_name?: string;
	granted_by?: string;
	granted_at: string;
	expires_at?: string;
	reason?: string;
}

export interface EncryptionStats {
	total_encrypted_documents: number;
	documents_by_algorithm: { algorithm: string; count: number }[];
	active_kek_version: number;
	total_key_rotations: number;
	pending_access_requests: number;
}
