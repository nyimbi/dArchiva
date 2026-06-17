// (c) Copyright Datacraft, 2026.
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportType = 'document_summary' | 'ocr_quality' | 'scanning_productivity' | 'expiry_upcoming';
export type ReportSchedule = 'daily' | 'weekly' | 'monthly';
export type ReportFormat = 'csv' | 'xlsx';

export interface ScheduledReport {
	id: string;
	name: string;
	report_type: ReportType;
	schedule: ReportSchedule;
	delivery_hour: number;
	day_of_week: number | null;
	recipients: string;
	format: ReportFormat;
	filters: string;
	is_active: boolean;
	last_sent_at: string | null;
	send_count: number;
	tenant_id: string;
	created_by_id: string | null;
	created_at: string;
}

export interface CreateScheduledReportInput {
	name: string;
	report_type: ReportType;
	schedule: ReportSchedule;
	delivery_hour: number;
	day_of_week?: number | null;
	recipients: string;
	format: ReportFormat;
	filters?: Record<string, unknown>;
	is_active?: boolean;
}

export interface UpdateScheduledReportInput {
	name?: string;
	report_type?: ReportType;
	schedule?: ReportSchedule;
	delivery_hour?: number;
	day_of_week?: number | null;
	recipients?: string;
	format?: ReportFormat;
	filters?: Record<string, unknown>;
	is_active?: boolean;
}

export interface SendNowResult {
	sent: boolean;
	recipients: string[];
	filename: string;
}

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

const SCHEDULED_REPORTS_KEY = ['scheduled-reports'] as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useScheduledReports() {
	return useQuery({
		queryKey: SCHEDULED_REPORTS_KEY,
		queryFn: async () => {
			const { data } = await apiClient.get<ScheduledReport[]>('/reports/scheduled');
			return data;
		},
	});
}

export function useCreateScheduledReport() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (input: CreateScheduledReportInput) => {
			const { data } = await apiClient.post<ScheduledReport>('/reports/scheduled', input);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULED_REPORTS_KEY }),
	});
}

export function useUpdateScheduledReport() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async ({ id, ...input }: UpdateScheduledReportInput & { id: string }) => {
			const { data } = await apiClient.patch<ScheduledReport>(`/reports/scheduled/${id}`, input);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULED_REPORTS_KEY }),
	});
}

export function useDeleteScheduledReport() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			await apiClient.delete(`/reports/scheduled/${id}`);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULED_REPORTS_KEY }),
	});
}

export function useSendReportNow() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.post<SendNowResult>(`/reports/scheduled/${id}/send-now`);
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: SCHEDULED_REPORTS_KEY }),
	});
}
