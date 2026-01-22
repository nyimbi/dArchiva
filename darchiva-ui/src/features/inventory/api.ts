// (c) Copyright Datacraft, 2026
/**
 * Inventory API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
	QRCodeRequest,
	LabelSheetRequest,
	DuplicateCheckResult,
	ReconciliationResult,
	ReconcileRequest,
} from './types';

// ============ Types ============

export interface WarehouseLocation {
	id: string;
	code: string;
	name: string;
	description?: string;
	parentId?: string;
	path: string;
	level: number;
	capacity?: number;
	currentCount: number;
	climateControlled: boolean;
	fireSuppression: boolean;
	accessRestricted: boolean;
	aisle?: string;
	bay?: string;
	shelfNumber?: string;
	position?: string;
	createdAt: string;
}

export interface PhysicalContainer {
	id: string;
	barcode: string;
	containerType: 'box' | 'folder' | 'crate' | 'shelf' | 'cabinet' | 'pallet' | 'room' | 'building';
	label?: string;
	description?: string;
	locationId?: string;
	parentContainerId?: string;
	status: 'in_storage' | 'checked_out' | 'in_transit' | 'missing' | 'destroyed' | 'transferred' | 'pending_review';
	itemCount: number;
	weightKg?: number;
	dimensions?: { width: number; height: number; depth: number };
	retentionDate?: string;
	destructionEligible: boolean;
	legalHold: boolean;
	currentCustodianId?: string;
	lastVerifiedAt?: string;
	createdAt: string;
	scanningProjectId?: string;
}

export interface CustodyEvent {
	id: string;
	containerId: string;
	eventType: string;
	fromUserId?: string;
	toUserId?: string;
	performedById: string;
	fromLocationId?: string;
	toLocationId?: string;
	reason?: string;
	notes?: string;
	signatureCaptured: boolean;
	createdAt: string;
}

export interface ScanResult {
	success: boolean;
	resolvedType?: 'container' | 'document' | 'location';
	resolvedId?: string;
	resolvedData?: Record<string, unknown>;
	errorMessage?: string;
}

export interface InventorySummary {
	containersByStatus: Record<string, number>;
	containersByType: Record<string, number>;
	totalLocations: number;
	overdueForRetention: number;
	legalHolds: number;
}

const API_BASE = '/inventory';

// ============ QR Code Generation ============

async function fetchBlob(url: string, body: unknown): Promise<Blob> {
	const token = localStorage.getItem('darchiva_token');
	const headers: Record<string, string> = { 'Content-Type': 'application/json' };
	if (token) headers['Authorization'] = `Bearer ${token}`;
	const response = await fetch(`/api/v1${url}`, {
		method: 'POST',
		headers,
		body: JSON.stringify(body),
	});
	if (!response.ok) throw new Error('Failed to generate');
	return response.blob();
}

export function useGenerateQRCode() {
	return useMutation({
		mutationFn: async (input: QRCodeRequest): Promise<Blob> => {
			return fetchBlob(`${API_BASE}/qr/generate`, {
				document_id: input.documentId,
				batch_id: input.batchId,
				location_code: input.locationCode,
				box_label: input.boxLabel,
				folder_label: input.folderLabel,
				sequence_number: input.sequenceNumber,
				format: input.format || 'compact',
				base_url: input.baseUrl,
				size: input.size || 200,
				include_label: input.includeLabel || false,
			});
		},
	});
}

export function useGenerateDataMatrix() {
	return useMutation({
		mutationFn: async (input: QRCodeRequest): Promise<Blob> => {
			return fetchBlob(`${API_BASE}/qr/datamatrix`, {
				document_id: input.documentId,
				batch_id: input.batchId,
				location_code: input.locationCode,
				box_label: input.boxLabel,
				folder_label: input.folderLabel,
				sequence_number: input.sequenceNumber,
				size: input.size || 200,
			});
		},
	});
}

export function useGenerateLabelSheet() {
	return useMutation({
		mutationFn: async (input: LabelSheetRequest): Promise<Blob> => {
			return fetchBlob(`${API_BASE}/qr/sheet`, {
				documents: input.documents.map((doc) => ({
					document_id: doc.documentId,
					batch_id: doc.batchId,
					location_code: doc.locationCode,
					box_label: doc.boxLabel,
					folder_label: doc.folderLabel,
					sequence_number: doc.sequenceNumber,
				})),
				sheet_type: input.sheetType || 'letter',
				include_text: input.includeText !== false,
			});
		},
	});
}

// ============ Duplicate Detection ============

export function useCheckDuplicates() {
	return useMutation({
		mutationFn: async (input: {
			documentId: string;
			filePath?: string;
			similarityThreshold?: number;
		}): Promise<DuplicateCheckResult> => {
			const { data } = await apiClient.post<DuplicateCheckResult>(`${API_BASE}/duplicates/check`, {
				document_id: input.documentId,
				file_path: input.filePath,
				similarity_threshold: input.similarityThreshold || 0.9,
			});
			return data;
		},
	});
}

export function useBatchCheckDuplicates() {
	return useMutation({
		mutationFn: async (files: File[]): Promise<{
			totalFiles: number;
			duplicatesFound: number;
			results: Record<string, { matchDocumentId: string; similarity: number }[]>;
		}> => {
			const formData = new FormData();
			files.forEach((file) => formData.append('files', file));

			// For file uploads, we need to use fetch with auth header
			const token = localStorage.getItem('darchiva_token');
			const headers: Record<string, string> = {};
			if (token) headers['Authorization'] = `Bearer ${token}`;

			const response = await fetch(`/api/v1${API_BASE}/duplicates/batch-check`, {
				method: 'POST',
				headers,
				body: formData,
			});
			if (!response.ok) {
				throw new Error(`Failed to batch check duplicates: ${response.statusText}`);
			}
			return response.json();
		},
	});
}

// ============ Reconciliation ============

export function useReconcileInventory() {
	return useMutation({
		mutationFn: async (input: ReconcileRequest): Promise<ReconciliationResult> => {
			const { data } = await apiClient.post<ReconciliationResult>(`${API_BASE}/reconcile`, {
				physical_records: input.physicalRecords.map((r) => ({
					barcode: r.barcode,
					location_code: r.locationCode,
					box_label: r.boxLabel,
					folder_label: r.folderLabel,
					sequence_number: r.sequenceNumber,
					description: r.description,
					page_count: r.pageCount,
					scanned_at: r.scannedAt,
					notes: r.notes,
				})),
				match_by: input.matchBy || ['barcode'],
				page_count_tolerance: input.pageCountTolerance || 0,
				require_quality_check: input.requireQualityCheck !== false,
				min_quality_score: input.minQualityScore || 70,
			});
			return data;
		},
	});
}

interface DiscrepancyResolution {
	discrepancy_id: string;
	resolved: boolean;
	resolved_at: string;
	resolved_by: string;
	resolution_notes: string;
}

export function useResolveDiscrepancy() {
	return useMutation({
		mutationFn: async (input: {
			discrepancyId: string;
			resolutionNotes: string;
		}) => {
			const { data } = await apiClient.post<DiscrepancyResolution>(`${API_BASE}/reconcile/resolve`, {
				discrepancy_id: input.discrepancyId,
				resolution_notes: input.resolutionNotes,
			});
			return {
				discrepancyId: data.discrepancy_id,
				resolved: data.resolved,
				resolvedAt: data.resolved_at,
				resolvedBy: data.resolved_by,
				resolutionNotes: data.resolution_notes,
			};
		},
	});
}


// ============ Warehouse Locations ============

type LocationApiResponse = Array<Record<string, unknown>>;
type LocationSingleResponse = Record<string, unknown>;

function mapLocation(l: Record<string, unknown>): WarehouseLocation {
	return {
		id: l.id as string,
		code: l.code as string,
		name: l.name as string,
		description: l.description as string | undefined,
		parentId: l.parent_id as string | undefined,
		path: l.path as string,
		level: l.level as number,
		capacity: l.capacity as number | undefined,
		currentCount: l.current_count as number,
		climateControlled: l.climate_controlled as boolean,
		fireSuppression: l.fire_suppression as boolean,
		accessRestricted: l.access_restricted as boolean,
		aisle: l.aisle as string | undefined,
		bay: l.bay as string | undefined,
		shelfNumber: l.shelf_number as string | undefined,
		position: l.position as string | undefined,
		createdAt: l.created_at as string,
	};
}

export function useLocations(parentId?: string) {
	return useQuery({
		queryKey: ['inventory', 'locations', parentId],
		queryFn: async (): Promise<WarehouseLocation[]> => {
			const params = new URLSearchParams();
			if (parentId) params.append('parent_id', parentId);
			const { data } = await apiClient.get<LocationApiResponse>(`${API_BASE}/locations?${params}`);
			return data.map(mapLocation);
		},
	});
}

export function useLocation(locationId: string) {
	return useQuery({
		queryKey: ['inventory', 'location', locationId],
		queryFn: async (): Promise<WarehouseLocation> => {
			const { data } = await apiClient.get<LocationSingleResponse>(`${API_BASE}/locations/${locationId}`);
			return mapLocation(data);
		},
		enabled: !!locationId,
	});
}

export function useLocationTree(locationId: string) {
	return useQuery({
		queryKey: ['inventory', 'location', 'tree', locationId],
		queryFn: async (): Promise<WarehouseLocation[]> => {
			const { data } = await apiClient.get<LocationApiResponse>(`${API_BASE}/locations/${locationId}/tree`);
			return data.map(mapLocation);
		},
		enabled: !!locationId,
	});
}

export function useCreateLocation() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			code: string;
			name: string;
			description?: string;
			parentId?: string;
			capacity?: number;
			climateControlled?: boolean;
			fireSuppression?: boolean;
			accessRestricted?: boolean;
			aisle?: string;
			bay?: string;
			shelfNumber?: string;
			position?: string;
		}): Promise<WarehouseLocation> => {
			const { data } = await apiClient.post<LocationSingleResponse>(`${API_BASE}/locations`, {
				code: input.code,
				name: input.name,
				description: input.description,
				parent_id: input.parentId,
				capacity: input.capacity,
				climate_controlled: input.climateControlled,
				fire_suppression: input.fireSuppression,
				access_restricted: input.accessRestricted,
				aisle: input.aisle,
				bay: input.bay,
				shelf_number: input.shelfNumber,
				position: input.position,
			});
			return mapLocation(data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'locations'] });
		},
	});
}


// ============ Physical Containers ============

type ContainerApiResponse = Array<Record<string, unknown>>;
type ContainerSingleResponse = Record<string, unknown>;

function mapContainer(c: Record<string, unknown>): PhysicalContainer {
	return {
		id: c.id as string,
		barcode: c.barcode as string,
		containerType: c.container_type as PhysicalContainer['containerType'],
		label: c.label as string | undefined,
		description: c.description as string | undefined,
		locationId: c.location_id as string | undefined,
		parentContainerId: c.parent_container_id as string | undefined,
		status: c.status as PhysicalContainer['status'],
		itemCount: c.item_count as number,
		weightKg: c.weight_kg ? Number(c.weight_kg) / 100 : undefined,
		dimensions: c.dimensions as PhysicalContainer['dimensions'],
		retentionDate: c.retention_date as string | undefined,
		destructionEligible: c.destruction_eligible as boolean,
		legalHold: c.legal_hold as boolean,
		currentCustodianId: c.current_custodian_id as string | undefined,
		lastVerifiedAt: c.last_verified_at as string | undefined,
		createdAt: c.created_at as string,
		scanningProjectId: c.scanning_project_id as string | undefined,
	};
}

export function useContainers(filters?: {
	locationId?: string;
	status?: string;
	containerType?: string;
	limit?: number;
	offset?: number;
}) {
	return useQuery({
		queryKey: ['inventory', 'containers', filters],
		queryFn: async (): Promise<PhysicalContainer[]> => {
			const params = new URLSearchParams();
			if (filters?.locationId) params.append('location_id', filters.locationId);
			if (filters?.status) params.append('status', filters.status);
			if (filters?.containerType) params.append('container_type', filters.containerType);
			if (filters?.limit) params.append('limit', filters.limit.toString());
			if (filters?.offset) params.append('offset', filters.offset.toString());
			const { data } = await apiClient.get<ContainerApiResponse>(`${API_BASE}/containers?${params}`);
			return data.map(mapContainer);
		},
	});
}

export function useContainer(containerId: string) {
	return useQuery({
		queryKey: ['inventory', 'container', containerId],
		queryFn: async (): Promise<PhysicalContainer> => {
			const { data } = await apiClient.get<ContainerSingleResponse>(`${API_BASE}/containers/${containerId}`);
			return mapContainer(data);
		},
		enabled: !!containerId,
	});
}

export function useContainerByBarcode(barcode: string) {
	return useQuery({
		queryKey: ['inventory', 'container', 'barcode', barcode],
		queryFn: async (): Promise<PhysicalContainer> => {
			const { data } = await apiClient.get<ContainerSingleResponse>(`${API_BASE}/containers/barcode/${encodeURIComponent(barcode)}`);
			return mapContainer(data);
		},
		enabled: !!barcode,
	});
}

export function useCreateContainer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			barcode: string;
			containerType?: string;
			label?: string;
			description?: string;
			locationId?: string;
			parentContainerId?: string;
			weightKg?: number;
			dimensions?: { width: number; height: number; depth: number };
			retentionDate?: string;
			scanningProjectId?: string;
		}): Promise<PhysicalContainer> => {
			const { data } = await apiClient.post<ContainerSingleResponse>(`${API_BASE}/containers`, {
				barcode: input.barcode,
				container_type: input.containerType || 'box',
				label: input.label,
				description: input.description,
				location_id: input.locationId,
				parent_container_id: input.parentContainerId,
				weight_kg: input.weightKg,
				dimensions: input.dimensions,
				retention_date: input.retentionDate,
				scanning_project_id: input.scanningProjectId,
			});
			return mapContainer(data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'containers'] });
		},
	});
}

interface ContainerActionResponse { status: string; container_id: string }

export function useMoveContainer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			containerId: string;
			toLocationId?: string;
			toCustodianId?: string;
			reason?: string;
			notes?: string;
		}) => {
			const { data } = await apiClient.post<ContainerActionResponse>(`${API_BASE}/containers/${input.containerId}/move`, {
				container_id: input.containerId,
				to_location_id: input.toLocationId,
				to_custodian_id: input.toCustodianId,
				reason: input.reason,
				notes: input.notes,
			});
			return { status: data.status, containerId: data.container_id };
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'container', variables.containerId] });
			queryClient.invalidateQueries({ queryKey: ['inventory', 'containers'] });
		},
	});
}

export function useCheckoutContainer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			containerId: string;
			toUserId: string;
			reason: string;
			expectedReturnDate?: string;
		}) => {
			const { data } = await apiClient.post<ContainerActionResponse>(`${API_BASE}/containers/${input.containerId}/checkout`, {
				container_id: input.containerId,
				to_user_id: input.toUserId,
				reason: input.reason,
				expected_return_date: input.expectedReturnDate,
			});
			return { status: data.status, containerId: data.container_id };
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'container', variables.containerId] });
			queryClient.invalidateQueries({ queryKey: ['inventory', 'containers'] });
		},
	});
}

export function useCheckinContainer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			containerId: string;
			toLocationId: string;
			notes?: string;
		}) => {
			const { data } = await apiClient.post<ContainerActionResponse>(`${API_BASE}/containers/${input.containerId}/checkin`, {
				container_id: input.containerId,
				to_location_id: input.toLocationId,
				notes: input.notes,
			});
			return { status: data.status, containerId: data.container_id };
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'container', variables.containerId] });
			queryClient.invalidateQueries({ queryKey: ['inventory', 'containers'] });
		},
	});
}

interface VerifyResponse { status: string; verified_at: string }

export function useVerifyContainer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (containerId: string) => {
			const { data } = await apiClient.post<VerifyResponse>(`${API_BASE}/containers/${containerId}/verify`);
			return { status: data.status, verifiedAt: data.verified_at };
		},
		onSuccess: (_, containerId) => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'container', containerId] });
		},
	});
}

type CustodyApiResponse = Array<Record<string, unknown>>;

function mapCustodyEvent(e: Record<string, unknown>): CustodyEvent {
	return {
		id: e.id as string,
		containerId: e.container_id as string,
		eventType: e.event_type as CustodyEvent['eventType'],
		fromUserId: e.from_user_id as string | undefined,
		toUserId: e.to_user_id as string | undefined,
		performedById: e.performed_by_id as string,
		fromLocationId: e.from_location_id as string | undefined,
		toLocationId: e.to_location_id as string | undefined,
		reason: e.reason as string | undefined,
		notes: e.notes as string | undefined,
		signatureCaptured: e.signature_captured as boolean,
		createdAt: e.created_at as string,
	};
}

export function useContainerCustodyHistory(containerId: string) {
	return useQuery({
		queryKey: ['inventory', 'container', 'custody', containerId],
		queryFn: async (): Promise<CustodyEvent[]> => {
			const { data } = await apiClient.get<CustodyApiResponse>(`${API_BASE}/containers/${containerId}/custody`);
			return data.map(mapCustodyEvent);
		},
		enabled: !!containerId,
	});
}


// ============ Barcode Scanning ============

interface ScanApiResponse {
	success: boolean;
	resolved_type?: string;
	resolved_id?: string;
	resolved_data?: Record<string, unknown>;
	error_message?: string;
}

export function useScanBarcode() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			scannedCode: string;
			codeType?: string;
			scanPurpose?: string;
			scannerDeviceId?: string;
			latitude?: number;
			longitude?: number;
		}): Promise<ScanResult> => {
			const { data } = await apiClient.post<ScanApiResponse>(`${API_BASE}/scan`, {
				scanned_code: input.scannedCode,
				code_type: input.codeType || 'qr',
				scan_purpose: input.scanPurpose || 'lookup',
				scanner_device_id: input.scannerDeviceId,
				latitude: input.latitude,
				longitude: input.longitude,
			});
			return {
				success: data.success,
				resolvedType: data.resolved_type as ScanResult['resolvedType'],
				resolvedId: data.resolved_id,
				resolvedData: data.resolved_data,
				errorMessage: data.error_message,
			};
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'scan', 'history'] });
		},
	});
}

type ScanHistoryResponse = Array<Record<string, unknown>>;

export function useScanHistory(limit = 50, offset = 0) {
	return useQuery({
		queryKey: ['inventory', 'scan', 'history', limit, offset],
		queryFn: async () => {
			const { data } = await apiClient.get<ScanHistoryResponse>(`${API_BASE}/scan/history?limit=${limit}&offset=${offset}`);
			return data.map((s) => ({
				id: s.id as string,
				scannedCode: s.scanned_code as string,
				codeType: s.code_type as string,
				success: s.success as boolean,
				scanPurpose: s.scan_purpose as string | undefined,
				createdAt: s.created_at as string,
			}));
		},
	});
}


// ============ Container Documents ============

export function useAddDocumentToContainer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			containerId: string;
			documentId: string;
			sequenceNumber?: number;
			pageCount?: number;
		}) => {
			const params = new URLSearchParams();
			params.append('document_id', input.documentId);
			if (input.sequenceNumber !== undefined) params.append('sequence_number', input.sequenceNumber.toString());
			if (input.pageCount !== undefined) params.append('page_count', input.pageCount.toString());
			const { data } = await apiClient.post<{ status: string; container_id: string; document_id: string }>(`${API_BASE}/containers/${input.containerId}/documents?${params}`);
			return { status: data.status, containerId: data.container_id, documentId: data.document_id };
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'container', variables.containerId] });
			queryClient.invalidateQueries({ queryKey: ['inventory', 'container', 'documents', variables.containerId] });
		},
	});
}

type ContainerDocumentsResponse = Array<Record<string, unknown>>;

export function useContainerDocuments(containerId: string) {
	return useQuery({
		queryKey: ['inventory', 'container', 'documents', containerId],
		queryFn: async () => {
			const { data } = await apiClient.get<ContainerDocumentsResponse>(`${API_BASE}/containers/${containerId}/documents`);
			return data.map((d) => ({
				id: d.id as string,
				documentId: d.document_id as string,
				sequenceNumber: d.sequence_number as number | undefined,
				pageCount: d.page_count as number | undefined,
				hasPhysical: d.has_physical as boolean,
				verified: d.verified as boolean,
			}));
		},
		enabled: !!containerId,
	});
}


// ============ Reports ============

interface InventorySummaryResponse {
	containers_by_status: Record<string, number>;
	containers_by_type: Record<string, number>;
	total_locations: number;
	overdue_for_retention: number;
	legal_holds: number;
}

export function useInventorySummary() {
	return useQuery({
		queryKey: ['inventory', 'summary'],
		queryFn: async (): Promise<InventorySummary> => {
			const { data } = await apiClient.get<InventorySummaryResponse>(`${API_BASE}/reports/summary`);
			return {
				containersByStatus: data.containers_by_status,
				containersByType: data.containers_by_type,
				totalLocations: data.total_locations,
				overdueForRetention: data.overdue_for_retention,
				legalHolds: data.legal_holds,
			};
		},
	});
}
