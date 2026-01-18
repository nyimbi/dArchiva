// (c) Copyright Datacraft, 2026
/**
 * Dashboard feature types.
 */

export interface DashboardStats {
	totalDocuments: number;
	documentsThisMonth: number;
	pendingTasks: number;
	storageUsedBytes: number;
	storageQuotaBytes: number;
	activeWorkflows: number;
	ocrProcessed: number;
}

export interface ActivityItem {
	id: string;
	type: 'document_uploaded' | 'workflow_completed' | 'form_extracted' | 'case_created' | 'document_viewed' | 'user_login';
	description: string;
	timestamp: string;
	userName: string;
	userId?: string;
	resourceId?: string;
	resourceType?: string;
}

export interface PendingTask {
	id: string;
	documentId: string;
	documentTitle: string;
	workflowId: string;
	workflowName: string;
	stepName: string;
	deadline?: string;
	priority: 'low' | 'normal' | 'high' | 'urgent';
	assignedAt: string;
}

export interface ActivityListResponse {
	items: ActivityItem[];
	total: number;
}

export interface PendingTasksResponse {
	tasks: PendingTask[];
	total: number;
}
