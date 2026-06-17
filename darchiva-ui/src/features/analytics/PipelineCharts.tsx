// (c) Copyright Datacraft, 2026
import {
	BarChart,
	Bar,
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useIngestMetrics, useClassificationAccuracy, useStorageByType } from './pipelineHooks';

// ─────────────────────────── Helpers ─────────────────────────

function formatBytes(bytes: number): string {
	if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
	if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
	if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`;
	return `${bytes} B`;
}

function ChartSkeleton() {
	return (
		<div className="flex flex-col gap-2 pt-2">
			<Skeleton className="h-4 w-1/3" />
			<Skeleton className="h-[240px] w-full" />
		</div>
	);
}

// ─────────────────────────── Ingest Rate ─────────────────────

function IngestRateChart() {
	const { data, isLoading } = useIngestMetrics(30);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">Document Ingestion Rate (last 30 days)</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading || !data ? (
					<ChartSkeleton />
				) : (
					<ResponsiveContainer width="100%" height={240}>
						<BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
							<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
							<XAxis
								dataKey="date"
								tick={{ fontSize: 11 }}
								tickFormatter={(v: string) => v.slice(5)}
							/>
							<YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
							<Tooltip
								labelFormatter={(label: string) => `Date: ${label}`}
								formatter={(value: number) => [value, 'Documents']}
							/>
							<Bar dataKey="count" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} />
						</BarChart>
					</ResponsiveContainer>
				)}
			</CardContent>
		</Card>
	);
}

// ─────────────────────────── Classification Accuracy ─────────

function ClassificationAccuracyChart() {
	const { data, isLoading } = useClassificationAccuracy(30);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">Classification Accuracy Trend (last 30 days)</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading || !data ? (
					<ChartSkeleton />
				) : (
					<ResponsiveContainer width="100%" height={240}>
						<LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
							<CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
							<XAxis
								dataKey="date"
								tick={{ fontSize: 11 }}
								tickFormatter={(v: string) => v.slice(5)}
							/>
							<YAxis
								tick={{ fontSize: 11 }}
								domain={[0, 100]}
								tickFormatter={(v: number) => `${v}%`}
							/>
							<Tooltip
								labelFormatter={(label: string) => `Date: ${label}`}
								formatter={(value: number, name: string) =>
									name === 'accuracy' ? [`${value.toFixed(1)}%`, 'Accuracy'] : [value, 'Total']
								}
							/>
							<Line
								type="monotone"
								dataKey="accuracy"
								stroke="hsl(var(--primary))"
								strokeWidth={2}
								dot={false}
								activeDot={{ r: 4 }}
							/>
							<Line
								type="monotone"
								dataKey="total"
								stroke="hsl(var(--muted-foreground))"
								strokeWidth={1}
								strokeDasharray="4 2"
								dot={false}
								yAxisId={0}
							/>
						</LineChart>
					</ResponsiveContainer>
				)}
			</CardContent>
		</Card>
	);
}

// ─────────────────────────── Storage by Type ─────────────────

function StorageByTypeChart() {
	const { data, isLoading } = useStorageByType();

	// recharts horizontal bar needs layout="vertical"; normalise for display
	const chartData = data?.map((d) => ({
		...d,
		size_mb: +(d.size_bytes / 1e6).toFixed(2),
	}));

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-sm font-medium">Storage by Document Type</CardTitle>
			</CardHeader>
			<CardContent>
				{isLoading || !chartData ? (
					<ChartSkeleton />
				) : (
					<ResponsiveContainer width="100%" height={240}>
						<BarChart
							layout="vertical"
							data={chartData}
							margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
						>
							<CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
							<XAxis
								type="number"
								tick={{ fontSize: 11 }}
								tickFormatter={(v: number) => formatBytes(v * 1e6)}
							/>
							<YAxis
								type="category"
								dataKey="document_type"
								tick={{ fontSize: 11 }}
								width={90}
							/>
							<Tooltip
								formatter={(value: number) => [formatBytes(value * 1e6), 'Size']}
								labelFormatter={(label: string) => `Type: ${label}`}
							/>
							<Bar dataKey="size_mb" fill="hsl(var(--primary))" radius={[0, 2, 2, 0]} />
						</BarChart>
					</ResponsiveContainer>
				)}
			</CardContent>
		</Card>
	);
}

// ─────────────────────────── Composite ───────────────────────

export function PipelineCharts() {
	return (
		<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
			<IngestRateChart />
			<ClassificationAccuracyChart />
			<StorageByTypeChart />
		</div>
	);
}
