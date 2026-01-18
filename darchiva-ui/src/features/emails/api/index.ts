// (c) Copyright Datacraft, 2026
/**
 * Email feature API hooks.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
	EmailImport,
	EmailImportListResponse,
	EmailThreadDetail,
	EmailThreadListResponse,
	EmailAccount,
	EmailAccountCreate,
	EmailAccountUpdate,
	EmailAccountListResponse,
	EmailRule,
	EmailRuleCreate,
	EmailRuleUpdate,
	EmailRuleListResponse,
} from '../types';

const EMAILS_KEY = ['emails'];
const THREADS_KEY = ['email-threads'];
const ACCOUNTS_KEY = ['email-accounts'];
const RULES_KEY = ['email-rules'];

// ----- Email Imports -----

interface ListImportsParams {
	page?: number;
	pageSize?: number;
	folderId?: string;
	threadId?: string;
	search?: string;
	source?: string;
}

export function useEmailImports(params: ListImportsParams = {}) {
	return useQuery({
		queryKey: [...EMAILS_KEY, 'list', params],
		queryFn: async () => {
			const searchParams = new URLSearchParams();
			if (params.page) searchParams.set('page', String(params.page));
			if (params.pageSize) searchParams.set('page_size', String(params.pageSize));
			if (params.folderId) searchParams.set('folder_id', params.folderId);
			if (params.threadId) searchParams.set('thread_id', params.threadId);
			if (params.search) searchParams.set('search', params.search);
			if (params.source) searchParams.set('source', params.source);

			const response = await api.get<EmailImportListResponse>(`/emails/imports?${searchParams}`);
			return response;
		},
	});
}

export function useEmailImport(importId: string) {
	return useQuery({
		queryKey: [...EMAILS_KEY, importId],
		queryFn: async () => {
			const response = await api.get<EmailImport>(`/emails/imports/${importId}`);
			return response;
		},
		enabled: !!importId,
	});
}

export function useImportEmail() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ file, folderId, importAttachments }: { file: File; folderId?: string; importAttachments?: boolean }) => {
			const formData = new FormData();
			formData.append('file', file);

			const params = new URLSearchParams();
			if (folderId) params.set('folder_id', folderId);
			if (importAttachments !== undefined) params.set('import_attachments', String(importAttachments));

			const response = await fetch(`/api/v1/emails/import?${params}`, {
				method: 'POST',
				body: formData,
			});
			if (!response.ok) throw new Error(`API error: ${response.status}`);
			return response.json() as Promise<EmailImport>;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EMAILS_KEY });
			queryClient.invalidateQueries({ queryKey: THREADS_KEY });
		},
	});
}

export function useDeleteEmailImport() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (importId: string) => {
			await api.delete(`/emails/imports/${importId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EMAILS_KEY });
		},
	});
}

// ----- Email Threads -----

interface ListThreadsParams {
	page?: number;
	pageSize?: number;
	folderId?: string;
	search?: string;
}

export function useEmailThreads(params: ListThreadsParams = {}) {
	return useQuery({
		queryKey: [...THREADS_KEY, 'list', params],
		queryFn: async () => {
			const searchParams = new URLSearchParams();
			if (params.page) searchParams.set('page', String(params.page));
			if (params.pageSize) searchParams.set('page_size', String(params.pageSize));
			if (params.folderId) searchParams.set('folder_id', params.folderId);
			if (params.search) searchParams.set('search', params.search);

			const response = await api.get<EmailThreadListResponse>(`/emails/threads?${searchParams}`);
			return response;
		},
	});
}

export function useEmailThread(threadId: string) {
	return useQuery({
		queryKey: [...THREADS_KEY, threadId],
		queryFn: async () => {
			const response = await api.get<EmailThreadDetail>(`/emails/threads/${threadId}`);
			return response;
		},
		enabled: !!threadId,
	});
}

// ----- Email Accounts -----

export function useEmailAccounts() {
	return useQuery({
		queryKey: ACCOUNTS_KEY,
		queryFn: async () => {
			const response = await api.get<EmailAccountListResponse>('/emails/accounts');
			return response;
		},
	});
}

export function useEmailAccount(accountId: string) {
	return useQuery({
		queryKey: [...ACCOUNTS_KEY, accountId],
		queryFn: async () => {
			const response = await api.get<EmailAccount>(`/emails/accounts/${accountId}`);
			return response;
		},
		enabled: !!accountId,
	});
}

export function useCreateEmailAccount() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: EmailAccountCreate) => {
			const response = await api.post<EmailAccount>('/emails/accounts', data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
		},
	});
}

export function useUpdateEmailAccount() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ accountId, data }: { accountId: string; data: EmailAccountUpdate }) => {
			const response = await api.patch<EmailAccount>(`/emails/accounts/${accountId}`, data);
			return response;
		},
		onSuccess: (_, { accountId }) => {
			queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
			queryClient.invalidateQueries({ queryKey: [...ACCOUNTS_KEY, accountId] });
		},
	});
}

export function useDeleteEmailAccount() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (accountId: string) => {
			await api.delete(`/emails/accounts/${accountId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
		},
	});
}

export function useTestEmailAccount() {
	return useMutation({
		mutationFn: async (accountId: string) => {
			const response = await api.post<{ success: boolean; message: string }>(`/emails/accounts/${accountId}/test`);
			return response;
		},
	});
}

export function useSyncEmailAccount() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (accountId: string) => {
			const response = await api.post<{ status: string; account_id: string }>(`/emails/accounts/${accountId}/sync`);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: EMAILS_KEY });
		},
	});
}

// ----- Email Rules -----

export function useEmailRules(accountId?: string) {
	return useQuery({
		queryKey: [...RULES_KEY, { accountId }],
		queryFn: async () => {
			const params = accountId ? `?account_id=${accountId}` : '';
			const response = await api.get<EmailRuleListResponse>(`/emails/rules${params}`);
			return response;
		},
	});
}

export function useEmailRule(ruleId: string) {
	return useQuery({
		queryKey: [...RULES_KEY, ruleId],
		queryFn: async () => {
			const response = await api.get<EmailRule>(`/emails/rules/${ruleId}`);
			return response;
		},
		enabled: !!ruleId,
	});
}

export function useCreateEmailRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: EmailRuleCreate) => {
			const response = await api.post<EmailRule>('/emails/rules', data);
			return response;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: RULES_KEY });
		},
	});
}

export function useUpdateEmailRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ ruleId, data }: { ruleId: string; data: EmailRuleUpdate }) => {
			const response = await api.patch<EmailRule>(`/emails/rules/${ruleId}`, data);
			return response;
		},
		onSuccess: (_, { ruleId }) => {
			queryClient.invalidateQueries({ queryKey: RULES_KEY });
			queryClient.invalidateQueries({ queryKey: [...RULES_KEY, ruleId] });
		},
	});
}

export function useDeleteEmailRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (ruleId: string) => {
			await api.delete(`/emails/rules/${ruleId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: RULES_KEY });
		},
	});
}
