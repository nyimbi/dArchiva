// (c) Copyright Datacraft, 2026
import { api } from '@/lib/api';
import type {
	ScanningProject,
	ScanningBatch,
	ScanningMilestone,
	QualityControlSample,
	ScanningResource,
	ScanningProjectMetrics,
} from '@/types';

// =====================================================
// Scanning Projects API
// =====================================================

export interface CreateScanningProjectInput {
	name: string;
	description?: string;
	totalEstimatedPages: number;
	targetDPI: number;
	colorMode: 'bitonal' | 'grayscale' | 'color';
	qualitySampleRate: number;
	startDate?: string;
	targetEndDate?: string;
}

export interface UpdateScanningProjectInput {
	name?: string;
	description?: string;
	status?: ScanningProject['status'];
	totalEstimatedPages?: number;
	targetDPI?: number;
	colorMode?: 'bitonal' | 'grayscale' | 'color';
	qualitySampleRate?: number;
	startDate?: string;
	targetEndDate?: string;
}

export async function getScanningProjects(): Promise<ScanningProject[]> {
	const response = await api.get<ScanningProject[]>('/scanning-projects');
	return response;
}

export async function getScanningProject(id: string): Promise<ScanningProject> {
	const response = await api.get<ScanningProject>(`/scanning-projects/${id}`);
	return response;
}

export async function createScanningProject(
	input: CreateScanningProjectInput
): Promise<ScanningProject> {
	const response = await api.post<ScanningProject>('/scanning-projects', input);
	return response;
}

export async function updateScanningProject(
	id: string,
	input: UpdateScanningProjectInput
): Promise<ScanningProject> {
	const response = await api.patch<ScanningProject>(`/scanning-projects/${id}`, input);
	return response;
}

export async function deleteScanningProject(id: string): Promise<void> {
	await api.delete(`/scanning-projects/${id}`);
}

export async function getScanningProjectMetrics(id: string): Promise<ScanningProjectMetrics> {
	const response = await api.get<ScanningProjectMetrics>(`/scanning-projects/${id}/metrics`);
	return response;
}

// =====================================================
// Batches API
// =====================================================

export interface CreateBatchInput {
	batchNumber: string;
	type: 'box' | 'folder' | 'volume';
	physicalLocation: string;
	barcode?: string;
	estimatedPages: number;
	notes?: string;
}

export interface UpdateBatchInput {
	batchNumber?: string;
	type?: 'box' | 'folder' | 'volume';
	physicalLocation?: string;
	barcode?: string;
	estimatedPages?: number;
	actualPages?: number;
	status?: ScanningBatch['status'];
	assignedOperatorId?: string;
	assignedScannerId?: string;
	notes?: string;
}

export async function getProjectBatches(projectId: string): Promise<ScanningBatch[]> {
	const response = await api.get<ScanningBatch[]>(`/scanning-projects/${projectId}/batches`);
	return response;
}

export async function getBatch(projectId: string, batchId: string): Promise<ScanningBatch> {
	const response = await api.get<ScanningBatch>(
		`/scanning-projects/${projectId}/batches/${batchId}`
	);
	return response;
}

export async function createBatch(
	projectId: string,
	input: CreateBatchInput
): Promise<ScanningBatch> {
	const response = await api.post<ScanningBatch>(
		`/scanning-projects/${projectId}/batches`,
		input
	);
	return response;
}

export async function updateBatch(
	projectId: string,
	batchId: string,
	input: UpdateBatchInput
): Promise<ScanningBatch> {
	const response = await api.patch<ScanningBatch>(
		`/scanning-projects/${projectId}/batches/${batchId}`,
		input
	);
	return response;
}

export async function startBatchScan(projectId: string, batchId: string): Promise<ScanningBatch> {
	const response = await api.post<ScanningBatch>(
		`/scanning-projects/${projectId}/batches/${batchId}/start-scan`
	);
	return response;
}

