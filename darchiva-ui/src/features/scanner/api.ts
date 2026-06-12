// (c) Copyright Datacraft, 2026
/**
 * Scanner feature API hooks.
 */
import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type {
  DiscoveredScanner,
  ScanJob,
  Scanner,
  ScanOptions,
  ScanPreviewData,
} from './types';

const SCANNER_KEY = ['scanner'];

export function useScanners() {
	return useQuery({
		queryKey: [...SCANNER_KEY, 'list'],
		queryFn: async () => {
			const { data } = await apiClient.get<Scanner[]>('/scanners');
			return data;
		},
	});
}

export function useScanner(scannerId: string) {
	return useQuery({
		queryKey: [...SCANNER_KEY, 'detail', scannerId],
		queryFn: async () => {
			const { data } = await apiClient.get<Scanner>(`/scanners/${scannerId}`);
			return data;
		},
		enabled: !!scannerId,
		refetchInterval: 5000, // Poll scanner status
	});
}

export function useDiscoverScanners() {
	return useMutation({
		mutationFn: async () => {
			const { data } = await apiClient.post<DiscoveredScanner[]>('/scanners/discover');
			return data;
		},
	});
}

export function useRegisterScanner() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (scanner: DiscoveredScanner & { name?: string }) => {
			const { data } = await apiClient.post<Scanner>('/scanners', scanner);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...SCANNER_KEY, 'list'] });
		},
	});
}

export function useDeleteScanner() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (scannerId: string) => {
			await apiClient.delete(`/scanners/${scannerId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...SCANNER_KEY, 'list'] });
		},
	});
}

export function useUpdateScanner() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({ scannerId, data }: { scannerId: string; data: Partial<Scanner> }) => {
			const { data: response } = await apiClient.patch<Scanner>(`/scanners/${scannerId}`, data);
			return response;
		},
		onSuccess: (_, { scannerId }) => {
			queryClient.invalidateQueries({ queryKey: [...SCANNER_KEY, 'detail', scannerId] });
			queryClient.invalidateQueries({ queryKey: [...SCANNER_KEY, 'list'] });
		},
	});
}

export function useScanPreview(scannerId: string) {
	return useMutation({
		mutationFn: async (options: Partial<ScanOptions>) => {
			const { data } = await apiClient.post<ScanPreviewData>(
				`/scanners/${scannerId}/preview`,
				options
			);
			return data;
		},
	});
}

export function useStartScan() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			scannerId,
			options,
			targetFolderId,
		}: {
			scannerId: string;
			options: ScanOptions;
			targetFolderId?: string;
		}) => {
			const { data } = await apiClient.post<ScanJob>(`/scanners/${scannerId}/scan`, {
				options,
				target_folder_id: targetFolderId,
			});
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...SCANNER_KEY, 'jobs'] });
		},
	});
}

export function useCancelScan() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (jobId: string) => {
			await apiClient.post(`/scanners/jobs/${jobId}/cancel`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: [...SCANNER_KEY, 'jobs'] });
		},
	});
}

export function useScanJob(jobId: string) {
	return useQuery({
		queryKey: [...SCANNER_KEY, 'jobs', jobId],
		queryFn: async () => {
			const { data } = await apiClient.get<ScanJob>(`/scanners/jobs/${jobId}`);
			return data;
		},
		enabled: !!jobId,
		refetchInterval: (query) => {
			const job = query.state.data as ScanJob | undefined;
			// Poll more frequently while scanning
			if (job?.status === 'scanning' || job?.status === 'processing') {
				return 1000;
			}
			return false;
		},
	});
}

export function useScanJobs() {
	return useQuery({
		queryKey: [...SCANNER_KEY, 'jobs'],
		queryFn: async () => {
			const { data } = await apiClient.get<ScanJob[]>('/scanners/jobs');
			return data;
		},
	});
}

export function useRecentScans(limit = 10) {
	return useQuery({
		queryKey: [...SCANNER_KEY, 'recent', limit],
		queryFn: async () => {
			const { data } = await apiClient.get<ScanJob[]>('/scanners/jobs/recent', {
				params: { limit },
			});
			return data;
		},
	});
}
