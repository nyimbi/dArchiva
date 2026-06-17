// (c) Copyright Datacraft, 2026
/**
 * Super-admin API hooks.
 * All calls hit /superadmin/* which requires is_superuser=True on the backend.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TenantStats {
	id: string;
	name: string;
	slug: string;
	is_active: boolean;
	plan: string;
	user_count: number;
	document_count: number;
	storage_mb: number;
	created_at: string | null;
}

export interface TenantActivity {
	timestamp: string;
	description: string;
}

export interface TenantDetail extends TenantStats {
	contact_email: string | null;
	max_users: number | null;
	max_storage_gb: number | null;
	features: Record<string, boolean> | null;
	recent_activity: TenantActivity[];
}

export interface TenantPatchRequest {
	is_active?: boolean;
	storage_quota_gb?: number;
	feature_flags?: Record<string, boolean>;
}

export interface CreateTenantRequest {
	name: string;
	slug: string;
	plan?: string;
	contact_email?: string;
	max_users?: number;
	max_storage_gb?: number;
}

export interface SystemStats {
	total_tenants: number;
	total_users: number;
	total_documents: number;
	total_storage_gb: number;
	documents_today: number;
	new_users_today: number;
}

// ── Query keys ────────────────────────────────────────────────────────────────

export const superAdminKeys = {
	all: ['superadmin'] as const,
	systemStats: () => [...superAdminKeys.all, 'system-stats'] as const,
	tenants: () => [...superAdminKeys.all, 'tenants'] as const,
	tenant: (id: string) => [...superAdminKeys.all, 'tenants', id] as const,
};

// ── Hooks ─────────────────────────────────────────────────────────────────────

export function useSystemStats() {
	return useQuery({
		queryKey: superAdminKeys.systemStats(),
		queryFn: async () => {
			const { data } = await apiClient.get<SystemStats>('/superadmin/system-stats');
			return data;
		},
		staleTime: 30_000,
	});
}

export function useSuperAdminStats() {
	// Alias kept for callers that prefer this name
	return useSystemStats();
}

export function useTenants(page = 1, pageSize = 50) {
	return useQuery({
		queryKey: [...superAdminKeys.tenants(), { page, pageSize }],
		queryFn: async () => {
			const { data } = await apiClient.get<TenantStats[]>('/superadmin/tenants', {
				params: { page, page_size: pageSize },
			});
			return data;
		},
	});
}

export function useTenantDetail(tenantId: string | null) {
	return useQuery({
		queryKey: superAdminKeys.tenant(tenantId ?? ''),
		queryFn: async () => {
			const { data } = await apiClient.get<TenantDetail>(`/superadmin/tenants/${tenantId}`);
			return data;
		},
		enabled: !!tenantId,
	});
}

export function useUpdateTenant() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, patch }: { id: string; patch: TenantPatchRequest }) => {
			const { data } = await apiClient.patch<TenantDetail>(`/superadmin/tenants/${id}`, patch);
			return data;
		},
		onSuccess: (updated) => {
			qc.invalidateQueries({ queryKey: superAdminKeys.tenants() });
			qc.setQueryData(superAdminKeys.tenant(updated.id), updated);
		},
	});
}

export function useCreateSuperAdminTenant() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (req: CreateTenantRequest) => {
			const { data } = await apiClient.post<TenantDetail>('/superadmin/tenants', req);
			return data;
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: superAdminKeys.tenants() });
			qc.invalidateQueries({ queryKey: superAdminKeys.systemStats() });
		},
	});
}
