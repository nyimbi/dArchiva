// (c) Copyright Datacraft, 2026
import { useMemo, useState } from 'react';
import {
	Activity,
	AlertTriangle,
	CalendarDays,
	Download,
	FileText,
	Gauge,
	TrendingDown,
	TrendingUp,
	Upload,
} from 'lucide-react';
import {
	Area,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	ComposedChart,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';

type DatePreset = '7d' | '30d' | '90d' | 'custom';
type TrendDirection = 'up' | 'down' | 'flat';

interface KpiMetric {
	label: string;
	value: string;
	detail: string;
	trend: number;
	direction: TrendDirection;
	goodDirection: 'up' | 'down';
	icon: React.ComponentType<{ className?: string }>;
}

interface PipelinePoint {
	date: string;
	ingested: number;
	processed: number;
	exceptions: number;
}

interface DocumentTypeSlice {
	name: string;
	count: number;
	color: string;
}

interface SourceBreakdown {
	source: string;
	count: number;
	percent: number;
}

interface AccuracyPoint {
	date: string;
	average: number;
	p95: number;
	p05: number;
}

interface HeatmapDay {
	day: string;
	hours: number[];
}

interface FolderVolume {
	folder: string;
	path: string;
	docs: number;
	gb: number;
}

const TOOLTIP_STYLE = {
	background: '#0f172a',
	border: '1px solid rgba(30, 41, 59, 0.9)',
	borderRadius: 12,
	color: '#e2e8f0',
	fontSize: 12,
} as const;

const AXIS_TICK = { fill: '#94a3b8', fontSize: 11 } as const;

const pipelineData: PipelinePoint[] = [
	{ date: 'Jun 06', ingested: 1240, processed: 1168, exceptions: 34 },
	{ date: 'Jun 09', ingested: 1395, processed: 1310, exceptions: 41 },
	{ date: 'Jun 12', ingested: 1518, processed: 1498, exceptions: 28 },
	{ date: 'Jun 15', ingested: 1720, processed: 1632, exceptions: 51 },
	{ date: 'Jun 18', ingested: 1684, processed: 1661, exceptions: 45 },
	{ date: 'Jun 21', ingested: 1916, processed: 1848, exceptions: 38 },
	{ date: 'Jun 24', ingested: 2088, processed: 2014, exceptions: 44 },
	{ date: 'Jun 27', ingested: 2250, processed: 2196, exceptions: 39 },
	{ date: 'Jun 30', ingested: 2386, processed: 2318, exceptions: 46 },
	{ date: 'Jul 03', ingested: 2512, processed: 2469, exceptions: 32 },
];

const documentTypes: DocumentTypeSlice[] = [
	{ name: 'Invoices', count: 18420, color: '#f0a528' },
	{ name: 'Contracts', count: 10980, color: '#38bdf8' },
	{ name: 'HR Records', count: 8460, color: '#22c55e' },
	{ name: 'Claims', count: 6180, color: '#a855f7' },
	{ name: 'Correspondence', count: 5020, color: '#f97316' },
	{ name: 'Permits', count: 2890, color: '#ef4444' },
];

const sourceData: SourceBreakdown[] = [
	{ source: 'Email', count: 16840, percent: 34 },
	{ source: 'Upload', count: 12720, percent: 26 },
	{ source: 'Scanner', count: 9610, percent: 19 },
	{ source: 'API', count: 6820, percent: 14 },
	{ source: 'Watch Folder', count: 3540, percent: 7 },
];

const accuracyTrend: AccuracyPoint[] = [
	{ date: 'Jun 06', average: 92.2, p95: 98.7, p05: 83.1 },
	{ date: 'Jun 09', average: 92.8, p95: 98.9, p05: 84.4 },
	{ date: 'Jun 12', average: 93.4, p95: 99.1, p05: 85.7 },
	{ date: 'Jun 15', average: 94.1, p95: 99.2, p05: 87.2 },
	{ date: 'Jun 18', average: 93.8, p95: 99.0, p05: 86.5 },
	{ date: 'Jun 21', average: 94.7, p95: 99.4, p05: 88.9 },
	{ date: 'Jun 24', average: 95.1, p95: 99.5, p05: 89.4 },
	{ date: 'Jun 27', average: 94.9, p95: 99.3, p05: 88.2 },
	{ date: 'Jun 30', average: 95.6, p95: 99.6, p05: 90.1 },
	{ date: 'Jul 03', average: 96.0, p95: 99.7, p05: 90.8 },
];

const activityHeatmap: HeatmapDay[] = [
	{ day: 'Mon', hours: [0, 1, 2, 4, 6, 9, 8, 7, 6, 3, 1, 0] },
	{ day: 'Tue', hours: [0, 2, 3, 5, 8, 10, 9, 8, 6, 4, 2, 1] },
	{ day: 'Wed', hours: [1, 2, 4, 7, 9, 10, 10, 8, 7, 5, 2, 1] },
	{ day: 'Thu', hours: [0, 1, 3, 6, 8, 9, 9, 7, 6, 4, 2, 1] },
	{ day: 'Fri', hours: [0, 1, 2, 5, 7, 8, 7, 6, 5, 3, 1, 0] },
	{ day: 'Sat', hours: [0, 0, 1, 2, 3, 4, 3, 2, 2, 1, 0, 0] },
	{ day: 'Sun', hours: [0, 0, 0, 1, 2, 2, 2, 1, 1, 0, 0, 0] },
];

const topFolders: FolderVolume[] = [
	{ folder: 'Vendor Invoices', path: '/Finance/AP/2026', docs: 12840, gb: 88.4 },
	{ folder: 'Employee Files', path: '/People/Active', docs: 9360, gb: 51.2 },
	{ folder: 'Claims Evidence', path: '/Legal/Claims', docs: 8120, gb: 73.6 },
	{ folder: 'Client Contracts', path: '/Sales/Contracts', docs: 6940, gb: 44.1 },
	{ folder: 'Board Minutes', path: '/Corporate/Governance', docs: 4180, gb: 18.9 },
];

function exportAnalytics(format: 'CSV' | 'PDF') {
	const rows = pipelineData
		.map((row) => `${row.date},${row.ingested},${row.processed},${row.exceptions}`)
		.join('\n');
	const blob = new Blob([`date,ingested,processed,exceptions\n${rows}`], {
		type: format === 'CSV' ? 'text/csv' : 'application/pdf',
	});
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.download = `darchiva-analytics.${format.toLowerCase()}`;
	link.click();
	URL.revokeObjectURL(link.href);
}

function SkeletonBlock({ className }: { className?: string }) {
	return <div className={cn('animate-pulse rounded-xl bg-slate-800/70', className)} />;
}

function EmptyState({ title, action }: { title: string; action: string }) {
	return (
		<div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-800 bg-slate-900 text-center">
			<FileText className="mb-3 h-8 w-8 text-slate-600" />
			<p className="text-sm font-medium text-slate-200">{title}</p>
			<button className="mt-3 rounded-lg border border-brass-500/60 px-3 py-2 text-xs font-medium text-brass-400 hover:bg-brass-500/10">
				{action}
			</button>
		</div>
	);
}

function Panel({
	title,
	description,
	children,
	className,
}: {
	title: string;
	description?: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<section className={cn('rounded-xl border border-slate-800/50 bg-slate-900 p-5', className)}>
			<div className="mb-4">
				<h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">{title}</h2>
				{description ? <p className="mt-1 text-sm text-slate-400">{description}</p> : null}
			</div>
			{children}
		</section>
	);
}

function KpiCard({ metric }: { metric: KpiMetric }) {
	const Icon = metric.icon;
	const isPositive =
		metric.direction === 'flat' || metric.direction === metric.goodDirection;
	const TrendIcon = metric.direction === 'down' ? TrendingDown : TrendingUp;

	return (
		<div className="rounded-xl border border-slate-800/50 bg-slate-900 p-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">{metric.label}</p>
					<p className="mt-3 text-2xl font-semibold tabular-nums text-slate-100">{metric.value}</p>
				</div>
				<div className="rounded-lg border border-slate-800 bg-slate-800 p-2 text-brass-500">
					<Icon className="h-5 w-5" />
				</div>
			</div>
			<div className="mt-4 flex items-center justify-between gap-3 text-xs">
				<span className="text-slate-500">{metric.detail}</span>
				<span
					className={cn(
						'inline-flex items-center gap-1 rounded-full px-2 py-1 font-medium',
						isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400',
					)}
				>
					<TrendIcon className="h-3.5 w-3.5" />
					{metric.trend > 0 ? '+' : ''}
					{metric.trend}%
				</span>
			</div>
		</div>
	);
}

function ActivityHeatmap() {
	return (
		<div className="space-y-2">
			<div className="grid grid-cols-[44px_repeat(12,minmax(0,1fr))] gap-1 text-[10px] uppercase text-slate-600">
				<span />
				{['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'].map((hour) => (
					<span key={hour} className="text-center">{hour}</span>
				))}
			</div>
			{activityHeatmap.map((row) => (
				<div key={row.day} className="grid grid-cols-[44px_repeat(12,minmax(0,1fr))] gap-1">
					<span className="self-center text-xs text-slate-400">{row.day}</span>
					{row.hours.map((level, index) => (
						<div
							key={`${row.day}-${index}`}
							title={`${row.day} ${index * 2}:00 activity level ${level}`}
							className="h-7 rounded-md border border-slate-800"
							style={{
								backgroundColor:
									level === 0
										? '#0f172a'
										: `rgba(240, 165, 40, ${Math.max(0.16, level / 11)})`,
							}}
						/>
					))}
				</div>
			))}
		</div>
	);
}

export function Analytics() {
	const [range, setRange] = useState<DatePreset>('30d');
	const [customStart, setCustomStart] = useState('2026-06-06');
	const [customEnd, setCustomEnd] = useState('2026-07-05');
	const [isLoading] = useState(false);

	const totalDocs = useMemo(
		() => documentTypes.reduce((sum, item) => sum + item.count, 0),
		[],
	);
	const maxFolderDocs = Math.max(...topFolders.map((folder) => folder.docs));
	const kpis: KpiMetric[] = [
		{ label: 'Total Docs', value: totalDocs.toLocaleString(), detail: range === 'custom' ? `${customStart} to ${customEnd}` : `Last ${range}`, trend: 12.4, direction: 'up', goodDirection: 'up', icon: FileText },
		{ label: 'Processed Today', value: '2,469', detail: '96.1% completion rate', trend: 8.2, direction: 'up', goodDirection: 'up', icon: Upload },
		{ label: 'Avg OCR Accuracy', value: '96.0%', detail: '95th percentile 99.7%', trend: 2.1, direction: 'up', goodDirection: 'up', icon: Gauge },
		{ label: 'Docs/Hour', value: '317', detail: 'Peak hour 412 docs', trend: 5.8, direction: 'up', goodDirection: 'up', icon: Activity },
		{ label: 'Exception Rate', value: '1.3%', detail: '32 unresolved today', trend: -0.7, direction: 'down', goodDirection: 'down', icon: AlertTriangle },
	];

	return (
		<div className="min-h-screen bg-slate-950 p-6 text-slate-100">
			<div className="mx-auto max-w-[1500px] space-y-6">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="flex items-center gap-2 text-sm font-medium text-brass-500">
							<Activity className="h-4 w-4" />
							Analytics command center
						</div>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-100">Document Operations Analytics</h1>
						<p className="mt-2 max-w-3xl text-sm text-slate-400">
							End-to-end ingestion, OCR quality, user throughput, exceptions, and storage pressure across the archive.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<div className="flex rounded-xl border border-slate-800/50 bg-slate-900 p-1">
							{(['7d', '30d', '90d', 'custom'] as DatePreset[]).map((option) => (
								<button
									key={option}
									type="button"
									onClick={() => setRange(option)}
									className={cn(
										'rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:text-slate-100',
										range === option && 'bg-brass-500 text-slate-950 hover:text-slate-950',
									)}
								>
									{option === 'custom' ? 'Custom' : `Last ${option}`}
								</button>
							))}
						</div>
						{range === 'custom' ? (
							<div className="flex items-center gap-2 rounded-xl border border-slate-800/50 bg-slate-900 px-3 py-2">
								<CalendarDays className="h-4 w-4 text-slate-500" />
								<input type="date" value={customStart} onChange={(event) => setCustomStart(event.target.value)} className="bg-transparent text-sm text-slate-200 outline-none" />
								<span className="text-slate-600">to</span>
								<input type="date" value={customEnd} onChange={(event) => setCustomEnd(event.target.value)} className="bg-transparent text-sm text-slate-200 outline-none" />
							</div>
						) : null}
						<button type="button" onClick={() => exportAnalytics('CSV')} className="inline-flex items-center gap-2 rounded-xl border border-slate-800/50 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:border-brass-500/70">
							<Download className="h-4 w-4" />
							CSV
						</button>
						<button type="button" onClick={() => exportAnalytics('PDF')} className="inline-flex items-center gap-2 rounded-xl bg-brass-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-brass-400">
							<Download className="h-4 w-4" />
							PDF
						</button>
					</div>
				</header>

				{isLoading ? (
					<div className="grid gap-4 md:grid-cols-5">
						{Array.from({ length: 5 }).map((_, index) => <SkeletonBlock key={index} className="h-36" />)}
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
						{kpis.map((metric) => <KpiCard key={metric.label} metric={metric} />)}
					</div>
				)}

				<div className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
					<Panel title="Processing Pipeline" description="Ingested, processed, and exception volumes over time.">
						{pipelineData.length ? (
							<ResponsiveContainer width="100%" height={330}>
								<LineChart data={pipelineData} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
									<CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
									<XAxis dataKey="date" tick={AXIS_TICK} />
									<YAxis tick={AXIS_TICK} />
									<Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name: string) => [`${value.toLocaleString()} docs`, name]} />
									<Legend />
									<Line type="monotone" dataKey="ingested" stroke="#38bdf8" strokeWidth={2.5} dot={false} name="Ingested" />
									<Line type="monotone" dataKey="processed" stroke="#22c55e" strokeWidth={2.5} dot={false} name="Processed" />
									<Line type="monotone" dataKey="exceptions" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3 }} name="Exceptions" />
								</LineChart>
							</ResponsiveContainer>
						) : (
							<EmptyState title="No pipeline events yet" action="Connect ingestion source" />
						)}
					</Panel>

					<Panel title="Document Type Distribution" description="Volume share by classified document type.">
						<div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
							<ResponsiveContainer width="100%" height={260}>
								<PieChart>
									<Pie data={documentTypes} innerRadius={64} outerRadius={104} paddingAngle={3} dataKey="count" nameKey="name">
										{documentTypes.map((slice) => <Cell key={slice.name} fill={slice.color} />)}
									</Pie>
									<Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [`${value.toLocaleString()} docs`, 'Count']} />
									<Legend />
								</PieChart>
							</ResponsiveContainer>
							<div className="overflow-hidden rounded-xl border border-slate-800/50">
								<table className="w-full text-sm">
									<thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500">
										<tr><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Docs</th><th className="px-3 py-2 text-right">Share</th></tr>
									</thead>
									<tbody className="divide-y divide-slate-800/50">
										{documentTypes.map((slice) => (
											<tr key={slice.name}>
												<td className="px-3 py-2 text-slate-200"><span className="mr-2 inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />{slice.name}</td>
												<td className="px-3 py-2 text-right tabular-nums text-slate-300">{slice.count.toLocaleString()}</td>
												<td className="px-3 py-2 text-right tabular-nums text-slate-400">{Math.round((slice.count / totalDocs) * 100)}%</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</Panel>
				</div>

				<div className="grid gap-6 xl:grid-cols-2">
					<Panel title="Ingestion Sources" description="Source contribution with percentage of total volume.">
						<ResponsiveContainer width="100%" height={290}>
							<BarChart data={sourceData} layout="vertical" margin={{ top: 8, right: 24, left: 26, bottom: 0 }}>
								<CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
								<XAxis type="number" tick={AXIS_TICK} />
								<YAxis dataKey="source" type="category" tick={AXIS_TICK} width={92} />
								<Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number, name: string, item) => {
									const payload = item.payload as SourceBreakdown;
									return [`${value.toLocaleString()} docs (${payload.percent}%)`, name];
								}} />
								<Legend />
								<Bar dataKey="count" name="Documents" fill="#f0a528" radius={[0, 8, 8, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</Panel>

					<Panel title="OCR Accuracy Trend" description="Average accuracy with 5th to 95th percentile confidence band.">
						<ResponsiveContainer width="100%" height={290}>
							<ComposedChart data={accuracyTrend} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
								<CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
								<XAxis dataKey="date" tick={AXIS_TICK} />
								<YAxis domain={[80, 100]} tick={AXIS_TICK} unit="%" />
								<Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [`${value.toFixed(1)}%`, 'OCR accuracy']} />
								<Legend />
								<Area type="monotone" dataKey="p95" stroke="transparent" fill="#38bdf8" fillOpacity={0.12} name="95th percentile band" />
								<Area type="monotone" dataKey="p05" stroke="transparent" fill="#0f172a" fillOpacity={1} name="5th percentile" />
								<Line type="monotone" dataKey="average" stroke="#f0a528" strokeWidth={2.5} dot={false} name="Average accuracy" />
							</ComposedChart>
						</ResponsiveContainer>
					</Panel>
				</div>

				<div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
					<Panel title="User Activity Heatmap" description="Seven-day activity levels in two-hour blocks.">
						<ActivityHeatmap />
					</Panel>
					<Panel title="Top Folders by Volume" description="Largest active folders by document count.">
						<div className="space-y-4">
							{topFolders.map((folder, index) => (
								<div key={folder.path} className="space-y-2">
									<div className="flex items-center justify-between gap-3 text-sm">
										<div className="min-w-0">
											<p className="truncate font-medium text-slate-200">{index + 1}. {folder.folder}</p>
											<p className="truncate text-xs text-slate-500">{folder.path}</p>
										</div>
										<div className="text-right tabular-nums">
											<p className="text-slate-200">{folder.docs.toLocaleString()}</p>
											<p className="text-xs text-slate-500">{folder.gb.toFixed(1)} GB</p>
										</div>
									</div>
									<div className="h-2 rounded-full bg-slate-800">
										<div className="h-2 rounded-full bg-brass-500" style={{ width: `${(folder.docs / maxFolderDocs) * 100}%` }} />
									</div>
								</div>
							))}
						</div>
					</Panel>
				</div>
			</div>
		</div>
	);
}

export default Analytics;
