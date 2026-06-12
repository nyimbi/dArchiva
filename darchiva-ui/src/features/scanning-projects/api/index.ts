// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import type {
  QualityControlSample,
  ScanningBatch,
  ScanningMilestone,
  ScanningProject,
  ScanningProjectMetrics,
  ScanningResource,
} from '@/types';

// =====================================================
// Scanning Projects API
// =====================================================

export interface CreateScanningProjectInput {
	code: string;
	name: string;
	description?: string;
	estimated_pages?: number;
	target_dpi?: number;
	color_mode?: 'bitonal' | 'grayscale' | 'color';
	quality_sampling_rate?: number;
	start_date?: string;
	target_end_date?: string;
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
	const { data: response } = await apiClient.get<ScanningProject[]>('/scanning-projects');
	return response;
}

export async function getScanningProject(id: string): Promise<ScanningProject> {
	const { data: response } = await apiClient.get<ScanningProject>(`/scanning-projects/${id}`);
	return response;
}

export async function createScanningProject(
	input: CreateScanningProjectInput
): Promise<ScanningProject> {
	const { data: response } = await apiClient.post<ScanningProject>('/scanning-projects', input);
	return response;
}

export async function updateScanningProject(
	id: string,
	input: UpdateScanningProjectInput
): Promise<ScanningProject> {
	const { data: response } = await apiClient.patch<ScanningProject>(`/scanning-projects/${id}`, input);
	return response;
}

export async function deleteScanningProject(id: string): Promise<void> {
	await apiClient.delete(`/scanning-projects/${id}`);
}

export async function getScanningProjectMetrics(id: string): Promise<ScanningProjectMetrics> {
	const { data: response } = await apiClient.get<ScanningProjectMetrics>(`/scanning-projects/${id}/metrics`);
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
	const { data: response } = await apiClient.get<ScanningBatch[]>(`/scanning-projects/${projectId}/batches`);
	return response;
}

export async function getBatch(projectId: string, batchId: string): Promise<ScanningBatch> {
	const { data: response } = await apiClient.get<ScanningBatch>(
		`/scanning-projects/${projectId}/batches/${batchId}`
	);
	return response;
}

