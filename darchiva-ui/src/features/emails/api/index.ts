// (c) Copyright Datacraft, 2026
/**
 * Email feature API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type {
  EmailAccount,
  EmailAccountCreate,
  EmailAccountListResponse,
  EmailAccountUpdate,
  EmailImport,
  EmailImportListResponse,
  EmailRule,
  EmailRuleCreate,
  EmailRuleListResponse,
  EmailRuleUpdate,
  EmailThreadDetail,
  EmailThreadListResponse,
} from '../types';

const BASE = '/emails';
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
			const { data } = await apiClient.get<EmailImportListResponse>(`${BASE}/imports`, {
				params: {
					...(params.page && { page: params.page }),
					...(params.pageSize && { page_size: params.pageSize }),
					...(params.folderId && { folder_id: params.folderId }),
					...(params.threadId && { thread_id: params.threadId }),
					...(params.search && { search: params.search }),
					...(params.source && { source: params.source }),
				},
			});
			return data;
		},
	});
}

export function useEmailImport(importId: string) {
	return useQuery({
		queryKey: [...EMAILS_KEY, importId],
		queryFn: async () => {
			const { data } = await apiClient.get<EmailImport>(`${BASE}/imports/${importId}`);
			return data;
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
			const { data } = await apiClient.post<EmailImport>(`${BASE}/import`, formData, {
				params: {
					...(folderId && { folder_id: folderId }),
					...(importAttachments !== undefined && { import_attachments: String(importAttachments) }),
				},
			});
			return data;
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
			await apiClient.delete(`${BASE}/imports/${importId}`);
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
			const { data } = await apiClient.get<EmailThreadListResponse>(`${BASE}/threads`, {
				params: {
					...(params.page && { page: params.page }),
					...(params.pageSize && { page_size: params.pageSize }),
					...(params.folderId && { folder_id: params.folderId }),
					...(params.search && { search: params.search }),
				},
			});
			return data;
		},
	});
}

export function useEmailThread(threadId: string) {
	return useQuery({
		queryKey: [...THREADS_KEY, threadId],
		queryFn: async () => {
			const { data } = await apiClient.get<EmailThreadDetail>(`${BASE}/threads/${threadId}`);
			return data;
		},
		enabled: !!threadId,
	});
}

// ----- Email Accounts -----

export function useEmailAccounts() {
	return useQuery({
		queryKey: ACCOUNTS_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<EmailAccountListResponse>(`${BASE}/accounts`);
			return data;
		},
	});
}

export function useEmailAccount(accountId: string) {
	return useQuery({
		queryKey: [...ACCOUNTS_KEY, accountId],
		queryFn: async () => {
			const { data } = await apiClient.get<EmailAccount>(`${BASE}/accounts/${accountId}`);
			return data;
		},
		enabled: !!accountId,
	});
}

export function useCreateEmailAccount() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: EmailAccountCreate) => {
			const { data: account } = await apiClient.post<EmailAccount>(`${BASE}/accounts`, data);
			return account;
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
			const { data: account } = await apiClient.patch<EmailAccount>(`${BASE}/accounts/${accountId}`, data);
			return account;
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
			await apiClient.delete(`${BASE}/accounts/${accountId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY });
		},
	});
}

export function useTestEmailAccount() {
	return useMutation({
		mutationFn: async (accountId: string) => {
			const { data } = await apiClient.post<{ success: boolean; message: string }>(
				`${BASE}/accounts/${accountId}/test`,
			);
			return data;
		},
	});
}

export function useSyncEmailAccount() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (accountId: string) => {
			const { data } = await apiClient.post<{ status: string; account_id: string }>(
				`${BASE}/accounts/${accountId}/sync`,
			);
			return data;
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
			const { data } = await apiClient.get<EmailRuleListResponse>(`${BASE}/rules`, {
				params: accountId ? { account_id: accountId } : undefined,
			});
			return data;
		},
	});
}

export function useEmailRule(ruleId: string) {
	return useQuery({
		queryKey: [...RULES_KEY, ruleId],
		queryFn: async () => {
			const { data } = await apiClient.get<EmailRule>(`${BASE}/rules/${ruleId}`);
			return data;
		},
		enabled: !!ruleId,
	});
}

export function useCreateEmailRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: EmailRuleCreate) => {
			const { data: rule } = await apiClient.post<EmailRule>(`${BASE}/rules`, data);
			return rule;
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
			const { data: rule } = await apiClient.patch<EmailRule>(`${BASE}/rules/${ruleId}`, data);
			return rule;
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
			await apiClient.delete(`${BASE}/rules/${ruleId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: RULES_KEY });
		},
	});
}
