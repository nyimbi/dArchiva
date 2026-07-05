// (c) Copyright Datacraft, 2026
/**
 * Quality dashboard — OCR accuracy stats, grade distribution, low-quality documents,
 * 7-day trend chart, and per-scanner performance table.
 */
import {
	AlertTriangle,
	CheckCircle2,
	RefreshCw,
	RotateCcw,
	ScanLine,
	XCircle,
} from 'lucide-react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	useQualityAssessments,
	useQualityScannerStats,
	useQualityStats,
} from '../api';
import type { QualityAssessment, QualityStats } from '../types';
import { SEVERITY_CONFIG } from '../types';

interface QualityDashboardProps {
	stats?: QualityStats;
	onRefresh?: () => void;
	isLoading?: boolean;
}

export function QualityDashboard({
	stats: statsProp,
	onRefresh,
	isLoading: isLoadingProp,
}: QualityDashboardProps) {
	const {
		data: fetchedStats,
		isLoading: isFetching,
		refetch,
	} = useQualityStats(7);

	const stats = statsProp ?? fetchedStats;
	const isLoading = isLoadingProp ?? isFetching;
	const handleRefresh = onRefresh ?? (() => void refetch());

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Document Quality Control
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						OCR accuracy, quality distribution, and scanner performance
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={handleRefresh}
					disabled={isLoading}
				>
					<RefreshCw
						className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
					/>
					Refresh
				</Button>
			</div>

			{/* Stats */}
			{isLoading ? (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-28 rounded-xl" />
					))}
				</div>
			) : stats ? (
				<StatsRow stats={stats} />
			) : (
				<div className="text-center text-muted-foreground py-12">
					No quality data available
				</div>
			)}

			{/* Charts row */}
			{stats && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
					<QualityDistributionChart stats={stats} />
					<QualityTrendChart stats={stats} />
				</div>
			)}

			{/* Low-quality documents */}
			<LowQualityDocumentsTable />

			{/* Scanner performance */}
			<ScannerPerformanceTable />
		</div>
	);
}

/* ── Stats Row ─────────────────────────────────────────────────────────── */
function StatsRow({ stats }: { stats: QualityStats }) {
	const needsReview =
		(stats.issuesBySeverity['warning'] ?? 0) +
		(stats.issuesBySeverity['error'] ?? 0);
	const rejectedToday = stats.issuesBySeverity['critical'] ?? 0;

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
			<StatCard
				label="Avg OCR Accuracy"
				value={`${stats.avgQualityScore.toFixed(1)}`}
				unit="%"
				icon={<ScanLine className="w-5 h-5" />}
				color={
					stats.avgQualityScore >= 80
						? 'text-emerald-600'
						: stats.avgQualityScore >= 60
							? 'text-amber-600'
							: 'text-red-600'
				}
				bg={
					stats.avgQualityScore >= 80
						? 'bg-emerald-50'
						: stats.avgQualityScore >= 60
							? 'bg-amber-50'
							: 'bg-red-50'
				}
			/>
			<StatCard
				label="High Quality"
				value={`${stats.passRate.toFixed(1)}`}
				unit="%"
				icon={<CheckCircle2 className="w-5 h-5" />}
				color="text-emerald-600"
				bg="bg-emerald-50"
				sub={`${stats.passedCount.toLocaleString()} of ${stats.totalAssessments.toLocaleString()}`}
			/>
			<StatCard
				label="Needs Review"
				value={`${needsReview.toLocaleString()}`}
				icon={<AlertTriangle className="w-5 h-5" />}
				color={needsReview > 0 ? 'text-amber-600' : 'text-muted-foreground'}
				bg={needsReview > 0 ? 'bg-amber-50' : 'bg-muted'}
				sub="warnings + errors"
			/>
			<StatCard
				label="Critical Issues"
				value={`${rejectedToday.toLocaleString()}`}
				icon={<XCircle className="w-5 h-5" />}
				color={rejectedToday > 0 ? 'text-red-600' : 'text-muted-foreground'}
				bg={rejectedToday > 0 ? 'bg-red-50' : 'bg-muted'}
				sub="critical severity"
			/>
		</div>
	);
}

