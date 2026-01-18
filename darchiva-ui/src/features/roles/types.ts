// (c) Copyright Datacraft, 2026
/**
 * Role management types.
 */

export interface Role {
	id: string;
	name: string;
	description?: string;
	is_system: boolean;
	created_at: string;
	updated_at?: string;
	permissions: Permission[];
	user_count: number;
	group_count: number;
}

export interface Permission {
	id: string;
	codename: string;
	name: string;
	category: string;
	description?: string;
}

export interface PermissionCategory {
	name: string;
	permissions: Permission[];
}

export interface RoleCreateInput {
	name: string;
	description?: string;
	permission_ids: string[];
}

export interface RoleUpdateInput {
	name?: string;
	description?: string;
	permission_ids?: string[];
}

export interface RoleListResponse {
	items: Role[];
	total: number;
	page: number;
	page_size: number;
}

export interface RoleFilters {
	search?: string;
	is_system?: boolean;
}

export const PERMISSION_CATEGORIES = [
	'documents',
	'folders',
	'tags',
	'users',
	'groups',
	'roles',
	'workflows',
	'scanning',
	'settings',
	'billing',
] as const;

export type PermissionCategoryType = (typeof PERMISSION_CATEGORIES)[number];
