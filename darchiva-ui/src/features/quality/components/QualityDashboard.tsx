// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import {
	AlertTriangle,
	CheckCircle2,
	FileWarning,
	RefreshCw,
	ScanLine,
	SlidersHorizontal,
} from 'lucide-react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { QualityStats } from '../types';

interface QualityDashboardProps {
	stats?: QualityStats;
	onRefresh?: () => void;
	isLoading?: boolean;
}

interface ScoreBucket {
	range: string;
	count: number;
}

interface TypeScore {
	type: string;
	average: number;
	passRate: number;
	rejectRate: number;
}

interface Threshold {
	type: string;
	value: number;
}

interface FailedCheck {
	id: string;
	title: string;
	docType: string;
	reason: string;
	score: number;
	thumbnail: string;
}

interface QualityPoint {
	date: string;
	score: number;
	passRate: number;
}

interface BatchReport {
	batchId: string;
	totalDocs: number;
	avgScore: number;
	passRate: number;
	action: string;
}

const TOOLTIP_STYLE = {
	background: '#0f172a',
	border: '1px solid rgba(30, 41, 59, 0.9)',
	borderRadius: 12,
	color: '#e2e8f0',
	fontSize: 12,
} as const;
const AXIS_TICK = { fill: '#94a3b8', fontSize: 11 } as const;

const scoreDistribution: ScoreBucket[] = [
	{ range: '0-49', count: 18 },
	{ range: '50-59', count: 44 },
	{ range: '60-69', count: 126 },
	{ range: '70-79', count: 412 },
	{ range: '80-89', count: 1240 },
	{ range: '90-100', count: 2896 },
];

const confidenceDistribution: ScoreBucket[] = [
	{ range: '<70', count: 54 },
	{ range: '70-79', count: 188 },
	{ range: '80-89', count: 806 },
	{ range: '90-94', count: 1472 },
	{ range: '95-97', count: 1944 },
	{ range: '98+', count: 1086 },
];

const typeScores: TypeScore[] = [
	{ type: 'Invoices', average: 96, passRate: 98, rejectRate: 0.8 },
	{ type: 'Contracts', average: 94, passRate: 96, rejectRate: 1.4 },
	{ type: 'Claims', average: 91, passRate: 93, rejectRate: 2.2 },
	{ type: 'HR Records', average: 95, passRate: 97, rejectRate: 1.1 },
	{ type: 'Permits', average: 89, passRate: 90, rejectRate: 3.6 },
];

const failedChecks: FailedCheck[] = [
	{ id: 'QC-7814', title: 'Kiboko Logistics Invoice 83914.pdf', docType: 'Invoice', reason: 'BLUR_LOW_DPI', score: 62, thumbnail: 'INV' },
	{ id: 'QC-7815', title: 'Mombasa Depot lease amendment.pdf', docType: 'Contract', reason: 'MISSING_SIGNATURE_PAGE', score: 58, thumbnail: 'CON' },
	{ id: 'QC-7816', title: 'Claims evidence bundle C-4412.pdf', docType: 'Claims', reason: 'SKEW_EXCEEDS_THRESHOLD', score: 66, thumbnail: 'CLM' },
	{ id: 'QC-7817', title: 'Employee transfer packet - Njeri.pdf', docType: 'HR Records', reason: 'OCR_CONFIDENCE_LOW', score: 69, thumbnail: 'HR' },
];

const qualityTrend: QualityPoint[] = [
	{ date: 'Jun 07', score: 91.8, passRate: 93.1 },
	{ date: 'Jun 12', score: 92.4, passRate: 94.0 },
	{ date: 'Jun 17', score: 93.1, passRate: 95.2 },
	{ date: 'Jun 22', score: 94.2, passRate: 96.4 },
	{ date: 'Jun 27', score: 94.8, passRate: 97.1 },
	{ date: 'Jul 02', score: 95.4, passRate: 97.8 },
];

const batchReports: BatchReport[] = [
	{ batchId: 'BATCH-2026-0705-01', totalDocs: 842, avgScore: 95.2, passRate: 98.1, action: 'Publish report' },
	{ batchId: 'BATCH-2026-0704-09', totalDocs: 516, avgScore: 91.6, passRate: 93.8, action: 'Review 18 rejects' },
	{ batchId: 'BATCH-2026-0704-02', totalDocs: 1204, avgScore: 96.1, passRate: 98.9, action: 'Archive report' },
	{ batchId: 'BATCH-2026-0703-06', totalDocs: 433, avgScore: 88.9, passRate: 90.7, action: 'Rescan flagged docs' },
];

