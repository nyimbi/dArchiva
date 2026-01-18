// (c) Copyright Datacraft, 2026
/**
 * Audit log API hooks.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { AuditListResponse, AuditFilters } from './types';

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

			const response = await api.get<AuditListResponse>(`/audit?${searchParams}`);
			return response;
		},
	});
}

export function useDocumentAudit(documentId: string) {
	return useQuery({
		queryKey: [...AUDIT_KEY, 'document', documentId],
		queryFn: async () => {
			const response = await api.get<AuditListResponse>(`/audit?resource_type=document&resource_id=${documentId}`);
			return response;
		},
		enabled: !!documentId,
	});
}

export function useUserAudit(userId: string) {
	return useQuery({
		queryKey: [...AUDIT_KEY, 'user', userId],
		queryFn: async () => {
			const response = await api.get<AuditListResponse>(`/audit?user_id=${userId}`);
			return response;
		},
		enabled: !!userId,
	});
}
