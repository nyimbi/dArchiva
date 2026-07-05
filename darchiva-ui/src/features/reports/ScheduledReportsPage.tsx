// (c) Copyright Datacraft, 2026.
import { useState } from 'react';
import {
	CalendarClock,
	CheckCircle2,
	Clock,
	FileText,
	Loader2,
	Plus,
	Send,
	Trash2,
	Pencil,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

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

const REPORT_TYPE_VARIANTS: Record<ReportType, 'default' | 'secondary' | 'outline'> = {
	document_summary: 'default',
	ocr_quality: 'secondary',
	scanning_productivity: 'outline',
	expiry_upcoming: 'outline',
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

/**
 * Compute the next send datetime for a scheduled report.
 * Returns a Date representing the next scheduled delivery.
 */
function nextSendDate(r: ScheduledReport): Date {
	const now = new Date();
	const candidate = new Date(now);
	// set to today at delivery hour UTC
	candidate.setUTCHours(r.delivery_hour, 0, 0, 0);

	if (r.schedule === 'daily') {
		if (candidate <= now) candidate.setUTCDate(candidate.getUTCDate() + 1);
		return candidate;
	}

	if (r.schedule === 'weekly') {
		const targetDay = r.day_of_week ?? 0; // 0=Mon … 6=Sun
		// JS getDay(): 0=Sun,1=Mon… convert to Mon-based: (getDay()+6)%7
		const todayMon = (now.getUTCDay() + 6) % 7;
		let daysAhead = (targetDay - todayMon + 7) % 7;
		if (daysAhead === 0 && candidate <= now) daysAhead = 7;
		candidate.setUTCDate(candidate.getUTCDate() + daysAhead);
		return candidate;
	}

	// monthly — 1st of next month (or this month if not yet passed)
	candidate.setUTCDate(1);
	if (candidate <= now) {
		candidate.setUTCMonth(candidate.getUTCMonth() + 1);
		candidate.setUTCDate(1);
	}
	return candidate;
}

function formatNextSend(r: ScheduledReport): string {
	const next = nextSendDate(r);
	const diff = next.getTime() - Date.now();
	const hours = Math.floor(diff / 3_600_000);
	if (hours < 1) return 'In < 1h';
	if (hours < 24) return `In ${hours}h`;
	const days = Math.floor(hours / 24);
	return `In ${days}d`;
}

// ---------------------------------------------------------------------------
// Create / Edit Dialog
// ---------------------------------------------------------------------------

interface ReportDialogProps {
	open: boolean;
	initial?: ScheduledReport | null;
	onClose: () => void;
}

function ReportDialog({ open, initial, onClose }: ReportDialogProps) {
	const isEdit = !!initial;
	const create = useCreateScheduledReport();
	const update = useUpdateScheduledReport();

	const [name, setName] = useState(initial?.name ?? '');
	const [reportType, setReportType] = useState<ReportType>(
		initial?.report_type ?? 'document_summary',
	);
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
			setError(err instanceof Error ? err.message : 'Request failed');
		}
	}

	return (
		<Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
			<DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
				<DialogHeader>
					<DialogTitle>
						{isEdit ? 'Edit Scheduled Report' : 'New Scheduled Report'}
					</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-1">
						<Label htmlFor="sr-name">Name</Label>
						<Input
							id="sr-name"
							required
							placeholder="e.g. Weekly OCR Quality Report"
							value={name}
							onChange={e => setName(e.target.value)}
						/>
					</div>

					<div className="space-y-1">
						<Label>Report Type</Label>
						<Select value={reportType} onValueChange={v => setReportType(v as ReportType)}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{(Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map(t => (
									<SelectItem key={t} value={t}>
										{REPORT_TYPE_LABELS[t]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1">
						<Label>Schedule</Label>
						<div className="flex gap-2">
							{(['daily', 'weekly', 'monthly'] as ReportSchedule[]).map(s => (
								<Button
									key={s}
									type="button"
									size="sm"
									variant={schedule === s ? 'default' : 'outline'}
									className="flex-1"
									onClick={() => setSchedule(s)}
								>
									{SCHEDULE_LABELS[s]}
								</Button>
							))}
						</div>
					</div>

					{schedule === 'weekly' && (
						<div className="space-y-1">
							<Label>Day of Week</Label>
							<Select
								value={String(dayOfWeek)}
								onValueChange={v => setDayOfWeek(Number(v))}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{DAY_NAMES.map((d, i) => (
										<SelectItem key={i} value={String(i)}>
											{d}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					)}

					<div className="space-y-1">
						<Label>Delivery Time (UTC)</Label>
						<Select
							value={String(deliveryHour)}
							onValueChange={v => setDeliveryHour(Number(v))}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{HOURS.map(h => (
									<SelectItem key={h} value={String(h)}>
										{formatHour(h)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="space-y-1">
						<Label htmlFor="sr-recipients">
							Recipients{' '}
							<span className="text-xs font-normal text-muted-foreground">
								(comma-separated emails)
							</span>
						</Label>
						<Textarea
							id="sr-recipients"
							required
							rows={2}
							placeholder="alice@example.com, bob@example.com"
							value={recipients}
							onChange={e => setRecipients(e.target.value)}
						/>
					</div>

					<div className="space-y-1">
						<Label>Format</Label>
						<div className="flex gap-2">
							{(['csv', 'xlsx'] as ReportFormat[]).map(f => (
								<Button
									key={f}
									type="button"
									size="sm"
									variant={format === f ? 'default' : 'outline'}
									className="flex-1 uppercase"
									onClick={() => setFormat(f)}
								>
									{f}
								</Button>
							))}
						</div>
					</div>

					{error && (
						<p className="rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
							{error}
						</p>
					)}

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={busy}>
							{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
							{isEdit ? 'Save Changes' : 'Create Report'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

// ---------------------------------------------------------------------------
// Report History Panel
// ---------------------------------------------------------------------------

function ReportHistory({ reports }: { reports: ScheduledReport[] }) {
	const sent = reports
		.filter(r => r.last_sent_at && r.send_count > 0)
		.sort((a, b) => (b.last_sent_at! > a.last_sent_at! ? 1 : -1))
		.slice(0, 5);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2 text-base">
					<Clock className="h-4 w-4 text-muted-foreground" />
					Delivery History
					<span className="ml-auto text-xs font-normal text-muted-foreground">
						Last send per report
					</span>
				</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				{sent.length === 0 ? (
					<p className="px-6 py-4 text-sm text-muted-foreground">
						No reports have been sent yet. Use "Run Now" or wait for the schedule.
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Report</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Last Sent</TableHead>
								<TableHead>Recipients</TableHead>
								<TableHead>Total Sends</TableHead>
								<TableHead>Result</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{sent.map(r => (
								<TableRow key={r.id}>
									<TableCell className="font-medium">{r.name}</TableCell>
									<TableCell>
										<Badge variant={REPORT_TYPE_VARIANTS[r.report_type]} className="text-xs">
											{REPORT_TYPE_LABELS[r.report_type]}
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{formatDate(r.last_sent_at)}
									</TableCell>
									<TableCell
										className="max-w-[180px] truncate text-sm text-muted-foreground"
										title={r.recipients}
									>
										{r.recipients}
									</TableCell>
									<TableCell className="text-sm">{r.send_count}</TableCell>
									<TableCell>
										<span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
											<CheckCircle2 className="h-3 w-3" />
											Delivered
										</span>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
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
	const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);

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
		setConfirmDialog({
			message: `Delete scheduled report "${r.name}"?`,
			onConfirm: () => deleteReport.mutate(r.id),
		});
	}

	async function handleSendNow(r: ScheduledReport) {
		setSendingId(r.id);
		try {
			const result = await sendNow.mutateAsync(r.id);
			setToastMsg(`Sent to ${result.recipients.join(', ')}`);
		} catch {
			setToastMsg('Delivery failed — check server logs');
		} finally {
			setSendingId(null);
			setTimeout(() => setToastMsg(null), 4000);
		}
	}

	return (
		<div className="space-y-6 p-6">
			{/* Toast */}
			{toastMsg && (
				<div className="fixed bottom-6 right-6 z-50 rounded-lg border bg-background px-4 py-3 text-sm shadow-xl">
					{toastMsg}
				</div>
			)}

			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Scheduled Reports</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Configure recurring analytics reports delivered by email.
					</p>
				</div>
				<Button onClick={openCreate}>
					<Plus className="mr-2 h-4 w-4" />
					New Scheduled Report
				</Button>
			</div>

			{/* Loading */}
			{isLoading && (
				<div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
					<Loader2 className="h-5 w-5 animate-spin" />
					Loading…
				</div>
			)}

			{/* Error */}
			{error && (
				<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
					Failed to load scheduled reports.
				</div>
			)}

			{/* Empty state */}
			{!isLoading && !error && reports.length === 0 && (
				<div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
					<FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
					<p className="text-muted-foreground">No scheduled reports yet.</p>
					<Button className="mt-4" onClick={openCreate}>
						Create your first report
					</Button>
				</div>
			)}

			{/* Reports table */}
			{!isLoading && reports.length > 0 && (
				<div className="overflow-hidden rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Type</TableHead>
								<TableHead>Schedule</TableHead>
								<TableHead>Recipients</TableHead>
								<TableHead>Format</TableHead>
								<TableHead>Last Sent</TableHead>
								<TableHead>Next Send</TableHead>
								<TableHead>Active</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{reports.map(r => (
								<TableRow key={r.id}>
									<TableCell className="font-medium">{r.name}</TableCell>

									<TableCell>
										<Badge variant={REPORT_TYPE_VARIANTS[r.report_type]} className="text-xs">
											{REPORT_TYPE_LABELS[r.report_type]}
										</Badge>
									</TableCell>

									<TableCell className="text-sm text-muted-foreground">
										{scheduleDescription(r)}
									</TableCell>

									<TableCell
										className="max-w-[160px] truncate text-sm text-muted-foreground"
										title={r.recipients}
									>
										{r.recipients}
									</TableCell>

									<TableCell>
										<span className="rounded border bg-muted px-2 py-0.5 font-mono text-xs uppercase">
											{r.format}
										</span>
									</TableCell>

									<TableCell className="text-sm text-muted-foreground">
										{formatDate(r.last_sent_at)}
										{r.send_count > 0 && (
											<span className="ml-1 text-xs text-muted-foreground/60">
												({r.send_count}×)
											</span>
										)}
									</TableCell>

									<TableCell>
										{r.is_active ? (
											<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
												<CalendarClock className="h-3 w-3" />
												{formatNextSend(r)}
											</span>
										) : (
											<span className="text-xs text-muted-foreground">Paused</span>
										)}
									</TableCell>

									<TableCell>
										<Switch
											checked={r.is_active}
											onCheckedChange={() => handleToggle(r)}
											disabled={toggleActive.isPending}
										/>
									</TableCell>

									<TableCell>
										<div className="flex items-center justify-end gap-1">
											<Button
												size="icon"
												variant="ghost"
												onClick={() => handleSendNow(r)}
												disabled={sendingId === r.id}
												title="Send now"
											>
												{sendingId === r.id
													? <Loader2 className="h-4 w-4 animate-spin" />
													: <Send className="h-4 w-4" />}
											</Button>
											<Button
												size="icon"
												variant="ghost"
												onClick={() => openEdit(r)}
												title="Edit"
											>
												<Pencil className="h-4 w-4" />
											</Button>
											<Button
												size="icon"
												variant="ghost"
												className="text-destructive hover:text-destructive"
												onClick={() => handleDelete(r)}
												title="Delete"
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</div>
			)}

			{/* Delivery history */}
			{!isLoading && reports.length > 0 && <ReportHistory reports={reports} />}

			{/* Create / edit dialog */}
			<ReportDialog open={dialogOpen} initial={editTarget} onClose={closeDialog} />
			<AlertDialog open={!!confirmDialog} onOpenChange={() => setConfirmDialog(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Confirm</AlertDialogTitle>
						<AlertDialogDescription>{confirmDialog?.message}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => { confirmDialog?.onConfirm(); setConfirmDialog(null); }}
							className="bg-red-600 hover:bg-red-700"
						>
							Confirm
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}

export default ScheduledReportsPage;
