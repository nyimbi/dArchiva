// (c) Copyright Datacraft, 2026
/**
 * Billing cost dashboard — stats, cost breakdown chart, usage table, billing history, plan card.
 */
import {
	ArrowUpDown,
	Bell,
	Download,
	FileText,
	HardDrive,
	RefreshCw,
	Rocket,
	TrendingDown,
	TrendingUp,
	Zap,
} from 'lucide-react';
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { useAlerts, useBillingDashboard, useInvoices } from '../api';
import type { BillingDashboard, InvoiceStatus, InvoiceSummary } from '../types';

/* ── Helpers ───────────────────────────────────────────────────────────── */
function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatCurrency(cents: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(cents / 100);
}

function derivePlan(dashboard: BillingDashboard): string {
	const limitGB = dashboard.storageLimitBytes
		? dashboard.storageLimitBytes / (1024 ** 3)
		: null;
	if (!limitGB) return 'Enterprise';
	if (limitGB <= 10) return 'Free';
	if (limitGB <= 100) return 'Pro';
	return 'Enterprise';
}

function projectedMonthlyCents(currentCents: number): number {
	const now = new Date();
	const daysInMonth = new Date(
		now.getFullYear(),
		now.getMonth() + 1,
		0,
	).getDate();
	const daysElapsed = Math.max(now.getDate(), 1);
	return Math.round((currentCents / daysElapsed) * daysInMonth);
}

const STATUS_STYLE: Record<
	InvoiceStatus,
	{ label: string; className: string }
> = {
	draft: { label: 'Draft', className: 'bg-gray-100 text-gray-600' },
	pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
	sent: { label: 'Sent', className: 'bg-blue-100 text-blue-700' },
	paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700' },
	overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700' },
	cancelled: { label: 'Cancelled', className: 'bg-gray-100 text-gray-500' },
	refunded: { label: 'Refunded', className: 'bg-purple-100 text-purple-700' },
};

/* ── Main component ────────────────────────────────────────────────────── */
export function CostDashboard() {
	const {
		data: dashboard,
		isLoading,
		refetch,
	} = useBillingDashboard();
	const { data: invoices } = useInvoices();

	return (
		<div className="space-y-6 p-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						Billing &amp; Cost Management
					</h1>
					<p className="text-sm text-muted-foreground mt-1">
						Monitor spend, resource usage, and invoices
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => void refetch()}
				>
					<RefreshCw className="w-4 h-4 mr-2" />
					Refresh
				</Button>
			</div>

			{/* Stats row */}
			{isLoading ? (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					{Array.from({ length: 4 }).map((_, i) => (
						<Skeleton key={i} className="h-28 rounded-xl" />
					))}
				</div>
			) : dashboard ? (
				<StatsRow dashboard={dashboard} />
			) : null}

			{/* Cost breakdown + Plan */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2">
					{isLoading ? (
						<Skeleton className="h-72 rounded-xl" />
					) : dashboard ? (
						<CostBreakdownChart dashboard={dashboard} />
					) : null}
				</div>
				<div>
					{isLoading ? (
						<Skeleton className="h-72 rounded-xl" />
					) : dashboard ? (
						<PlanCard dashboard={dashboard} />
					) : null}
				</div>
			</div>

			{/* Usage table */}
			{isLoading ? (
				<Skeleton className="h-48 rounded-xl" />
			) : dashboard ? (
				<UsageTable dashboard={dashboard} />
			) : null}

			{/* Billing history */}
			<BillingHistoryTable invoices={invoices ?? []} />
		</div>
	);
}

