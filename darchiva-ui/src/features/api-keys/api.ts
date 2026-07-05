// (c) Copyright Datacraft, 2026.
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiKey {
	id: string;
	name: string;
	key_prefix: string;
	scopes: string[];
	last_used_at: string | null;
	expires_at: string | null;
	is_active: boolean;
	created_at: string;
}

export interface ApiKeyCreated extends ApiKey {
	/** Plaintext key — only present on creation response. */
	key: string;
}

export interface CreateApiKeyInput {
	name: string;
	scopes: string[];
	expires_at?: string | null;
}

export interface UpdateApiKeyInput {
	scopes: string[];
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const API_KEYS_KEY = ['api-keys'] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useApiKeys() {
	return useQuery({
		queryKey: API_KEYS_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<ApiKey[]>('/api-keys');
			return data;
		},
	});
}

export function useCreateApiKey() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateApiKeyInput) => {
			const { data } = await apiClient.post<ApiKeyCreated>('/api-keys', input);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: API_KEYS_KEY }),
	});
}

export function useUpdateApiKey() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, input }: { id: string; input: UpdateApiKeyInput }) => {
			const { data } = await apiClient.patch<ApiKey>(`/api-keys/${id}`, input);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: API_KEYS_KEY }),
	});
}

export function useRevokeApiKey() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/api-keys/${id}`);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: API_KEYS_KEY }),
	});
}

// ---------------------------------------------------------------------------
// Usage stats
// ---------------------------------------------------------------------------

export interface ApiKeyStats {
	total_calls_this_month: number;
	rate_limit_hits_this_month: number;
}

export function useApiKeyStats() {
	return useQuery({
		queryKey: [...API_KEYS_KEY, 'stats'],
		queryFn: async () => {
			const { data } = await apiClient.get<ApiKeyStats>('/api-keys/stats');
			return data;
		},
		staleTime: 60_000,
	});
}