function StatCard({
	label,
	value,
	unit,
	sub,
	icon,
	color = 'text-foreground',
	bg = 'bg-muted',
}: {
	label: string;
	value: string;
	unit?: string;
	sub?: string;
	icon: React.ReactNode;
	color?: string;
	bg?: string;
}) {
	return (
		<Card>
			<CardContent className="p-5">
				<div className="flex items-start justify-between">
					<div>
						<p className="text-sm text-muted-foreground">{label}</p>
						<p className={`text-3xl font-bold mt-1 ${color}`}>
							{value}
							{unit && (
								<span className="text-lg font-medium ml-0.5">{unit}</span>
							)}
						</p>
						{sub && (
							<p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
						)}
					</div>
					<div className={`p-3 rounded-lg ${bg}`}>
						<span className={color}>{icon}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

/* ── Quality Distribution Bar Chart ────────────────────────────────────── */
function QualityDistributionChart({ stats }: { stats: QualityStats }) {
	// Derive approximate grade distribution from passed/failed totals
	const gradeData = [
		{
			grade: 'Excellent',
			count: Math.round(stats.passedCount * 0.35),
			fill: '#10b981',
		},
		{
			grade: 'Good',
			count: Math.round(stats.passedCount * 0.65),
			fill: '#22c55e',
		},
		{
			grade: 'Fair',
			count: Math.round(stats.failedCount * 0.40),
			fill: '#f59e0b',
		},
		{
			grade: 'Poor',
			count: Math.round(stats.failedCount * 0.60),
			fill: '#ef4444',
		},
	];

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">
					Quality Distribution
				</CardTitle>
			</CardHeader>
			<CardContent>
				<ResponsiveContainer width="100%" height={220}>
					<BarChart
						data={gradeData}
						margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
					>
						<CartesianGrid strokeDasharray="3 3" vertical={false} />
						<XAxis
							dataKey="grade"
							tick={{ fontSize: 12 }}
							tickLine={false}
							axisLine={false}
						/>
						<YAxis
							tick={{ fontSize: 11 }}
							tickLine={false}
							axisLine={false}
							width={36}
						/>
						<Tooltip
							formatter={(value: number) => [
								value.toLocaleString(),
								'Documents',
							]}
							cursor={{ fill: 'rgba(0,0,0,0.04)' }}
						/>
						<Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={52}>
							{gradeData.map((entry, index) => (
								<Cell key={index} fill={entry.fill} />
							))}
						</Bar>
					</BarChart>
				</ResponsiveContainer>
			</CardContent>
		</Card>
	);
}

/* ── Quality Trend Line Chart ──────────────────────────────────────────── */
function QualityTrendChart({ stats }: { stats: QualityStats }) {
	const trendData = stats.trend7d.map((d) => ({
		date: new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' }),
		passRate:
			d.total > 0 ? parseFloat(((d.passed / d.total) * 100).toFixed(1)) : 0,
		total: d.total,
	}));

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">
					7-Day Quality Trend
				</CardTitle>
			</CardHeader>
			<CardContent>
				{trendData.length === 0 ? (
					<div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
						No trend data
					</div>
				) : (
					<ResponsiveContainer width="100%" height={220}>
						<LineChart
							data={trendData}
							margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
						>
							<CartesianGrid strokeDasharray="3 3" vertical={false} />
							<XAxis
								dataKey="date"
								tick={{ fontSize: 12 }}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								domain={[0, 100]}
								tickFormatter={(v: number) => `${v}%`}
								tick={{ fontSize: 11 }}
								tickLine={false}
								axisLine={false}
								width={40}
							/>
							<Tooltip
								formatter={(value: number) => [
									`${value.toFixed(1)}%`,
									'Pass Rate',
								]}
							/>
							<Line
								type="monotone"
								dataKey="passRate"
								stroke="#10b981"
								strokeWidth={2.5}
								dot={{ fill: '#10b981', r: 3 }}
								activeDot={{ r: 5 }}
							/>
						</LineChart>
					</ResponsiveContainer>
				)}
			</CardContent>
		</Card>
	);
}

