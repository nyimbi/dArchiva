// (c) Copyright Datacraft, 2026
/**
 * Billing cost dashboard with usage charts and alerts.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
	DollarSign,
	TrendingUp,
	TrendingDown,
	HardDrive,
	ArrowUpDown,
	Bell,
	AlertTriangle,
	FileText,
	Clock,
	RefreshCw,
	Plus,
	ChevronRight,
	BarChart3,
} from 'lucide-react';
import { useBillingDashboard, useAlerts, useInvoices } from '../api';
import type { UsageAlert, InvoiceSummary, AlertStatus, InvoiceStatus } from '../types';

function formatBytes(bytes: number): string {
	if (bytes === 0) return '0 B';
	const k = 1024;
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatCurrency(cents: number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
	}).format(cents / 100);
}

const alertStatusConfig: Record<AlertStatus, { color: string; bg: string }> = {
	active: { color: 'text-emerald-600', bg: 'bg-emerald-100' },
	triggered: { color: 'text-red-600', bg: 'bg-red-100' },
	resolved: { color: 'text-gray-600', bg: 'bg-gray-100' },
	disabled: { color: 'text-gray-400', bg: 'bg-gray-50' },
};

const invoiceStatusConfig: Record<InvoiceStatus, { color: string; bg: string }> = {
	draft: { color: 'text-gray-600', bg: 'bg-gray-100' },
	pending: { color: 'text-amber-600', bg: 'bg-amber-100' },
	sent: { color: 'text-blue-600', bg: 'bg-blue-100' },
	paid: { color: 'text-emerald-600', bg: 'bg-emerald-100' },
	overdue: { color: 'text-red-600', bg: 'bg-red-100' },
	cancelled: { color: 'text-gray-500', bg: 'bg-gray-100' },
	refunded: { color: 'text-purple-600', bg: 'bg-purple-100' },
};

function StatCard({
	label,
	value,
	subValue,
	icon: Icon,
	trend,
	color = 'text-gray-900',
}: {
	label: string;
	value: string;
	subValue?: string;
	icon: React.ElementType;
	trend?: { value: number; isPositive: boolean };
	color?: string;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="bg-white rounded-xl border border-gray-200 p-6"
		>
			<div className="flex items-start justify-between">
				<div>
					<p className="text-sm text-gray-500 font-medium">{label}</p>
					<p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
					{subValue && (
						<p className="text-sm text-gray-400 mt-1">{subValue}</p>
					)}
					{trend && (
						<div className="flex items-center mt-2 text-sm">
							{trend.isPositive ? (
								<TrendingUp className="w-4 h-4 mr-1 text-red-500" />
							) : (
								<TrendingDown className="w-4 h-4 mr-1 text-emerald-500" />
							)}
							<span
								className={
									trend.isPositive ? 'text-red-600' : 'text-emerald-600'
								}
							>
								{Math.abs(trend.value).toFixed(1)}% vs last month
							</span>
						</div>
					)}
				</div>
				<div className="p-3 bg-gray-100 rounded-lg">
					<Icon className="w-6 h-6 text-gray-600" />
				</div>
			</div>
		</motion.div>
	);
}

function UsageBar({
	label,
	current,
	limit,
	unit,
}: {
	label: string;
	current: number;
	limit: number | null;
	unit: string;
}) {
	const percentage = limit ? Math.min((current / limit) * 100, 100) : 0;
	const isWarning = percentage >= 80;
	const isDanger = percentage >= 95;

	return (
		<div className="space-y-2">
			<div className="flex items-center justify-between text-sm">
				<span className="font-medium text-gray-700">{label}</span>
				<span className="text-gray-500">
					{formatBytes(current)} {limit ? `/ ${formatBytes(limit)}` : ''}
				</span>
			</div>
			{limit && (
				<div className="h-2 bg-gray-200 rounded-full overflow-hidden">
					<motion.div
						initial={{ width: 0 }}
						animate={{ width: `${percentage}%` }}
						className={`h-full rounded-full ${
							isDanger
								? 'bg-red-500'
								: isWarning
									? 'bg-amber-500'
									: 'bg-blue-500'
						}`}
					/>
				</div>
			)}
		</div>
	);
}

function AlertCard({ alert }: { alert: UsageAlert }) {
	const config = alertStatusConfig[alert.status];

	return (
		<div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg">
			<div className="flex items-center gap-3">
				<div className={`p-2 rounded-lg ${config.bg}`}>
					<Bell className={`w-4 h-4 ${config.color}`} />
				</div>
				<div>
					<p className="font-medium text-gray-900">{alert.name}</p>
					<p className="text-sm text-gray-500">
						{alert.percentageUsed.toFixed(0)}% of{' '}
						{alert.thresholdValue} {alert.thresholdUnit}
					</p>
				</div>
			</div>
			<span
				className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.color}`}
			>
				{alert.status}
			</span>
		</div>
	);
}

function InvoiceRow({ invoice }: { invoice: InvoiceSummary }) {
	const config = invoiceStatusConfig[invoice.status];

	return (
		<div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors cursor-pointer">
			<div className="flex items-center gap-4">
				<div className="p-2 bg-gray-100 rounded-lg">
					<FileText className="w-5 h-5 text-gray-600" />
				</div>
				<div>
					<p className="font-medium text-gray-900">{invoice.invoiceNumber}</p>
					<p className="text-sm text-gray-500">
						{new Date(invoice.periodStart).toLocaleDateString()} -{' '}
						{new Date(invoice.periodEnd).toLocaleDateString()}
					</p>
				</div>
			</div>
			<div className="flex items-center gap-4">
				<div className="text-right">
					<p className="font-semibold text-gray-900">
						{formatCurrency(invoice.totalCents)}
					</p>
					{invoice.balanceDueCents > 0 && (
						<p className="text-sm text-red-600">
							Due: {formatCurrency(invoice.balanceDueCents)}
						</p>
					)}
				</div>
				<span
					className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.color}`}
				>
					{invoice.status}
				</span>
				<ChevronRight className="w-4 h-4 text-gray-400" />
			</div>
		</div>
	);
}

function CostChart({
	data,
}: {
	data: Array<{ date: string; costCents: number }>;
}) {
	const maxCost = Math.max(...data.map((d) => d.costCents), 1);

	return (
		<div className="h-48 flex items-end gap-1">
			{data.map((day, i) => {
				const height = (day.costCents / maxCost) * 100;
				return (
					<motion.div
						key={day.date}
						initial={{ height: 0 }}
						animate={{ height: `${height}%` }}
						transition={{ delay: i * 0.02 }}
						className="flex-1 bg-blue-500 rounded-t hover:bg-blue-600 cursor-pointer transition-colors"
						title={`${day.date}: ${formatCurrency(day.costCents)}`}
					/>
				);
			})}
		</div>
	);
}

export function CostDashboard() {
	const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = useBillingDashboard();
	const { data: alerts } = useAlerts('active');
	const { data: invoices } = useInvoices();

	const triggeredAlerts = alerts?.filter((a) => a.status === 'triggered') || [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900">
						Billing & Usage
					</h1>
					<p className="text-gray-500 mt-1">
						Monitor costs, usage, and manage invoices
					</p>
				</div>
				<div className="flex items-center gap-3">
					<button
						onClick={() => refetchDashboard()}
						className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
					>
						<RefreshCw className="w-5 h-5" />
					</button>
					<button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
						<Plus className="w-4 h-4" />
						New Alert
					</button>
				</div>
			</div>

			{/* Triggered Alerts Banner */}
			{triggeredAlerts.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4"
				>
					<div className="p-2 bg-red-100 rounded-lg">
						<AlertTriangle className="w-5 h-5 text-red-600" />
					</div>
					<div className="flex-1">
						<p className="font-medium text-red-800">
							{triggeredAlerts.length} alert
							{triggeredAlerts.length > 1 ? 's' : ''} triggered
						</p>
						<p className="text-sm text-red-600">
							{triggeredAlerts.map((a) => a.name).join(', ')}
						</p>
					</div>
					<button className="text-red-600 hover:text-red-700 font-medium">
						View All
					</button>
				</motion.div>
			)}

			{/* Stats Grid */}
			{dashboardLoading ? (
				<div className="grid grid-cols-4 gap-4">
					{[...Array(4)].map((_, i) => (
						<div
							key={i}
							className="h-32 bg-gray-100 rounded-xl animate-pulse"
						/>
					))}
				</div>
			) : dashboard ? (
				<div className="grid grid-cols-4 gap-4">
					<StatCard
						label="This Month"
						value={formatCurrency(dashboard.currentMonthCostCents)}
						icon={DollarSign}
						trend={{
							value: dashboard.costChangePercentage,
							isPositive: dashboard.costChangePercentage > 0,
						}}
					/>
					<StatCard
						label="Storage Used"
						value={formatBytes(dashboard.currentStorageBytes)}
						subValue={
							dashboard.storageLimitBytes
								? `of ${formatBytes(dashboard.storageLimitBytes)}`
								: undefined
						}
						icon={HardDrive}
					/>
					<StatCard
						label="Data Transfer"
						value={formatBytes(dashboard.currentTransferBytes)}
						icon={ArrowUpDown}
					/>
					<StatCard
						label="Active Alerts"
						value={dashboard.activeAlerts.toString()}
						subValue={
							dashboard.triggeredAlerts > 0
								? `${dashboard.triggeredAlerts} triggered`
								: undefined
						}
						icon={Bell}
						color={
							dashboard.triggeredAlerts > 0
								? 'text-red-600'
								: 'text-gray-900'
						}
					/>
				</div>
			) : null}

			{/* Cost Chart and Usage */}
			<div className="grid grid-cols-3 gap-6">
				{/* Cost Chart */}
				<div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
					<div className="flex items-center justify-between mb-6">
						<div>
							<h2 className="text-lg font-semibold text-gray-900">
								Daily Costs
							</h2>
							<p className="text-sm text-gray-500">Current billing period</p>
						</div>
						<button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
							<BarChart3 className="w-4 h-4" />
							View Details
						</button>
					</div>
					{dashboard?.dailyCosts && dashboard.dailyCosts.length > 0 ? (
						<CostChart data={dashboard.dailyCosts} />
					) : (
						<div className="h-48 flex items-center justify-center text-gray-400">
							No cost data available
						</div>
					)}
				</div>

				{/* Usage Breakdown */}
				<div className="bg-white rounded-xl border border-gray-200 p-6">
					<h2 className="text-lg font-semibold text-gray-900 mb-6">
						Resource Usage
					</h2>
					<div className="space-y-6">
						{dashboard && (
							<>
								<UsageBar
									label="Storage"
									current={dashboard.currentStorageBytes}
									limit={dashboard.storageLimitBytes}
									unit="bytes"
								/>
								<UsageBar
									label="Transfer"
									current={dashboard.currentTransferBytes}
									limit={dashboard.transferLimitBytes}
									unit="bytes"
								/>
							</>
						)}
					</div>
				</div>
			</div>

			{/* Alerts and Invoices */}
			<div className="grid grid-cols-2 gap-6">
				{/* Alerts */}
				<div className="bg-white rounded-xl border border-gray-200 p-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-gray-900">
							Usage Alerts
						</h2>
						<button className="text-sm text-blue-600 hover:text-blue-700">
							Manage
						</button>
					</div>
					<div className="space-y-3">
						{alerts && alerts.length > 0 ? (
							alerts.slice(0, 4).map((alert) => (
								<AlertCard key={alert.id} alert={alert} />
							))
						) : (
							<div className="text-center py-8 text-gray-400">
								<Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
								<p>No alerts configured</p>
							</div>
						)}
					</div>
				</div>

				{/* Invoices */}
				<div className="bg-white rounded-xl border border-gray-200 p-6">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-lg font-semibold text-gray-900">
							Recent Invoices
						</h2>
						<button className="text-sm text-blue-600 hover:text-blue-700">
							View All
						</button>
					</div>
					<div className="space-y-3">
						{invoices && invoices.length > 0 ? (
							invoices.slice(0, 4).map((invoice) => (
								<InvoiceRow key={invoice.id} invoice={invoice} />
							))
						) : (
							<div className="text-center py-8 text-gray-400">
								<FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
								<p>No invoices yet</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
