// (c) Copyright Datacraft, 2026
// Card component for per-user dArchiva email notification preferences.
// Covers scanning-specific events: batch complete, SLA breach, exception alerts, weekly KPI.
import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday … 6 = Saturday

export interface WeeklyKpiSchedule {
	/** Day of week to send report (0=Sun, 1=Mon … 6=Sat). Default: 1 (Monday). */
	day_of_week: DayOfWeek;
	/** UTC hour to send (0–23). Default: 8. */
	send_hour: number;
}

export interface EmailNotificationPreferences {
	batch_complete: boolean;
	sla_breach: boolean;
	exceptions: boolean;
	weekly_summary: boolean;
	/** Weekly KPI report toggle + schedule */
	weekly_kpi_report: boolean;
	weekly_kpi_schedule: WeeklyKpiSchedule;
	/** Override email address; blank = use account email */
	notification_email: string;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

const QUERY_KEY = ['notifications', 'email-preferences'] as const;
const API_URL = '/notifications/preferences';

export function useNotificationPreferences() {
	return useQuery({
		queryKey: QUERY_KEY,
		queryFn: async (): Promise<EmailNotificationPreferences> => {
			const { data } = await apiClient.get<EmailNotificationPreferences>(API_URL);
			return data;
		},
		staleTime: 60_000,
	});
}

export function useUpdatePreferences() {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: async (
			updates: Partial<EmailNotificationPreferences>,
		): Promise<EmailNotificationPreferences> => {
			const { data } = await apiClient.put<EmailNotificationPreferences>(API_URL, updates);
			return data;
		},
		onSuccess: (data) => {
			qc.setQueryData(QUERY_KEY, data);
		},
	});
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const DAY_LABELS: Record<DayOfWeek, string> = {
	0: 'Sunday',
	1: 'Monday',
	2: 'Tuesday',
	3: 'Wednesday',
	4: 'Thursday',
	5: 'Friday',
	6: 'Saturday',
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);

interface KpiSchedulePickerProps {
	schedule: WeeklyKpiSchedule;
	disabled: boolean;
	onChange: (s: WeeklyKpiSchedule) => void;
}

function KpiSchedulePicker({ schedule, disabled, onChange }: KpiSchedulePickerProps) {
	const selectCls = [
		'rounded-md bg-slate-700/60 border border-slate-600',
		'px-2 py-1 text-sm text-slate-100',
		'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
		disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
	].join(' ');

	return (
		<div className="flex flex-wrap items-center gap-3 mt-2 pl-1">
			<label className="text-xs text-slate-400">Send on</label>
			<select
				disabled={disabled}
				value={schedule.day_of_week}
				onChange={(e) =>
					onChange({ ...schedule, day_of_week: Number(e.target.value) as DayOfWeek })
				}
				className={selectCls}
			>
				{(Object.entries(DAY_LABELS) as [string, string][]).map(([v, label]) => (
					<option key={v} value={v}>
						{label}
					</option>
				))}
			</select>

			<label className="text-xs text-slate-400">at</label>
			<select
				disabled={disabled}
				value={schedule.send_hour}
				onChange={(e) => onChange({ ...schedule, send_hour: Number(e.target.value) })}
				className={selectCls}
			>
				{HOURS.map((h) => (
					<option key={h} value={h}>
						{String(h).padStart(2, '0')}:00 UTC
					</option>
				))}
			</select>
		</div>
	);
}

interface ToggleRowProps {
	label: string;
	description: string;
	checked: boolean;
	disabled?: boolean;
	onChange: (val: boolean) => void;
}

