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
	tags: Tag[];
	status: 'pending' | 'processing' | 'ready' | 'error';
	ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed';
	ocrText?: string;
	documentTypeId?: string;
	customFields?: CustomFieldValue[];
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

// Node types for Commander
export type NodeType = 'folder' | 'document';

export interface NodeItem {
	id: string;
	title: string;
	nodeType: NodeType;
	parentId: string | null;
	createdAt: string;
	updatedAt: string;
	// Folder-specific
	childCount?: number;
	// Document-specific
	fileType?: string;
	fileSize?: number;
	pageCount?: number;
	thumbnailUrl?: string;
	ocrStatus?: 'pending' | 'processing' | 'completed' | 'failed';
	tags?: Tag[];
}

// Viewer types
export interface ViewerPage {
	id: string;
	documentId: string;
	pageNumber: number;
	width: number;
	height: number;
	thumbnailUrl?: string;
	imageUrl?: string;
	ocrText?: string;
}

// Tag types
export interface Tag {
	id: string;
	name: string;
	color: string;
	bgColor: string;
	description?: string;
}

// Custom field types
export type CustomFieldDataType =
	| 'string'
	| 'text'
	| 'number'
	| 'monetary'
	| 'boolean'
	| 'date'
	| 'yearmonth'
	| 'select'
	| 'multiselect';

export interface CustomField {
	id: string;
	name: string;
	dataType: CustomFieldDataType;
	isRequired: boolean;
	options?: string[]; // For select/multiselect
}

export interface CustomFieldValue {
	fieldId: string;
	fieldName: string;
	value: unknown;
}

// Document type
export interface DocumentType {
	id: string;
	name: string;
	customFields: CustomField[];
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

// =====================================================
// Scanning Project Management Types
// =====================================================

export type ScanningProjectStatus =
	| 'planning'
	| 'in_progress'
	| 'quality_review'
	| 'completed'
	| 'on_hold';

export type ScanningBatchStatus =
	| 'pending'
	| 'scanning'
	| 'ocr_processing'
	| 'qc_pending'
	| 'qc_passed'
	| 'qc_failed'
	| 'completed';

export type ScanningBatchType = 'box' | 'folder' | 'volume';

export type ScanningColorMode = 'bitonal' | 'grayscale' | 'color';

export type ScanningResourceType = 'operator' | 'scanner' | 'workstation';

export type ScanningResourceStatus = 'available' | 'busy' | 'maintenance' | 'offline';

export type QCReviewStatus = 'pending' | 'passed' | 'failed' | 'needs_rescan';

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';

export interface ScanningProject {
	id: string;
	code: string;
	name: string;
	description?: string;
	status: ScanningProjectStatus;
	priority?: string;
	projectType?: string;
	clientName?: string;
	clientReference?: string;
	// Page estimates and counts
	estimatedPages?: number;
	estimatedDocuments?: number;
	dailyPageTarget?: number;
	// Computed/aggregated fields (from metrics)
	scannedPages?: number;
	verifiedPages?: number;
	rejectedPages?: number;
	// Scanning settings
	targetDpi: number;
	colorMode: ScanningColorMode;
	duplexMode?: string;
	fileFormat?: string;
	ocrEnabled?: boolean;
	qualitySamplingRate?: number; // Percentage of pages to QC sample (0.0-1.0)
	destinationFolderId?: string;
	projectMetadata?: Record<string, unknown>;
	// Dates
	startDate?: string;
	targetEndDate?: string;
	actualEndDate?: string;
	createdAt: string;
	updatedAt: string;
	deletedAt?: string;
	// Ownership
	tenantId?: string;
	createdBy?: string;
	updatedBy?: string;
}

export interface ScanningBatch {
	id: string;
	projectId: string;
	batchNumber: string;
	type: ScanningBatchType;
	physicalLocation: string;
	barcode?: string;
	estimatedPages: number;
	actualPages: number;
	scannedPages: number;
	status: ScanningBatchStatus;
	assignedOperatorId?: string;
	assignedOperatorName?: string;
	assignedScannerId?: string;
	assignedScannerName?: string;
	startedAt?: string;
	completedAt?: string;
	notes?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ScanningMilestone {
	id: string;
	projectId: string;
	name: string;
	description?: string;
	targetDate: string;
	targetPages: number;
	actualPages: number;
	status: MilestoneStatus;
	completedAt?: string;
	createdAt: string;
}

export interface QCIssue {
	id: string;
	type: 'skew' | 'blur' | 'cutoff' | 'dark' | 'light' | 'missing' | 'duplicate' | 'other';
	description: string;
	severity: 'minor' | 'major' | 'critical';
}

export interface QualityControlSample {
	id: string;
	batchId: string;
	pageId: string;
	pageNumber: number;
	reviewStatus: QCReviewStatus;
	imageQuality: number; // 0-100 score
	ocrAccuracy?: number; // 0-100 score
	issues: QCIssue[];
	reviewerId?: string;
	reviewerName?: string;
	reviewedAt?: string;
	notes?: string;
	createdAt: string;
}

export interface ScanningResource {
	id: string;
	type: ScanningResourceType;
	name: string;
	description?: string;
	status: ScanningResourceStatus;
	// Scanner-specific
	model?: string;
	maxDPI?: number;
	supportsColor?: boolean;
	supportsDuplex?: boolean;
	// Operator-specific
	userId?: string;
	email?: string;
	// Workstation-specific
	location?: string;
	connectedScannerId?: string;
	createdAt: string;
	updatedAt: string;
}

export interface ScanningProjectMetrics {
	projectId: string;
	totalBatches: number;
	completedBatches: number;
	pendingBatches: number;
	inProgressBatches: number;
	totalPages: number;
	scannedPages: number;
	verifiedPages: number;
	rejectedPages: number;
	averagePagesPerDay: number;
	estimatedCompletionDate?: string;
	qcPassRate: number; // Percentage
	avgImageQuality: number;
	avgOcrAccuracy?: number;
}

export interface ScanningProjectStats {
	totalProjects: number;
	activeProjects: number;
	completedProjects: number;
	totalPagesScanned: number;
	totalPagesVerified: number;
	averageQcPassRate: number;
}

// User management types
export interface Group {
	id: string;
	name: string;
	description?: string;
	memberCount: number;
	createdAt: string;
}

export interface Role {
	id: string;
	name: string;
	description?: string;
	permissions: string[];
	isSystem: boolean;
	createdAt: string;
}

export interface Permission {
	id: string;
	name: string;
	description: string;
	category: string;
}

// Shared nodes types
export interface SharedNode {
	id: string;
	nodeId: string;
	nodeTitle: string;
	nodeType: NodeType;
	sharedBy: string;
	sharedByName: string;
	sharedWith: string;
	sharedWithName: string;
	sharedWithType: 'user' | 'group';
	accessLevel: 'view' | 'edit' | 'manage';
	expiresAt?: string;
	createdAt: string;
}

// Audit log types
export interface AuditLogEntry {
	id: string;
	action: string;
	entityType: string;
	entityId: string;
	entityTitle?: string;
	userId: string;
	userName: string;
	ipAddress?: string;
	userAgent?: string;
	details?: Record<string, unknown>;
	timestamp: string;
}

// User preferences
export interface UserPreferences {
	id: string;
	userId: string;
	language: string;
	timezone: string;
	dateFormat: string;
	theme: 'light' | 'dark' | 'system';
	defaultFolderId?: string;
	emailNotifications: boolean;
	desktopNotifications: boolean;
}
