// (c) Copyright Datacraft, 2026
/**
 * Audit log API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AuditFilters,AuditListResponse } from './types';

const AUDIT_KEY = ['audit'];

interface ListAuditParams extends AuditFilters {
	page?: number;
	pageSize?: number;
}

export function useAuditLogs(params: ListAuditParams = {}) {
	return useQuery({
		queryKey: [...AUDIT_KEY, params],
		queryFn: async () => {
			const searchParams = new URLSearchParams();
			if (params.page) searchParams.set('page', String(params.page));
			if (params.pageSize) searchParams.set('page_size', String(params.pageSize));
			if (params.action) searchParams.set('action', params.action);
			if (params.resource_type) searchParams.set('resource_type', params.resource_type);
			if (params.resource_id) searchParams.set('resource_id', params.resource_id);
			if (params.user_id) searchParams.set('user_id', params.user_id);
			if (params.date_from) searchParams.set('date_from', params.date_from);
			if (params.date_to) searchParams.set('date_to', params.date_to);

			const { data } = await apiClient.get<AuditListResponse>(`/audit-logs?${searchParams}`);
			return data;
		},
	});
}

export function useDocumentAudit(documentId: string) {
	return useQuery({
		queryKey: [...AUDIT_KEY, 'document', documentId],
		queryFn: async () => {
			const { data } = await apiClient.get<AuditListResponse>(`/audit-logs?resource_type=document&resource_id=${documentId}`);
			return data;
		},
		enabled: !!documentId,
	});
}

export function useUserAudit(userId: string) {
	return useQuery({
		queryKey: [...AUDIT_KEY, 'user', userId],
		queryFn: async () => {
			const { data } = await apiClient.get<AuditListResponse>(`/audit-logs?user_id=${userId}`);
			return data;
		},
		enabled: !!userId,
	});
}

export interface ExportAuditParams {
	format: 'csv' | 'pdf';
	filter_operation?: string;
	filter_table_name?: string;
	filter_username?: string;
	filter_user_id?: string;
	filter_timestamp_from?: string;
	filter_timestamp_to?: string;
	filter_free_text?: string;
}

/**
 * Hook that returns an imperative export function.
 * CSV → blob download. PDF → open in new tab (browser print dialog).
 */
export function useExportAuditLog() {
	const exportLogs = useCallback(async (params: ExportAuditParams) => {
		const searchParams = new URLSearchParams();
		searchParams.set('format', params.format);
		if (params.filter_operation) searchParams.set('filter_operation', params.filter_operation);
		if (params.filter_table_name) searchParams.set('filter_table_name', params.filter_table_name);
		if (params.filter_username) searchParams.set('filter_username', params.filter_username);
		if (params.filter_user_id) searchParams.set('filter_user_id', params.filter_user_id);
		if (params.filter_timestamp_from) searchParams.set('filter_timestamp_from', params.filter_timestamp_from);
		if (params.filter_timestamp_to) searchParams.set('filter_timestamp_to', params.filter_timestamp_to);
		if (params.filter_free_text) searchParams.set('filter_free_text', params.filter_free_text);

		const url = `/audit-logs/export?${searchParams.toString()}`;

		if (params.format === 'pdf') {
			// Let browser handle print dialog in a new tab
			// API_BASE is /api/v1 — prepend to construct a full browser-navigable URL
			window.open(`/api/v1${url}`, '_blank');
			return;
		}

		// CSV: fetch as blob, trigger download
		const response = await apiClient.get(url, { responseType: 'blob' });
		const blobUrl = URL.createObjectURL(response.data as Blob);
		const date = new Date().toISOString().slice(0, 10);
		const a = document.createElement('a');
		a.href = blobUrl;
		a.download = `audit-${date}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(blobUrl);
	}, []);

	return { exportLogs };
}
