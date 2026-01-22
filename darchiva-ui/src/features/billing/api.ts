// (c) Copyright Datacraft, 2026
/**
 * Billing API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
	UsageDaily,
	UsageSummary,
	UsageAlert,
	Invoice,
	InvoiceSummary,
	BillingDashboard,
	CostEstimate,
	CreateAlertInput,
	UpdateAlertInput,
	AlertStatus,
	InvoiceStatus,
} from './types';

const API_BASE = '/billing';

// ============ Dashboard ============

export function useBillingDashboard() {
	return useQuery({
		queryKey: ['billing-dashboard'],
		queryFn: async () => {
			const { data } = await apiClient.get<BillingDashboard>(`${API_BASE}/dashboard`);
			return data;
		},
	});
}

export function useEstimateCosts(params: {
	storageGb: number;
	transferGb: number;
	documents: number;
	users: number;
}) {
	return useQuery({
		queryKey: ['cost-estimate', params],
		queryFn: async () => {
			const { data } = await apiClient.get<CostEstimate>(`${API_BASE}/estimate`, {
				params: {
					storage_gb: params.storageGb,
					transfer_gb: params.transferGb,
					documents: params.documents,
					users: params.users,
				},
			});
			return data;
		},
		enabled:
			params.storageGb > 0 &&
			params.documents >= 0 &&
			params.users >= 1,
	});
}

// ============ Usage ============

export function useUsage(options?: {
	startDate?: string;
	endDate?: string;
	limit?: number;
}) {
	return useQuery({
		queryKey: ['usage', options],
		queryFn: async () => {
			const params: Record<string, unknown> = {};
			if (options?.startDate) params.start_date = options.startDate;
			if (options?.endDate) params.end_date = options.endDate;
			if (options?.limit) params.limit = options.limit;
			const { data } = await apiClient.get<UsageDaily[]>(`${API_BASE}/usage`, { params });
			return data;
		},
	});
}

export function useUsageSummary(startDate: string, endDate: string) {
	return useQuery({
		queryKey: ['usage-summary', startDate, endDate],
		queryFn: async () => {
			const { data } = await apiClient.get<UsageSummary>(
				`${API_BASE}/usage/summary`,
				{ params: { start_date: startDate, end_date: endDate } }
			);
			return data;
		},
		enabled: !!startDate && !!endDate,
	});
}

// ============ Alerts ============

export function useAlerts(status?: AlertStatus) {
	return useQuery({
		queryKey: ['billing-alerts', status],
		queryFn: async () => {
			const { data } = await apiClient.get<UsageAlert[]>(`${API_BASE}/alerts`, {
				params: status ? { status } : undefined,
			});
			return data;
		},
	});
}

export function useCreateAlert() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (input: CreateAlertInput) => {
			const { data } = await apiClient.post<UsageAlert>(`${API_BASE}/alerts`, input);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
			queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
		},
	});
}

export function useUpdateAlert() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, ...input }: { id: string } & UpdateAlertInput) => {
			const { data } = await apiClient.patch<UsageAlert>(`${API_BASE}/alerts/${id}`, input);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
			queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
		},
	});
}

export function useDeleteAlert() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`${API_BASE}/alerts/${id}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
			queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
		},
	});
}

export function useCheckAlerts() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async () => {
			const { data } = await apiClient.post<{ notifications: unknown[] }>(`${API_BASE}/alerts/check`);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
			queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
		},
	});
}

// ============ Invoices ============

export function useInvoices(status?: InvoiceStatus) {
	return useQuery({
		queryKey: ['invoices', status],
		queryFn: async () => {
			const { data } = await apiClient.get<InvoiceSummary[]>(`${API_BASE}/invoices`, {
				params: status ? { status } : undefined,
			});
			return data;
		},
	});
}

export function useInvoice(invoiceId: string) {
	return useQuery({
		queryKey: ['invoice', invoiceId],
		queryFn: async () => {
			const { data } = await apiClient.get<Invoice>(`${API_BASE}/invoices/${invoiceId}`);
			return data;
		},
		enabled: !!invoiceId,
	});
}

export function useUpdateInvoice() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ id, status }: { id: string; status: InvoiceStatus }) => {
			const { data } = await apiClient.patch<Invoice>(`${API_BASE}/invoices/${id}`, { status });
			return data;
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['invoices'] });
			queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
			queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
		},
	});
}
