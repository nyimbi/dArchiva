// (c) Copyright Datacraft, 2026
/**
 * Provenance API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
	DocumentProvenance,
	DocumentProvenanceWithEvents,
	DocumentProvenanceSummary,
	ProvenanceEvent,
	ProvenanceEventSummary,
	VerificationResult,
	ChainOfCustody,
	ProvenanceStats,
	VerificationStatus,
	EventType,
} from './types';

const API_BASE = '/provenance';

// ============ Provenance Records ============

export function useProvenanceList(options?: {
	batchId?: string;
	verificationStatus?: VerificationStatus;
	isDuplicate?: boolean;
	ingestionSource?: string;
	skip?: number;
	limit?: number;
}) {
	return useQuery({
		queryKey: ['provenance-list', options],
		queryFn: async () => {
			const params: Record<string, unknown> = {};
			if (options?.batchId) params.batch_id = options.batchId;
			if (options?.verificationStatus) params.verification_status = options.verificationStatus;
			if (options?.isDuplicate !== undefined) params.is_duplicate = options.isDuplicate;
			if (options?.ingestionSource) params.ingestion_source = options.ingestionSource;
			if (options?.skip) params.skip = options.skip;
			if (options?.limit) params.limit = options.limit;
			const { data } = await apiClient.get<DocumentProvenanceSummary[]>(API_BASE, { params });
			return data;
		},
	});
}

export function useProvenanceStats() {
	return useQuery({
		queryKey: ['provenance-stats'],
		queryFn: async () => {
			const { data } = await apiClient.get<ProvenanceStats>(`${API_BASE}/stats`);
			return data;
		},
	});
}

export function useDocumentProvenance(documentId: string) {
	return useQuery({
		queryKey: ['provenance', 'document', documentId],
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentProvenanceWithEvents>(`${API_BASE}/document/${documentId}`);
			return data;
		},
		enabled: !!documentId,
	});
}

export function useProvenance(provenanceId: string) {
	return useQuery({
		queryKey: ['provenance', provenanceId],
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentProvenanceWithEvents>(`${API_BASE}/${provenanceId}`);
			return data;
		},
		enabled: !!provenanceId,
	});
}

export function useChainOfCustody(provenanceId: string) {
	return useQuery({
		queryKey: ['provenance', 'chain', provenanceId],
		queryFn: async () => {
			const { data } = await apiClient.get<ChainOfCustody>(`${API_BASE}/${provenanceId}/chain`);
			return data;
		},
		enabled: !!provenanceId,
	});
}

export function useCreateProvenance() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			documentId: string;
			batchId?: string;
			originalFilename?: string;
			sourceLocationDetail?: string;
			physicalReference?: string;
			ingestionSource?: string;
			scannerModel?: string;
			scanResolutionDpi?: number;
			scanColorMode?: string;
			scanSettings?: Record<string, unknown>;
			metadata?: Record<string, unknown>;
		}) => {
			const { data } = await apiClient.post<DocumentProvenance>(API_BASE, input);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['provenance-list'] });
			queryClient.invalidateQueries({ queryKey: ['provenance-stats'] });
		},
	});
}

export function useUpdateProvenance() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, ...input }: {
			id: string;
			batchId?: string;
			sourceLocationDetail?: string;
			physicalReference?: string;
			verificationStatus?: VerificationStatus;
			verificationNotes?: string;
			metadata?: Record<string, unknown>;
		}) => {
			const { data } = await apiClient.patch<DocumentProvenance>(`${API_BASE}/${id}`, input);
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['provenance-list'] });
			queryClient.invalidateQueries({ queryKey: ['provenance', variables.id] });
			queryClient.invalidateQueries({ queryKey: ['provenance-stats'] });
		},
	});
}

export function useVerifyDocument() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ provenanceId, verificationNotes }: {
			provenanceId: string;
			verificationNotes?: string;
		}) => {
			const { data } = await apiClient.post<VerificationResult>(`${API_BASE}/${provenanceId}/verify`, {
				verification_notes: verificationNotes,
			});
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['provenance-list'] });
			queryClient.invalidateQueries({ queryKey: ['provenance', variables.provenanceId] });
			queryClient.invalidateQueries({ queryKey: ['provenance-stats'] });
		},
	});
}

// ============ Provenance Events ============

export function useProvenanceEvents(
	provenanceId: string,
	options?: {
		eventType?: EventType;
		skip?: number;
		limit?: number;
	}
) {
	return useQuery({
		queryKey: ['provenance-events', provenanceId, options],
		queryFn: async () => {
			const params: Record<string, unknown> = {};
			if (options?.eventType) params.event_type = options.eventType;
			if (options?.skip) params.skip = options.skip;
			if (options?.limit) params.limit = options.limit;
			const { data } = await apiClient.get<ProvenanceEvent[]>(`${API_BASE}/${provenanceId}/events`, { params });
			return data;
		},
		enabled: !!provenanceId,
	});
}

export function useCreateProvenanceEvent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: {
			provenanceId: string;
			eventType: EventType;
			description?: string;
			actorType?: string;
			previousState?: Record<string, unknown>;
			newState?: Record<string, unknown>;
			relatedDocumentId?: string;
			workflowId?: string;
			workflowStepId?: string;
			details?: Record<string, unknown>;
		}) => {
			const { data } = await apiClient.post<ProvenanceEvent>(`${API_BASE}/events`, input);
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['provenance-events', variables.provenanceId] });
			queryClient.invalidateQueries({ queryKey: ['provenance', variables.provenanceId] });
			queryClient.invalidateQueries({ queryKey: ['provenance', 'chain', variables.provenanceId] });
		},
	});
}
