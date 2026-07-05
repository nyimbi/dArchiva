import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';

const OPERATOR_KPIS_URL = '/scanning-projects/supervisor/operator-kpis';

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

interface OperatorKpi {
    operator_id: string;
    operator_name: string;
    pages_scanned: number;
    first_pass_yield: number;
    [key: string]: unknown;
}

export function useLeaderboard(limit = 10) {
    return useQuery({
        queryKey: [...gamificationKeys.leaderboard(), limit],
        queryFn: async () => {
            const res = await apiClient.get<OperatorKpi[]>(OPERATOR_KPIS_URL, {
                params: { days: 7, limit },
            });
            return res.data.map((kpi, index): OperatorScore => ({
                id: kpi.operator_id,
                operator_name: kpi.operator_name,
                pages_scanned: kpi.pages_scanned,
                quality_score: kpi.first_pass_yield,
                rank: index + 1,
            }));
        },
        refetchInterval: 30000,
    });
}

export function useOperatorPerformance() {
    return useQuery({
        queryKey: gamificationKeys.performance(),
        queryFn: async () => {
            const res = await apiClient.get<OperatorKpi[]>(OPERATOR_KPIS_URL, {
                params: { days: 7, limit: 50 },
            });
            return res.data.map((kpi): PerformanceData => ({
                name: kpi.operator_name,
                pages: kpi.pages_scanned,
            }));
        },
        refetchInterval: 60000,
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

interface ScanHistoryItem {
    id: string;
    scanned_code: string;
    scan_purpose?: string;
    success: boolean;
    created_at: string;
}

interface InventoryScanResponse {
    success: boolean;
    resolved_type: string | null;
    resolved_id: string | null;
    resolved_data: Record<string, unknown> | null;
    error_message: string | null;
}

interface ScanningProjectSummary {
    id: string;
    status?: string;
}

interface ScanningBatchSummary {
    id: string;
    batch_number?: string;
    type?: string;
    physical_location?: string;
    estimated_pages?: number;
    status?: string;
    project_id?: string;
}

interface Shift {
    id: string;
    target_pages_per_operator?: number;
}

interface ShiftAssignment {
    id: string;
    shift_id: string;
    pages_scanned?: number;
    actual_start?: string;
    actual_end?: string;
    assignment_date?: string;
}

function getCurrentUserId(): string | null {
    const raw = localStorage.getItem('darchiva_user');
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as { id?: string };
        return parsed.id ?? null;
    } catch {
        return null;
    }
}

async function getDefaultLocationId(): Promise<string | null> {
    const res = await apiClient.get<Array<{ id: string }>>('/inventory/locations');
    return res.data[0]?.id ?? null;
}

export function useWarehouseActivity(limit = 10) {
    return useQuery({
        queryKey: [...warehouseKeys.activity(), limit],
        queryFn: async () => {
            const res = await apiClient.get<ScanHistoryItem[]>('/inventory/scan/history', {
                params: { limit },
            });

            return res.data.map((item) => ({
                id: item.id,
                action: item.scan_purpose ?? (item.success ? 'scan' : 'error'),
                box_id: item.scanned_code,
                operator_name: null,
                timestamp: item.created_at,
            }));
        },
        refetchInterval: 5000,
    });
}

export function useWarehouseScan() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { barcode: string; action: 'check-out' | 'check-in' }) => {
            const scan = await apiClient.post<InventoryScanResponse>('/inventory/scan', {
                scannedCode: data.barcode,
                codeType: 'barcode',
                scanPurpose: data.action === 'check-out' ? 'checkout' : 'checkin',
            });

            if (!scan.data.success || scan.data.resolved_type !== 'container' || !scan.data.resolved_id) {
                return scan.data;
            }

            if (data.action === 'check-out') {
                const userId = getCurrentUserId();
                if (userId) {
                    await apiClient.post(`/inventory/containers/${scan.data.resolved_id}/checkout`, {
                        containerId: scan.data.resolved_id,
                        toUserId: userId,
                        reason: 'Checked out from warehouse station',
                    });
                }
            } else {
                const locationId = await getDefaultLocationId();
                if (locationId) {
                    await apiClient.post(`/inventory/containers/${scan.data.resolved_id}/checkin`, {
                        containerId: scan.data.resolved_id,
                        toLocationId: locationId,
                        notes: 'Checked in from warehouse station',
                    });
                }
            }

            return scan.data;
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
            const toAssignedBatch = (
                batch: ScanningBatchSummary,
                resolvedProjectId: string,
            ): AssignedBatch => ({
                id: batch.id,
                batch_number: batch.batch_number ?? batch.id.slice(0, 8),
                type: batch.type ?? 'box',
                physical_location: batch.physical_location ?? 'Unspecified',
                estimated_pages: batch.estimated_pages ?? 0,
                status: batch.status ?? 'pending',
                project_id: batch.project_id ?? resolvedProjectId,
            });

            if (projectId) {
                const batchesRes = await apiClient.get<ScanningBatchSummary[]>(`/scanning-projects/${projectId}/batches`);
                return batchesRes.data.map((batch) => toAssignedBatch(batch, projectId));
            }

            const projectsRes = await apiClient.get<ScanningProjectSummary[]>('/scanning-projects');
            const candidateProjects = projectsRes.data
                .filter((project) => project.status !== 'completed')
                .slice(0, 6);

            const batchResponses = await Promise.all(
                candidateProjects.map(async (project) => {
                    const batchesRes = await apiClient.get<ScanningBatchSummary[]>(`/scanning-projects/${project.id}/batches`);
                    return batchesRes.data.map((batch) => toAssignedBatch(batch, project.id));
                }),
            );

            return batchResponses
                .flat()
                .filter((batch) => batch.status !== 'completed')
                .slice(0, 30);
        },
        refetchInterval: 30000,
    });
}

