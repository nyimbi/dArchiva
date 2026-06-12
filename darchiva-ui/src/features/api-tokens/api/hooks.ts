// API Token Hooks
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type { APIToken,APITokenCreated,CreateTokenRequest } from '../types';

const API_BASE = '/tokens';

export function useTokens() {
	return useQuery({
		queryKey: ['api-tokens'],
		queryFn: async () => {
			const { data } = await apiClient.get<{ items: APIToken[]; total: number }>(API_BASE);
			return data;
		},
	});
}

export function useCreateToken() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: CreateTokenRequest) => {
			const res = await apiClient.post<APITokenCreated>(API_BASE, data);
			return res.data;
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-tokens'] }),
	});
}

export function useDeleteToken() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`${API_BASE}/${id}`);
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-tokens'] }),
	});
}

export function useRevokeToken() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.post(`${API_BASE}/${id}/revoke`);
		},
		onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-tokens'] }),
	});
}
