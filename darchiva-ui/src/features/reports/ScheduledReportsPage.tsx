// (c) Copyright Datacraft, 2026.
import { useState } from 'react';
import { CalendarClock, Eye, FileSpreadsheet, Plus, Send, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

type ReportType = 'Activity Summary' | 'Exception Report' | 'Quality Report' | 'Ingestion Summary' | 'Audit Report';
type Schedule = 'daily' | 'weekly' | 'monthly';
type Format = 'PDF' | 'CSV' | 'Excel';
type DeliveryStatus = 'sent' | 'failed' | 'bounced';

interface ScheduledReportRow {
	name: string;
	type: ReportType;
	schedule: Schedule;
	recipients: string[];
	lastSent: string;
	format: Format;
}

interface DeliveryHistoryRow {
	id: string;
	report: string;
	status: DeliveryStatus;
	recipients: number;
	timestamp: string;
	message: string;
}

const reports: ScheduledReportRow[] = [
	{ name: 'Daily Archive Activity', type: 'Activity Summary', schedule: 'daily', recipients: ['records@datacraft.co.ke', 'ops@datacraft.co.ke'], lastSent: '2026-07-05 06:00', format: 'PDF' },
	{ name: 'Weekly Quality Exceptions', type: 'Quality Report', schedule: 'weekly', recipients: ['qc@datacraft.co.ke'], lastSent: '2026-07-01 08:00', format: 'Excel' },
	{ name: 'Monthly Audit Evidence', type: 'Audit Report', schedule: 'monthly', recipients: ['audit@datacraft.co.ke', 'ciso@datacraft.co.ke'], lastSent: '2026-07-01 05:30', format: 'PDF' },
	{ name: 'Ingestion Source Health', type: 'Ingestion Summary', schedule: 'daily', recipients: ['platform@datacraft.co.ke'], lastSent: '2026-07-05 07:30', format: 'CSV' },
];

const deliveryHistory: DeliveryHistoryRow[] = [
	{ id: 'DEL-7751', report: 'Daily Archive Activity', status: 'sent', recipients: 2, timestamp: '2026-07-05 06:00', message: 'Delivered in 3.2s' },
	{ id: 'DEL-7744', report: 'Ingestion Source Health', status: 'sent', recipients: 1, timestamp: '2026-07-05 07:30', message: 'CSV attached' },
	{ id: 'DEL-7738', report: 'Weekly Quality Exceptions', status: 'bounced', recipients: 1, timestamp: '2026-07-01 08:00', message: 'qc-archive mailbox rejected attachment' },
	{ id: 'DEL-7712', report: 'Monthly Audit Evidence', status: 'failed', recipients: 2, timestamp: '2026-07-01 05:30', message: 'Temporary report renderer timeout' },
];

const reportTemplates: ReportType[] = ['Activity Summary', 'Exception Report', 'Quality Report', 'Ingestion Summary', 'Audit Report'];
const statusClass: Record<DeliveryStatus, string> = {
	sent: 'bg-emerald-500/10 text-emerald-400',
	failed: 'bg-red-500/10 text-red-400',
	bounced: 'bg-amber-500/10 text-amber-400',
};

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
	return (
		<section className={cn('rounded-xl border border-slate-800/50 bg-slate-900 p-5', className)}>
			<h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">{title}</h2>
			{children}
		</section>
	);
}

