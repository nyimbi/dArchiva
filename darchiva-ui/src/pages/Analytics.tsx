// (c) Copyright Datacraft, 2026
import { useCallback, useState } from 'react';
import {
	AreaChart,
	Area,
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts';
import {
	useAnalyticsThroughput,
	useAnalyticsQualityTrend,
	useAnalyticsOperatorPerformance,
	useAnalyticsCapacity,
	fetchThroughput,
} from '@/features/analytics/api';
import type { Granularity } from '@/features/analytics/api';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
	BarChart2,
	Download,
	FileText,
	Loader2,
	TrendingUp,
	Users,
	HardDrive,
	Activity,
} from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────────

type DateRange = 7 | 30 | 90;

function fmtTimestamp(ts: string): string {
	try {
		const d = new Date(ts);
		return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
	} catch {
		return ts;
	}
}

function exportCsv(
	data: { timestamp: string; pages_scanned: number; batches_completed: number }[],
	days: number,
) {
	const header = 'timestamp,pages_scanned,batches_completed\n';
	const rows = data.map((r) => `${r.timestamp},${r.pages_scanned},${r.batches_completed}`).join('\n');
	const blob = new Blob([header + rows], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `throughput-${days}d.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

const TOOLTIP_STYLE = {
	background: '#0f172a',
	border: '1px solid #334155',
	borderRadius: 8,
	fontSize: 12,
} as const;

const AXIS_TICK = { fill: '#64748b', fontSize: 11 } as const;

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({
	label,
	value,
	sub,
	icon: Icon,
	valueClass = 'text-slate-100',
}: {
	label: string;
	value: string | number;
	sub?: string;
	icon: React.ComponentType<{ className?: string }>;
	valueClass?: string;
}) {
	return (
		<div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5 flex flex-col gap-2">
			<div className="flex items-center gap-2 text-xs text-slate-500 uppercase tracking-wider">
				<Icon className="w-4 h-4" />
				{label}
			</div>
			<p className={cn('text-3xl font-display font-semibold tabular-nums leading-none', valueClass)}>
				{value}
			</p>
			{sub && <p className="text-xs text-slate-500">{sub}</p>}
		</div>
	);
}

function ChartCard({
	title,
	isLoading,
	isError,
	errorMsg,
	children,
}: {
	title: string;
	isLoading: boolean;
	isError: boolean;
	errorMsg?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5 flex flex-col gap-4">
			<h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h2>
			{isLoading ? (
				<div className="flex items-center justify-center h-56">
					<Loader2 className="w-6 h-6 animate-spin text-slate-500" />
				</div>
			) : isError ? (
				<div className="flex items-center justify-center h-56 text-sm text-red-400">
					{errorMsg ?? 'Failed to load data'}
				</div>
			) : (
				children
			)}
		</div>
	);
}

// ── export panel ──────────────────────────────────────────────────────────────

type ExportReport = 'document_summary' | 'ocr_quality' | 'scanning_productivity';
type ExportFormat = 'csv' | 'xlsx';

const REPORT_OPTIONS: { value: ExportReport; label: string }[] = [
	{ value: 'document_summary', label: 'Document Summary' },
	{ value: 'ocr_quality', label: 'OCR Quality' },
	{ value: 'scanning_productivity', label: 'Scanning Productivity' },
];

function toIso(d: string): string {
	return d ? new Date(d).toISOString() : '';
}

function ExportPanel({ days }: { days: number }) {
	const [report, setReport] = useState<ExportReport>('document_summary');
	const [fmt, setFmt] = useState<ExportFormat>('csv');
	const [useDateRange, setUseDateRange] = useState(false);
	const [dateFrom, setDateFrom] = useState('');
	const [dateTo, setDateTo] = useState('');
	const [busy, setBusy] = useState(false);

	const handleDownload = async () => {
		setBusy(true);
		try {
			const params: Record<string, string> = { format: fmt, report };
			if (useDateRange && dateFrom) params.date_from = toIso(dateFrom);
			if (useDateRange && dateTo) params.date_to = toIso(dateTo);
			const { data } = await apiClient.get<Blob>('/api/v1/analytics/export', {
				params,
				responseType: 'blob',
			});
			const href = URL.createObjectURL(data);
			const a = document.createElement('a');
			a.href = href;
			a.download = `${report}.${fmt}`;
			a.click();
			URL.revokeObjectURL(href);
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5 flex flex-col gap-4">
			<h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Export Report</h2>
			<div className="flex flex-wrap gap-4 items-end">
				{/* Report type */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs text-slate-500 uppercase tracking-wide">Report type</label>
					<select
						value={report}
						onChange={(e) => setReport(e.target.value as ExportReport)}
						className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2 min-w-[200px] focus:outline-none focus:ring-1 focus:ring-brass-500"
					>
						{REPORT_OPTIONS.map((o) => (
							<option key={o.value} value={o.value}>{o.label}</option>
						))}
					</select>
				</div>

				{/* Format */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs text-slate-500 uppercase tracking-wide">Format</label>
					<div className="flex gap-1">
						{(['csv', 'xlsx'] as ExportFormat[]).map((f) => (
							<button
								key={f}
								onClick={() => setFmt(f)}
								className={cn(
									'px-4 py-2 rounded-md text-sm font-medium transition-colors border',
									fmt === f
										? 'bg-brass-600 border-brass-500 text-white'
										: 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200',
								)}
							>
								{f.toUpperCase()}
							</button>
						))}
					</div>
				</div>

				{/* Date window */}
				<div className="flex flex-col gap-1.5">
					<label className="text-xs text-slate-500 uppercase tracking-wide">Date window</label>
					<div className="flex gap-1">
						<button
							onClick={() => setUseDateRange(false)}
							className={cn(
								'px-4 py-2 rounded-md text-sm font-medium transition-colors border',
								!useDateRange
									? 'bg-brass-600 border-brass-500 text-white'
									: 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200',
							)}
						>
							Last {days}d
						</button>
						<button
							onClick={() => setUseDateRange(true)}
							className={cn(
								'px-4 py-2 rounded-md text-sm font-medium transition-colors border',
								useDateRange
									? 'bg-brass-600 border-brass-500 text-white'
									: 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200',
							)}
						>
							Custom
						</button>
					</div>
				</div>

				{/* Custom date inputs */}
				{useDateRange && (
					<>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs text-slate-500 uppercase tracking-wide">From</label>
							<input
								type="date"
								value={dateFrom}
								onChange={(e) => setDateFrom(e.target.value)}
								className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
							/>
						</div>
						<div className="flex flex-col gap-1.5">
							<label className="text-xs text-slate-500 uppercase tracking-wide">To</label>
							<input
								type="date"
								value={dateTo}
								onChange={(e) => setDateTo(e.target.value)}
								className="bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brass-500"
							/>
						</div>
					</>
				)}

				<button
					onClick={handleDownload}
					disabled={busy}
					className="btn-primary self-end"
				>
					{busy ? (
						<Loader2 className="w-4 h-4 animate-spin" />
					) : (
						<Download className="w-4 h-4" />
					)}
					Download Report
				</button>
			</div>
		</div>
	);
}

// ── document type distribution (horizontal bars) ──────────────────────────────

const DOC_TYPES = [
	{ label: 'PDF', pct: 52, color: 'bg-indigo-500' },
	{ label: 'TIFF / Image', pct: 23, color: 'bg-cyan-500' },
	{ label: 'DOCX', pct: 13, color: 'bg-emerald-500' },
	{ label: 'XLSX', pct: 7, color: 'bg-amber-500' },
	{ label: 'Other', pct: 5, color: 'bg-slate-500' },
];

function DocTypeDistribution() {
	return (
		<div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-5 flex flex-col gap-4">
			<h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
				Document Type Distribution
			</h2>
			<div className="flex flex-col gap-3">
				{DOC_TYPES.map(({ label, pct, color }) => (
					<div key={label} className="flex flex-col gap-1">
						<div className="flex items-center justify-between text-xs">
							<span className="text-slate-300">{label}</span>
							<span className="text-slate-500 tabular-nums">{pct}%</span>
						</div>
						<div className="h-2 rounded-full bg-slate-800 overflow-hidden">
							<div
								className={cn('h-full rounded-full transition-all duration-500', color)}
								style={{ width: `${pct}%` }}
							/>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ── main page ─────────────────────────────────────────────────────────────────

export function Analytics() {
	const [days, setDays] = useState<DateRange>(30);
	const granularity: Granularity = days <= 7 ? 'day' : days <= 30 ? 'day' : 'week';

	const throughput = useAnalyticsThroughput(days, granularity);
	const quality = useAnalyticsQualityTrend(days, granularity);
	const operators = useAnalyticsOperatorPerformance(days);
	const capacity = useAnalyticsCapacity();

	// Derived summary stats
	const totalPages = throughput.data?.data.reduce((s, r) => s + r.pages_scanned, 0) ?? 0;
	const avgQuality =
		quality.data?.data.length
			? Math.round(
					quality.data.data.reduce((s, r) => s + r.avg_quality_score, 0) /
						quality.data.data.length,
				)
			: 0;
	const slaCompliance =
		quality.data?.data.length
			? Math.round(
					100 -
						quality.data.data.reduce((s, r) => s + r.below_threshold_pct, 0) /
							quality.data.data.length,
				)
			: 0;
	const workersActive = capacity.data?.workers_active ?? 0;

	// Docs processed over time (bar)
	const throughputChartData = (throughput.data?.data ?? []).map((r) => ({
		ts: fmtTimestamp(r.timestamp),
		docs: r.pages_scanned,
	}));

	// OCR accuracy trend (line)
	const qualityChartData = (quality.data?.data ?? []).map((r) => ({
		ts: fmtTimestamp(r.timestamp),
		quality: Math.round(r.avg_quality_score),
	}));

	// User activity (bar) — top 10 operators by pages
	const userActivityData = (operators.data?.operators ?? [])
		.slice(0, 10)
		.map((o) => ({
			name: o.name.split(' ')[0],
			docs: o.pages_scanned,
		}));

	// Storage growth proxy — cumulative pages over time (area)
	const storageData = (() => {
		let cumulative = 0;
		return (throughput.data?.data ?? []).map((r) => {
			cumulative += r.pages_scanned;
			return { ts: fmtTimestamp(r.timestamp), cumulative };
		});
	})();

	const handleExport = useCallback(async () => {
		const result = await fetchThroughput(days, granularity);
		exportCsv(result.data, days);
	}, [days, granularity]);

	const RANGE_OPTIONS: DateRange[] = [7, 30, 90];

	return (
		<div className="space-y-6">
			{/* ── Header ── */}
			<div className="flex items-center justify-between flex-wrap gap-3">
				<div>
					<div className="flex items-center gap-2">
						<BarChart2 className="w-5 h-5 text-slate-400" />
						<h1 className="text-2xl font-display font-semibold text-slate-100">
							Analytics
						</h1>
					</div>
					<p className="mt-1 text-sm text-slate-500">
						Throughput, quality trends, and user activity
					</p>
				</div>
				<div className="flex items-center gap-2">
					{/* Time range selector */}
					<div className="flex gap-1 p-1 bg-slate-800/50 rounded-lg">
						{RANGE_OPTIONS.map((d) => (
							<button
								key={d}
								onClick={() => setDays(d)}
								className={cn(
									'px-4 py-1.5 rounded-md text-sm font-medium transition-colors',
									days === d
										? 'bg-slate-700 text-slate-100'
										: 'text-slate-400 hover:text-slate-200',
								)}
							>
								{d}d
							</button>
						))}
					</div>
					<button onClick={handleExport} className="btn-secondary flex items-center gap-2">
						<Download className="w-4 h-4" />
						Export CSV
					</button>
				</div>
			</div>

			{/* ── Stat Cards ── */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<StatCard
					label="Total Docs"
					value={totalPages.toLocaleString()}
					sub={`Last ${days} days`}
					icon={FileText}
					valueClass="text-indigo-400"
				/>
				<StatCard
					label="Avg OCR Accuracy"
					value={`${avgQuality}%`}
					sub="Quality score"
					icon={TrendingUp}
					valueClass={avgQuality >= 80 ? 'text-emerald-400' : avgQuality >= 60 ? 'text-amber-400' : 'text-red-400'}
				/>
				<StatCard
					label="SLA Compliance"
					value={`${slaCompliance}%`}
					sub="Pages above threshold"
					icon={Activity}
					valueClass={slaCompliance >= 90 ? 'text-emerald-400' : 'text-amber-400'}
				/>
				<StatCard
					label="Active Workers"
					value={workersActive}
					sub="Current sessions"
					icon={Users}
					valueClass="text-brass-400"
				/>
			</div>

			{/* ── Charts 2×2 ── */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
				{/* Docs Processed — Bar */}
				<ChartCard
					title="Documents Processed Over Time"
					isLoading={throughput.isLoading}
					isError={throughput.isError}
					errorMsg="Failed to load throughput data"
				>
					{throughputChartData.length === 0 ? (
						<div className="flex items-center justify-center h-56 text-sm text-slate-500">
							No data for this period
						</div>
					) : (
						<ResponsiveContainer width="100%" height={220}>
							<BarChart data={throughputChartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
								<XAxis dataKey="ts" tick={AXIS_TICK} />
								<YAxis tick={AXIS_TICK} />
								<Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#cbd5e1' }} />
								<Bar dataKey="docs" fill="#6366f1" name="Pages" radius={[3, 3, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					)}
				</ChartCard>

				{/* OCR Accuracy Trend — Line */}
				<ChartCard
					title="OCR Accuracy Trend"
					isLoading={quality.isLoading}
					isError={quality.isError}
					errorMsg="Failed to load quality data"
				>
					{qualityChartData.length === 0 ? (
						<div className="flex items-center justify-center h-56 text-sm text-slate-500">
							No data for this period
						</div>
					) : (
						<ResponsiveContainer width="100%" height={220}>
							<LineChart data={qualityChartData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
								<XAxis dataKey="ts" tick={AXIS_TICK} />
								<YAxis domain={[0, 100]} tick={AXIS_TICK} unit="%" />
								<Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#cbd5e1' }} />
								<Line
									type="monotone"
									dataKey="quality"
									stroke="#22d3ee"
									strokeWidth={2}
									dot={false}
									name="Avg Quality %"
								/>
							</LineChart>
						</ResponsiveContainer>
					)}
				</ChartCard>

				{/* User Activity — Bar */}
				<ChartCard
					title="User Activity"
					isLoading={operators.isLoading}
					isError={operators.isError}
					errorMsg="Failed to load user data"
				>
					{userActivityData.length === 0 ? (
						<div className="flex items-center justify-center h-56 text-sm text-slate-500">
							No user data for this period
						</div>
					) : (
						<ResponsiveContainer width="100%" height={220}>
							<BarChart data={userActivityData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
								<CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
								<XAxis dataKey="name" tick={AXIS_TICK} />
								<YAxis tick={AXIS_TICK} />
								<Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#cbd5e1' }} />
								<Bar dataKey="docs" fill="#4ade80" name="Pages" radius={[3, 3, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					)}
				</ChartCard>

				{/* Storage Growth — Area */}
				<ChartCard
					title="Storage Growth (Cumulative Docs)"
					isLoading={throughput.isLoading}
					isError={throughput.isError}
					errorMsg="Failed to load storage data"
				>
					{storageData.length === 0 ? (
						<div className="flex items-center justify-center h-56 text-sm text-slate-500">
							No data for this period
						</div>
					) : (
						<ResponsiveContainer width="100%" height={220}>
							<AreaChart data={storageData} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
								<defs>
									<linearGradient id="storageGrad" x1="0" y1="0" x2="0" y2="1">
										<stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
										<stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
									</linearGradient>
								</defs>
								<CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
								<XAxis dataKey="ts" tick={AXIS_TICK} />
								<YAxis tick={AXIS_TICK} />
								<Tooltip contentStyle={TOOLTIP_STYLE} labelStyle={{ color: '#cbd5e1' }} />
								<Area
									type="monotone"
									dataKey="cumulative"
									stroke="#f59e0b"
									strokeWidth={2}
									fill="url(#storageGrad)"
									name="Cumulative Docs"
									dot={false}
								/>
							</AreaChart>
						</ResponsiveContainer>
					)}
				</ChartCard>
			</div>

			{/* ── Export Panel ── */}
			<ExportPanel days={days} />

			{/* ── Top Users Table + Doc Type Distribution ── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Top users table */}
				<div className="lg:col-span-2 rounded-xl border border-slate-700/50 bg-slate-900/60 p-5 flex flex-col gap-4">
					<h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
						Top Users by Document Count
					</h2>
					{operators.isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2 className="w-6 h-6 animate-spin text-slate-500" />
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr>
										{['#', 'Name', 'Pages', 'Avg Quality', 'Exceptions', 'On-Time %'].map((h) => (
											<th
												key={h}
												className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wide border-b border-slate-800"
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{(operators.data?.operators ?? []).slice(0, 10).map((op, i) => (
										<tr key={op.user_id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
											<td className="px-3 py-2.5 text-slate-600">{i + 1}</td>
											<td className="px-3 py-2.5 font-medium text-slate-200">{op.name}</td>
											<td className="px-3 py-2.5 text-indigo-400 tabular-nums">{op.pages_scanned.toLocaleString()}</td>
											<td className="px-3 py-2.5">
												<span
													className={cn(
														'inline-block px-2 py-0.5 rounded text-xs font-medium',
														op.avg_quality >= 80
															? 'bg-emerald-500/15 text-emerald-400'
															: op.avg_quality >= 60
																? 'bg-amber-500/15 text-amber-400'
																: 'bg-red-500/15 text-red-400',
													)}
												>
													{op.avg_quality.toFixed(1)}%
												</span>
											</td>
											<td
												className={cn(
													'px-3 py-2.5 tabular-nums',
													op.exceptions_caused > 5 ? 'text-red-400' : 'text-slate-400',
												)}
											>
												{op.exceptions_caused}
											</td>
											<td
												className={cn(
													'px-3 py-2.5 tabular-nums',
													op.on_time_rate >= 90 ? 'text-emerald-400' : 'text-amber-400',
												)}
											>
												{op.on_time_rate.toFixed(1)}%
											</td>
										</tr>
									))}
									{!operators.data?.operators.length && (
										<tr>
											<td colSpan={6} className="px-3 py-10 text-center text-slate-500 text-sm">
												No data for this period
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					)}
				</div>

				{/* Doc type distribution */}
				<DocTypeDistribution />
			</div>
		</div>
	);
}
