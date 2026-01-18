// (c) Copyright Datacraft, 2026
/**
 * Shared nodes types for document/folder sharing.
 */

export type SharePermission = 'view' | 'edit' | 'download' | 'share' | 'delete';

export interface SharedNode {
	id: string;
	node_id: string;
	node_type: 'document' | 'folder';
	node_title: string;
	shared_by_id: string;
	shared_by_name: string;
	shared_with_type: 'user' | 'group' | 'link';
	shared_with_id?: string;
	shared_with_name?: string;
	permissions: SharePermission[];
	expires_at?: string;
	created_at: string;
	access_count: number;
	last_accessed_at?: string;
}

export interface ShareLink {
	id: string;
	node_id: string;
	token: string;
	url: string;
	permissions: SharePermission[];
	password_protected: boolean;
	expires_at?: string;
	max_access_count?: number;
	access_count: number;
	created_at: string;
	created_by_name: string;
}

export interface CreateShareInput {
	node_id: string;
	shared_with_type: 'user' | 'group';
	shared_with_id: string;
	permissions: SharePermission[];
	expires_at?: string;
}

export interface CreateLinkShareInput {
	node_id: string;
	permissions: SharePermission[];
	password?: string;
	expires_at?: string;
	max_access_count?: number;
}

export interface UpdateShareInput {
	permissions?: SharePermission[];
	expires_at?: string | null;
}

export interface SharedNodesListResponse {
	items: SharedNode[];
	total: number;
	page: number;
	page_size: number;
}

export interface SharedNodesFilters {
	node_type?: 'document' | 'folder';
	shared_with_type?: 'user' | 'group' | 'link';
	shared_by_me?: boolean;
	shared_with_me?: boolean;
}
