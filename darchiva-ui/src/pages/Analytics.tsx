// (c) Copyright Datacraft, 2026
import React, { useState, useCallback } from 'react';
import {
	LineChart,
	Line,
	BarChart,
	Bar,
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

// ─────────────────────── helpers ────────────────────────────

type DateRange = 7 | 30 | 90;

function fmtTimestamp(ts: string): string {
	try {
		const d = new Date(ts);
		return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
	} catch {
		return ts;
	}
}

function exportCsv(data: { timestamp: string; pages_scanned: number; batches_completed: number }[], days: number) {
	const header = 'timestamp,pages_scanned,batches_completed\n';
	const rows = data.map(r => `${r.timestamp},${r.pages_scanned},${r.batches_completed}`).join('\n');
	const blob = new Blob([header + rows], { type: 'text/csv' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `throughput-${days}d.csv`;
	a.click();
	URL.revokeObjectURL(url);
}

// ─────────────────────── sub-components ─────────────────────

function StatCard({
	label,
	value,
	sub,
	color = '#6366f1',
}: {
	label: string;
	value: string | number;
	sub?: string;
	color?: string;
}) {
	return (
		<div
			style={{
				background: '#1e1e2e',
				border: '1px solid #2e2e3e',
				borderRadius: 12,
				padding: '20px 24px',
				minWidth: 160,
				flex: 1,
			}}
		>
			<div style={{ fontSize: 12, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
				{label}
			</div>
			<div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
			{sub && <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{sub}</div>}
		</div>
	);
}

function SectionHeader({ title }: { title: string }) {
	return (
		<h2
			style={{
				fontSize: 14,
				fontWeight: 600,
				color: '#ccc',
				textTransform: 'uppercase',
				letterSpacing: 1,
				marginBottom: 16,
				marginTop: 0,
			}}
		>
			{title}
		</h2>
	);
}

function LoadingBlock() {
	return (
		<div
			style={{
				height: 260,
				background: '#1e1e2e',
				border: '1px solid #2e2e3e',
				borderRadius: 12,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: '#555',
			}}
		>
			Loading…
		</div>
	);
}

function ErrorBlock({ msg }: { msg: string }) {
	return (
		<div
			style={{
				height: 260,
				background: '#1e1e2e',
				border: '1px solid #3e2e2e',
				borderRadius: 12,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				color: '#f87171',
				fontSize: 13,
			}}
		>
			{msg}
		</div>
	);
}

// ─────────────────────── capacity gauge ──────────────────────

function CapacityGauge({
	pct,
	label,
	color,
}: {
	pct: number;
	label: string;
	color: string;
}) {
	const clamped = Math.min(100, Math.max(0, pct));
	return (
		<div style={{ textAlign: 'center' }}>
			<div
				style={{
					width: 120,
					height: 120,
					borderRadius: '50%',
					background: `conic-gradient(${color} ${clamped * 3.6}deg, #2e2e3e 0deg)`,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					margin: '0 auto 8px',
					position: 'relative',
				}}
			>
				<div
					style={{
						width: 90,
						height: 90,
						borderRadius: '50%',
						background: '#1e1e2e',
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						flexDirection: 'column',
					}}
				>
					<span style={{ fontSize: 20, fontWeight: 700, color }}>{Math.round(clamped)}%</span>
				</div>
			</div>
			<div style={{ fontSize: 12, color: '#888' }}>{label}</div>
		</div>
	);
}

// ─────────────────────── export panel ────────────────────────

type ExportReport = 'document_summary' | 'ocr_quality' | 'scanning_productivity';
type ExportFormat = 'csv' | 'xlsx';

const REPORT_OPTIONS: { value: ExportReport; label: string }[] = [
	{ value: 'document_summary', label: 'Document Summary' },
	{ value: 'ocr_quality', label: 'OCR Quality' },
	{ value: 'scanning_productivity', label: 'Scanning Productivity' },
];

function toIso(d: string): string {
	// d is YYYY-MM-DD from <input type="date">
	return d ? new Date(d).toISOString() : '';
}

function ExportPanel({ days }: { days: number }) {
	const [report, setReport] = React.useState<ExportReport>('document_summary');
	const [fmt, setFmt] = React.useState<ExportFormat>('csv');
	const [useDateRange, setUseDateRange] = React.useState(false);
	const [dateFrom, setDateFrom] = React.useState('');
	const [dateTo, setDateTo] = React.useState('');

	const handleDownload = () => {
		const params = new URLSearchParams({ format: fmt, report });
		if (useDateRange && dateFrom) params.set('date_from', toIso(dateFrom));
		if (useDateRange && dateTo) params.set('date_to', toIso(dateTo));
		window.location.href = `/api/v1/analytics/export?${params.toString()}`;
	};

	const btnBase: React.CSSProperties = {
		padding: '5px 14px',
		borderRadius: 6,
		border: '1px solid #3e3e5e',
		cursor: 'pointer',
		fontSize: 13,
		transition: 'all 0.15s',
	};

	return (
		<div
			style={{
				background: '#1e1e2e',
				border: '1px solid #2e2e3e',
				borderRadius: 12,
				padding: '20px 24px',
				marginBottom: 28,
			}}
		>
			<SectionHeader title="Export Report" />
			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
				{/* Report type */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
					<label style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.8 }}>
						Report type
					</label>
					<select
						value={report}
						onChange={e => setReport(e.target.value as ExportReport)}
						style={{
							background: '#13131f',
							border: '1px solid #3e3e5e',
							borderRadius: 6,
							color: '#ccc',
							fontSize: 13,
							padding: '6px 10px',
							minWidth: 220,
						}}
					>
						{REPORT_OPTIONS.map(o => (
							<option key={o.value} value={o.value}>
								{o.label}
							</option>
						))}
					</select>
				</div>

				{/* Format toggle */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
					<label style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.8 }}>
						Format
					</label>
					<div style={{ display: 'flex', gap: 4 }}>
						{(['csv', 'xlsx'] as ExportFormat[]).map(f => (
							<button
								key={f}
								onClick={() => setFmt(f)}
								style={{
									...btnBase,
									background: fmt === f ? '#6366f1' : '#2e2e3e',
									color: fmt === f ? '#fff' : '#aaa',
									border: fmt === f ? '1px solid #6366f1' : '1px solid #3e3e5e',
								}}
							>
								{f.toUpperCase()}
							</button>
						))}
					</div>
				</div>

				{/* Date range toggle */}
				<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
					<label style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.8 }}>
						Date window
					</label>
					<div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
						<button
							onClick={() => setUseDateRange(false)}
							style={{
								...btnBase,
								background: !useDateRange ? '#6366f1' : '#2e2e3e',
								color: !useDateRange ? '#fff' : '#aaa',
								border: !useDateRange ? '1px solid #6366f1' : '1px solid #3e3e5e',
							}}
						>
							Last {days}d
						</button>
						<button
							onClick={() => setUseDateRange(true)}
							style={{
								...btnBase,
								background: useDateRange ? '#6366f1' : '#2e2e3e',
								color: useDateRange ? '#fff' : '#aaa',
								border: useDateRange ? '1px solid #6366f1' : '1px solid #3e3e5e',
							}}
						>
							Custom
						</button>
					</div>
				</div>

				{/* Custom date inputs */}
				{useDateRange && (
					<>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
							<label style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.8 }}>
								From
							</label>
							<input
								type="date"
								value={dateFrom}
								onChange={e => setDateFrom(e.target.value)}
								style={{
									background: '#13131f',
									border: '1px solid #3e3e5e',
									borderRadius: 6,
									color: '#ccc',
									fontSize: 13,
									padding: '6px 10px',
								}}
							/>
						</div>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
							<label style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.8 }}>
								To
							</label>
							<input
								type="date"
								value={dateTo}
								onChange={e => setDateTo(e.target.value)}
								style={{
									background: '#13131f',
									border: '1px solid #3e3e5e',
									borderRadius: 6,
									color: '#ccc',
									fontSize: 13,
									padding: '6px 10px',
								}}
							/>
						</div>
					</>
				)}

				{/* Download button */}
				<button
					onClick={handleDownload}
					style={{
						padding: '7px 20px',
						borderRadius: 6,
						border: 'none',
						background: '#6366f1',
						color: '#fff',
						cursor: 'pointer',
						fontSize: 13,
						fontWeight: 600,
						alignSelf: 'flex-end',
					}}
				>
					Download Report
				</button>
			</div>
		</div>
	);
}

