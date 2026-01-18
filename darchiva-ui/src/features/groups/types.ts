// (c) Copyright Datacraft, 2026
/**
 * Group management types.
 */

export interface Group {
	id: string;
	name: string;
	description?: string;
	parent_id?: string;
	created_at: string;
	updated_at?: string;
	member_count: number;
	permissions: string[];
	roles: RoleRef[];
}

export interface RoleRef {
	id: string;
	name: string;
}

export interface GroupMember {
	id: string;
	username: string;
	email: string;
	first_name?: string;
	last_name?: string;
	is_active: boolean;
}

export interface GroupCreateInput {
	name: string;
	description?: string;
	parent_id?: string;
	role_ids?: string[];
}

export interface GroupUpdateInput {
	name?: string;
	description?: string;
	parent_id?: string;
	role_ids?: string[];
}

export interface GroupListResponse {
	items: Group[];
	total: number;
	page: number;
	page_size: number;
}

export interface GroupFilters {
	search?: string;
	parent_id?: string;
}

export interface GroupTree extends Group {
	children: GroupTree[];
}
