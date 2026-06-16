// (c) Copyright Datacraft, 2026
// dArchiva Scanning Projects - API Hooks

import { apiClient } from '@/lib/api-client';
import { useMutation,useQuery,useQueryClient } from '@tanstack/react-query';
import type {
	BatchPipelineResponse,
	LiveOpsResponse,
	OperatorKPI,
	PageEventInput,
	TeamSummaryResponse,
} from './index';
import type {
  AIAdvisorResponse,
  BatchFilters,
  BatchPriorityQueue,
  BulkOperationResult,
  BurndownDataPoint,
  CapacityPlan,
  DocumentTypeDistribution,
  EquipmentMaintenance,
  MultiLocationDashboard,
  OperatorCertification,
  PaginatedResponse,
  ProjectBudget,
  ProjectCheckpoint,
  ProjectContract,
  ProjectCost,
  ProjectDashboard,
  ProjectFilters,
  ProjectSLA,
  ScanningBatch,
  ScanningLocation,
  ScanningProject,
  Shift,
  ShiftAssignment,
  SLAAlert,
  SubProject,
  VelocityDataPoint,
  WorkloadForecast,
} from '../types';

const BASE_URL = '/scanning-projects';

// Query keys
export const scanningProjectKeys = {
  all: ['scanning-projects'] as const,
  lists: () => [...scanningProjectKeys.all, 'list'] as const,
  list: (filters: ProjectFilters) => [...scanningProjectKeys.lists(), filters] as const,
  details: () => [...scanningProjectKeys.all, 'detail'] as const,
  detail: (id: string) => [...scanningProjectKeys.details(), id] as const,
  dashboard: (id: string) => [...scanningProjectKeys.detail(id), 'dashboard'] as const,
  burndown: (id: string) => [...scanningProjectKeys.detail(id), 'burndown'] as const,
  velocity: (id: string) => [...scanningProjectKeys.detail(id), 'velocity'] as const,
  subProjects: (id: string) => [...scanningProjectKeys.detail(id), 'sub-projects'] as const,
  batches: (id: string, filters?: BatchFilters) =>
    [...scanningProjectKeys.detail(id), 'batches', filters] as const,
  costs: (id: string) => [...scanningProjectKeys.detail(id), 'costs'] as const,
  budget: (id: string) => [...scanningProjectKeys.detail(id), 'budget'] as const,
  slas: (id: string) => [...scanningProjectKeys.detail(id), 'slas'] as const,
  slaAlerts: (id: string) => [...scanningProjectKeys.detail(id), 'sla-alerts'] as const,
  capacityPlans: (id: string) => [...scanningProjectKeys.detail(id), 'capacity-plans'] as const,
  documentTypes: (id: string) => [...scanningProjectKeys.detail(id), 'document-types'] as const,
  priorityQueue: (id: string) => [...scanningProjectKeys.detail(id), 'priority-queue'] as const,
  contracts: (id: string) => [...scanningProjectKeys.detail(id), 'contracts'] as const,
  forecasts: (id: string) => [...scanningProjectKeys.detail(id), 'forecasts'] as const,
  checkpoints: (id: string) => [...scanningProjectKeys.detail(id), 'checkpoints'] as const,
  locations: () => [...scanningProjectKeys.all, 'locations'] as const,
  shifts: () => [...scanningProjectKeys.all, 'shifts'] as const,
  shiftAssignments: (date?: string) => [...scanningProjectKeys.all, 'shift-assignments', date] as const,
  maintenance: () => [...scanningProjectKeys.all, 'maintenance'] as const,
  certifications: () => [...scanningProjectKeys.all, 'certifications'] as const,
  multiLocationDashboard: () => [...scanningProjectKeys.all, 'multi-location-dashboard'] as const,
};

// === Project Queries ===

