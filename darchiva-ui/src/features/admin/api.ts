// (c) Copyright Datacraft, 2026
/**
 * System Admin Tenant Management API.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const API_BASE = '/tenants';

// Types
export interface Tenant {
	id: string;
	name: string;
	slug: string;
	status: 'active' | 'suspended' | 'trial' | 'cancelled';
	plan: string;
	customDomain?: string;
	contactEmail?: string;
	billingEmail?: string;
	maxUsers?: number;
	maxStorageGb?: number;
	trialEndsAt?: string;
	createdAt: string;
	updatedAt?: string;
}

export interface TenantDetail extends Tenant {
	branding?: TenantBranding;
	settings?: TenantSettings;
}

export interface TenantBranding {
	logoUrl?: string;
	primaryColor: string;
	secondaryColor: string;
}

export interface TenantSettings {
	documentNumberingScheme: string;
	defaultLanguage: string;
	storageQuotaGb?: number;
	ocrEnabled: boolean;
	aiFeaturesEnabled: boolean;
	workflowEnabled: boolean;
}

export interface StorageConfig {
	provider: string;
	bucketName?: string;
	region?: string;
	endpointUrl?: string;
	basePath: string;
	archivePath?: string;
	isVerified: boolean;
	lastVerifiedAt?: string;
}

export interface AIConfig {
	provider: string;
	endpointUrl?: string;
	defaultModel: string;
	embeddingModel: string;
	monthlyTokenLimit?: number;
	tokensUsedThisMonth: number;
	classificationEnabled: boolean;
	extractionEnabled: boolean;
	summarizationEnabled: boolean;
	chatEnabled: boolean;
}

export interface Subscription {
	plan: string;
	billingCycle: string;
	currentPeriodStart?: string;
	currentPeriodEnd?: string;
	cancelAtPeriodEnd: boolean;
	maxUsers?: number;
	maxStorageGb?: number;
	maxDocuments?: number;
	aiTokensPerMonth?: number;
	addons?: Record<string, unknown>;
}

export interface TenantUsage {
	tenantId: string;
	totalUsers: number;
	totalDocuments: number;
	storageUsedBytes: number;
	storageQuotaBytes?: number;
	storagePercentage?: number;
}

export interface TenantProvisionRequest {
	name: string;
	slug: string;
	contactEmail: string;
	billingEmail?: string;
	plan?: string;
	billingCycle?: string;
	storageProvider?: string;
	storageBucket?: string;
	storageRegion?: string;
	storageEndpoint?: string;
	aiProvider?: string;
	aiMonthlyTokens?: number;
	maxUsers?: number;
	maxStorageGb?: number;
	adminEmail: string;
	adminPassword?: string;
}

export interface TenantListResponse {
	items: Tenant[];
	total: number;
	page: number;
	pageSize: number;
}

// Query Keys
export const adminKeys = {
	all: ['admin'] as const,
	tenants: () => [...adminKeys.all, 'tenants'] as const,
	tenant: (id: string) => [...adminKeys.all, 'tenant', id] as const,
	tenantStorage: (id: string) => [...adminKeys.tenant(id), 'storage'] as const,
	tenantAI: (id: string) => [...adminKeys.tenant(id), 'ai'] as const,
	tenantSubscription: (id: string) => [...adminKeys.tenant(id), 'subscription'] as const,
	tenantUsage: (id: string) => [...adminKeys.tenant(id), 'usage'] as const,
};

// Hooks
export function useTenants(filters?: { status?: string; page?: number }) {
	return useQuery({
		queryKey: [...adminKeys.tenants(), filters],
		queryFn: async () => {
			const { data } = await apiClient.get<TenantListResponse>(API_BASE, { params: filters });
			return data;
		},
	});
}

export function useTenant(id: string) {
	return useQuery({
		queryKey: adminKeys.tenant(id),
		queryFn: async () => {
			const { data } = await apiClient.get<TenantDetail>(`${API_BASE}/${id}`);
			return data;
		},
		enabled: !!id,
	});
}

export function useTenantStorage(id: string) {
	return useQuery({
		queryKey: adminKeys.tenantStorage(id),
		queryFn: async () => {
			const { data } = await apiClient.get<StorageConfig>(`${API_BASE}/${id}/storage`);
			return data;
		},
		enabled: !!id,
	});
}

export function useTenantAI(id: string) {
	return useQuery({
		queryKey: adminKeys.tenantAI(id),
		queryFn: async () => {
			const { data } = await apiClient.get<AIConfig>(`${API_BASE}/${id}/ai`);
			return data;
		},
		enabled: !!id,
	});
}

export function useTenantSubscription(id: string) {
	return useQuery({
		queryKey: adminKeys.tenantSubscription(id),
		queryFn: async () => {
			const { data } = await apiClient.get<Subscription>(`${API_BASE}/${id}/subscription`);
			return data;
		},
		enabled: !!id,
	});
}

export function useCreateTenant() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: Partial<Tenant>) => {
			const { data: result } = await apiClient.post<Tenant>(API_BASE, data);
			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminKeys.tenants() });
		},
	});
}

export function useProvisionTenant() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (data: TenantProvisionRequest) => {
			const { data: result } = await apiClient.post<{
				tenant: Tenant;
				storageConfigured: boolean;
				aiConfigured: boolean;
				adminUserId?: string;
				setupLink?: string;
			}>(`${API_BASE}/provision`, data);
			return result;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: adminKeys.tenants() });
		},
	});
}

export function useUpdateTenant() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<Tenant> }) => {
			const { data: result } = await apiClient.patch<Tenant>(`${API_BASE}/${id}`, data);
			return result;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: adminKeys.tenant(id) });
			queryClient.invalidateQueries({ queryKey: adminKeys.tenants() });
		},
	});
}

export function useUpdateTenantStorage() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<StorageConfig> }) => {
			const { data: result } = await apiClient.put<StorageConfig>(`${API_BASE}/${id}/storage`, data);
			return result;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: adminKeys.tenantStorage(id) });
		},
	});
}

export function useVerifyTenantStorage() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<{ success: boolean; message: string }>(
				`${API_BASE}/${id}/storage/verify`
			);
			return data;
		},
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: adminKeys.tenantStorage(id) });
		},
	});
}

export function useUpdateTenantAI() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<AIConfig> }) => {
			const { data: result } = await apiClient.put<AIConfig>(`${API_BASE}/${id}/ai`, data);
			return result;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: adminKeys.tenantAI(id) });
		},
	});
}

export function useResetTenantAITokens() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<{ success: boolean }>(`${API_BASE}/${id}/ai/reset-tokens`);
			return data;
		},
		onSuccess: (_, id) => {
			queryClient.invalidateQueries({ queryKey: adminKeys.tenantAI(id) });
		},
	});
}

export function useUpdateTenantSubscription() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, data }: { id: string; data: Partial<Subscription> }) => {
			const { data: result } = await apiClient.put<Subscription>(`${API_BASE}/${id}/subscription`, data);
			return result;
		},
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: adminKeys.tenantSubscription(id) });
		},
	});
}
