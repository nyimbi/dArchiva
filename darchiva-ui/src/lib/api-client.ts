// (c) Copyright Datacraft, 2026
// API client with axios-like interface

import { handleApiError } from './error-handler';
import { camelToSnake,snakeToCamel } from './utils';


const API_BASE = '/api/v1';
const TOKEN_KEY = 'darchiva_token';

interface ApiResponse<T> {
	data: T;
	status: number;
}

interface RequestOptions {
	params?: Record<string, unknown>;
	responseType?: 'json' | 'blob' | 'text';
}

function getAuthHeaders(isFormData = false): Record<string, string> {
	const headers: Record<string, string> = {};
	if (!isFormData) {
		headers['Content-Type'] = 'application/json';
	}
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

async function parseResponse<T>(response: Response, responseType?: RequestOptions['responseType']): Promise<T> {
	if (responseType === 'blob') return response.blob() as Promise<T>;
	if (responseType === 'text') return response.text() as Promise<T>;
	const text = await response.text();
	if (!text) return undefined as T;
	const rawData = JSON.parse(text);
	return snakeToCamel<T>(rawData);
}

export const apiClient = {
	async get<T>(endpoint: string, options?: RequestOptions): Promise<ApiResponse<T>> {
		const url = buildUrl(endpoint, options?.params);
		const response = await fetch(`${API_BASE}${url}`, {
			headers: getAuthHeaders(),
		});
		if (!response.ok) return await handleApiError(response);
		const data = await parseResponse<T>(response, options?.responseType);
		return { data, status: response.status };
	},

	async post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<ApiResponse<T>> {
		const url = buildUrl(endpoint, options?.params);
		const isFormData = body instanceof FormData;
		const requestBody = isFormData ? body : body ? JSON.stringify(camelToSnake(body)) : undefined;
		const response = await fetch(`${API_BASE}${url}`, {
			method: 'POST',
			headers: getAuthHeaders(isFormData),
			body: requestBody,
		});
		if (!response.ok) return await handleApiError(response);
		const data = await parseResponse<T>(response, options?.responseType);
		return { data, status: response.status };
	},

	async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
		const isFormData = body instanceof FormData;
		const requestBody = isFormData ? body : body ? JSON.stringify(camelToSnake(body)) : undefined;
		const response = await fetch(`${API_BASE}${endpoint}`, {
			method: 'PATCH',
			headers: getAuthHeaders(isFormData),
			body: requestBody,
		});
		if (!response.ok) return await handleApiError(response);
		const data = await parseResponse<T>(response);
		return { data, status: response.status };
	},

	async delete<T = void>(endpoint: string, options?: { data?: unknown }): Promise<ApiResponse<T>> {
		const response = await fetch(`${API_BASE}${endpoint}`, {
			method: 'DELETE',
			headers: getAuthHeaders(),
			body: options?.data ? JSON.stringify(options.data) : undefined,
		});
		if (!response.ok) return await handleApiError(response);
		const data = await parseResponse<T>(response);
		return { data, status: response.status };
	},

	async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
		const isFormData = body instanceof FormData;
		const requestBody = isFormData ? body : body ? JSON.stringify(camelToSnake(body)) : undefined;
		const response = await fetch(`${API_BASE}${endpoint}`, {
			method: 'PUT',
			headers: getAuthHeaders(isFormData),
			body: requestBody,
		});
		if (!response.ok) return await handleApiError(response);
		const data = await parseResponse<T>(response);
		return { data, status: response.status };
	},
};
