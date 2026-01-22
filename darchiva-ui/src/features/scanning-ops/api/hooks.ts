import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

const BASE_URL = '/scanning-projects/gamification';

export interface OperatorScore {
    id: string;
    operator_name: string;
    pages_scanned: number;
    quality_score: number;
    rank?: number;
}

export interface PerformanceData {
    name: string;
    pages: number;
}

export const gamificationKeys = {
    all: ['gamification'] as const,
    leaderboard: () => [...gamificationKeys.all, 'leaderboard'] as const,
    performance: () => [...gamificationKeys.all, 'performance'] as const,
};

export function useLeaderboard(limit = 10) {
    return useQuery({
        queryKey: [...gamificationKeys.leaderboard(), limit],
        queryFn: async () => {
            const res = await apiClient.get<OperatorScore[]>(`${BASE_URL}/leaderboard`, {
                params: { limit },
            });
            return res.data;
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });
}

export function useOperatorPerformance() {
    return useQuery({
        queryKey: gamificationKeys.performance(),
        queryFn: async () => {
            const res = await apiClient.get<PerformanceData[]>(`${BASE_URL}/performance`);
            return res.data;
        },
        refetchInterval: 60000, // Refresh every minute
    });
}

// =====================================================
// Warehouse & Scanning Operations Hooks
// =====================================================

export const warehouseKeys = {
    all: ['warehouse'] as const,
    activity: () => [...warehouseKeys.all, 'activity'] as const,
};

export const operatorKeys = {
    all: ['operator'] as const,
    batches: (projectId?: string) => [...operatorKeys.all, 'batches', projectId] as const,
    stats: () => [...operatorKeys.all, 'stats'] as const,
};

export interface WarehouseActivity {
    id: string;
    action: string;
    box_id: string;
    operator_name: string | null;
    timestamp: string;
}

export interface AssignedBatch {
    id: string;
    batch_number: string;
    type: string;
    physical_location: string;
    estimated_pages: number;
    status: string;
    project_id: string;
}

export interface OperatorStats {
    pages_scanned: number;
    target_pages: number;
    quality_score: number;
    shift_start: string | null;
    shift_end: string | null;
}

export function useWarehouseActivity(limit = 10) {
    return useQuery({
        queryKey: [...warehouseKeys.activity(), limit],
        queryFn: async () => {
            const res = await apiClient.get<WarehouseActivity[]>('/scanning-ops/warehouse/activity', {
                params: { limit },
            });
            return res.data;
        },
        refetchInterval: 5000, // Refresh every 5 seconds for real-time updates
    });
}

export function useWarehouseScan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { barcode: string; action: string }) => {
            const res = await apiClient.post('/scanning-ops/warehouse/scan', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: warehouseKeys.activity() });
        },
    });
}

export function useAssignedBatches(projectId?: string) {
    return useQuery({
        queryKey: operatorKeys.batches(projectId),
        queryFn: async () => {
            const res = await apiClient.get<AssignedBatch[]>('/scanning-ops/operator/batches', {
                params: projectId ? { project_id: projectId } : {},
            });
            return res.data;
        },
        refetchInterval: 30000, // Refresh every 30 seconds
    });
}

export function useShiftStats() {
    return useQuery({
        queryKey: operatorKeys.stats(),
        queryFn: async () => {
            const res = await apiClient.get<OperatorStats>('/scanning-ops/operator/stats');
            return res.data;
        },
        refetchInterval: 10000, // Refresh every 10 seconds
    });
}

export function useScanPage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { batch_id: string; scanner_id?: string; simulate?: boolean }) => {
            const res = await apiClient.post('/scanning-ops/scan', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: operatorKeys.batches() });
            queryClient.invalidateQueries({ queryKey: operatorKeys.stats() });
        },
    });
}
