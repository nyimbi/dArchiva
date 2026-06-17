// (c) Copyright Datacraft, 2026
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SignatureRequestStatus = 'pending' | 'signed' | 'declined';

export interface SignatureRequest {
	id: string;
	documentId: string;
	requestedFromEmail: string;
	requestedFromName: string;
	requestedById: string;
	status: SignatureRequestStatus;
	signedAt: string | null;
	declinedAt: string | null;
	declineReason: string | null;
	signaturePage: number;
	signatureX: number;
	signatureY: number;
	signatureWidth: number;
	signatureHeight: number;
	signedDocumentId: string | null;
	tenantId: string;
	createdAt: string;
}

export interface CreateSignatureRequestBody {
	requestedFromEmail: string;
	requestedFromName?: string;
	signaturePage?: number;
	signatureX?: number;
	signatureY?: number;
	signatureWidth?: number;
	signatureHeight?: number;
}

export interface SignBody {
	signatureData: string; // base64 PNG
}

export interface DeclineBody {
	reason?: string;
}

// Backend uses snake_case — map on the way out
function toSnake(body: CreateSignatureRequestBody) {
	return {
		requested_from_email: body.requestedFromEmail,
		requested_from_name: body.requestedFromName ?? '',
		signature_page: body.signaturePage ?? 1,
		signature_x: body.signatureX ?? 0.7,
		signature_y: body.signatureY ?? 0.85,
		signature_width: body.signatureWidth ?? 0.25,
		signature_height: body.signatureHeight ?? 0.1,
	};
}

function fromSnake(raw: Record<string, unknown>): SignatureRequest {
	return {
		id: raw.id as string,
		documentId: raw.document_id as string,
		requestedFromEmail: raw.requested_from_email as string,
		requestedFromName: (raw.requested_from_name as string) ?? '',
		requestedById: raw.requested_by_id as string,
		status: raw.status as SignatureRequestStatus,
		signedAt: (raw.signed_at as string) ?? null,
		declinedAt: (raw.declined_at as string) ?? null,
		declineReason: (raw.decline_reason as string) ?? null,
		signaturePage: raw.signature_page as number,
		signatureX: raw.signature_x as number,
		signatureY: raw.signature_y as number,
		signatureWidth: raw.signature_width as number,
		signatureHeight: raw.signature_height as number,
		signedDocumentId: (raw.signed_document_id as string) ?? null,
		tenantId: raw.tenant_id as string,
		createdAt: raw.created_at as string,
	};
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const signatureKeys = {
	all: ['signature-requests'] as const,
	byDocument: (documentId: string) =>
		[...signatureKeys.all, 'document', documentId] as const,
	detail: (id: string) => [...signatureKeys.all, 'detail', id] as const,
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useSignatureRequests(documentId: string) {
	return useQuery({
		queryKey: signatureKeys.byDocument(documentId),
		queryFn: async () => {
			const { data } = await apiClient.get<Record<string, unknown>[]>(
				`/documents/${documentId}/signature-requests`,
			);
			return data.map(fromSnake);
		},
		enabled: !!documentId,
	});
}

export function useRequestSignature(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: CreateSignatureRequestBody) => {
			const { data } = await apiClient.post<Record<string, unknown>>(
				`/documents/${documentId}/signature-requests`,
				toSnake(body),
			);
			return fromSnake(data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: signatureKeys.byDocument(documentId) });
		},
	});
}

export function useSignDocument() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			requestId,
			signatureData,
		}: {
			requestId: string;
			signatureData: string;
		}) => {
			const { data } = await apiClient.post<Record<string, unknown>>(
				`/signature-requests/${requestId}/sign`,
				{ signature_data: signatureData },
			);
			return fromSnake(data);
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({
				queryKey: signatureKeys.byDocument(result.documentId),
			});
		},
	});
}

export function useDeclineSignature() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({
			requestId,
			reason,
		}: {
			requestId: string;
			reason?: string;
		}) => {
			const { data } = await apiClient.post<Record<string, unknown>>(
				`/signature-requests/${requestId}/decline`,
				{ reason: reason ?? null },
			);
			return fromSnake(data);
		},
		onSuccess: (result) => {
			queryClient.invalidateQueries({
				queryKey: signatureKeys.byDocument(result.documentId),
			});
		},
	});
}