/* ── Stats Row ─────────────────────────────────────────────────────────── */
function StatsRow({ dashboard }: { dashboard: BillingDashboard }) {
	const projected = projectedMonthlyCents(dashboard.currentMonthCostCents);
	const storageCost = (dashboard.costByService as Record<string, number>)['storage'] ?? 0;
	const apiCost = (dashboard.costByService as Record<string, number>)['api_calls'] ?? 0;
	const up = dashboard.costChangePercentage > 0;

	return (
		<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
			<StatCard
				label="Current Month Spend"
				value={formatCurrency(dashboard.currentMonthCostCents)}
				sub={
					<span className={`flex items-center gap-1 text-xs ${up ? 'text-red-600' : 'text-emerald-600'}`}>
						{up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
						{Math.abs(dashboard.costChangePercentage).toFixed(1)}% vs last month
					</span>
				}
				icon={<span className="text-lg font-bold">$</span>}
				bg="bg-blue-50"
				color="text-blue-600"
			/>
			<StatCard
				label="Projected Monthly"
				value={formatCurrency(projected)}
				icon={<TrendingUp className="w-5 h-5" />}
				bg="bg-purple-50"
				color="text-purple-600"
			/>
			<StatCard
				label="Storage Cost"
				value={formatCurrency(storageCost)}
				icon={<HardDrive className="w-5 h-5" />}
				sub={<span className="text-xs text-muted-foreground">{formatBytes(dashboard.currentStorageBytes)}</span>}
				bg="bg-amber-50"
				color="text-amber-600"
			/>
			<StatCard
				label="API Call Cost"
				value={formatCurrency(apiCost)}
				icon={<Zap className="w-5 h-5" />}
				bg="bg-emerald-50"
				color="text-emerald-600"
			/>
		</div>
	);
}

function StatCard({
	label,
	value,
	sub,
	icon,
	color = 'text-foreground',
	bg = 'bg-muted',
}: {
	label: string;
	value: string;
	sub?: React.ReactNode;
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
						<p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
						{sub && <div className="mt-1">{sub}</div>}
					</div>
					<div className={`p-3 rounded-lg ${bg}`}>
						<span className={color}>{icon}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

/* ── Cost Breakdown Chart ──────────────────────────────────────────────── */
function CostBreakdownChart({ dashboard }: { dashboard: BillingDashboard }) {
	const data = Object.entries(dashboard.costByService as Record<string, number>)
		.filter(([, v]) => v > 0)
		.map(([key, cents]) => ({
			name: key
				.replace(/_/g, ' ')
				.replace(/\b\w/g, (l) => l.toUpperCase()),
			cost: parseFloat((cents / 100).toFixed(2)),
		}))
		.sort((a, b) => b.cost - a.cost);

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">Cost Breakdown by Category</CardTitle>
			</CardHeader>
			<CardContent>
				{data.length === 0 ? (
					<div className="h-56 flex items-center justify-center text-muted-foreground text-sm">
						No cost data for this period
					</div>
				) : (
					<ResponsiveContainer width="100%" height={220}>
						<BarChart
							data={data}
							margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
						>
							<CartesianGrid strokeDasharray="3 3" vertical={false} />
							<XAxis
								dataKey="name"
								tick={{ fontSize: 11 }}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								tickFormatter={(v: number) => `$${v}`}
								tick={{ fontSize: 11 }}
								tickLine={false}
								axisLine={false}
								width={48}
							/>
							<Tooltip
								formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']}
								cursor={{ fill: 'rgba(0,0,0,0.04)' }}
							/>
							<Bar
								dataKey="cost"
								fill="#3b82f6"
								radius={[4, 4, 0, 0]}
								maxBarSize={56}
							/>
						</BarChart>
					</ResponsiveContainer>
				)}
			</CardContent>
		</Card>
	);
}

/* ── Plan Card ─────────────────────────────────────────────────────────── */
function PlanCard({ dashboard }: { dashboard: BillingDashboard }) {
	const plan = derivePlan(dashboard);
	const storageLimitStr = dashboard.storageLimitBytes
		? formatBytes(dashboard.storageLimitBytes)
		: 'Unlimited';

	const planColors: Record<string, string> = {
		Free: 'text-gray-600',
		Pro: 'text-blue-600',
		Enterprise: 'text-purple-600',
	};

	return (
		<Card className="h-full flex flex-col">
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">Current Plan</CardTitle>
			</CardHeader>
			<CardContent className="flex flex-col flex-1 gap-4">
				<div className="flex items-center gap-3">
					<Rocket className={`w-8 h-8 ${planColors[plan] ?? 'text-foreground'}`} />
					<div>
						<p className={`text-2xl font-bold ${planColors[plan] ?? ''}`}>{plan}</p>
						<p className="text-xs text-muted-foreground capitalize">
							{plan === 'Free' ? 'Free tier' : `${plan} subscription`}
						</p>
					</div>
				</div>

				<Separator />

				<div className="space-y-2 text-sm flex-1">
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Storage limit</span>
						<span className="font-medium">{storageLimitStr}</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Used storage</span>
						<span className="font-medium">
							{formatBytes(dashboard.currentStorageBytes)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Pending invoices</span>
						<span className={`font-medium ${dashboard.overdueInvoices > 0 ? 'text-red-600' : ''}`}>
							{dashboard.pendingInvoices}
							{dashboard.overdueInvoices > 0 && ` (${dashboard.overdueInvoices} overdue)`}
						</span>
					</div>
				</div>

				{plan !== 'Enterprise' && (
					<Button className="w-full" size="sm">
						Upgrade Plan
					</Button>
				)}
			</CardContent>
		</Card>
	);
}

/* ── Usage Table ───────────────────────────────────────────────────────── */
function UsageTable({ dashboard }: { dashboard: BillingDashboard }) {
	const costByService = dashboard.costByService as Record<string, number>;

	const rows = [
		{
			resource: 'Storage',
			usage: formatBytes(dashboard.currentStorageBytes),
			limit: dashboard.storageLimitBytes
				? formatBytes(dashboard.storageLimitBytes)
				: '—',
			cost: formatCurrency(costByService['storage'] ?? 0),
			icon: <HardDrive className="w-4 h-4" />,
		},
		{
			resource: 'Data Transfer (Out)',
			usage: formatBytes(dashboard.currentTransferBytes),
			limit: dashboard.transferLimitBytes
				? formatBytes(dashboard.transferLimitBytes)
				: '—',
			cost: formatCurrency(costByService['transfer_out'] ?? 0),
			icon: <ArrowUpDown className="w-4 h-4" />,
		},
		{
			resource: 'API Calls',
			usage: (costByService['api_calls'] !== undefined ? '–' : '–'),
			limit: '—',
			cost: formatCurrency(costByService['api_calls'] ?? 0),
			icon: <Zap className="w-4 h-4" />,
		},
		{
			resource: 'Active Alerts',
			usage: `${dashboard.activeAlerts}`,
			limit: '—',
			cost: '—',
			icon: <Bell className="w-4 h-4" />,
		},
	];

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">Resource Usage This Month</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Resource</TableHead>
							<TableHead>Usage</TableHead>
							<TableHead>Limit</TableHead>
							<TableHead className="text-right">Cost</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.map((row) => (
							<TableRow key={row.resource}>
								<TableCell>
									<div className="flex items-center gap-2 text-sm font-medium">
										<span className="text-muted-foreground">{row.icon}</span>
										{row.resource}
									</div>
								</TableCell>
								<TableCell className="text-sm">{row.usage}</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{row.limit}
								</TableCell>
								<TableCell className="text-sm text-right font-medium">
									{row.cost}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
}

/* ── Billing History ───────────────────────────────────────────────────── */
function BillingHistoryTable({
	invoices,
}: {
	invoices: InvoiceSummary[];
}) {
	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="text-sm font-medium">Billing History</CardTitle>
			</CardHeader>
			<CardContent className="p-0">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Invoice</TableHead>
							<TableHead>Period</TableHead>
							<TableHead>Amount</TableHead>
							<TableHead>Status</TableHead>
							<TableHead className="w-28" />
						</TableRow>
					</TableHeader>
					<TableBody>
						{invoices.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-center text-muted-foreground py-8"
								>
									<FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
									No invoices yet
								</TableCell>
							</TableRow>
						) : (
							invoices.slice(0, 10).map((invoice) => {
								const statusCfg =
									STATUS_STYLE[invoice.status] ?? STATUS_STYLE['draft'];
								return (
									<TableRow key={invoice.id}>
										<TableCell className="font-mono text-xs">
											{invoice.invoiceNumber}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{new Date(invoice.periodStart).toLocaleDateString()} –{' '}
											{new Date(invoice.periodEnd).toLocaleDateString()}
										</TableCell>
										<TableCell className="font-medium text-sm">
											{formatCurrency(invoice.totalCents)}
											{invoice.balanceDueCents > 0 && (
												<span className="ml-1 text-xs text-red-600">
													(due: {formatCurrency(invoice.balanceDueCents)})
												</span>
											)}
										</TableCell>
										<TableCell>
											<Badge
												variant="secondary"
												className={`text-xs ${statusCfg.className}`}
											>
												{statusCfg.label}
											</Badge>
										</TableCell>
										<TableCell>
											<Button
												variant="ghost"
												size="sm"
												className="h-7 text-xs"
												asChild
											>
												<a
													href={`/api/billing/invoices/${invoice.id}/pdf`}
													target="_blank"
													rel="noopener noreferrer"
												>
													<Download className="w-3.5 h-3.5 mr-1" />
													PDF
												</a>
											</Button>
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