function Panel({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
	return (
		<section className={cn('rounded-xl border border-slate-800/50 bg-slate-900 p-5', className)}>
			<h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-slate-100">{title}</h2>
			{children}
		</section>
	);
}

function SkeletonBlock({ className }: { className?: string }) {
	return <div className={cn('animate-pulse rounded-xl bg-slate-800/70', className)} />;
}

function StatCard({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: string }) {
	return (
		<div className="rounded-xl border border-slate-800/50 bg-slate-900 p-4">
			<p className="text-xs uppercase tracking-[0.16em] text-slate-400">{label}</p>
			<p className={cn('mt-3 text-3xl font-semibold tabular-nums', tone)}>{value}</p>
			<p className="mt-2 text-xs text-slate-500">{detail}</p>
		</div>
	);
}

export function QualityDashboard({ stats, onRefresh, isLoading = false }: QualityDashboardProps) {
	const [thresholds, setThresholds] = useState<Threshold[]>([
		{ type: 'Invoices', value: 82 },
		{ type: 'Contracts', value: 86 },
		{ type: 'Claims', value: 88 },
		{ type: 'HR Records', value: 90 },
		{ type: 'Permits', value: 84 },
	]);
	const avgScore = stats?.avgQualityScore ?? 95.1;
	const passRate = stats?.passRate ?? 97.2;

	return (
		<div className="min-h-screen bg-slate-950 p-6 text-slate-100">
			<div className="mx-auto max-w-[1450px] space-y-6">
				<header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<div className="flex items-center gap-2 text-sm font-medium text-brass-500">
							<ScanLine className="h-4 w-4" />
							Quality control
						</div>
						<h1 className="mt-2 text-3xl font-semibold tracking-tight">Document Quality Dashboard</h1>
						<p className="mt-2 text-sm text-slate-400">OCR confidence, image quality, threshold controls, failed checks, and batch-level outcomes.</p>
					</div>
					<button
						type="button"
						onClick={onRefresh}
						className="inline-flex items-center gap-2 rounded-xl border border-slate-800/50 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 hover:border-brass-500/70"
					>
						<RefreshCw className="h-4 w-4" />
						Refresh
					</button>
				</header>

				{isLoading ? (
					<div className="grid gap-4 md:grid-cols-4">
						{Array.from({ length: 4 }).map((_, index) => <SkeletonBlock key={index} className="h-32" />)}
					</div>
				) : (
					<div className="grid gap-4 md:grid-cols-4">
						<StatCard label="Quality Score" value={`${avgScore.toFixed(1)}%`} detail="Weighted OCR + image score" tone="text-brass-400" />
						<StatCard label="Pass Rate" value={`${passRate.toFixed(1)}%`} detail="Current production threshold" tone="text-emerald-400" />
						<StatCard label="Rejected Today" value="32" detail="Auto-reject queue" tone="text-red-400" />
						<StatCard label="Needs Rescan" value="18" detail="Operator-actionable items" tone="text-amber-400" />
					</div>
				)}

				<div className="grid gap-6 xl:grid-cols-2">
					<Panel title="Quality Score Distribution">
						<ResponsiveContainer width="100%" height={280}>
							<BarChart data={scoreDistribution}>
								<CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
								<XAxis dataKey="range" tick={AXIS_TICK} />
								<YAxis tick={AXIS_TICK} />
								<Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [`${value.toLocaleString()} docs`, 'Documents']} />
								<Legend />
								<Bar dataKey="count" name="Documents" fill="#f0a528" radius={[8, 8, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</Panel>
					<Panel title="Score by Document Type">
						<ResponsiveContainer width="100%" height={280}>
							<BarChart data={typeScores}>
								<CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
								<XAxis dataKey="type" tick={AXIS_TICK} />
								<YAxis tick={AXIS_TICK} unit="%" />
								<Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [`${value.toFixed(1)}%`, '']} />
								<Legend />
								<Bar dataKey="average" name="Avg score" fill="#38bdf8" radius={[6, 6, 0, 0]} />
								<Bar dataKey="passRate" name="Pass rate" fill="#22c55e" radius={[6, 6, 0, 0]} />
								<Bar dataKey="rejectRate" name="Reject rate" fill="#ef4444" radius={[6, 6, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</Panel>
				</div>

				<div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
					<Panel title="Quality Thresholds">
						<div className="space-y-5">
							{thresholds.map((threshold) => (
								<div key={threshold.type} className="space-y-2">
									<div className="flex items-center justify-between text-sm">
										<span className="font-medium text-slate-200">{threshold.type}</span>
										<span className="tabular-nums text-brass-400">Auto-reject below {threshold.value}%</span>
									</div>
									<input
										type="range"
										min={60}
										max={98}
										value={threshold.value}
										onChange={(event) =>
											setThresholds((current) =>
												current.map((item) =>
													item.type === threshold.type ? { ...item, value: Number(event.target.value) } : item,
												),
											)
										}
										className="w-full accent-brass-500"
									/>
								</div>
							))}
						</div>
					</Panel>
					<Panel title="Failed Quality Checks">
						<div className="space-y-3">
							{failedChecks.map((item) => (
								<div key={item.id} className="flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-3">
									<div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-md border border-slate-700 bg-slate-800 text-[11px] font-semibold text-slate-300">{item.thumbnail}</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-slate-100">{item.title}</p>
										<p className="mt-1 text-xs text-slate-500">{item.id} · {item.docType} · {item.reason}</p>
									</div>
									<span className="rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-400">{item.score}%</span>
									<button type="button" className="inline-flex items-center gap-2 rounded-lg border border-brass-500/50 px-3 py-2 text-xs font-medium text-brass-400 hover:bg-brass-500/10">
										<ScanLine className="h-3.5 w-3.5" />
										Re-scan
									</button>
								</div>
							))}
						</div>
					</Panel>
				</div>

				<div className="grid gap-6 xl:grid-cols-2">
					<Panel title="Quality Trend Over Time">
						<ResponsiveContainer width="100%" height={280}>
							<LineChart data={qualityTrend}>
								<CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
								<XAxis dataKey="date" tick={AXIS_TICK} />
								<YAxis domain={[85, 100]} tick={AXIS_TICK} unit="%" />
								<Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [`${value.toFixed(1)}%`, '']} />
								<Legend />
								<Line dataKey="score" name="Avg quality score" stroke="#f0a528" strokeWidth={2.5} dot={false} />
								<Line dataKey="passRate" name="Pass rate" stroke="#22c55e" strokeWidth={2.5} dot={false} />
							</LineChart>
						</ResponsiveContainer>
					</Panel>
					<Panel title="Confidence Score Distribution">
						<ResponsiveContainer width="100%" height={280}>
							<BarChart data={confidenceDistribution}>
								<CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
								<XAxis dataKey="range" tick={AXIS_TICK} />
								<YAxis tick={AXIS_TICK} />
								<Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => [`${value.toLocaleString()} pages`, 'Pages']} />
								<Legend />
								<Bar dataKey="count" name="Pages" fill="#a855f7" radius={[8, 8, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</Panel>
				</div>

				<Panel title="Batch Quality Reports">
					<div className="overflow-hidden rounded-xl border border-slate-800/50">
						<table className="w-full text-sm">
							<thead className="bg-slate-800/60 text-xs uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-4 py-3 text-left">Batch ID</th>
									<th className="px-4 py-3 text-right">Total Docs</th>
									<th className="px-4 py-3 text-right">Avg Score</th>
									<th className="px-4 py-3 text-right">Pass Rate</th>
									<th className="px-4 py-3 text-left">Action</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-800/50">
								{batchReports.map((report) => (
									<tr key={report.batchId}>
										<td className="px-4 py-3 font-mono text-slate-200">{report.batchId}</td>
										<td className="px-4 py-3 text-right tabular-nums text-slate-300">{report.totalDocs.toLocaleString()}</td>
										<td className="px-4 py-3 text-right tabular-nums text-slate-300">{report.avgScore.toFixed(1)}%</td>
										<td className="px-4 py-3 text-right tabular-nums text-emerald-400">{report.passRate.toFixed(1)}%</td>
										<td className="px-4 py-3">
											<button type="button" className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:border-brass-500/70">
												{report.passRate >= 95 ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> : <FileWarning className="h-3.5 w-3.5 text-amber-400" />}
												{report.action}
											</button>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</Panel>

				<div className="rounded-xl border border-brass-500/20 bg-brass-500/5 p-4 text-sm text-brass-200">
					<SlidersHorizontal className="mr-2 inline h-4 w-4" />
					Threshold changes apply to new batches immediately and are logged with the quality policy version.
				</div>
			</div>
		</div>
	);
}