export async function completeBatchScan(
	projectId: string,
	batchId: string,
	actualPages: number
): Promise<ScanningBatch> {
	const response = await api.post<ScanningBatch>(
		`/scanning-projects/${projectId}/batches/${batchId}/complete-scan`,
		{ actualPages }
	);
	return response;
}

// =====================================================
// Milestones API
// =====================================================

export interface CreateMilestoneInput {
	name: string;
	description?: string;
	targetDate: string;
	targetPages: number;
}

export interface UpdateMilestoneInput {
	name?: string;
	description?: string;
	targetDate?: string;
	targetPages?: number;
	status?: ScanningMilestone['status'];
}

export async function getProjectMilestones(projectId: string): Promise<ScanningMilestone[]> {
	const response = await api.get<ScanningMilestone[]>(
		`/scanning-projects/${projectId}/milestones`
	);
	return response;
}

export async function createMilestone(
	projectId: string,
	input: CreateMilestoneInput
): Promise<ScanningMilestone> {
	const response = await api.post<ScanningMilestone>(
		`/scanning-projects/${projectId}/milestones`,
		input
	);
	return response;
}

export async function updateMilestone(
	projectId: string,
	milestoneId: string,
	input: UpdateMilestoneInput
): Promise<ScanningMilestone> {
	const response = await api.patch<ScanningMilestone>(
		`/scanning-projects/${projectId}/milestones/${milestoneId}`,
		input
	);
	return response;
}

// =====================================================
// Quality Control API
// =====================================================

export interface CreateQCSampleInput {
	batchId: string;
	pageId: string;
	pageNumber: number;
}

export interface UpdateQCSampleInput {
	reviewStatus: QualityControlSample['reviewStatus'];
	imageQuality: number;
	ocrAccuracy?: number;
	issues?: QualityControlSample['issues'];
	notes?: string;
}

export async function getPendingQCSamples(projectId: string): Promise<QualityControlSample[]> {
	const response = await api.get<QualityControlSample[]>(
		`/scanning-projects/${projectId}/qc/pending`
	);
	return response;
}

export async function createQCSample(
	projectId: string,
	input: CreateQCSampleInput
): Promise<QualityControlSample> {
	const response = await api.post<QualityControlSample>(
		`/scanning-projects/${projectId}/qc/samples`,
		input
	);
	return response;
}

export async function updateQCSample(
	projectId: string,
	sampleId: string,
	input: UpdateQCSampleInput
): Promise<QualityControlSample> {
	const response = await api.patch<QualityControlSample>(
		`/scanning-projects/${projectId}/qc/samples/${sampleId}`,
		input
	);
	return response;
}

// =====================================================
// Resources API
// =====================================================

export interface CreateResourceInput {
	type: 'operator' | 'scanner' | 'workstation';
	name: string;
	description?: string;
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
}

export interface UpdateResourceInput {
	name?: string;
	description?: string;
	status?: ScanningResource['status'];
	model?: string;
	maxDPI?: number;
	supportsColor?: boolean;
	supportsDuplex?: boolean;
	location?: string;
	connectedScannerId?: string;
}

export async function getResources(): Promise<ScanningResource[]> {
	const response = await api.get<ScanningResource[]>('/scanning-projects/resources');
	return response;
}

export async function getResource(resourceId: string): Promise<ScanningResource> {
	const response = await api.get<ScanningResource>(`/scanning-projects/resources/${resourceId}`);
	return response;
}

export async function createResource(input: CreateResourceInput): Promise<ScanningResource> {
	const response = await api.post<ScanningResource>('/scanning-projects/resources', input);
	return response;
}

export async function updateResource(
	resourceId: string,
	input: UpdateResourceInput
): Promise<ScanningResource> {
	const response = await api.patch<ScanningResource>(
		`/scanning-projects/resources/${resourceId}`,
		input
	);
	return response;
}

export async function deleteResource(resourceId: string): Promise<void> {
	await api.delete(`/scanning-projects/resources/${resourceId}`);
}