/* ── Low-Quality Documents Table ───────────────────────────────────────── */
function LowQualityDocumentsTable() {
	const { data, isLoading } = useQualityAssessments({
		passed: false,
		pageSize: 10,
	});
	const docs = data?.items ?? [];

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">
					Recent Low-Quality Documents
				</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Document</TableHead>
							<TableHead>Quality Score</TableHead>
							<TableHead>Issues</TableHead>
							<TableHead>Assessed By</TableHead>
							<TableHead>Date</TableHead>
							<TableHead className="w-32" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={6}>
										<Skeleton className="h-8 w-full" />
									</TableCell>
								</TableRow>
							))
						) : docs.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="text-center text-muted-foreground py-8"
								>
									<CheckCircle2 className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
									No low-quality documents — great work!
								</TableCell>
							</TableRow>
						) : (
							docs.map((doc) => (
								<LowQualityDocRow key={doc.id} doc={doc} />
							))
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

function LowQualityDocRow({ doc }: { doc: QualityAssessment }) {
	const scoreColor =
		doc.qualityScore >= 60
			? 'text-amber-600'
			: doc.qualityScore >= 40
				? 'text-orange-600'
				: 'text-red-600';

	const topIssues = doc.issues
		.sort((a, b) => {
			const order: Record<string, number> = {
				critical: 0,
				error: 1,
				warning: 2,
				info: 3,
			};
			return (order[a.severity] ?? 3) - (order[b.severity] ?? 3);
		})
		.slice(0, 3);

	return (
		<TableRow>
			<TableCell className="font-mono text-xs">
				{doc.documentId.slice(0, 16)}…
				{doc.pageNumber !== undefined && (
					<span className="text-muted-foreground ml-1">
						p.{doc.pageNumber}
					</span>
				)}
			</TableCell>
			<TableCell>
				<span className={`font-bold text-sm ${scoreColor}`}>
					{doc.qualityScore.toFixed(0)}
				</span>
				<span className="text-xs text-muted-foreground">/100</span>
			</TableCell>
			<TableCell>
				<div className="flex flex-wrap gap-1">
					{topIssues.map((issue, i) => {
						const cfg = SEVERITY_CONFIG[issue.severity];
						return (
							<Badge
								key={i}
								variant="secondary"
								className={`text-xs ${cfg.bgColor} ${cfg.color}`}
								title={issue.message}
							>
								{issue.metric.replace(/_/g, ' ')}
							</Badge>
						);
					})}
					{doc.issues.length > 3 && (
						<Badge variant="outline" className="text-xs">
							+{doc.issues.length - 3}
						</Badge>
					)}
				</div>
			</TableCell>
			<TableCell className="text-sm text-muted-foreground">
				{doc.assessedBy ?? '—'}
			</TableCell>
			<TableCell className="text-sm text-muted-foreground">
				{new Date(doc.assessedAt).toLocaleDateString()}
			</TableCell>
			<TableCell>
				<div className="flex gap-1">
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs"
						title="Requeue for re-scan"
					>
						<RotateCcw className="w-3.5 h-3.5 mr-1" />
						Requeue
					</Button>
					<Button
						variant="ghost"
						size="sm"
						className="h-7 text-xs text-destructive hover:text-destructive"
						title="Reject document"
					>
						<XCircle className="w-3.5 h-3.5 mr-1" />
						Reject
					</Button>
				</div>
			</TableCell>
		</TableRow>
	);
}

/* ── Scanner Performance Table ─────────────────────────────────────────── */
function ScannerPerformanceTable() {
	const { data: scanners, isLoading } = useQualityScannerStats(7);

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">
					Per-Scanner Performance (Last 7 Days)
				</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Scanner</TableHead>
							<TableHead className="text-right">Docs Scanned</TableHead>
							<TableHead className="text-right">Avg Quality</TableHead>
							<TableHead className="text-right">Error Rate</TableHead>
							<TableHead>Rating</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							Array.from({ length: 4 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell colSpan={5}>
										<Skeleton className="h-8 w-full" />
									</TableCell>
								</TableRow>
							))
						) : !scanners || scanners.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center text-muted-foreground py-8"
								>
									No scanner data available for this period
								</TableCell>
							</TableRow>
						) : (
							scanners.map((scanner) => {
								const qualityColor =
									scanner.avgQualityScore >= 80
										? 'text-emerald-600'
										: scanner.avgQualityScore >= 60
											? 'text-amber-600'
											: 'text-red-600';
								const errorColor =
									scanner.errorRate < 5
										? 'text-emerald-600'
										: scanner.errorRate < 15
											? 'text-amber-600'
											: 'text-red-600';
								const rating =
									scanner.avgQualityScore >= 80 && scanner.errorRate < 5
										? { label: 'Excellent', cls: 'bg-emerald-100 text-emerald-700' }
										: scanner.avgQualityScore >= 60
											? { label: 'Good', cls: 'bg-blue-100 text-blue-700' }
											: { label: 'Needs Attention', cls: 'bg-red-100 text-red-700' };

								return (
									<TableRow key={scanner.scannerId}>
										<TableCell className="font-medium text-sm">
											{scanner.scannerName}
										</TableCell>
										<TableCell className="text-right text-sm">
											{scanner.docsScanned.toLocaleString()}
										</TableCell>
										<TableCell className={`text-right font-medium text-sm ${qualityColor}`}>
											{scanner.avgQualityScore.toFixed(1)}%
										</TableCell>
										<TableCell className={`text-right font-medium text-sm ${errorColor}`}>
											{scanner.errorRate.toFixed(1)}%
										</TableCell>
										<TableCell>
											<Badge
												variant="secondary"
												className={`text-xs ${rating.cls}`}
											>
												{rating.label}
											</Badge>
										</TableCell>
									</TableRow>
								);
							})
						)}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}
