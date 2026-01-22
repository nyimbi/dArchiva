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

export function useGenerateQRCode() {
	return useMutation({
		mutationFn: async (input: QRCodeRequest): Promise<Blob> => {
			const { data } = await apiClient.post<Blob>(
				`${API_BASE}/qr/generate`,
				{
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
				},
				{ responseType: 'blob' }
			);
			return data;
		},
	});
}

export function useGenerateDataMatrix() {
	return useMutation({
		mutationFn: async (input: QRCodeRequest): Promise<Blob> => {
			const { data } = await apiClient.post<Blob>(
				`${API_BASE}/qr/datamatrix`,
				{
					document_id: input.documentId,
					batch_id: input.batchId,
					location_code: input.locationCode,
					box_label: input.boxLabel,
					folder_label: input.folderLabel,
					sequence_number: input.sequenceNumber,
					size: input.size || 200,
				},
				{ responseType: 'blob' }
			);
			return data;
		},
	});
}

export function useGenerateLabelSheet() {
	return useMutation({
		mutationFn: async (input: LabelSheetRequest): Promise<Blob> => {
			const { data } = await apiClient.post<Blob>(
				`${API_BASE}/qr/sheet`,
				{
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
				},
				{ responseType: 'blob' }
			);
			return data;
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

export function useResolveDiscrepancy() {
	return useMutation({
		mutationFn: async (input: {
			discrepancyId: string;
			resolutionNotes: string;
		}): Promise<{
			discrepancyId: string;
			resolved: boolean;
			resolvedAt: string;
			resolvedBy: string;
			resolutionNotes: string;
		}> => {
			const { data } = await apiClient.post(`${API_BASE}/reconcile/resolve`, {
				discrepancy_id: input.discrepancyId,
				resolution_notes: input.resolutionNotes,
			});
			return data;
		},
	});
}


// ============ Warehouse Locations ============

export function useLocations(parentId?: string) {
	return useQuery({
		queryKey: ['inventory', 'locations', parentId],
		queryFn: async (): Promise<WarehouseLocation[]> => {
			const params = new URLSearchParams();
			if (parentId) params.append('parent_id', parentId);
			const { data } = await apiClient.get(`${API_BASE}/locations?${params}`);
			return data.map((l: Record<string, unknown>) => ({
				id: l.id,
				code: l.code,
				name: l.name,
				description: l.description,
				parentId: l.parent_id,
				path: l.path,
				level: l.level,
				capacity: l.capacity,
				currentCount: l.current_count,
				climateControlled: l.climate_controlled,
				fireSuppression: l.fire_suppression,
				accessRestricted: l.access_restricted,
				aisle: l.aisle,
				bay: l.bay,
				shelfNumber: l.shelf_number,
				position: l.position,
				createdAt: l.created_at,
			}));
		},
	});
}

export function useLocation(locationId: string) {
	return useQuery({
		queryKey: ['inventory', 'location', locationId],
		queryFn: async (): Promise<WarehouseLocation> => {
			const { data } = await apiClient.get(`${API_BASE}/locations/${locationId}`);
			return {
				id: data.id,
				code: data.code,
				name: data.name,
				description: data.description,
				parentId: data.parent_id,
				path: data.path,
				level: data.level,
				capacity: data.capacity,
				currentCount: data.current_count,
				climateControlled: data.climate_controlled,
				fireSuppression: data.fire_suppression,
				accessRestricted: data.access_restricted,
				aisle: data.aisle,
				bay: data.bay,
				shelfNumber: data.shelf_number,
				position: data.position,
				createdAt: data.created_at,
			};
		},
		enabled: !!locationId,
	});
}

export function useLocationTree(locationId: string) {
	return useQuery({
		queryKey: ['inventory', 'location', 'tree', locationId],
		queryFn: async (): Promise<WarehouseLocation[]> => {
			const { data } = await apiClient.get(`${API_BASE}/locations/${locationId}/tree`);
			return data.map((l: Record<string, unknown>) => ({
				id: l.id,
				code: l.code,
				name: l.name,
				description: l.description,
				parentId: l.parent_id,
				path: l.path,
				level: l.level,
				capacity: l.capacity,
				currentCount: l.current_count,
				climateControlled: l.climate_controlled,
				fireSuppression: l.fire_suppression,
				accessRestricted: l.access_restricted,
				aisle: l.aisle,
				bay: l.bay,
				shelfNumber: l.shelf_number,
				position: l.position,
				createdAt: l.created_at,
			}));
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
			const { data } = await apiClient.post(`${API_BASE}/locations`, {
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
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'locations'] });
		},
	});
}


// ============ Physical Containers ============

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
			const { data } = await apiClient.get(`${API_BASE}/containers?${params}`);
			return data.map((c: Record<string, unknown>) => ({
				id: c.id,
				barcode: c.barcode,
				containerType: c.container_type,
				label: c.label,
				description: c.description,
				locationId: c.location_id,
				parentContainerId: c.parent_container_id,
				status: c.status,
				itemCount: c.item_count,
				weightKg: c.weight_kg ? Number(c.weight_kg) / 100 : undefined,
				dimensions: c.dimensions,
				retentionDate: c.retention_date,
				destructionEligible: c.destruction_eligible,
				legalHold: c.legal_hold,
				currentCustodianId: c.current_custodian_id,
				lastVerifiedAt: c.last_verified_at,
				createdAt: c.created_at,
				scanningProjectId: c.scanning_project_id,
			}));
		},
	});
}