export function useShiftStats() {
    return useQuery({
        queryKey: operatorKeys.stats(),
        queryFn: async () => {
            const userId = getCurrentUserId();
            if (!userId) {
                return {
                    pages_scanned: 0,
                    target_pages: 0,
                    quality_score: 0,
                    shift_start: null,
                    shift_end: null,
                } satisfies OperatorStats;
            }

            const today = new Date().toISOString().slice(0, 10);
            const [assignmentsRes, shiftsRes, leaderboardRes] = await Promise.all([
                apiClient.get<ShiftAssignment[]>('/scanning-projects/shift-assignments', {
                    params: { operator_id: userId, assignment_date: today },
                }),
                apiClient.get<Shift[]>('/scanning-projects/shifts'),
                apiClient.get<Array<{ operator_id?: string; quality_score?: number }>>(
                    OPERATOR_KPIS_URL,
                    { params: { days: 7, limit: 100 } },
                ),
            ]);

            const assignments = assignmentsRes.data;
            const shiftsById = new Map(shiftsRes.data.map((shift) => [shift.id, shift]));

            const pagesScanned = assignments.reduce(
                (sum, assignment) => sum + (assignment.pages_scanned ?? 0),
                0,
            );

            const targetPages = assignments.reduce((sum, assignment) => {
                const shift = shiftsById.get(assignment.shift_id);
                return sum + (shift?.target_pages_per_operator ?? 0);
            }, 0);

            const firstStart = assignments
                .map((assignment) => assignment.actual_start)
                .filter((value): value is string => Boolean(value))
                .sort()[0] ?? null;

            const lastEnd = assignments
                .map((assignment) => assignment.actual_end)
                .filter((value): value is string => Boolean(value))
                .sort()
                .at(-1) ?? null;

            const leaderboardEntry = leaderboardRes.data.find(
                (entry) => entry.operator_id === userId,
            );

            return {
                pages_scanned: pagesScanned,
                target_pages: targetPages,
                quality_score: leaderboardEntry?.quality_score ?? 0,
                shift_start: firstStart,
                shift_end: lastEnd,
            } satisfies OperatorStats;
        },
        refetchInterval: 10000,
    });
}

