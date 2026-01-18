// Scanner API Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
	Scanner, ScannerCreate, ScannerUpdate, ScannerStatusInfo, ScannerCapabilities,
	DiscoveredScanner, ScanJob, ScanJobCreate, ScanJobResult,
	ScanProfile, ScanProfileCreate, ScanProfileUpdate,
	GlobalScannerSettings, ScannerDashboard, ScannerUsageStats,
} from '../types';

const API_BASE = '/api/scanners';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
	const res = await fetch(url, {
		...options,
		headers: {
			'Content-Type': 'application/json',
			...options?.headers,
		},
	});
	if (!res.ok) {
		const error = await res.json().catch(() => ({ detail: 'Request failed' }));
		throw new Error(error.detail || 'Request failed');
	}
	return res.json();
}

// === Discovery ===

export function useDiscoverScanners(options?: { timeout?: number; forceRefresh?: boolean }) {
	return useQuery({
		queryKey: ['scanners', 'discover', options],
		queryFn: () => {
			const params = new URLSearchParams();
			if (options?.timeout) params.set('timeout', String(options.timeout));
			if (options?.forceRefresh) params.set('force_refresh', 'true');
			return fetchApi<DiscoveredScanner[]>(`${API_BASE}/discover?${params}`);
		},
		staleTime: 30_000, // 30s cache
	});
}

export function useDiscoverScannersMutation() {
	return useMutation({
		mutationFn: (params: { timeout?: number; forceRefresh?: boolean }) => {
			const searchParams = new URLSearchParams();
			if (params.timeout) searchParams.set('timeout', String(params.timeout));
			if (params.forceRefresh) searchParams.set('force_refresh', 'true');
			return fetchApi<DiscoveredScanner[]>(`${API_BASE}/discover?${searchParams}`);
		},
	});
}

// === Scanners CRUD ===

export function useScanners(includeInactive = false) {
	return useQuery({
		queryKey: ['scanners', { includeInactive }],
		queryFn: () => fetchApi<Scanner[]>(`${API_BASE}?include_inactive=${includeInactive}`),
		staleTime: 10_000,
	});
}

export function useScanner(scannerId: string) {
	return useQuery({
		queryKey: ['scanners', scannerId],
		queryFn: () => fetchApi<Scanner>(`${API_BASE}/${scannerId}`),
		enabled: !!scannerId,
	});
}

export function useCreateScanner() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: ScannerCreate) => fetchApi<Scanner>(API_BASE, {
			method: 'POST',
			body: JSON.stringify(data),
		}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['scanners'] });
		},
	});
}

export function useUpdateScanner() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: ScannerUpdate }) =>
			fetchApi<Scanner>(`${API_BASE}/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data),
			}),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['scanners'] });
			queryClient.invalidateQueries({ queryKey: ['scanners', id] });
		},
	});
}

export function useDeleteScanner() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => fetch(`${API_BASE}/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['scanners'] });
		},
	});
}

// === Scanner Status & Capabilities ===

export function useScannerStatus(scannerId: string) {
	return useQuery({
		queryKey: ['scanners', scannerId, 'status'],
		queryFn: () => fetchApi<ScannerStatusInfo>(`${API_BASE}/${scannerId}/status`),
		enabled: !!scannerId,
		refetchInterval: 5_000, // Poll every 5s
	});
}

export function useScannerCapabilities(scannerId: string) {
	return useQuery({
		queryKey: ['scanners', scannerId, 'capabilities'],
		queryFn: () => fetchApi<ScannerCapabilities>(`${API_BASE}/${scannerId}/capabilities`),
		enabled: !!scannerId,
		staleTime: 60_000, // 1 minute cache
	});
}

export function useRefreshCapabilities() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (scannerId: string) =>
			fetchApi<ScannerCapabilities>(`${API_BASE}/${scannerId}/refresh-capabilities`, { method: 'POST' }),
		onSuccess: (_, scannerId) => {
			queryClient.invalidateQueries({ queryKey: ['scanners', scannerId, 'capabilities'] });
		},
	});
}

// === Scan Jobs ===

