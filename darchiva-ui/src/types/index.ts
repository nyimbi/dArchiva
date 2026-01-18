// (c) Copyright Datacraft, 2026

export interface User {
	id: string;
	email: string;
	username: string;
	firstName: string;
	lastName: string;
	avatarUrl?: string;
	tenantId: string;
	roles: string[];
}

export interface Tenant {
	id: string;
	name: string;
	slug: string;
	status: 'active' | 'suspended' | 'trial' | 'cancelled';
	logoUrl?: string;
	primaryColor?: string;
}

export interface Document {
	id: string;
	title: string;
	fileType: string;
	fileSize: number;
	pageCount: number;
	thumbnailUrl?: string;
	createdAt: string;
	updatedAt: string;
	parentId: string | null;
	tags: string[];
	status: 'pending' | 'processing' | 'ready' | 'error';
	ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface Folder {
	id: string;
	name: string;
	parentId: string | null;
	childCount: number;
	documentCount: number;
	createdAt: string;
}

export interface TreeNode {
	id: string;
	name: string;
	type: 'folder' | 'document';
	children?: TreeNode[];
	isExpanded?: boolean;
	isLoading?: boolean;
}

export interface Workflow {
	id: string;
	name: string;
	description?: string;
	steps: WorkflowStep[];
	isActive: boolean;
	createdAt: string;
}

export interface WorkflowStep {
	id: string;
	name: string;
	order: number;
	assigneeType: 'user' | 'group' | 'role';
	assigneeId: string;
	deadlineHours?: number;
}

export interface WorkflowInstance {
	id: string;
	workflowId: string;
	workflowName: string;
	documentId: string;
	documentTitle: string;
	currentStep: number;
	status: 'active' | 'completed' | 'cancelled' | 'failed';
	startedAt: string;
	completedAt?: string;
}

export interface PendingTask {
	id: string;
	instanceId: string;
	stepName: string;
	documentId: string;
	documentTitle: string;
	workflowName: string;
	assignedAt: string;
	deadline?: string;
	priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface FormTemplate {
	id: string;
	name: string;
	category: string;
	fields: FormField[];
	isMultipage: boolean;
	pageCount: number;
	isActive: boolean;
}

export interface FormField {
	id: string;
	name: string;
	fieldType: string;
	label?: string;
	pageNumber: number;
	boundingBox?: BoundingBox;
	isRequired: boolean;
}

export interface BoundingBox {
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface ExtractionResult {
	id: string;
	documentId: string;
	templateId?: string;
	confidence: number;
	status: 'pending' | 'completed' | 'needs_review';
	fieldValues: ExtractedFieldValue[];
	createdAt: string;
}

export interface ExtractedFieldValue {
	fieldName: string;
	value: unknown;
	confidence: number;
	wasCorrected: boolean;
}

export interface Signature {
	id: string;
	pageNumber: number;
	boundingBox: BoundingBox;
	signatureType: 'handwritten' | 'digital' | 'stamp';
	verified: boolean;
	signerName?: string;
}

export interface Case {
	id: string;
	caseNumber: string;
	title: string;
	description?: string;
	status: 'open' | 'in_progress' | 'closed' | 'archived';
	portfolioId?: string;
	documentCount: number;
	createdAt: string;
	closedAt?: string;
}

export interface Portfolio {
	id: string;
	name: string;
	description?: string;
	portfolioType: string;
	caseCount: number;
	createdAt: string;
}

export interface Bundle {
	id: string;
	name: string;
	description?: string;
	documentCount: number;
	status: 'draft' | 'finalized' | 'archived';
	createdAt: string;
}

export interface IngestionSource {
	id: string;
	name: string;
	sourceType: 'watched_folder' | 'email' | 'api';
	mode: 'operational' | 'archival';
	isActive: boolean;
	lastCheckAt?: string;
	createdAt: string;
}

export interface IngestionJob {
	id: string;
	sourceId?: string;
	sourceType: string;
	sourcePath: string;
	status: 'pending' | 'processing' | 'completed' | 'failed';
	mode: string;
	documentId?: string;
	errorMessage?: string;
	createdAt: string;
}

export interface RoutingRule {
	id: string;
	name: string;
	description?: string;
	priority: number;
	conditions: Record<string, unknown>;
	destinationType: 'folder' | 'workflow' | 'user_inbox';
	destinationId?: string;
	mode: 'operational' | 'archival' | 'both';
	isActive: boolean;
}

export interface DashboardStats {
	totalDocuments: number;
	documentsThisMonth: number;
	pendingTasks: number;
	storageUsedBytes: number;
	storageQuotaBytes?: number;
	activeWorkflows: number;
	ocrProcessed: number;
}

export interface RecentActivity {
	id: string;
	type: 'document_uploaded' | 'document_viewed' | 'workflow_completed' | 'form_extracted' | 'case_created';
	description: string;
	documentId?: string;
	timestamp: string;
	userId: string;
	userName: string;
}
