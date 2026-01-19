// (c) Copyright Datacraft, 2026
/**
 * Tenant management type definitions.
 */

export type TenantStatus = 'active' | 'suspended' | 'trial' | 'cancelled';

export interface Tenant {
	id: string;
	name: string;
	slug: string;
	status: TenantStatus;
	plan: string;
	custom_domain?: string;
	subdomain?: string;
	contact_email?: string;
	contact_phone?: string;
	billing_email?: string;
	max_users?: number;
	max_storage_gb?: number;
	trial_ends_at?: string;
	created_at: string;
	updated_at?: string;
	features?: Record<string, boolean>;
}

export interface TenantBranding {
	logo_url?: string;
	logo_dark_url?: string;
	favicon_url?: string;
	primary_color: string;
	secondary_color: string;
	login_background_url?: string;
	login_message?: string;
	email_header_html?: string;
	email_footer_html?: string;
}

export interface TenantSettings {
	document_numbering_scheme: string;
	default_language: string;
	storage_quota_gb?: number;
	warn_at_percentage: number;
	default_retention_days?: number;
	auto_archive_days?: number;
	ocr_enabled: boolean;
	ai_features_enabled: boolean;
	workflow_enabled: boolean;
	encryption_enabled: boolean;
}

export interface TenantUsage {
	tenant_id: string;
	total_users: number;
	total_documents: number;
	storage_used_bytes: number;
	storage_quota_bytes?: number;
	storage_percentage?: number;
}

export interface TenantDetail extends Tenant {
	branding?: TenantBranding;
	settings?: TenantSettings;
}

export interface TenantListResponse {
	items: Tenant[];
	total: number;
	page: number;
	page_size: number;
}

export interface TenantCreate {
	name: string;
	slug: string;
	plan: string;
	custom_domain?: string;
	subdomain?: string;
	contact_email?: string;
	contact_phone?: string;
	billing_email?: string;
	max_users?: number;
	max_storage_gb?: number;
	features?: Record<string, boolean>;
}

export interface TenantUpdate {
	name?: string;
	plan?: string;
	status?: TenantStatus;
	custom_domain?: string;
	subdomain?: string;
	contact_email?: string;
	contact_phone?: string;
	billing_email?: string;
	max_users?: number;
	max_storage_gb?: number;
	features?: Record<string, boolean>;
}

export interface BrandingUpdate {
	logo_url?: string;
	logo_dark_url?: string;
	favicon_url?: string;
	primary_color?: string;
	secondary_color?: string;
	login_background_url?: string;
	login_message?: string;
}

export interface SettingsUpdate {
	document_numbering_scheme?: string;
	default_language?: string;
	storage_quota_gb?: number;
	warn_at_percentage?: number;
	default_retention_days?: number;
	auto_archive_days?: number;
	ocr_enabled?: boolean;
	ai_features_enabled?: boolean;
	workflow_enabled?: boolean;
	encryption_enabled?: boolean;
}

export interface TenantUser {
	id: string;
	username: string;
	email: string;
	is_active: boolean;
	created_at: string;
	roles: string[];
}

export interface InviteUserRequest {
	email: string;
	role_ids: string[];
	send_invitation: boolean;
}

// Plan definitions
export interface PlanFeatures {
	max_users: number | null;
	max_storage_gb: number | null;
	ocr_enabled: boolean;
	ai_features_enabled: boolean;
	workflow_enabled: boolean;
	encryption_enabled: boolean;
	custom_branding: boolean;
	api_access: boolean;
	priority_support: boolean;
}

export interface Plan {
	id: string;
	name: string;
	description: string;
	price_monthly: number;
	price_yearly: number;
	features: PlanFeatures;
	popular?: boolean;
}

export const AVAILABLE_PLANS: Plan[] = [
	{
		id: 'free',
		name: 'Free',
		description: 'For individuals and small teams getting started',
		price_monthly: 0,
		price_yearly: 0,
		features: {
			max_users: 3,
			max_storage_gb: 5,
			ocr_enabled: true,
			ai_features_enabled: false,
			workflow_enabled: false,
			encryption_enabled: false,
			custom_branding: false,
			api_access: false,
			priority_support: false,
		},
	},
	{
		id: 'professional',
		name: 'Professional',
		description: 'For growing teams with advanced needs',
		price_monthly: 29,
		price_yearly: 290,
		features: {
			max_users: 25,
			max_storage_gb: 100,
			ocr_enabled: true,
			ai_features_enabled: true,
			workflow_enabled: true,
			encryption_enabled: false,
			custom_branding: true,
			api_access: true,
			priority_support: false,
		},
		popular: true,
	},
	{
		id: 'enterprise',
		name: 'Enterprise',
		description: 'For organizations requiring full control',
		price_monthly: 99,
		price_yearly: 990,
		features: {
			max_users: null,
			max_storage_gb: null,
			ocr_enabled: true,
			ai_features_enabled: true,
			workflow_enabled: true,
			encryption_enabled: true,
			custom_branding: true,
			api_access: true,
			priority_support: true,
		},
	},
];
