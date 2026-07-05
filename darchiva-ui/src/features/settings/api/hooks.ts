// Settings API Hooks
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import type {
  EmailSettings,
  IntegrationSettings,
  OAuthProvider,
  OCRSettings,
  QueueInfo,ScheduledTask,
  SearchSettings,
  SecuritySettings,
  ServiceConfig,
  ServiceInfo,
  StorageSettings,
  SystemHealth,
  TenantSettings,
  WebhookConfig,
  WorkerConfig,
  WorkerInfo,
  WorkflowSettings,
} from '../types';

const API_BASE = '/settings';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
	const method = (options?.method ?? 'GET').toUpperCase();
	const body = options?.body ? JSON.parse(options.body as string) : undefined;

	let res;
	if (method === 'POST') res = await apiClient.post<T>(url, body);
	else if (method === 'PUT') res = await apiClient.put<T>(url, body);
	else if (method === 'PATCH') res = await apiClient.patch<T>(url, body);
	else if (method === 'DELETE') { await apiClient.delete(url); return undefined as T; }
	else res = await apiClient.get<T>(url);
	return res.data;
}

// === Tenant Settings ===

export function useTenantSettings() {
	return useQuery({
		queryKey: ['settings', 'tenant'],
		queryFn: () => fetchApi<TenantSettings>(`${API_BASE}/tenant`),
	});
}

export function useUpdateTenantSettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<TenantSettings>) =>
			fetchApi<TenantSettings>(`${API_BASE}/tenant`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'tenant'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

// === Storage Settings ===

export function useStorageSettings() {
	return useQuery({
		queryKey: ['settings', 'storage'],
		queryFn: () => fetchApi<StorageSettings>(`${API_BASE}/storage`),
	});
}

export function useUpdateStorageSettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<StorageSettings>) =>
			fetchApi<StorageSettings>(`${API_BASE}/storage`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'storage'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

// === OCR Settings ===

export function useOCRSettings() {
	return useQuery({
		queryKey: ['settings', 'ocr'],
		queryFn: () => fetchApi<OCRSettings>(`${API_BASE}/ocr`),
	});
}

export function useUpdateOCRSettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<OCRSettings>) =>
			fetchApi<OCRSettings>(`${API_BASE}/ocr`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'ocr'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

// === Search Settings ===

export function useSearchSettings() {
	return useQuery({
		queryKey: ['settings', 'search'],
		queryFn: () => fetchApi<SearchSettings>(`${API_BASE}/search`),
	});
}

export function useUpdateSearchSettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<SearchSettings>) =>
			fetchApi<SearchSettings>(`${API_BASE}/search`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'search'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

// === Workflow Settings ===

export function useWorkflowSettings() {
	return useQuery({
		queryKey: ['settings', 'workflow'],
		queryFn: () => fetchApi<WorkflowSettings>(`${API_BASE}/workflow`),
	});
}

export function useUpdateWorkflowSettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<WorkflowSettings>) =>
			fetchApi<WorkflowSettings>(`${API_BASE}/workflow`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'workflow'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

// === Email Settings ===

export function useEmailSettings() {
	return useQuery({
		queryKey: ['settings', 'email'],
		queryFn: () => fetchApi<EmailSettings>(`${API_BASE}/email`),
	});
}

export function useUpdateEmailSettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<EmailSettings>) =>
			fetchApi<EmailSettings>(`${API_BASE}/email`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'email'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

export function useTestEmailSettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (recipient: string) =>
			fetchApi<{ success: boolean; error?: string }>(`${API_BASE}/email/test`, {
				method: 'POST', body: JSON.stringify({ recipient })
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'email'] });
			toast.success('Test email sent');
		},
		onError: () => toast.error('Failed to send test email'),
	});
}

// === Security Settings ===

export function useSecuritySettings() {
	return useQuery({
		queryKey: ['settings', 'security'],
		queryFn: () => fetchApi<SecuritySettings>(`${API_BASE}/security`),
	});
}

