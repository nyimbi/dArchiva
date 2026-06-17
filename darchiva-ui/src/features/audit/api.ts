// (c) Copyright Datacraft, 2026
/**
 * Audit log API hooks — aligned with backend query params.
 *
 * Backend list endpoint: GET /audit-logs
 *   page_size, page_number, sort_by, sort_direction,
 *   filter_operation, filter_table_name, filter_username,
 *   filter_user_id, filter_record_id,
 *   filter_timestamp_from, filter_timestamp_to, filter_free_text
 *
 * Backend export endpoint: GET /audit-logs/export
 *   format, filter_operation, filter_table_name, filter_username,
 *   filter_user_id, filter_timestamp_from, filter_timestamp_to, filter_free_text
 */
import { apiClient } from '@/lib/api-client';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AuditFilters, AuditListResponse } from './types';

const AUDIT_KEY = ['audit'];
const REFETCH_INTERVAL = 30_000; // 30 s auto-refresh

interface ListAuditParams extends AuditFilters {
	page?: number;
	pageSize?: number;
	sortBy?: string;
	sortDirection?: 'asc' | 'desc';
}

export function useAuditLogs(params: ListAuditParams = {}) {
	return useQuery({
		queryKey: [...AUDIT_KEY, params],
		queryFn: async () => {
			// apiClient.get accepts an endpoint string with query already appended.
			// Build params as a plain object so buildUrl handles them.
			const qp: Record<string, string> = {};
			if (params.page)                     qp['page_number'] = String(params.page);
			if (params.pageSize)                 qp['page_size']   = String(params.pageSize);
			if (params.sortBy)                   qp['sort_by']     = params.sortBy;
			if (params.sortDirection)            qp['sort_direction'] = params.sortDirection;
			if (params.filterOperation)          qp['filter_operation']       = params.filterOperation;
			if (params.filterTableName)          qp['filter_table_name']      = params.filterTableName;
			if (params.filterUsername)           qp['filter_username']        = params.filterUsername;
			if (params.filterUserId)             qp['filter_user_id']         = params.filterUserId;
			if (params.filterRecordId)           qp['filter_record_id']       = params.filterRecordId;
			if (params.filterTimestampFrom)      qp['filter_timestamp_from']  = params.filterTimestampFrom;
			if (params.filterTimestampTo)        qp['filter_timestamp_to']    = params.filterTimestampTo;
			if (params.filterFreeText)           qp['filter_free_text']       = params.filterFreeText;

			const { data } = await apiClient.get<AuditListResponse>('/audit-logs/', { params: qp as Record<string, unknown> });
			return data;
		},
		refetchInterval: REFETCH_INTERVAL,
	});
}

export function useDocumentAudit(documentId: string) {
	return useQuery({
		queryKey: [...AUDIT_KEY, 'document', documentId],
		queryFn: async () => {
			const { data } = await apiClient.get<AuditListResponse>('/audit-logs/', {
				params: { filter_record_id: documentId },
			});
			return data;
		},
		enabled: !!documentId,
		refetchInterval: REFETCH_INTERVAL,
	});
}

export function useUserAudit(userId: string) {
	return useQuery({
		queryKey: [...AUDIT_KEY, 'user', userId],
		queryFn: async () => {
			const { data } = await apiClient.get<AuditListResponse>('/audit-logs/', {
				params: { filter_user_id: userId },
			});
			return data;
		},
		enabled: !!userId,
		refetchInterval: REFETCH_INTERVAL,
	});
}

export interface ExportAuditParams {
	format: 'csv' | 'pdf';
	filterOperation?: string;
	filterTableName?: string;
	filterUsername?: string;
	filterUserId?: string;
	filterTimestampFrom?: string;
	filterTimestampTo?: string;
	filterFreeText?: string;
}

/**
 * Build the export URL (backend snake_case params).
 * Exported so AuditLogs.tsx page header button can call window.open directly.
 */
export function buildExportUrl(params: ExportAuditParams): string {
	const sp = new URLSearchParams();
	sp.set('format', params.format);
	if (params.filterOperation)      sp.set('filter_operation',       params.filterOperation);
	if (params.filterTableName)      sp.set('filter_table_name',      params.filterTableName);
	if (params.filterUsername)       sp.set('filter_username',        params.filterUsername);
	if (params.filterUserId)         sp.set('filter_user_id',         params.filterUserId);
	if (params.filterTimestampFrom)  sp.set('filter_timestamp_from',  params.filterTimestampFrom);
	if (params.filterTimestampTo)    sp.set('filter_timestamp_to',    params.filterTimestampTo);
	if (params.filterFreeText)       sp.set('filter_free_text',       params.filterFreeText);
	return `/api/v1/audit-logs/export?${sp.toString()}`;
}

/**
 * Hook that returns an imperative export function.
 * CSV → blob download triggered via <a> click.
 * PDF → open in new tab (browser print→save-as-PDF).
 */
export function useExportAuditLog() {
	const exportLogs = useCallback(async (params: ExportAuditParams) => {
		const url = buildExportUrl(params);

		if (params.format === 'pdf') {
			window.open(url, '_blank');
			return;
		}

		// CSV: fetch with auth header, then blob-download
		const token = localStorage.getItem('darchiva_token');
		const response = await fetch(url, {
			headers: token ? { Authorization: `Bearer ${token}` } : {},
		});
		if (!response.ok) throw new Error(`Export failed: ${response.status}`);
		const blob = await response.blob();
		const blobUrl = URL.createObjectURL(blob);
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
