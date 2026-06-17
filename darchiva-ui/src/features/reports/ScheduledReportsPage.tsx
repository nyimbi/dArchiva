// (c) Copyright Datacraft, 2026.
import { useState } from 'react';
import {
	useScheduledReports,
	useCreateScheduledReport,
	useUpdateScheduledReport,
	useDeleteScheduledReport,
	useSendReportNow,
	type ScheduledReport,
	type CreateScheduledReportInput,
	type ReportType,
	type ReportSchedule,
	type ReportFormat,
} from './api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPORT_TYPE_LABELS: Record<ReportType, string> = {
	document_summary: 'Document Summary',
	ocr_quality: 'OCR Quality',
	scanning_productivity: 'Scanning Productivity',
	expiry_upcoming: 'Expiry Upcoming',
};

const REPORT_TYPE_COLORS: Record<ReportType, string> = {
	document_summary: 'bg-blue-900 text-blue-300',
	ocr_quality: 'bg-purple-900 text-purple-300',
	scanning_productivity: 'bg-green-900 text-green-300',
	expiry_upcoming: 'bg-amber-900 text-amber-300',
};

const SCHEDULE_LABELS: Record<ReportSchedule, string> = {
	daily: 'Daily',
	weekly: 'Weekly',
	monthly: 'Monthly',
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatHour(h: number): string {
	const ampm = h < 12 ? 'AM' : 'PM';
	const display = h % 12 === 0 ? 12 : h % 12;
	return `${String(display).padStart(2, '0')}:00 ${ampm} UTC`;
}

function scheduleDescription(r: ScheduledReport): string {
	const hour = formatHour(r.delivery_hour);
	if (r.schedule === 'daily') return `Daily at ${hour}`;
	if (r.schedule === 'weekly') {
		const day = r.day_of_week != null ? DAY_NAMES[r.day_of_week] : 'Monday';
		return `Every ${day} at ${hour}`;
	}
	return `Monthly on 1st at ${hour}`;
}

function formatDate(iso: string | null): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

// ---------------------------------------------------------------------------
// Dialog
// ---------------------------------------------------------------------------

interface DialogProps {
	initial?: ScheduledReport | null;
	onClose: () => void;
}

function ReportDialog({ initial, onClose }: DialogProps) {
	const isEdit = !!initial;
	const create = useCreateScheduledReport();
	const update = useUpdateScheduledReport();

	const [name, setName] = useState(initial?.name ?? '');
	const [reportType, setReportType] = useState<ReportType>(initial?.report_type ?? 'document_summary');
	const [schedule, setSchedule] = useState<ReportSchedule>(initial?.schedule ?? 'daily');
	const [deliveryHour, setDeliveryHour] = useState(initial?.delivery_hour ?? 8);
	const [dayOfWeek, setDayOfWeek] = useState<number>(initial?.day_of_week ?? 0);
	const [recipients, setRecipients] = useState(initial?.recipients ?? '');
	const [format, setFormat] = useState<ReportFormat>(initial?.format ?? 'xlsx');
	const [error, setError] = useState('');

	const busy = create.isPending || update.isPending;

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError('');

		const payload: CreateScheduledReportInput = {
			name,
			report_type: reportType,
			schedule,
			delivery_hour: deliveryHour,
			day_of_week: schedule === 'weekly' ? dayOfWeek : null,
			recipients,
			format,
		};

		try {
			if (isEdit && initial) {
				await update.mutateAsync({ id: initial.id, ...payload });
			} else {
				await create.mutateAsync(payload);
			}
			onClose();
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : 'Request failed';
			setError(msg);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
			<div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-slate-700 px-6 py-4">
					<h2 className="text-lg font-semibold text-slate-100">
						{isEdit ? 'Edit Scheduled Report' : 'New Scheduled Report'}
					</h2>
					<button
						onClick={onClose}
						className="text-slate-400 transition hover:text-slate-200"
						aria-label="Close"
					>
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{/* Body */}
				<form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
					{/* Name */}
					<div>
						<label className="mb-1 block text-sm font-medium text-slate-300">Name</label>
						<input
							type="text"
							value={name}
							onChange={e => setName(e.target.value)}
							required
							className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							placeholder="e.g. Weekly OCR Quality Report"
						/>
					</div>

					{/* Report type */}
					<div>
						<label className="mb-1 block text-sm font-medium text-slate-300">Report Type</label>
						<select
							value={reportType}
							onChange={e => setReportType(e.target.value as ReportType)}
							className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						>
							{(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map(t => (
								<option key={t} value={t}>{REPORT_TYPE_LABELS[t]}</option>
							))}
						</select>
					</div>

					{/* Schedule */}
					<div>
						<label className="mb-1 block text-sm font-medium text-slate-300">Schedule</label>
						<div className="flex gap-2">
							{(['daily', 'weekly', 'monthly'] as ReportSchedule[]).map(s => (
								<button
									key={s}
									type="button"
									onClick={() => setSchedule(s)}
									className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
										schedule === s
											? 'border-blue-500 bg-blue-600 text-white'
											: 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
									}`}
								>
									{SCHEDULE_LABELS[s]}
								</button>
							))}
						</div>
					</div>

					{/* Day of week (weekly only) */}
					{schedule === 'weekly' && (
						<div>
							<label className="mb-1 block text-sm font-medium text-slate-300">Day of Week</label>
							<select
								value={dayOfWeek}
								onChange={e => setDayOfWeek(Number(e.target.value))}
								className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
							>
								{DAY_NAMES.map((d, i) => (
									<option key={i} value={i}>{d}</option>
								))}
							</select>
						</div>
					)}

					{/* Delivery hour */}
					<div>
						<label className="mb-1 block text-sm font-medium text-slate-300">Delivery Time (UTC)</label>
						<select
							value={deliveryHour}
							onChange={e => setDeliveryHour(Number(e.target.value))}
							className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						>
							{HOURS.map(h => (
								<option key={h} value={h}>{formatHour(h)}</option>
							))}
						</select>
					</div>

					{/* Recipients */}
					<div>
						<label className="mb-1 block text-sm font-medium text-slate-300">
							Recipients <span className="text-slate-500 font-normal">(comma-separated emails)</span>
						</label>
						<textarea
							value={recipients}
							onChange={e => setRecipients(e.target.value)}
							required
							rows={2}
							className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
							placeholder="alice@example.com, bob@example.com"
						/>
					</div>

					{/* Format */}
					<div>
						<label className="mb-1 block text-sm font-medium text-slate-300">Format</label>
						<div className="flex gap-2">
							{(['csv', 'xlsx'] as ReportFormat[]).map(f => (
								<button
									key={f}
									type="button"
									onClick={() => setFormat(f)}
									className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium uppercase transition ${
										format === f
											? 'border-blue-500 bg-blue-600 text-white'
											: 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
									}`}
								>
									{f}
								</button>
							))}
						</div>
					</div>

					{error && (
						<p className="rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-400">
							{error}
						</p>
					)}

					{/* Actions */}
					<div className="flex justify-end gap-3 pt-1">
						<button
							type="button"
							onClick={onClose}
							className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-300 transition hover:bg-slate-700"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={busy}
							className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
						>
							{busy ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Report'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ScheduledReportsPage() {
	const { data: reports = [], isLoading, error } = useScheduledReports();
	const toggleActive = useUpdateScheduledReport();
	const deleteReport = useDeleteScheduledReport();
	const sendNow = useSendReportNow();

	const [dialogOpen, setDialogOpen] = useState(false);
	const [editTarget, setEditTarget] = useState<ScheduledReport | null>(null);
	const [sendingId, setSendingId] = useState<string | null>(null);
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	function openCreate() {
		setEditTarget(null);
		setDialogOpen(true);
	}

	function openEdit(r: ScheduledReport) {
		setEditTarget(r);
		setDialogOpen(true);
	}

	function closeDialog() {
		setDialogOpen(false);
		setEditTarget(null);
	}

	async function handleToggle(r: ScheduledReport) {
		await toggleActive.mutateAsync({ id: r.id, is_active: !r.is_active });
	}

	async function handleDelete(r: ScheduledReport) {
		if (!window.confirm(`Delete scheduled report "${r.name}"?`)) return;
		await deleteReport.mutateAsync(r.id);
	}

	async function handleSendNow(r: ScheduledReport) {
		setSendingId(r.id);
		try {
			const result = await sendNow.mutateAsync(r.id);
			setToastMsg(`Sent to ${result.recipients.join(', ')}`);
			setTimeout(() => setToastMsg(null), 4000);
		} catch {
			setToastMsg('Delivery failed — check server logs');
			setTimeout(() => setToastMsg(null), 4000);
		} finally {
			setSendingId(null);
		}
	}

	return (
		<div className="min-h-screen bg-slate-950 p-6 text-slate-100">
			{/* Toast */}
			{toastMsg && (
				<div className="fixed bottom-6 right-6 z-50 rounded-lg border border-slate-600 bg-slate-800 px-4 py-3 text-sm text-slate-200 shadow-xl">
					{toastMsg}
				</div>
			)}

			{/* Header */}
			<div className="mb-6 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-slate-100">Scheduled Reports</h1>
					<p className="mt-1 text-sm text-slate-400">
						Configure recurring analytics reports delivered by email.
					</p>
				</div>
				<button
					onClick={openCreate}
					className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
				>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
					New Scheduled Report
				</button>
			</div>

			{/* State */}
			{isLoading && (
				<div className="flex items-center justify-center py-20 text-slate-400">
					<svg className="mr-3 h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
					</svg>
					Loading…
				</div>
			)}

			{error && (
				<div className="rounded-lg border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-400">
					Failed to load scheduled reports.
				</div>
			)}

			{!isLoading && !error && reports.length === 0 && (
				<div className="flex flex-col items-center justify-center rounded-xl border border-slate-700 bg-slate-900 py-20 text-center">
					<svg className="mb-4 h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
							d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
					</svg>
					<p className="text-slate-400">No scheduled reports yet.</p>
					<button
						onClick={openCreate}
						className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
					>
						Create your first report
					</button>
				</div>
			)}

			{/* Table */}
			{!isLoading && reports.length > 0 && (
				<div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-slate-700 bg-slate-800/50">
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Name</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Type</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Schedule</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Recipients</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Format</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Last Sent</th>
								<th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Status</th>
								<th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">Actions</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-700/50">
							{reports.map(r => (
								<tr key={r.id} className="transition hover:bg-slate-800/40">
									{/* Name */}
									<td className="px-4 py-3 font-medium text-slate-200">{r.name}</td>

									{/* Type badge */}
									<td className="px-4 py-3">
										<span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${REPORT_TYPE_COLORS[r.report_type]}`}>
											{REPORT_TYPE_LABELS[r.report_type]}
										</span>
									</td>

									{/* Schedule */}
									<td className="px-4 py-3 text-slate-300">{scheduleDescription(r)}</td>

									{/* Recipients */}
									<td className="max-w-[180px] truncate px-4 py-3 text-slate-400" title={r.recipients}>
										{r.recipients}
									</td>

									{/* Format */}
									<td className="px-4 py-3">
										<span className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs font-mono text-slate-300 uppercase">
											{r.format}
										</span>
									</td>

									{/* Last sent */}
									<td className="px-4 py-3 text-slate-400">
										{formatDate(r.last_sent_at)}
										{r.send_count > 0 && (
											<span className="ml-1 text-xs text-slate-600">({r.send_count}x)</span>
										)}
									</td>

									{/* Active toggle */}
									<td className="px-4 py-3">
										<button
											onClick={() => handleToggle(r)}
											className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
												r.is_active ? 'bg-blue-600' : 'bg-slate-600'
											}`}
											title={r.is_active ? 'Active — click to pause' : 'Paused — click to activate'}
										>
											<span
												className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
													r.is_active ? 'translate-x-5' : 'translate-x-0.5'
												}`}
											/>
										</button>
									</td>

									{/* Actions */}
									<td className="px-4 py-3">
										<div className="flex items-center justify-end gap-1">
											{/* Send Now */}
											<button
												onClick={() => handleSendNow(r)}
												disabled={sendingId === r.id}
												title="Send now"
												className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-blue-400 disabled:opacity-50"
											>
												{sendingId === r.id ? (
													<svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
														<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
														<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
													</svg>
												) : (
													<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
															d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
													</svg>
												)}
											</button>

											{/* Edit */}
											<button
												onClick={() => openEdit(r)}
												title="Edit"
												className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-slate-200"
											>
												<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
														d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
												</svg>
											</button>

											{/* Delete */}
											<button
												onClick={() => handleDelete(r)}
												title="Delete"
												className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-700 hover:text-red-400"
											>
												<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
														d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
												</svg>
											</button>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/* Dialog */}
			{dialogOpen && (
				<ReportDialog initial={editTarget} onClose={closeDialog} />
			)}
		</div>
	);
}

export default ScheduledReportsPage;
