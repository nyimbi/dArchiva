// (c) Copyright Datacraft, 2026
/**
 * Provenance API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const API_BASE = '/api/provenance';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
	});
	if (!response.ok) {
		throw new Error(`API error: ${response.statusText}`);
	}
	return response.json();
}

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
		queryFn: () => {
			const params = new URLSearchParams();
			if (options?.batchId) params.set('batch_id', options.batchId);
			if (options?.verificationStatus)
				params.set('verification_status', options.verificationStatus);
			if (options?.isDuplicate !== undefined)
				params.set('is_duplicate', options.isDuplicate.toString());
			if (options?.ingestionSource)
				params.set('ingestion_source', options.ingestionSource);
			if (options?.skip) params.set('skip', options.skip.toString());
			if (options?.limit) params.set('limit', options.limit.toString());
			return fetchJson<DocumentProvenanceSummary[]>(`${API_BASE}?${params}`);
		},
	});
}

export function useProvenanceStats() {
	return useQuery({
		queryKey: ['provenance-stats'],
		queryFn: () => fetchJson<ProvenanceStats>(`${API_BASE}/stats`),
	});
}

export function useDocumentProvenance(documentId: string) {
	return useQuery({
		queryKey: ['provenance', 'document', documentId],
		queryFn: () =>
			fetchJson<DocumentProvenanceWithEvents>(
				`${API_BASE}/document/${documentId}`
			),
		enabled: !!documentId,
	});
}

export function useProvenance(provenanceId: string) {
	return useQuery({
		queryKey: ['provenance', provenanceId],
		queryFn: () =>
			fetchJson<DocumentProvenanceWithEvents>(`${API_BASE}/${provenanceId}`),
		enabled: !!provenanceId,
	});
}

export function useChainOfCustody(provenanceId: string) {
	return useQuery({
		queryKey: ['provenance', 'chain', provenanceId],
		queryFn: () =>
			fetchJson<ChainOfCustody>(`${API_BASE}/${provenanceId}/chain`),
		enabled: !!provenanceId,
	});
}

export function useCreateProvenance() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: {
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
		}) =>
			fetchJson<DocumentProvenance>(`${API_BASE}`, {
				method: 'POST',
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['provenance-list'] });
			queryClient.invalidateQueries({ queryKey: ['provenance-stats'] });
		},
	});
}

export function useUpdateProvenance() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			...data
		}: {
			id: string;
			batchId?: string;
			sourceLocationDetail?: string;
			physicalReference?: string;
			verificationStatus?: VerificationStatus;
			verificationNotes?: string;
			metadata?: Record<string, unknown>;
		}) =>
			fetchJson<DocumentProvenance>(`${API_BASE}/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data),
			}),
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
		mutationFn: ({
			provenanceId,
			verificationNotes,
		}: {
			provenanceId: string;
			verificationNotes?: string;
		}) =>
			fetchJson<VerificationResult>(`${API_BASE}/${provenanceId}/verify`, {
				method: 'POST',
				body: JSON.stringify({ verification_notes: verificationNotes }),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['provenance-list'] });
			queryClient.invalidateQueries({
				queryKey: ['provenance', variables.provenanceId],
			});
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
		queryFn: () => {
			const params = new URLSearchParams();
			if (options?.eventType) params.set('event_type', options.eventType);
			if (options?.skip) params.set('skip', options.skip.toString());
			if (options?.limit) params.set('limit', options.limit.toString());
			return fetchJson<ProvenanceEvent[]>(
				`${API_BASE}/${provenanceId}/events?${params}`
			);
		},
		enabled: !!provenanceId,
	});
}

export function useCreateProvenanceEvent() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: {
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
		}) =>
			fetchJson<ProvenanceEvent>(`${API_BASE}/events`, {
				method: 'POST',
				body: JSON.stringify(data),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: ['provenance-events', variables.provenanceId],
			});
			queryClient.invalidateQueries({
				queryKey: ['provenance', variables.provenanceId],
			});
			queryClient.invalidateQueries({
				queryKey: ['provenance', 'chain', variables.provenanceId],
			});
		},
	});
}