export function ScheduledReportsPage() {
	const [template, setTemplate] = useState<ReportType>('Activity Summary');
	const [schedule, setSchedule] = useState<Schedule>('weekly');
	const [format, setFormat] = useState<Format>('PDF');
	const [recipients, setRecipients] = useState('records@datacraft.co.ke, ops@datacraft.co.ke');

	return (
		<div className="min-h-screen bg-slate-950 p-6 text-slate-100">
			<div className="mx-auto max-w-[1450px] space-y-6">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="flex items-center gap-2 text-sm font-medium text-brass-500">
							<CalendarClock className="h-4 w-4" />
							Report scheduling
						</div>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight">Scheduled Reports</h1>
						<p className="mt-2 text-sm text-slate-400">Recurring operational reports, templates, recipients, preview/send actions, and delivery history.</p>
					</div>
					<button type="button" className="inline-flex items-center gap-2 rounded-xl bg-brass-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brass-400">
						<Plus className="h-4 w-4" />
						Schedule new report
					</button>
				</header>

				<Panel title="Report List">
					<div className="overflow-hidden rounded-xl border border-slate-800/50">
						<table className="w-full text-sm">
							<thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-4 py-3 text-left">Name</th>
									<th className="px-4 py-3 text-left">Type</th>
									<th className="px-4 py-3 text-left">Schedule</th>
									<th className="px-4 py-3 text-left">Recipients</th>
									<th className="px-4 py-3 text-left">Last Sent</th>
									<th className="px-4 py-3 text-left">Format</th>
									<th className="px-4 py-3 text-left">Actions</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-800/50">
								{reports.map((report) => (
									<tr key={report.name}>
										<td className="px-4 py-3 font-medium text-slate-100">{report.name}</td>
										<td className="px-4 py-3 text-slate-300">{report.type}</td>
										<td className="px-4 py-3 capitalize text-slate-300">{report.schedule}</td>
										<td className="px-4 py-3 text-slate-400">{report.recipients.length} recipients</td>
										<td className="px-4 py-3 text-slate-500">{report.lastSent}</td>
										<td className="px-4 py-3"><span className="rounded-full bg-slate-800 px-2 py-1 text-xs text-brass-300">{report.format}</span></td>
										<td className="px-4 py-3">
											<div className="flex gap-2">
												<button type="button" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-brass-500/70" title="Preview report"><Eye className="h-4 w-4" /></button>
												<button type="button" className="rounded-lg border border-slate-700 p-2 text-slate-300 hover:border-brass-500/70" title="Send now"><Send className="h-4 w-4" /></button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Panel>

				<div className="grid gap-6 xl:grid-cols-[440px_1fr]">
					<Panel title="Schedule New Report">
						<div className="space-y-4">
							<label className="block text-sm text-slate-400">
								Report template
								<select value={template} onChange={(event) => setTemplate(event.target.value as ReportType)} className="mt-2 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-brass-500/70">
									{reportTemplates.map((item) => <option key={item}>{item}</option>)}
								</select>
							</label>
							<div>
								<p className="mb-2 text-sm text-slate-400">Schedule</p>
								<div className="grid grid-cols-3 gap-2">
									{(['daily', 'weekly', 'monthly'] as Schedule[]).map((item) => (
										<button key={item} type="button" onClick={() => setSchedule(item)} className={cn('rounded-lg border px-3 py-2 text-sm capitalize', schedule === item ? 'border-brass-500 bg-brass-500/10 text-brass-300' : 'border-slate-800 text-slate-400')}>{item}</button>
									))}
								</div>
							</div>
							<label className="block text-sm text-slate-400">
								Recipients
								<textarea value={recipients} onChange={(event) => setRecipients(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-sm text-slate-100 outline-none focus:border-brass-500/70" />
							</label>
							<div>
								<p className="mb-2 text-sm text-slate-400">Format</p>
								<div className="grid grid-cols-3 gap-2">
									{(['PDF', 'CSV', 'Excel'] as Format[]).map((item) => (
										<button key={item} type="button" onClick={() => setFormat(item)} className={cn('rounded-lg border px-3 py-2 text-sm', format === item ? 'border-brass-500 bg-brass-500/10 text-brass-300' : 'border-slate-800 text-slate-400')}>{item}</button>
									))}
								</div>
							</div>
							<div className="flex gap-2 pt-2">
								<button type="button" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:border-brass-500/70"><Eye className="h-4 w-4" />Preview</button>
								<button type="button" className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brass-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brass-400"><Send className="h-4 w-4" />Send now</button>
							</div>
						</div>
					</Panel>

					<Panel title="Report Templates">
						<div className="grid gap-4 md:grid-cols-2">
							{reportTemplates.map((item) => (
								<div key={item} className={cn('rounded-xl border p-4', template === item ? 'border-brass-500/60 bg-brass-500/10' : 'border-slate-800 bg-slate-950/60')}>
									<div className="flex items-start gap-3">
										<div className="rounded-lg bg-slate-800 p-2 text-brass-500"><FileSpreadsheet className="h-5 w-5" /></div>
										<div>
											<p className="font-medium text-slate-100">{item}</p>
											<p className="mt-1 text-sm text-slate-400">{item} with document counts, trends, exceptions, and owner-ready summary tables.</p>
										</div>
									</div>
								</div>
							))}
						</div>
					</Panel>
				</div>

				<Panel title="Delivery History">
					<div className="space-y-3">
						{deliveryHistory.map((row) => (
							<div key={row.id} className="grid gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 md:grid-cols-[140px_1fr_auto] md:items-center">
								<div>
									<p className="font-mono text-sm text-brass-300">{row.id}</p>
									<p className="mt-1 text-xs text-slate-500">{row.timestamp}</p>
								</div>
								<div>
									<p className="font-medium text-slate-100">{row.report}</p>
									<p className="mt-1 text-sm text-slate-400">{row.message}</p>
								</div>
								<div className="flex items-center gap-3">
									<span className="inline-flex items-center gap-1 text-xs text-slate-500"><Users className="h-3.5 w-3.5" />{row.recipients}</span>
									<span className={cn('rounded-full px-2 py-1 text-xs font-medium', statusClass[row.status])}>{row.status}</span>
								</div>
							</div>
						))}
					</div>
				</Panel>
			</div>
		</div>
	);
}

export default ScheduledReportsPage;
