// API Token Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { APIToken, APITokenCreated, CreateTokenRequest } from '../types';

const API_BASE = '/api/v1';

async function fetchTokens(): Promise<{ items: APIToken[]; total: number }> {
	const res = await fetch(`${API_BASE}/tokens`);
	if (!res.ok) throw new Error('Failed to fetch tokens');
	return res.json();
}

async function createToken(data: CreateTokenRequest): Promise<APITokenCreated> {
	const res = await fetch(`${API_BASE}/tokens`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(data),
	});
	if (!res.ok) throw new Error('Failed to create token');
	return res.json();
}

async function deleteToken(id: string): Promise<void> {
	const res = await fetch(`${API_BASE}/tokens/${id}`, { method: 'DELETE' });
	if (!res.ok) throw new Error('Failed to delete token');
}

async function revokeToken(id: string): Promise<void> {
	const res = await fetch(`${API_BASE}/tokens/${id}/revoke`, { method: 'POST' });
	if (!res.ok) throw new Error('Failed to revoke token');
}

export function useTokens() {
	return useQuery({
		queryKey: ['api-tokens'],
		queryFn: fetchTokens,
	});
}

export function useCreateToken() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createToken,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-tokens'] }),
	});
}

export function useDeleteToken() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteToken,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-tokens'] }),
	});
}

export function useRevokeToken() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: revokeToken,
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-tokens'] }),
	});
}
