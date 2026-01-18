// (c) Copyright Datacraft, 2026
/**
 * User management types.
 */

export interface User {
	id: string;
	username: string;
	email: string;
	first_name?: string;
	last_name?: string;
	is_active: boolean;
	is_superuser: boolean;
	home_folder_id?: string;
	inbox_folder_id?: string;
	created_at: string;
	updated_at?: string;
	last_login?: string;
	groups: GroupRef[];
	roles: RoleRef[];
	permissions: string[];
	mfa_enabled: boolean;
	passkey_enabled: boolean;
}

export interface GroupRef {
	id: string;
	name: string;
}

export interface RoleRef {
	id: string;
	name: string;
}

export interface UserCreateInput {
	username: string;
	email: string;
	password: string;
	first_name?: string;
	last_name?: string;
	is_active?: boolean;
	is_superuser?: boolean;
	group_ids?: string[];
	role_ids?: string[];
}

export interface UserUpdateInput {
	username?: string;
	email?: string;
	first_name?: string;
	last_name?: string;
	is_active?: boolean;
	is_superuser?: boolean;
	group_ids?: string[];
	role_ids?: string[];
}

export interface PasswordChangeInput {
	current_password: string;
	new_password: string;
}

export interface UserListResponse {
	items: User[];
	total: number;
	page: number;
	page_size: number;
}

export interface UserFilters {
	search?: string;
	is_active?: boolean;
	is_superuser?: boolean;
	group_id?: string;
	role_id?: string;
}
