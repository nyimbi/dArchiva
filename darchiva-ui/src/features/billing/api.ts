// (c) Copyright Datacraft, 2026
/**
 * Billing API hooks using React Query.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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

const API_BASE = '/api/billing';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
	});
	if (!response.ok) {
		throw new Error(`API error: ${response.statusText}`);
	}
	return response.json();
}

// ============ Dashboard ============

export function useBillingDashboard() {
	return useQuery({
		queryKey: ['billing-dashboard'],
		queryFn: () => fetchJson<BillingDashboard>(`${API_BASE}/dashboard`),
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
		queryFn: () => {
			const searchParams = new URLSearchParams({
				storage_gb: params.storageGb.toString(),
				transfer_gb: params.transferGb.toString(),
				documents: params.documents.toString(),
				users: params.users.toString(),
			});
			return fetchJson<CostEstimate>(`${API_BASE}/estimate?${searchParams}`);
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
		queryFn: () => {
			const params = new URLSearchParams();
			if (options?.startDate) params.set('start_date', options.startDate);
			if (options?.endDate) params.set('end_date', options.endDate);
			if (options?.limit) params.set('limit', options.limit.toString());
			return fetchJson<UsageDaily[]>(`${API_BASE}/usage?${params}`);
		},
	});
}

export function useUsageSummary(startDate: string, endDate: string) {
	return useQuery({
		queryKey: ['usage-summary', startDate, endDate],
		queryFn: () =>
			fetchJson<UsageSummary>(
				`${API_BASE}/usage/summary?start_date=${startDate}&end_date=${endDate}`
			),
		enabled: !!startDate && !!endDate,
	});
}

// ============ Alerts ============

export function useAlerts(status?: AlertStatus) {
	return useQuery({
		queryKey: ['billing-alerts', status],
		queryFn: () => {
			const params = status ? `?status=${status}` : '';
			return fetchJson<UsageAlert[]>(`${API_BASE}/alerts${params}`);
		},
	});
}

export function useCreateAlert() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateAlertInput) =>
			fetchJson<UsageAlert>(`${API_BASE}/alerts`, {
				method: 'POST',
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
			queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
		},
	});
}

export function useUpdateAlert() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, ...data }: { id: string } & UpdateAlertInput) =>
			fetchJson<UsageAlert>(`${API_BASE}/alerts/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
			queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
		},
	});
}

export function useDeleteAlert() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) =>
			fetch(`${API_BASE}/alerts/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['billing-alerts'] });
			queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
		},
	});
}

export function useCheckAlerts() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () =>
			fetchJson<{ notifications: unknown[] }>(`${API_BASE}/alerts/check`, {
				method: 'POST',
			}),
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
		queryFn: () => {
			const params = status ? `?status=${status}` : '';
			return fetchJson<InvoiceSummary[]>(`${API_BASE}/invoices${params}`);
		},
	});
}

export function useInvoice(invoiceId: string) {
	return useQuery({
		queryKey: ['invoice', invoiceId],
		queryFn: () => fetchJson<Invoice>(`${API_BASE}/invoices/${invoiceId}`),
		enabled: !!invoiceId,
	});
}

export function useUpdateInvoice() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			status,
		}: {
			id: string;
			status: InvoiceStatus;
		}) =>
			fetchJson<Invoice>(`${API_BASE}/invoices/${id}`, {
				method: 'PATCH',
				body: JSON.stringify({ status }),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: ['invoices'] });
			queryClient.invalidateQueries({ queryKey: ['invoice', variables.id] });
			queryClient.invalidateQueries({ queryKey: ['billing-dashboard'] });
		},
	});
}