function ToggleRow({ label, description, checked, disabled = false, onChange }: ToggleRowProps) {
	return (
		<div className="flex items-center justify-between py-3">
			<div className="flex-1 min-w-0 pr-4">
				<p className="text-sm font-medium text-slate-200">{label}</p>
				<p className="text-xs text-slate-400 mt-0.5">{description}</p>
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				disabled={disabled}
				onClick={() => !disabled && onChange(!checked)}
				className={[
					'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full',
					'border-2 border-transparent transition-colors duration-200',
					'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
					checked ? 'bg-amber-500' : 'bg-slate-600',
					disabled ? 'opacity-40 cursor-not-allowed' : '',
				].join(' ')}
			>
				<span
					className={[
						'pointer-events-none inline-block h-4 w-4 transform rounded-full',
						'bg-white shadow ring-0 transition duration-200 ease-in-out',
						checked ? 'translate-x-4' : 'translate-x-0',
					].join(' ')}
				/>
			</button>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NotificationPreferences() {
	const { data: prefs, isLoading, isError } = useNotificationPreferences();
	const updateMutation = useUpdatePreferences();
	const [emailDraft, setEmailDraft] = useState<string | null>(null);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-10">
				<div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
			</div>
		);
	}

	if (isError || !prefs) {
		return (
			<div className="rounded-md bg-red-900/30 border border-red-700/40 px-4 py-3 text-sm text-red-300">
				Failed to load notification preferences.
			</div>
		);
	}

	const toggle = (key: keyof EmailNotificationPreferences) => (val: boolean) => {
		updateMutation.mutate({ [key]: val });
	};

	const currentEmail = emailDraft ?? prefs.notification_email;

	const handleEmailBlur = () => {
		if (emailDraft !== null && emailDraft !== prefs.notification_email) {
			updateMutation.mutate({ notification_email: emailDraft });
		}
		setEmailDraft(null);
	};

	return (
		<div className="rounded-xl bg-slate-800/60 border border-slate-700/50 overflow-hidden">
			{/* Card header */}
			<div className="px-5 py-4 border-b border-slate-700/50">
				<h3 className="text-base font-semibold text-white">Email Notification Preferences</h3>
				<p className="text-xs text-slate-400 mt-0.5">
					Configure which scanning events trigger email alerts
				</p>
			</div>

			{/* Toggles */}
			<div className="px-5 divide-y divide-slate-700/40">
				<ToggleRow
					label="Batch Complete"
					description="Receive an email when a scan batch reaches 'complete' status"
					checked={prefs.batch_complete}
					onChange={toggle('batch_complete')}
				/>
				<ToggleRow
					label="SLA Breach"
					description="Receive an email on SLA warning or critical deadline breach"
					checked={prefs.sla_breach}
					onChange={toggle('sla_breach')}
				/>
				<ToggleRow
					label="Exception Alerts"
					description="Receive an email when a processing exception is raised"
					checked={prefs.exceptions}
					onChange={toggle('exceptions')}
				/>
				<ToggleRow
					label="Weekly KPI Summary"
					description="Receive a weekly digest of your scanning performance metrics"
					checked={prefs.weekly_summary}
					onChange={toggle('weekly_summary')}
				/>
				<div className="py-3">
					<ToggleRow
						label="Weekly KPI Report"
						description="Full tenant-wide KPI report emailed to supervisors on a schedule"
						checked={prefs.weekly_kpi_report}
						onChange={toggle('weekly_kpi_report')}
					/>
					{prefs.weekly_kpi_report && (
						<KpiSchedulePicker
							schedule={prefs.weekly_kpi_schedule}
							disabled={updateMutation.isPending}
							onChange={(s) => updateMutation.mutate({ weekly_kpi_schedule: s })}
						/>
					)}
				</div>
			</div>

			{/* Email address override */}
			<div className="px-5 py-4 border-t border-slate-700/50">
				<label className="block text-sm font-medium text-slate-200 mb-1">
					Notification email address
				</label>
				<p className="text-xs text-slate-400 mb-2">
					Leave blank to use your account email. Enter a different address to override.
				</p>
				<input
					type="email"
					value={currentEmail}
					onChange={(e) => setEmailDraft(e.target.value)}
					onBlur={handleEmailBlur}
					placeholder="your@email.com"
					className={[
						'w-full rounded-md bg-slate-700/60 border border-slate-600',
						'px-3 py-2 text-sm text-slate-100 placeholder-slate-500',
						'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
						'transition-colors',
					].join(' ')}
				/>
				{updateMutation.isPending && (
					<p className="text-xs text-amber-400 mt-1">Saving…</p>
				)}
				{updateMutation.isError && (
					<p className="text-xs text-red-400 mt-1">Failed to save — please retry.</p>
				)}
			</div>
		</div>
	);
}
