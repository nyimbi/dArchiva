// (c) Copyright Datacraft, 2026.
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Webhook {
	id: string;
	tenant_id: string;
	url: string;
	events: string[];
	is_active: boolean;
	created_at: string;
	last_delivery_at: string | null;
	last_delivery_status: number | null;
}

export interface WebhookDelivery {
	id: string;
	webhook_id: string;
	event_type: string;
	payload: Record<string, unknown>;
	response_status: number | null;
	response_body: string | null;
	delivered_at: string | null;
	created_at: string;
}

export interface CreateWebhookInput {
	url: string;
	events: string[];
	secret: string;
}

export interface UpdateWebhookInput {
	url?: string;
	events?: string[];
	secret?: string;
	is_active?: boolean;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const WEBHOOKS_KEY = ['webhooks'] as const;
const deliveriesKey = (id: string) => ['webhooks', id, 'deliveries'] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useWebhooks() {
	return useQuery({
		queryKey: WEBHOOKS_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<Webhook[]>('/webhooks/');
			return data;
		},
	});
}

export function useCreateWebhook() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateWebhookInput) => {
			const { data } = await apiClient.post<Webhook>('/webhooks/', input);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: WEBHOOKS_KEY }),
	});
}

export function useUpdateWebhook() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...input }: UpdateWebhookInput & { id: string }) => {
			const { data } = await apiClient.patch<Webhook>(`/webhooks/${id}`, input);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: WEBHOOKS_KEY }),
	});
}

export function useDeleteWebhook() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/webhooks/${id}`);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: WEBHOOKS_KEY }),
	});
}

export function useTestWebhook() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<WebhookDelivery>(`/webhooks/${id}/test`);
			return data;
		},
		onSuccess: (_data, id) => qc.invalidateQueries({ queryKey: deliveriesKey(id) }),
	});
}

export function useWebhookDeliveries(id: string) {
	return useQuery({
		queryKey: deliveriesKey(id),
		queryFn: async () => {
			const { data } = await apiClient.get<WebhookDelivery[]>(
				`/webhooks/${id}/deliveries?limit=10`,
			);
			return data;
		},
		enabled: !!id,
	});
}