export function useContainer(containerId: string) {
	return useQuery({
		queryKey: ['inventory', 'container', containerId],
		queryFn: async (): Promise<PhysicalContainer> => {
			const { data } = await apiClient.get(`${API_BASE}/containers/${containerId}`);
			return {
				id: data.id,
				barcode: data.barcode,
				containerType: data.container_type,
				label: data.label,
				description: data.description,
				locationId: data.location_id,
				parentContainerId: data.parent_container_id,
				status: data.status,
				itemCount: data.item_count,
				weightKg: data.weight_kg ? Number(data.weight_kg) / 100 : undefined,
				dimensions: data.dimensions,
				retentionDate: data.retention_date,
				destructionEligible: data.destruction_eligible,
				legalHold: data.legal_hold,
				currentCustodianId: data.current_custodian_id,
				lastVerifiedAt: data.last_verified_at,
				createdAt: data.created_at,
				scanningProjectId: data.scanning_project_id,
			};
		},
		enabled: !!containerId,
	});
}

export function useContainerByBarcode(barcode: string) {
	return useQuery({
		queryKey: ['inventory', 'container', 'barcode', barcode],
		queryFn: async (): Promise<PhysicalContainer> => {
			const { data } = await apiClient.get(`${API_BASE}/containers/barcode/${encodeURIComponent(barcode)}`);
			return {
				id: data.id,
				barcode: data.barcode,
				containerType: data.container_type,
				label: data.label,
				description: data.description,
				locationId: data.location_id,
				parentContainerId: data.parent_container_id,
				status: data.status,
				itemCount: data.item_count,
				weightKg: data.weight_kg ? Number(data.weight_kg) / 100 : undefined,
				dimensions: data.dimensions,
				retentionDate: data.retention_date,
				destructionEligible: data.destruction_eligible,
				legalHold: data.legal_hold,
				currentCustodianId: data.current_custodian_id,
				lastVerifiedAt: data.last_verified_at,
				createdAt: data.created_at,
				scanningProjectId: data.scanning_project_id,
			};
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
			const { data } = await apiClient.post(`${API_BASE}/containers`, {
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
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'containers'] });
		},
	});
}

export function useMoveContainer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (input: {
			containerId: string;
			toLocationId?: string;
			toCustodianId?: string;
			reason?: string;
			notes?: string;
		}): Promise<{ status: string; containerId: string }> => {
			const { data } = await apiClient.post(`${API_BASE}/containers/${input.containerId}/move`, {
				container_id: input.containerId,
				to_location_id: input.toLocationId,
				to_custodian_id: input.toCustodianId,
				reason: input.reason,
				notes: input.notes,
			});
			return data;
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
		}): Promise<{ status: string; containerId: string }> => {
			const { data } = await apiClient.post(`${API_BASE}/containers/${input.containerId}/checkout`, {
				container_id: input.containerId,
				to_user_id: input.toUserId,
				reason: input.reason,
				expected_return_date: input.expectedReturnDate,
			});
			return data;
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
		}): Promise<{ status: string; containerId: string }> => {
			const { data } = await apiClient.post(`${API_BASE}/containers/${input.containerId}/checkin`, {
				container_id: input.containerId,
				to_location_id: input.toLocationId,
				notes: input.notes,
			});
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'container', variables.containerId] });
			queryClient.invalidateQueries({ queryKey: ['inventory', 'containers'] });
		},
	});
}