export function useScanPage() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { batch_id: string; project_id: string; scanner_id?: string; simulate?: boolean }) => {
            const { data: batch } = await apiClient.post<{ id: string; scanned_pages: number; status: string }>(
                `/scanning-projects/${data.project_id}/batches/${data.batch_id}/record-page`,
                data.scanner_id ? { scanner_id: data.scanner_id } : {},
            );
            return batch;
        },
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: operatorKeys.batches(variables.project_id) });
            queryClient.invalidateQueries({ queryKey: operatorKeys.stats() });
        },
    });
}

// =====================================================
// Clock-In / Clock-Out Hooks
// =====================================================

export const sessionKeys = {
    all: ['sessions'] as const,
    myActive: () => [...sessionKeys.all, 'my-active'] as const,
};

export interface ActiveSession {
    session_id: string;
    project_id: string;
    project_name: string;
    started_at: string;
    duration_minutes: number;
}

export interface ClockInResponse {
    session_id: string;
    started_at: string;
    project_name: string;
}

export interface ClockOutResponse {
    session_id: string;
    started_at: string;
    ended_at: string;
    duration_minutes: number;
}

export function useMyActiveSession() {
    return useQuery<ActiveSession | null>({
        queryKey: sessionKeys.myActive(),
        queryFn: async () => {
            const res = await apiClient.get<ActiveSession | null>('/scanning-projects/sessions/my-active');
            return res.data ?? null;
        },
        refetchInterval: 30000,
    });
}

export function useClockIn() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { project_id: string; location_id?: string }) => {
            const res = await apiClient.post<ClockInResponse>('/scanning-projects/sessions/clock-in', data);
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: sessionKeys.myActive() });
            queryClient.invalidateQueries({ queryKey: operatorKeys.stats() });
        },
    });
}

export function useClockOut() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (sessionId: string) => {
            const res = await apiClient.post<ClockOutResponse>(
                `/scanning-projects/sessions/${sessionId}/clock-out`,
            );
            return res.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: sessionKeys.myActive() });
            queryClient.invalidateQueries({ queryKey: operatorKeys.stats() });
        },
    });
}

// =====================================================
// Recent Sessions
// =====================================================

export interface RecentSession {
    session_id: string;
    project_name: string;
    pages_scanned: number;
    started_at: string;
    ended_at: string | null;
    duration_minutes: number;
}

export function useRecentSessions(limit = 5) {
    return useQuery<RecentSession[]>({
        queryKey: [...sessionKeys.all, 'recent', limit],
        queryFn: async () => {
            try {
                const { data } = await apiClient.get<RecentSession[]>('/scanning-projects/sessions', {
                    params: { limit, ordering: '-started_at' },
                });
                return Array.isArray(data) ? data : [];
            } catch {
                return [];
            }
        },
        refetchInterval: 60000,
    });
}

// =====================================================
// Throughput (hourly pages for last 8 hours)
// =====================================================

export interface ThroughputHour {
    hour: string;
    pages: number;
}

function generateEmptyHours(): ThroughputHour[] {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
        const h = new Date(now.getTime() - (7 - i) * 60 * 60 * 1000);
        return {
            hour: h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
            pages: 0,
        };
    });
}

export function useThroughputData() {
    return useQuery<ThroughputHour[]>({
        queryKey: [...warehouseKeys.all, 'throughput'],
        queryFn: async () => {
            try {
                const { data } = await apiClient.get<ThroughputHour[]>('/scanning-projects/throughput/hourly');
                return Array.isArray(data) ? data : generateEmptyHours();
            } catch {
                return generateEmptyHours();
            }
        },
        refetchInterval: 60000,
    });
}
