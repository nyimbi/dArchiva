// (c) Copyright Datacraft, 2026
import type {
	User,
	Document,
	Folder,
	Workflow,
	PendingTask,
	FormTemplate,
	ExtractionResult,
	Case,
	Portfolio,
	Bundle,
	IngestionSource,
	IngestionJob,
	RoutingRule,
	DashboardStats,
	RecentActivity,
} from '@/types';
import { snakeToCamel, camelToSnake } from './utils';
import { handleApiError } from './error-handler';


const API_BASE = '/api/v1';
const TOKEN_KEY = 'darchiva_token';

function getAuthHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
	};
	const token = localStorage.getItem(TOKEN_KEY);
	if (token) {
		headers['Authorization'] = `Bearer ${token}`;
	}
	return headers;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
	// Transform request body from camelCase to snake_case if present
	let transformedOptions = options;
	if (options?.body && typeof options.body === 'string') {
		try {
			const parsed = JSON.parse(options.body);
			transformedOptions = {
				...options,
				body: JSON.stringify(camelToSnake(parsed)),
			};
		} catch {
			// Body is not JSON, use as-is
		}
	}

	const response = await fetch(`${API_BASE}${endpoint}`, {
		...transformedOptions,
		headers: {
			...getAuthHeaders(),
			...transformedOptions?.headers,
		},
	});

	if (!response.ok) {
		return await handleApiError(response);
	}


	// Transform response from snake_case to camelCase
	const rawData = await response.json();
	return snakeToCamel<T>(rawData);
}

interface RequestOptions {
	params?: Record<string, unknown>;
	responseType?: 'json' | 'blob';
}

function buildUrl(endpoint: string, params?: Record<string, unknown>): string {
	if (!params || Object.keys(params).length === 0) return endpoint;
	const searchParams = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== null) {
			searchParams.append(key, String(value));
		}
	}
	return `${endpoint}?${searchParams.toString()}`;
}

// Axios-like API interface for feature modules
export const api = {
	async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
		const url = buildUrl(endpoint, options?.params);
		const response = await fetch(`${API_BASE}${url}`, {
			headers: getAuthHeaders(),
		});
		if (!response.ok) return await handleApiError(response);

		if (options?.responseType === 'blob') {
			return response.blob() as Promise<T>;
		}
		const rawData = await response.json();
		return snakeToCamel<T>(rawData);
	},

	async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
		const url = buildUrl(endpoint, options?.params);
		const transformedBody = body ? camelToSnake(body) : undefined;
		const response = await fetch(`${API_BASE}${url}`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: transformedBody ? JSON.stringify(transformedBody) : undefined,
		});
		if (!response.ok) return await handleApiError(response);

		if (options?.responseType === 'blob') {
			return response.blob() as Promise<T>;
		}
		const rawData = await response.json();
		return snakeToCamel<T>(rawData);
	},

	async patch<T>(endpoint: string, body?: unknown): Promise<T> {
		const transformedBody = body ? camelToSnake(body) : undefined;
		const response = await fetch(`${API_BASE}${endpoint}`, {
			method: 'PATCH',
			headers: getAuthHeaders(),
			body: transformedBody ? JSON.stringify(transformedBody) : undefined,
		});
		if (!response.ok) return await handleApiError(response);

		const rawData = await response.json();
		return snakeToCamel<T>(rawData);
	},

	async delete(endpoint: string, options?: { data?: unknown }): Promise<void> {
		const transformedData = options?.data ? camelToSnake(options.data) : undefined;
		const response = await fetch(`${API_BASE}${endpoint}`, {
			method: 'DELETE',
			headers: getAuthHeaders(),
			body: transformedData ? JSON.stringify(transformedData) : undefined,
		});
		if (!response.ok) return await handleApiError(response);

	},

	async put<T>(endpoint: string, body?: unknown): Promise<T> {
		const transformedBody = body ? camelToSnake(body) : undefined;
		const response = await fetch(`${API_BASE}${endpoint}`, {
			method: 'PUT',
			headers: getAuthHeaders(),
			body: transformedBody ? JSON.stringify(transformedBody) : undefined,
		});
		if (!response.ok) return await handleApiError(response);

		const rawData = await response.json();
		return snakeToCamel<T>(rawData);
	},
};

// Auth
export async function getCurrentUser(): Promise<User> {
	return fetchApi<User>('/users/me');
}

