// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
	AssignBulkPayload,
	AssignManualPayload,
	CreateSequencePayload,
	DocumentSerialNumber,
	SerialNumberSequence,
	UpdateSequencePayload,
} from './types';

// ─────────────────────── Query keys ──────────────────────────────

export const serialKeys = {
	all: ['serial-numbers'] as const,
	sequences: () => [...serialKeys.all, 'sequences'] as const,
	document: (documentId: string) => [...serialKeys.all, 'document', documentId] as const,
};

// ─────────────────────── Sequences ───────────────────────────────

export function useSerialSequences() {
	return useQuery({
		queryKey: serialKeys.sequences(),
		queryFn: async () => {
			const { data } = await apiClient.get<SerialNumberSequence[]>('/serial-numbers/sequences');
			return data;
		},
	});
}

export function useCreateSequence() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: CreateSequencePayload) => {
			const { data } = await apiClient.post<SerialNumberSequence>(
				'/serial-numbers/sequences',
				payload,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: serialKeys.sequences() });
		},
	});
}

export function useUpdateSequence() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, payload }: { id: string; payload: UpdateSequencePayload }) => {
			const { data } = await apiClient.patch<SerialNumberSequence>(
				`/serial-numbers/sequences/${id}`,
				payload,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: serialKeys.sequences() });
		},
	});
}

export function useDeleteSequence() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/serial-numbers/sequences/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: serialKeys.sequences() });
		},
	});
}

// ─────────────────────── Assignments ─────────────────────────────

export function useAssignSerial(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (sequenceId: string) => {
			const { data } = await apiClient.post<DocumentSerialNumber>(
				`/serial-numbers/assign/${documentId}`,
				{ sequence_id: sequenceId },
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: serialKeys.document(documentId) });
			queryClient.invalidateQueries({ queryKey: serialKeys.sequences() });
		},
	});
}

export function useAssignManual() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: AssignManualPayload) => {
			const { data } = await apiClient.post<DocumentSerialNumber>(
				'/serial-numbers/assign-manual',
				payload,
			);
			return data;
		},
		onSuccess: (_data, variables) => {
			queryClient.invalidateQueries({ queryKey: serialKeys.document(variables.document_id) });
			queryClient.invalidateQueries({ queryKey: serialKeys.sequences() });
		},
	});
}

export function useAssignBulkSerials() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (payload: AssignBulkPayload) => {
			const { data } = await apiClient.post<DocumentSerialNumber[]>(
				'/serial-numbers/assign-bulk',
				payload,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: serialKeys.all });
		},
	});
}

export function useDocumentSerial(documentId: string) {
	return useQuery({
		queryKey: serialKeys.document(documentId),
		queryFn: async () => {
			const { data } = await apiClient.get<DocumentSerialNumber | null>(
				`/serial-numbers/document/${documentId}`,
			);
			return data;
		},
		enabled: !!documentId,
	});
}