// ─────────────────────── main page ───────────────────────────

export function Analytics() {
	const [days, setDays] = useState<DateRange>(30);
	const granularity: Granularity = days <= 7 ? 'day' : days <= 30 ? 'day' : 'week';

	const throughput = useAnalyticsThroughput(days, granularity);
	const quality = useAnalyticsQualityTrend(days, granularity);
	const operators = useAnalyticsOperatorPerformance(days);
	const capacity = useAnalyticsCapacity();

	// Derived summary stats from loaded data
	const totalPages = throughput.data?.data.reduce((s, r) => s + r.pages_scanned, 0) ?? 0;
	const avgQuality =
		quality.data?.data.length
			? Math.round(quality.data.data.reduce((s, r) => s + r.avg_quality_score, 0) / quality.data.data.length)
			: 0;
	const slaCompliance =
		quality.data?.data.length
			? Math.round(
					100 -
						quality.data.data.reduce((s, r) => s + r.below_threshold_pct, 0) /
							quality.data.data.length
				)
			: 0;
	const workersActive = capacity.data?.workers_active ?? 0;

	// Combined chart data: merge throughput + quality by timestamp
	const combinedData = (() => {
		const tp = throughput.data?.data ?? [];
		const qt = quality.data?.data ?? [];
		const qMap = new Map(qt.map(r => [r.timestamp, r]));
		return tp.map(r => ({
			ts: fmtTimestamp(r.timestamp),
			pages: r.pages_scanned,
			quality: qMap.get(r.timestamp)?.avg_quality_score ?? null,
		}));
	})();

	const handleExport = useCallback(async () => {
		const result = await fetchThroughput(days, granularity);
		exportCsv(result.data, days);
	}, [days, granularity]);

	const tabStyle = (active: boolean): React.CSSProperties => ({
		padding: '6px 16px',
		borderRadius: 6,
		border: 'none',
		cursor: 'pointer',
		fontSize: 13,
		fontWeight: active ? 600 : 400,
		background: active ? '#6366f1' : '#2e2e3e',
		color: active ? '#fff' : '#aaa',
		transition: 'all 0.15s',
	});

	return (
		<div style={{ padding: '28px 32px', background: '#13131f', minHeight: '100vh', color: '#e2e2f0' }}>
			{/* ── Header ── */}
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'space-between',
					marginBottom: 28,
					flexWrap: 'wrap',
					gap: 12,
				}}
			>
				<div>
					<h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Performance Analytics</h1>
					<p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>
						Throughput, quality trends, and capacity utilization
					</p>
				</div>
				<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
					{([7, 30, 90] as DateRange[]).map(d => (
						<button key={d} style={tabStyle(days === d)} onClick={() => setDays(d)}>
							{d}d
						</button>
					))}
					<button
						onClick={handleExport}
						style={{
							marginLeft: 8,
							padding: '6px 16px',
							borderRadius: 6,
							border: '1px solid #3e3e5e',
							background: 'transparent',
							color: '#aaa',
							cursor: 'pointer',
							fontSize: 13,
						}}
					>
						Export CSV
					</button>
				</div>
			</div>

			{/* ── Stat Cards ── */}
			<div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
				<StatCard label="Total Pages" value={totalPages.toLocaleString()} sub={`Last ${days} days`} color="#6366f1" />
				<StatCard label="Avg Quality" value={`${avgQuality}%`} sub="Quality score" color="#22d3ee" />
				<StatCard label="SLA Compliance" value={`${slaCompliance}%`} sub="Pages above threshold" color="#4ade80" />
				<StatCard label="Active Workers" value={workersActive} sub="Current sessions" color="#f59e0b" />
			</div>

			{/* ── Export Panel ── */}
			<ExportPanel days={days} />

			{/* ── Throughput + Quality Line Chart ── */}
			<div
				style={{
					background: '#1e1e2e',
					border: '1px solid #2e2e3e',
					borderRadius: 12,
					padding: 24,
					marginBottom: 24,
				}}
			>
				<SectionHeader title="Pages Scanned & Quality Trend" />
				{throughput.isLoading || quality.isLoading ? (
					<LoadingBlock />
				) : throughput.isError ? (
					<ErrorBlock msg="Failed to load throughput data" />
				) : (
					<ResponsiveContainer width="100%" height={280}>
						<LineChart data={combinedData} margin={{ top: 4, right: 40, left: 0, bottom: 0 }}>
							<CartesianGrid strokeDasharray="3 3" stroke="#2e2e3e" />
							<XAxis dataKey="ts" tick={{ fill: '#888', fontSize: 11 }} />
							<YAxis yAxisId="left" tick={{ fill: '#888', fontSize: 11 }} />
							<YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fill: '#888', fontSize: 11 }} />
							<Tooltip
								contentStyle={{ background: '#1e1e2e', border: '1px solid #3e3e5e', borderRadius: 8 }}
								labelStyle={{ color: '#ccc' }}
							/>
							<Legend wrapperStyle={{ color: '#999', fontSize: 12 }} />
							<Line
								yAxisId="left"
								type="monotone"
								dataKey="pages"
								stroke="#6366f1"
								strokeWidth={2}
								dot={false}
								name="Pages Scanned"
							/>
							<Line
								yAxisId="right"
								type="monotone"
								dataKey="quality"
								stroke="#22d3ee"
								strokeWidth={2}
								dot={false}
								name="Avg Quality %"
								connectNulls
							/>
						</LineChart>
					</ResponsiveContainer>
				)}
			</div>

			{/* ── Operator Performance Bar Chart ── */}
			<div
				style={{
					background: '#1e1e2e',
					border: '1px solid #2e2e3e',
					borderRadius: 12,
					padding: 24,
					marginBottom: 24,
				}}
			>
				<SectionHeader title="Operator Performance" />
				{operators.isLoading ? (
					<LoadingBlock />
				) : operators.isError ? (
					<ErrorBlock msg="Failed to load operator data" />
				) : !operators.data?.operators.length ? (
					<div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
						No operator data for this period
					</div>
				) : (
					<ResponsiveContainer width="100%" height={260}>
						<BarChart
							data={operators.data.operators.slice(0, 15).map(o => ({
								name: o.name.split(' ')[0],
								pages: o.pages_scanned,
								quality: o.avg_quality,
							}))}
							margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
						>
							<CartesianGrid strokeDasharray="3 3" stroke="#2e2e3e" />
							<XAxis dataKey="name" tick={{ fill: '#888', fontSize: 11 }} />
							<YAxis tick={{ fill: '#888', fontSize: 11 }} />
							<Tooltip
								contentStyle={{ background: '#1e1e2e', border: '1px solid #3e3e5e', borderRadius: 8 }}
								labelStyle={{ color: '#ccc' }}
							/>
							<Legend wrapperStyle={{ color: '#999', fontSize: 12 }} />
							<Bar dataKey="pages" fill="#6366f1" name="Pages Scanned" radius={[4, 4, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				)}
			</div>

			{/* ── Capacity + Operator Table Row ── */}
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24, marginBottom: 24 }}>
				{/* Capacity Gauges */}
				<div
					style={{
						background: '#1e1e2e',
						border: '1px solid #2e2e3e',
						borderRadius: 12,
						padding: 24,
					}}
				>
					<SectionHeader title="Capacity Utilization" />
					{capacity.isLoading ? (
						<LoadingBlock />
					) : (
						<div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
							<div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
								<CapacityGauge
									pct={
										capacity.data
											? Math.min(
													100,
													(capacity.data.estimated_throughput_pages_per_hour / Math.max(1, capacity.data.workers_active * 200)) * 100
												)
											: 0
									}
									label="Throughput"
									color="#6366f1"
								/>
								<CapacityGauge
									pct={capacity.data ? Math.min(100, capacity.data.workers_active * 20) : 0}
									label="Workers"
									color="#4ade80"
								/>
							</div>
							<div style={{ fontSize: 12, color: '#666', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span>Queue depth</span>
									<span style={{ color: '#aaa' }}>{capacity.data?.current_queue_depth ?? '—'} batches</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span>Avg page time</span>
									<span style={{ color: '#aaa' }}>{capacity.data?.avg_processing_time_seconds.toFixed(1) ?? '—'}s</span>
								</div>
								<div style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span>Projected backlog</span>
									<span style={{ color: capacity.data && capacity.data.projected_backlog_hours > 8 ? '#f87171' : '#aaa' }}>
										{capacity.data?.projected_backlog_hours.toFixed(1) ?? '—'}h
									</span>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Operator Leaderboard Table */}
				<div
					style={{
						background: '#1e1e2e',
						border: '1px solid #2e2e3e',
						borderRadius: 12,
						padding: 24,
						overflow: 'hidden',
					}}
				>
					<SectionHeader title="Operator Leaderboard" />
					{operators.isLoading ? (
						<LoadingBlock />
					) : (
						<div style={{ overflowX: 'auto' }}>
							<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
								<thead>
									<tr>
										{['#', 'Name', 'Pages', 'Avg Quality', 'Exceptions', 'On-Time %'].map(h => (
											<th
												key={h}
												style={{
													padding: '8px 12px',
													textAlign: 'left',
													color: '#666',
													fontWeight: 500,
													fontSize: 11,
													textTransform: 'uppercase',
													borderBottom: '1px solid #2e2e3e',
												}}
											>
												{h}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{(operators.data?.operators ?? []).slice(0, 10).map((op, i) => (
										<tr
											key={op.user_id}
											style={{ borderBottom: '1px solid #1e1e2e' }}
											onMouseEnter={e => ((e.currentTarget as HTMLTableRowElement).style.background = '#252535')}
											onMouseLeave={e => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
										>
											<td style={{ padding: '10px 12px', color: '#555' }}>{i + 1}</td>
											<td style={{ padding: '10px 12px', fontWeight: 500 }}>{op.name}</td>
											<td style={{ padding: '10px 12px', color: '#6366f1' }}>{op.pages_scanned.toLocaleString()}</td>
											<td style={{ padding: '10px 12px' }}>
												<span
													style={{
														padding: '2px 8px',
														borderRadius: 4,
														background: op.avg_quality >= 80 ? '#14532d' : op.avg_quality >= 60 ? '#713f12' : '#7f1d1d',
														color: op.avg_quality >= 80 ? '#4ade80' : op.avg_quality >= 60 ? '#fbbf24' : '#f87171',
														fontSize: 12,
													}}
												>
													{op.avg_quality.toFixed(1)}%
												</span>
											</td>
											<td style={{ padding: '10px 12px', color: op.exceptions_caused > 5 ? '#f87171' : '#aaa' }}>
												{op.exceptions_caused}
											</td>
											<td style={{ padding: '10px 12px', color: op.on_time_rate >= 90 ? '#4ade80' : '#fbbf24' }}>
												{op.on_time_rate.toFixed(1)}%
											</td>
										</tr>
									))}
									{!operators.data?.operators.length && (
										<tr>
											<td colSpan={6} style={{ padding: 32, textAlign: 'center', color: '#555' }}>
												No data for this period
											</td>
										</tr>
									)}
								</tbody>
							</table>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
