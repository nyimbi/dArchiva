// (c) Copyright Datacraft, 2026
/**
 * Tenant management API client.
 */
import { apiClient } from '@/lib/api-client';
import type {
	Tenant,
	TenantDetail,
	TenantListResponse,
	TenantCreate,
	TenantUpdate,
	TenantBranding,
	TenantSettings,
	TenantUsage,
	BrandingUpdate,
	SettingsUpdate,
	TenantUser,
	InviteUserRequest,
} from './types';

const API_BASE = '/tenants';

// --- Current Tenant Operations ---

export async function getCurrentTenant(): Promise<TenantDetail> {
	const { data } = await apiClient.get<TenantDetail>(`${API_BASE}/current`);
	return data;
}

export async function updateCurrentTenant(input: TenantUpdate): Promise<TenantDetail> {
	const { data } = await apiClient.patch<TenantDetail>(`${API_BASE}/current`, input);
	return data;
}

export async function getCurrentTenantBranding(): Promise<TenantBranding> {
	const { data } = await apiClient.get<TenantBranding>(`${API_BASE}/current/branding`);
	return data;
}

export async function updateCurrentTenantBranding(input: BrandingUpdate): Promise<TenantBranding> {
	const { data } = await apiClient.patch<TenantBranding>(`${API_BASE}/current/branding`, input);
	return data;
}

export async function getCurrentTenantSettings(): Promise<TenantSettings> {
	const { data } = await apiClient.get<TenantSettings>(`${API_BASE}/current/settings`);
	return data;
}

export async function updateCurrentTenantSettings(input: SettingsUpdate): Promise<TenantSettings> {
	const { data } = await apiClient.patch<TenantSettings>(`${API_BASE}/current/settings`, input);
	return data;
}

export async function getCurrentTenantUsage(): Promise<TenantUsage> {
	const { data } = await apiClient.get<TenantUsage>(`${API_BASE}/current/usage`);
	return data;
}

// --- System Admin Operations ---

export async function listTenants(
	page = 1,
	pageSize = 50,
	statusFilter?: string,
): Promise<TenantListResponse> {
	const params: Record<string, unknown> = { page, page_size: pageSize };
	if (statusFilter) {
		params.status_filter = statusFilter;
	}
	const { data } = await apiClient.get<TenantListResponse>(API_BASE, { params });
	return data;
}

export async function getTenant(tenantId: string): Promise<TenantDetail> {
	const { data } = await apiClient.get<TenantDetail>(`${API_BASE}/${tenantId}`);
	return data;
}

export async function createTenant(input: TenantCreate): Promise<TenantDetail> {
	const { data } = await apiClient.post<TenantDetail>(API_BASE, input);
	return data;
}

export async function updateTenant(tenantId: string, input: TenantUpdate): Promise<TenantDetail> {
	const { data } = await apiClient.patch<TenantDetail>(`${API_BASE}/${tenantId}`, input);
	return data;
}

export async function deleteTenant(tenantId: string): Promise<void> {
	await apiClient.delete(`${API_BASE}/${tenantId}`);
}

export async function suspendTenant(tenantId: string): Promise<TenantDetail> {
	return updateTenant(tenantId, { status: 'suspended' });
}

export async function activateTenant(tenantId: string): Promise<TenantDetail> {
	return updateTenant(tenantId, { status: 'active' });
}

// --- Tenant User Management ---

export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
	const { data } = await apiClient.get<TenantUser[]>(`${API_BASE}/${tenantId}/users`);
	return data;
}

export async function inviteUserToTenant(
	tenantId: string,
	input: InviteUserRequest,
): Promise<TenantUser> {
	const { data } = await apiClient.post<TenantUser>(`${API_BASE}/${tenantId}/users/invite`, input);
	return data;
}

export async function removeUserFromTenant(tenantId: string, userId: string): Promise<void> {
	await apiClient.delete(`${API_BASE}/${tenantId}/users/${userId}`);
}

// --- Utility Functions ---

export function formatBytes(bytes: number, decimals = 2): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

export function formatStorageQuota(gb: number | null | undefined): string {
	if (gb === null || gb === undefined) return 'Unlimited';
	return `${gb} GB`;
}

export function formatUserLimit(limit: number | null | undefined): string {
	if (limit === null || limit === undefined) return 'Unlimited';
	return String(limit);
}
