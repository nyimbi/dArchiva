// API Token Types
export interface APIToken {
	id: string;
	name: string;
	tokenPrefix: string;
	scopes: string[];
	createdAt: string;
	expiresAt: string | null;
	lastUsedAt: string | null;
}

export interface APITokenCreated extends APIToken {
	token: string; // Full token - only shown once!
}

export interface CreateTokenRequest {
	name: string;
	scopes?: string[];
	expiresInDays?: number;
}

export type TokenScope =
	| 'documents:read' | 'documents:write' | 'documents:delete'
	| 'folders:read' | 'folders:write' | 'folders:delete'
	| 'users:read' | 'users:write'
	| 'workflows:read' | 'workflows:execute'
	| 'admin:full';

export const SCOPE_GROUPS: Record<string, { label: string; scopes: TokenScope[] }> = {
	documents: {
		label: 'Documents',
		scopes: ['documents:read', 'documents:write', 'documents:delete'],
	},
	folders: {
		label: 'Folders',
		scopes: ['folders:read', 'folders:write', 'folders:delete'],
	},
	users: {
		label: 'Users',
		scopes: ['users:read', 'users:write'],
	},
	workflows: {
		label: 'Workflows',
		scopes: ['workflows:read', 'workflows:execute'],
	},
	admin: {
		label: 'Administration',
		scopes: ['admin:full'],
	},
};

export const EXPIRY_OPTIONS = [
	{ value: '7', label: '7 days' },
	{ value: '30', label: '30 days' },
	{ value: '90', label: '90 days' },
	{ value: '365', label: '1 year' },
	{ value: 'never', label: 'Never expires' },
];