export function useScanJobs(options?: { scannerId?: string; status?: string; limit?: number }) {
	return useQuery({
		queryKey: ['scan-jobs', options],
		queryFn: () => {
			const params = new URLSearchParams();
			if (options?.scannerId) params.set('scanner_id', options.scannerId);
			if (options?.status) params.set('status', options.status);
			if (options?.limit) params.set('limit', String(options.limit));
			return fetchApi<ScanJob[]>(`${API_BASE}/jobs?${params}`);
		},
		refetchInterval: 3_000, // Poll for job updates
	});
}

export function useScanJob(jobId: string) {
	return useQuery({
		queryKey: ['scan-jobs', jobId],
		queryFn: () => fetchApi<ScanJob>(`${API_BASE}/jobs/${jobId}`),
		enabled: !!jobId,
		refetchInterval: (query) => {
			const job = query.state.data;
			// Stop polling when job is complete
			if (job && ['completed', 'cancelled', 'failed'].includes(job.status)) return false;
			return 1_000; // Poll every second during active scan
		},
	});
}

export function useCreateScanJob() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: ScanJobCreate) => fetchApi<ScanJob>(`${API_BASE}/jobs`, {
			method: 'POST',
			body: JSON.stringify(data),
		}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['scan-jobs'] });
			queryClient.invalidateQueries({ queryKey: ['scanner-dashboard'] });
		},
	});
}

export function useCancelScanJob() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (jobId: string) => fetchApi<ScanJob>(`${API_BASE}/jobs/${jobId}/cancel`, { method: 'POST' }),
		onSuccess: (_, jobId) => {
			queryClient.invalidateQueries({ queryKey: ['scan-jobs'] });
			queryClient.invalidateQueries({ queryKey: ['scan-jobs', jobId] });
		},
	});
}

export function useScanJobResult(jobId: string) {
	return useQuery({
		queryKey: ['scan-jobs', jobId, 'result'],
		queryFn: () => fetchApi<ScanJobResult>(`${API_BASE}/jobs/${jobId}/result`),
		enabled: !!jobId,
	});
}

// === Scan Profiles ===

export function useScanProfiles() {
	return useQuery({
		queryKey: ['scan-profiles'],
		queryFn: () => fetchApi<ScanProfile[]>(`${API_BASE}/profiles`),
		staleTime: 30_000,
	});
}

export function useScanProfile(profileId: string) {
	return useQuery({
		queryKey: ['scan-profiles', profileId],
		queryFn: () => fetchApi<ScanProfile>(`${API_BASE}/profiles/${profileId}`),
		enabled: !!profileId,
	});
}

export function useCreateScanProfile() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: ScanProfileCreate) => fetchApi<ScanProfile>(`${API_BASE}/profiles`, {
			method: 'POST',
			body: JSON.stringify(data),
		}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['scan-profiles'] });
		},
	});
}

export function useUpdateScanProfile() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: ScanProfileUpdate }) =>
			fetchApi<ScanProfile>(`${API_BASE}/profiles/${id}`, {
				method: 'PATCH',
				body: JSON.stringify(data),
			}),
		onSuccess: (_, { id }) => {
			queryClient.invalidateQueries({ queryKey: ['scan-profiles'] });
			queryClient.invalidateQueries({ queryKey: ['scan-profiles', id] });
		},
	});
}

export function useDeleteScanProfile() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (id: string) => fetch(`${API_BASE}/profiles/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['scan-profiles'] });
		},
	});
}

// === Settings ===

export function useScannerSettings() {
	return useQuery({
		queryKey: ['scanner-settings'],
		queryFn: () => fetchApi<GlobalScannerSettings>(`${API_BASE}/settings`),
	});
}

export function useUpdateScannerSettings() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (data: Partial<GlobalScannerSettings>) =>
			fetchApi<GlobalScannerSettings>(`${API_BASE}/settings`, {
				method: 'PATCH',
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['scanner-settings'] });
		},
	});
}

// === Dashboard & Analytics ===

export function useScannerDashboard() {
	return useQuery({
		queryKey: ['scanner-dashboard'],
		queryFn: () => fetchApi<ScannerDashboard>(`${API_BASE}/dashboard`),
		refetchInterval: 10_000,
	});
}

export function useScannerUsageStats(days = 30) {
	return useQuery({
		queryKey: ['scanner-stats', days],
		queryFn: () => fetchApi<ScannerUsageStats[]>(`${API_BASE}/stats?days=${days}`),
		staleTime: 60_000,
	});
}
