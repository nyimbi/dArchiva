// (c) Copyright Datacraft, 2026
/**
 * Tenant branding & settings React Query hooks.
 * Thin wrappers over the raw API functions in features/tenants/api.ts.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { TenantBranding, BrandingUpdate } from '../tenants/types';

// ─── Query keys ────────────────────────────────────────────────────────────────

export const TENANT_BRANDING_KEY = ['tenant', 'branding'] as const;

// ─── Hooks ─────────────────────────────────────────────────────────────────────

/** Fetch branding for the current user's tenant. */
export function useTenantSettings() {
	return useQuery({
		queryKey: TENANT_BRANDING_KEY,
		queryFn: async (): Promise<TenantBranding> => {
			const { data } = await apiClient.get<TenantBranding>('/tenants/current/branding');
			return data;
		},
		staleTime: 5 * 60 * 1000, // 5 min – branding rarely changes
	});
}

/** PATCH branding fields for the current tenant. */
export function useUpdateTenantSettings() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (updates: BrandingUpdate): Promise<TenantBranding> => {
			const { data } = await apiClient.patch<TenantBranding>(
				'/tenants/current/branding',
				updates,
			);
			return data;
		},
		onSuccess: (data) => {
			queryClient.setQueryData<TenantBranding>(TENANT_BRANDING_KEY, data);
		},
	});
}

/** Upload a logo file, returns { logo_url }. */
export function useUploadLogo() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (file: File): Promise<{ logo_url: string }> => {
			const form = new FormData();
			form.append('file', file);
			const { data } = await apiClient.post<{ logo_url: string }>(
				'/tenant/settings/logo',
				form,
			);
			return data;
		},
		onSuccess: ({ logo_url }) => {
			// Patch the cached branding with the new logo URL so the UI updates immediately.
			queryClient.setQueryData<TenantBranding>(TENANT_BRANDING_KEY, (old) =>
				old ? { ...old, logo_url } : ({ logo_url } as TenantBranding),
			);
		},
	});
}
