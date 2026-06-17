// (c) Copyright Datacraft, 2026
// Admin feature API — tenant management + user/group management

export * from './api-users';
export * from './api-groups';

// Tenant management (original admin API — re-exported for backward compatibility)
export {
	adminKeys,
	useCreateTenant,
	useProvisionTenant,
	useResetTenantAITokens,
	useTenant,
	useTenantAI,
	useTenants,
	useTenantStorage,
	useTenantSubscription,
	useUpdateTenant,
	useUpdateTenantAI,
	useUpdateTenantStorage,
	useUpdateTenantSubscription,
	useVerifyTenantStorage,
} from './api-tenant';
export type {
	AIConfig,
	StorageConfig,
	Subscription,
	Tenant,
	TenantBranding,
	TenantDetail,
	TenantListResponse,
	TenantProvisionRequest,
	TenantSettings,
	TenantUsage,
} from './api-tenant';
