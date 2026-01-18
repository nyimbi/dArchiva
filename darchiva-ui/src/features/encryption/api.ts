// (c) Copyright Datacraft, 2026
/**
 * Encryption API hooks.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const API_BASE = '/api/v1/encryption';

export type KeyStatus = 'active' | 'rotated' | 'revoked';
export type RequestStatus = 'pending' | 'approved' | 'denied';

export interface EncryptionKey {
	id: string;
	version: number;
	algorithm: string;
	status: KeyStatus;
	createdAt: string;
	rotatedAt?: string;
	expiresAt?: string;
	documentsEncrypted: number;
}

export interface AccessRequest {
	id: string;
	documentId: string;
	documentTitle: string;
	requesterId: string;
	requesterName: string;
	reason: string;
	status: RequestStatus;
	createdAt: string;
	resolvedAt?: string;
	resolvedBy?: string;
}

export interface EncryptedDocument {
	id: string;
	title: string;
	keyVersion: number;
	encryptedAt: string;
	lastAccessedAt?: string;
	accessCount: number;
}

export interface EncryptionStats {
	activeKeyVersion: number;
	totalEncryptedDocs: number;
	pendingRequests: number;
}

export const encryptionKeys = {
	all: ['encryption'] as const,
	keys: () => [...encryptionKeys.all, 'keys'] as const,
	key: (id: string) => [...encryptionKeys.keys(), id] as const,
	requests: (status?: RequestStatus) => [...encryptionKeys.all, 'requests', status] as const,
	documents: (page?: number) => [...encryptionKeys.all, 'documents', page] as const,
	stats: () => [...encryptionKeys.all, 'stats'] as const,
};

export function useEncryptionKeys() {
	return useQuery({
		queryKey: encryptionKeys.keys(),
		queryFn: async () => {
			const response = await axios.get<EncryptionKey[]>(`${API_BASE}/keys`);
			return response.data;
		},
	});
}

export function useEncryptionStats() {
	return useQuery({
		queryKey: encryptionKeys.stats(),
		queryFn: async () => {
			const response = await axios.get<EncryptionStats>(`${API_BASE}/stats`);
			return response.data;
		},
	});
}

export function useAccessRequests(status?: RequestStatus) {
	return useQuery({
		queryKey: encryptionKeys.requests(status),
		queryFn: async () => {
			const response = await axios.get<AccessRequest[]>(`${API_BASE}/access-requests`, {
				params: status ? { status } : undefined,
			});
			return response.data;
		},
	});
}

export function useEncryptedDocuments(page = 1, pageSize = 20) {
	return useQuery({
		queryKey: encryptionKeys.documents(page),
		queryFn: async () => {
			const response = await axios.get<{ items: EncryptedDocument[]; total: number }>(
				`${API_BASE}/documents`,
				{ params: { page, page_size: pageSize } }
			);
			return response.data;
		},
	});
}

export function useRotateKey() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async () => {
			const response = await axios.post<EncryptionKey>(`${API_BASE}/keys/rotate`);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: encryptionKeys.all });
		},
	});
}

export function useResolveAccessRequest() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'deny' }) => {
			const response = await axios.post<AccessRequest>(`${API_BASE}/access-requests/${id}/${action}`);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: encryptionKeys.requests() });
		},
	});
}

export function useEncryptDocument() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (documentId: string) => {
			const response = await axios.post<EncryptedDocument>(`${API_BASE}/documents/${documentId}/encrypt`);
			return response.data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: encryptionKeys.documents() });
		},
	});
}

export function useDecryptDocument() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (documentId: string) => {
			await axios.post(`${API_BASE}/documents/${documentId}/decrypt`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: encryptionKeys.documents() });
		},
	});
}