// Documents
export async function getDocuments(folderId?: string): Promise<Document[]> {
	const params = folderId ? `?parent_id=${folderId}` : '';
	return fetchApi<Document[]>(`/documents${params}`);
}

export async function getDocument(id: string): Promise<Document> {
	return fetchApi<Document>(`/documents/${id}`);
}

export async function uploadDocument(file: File, folderId?: string): Promise<Document> {
	const formData = new FormData();
	formData.append('file', file);
	if (folderId) formData.append('parent_id', folderId);

	const response = await fetch(`${API_BASE}/documents/upload`, {
		method: 'POST',
		body: formData,
	});

	if (!response.ok) throw new Error('Upload failed');
	return response.json();
}

// Folders
export async function getFolders(parentId?: string): Promise<Folder[]> {
	const params = parentId ? `?parent_id=${parentId}` : '';
	return fetchApi<Folder[]>(`/folders${params}`);
}

export async function createFolder(name: string, parentId?: string): Promise<Folder> {
	return fetchApi<Folder>('/folders', {
		method: 'POST',
		body: JSON.stringify({ name, parent_id: parentId }),
	});
}

// Workflows
export async function getWorkflows(): Promise<Workflow[]> {
	return fetchApi<Workflow[]>('/workflows');
}

export async function getPendingTasks(): Promise<PendingTask[]> {
	return fetchApi<PendingTask[]>('/workflows/instances/pending');
}

export async function processWorkflowAction(
	instanceId: string,
	action: 'approve' | 'reject' | 'return',
	comments?: string
): Promise<void> {
	await fetchApi(`/workflows/instances/${instanceId}/actions`, {
		method: 'POST',
		body: JSON.stringify({ action, comments }),
	});
}

// Form Recognition
export async function getFormTemplates(): Promise<FormTemplate[]> {
	return fetchApi<FormTemplate[]>('/forms/templates');
}

export async function getExtractionResults(documentId: string): Promise<ExtractionResult> {
	return fetchApi<ExtractionResult>(`/forms/extractions/${documentId}`);
}

export async function submitCorrections(extractionId: string, corrections: Record<string, unknown>): Promise<void> {
	await fetchApi(`/forms/extractions/${extractionId}/corrections`, {
		method: 'PATCH',
		body: JSON.stringify({ corrections }),
	});
}

// Cases
export async function getCases(portfolioId?: string): Promise<Case[]> {
	const params = portfolioId ? `?portfolio_id=${portfolioId}` : '';
	return fetchApi<Case[]>(`/cases${params}`);
}

export async function getCase(id: string): Promise<Case> {
	return fetchApi<Case>(`/cases/${id}`);
}

export async function createCase(data: Partial<Case>): Promise<Case> {
	return fetchApi<Case>('/cases', {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

// Portfolios
export async function getPortfolios(): Promise<Portfolio[]> {
	return fetchApi<Portfolio[]>('/portfolios');
}

export async function getPortfolio(id: string): Promise<Portfolio> {
	return fetchApi<Portfolio>(`/portfolios/${id}`);
}

// Bundles
export async function getBundles(caseId?: string): Promise<Bundle[]> {
	const params = caseId ? `?case_id=${caseId}` : '';
	return fetchApi<Bundle[]>(`/bundles${params}`);
}

// Ingestion
export async function getIngestionSources(): Promise<IngestionSource[]> {
	return fetchApi<IngestionSource[]>('/ingestion/sources');
}

export async function createIngestionSource(data: Partial<IngestionSource>): Promise<IngestionSource> {
	return fetchApi<IngestionSource>('/ingestion/sources', {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

export async function getIngestionJobs(sourceId?: string): Promise<IngestionJob[]> {
	const params = sourceId ? `?source_id=${sourceId}` : '';
	return fetchApi<IngestionJob[]>(`/ingestion/jobs${params}`);
}

// Routing
export async function getRoutingRules(): Promise<RoutingRule[]> {
	return fetchApi<RoutingRule[]>('/routing/rules');
}

export async function createRoutingRule(data: Partial<RoutingRule>): Promise<RoutingRule> {
	return fetchApi<RoutingRule>('/routing/rules', {
		method: 'POST',
		body: JSON.stringify(data),
	});
}

// Dashboard
export async function getDashboardStats(): Promise<DashboardStats> {
	return fetchApi<DashboardStats>('/dashboard/stats');
}

export async function getRecentActivity(): Promise<RecentActivity[]> {
	return fetchApi<RecentActivity[]>('/dashboard/activity');
}