export function useProjects(filters: ProjectFilters = {}) {
  return useQuery({
    queryKey: scanningProjectKeys.list(filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status?.length) params.set('status', filters.status.join(','));
      if (filters.search) params.set('search', filters.search);
      if (filters.client_name) params.set('client_name', filters.client_name);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.location_id) params.set('location_id', filters.location_id);

      const res = await apiClient.get<PaginatedResponse<ScanningProject>>(
        `${BASE_URL}?${params.toString()}`
      );
      return res.data;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: scanningProjectKeys.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<ScanningProject>(`${BASE_URL}/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useProjectDashboard(id: string) {
  return useQuery({
    queryKey: scanningProjectKeys.dashboard(id),
    queryFn: async () => {
      const res = await apiClient.get<ProjectDashboard>(`${BASE_URL}/${id}/dashboard`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 30000, // Refresh every 30 seconds for live data
  });
}

export function useAIAnalysis(projectId: string, enabled = true) {
  return useQuery({
    queryKey: [...scanningProjectKeys.detail(projectId), 'ai-analysis'],
    queryFn: async () => {
      const res = await apiClient.get<AIAdvisorResponse>(`${BASE_URL}/${projectId}/ai-analysis`);
      return res.data;
    },
    enabled: !!projectId && enabled,
    staleTime: 5 * 60 * 1000, // 5 min — LLM calls are expensive
    retry: 1,
  });
}

export function useBurndownChart(id: string) {
  return useQuery({
    queryKey: scanningProjectKeys.burndown(id),
    queryFn: async () => {
      const res = await apiClient.get<BurndownDataPoint[]>(`${BASE_URL}/${id}/burndown`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useVelocityChart(id: string) {
  return useQuery({
    queryKey: scanningProjectKeys.velocity(id),
    queryFn: async () => {
      const res = await apiClient.get<VelocityDataPoint[]>(`${BASE_URL}/${id}/velocity`);
      return res.data;
    },
    enabled: !!id,
  });
}

// === Sub-Projects ===

export function useSubProjects(projectId: string) {
  return useQuery({
    queryKey: scanningProjectKeys.subProjects(projectId),
    queryFn: async () => {
      const res = await apiClient.get<SubProject[]>(`${BASE_URL}/${projectId}/sub-projects`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateSubProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, data }: { projectId: string; data: Partial<SubProject> }) => {
      const res = await apiClient.post<SubProject>(`${BASE_URL}/${projectId}/sub-projects`, data);
      return res.data;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.subProjects(projectId) });
    },
  });
}

// === Batches ===

export function useBatches(projectId: string, filters: BatchFilters = {}) {
  return useQuery({
    queryKey: scanningProjectKeys.batches(projectId, filters),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.status?.length) params.set('status', filters.status.join(','));
      if (filters.search) params.set('search', filters.search);
      if (filters.priority_min) params.set('priority_min', String(filters.priority_min));
      if (filters.is_rush !== undefined) params.set('is_rush', String(filters.is_rush));
      if (filters.operator_id) params.set('operator_id', filters.operator_id);

      const res = await apiClient.get<PaginatedResponse<ScanningBatch>>(
        `${BASE_URL}/${projectId}/batches?${params.toString()}`
      );
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function usePriorityQueue(projectId: string) {
  return useQuery({
    queryKey: scanningProjectKeys.priorityQueue(projectId),
    queryFn: async () => {
      const res = await apiClient.get<BatchPriorityQueue[]>(`${BASE_URL}/${projectId}/priority-queue`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useBulkUpdateBatches() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { batch_ids: string[]; updates: Partial<ScanningBatch> }) => {
      const res = await apiClient.patch<BulkOperationResult>(`${BASE_URL}/batches/bulk-update`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.all });
    },
  });
}

// === Locations ===

export function useLocations() {
  return useQuery({
    queryKey: scanningProjectKeys.locations(),
    queryFn: async () => {
      const res = await apiClient.get<ScanningLocation[]>(`${BASE_URL}/locations`);
      return res.data;
    },
  });
}

export function useMultiLocationDashboard() {
  return useQuery({
    queryKey: scanningProjectKeys.multiLocationDashboard(),
    queryFn: async () => {
      const res = await apiClient.get<MultiLocationDashboard>(`${BASE_URL}/location-dashboard`);
      return res.data;
    },
    refetchInterval: 60000,
  });
}

// === Shifts ===

export function useShifts() {
  return useQuery({
    queryKey: scanningProjectKeys.shifts(),
    queryFn: async () => {
      const res = await apiClient.get<Shift[]>(`${BASE_URL}/shifts`);
      return res.data;
    },
  });
}

export function useShiftAssignments(opts?: { date?: string; projectId?: string; dateFrom?: string; dateTo?: string }) {
  return useQuery({
    queryKey: scanningProjectKeys.shiftAssignments(opts?.date ?? opts?.projectId ?? opts?.dateFrom),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (opts?.date) params.set('assignment_date', opts.date);
      if (opts?.projectId) params.set('project_id', opts.projectId);
      if (opts?.dateFrom) params.set('date_from', opts.dateFrom);
      if (opts?.dateTo) params.set('date_to', opts.dateTo);
      const qs = params.toString();
      const res = await apiClient.get<ShiftAssignment[]>(`${BASE_URL}/shift-assignments${qs ? `?${qs}` : ''}`);
      return res.data;
    },
  });
}

export function useCreateShiftAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { shift_id: string; operator_id: string; operator_name?: string; project_id?: string; assignment_date: string }) => {
      const res = await apiClient.post<ShiftAssignment>(`${BASE_URL}/shift-assignments`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.all });
    },
  });
}

export function useBulkCreateShiftAssignments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignments: Array<{ shift_id: string; operator_id: string; operator_name?: string; project_id?: string; assignment_date: string }>) => {
      const res = await apiClient.post<ShiftAssignment[]>(`${BASE_URL}/shifts/assignments/bulk`, { assignments });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.all });
    },
  });
}

export function useDeleteShiftAssignment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (assignmentId: string) => {
      await apiClient.delete(`${BASE_URL}/shift-assignments/${assignmentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.all });
    },
  });
}

