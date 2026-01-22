// (c) Copyright Datacraft, 2026
// API client with axios-like interface

import { snakeToCamel, camelToSnake } from './utils';
import { handleApiError } from './error-handler';


const API_BASE = '/api/v1';
const TOKEN_KEY = 'darchiva_token';

interface ApiResponse<T> {
	data: T;
	status: number;
}

interface RequestOptions {
	params?: Record<string, unknown>;
}

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

export const apiClient = {
	async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
		const url = buildUrl(endpoint, options?.params);
		const response = await fetch(`${API_BASE}${url}`, {
			headers: getAuthHeaders(),
		});
		if (!response.ok) return await handleApiError(response);

		const rawData = await response.json();
		// Transform snake_case response to camelCase
		const data = snakeToCamel<T>(rawData);
		return { data, status: response.status };
	},

	async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
		const url = buildUrl(endpoint, options?.params);
		// Transform camelCase request body to snake_case
		const transformedBody = body ? camelToSnake(body) : undefined;
		const response = await fetch(`${API_BASE}${url}`, {
			method: 'POST',
			headers: getAuthHeaders(),
			body: transformedBody ? JSON.stringify(transformedBody) : undefined,
		});
		if (!response.ok) return await handleApiError(response);

		const rawData = await response.json();
		const data = snakeToCamel<T>(rawData);
		return { data, status: response.status };
	},

	async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
		// Transform camelCase request body to snake_case
		const transformedBody = body ? camelToSnake(body) : undefined;
		const response = await fetch(`${API_BASE}${endpoint}`, {
			method: 'PATCH',
			headers: getAuthHeaders(),
			body: transformedBody ? JSON.stringify(transformedBody) : undefined,
		});
		if (!response.ok) return await handleApiError(response);

		const rawData = await response.json();
		const data = snakeToCamel<T>(rawData);
		return { data, status: response.status };
	},

	async delete<T = void>(endpoint: string): Promise<ApiResponse<T>> {
		const response = await fetch(`${API_BASE}${endpoint}`, {
			method: 'DELETE',
			headers: getAuthHeaders(),
		});
		if (!response.ok) return await handleApiError(response);

		// Try to parse JSON response, return undefined if empty
		const text = await response.text();
		const data = text ? snakeToCamel<T>(JSON.parse(text)) : (undefined as T);
		return { data, status: response.status };
	},

	async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
		// Transform camelCase request body to snake_case
		const transformedBody = body ? camelToSnake(body) : undefined;
		const response = await fetch(`${API_BASE}${endpoint}`, {
			method: 'PUT',
			headers: getAuthHeaders(),
			body: transformedBody ? JSON.stringify(transformedBody) : undefined,
		});
		if (!response.ok) return await handleApiError(response);

		const rawData = await response.json();
		const data = snakeToCamel<T>(rawData);
		return { data, status: response.status };
	},
};
