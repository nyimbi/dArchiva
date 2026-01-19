// (c) Copyright Datacraft, 2026
/**
 * Tenant management API client.
 */
import axios from 'axios';
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

const API_BASE = '/api/v1/tenants';

// --- Current Tenant Operations ---

export async function getCurrentTenant(): Promise<TenantDetail> {
	const response = await axios.get<TenantDetail>(`${API_BASE}/current`);
	return response.data;
}

export async function updateCurrentTenant(data: TenantUpdate): Promise<TenantDetail> {
	const response = await axios.patch<TenantDetail>(`${API_BASE}/current`, data);
	return response.data;
}

export async function getCurrentTenantBranding(): Promise<TenantBranding> {
	const response = await axios.get<TenantBranding>(`${API_BASE}/current/branding`);
	return response.data;
}

export async function updateCurrentTenantBranding(data: BrandingUpdate): Promise<TenantBranding> {
	const response = await axios.patch<TenantBranding>(`${API_BASE}/current/branding`, data);
	return response.data;
}

export async function getCurrentTenantSettings(): Promise<TenantSettings> {
	const response = await axios.get<TenantSettings>(`${API_BASE}/current/settings`);
	return response.data;
}

export async function updateCurrentTenantSettings(data: SettingsUpdate): Promise<TenantSettings> {
	const response = await axios.patch<TenantSettings>(`${API_BASE}/current/settings`, data);
	return response.data;
}

export async function getCurrentTenantUsage(): Promise<TenantUsage> {
	const response = await axios.get<TenantUsage>(`${API_BASE}/current/usage`);
	return response.data;
}

// --- System Admin Operations ---

export async function listTenants(
	page = 1,
	pageSize = 50,
	statusFilter?: string,
): Promise<TenantListResponse> {
	const params = new URLSearchParams({
		page: String(page),
		page_size: String(pageSize),
	});
	if (statusFilter) {
		params.append('status_filter', statusFilter);
	}
	const response = await axios.get<TenantListResponse>(`${API_BASE}?${params}`);
	return response.data;
}

export async function getTenant(tenantId: string): Promise<TenantDetail> {
	const response = await axios.get<TenantDetail>(`${API_BASE}/${tenantId}`);
	return response.data;
}

export async function createTenant(data: TenantCreate): Promise<TenantDetail> {
	const response = await axios.post<TenantDetail>(API_BASE, data);
	return response.data;
}

export async function updateTenant(tenantId: string, data: TenantUpdate): Promise<TenantDetail> {
	const response = await axios.patch<TenantDetail>(`${API_BASE}/${tenantId}`, data);
	return response.data;
}

export async function deleteTenant(tenantId: string): Promise<void> {
	await axios.delete(`${API_BASE}/${tenantId}`);
}

export async function suspendTenant(tenantId: string): Promise<TenantDetail> {
	return updateTenant(tenantId, { status: 'suspended' });
}

export async function activateTenant(tenantId: string): Promise<TenantDetail> {
	return updateTenant(tenantId, { status: 'active' });
}

// --- Tenant User Management ---

export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
	const response = await axios.get<TenantUser[]>(`${API_BASE}/${tenantId}/users`);
	return response.data;
}

export async function inviteUserToTenant(
	tenantId: string,
	data: InviteUserRequest,
): Promise<TenantUser> {
	const response = await axios.post<TenantUser>(`${API_BASE}/${tenantId}/users/invite`, data);
	return response.data;
}

export async function removeUserFromTenant(tenantId: string, userId: string): Promise<void> {
	await axios.delete(`${API_BASE}/${tenantId}/users/${userId}`);
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