export function useCreateShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; start_time: string; end_time: string; days_of_week?: string; target_pages_per_operator?: number }) => {
      const res = await apiClient.post<Shift>(`${BASE_URL}/shifts`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.shifts() });
    },
  });
}

// === Costs & Budget ===

export function useProjectCosts(projectId: string) {
  return useQuery({
    queryKey: scanningProjectKeys.costs(projectId),
    queryFn: async () => {
      const res = await apiClient.get<ProjectCost[]>(`${BASE_URL}/${projectId}/costs`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useProjectBudget(projectId: string) {
  return useQuery({
    queryKey: scanningProjectKeys.budget(projectId),
    queryFn: async () => {
      const res = await apiClient.get<ProjectBudget>(`${BASE_URL}/${projectId}/budget`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

// === SLAs ===

export function useProjectSLAs(projectId: string) {
  return useQuery({
    queryKey: scanningProjectKeys.slas(projectId),
    queryFn: async () => {
      const res = await apiClient.get<ProjectSLA[]>(`${BASE_URL}/${projectId}/slas`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useSLAAlerts(projectId: string) {
  return useQuery({
    queryKey: scanningProjectKeys.slaAlerts(projectId),
    queryFn: async () => {
      const res = await apiClient.get<SLAAlert[]>(`${BASE_URL}/${projectId}/sla-alerts`);
      return res.data;
    },
    enabled: !!projectId,
    refetchInterval: 30000,
  });
}

export function useAcknowledgeSLAAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ alertId, notes }: { alertId: string; notes?: string }) => {
      await apiClient.post(`${BASE_URL}/sla-alerts/${alertId}/acknowledge`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.all });
    },
  });
}

// === Equipment Maintenance ===

export function useEquipmentMaintenance() {
  return useQuery({
    queryKey: scanningProjectKeys.maintenance(),
    queryFn: async () => {
      const res = await apiClient.get<EquipmentMaintenance[]>(`${BASE_URL}/maintenance`);
      return res.data;
    },
  });
}

// === Certifications ===

export function useOperatorCertifications() {
  return useQuery({
    queryKey: scanningProjectKeys.certifications(),
    queryFn: async () => {
      const res = await apiClient.get<OperatorCertification[]>(`${BASE_URL}/certifications`);
      return res.data;
    },
  });
}

// === Capacity Planning ===

export function useCapacityPlans(projectId: string) {
  return useQuery({
    queryKey: scanningProjectKeys.capacityPlans(projectId),
    queryFn: async () => {
      const res = await apiClient.get<CapacityPlan[]>(`${BASE_URL}/${projectId}/capacity-plans`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

// === Document Types ===

export function useDocumentTypeDistributions(projectId: string) {
  return useQuery({
    queryKey: scanningProjectKeys.documentTypes(projectId),
    queryFn: async () => {
      const res = await apiClient.get<DocumentTypeDistribution[]>(
        `${BASE_URL}/${projectId}/document-types`
      );
      return res.data;
    },
    enabled: !!projectId,
  });
}

// === Contracts ===

export function useProjectContracts(projectId: string) {
  return useQuery({
    queryKey: scanningProjectKeys.contracts(projectId),
    queryFn: async () => {
      const res = await apiClient.get<ProjectContract[]>(`${BASE_URL}/${projectId}/contracts`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

// === Forecasts ===

export function useWorkloadForecasts(projectId: string) {
  return useQuery({
    queryKey: scanningProjectKeys.forecasts(projectId),
    queryFn: async () => {
      const res = await apiClient.get<WorkloadForecast[]>(
        `${BASE_URL}/${projectId}/workload-forecasts`
      );
      return res.data;
    },
    enabled: !!projectId,
  });
}

// === Checkpoints ===

export function useProjectCheckpoints(projectId: string) {
  return useQuery({
    queryKey: scanningProjectKeys.checkpoints(projectId),
    queryFn: async () => {
      const res = await apiClient.get<ProjectCheckpoint[]>(`${BASE_URL}/${projectId}/checkpoints`);
      return res.data;
    },
    enabled: !!projectId,
  });
}

export function useUpdateCheckpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      checkpointId,
      data,
    }: {
      checkpointId: string;
      data: Partial<ProjectCheckpoint>;
    }) => {
      const res = await apiClient.patch<ProjectCheckpoint>(
        `${BASE_URL}/checkpoints/${checkpointId}`,
        data
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.all });
    },
  });
}

// =====================================================
// Supervisor Hooks
// =====================================================

export function useLiveOps() {
  return useQuery<LiveOpsResponse>({
    queryKey: ['supervisor', 'live-ops'],
    queryFn: async () => {
      const res = await apiClient.get<LiveOpsResponse>(`${BASE_URL}/supervisor/live-ops`);
      return res.data;
    },
    refetchInterval: 10_000,
  });
}

export function useOperatorKpis(days?: number) {
  return useQuery<OperatorKPI[]>({
    queryKey: ['supervisor', 'operator-kpis', days],
    queryFn: async () => {
      const res = await apiClient.get<OperatorKPI[]>(`${BASE_URL}/supervisor/operator-kpis`, {
        params: days ? { days } : undefined,
      });
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useTeamSummary(projectId?: string, locationId?: string) {
  return useQuery<TeamSummaryResponse>({
    queryKey: ['supervisor', 'team-summary', projectId, locationId],
    queryFn: async () => {
      const res = await apiClient.get<TeamSummaryResponse>(`${BASE_URL}/supervisor/team-summary`, {
        params: {
          ...(projectId ? { project_id: projectId } : {}),
          ...(locationId ? { location_id: locationId } : {}),
        },
      });
      return res.data;
    },
    refetchInterval: 30_000,
  });
}

export function useBatchPipeline(projectId: string) {
  return useQuery<BatchPipelineResponse>({
    queryKey: ['supervisor', 'batch-pipeline', projectId],
    queryFn: async () => {
      const res = await apiClient.get<BatchPipelineResponse>(
        `${BASE_URL}/${projectId}/batch-pipeline`
      );
      return res.data;
    },
    enabled: !!projectId,
    refetchInterval: 15_000,
  });
}

export function useExportKpis() {
  return useMutation({
    mutationFn: async ({ days = 30, format = 'csv' }: { days?: number; format?: 'csv' | 'pdf' }) => {
      if (format === 'pdf') {
        window.open(
          `/api${BASE_URL}/supervisor/operator-kpis/export?format=pdf&days=${days}`,
          '_blank',
        );
        return;
      }
      // CSV: fetch as blob and trigger download
      const res = await apiClient.get(
        `${BASE_URL}/supervisor/operator-kpis/export`,
        {
          params: { format: 'csv', days },
          responseType: 'blob',
        },
      );
      const today = new Date().toISOString().slice(0, 10);
      const blob = new Blob([res.data as BlobPart], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `operator-kpis-${today}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}

export function useRecordPageEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PageEventInput) => {
      await apiClient.post(`${BASE_URL}/supervisor/page-event`, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supervisor'] });
    },
  });
}

// === Project Mutations ===

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<ScanningProject>) => {
      const res = await apiClient.post<ScanningProject>(BASE_URL, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.lists() });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ScanningProject> }) => {
      const res = await apiClient.patch<ScanningProject>(`${BASE_URL}/${id}`, data);
      return res.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.lists() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`${BASE_URL}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scanningProjectKeys.lists() });
    },
  });
}

// ── Barcode Label Generation ──────────────────────────────────────────────────

interface BarcodeLabelParams {
  projectId: string;
  prefix?: string;
  count: number;
}

/**
 * POST /scanning-projects/{project_id}/barcode-labels
 *
 * Returns an HTML page (router_batch_ops endpoint) that auto-triggers window.print().
 * Opens in a new tab so the browser print dialog fires immediately.
 *
 * If you need a PDF blob instead, swap the accept header and change the
 * router_batch_ops endpoint to respond with application/pdf.
 */
export function useGenerateBarcodeLabels() {
  return useMutation({
    mutationFn: async ({ projectId, prefix = '', count }: BarcodeLabelParams) => {
      const params = new URLSearchParams({ count: String(count) });
      if (prefix) params.set('prefix', prefix);

      const response = await apiClient.get(
        `${BASE_URL}/${projectId}/barcode-labels?${params.toString()}`,
        { responseType: 'blob' },
      );

      const blob = new Blob([response.data as BlobPart], { type: 'text/html' });
      const url = URL.createObjectURL(blob);

      // Open printable page in a new tab — the server injects window.print()
      const tab = window.open(url, '_blank');
      if (!tab) {
        // Fallback: trigger download if pop-up was blocked
        const link = document.createElement('a');
        link.href = url;
        link.download = `barcode-labels-${projectId}.html`;
        link.click();
      }

      // Revoke after a short delay to let the new tab load the blob URL
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    },
  });
}
