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
