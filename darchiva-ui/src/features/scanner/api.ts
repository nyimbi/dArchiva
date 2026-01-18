// (c) Copyright Datacraft, 2026
/**
 * Scanner feature API hooks.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
	Scanner,
	ScanJob,
	ScanOptions,
	ScanPreviewData,
	DiscoveredScanner,
} from './types';

const SCANNER_KEY = ['scanner'];

export function useScanners() {
	return useQuery({
		queryKey: [...SCANNER_KEY, 'list'],
		queryFn: async () => {
			const response = await api.get<Scanner[]>('/scanners');
			return response;
		},
	});
}

export function useScanner(scannerId: string) {
	return useQuery({
		queryKey: [...SCANNER_KEY, 'detail', scannerId],
		queryFn: async () => {
			const response = await api.get<Scanner>(`/scanners/${scannerId}`);
			return response;
		},
		enabled: !!scannerId,
		refetchInterval: 5000, // Poll scanner status
	});
}

export function useDiscoverScanners() {
	return useMutation({
		mutationFn: async () => {
			const response = await api.post<DiscoveredScanner[]>('/scanners/discover');
			return response;
		},
	});
}

export function useRegisterScanner() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (scanner: DiscoveredScanner & { name?: string }) => {
			const response = await api.post<Scanner>('/scanners', scanner);
			return response;
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
			await api.delete(`/scanners/${scannerId}`);
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
			const response = await api.patch<Scanner>(`/scanners/${scannerId}`, data);
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
			const response = await api.post<ScanPreviewData>(
				`/scanners/${scannerId}/preview`,
				options
			);
			return response;
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
			const response = await api.post<ScanJob>(`/scanners/${scannerId}/scan`, {
				options,
				target_folder_id: targetFolderId,
			});
			return response;
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
			await api.post(`/scanners/jobs/${jobId}/cancel`);
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
			const response = await api.get<ScanJob>(`/scanners/jobs/${jobId}`);
			return response;
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
			const response = await api.get<ScanJob[]>('/scanners/jobs');
			return response;
		},
	});
}

export function useRecentScans(limit = 10) {
	return useQuery({
		queryKey: [...SCANNER_KEY, 'recent', limit],
		queryFn: async () => {
			const response = await api.get<ScanJob[]>('/scanners/jobs/recent', {
				params: { limit },
			});
			return response;
		},
	});
}
