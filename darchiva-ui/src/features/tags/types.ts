// (c) Copyright Datacraft, 2026
/**
 * Tag feature types.
 */

export interface Tag {
	id: string;
	name: string;
	description?: string;
	color?: string;
	icon?: string;
	parent_id?: string;
	document_count: number;
	created_at: string;
	updated_at: string;
}

export interface TagCreate {
	name: string;
	description?: string;
	color?: string;
	icon?: string;
	parent_id?: string;
}

export interface TagUpdate {
	name?: string;
	description?: string;
	color?: string;
	icon?: string;
	parent_id?: string;
}

export interface TagListResponse {
	items: Tag[];
	total: number;
}

export interface TagTreeNode extends Tag {
	children: TagTreeNode[];
}

export const TAG_COLORS = [
	'#ef4444', // red
	'#f97316', // orange
	'#eab308', // yellow
	'#22c55e', // green
	'#14b8a6', // teal
	'#3b82f6', // blue
	'#8b5cf6', // violet
	'#ec4899', // pink
	'#64748b', // slate
] as const;
