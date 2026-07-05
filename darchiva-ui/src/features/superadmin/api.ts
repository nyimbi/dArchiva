// (c) Copyright Datacraft, 2026
/**
 * Super-admin API hooks.
 * All calls hit /superadmin/* which requires is_superuser=True on the backend.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

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

// ── System Config ─────────────────────────────────────────────────────────────

export interface SystemConfigEntry {
	key: string;
	value: string;
	description?: string;
	category?: string;
}

const systemConfigKey = [...superAdminKeys.all, 'system-config'] as const;

export function useSystemConfig() {
	return useQuery({
		queryKey: systemConfigKey,
		queryFn: async () => {
			const { data } = await apiClient.get<SystemConfigEntry[]>('/superadmin/system-config');
			return data;
		},
	});
}

export function useUpdateSystemConfig() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (entries: SystemConfigEntry[]) => {
			const { data } = await apiClient.put<SystemConfigEntry[]>(
				'/superadmin/system-config',
				entries,
			);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: systemConfigKey }),
	});
}

// ── Background Jobs ───────────────────────────────────────────────────────────

export interface BackgroundJob {
	id: string;
	name: string;
	worker: string;
	queue: string;
	eta: string | null;
	retries: number;
	max_retries: number;
	state: 'pending' | 'running' | 'failed' | 'success';
	progress?: number;
}

const jobsKey = [...superAdminKeys.all, 'jobs'] as const;

export function useBackgroundJobs() {
	return useQuery({
		queryKey: jobsKey,
		queryFn: async () => {
			const { data } = await apiClient.get<BackgroundJob[]>('/superadmin/jobs');
			return data;
		},
		refetchInterval: 5_000,
	});
}

export function usePurgeQueue() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (queue: string) => {
			await apiClient.delete(`/superadmin/jobs/queue/${queue}`);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: jobsKey }),
	});
}

// ── Feature Flags ─────────────────────────────────────────────────────────────

export interface FeatureFlag {
	key: string;
	label: string;
	description?: string;
	enabled: boolean;
}

const featureFlagsKey = [...superAdminKeys.all, 'feature-flags'] as const;

export function useFeatureFlags() {
	return useQuery({
		queryKey: featureFlagsKey,
		queryFn: async () => {
			const { data } = await apiClient.get<FeatureFlag[]>('/superadmin/feature-flags');
			return data;
		},
	});
}

export function useToggleFeatureFlag() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ key, enabled }: { key: string; enabled: boolean }) => {
			const { data } = await apiClient.patch<FeatureFlag>(
				`/superadmin/feature-flags/${key}`,
				{ enabled },
			);
			return data;
		},
		onSettled: () => qc.invalidateQueries({ queryKey: featureFlagsKey }),
	});
}

// ── System actions ────────────────────────────────────────────────────────────

export function useRebuildSearchIndex() {
	return useMutation({
		mutationFn: async () => {
			await apiClient.post('/superadmin/actions/rebuild-search-index');
		},
		onSuccess: () => toast.success('Search index rebuild started'),
		onError: () => toast.error('Failed to start rebuild'),
	});
}

export function useClearCaches() {
	return useMutation({
		mutationFn: async () => {
			await apiClient.post('/superadmin/actions/clear-caches');
		},
		onSuccess: () => toast.success('Caches cleared'),
		onError: () => toast.error('Failed to clear caches'),
	});
}