export function useUpdateSecuritySettings() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<SecuritySettings>) =>
			fetchApi<SecuritySettings>(`${API_BASE}/security`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'security'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

// === Integration Settings ===

export function useIntegrationSettings() {
	return useQuery({
		queryKey: ['settings', 'integrations'],
		queryFn: () => fetchApi<IntegrationSettings>(`${API_BASE}/integrations`),
	});
}

export function useUpdateOAuthProvider() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<OAuthProvider> }) =>
			fetchApi<OAuthProvider>(`${API_BASE}/integrations/oauth/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'integrations'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

export function useWebhooks() {
	return useQuery({
		queryKey: ['settings', 'webhooks'],
		queryFn: () => fetchApi<WebhookConfig[]>(`${API_BASE}/webhooks`),
	});
}

export function useCreateWebhook() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Omit<WebhookConfig, 'id' | 'created_at'>) =>
			fetchApi<WebhookConfig>(`${API_BASE}/webhooks`, { method: 'POST', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'webhooks'] });
			toast.success('Webhook created');
		},
		onError: () => toast.error('Failed to create webhook'),
	});
}

export function useUpdateWebhook() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<WebhookConfig> }) =>
			fetchApi<WebhookConfig>(`${API_BASE}/webhooks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'webhooks'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

export function useDeleteWebhook() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => apiClient.delete(`${API_BASE}/webhooks/${id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'webhooks'] });
			toast.success('Deleted successfully');
		},
		onError: () => toast.error('Failed to delete'),
	});
}

// === System Health & Services ===

export function useSystemHealth() {
	return useQuery({
		queryKey: ['system', 'health'],
		queryFn: () => fetchApi<SystemHealth>('/system/health'),
		refetchInterval: 10_000,
	});
}

export function useServices() {
	return useQuery({
		queryKey: ['system', 'services'],
		queryFn: () => fetchApi<ServiceInfo[]>('/system/services'),
		refetchInterval: 5_000,
	});
}

export function useServiceAction() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, action }: { id: string; action: 'start' | 'stop' | 'restart' }) =>
			fetchApi<ServiceInfo>(`/system/services/${id}/${action}`, { method: 'POST' }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['system', 'services'] });
			toast.success('Service action sent');
		},
		onError: () => toast.error('Failed to update service'),
	});
}

export function useUpdateServiceConfig() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<ServiceConfig> }) =>
			fetchApi<ServiceConfig>(`/system/services/${id}/config`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['system', 'services'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

// === Workers ===

export function useWorkers() {
	return useQuery({
		queryKey: ['system', 'workers'],
		queryFn: () => fetchApi<WorkerInfo[]>('/system/workers'),
		refetchInterval: 5_000,
	});
}

export function useWorkerAction() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, action }: { id: string; action: 'start' | 'stop' | 'restart' | 'pause' | 'resume' }) =>
			fetchApi<WorkerInfo>(`/system/workers/${id}/${action}`, { method: 'POST' }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['system', 'workers'] });
			toast.success('Worker action sent');
		},
		onError: () => toast.error('Failed to update worker'),
	});
}

export function useUpdateWorkerConfig() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<WorkerConfig> }) =>
			fetchApi<WorkerConfig>(`/system/workers/${id}/config`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['system', 'workers'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

// === Queues ===

export function useQueues() {
	return useQuery({
		queryKey: ['system', 'queues'],
		queryFn: () => fetchApi<QueueInfo[]>('/system/queues'),
		refetchInterval: 3_000,
	});
}

export function usePurgeQueue() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ name, status }: { name: string; status?: 'pending' | 'failed' | 'delayed' }) =>
			fetchApi<{ purged: number }>(`/system/queues/${name}/purge`, { method: 'POST', body: JSON.stringify({ status }) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['system', 'queues'] });
			toast.success('Queue purged');
		},
		onError: () => toast.error('Failed to purge queue'),
	});
}

export function useRetryFailedJobs() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (queueName: string) =>
			fetchApi<{ retried: number }>(`/system/queues/${queueName}/retry-failed`, { method: 'POST' }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['system', 'queues'] });
			toast.success('Failed jobs retried');
		},
		onError: () => toast.error('Failed to retry jobs'),
	});
}

// === Scheduled Tasks ===

export function useScheduledTasks() {
	return useQuery({
		queryKey: ['system', 'scheduler'],
		queryFn: () => fetchApi<ScheduledTask[]>('/system/scheduler/tasks'),
	});
}

export function useUpdateScheduledTask() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: Partial<ScheduledTask> }) =>
			fetchApi<ScheduledTask>(`/system/scheduler/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['system', 'scheduler'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

export function useRunScheduledTask() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (id: string) =>
			fetchApi<{ success: boolean }>(`/system/scheduler/tasks/${id}/run`, { method: 'POST' }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['system', 'scheduler'] });
			toast.success('Task started');
		},
		onError: () => toast.error('Failed to start task'),
	});
}

// === Notification Preferences ===

export interface NotificationPreferences {
	email_enabled: boolean;
	email_document_updates: boolean;
	email_workflow_assignments: boolean;
	email_sla_warnings: boolean;
	email_mentions: boolean;
	email_system: boolean;
	digest_frequency: 'never' | 'daily' | 'weekly' | 'monthly';
	digest_time: string;
	inapp_enabled: boolean;
	desktop_enabled: boolean;
	sound_enabled: boolean;
	inapp_documents: boolean;
	inapp_workflows: boolean;
	inapp_team: boolean;
	dnd_enabled: boolean;
	dnd_start: string;
	dnd_end: string;
}

export function useNotificationPreferences() {
	return useQuery({
		queryKey: ['settings', 'notifications'],
		queryFn: () => fetchApi<NotificationPreferences>(`${API_BASE}/notifications`),
	});
}

export function useUpdateNotificationPreferences() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<NotificationPreferences>) =>
			fetchApi<NotificationPreferences>(`${API_BASE}/notifications`, { method: 'PATCH', body: JSON.stringify(data) }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ['settings', 'notifications'] });
			toast.success('Settings saved');
		},
		onError: () => toast.error('Failed to save settings'),
	});
}

// Aliases for backward compatibility
export const useToggleTask = useUpdateScheduledTask;
export const useRunTask = useRunScheduledTask;