export async function createBatch(
	projectId: string,
	input: CreateBatchInput
): Promise<ScanningBatch> {
	const { data: response } = await apiClient.post<ScanningBatch>(
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
	const { data: response } = await apiClient.patch<ScanningBatch>(
		`/scanning-projects/${projectId}/batches/${batchId}`,
		input
	);
	return response;
}

export async function startBatchScan(projectId: string, batchId: string): Promise<ScanningBatch> {
	const { data: response } = await apiClient.post<ScanningBatch>(
		`/scanning-projects/${projectId}/batches/${batchId}/start-scan`
	);
	return response;
}

export async function completeBatchScan(
	projectId: string,
	batchId: string,
	actualPages: number
): Promise<ScanningBatch> {
	const { data: response } = await apiClient.post<ScanningBatch>(
		`/scanning-projects/${projectId}/batches/${batchId}/complete-scan`,
		{ actualPages }
	);
	return response;
}

// =====================================================
// Batch Documents API
// =====================================================

export interface BatchDocument {
	id: string;
	batchId: string;
	documentId: string;
	pageNumber: number;
	scanJobId: string | null;
	qualityScore: number;
	status: 'pending' | 'accepted' | 'rejected' | 'rescanning';
	needsReview: boolean;
	hasIssues: boolean;
	issueDetails: Record<string, unknown> | null;
	scannedAt: string;
	createdAt: string;
}

export async function getBatchDocuments(
	projectId: string,
	batchId: string
): Promise<BatchDocument[]> {
	const { data: response } = await apiClient.get<BatchDocument[]>(
		`/scanning-projects/${projectId}/batches/${batchId}/documents`
	);
	return response;
}

export interface AddBatchDocumentInput {
	documentId: string;
	pageNumber: number;
	scanJobId?: string;
	qualityScore?: number;
	status?: string;
	needsReview?: boolean;
	hasIssues?: boolean;
	issueDetails?: Record<string, unknown>;
}

export async function addBatchDocument(
	projectId: string,
	batchId: string,
	input: AddBatchDocumentInput
): Promise<BatchDocument> {
	const { data: response } = await apiClient.post<BatchDocument>(
		`/scanning-projects/${projectId}/batches/${batchId}/documents`,
		input
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

export interface CreateShiftInput {
	name: string;
	locationId?: string;
	startTime: string;
	endTime: string;
	daysOfWeek: string;
	targetPagesPerOperator: number;
	breakMinutes?: number;
}

export interface Shift {
	id: string;
	name: string;
	locationId?: string;
	startTime: string;
	endTime: string;
	daysOfWeek: string;
	targetPagesPerOperator: number;
	breakMinutes: number;
	isActive: boolean;
	createdAt: string;
}

export async function getProjectMilestones(projectId: string): Promise<ScanningMilestone[]> {
	const { data: response } = await apiClient.get<ScanningMilestone[]>(
		`/scanning-projects/${projectId}/milestones`
	);
	return response;
}

export async function createMilestone(
	projectId: string,
	input: CreateMilestoneInput
): Promise<ScanningMilestone> {
	const { data: response } = await apiClient.post<ScanningMilestone>(
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
	const { data: response } = await apiClient.patch<ScanningMilestone>(
		`/scanning-projects/${projectId}/milestones/${milestoneId}`,
		input
	);
	return response;
}

export async function createShift(input: CreateShiftInput): Promise<Shift> {
	const { data: response } = await apiClient.post<Shift>('/scanning-projects/shifts', input);
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
	const { data: response } = await apiClient.get<QualityControlSample[]>(
		`/scanning-projects/${projectId}/qc/pending`
	);
	return response;
}

export async function createQCSample(
	projectId: string,
	input: CreateQCSampleInput
): Promise<QualityControlSample> {
	const { data: response } = await apiClient.post<QualityControlSample>(
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
	const { data: response } = await apiClient.patch<QualityControlSample>(
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
	const { data: response } = await apiClient.get<ScanningResource[]>('/scanning-projects/resources');
	return response;
}

export async function getResource(resourceId: string): Promise<ScanningResource> {
	const { data: response } = await apiClient.get<ScanningResource>(`/scanning-projects/resources/${resourceId}`);
	return response;
}

export async function createResource(input: CreateResourceInput): Promise<ScanningResource> {
	const { data: response } = await apiClient.post<ScanningResource>('/scanning-projects/resources', input);
	return response;
}

export async function updateResource(
	resourceId: string,
	input: UpdateResourceInput
): Promise<ScanningResource> {
	const { data: response } = await apiClient.patch<ScanningResource>(
		`/scanning-projects/resources/${resourceId}`,
		input
	);
	return response;
}

export async function deleteResource(resourceId: string): Promise<void> {
	await apiClient.delete(`/scanning-projects/resources/${resourceId}`);
}

// =====================================================
// Scanner Discovery API
// =====================================================

export type ScannerProtocol = 'escl' | 'sane' | 'twain' | 'wia';

export interface DiscoveredScanner {
	name: string;
	host: string;
	port: number;
	protocol: ScannerProtocol;
	uuid?: string;
	manufacturer?: string;
	model?: string;
	serial?: string;
	rootUrl?: string;
	discoveredAt: string;
}

export interface ScannerCapabilities {
	platen: boolean;
	adfPresent: boolean;
	adfDuplex: boolean;
	adfCapacity: number;
	resolutions: number[];
	colorModes: Array<'color' | 'grayscale' | 'monochrome'>;
	formats: Array<'jpeg' | 'png' | 'tiff' | 'pdf'>;
	maxWidthMm: number;
	maxHeightMm: number;
	autoCrop: boolean;
	autoDeskew: boolean;
	blankPageRemoval: boolean;
	brightnessControl: boolean;
	contrastControl: boolean;
}

export interface RegisteredScanner {
	id: string;
	tenantId: string;
	name: string;
	protocol: ScannerProtocol;
	connectionUri: string;
	manufacturer?: string;
	model?: string;
	serialNumber?: string;
	firmwareVersion?: string;
	status: 'online' | 'offline' | 'busy' | 'error' | 'maintenance';
	lastSeenAt?: string;
	locationId?: string;
	isDefault: boolean;
	isActive: boolean;
	notes?: string;
	totalPagesScanned: number;
	capabilities?: ScannerCapabilities;
	createdAt: string;
	updatedAt: string;
}

export interface RegisterScannerInput {
	name: string;
	protocol: ScannerProtocol;
	connectionUri: string;
	locationId?: string;
	isDefault?: boolean;
	isActive?: boolean;
	notes?: string;
}

export async function discoverScanners(
	options?: { timeout?: number; forceRefresh?: boolean }
): Promise<DiscoveredScanner[]> {
	const { data: response } = await apiClient.get<DiscoveredScanner[]>('/scanners/discover', {
		params: {
			timeout: options?.timeout ?? 8,
			force_refresh: options?.forceRefresh ?? false,
		},
	});
	return response;
}

export async function getScanners(includeInactive?: boolean): Promise<RegisteredScanner[]> {
	const { data: response } = await apiClient.get<RegisteredScanner[]>('/scanners', {
		params: { include_inactive: includeInactive ?? false },
	});
	return response;
}

export async function registerScanner(input: RegisterScannerInput): Promise<RegisteredScanner> {
	const { data: response } = await apiClient.post<RegisteredScanner>('/scanners', input);
	return response;
}

export async function getScannerStatus(scannerId: string): Promise<{
	scannerId: string;
	status: 'online' | 'offline' | 'busy' | 'error';
	available: boolean;
	state?: string;
	adfState?: string;
	activeJobs: number;
	error?: string;
	lastChecked: string;
}> {
	const { data: response } = await apiClient.get(`/scanners/${scannerId}/status`);
	return response as {
		scannerId: string;
		status: 'online' | 'offline' | 'busy' | 'error';
		available: boolean;
		state?: string;
		adfState?: string;
		activeJobs: number;
		error?: string;
		lastChecked: string;
	};
}

export async function getScannerCapabilities(scannerId: string): Promise<ScannerCapabilities> {
	const { data: response } = await apiClient.get<ScannerCapabilities>(`/scanners/${scannerId}/capabilities`);
	return response;
}

// =====================================================
// Scan Jobs API - Real Scanner Operations
// =====================================================

export interface ScanJobOptions {
	resolution: number;
	colorMode: 'color' | 'grayscale' | 'monochrome';
	format: 'jpeg' | 'png' | 'tiff' | 'pdf';
	duplex?: boolean;
	inputSource?: 'platen' | 'adf' | 'adf_duplex';
	width?: number;
	height?: number;
	brightness?: number;
	contrast?: number;
}

export interface CreateScanJobInput {
	scannerId: string;
	options: ScanJobOptions;
	projectId?: string;
	batchId?: string;
	destinationFolderId?: string;
}

export interface ScanJob {
	id: string;
	scannerId: string;
	userId: string;
	status: 'pending' | 'scanning' | 'completed' | 'failed' | 'cancelled';
	options: ScanJobOptions;
	pagesScanned: number;
	projectId?: string;
	batchId?: string;
	destinationFolderId?: string;
	errorMessage?: string;
	createdAt: string;
	startedAt?: string;
	completedAt?: string;
}

export interface ScanJobResult {
	jobId: string;
	success: boolean;
	pagesScanned: number;
	format: string;
	scanTimeMs: number;
	documentIds: string[];
	errors: string[];
}

export async function createScanJob(input: CreateScanJobInput): Promise<ScanJob> {
	const { data: response } = await apiClient.post<ScanJob>('/scanners/jobs', input);
	return response;
}

export async function getScanJob(jobId: string): Promise<ScanJob> {
	const { data: response } = await apiClient.get<ScanJob>(`/scanners/jobs/${jobId}`);
	return response;
}

export async function getScanJobResult(jobId: string): Promise<ScanJobResult> {
	const { data: response } = await apiClient.get<ScanJobResult>(`/scanners/jobs/${jobId}/result`);
	return response;
}

export async function getScanJobs(options?: {
	scannerId?: string;
	status?: string;
	limit?: number;
}): Promise<ScanJob[]> {
	const { data: response } = await apiClient.get<ScanJob[]>('/scanners/jobs', { params: options });
	return response;
}

export async function cancelScanJob(jobId: string): Promise<ScanJob> {
	const { data: response } = await apiClient.post<ScanJob>(`/scanners/jobs/${jobId}/cancel`);
	return response;
}

// Helper to wait for a condition with timeout
async function waitFor<T>(
	fn: () => Promise<T>,
	predicate: (result: T) => boolean,
	{ interval = 1000, timeout = 120000 } = {}
): Promise<T> {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		const result = await fn();
		if (predicate(result)) {
			return result;
		}
		await new Promise((resolve) => setTimeout(resolve, interval));
	}
	throw new Error('Timeout waiting for condition');
}

// Quick scan function that creates a job, waits for completion, and returns result
export async function quickScan(input: CreateScanJobInput): Promise<ScanJobResult> {
	// Create scan job - backend auto-executes via background task
	const job = await createScanJob(input);

	// Poll for job completion
	const completedJob = await waitFor(
		() => getScanJob(job.id),
		(j) => j.status === 'completed' || j.status === 'failed' || j.status === 'cancelled',
		{ interval: 1000, timeout: 120000 }
	);

	if (completedJob.status === 'failed') {
		throw new Error(completedJob.errorMessage || 'Scan job failed');
	}

	if (completedJob.status === 'cancelled') {
		throw new Error('Scan job was cancelled');
	}

	// Get the full result with document IDs
	return getScanJobResult(job.id);
}