export function useVerifyContainer() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (containerId: string): Promise<{ status: string; verifiedAt: string }> => {
			const { data } = await apiClient.post(`${API_BASE}/containers/${containerId}/verify`);
			return data;
		},
		onSuccess: (_, containerId) => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'container', containerId] });
		},
	});
}

export function useContainerCustodyHistory(containerId: string) {
	return useQuery({
		queryKey: ['inventory', 'container', 'custody', containerId],
		queryFn: async (): Promise<CustodyEvent[]> => {
			const { data } = await apiClient.get(`${API_BASE}/containers/${containerId}/custody`);
			return data.map((e: Record<string, unknown>) => ({
				id: e.id,
				containerId: e.container_id,
				eventType: e.event_type,
				fromUserId: e.from_user_id,
				toUserId: e.to_user_id,
				performedById: e.performed_by_id,
				fromLocationId: e.from_location_id,
				toLocationId: e.to_location_id,
				reason: e.reason,
				notes: e.notes,
				signatureCaptured: e.signature_captured,
				createdAt: e.created_at,
			}));
		},
		enabled: !!containerId,
	});
}


// ============ Barcode Scanning ============

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
			const { data } = await apiClient.post(`${API_BASE}/scan`, {
				scanned_code: input.scannedCode,
				code_type: input.codeType || 'qr',
				scan_purpose: input.scanPurpose || 'lookup',
				scanner_device_id: input.scannerDeviceId,
				latitude: input.latitude,
				longitude: input.longitude,
			});
			return {
				success: data.success,
				resolvedType: data.resolved_type,
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

export function useScanHistory(limit = 50, offset = 0) {
	return useQuery({
		queryKey: ['inventory', 'scan', 'history', limit, offset],
		queryFn: async (): Promise<{
			id: string;
			scannedCode: string;
			codeType: string;
			success: boolean;
			scanPurpose?: string;
			createdAt: string;
		}[]> => {
			const { data } = await apiClient.get(`${API_BASE}/scan/history?limit=${limit}&offset=${offset}`);
			return data.map((s: Record<string, unknown>) => ({
				id: s.id,
				scannedCode: s.scanned_code,
				codeType: s.code_type,
				success: s.success,
				scanPurpose: s.scan_purpose,
				createdAt: s.created_at,
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
		}): Promise<{ status: string; containerId: string; documentId: string }> => {
			const params = new URLSearchParams();
			params.append('document_id', input.documentId);
			if (input.sequenceNumber !== undefined) params.append('sequence_number', input.sequenceNumber.toString());
			if (input.pageCount !== undefined) params.append('page_count', input.pageCount.toString());
			const { data } = await apiClient.post(`${API_BASE}/containers/${input.containerId}/documents?${params}`);
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['inventory', 'container', variables.containerId] });
			queryClient.invalidateQueries({ queryKey: ['inventory', 'container', 'documents', variables.containerId] });
		},
	});
}

export function useContainerDocuments(containerId: string) {
	return useQuery({
		queryKey: ['inventory', 'container', 'documents', containerId],
		queryFn: async (): Promise<{
			id: string;
			documentId: string;
			sequenceNumber?: number;
			pageCount?: number;
			hasPhysical: boolean;
			verified: boolean;
		}[]> => {
			const { data } = await apiClient.get(`${API_BASE}/containers/${containerId}/documents`);
			return data.map((d: Record<string, unknown>) => ({
				id: d.id,
				documentId: d.document_id,
				sequenceNumber: d.sequence_number,
				pageCount: d.page_count,
				hasPhysical: d.has_physical,
				verified: d.verified,
			}));
		},
		enabled: !!containerId,
	});
}


// ============ Reports ============

export function useInventorySummary() {
	return useQuery({
		queryKey: ['inventory', 'summary'],
		queryFn: async (): Promise<InventorySummary> => {
			const { data } = await apiClient.get(`${API_BASE}/reports/summary`);
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
