// (c) Copyright Datacraft, 2026
/**
 * Quality dashboard with statistics and charts.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
	CheckCircle2,
	XCircle,
	AlertTriangle,
	TrendingUp,
	TrendingDown,
	Activity,
	FileWarning,
	RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { QualityStats, RuleSeverity } from '../types';
import { SEVERITY_CONFIG } from '../types';

interface QualityDashboardProps {
	stats: QualityStats;
	onRefresh?: () => void;
	isLoading?: boolean;
}

export function QualityDashboard({
	stats,
	onRefresh,
	isLoading,
}: QualityDashboardProps) {
	const passRate = stats.passRate;
	const trend = stats.trend7d;
	const lastDayTrend =
		trend.length >= 2
			? trend[trend.length - 1].passed / Math.max(trend[trend.length - 1].total, 1) -
			  trend[trend.length - 2].passed / Math.max(trend[trend.length - 2].total, 1)
			: 0;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-display font-semibold text-slate-100">
					Quality Overview
				</h2>
				{onRefresh && (
					<button
						onClick={onRefresh}
						disabled={isLoading}
						className="btn-ghost text-sm"
					>
						<RefreshCw
							className={cn('w-4 h-4', isLoading && 'animate-spin')}
						/>
						Refresh
					</button>
				)}
			</div>

			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
				{/* Pass Rate */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="glass-card p-4"
				>
					<div className="flex items-center justify-between mb-3">
						<span className="text-sm text-slate-400">Pass Rate</span>
						<div
							className={cn(
								'p-2 rounded-lg',
								passRate >= 80
									? 'bg-emerald-500/10 text-emerald-400'
									: passRate >= 60
									? 'bg-yellow-500/10 text-yellow-400'
									: 'bg-red-500/10 text-red-400'
							)}
						>
							{passRate >= 80 ? (
								<CheckCircle2 className="w-5 h-5" />
							) : passRate >= 60 ? (
								<AlertTriangle className="w-5 h-5" />
							) : (
								<XCircle className="w-5 h-5" />
							)}
						</div>
					</div>
					<div className="flex items-end gap-2">
						<span className="text-2xl font-bold text-slate-100">
							{passRate.toFixed(1)}%
						</span>
						{lastDayTrend !== 0 && (
							<span
								className={cn(
									'flex items-center text-sm',
									lastDayTrend > 0 ? 'text-emerald-400' : 'text-red-400'
								)}
							>
								{lastDayTrend > 0 ? (
									<TrendingUp className="w-4 h-4" />
								) : (
									<TrendingDown className="w-4 h-4" />
								)}
								{Math.abs(lastDayTrend * 100).toFixed(1)}%
							</span>
						)}
					</div>
				</motion.div>

				{/* Total Assessments */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.05 }}
					className="glass-card p-4"
				>
					<div className="flex items-center justify-between mb-3">
						<span className="text-sm text-slate-400">Total Assessments</span>
						<div className="p-2 rounded-lg bg-brass-500/10">
							<Activity className="w-5 h-5 text-brass-400" />
						</div>
					</div>
					<div className="text-2xl font-bold text-slate-100">
						{stats.totalAssessments.toLocaleString()}
					</div>
					<div className="mt-1 text-xs text-slate-500">
						{stats.passedCount} passed, {stats.failedCount} failed
					</div>
				</motion.div>

				{/* Average Score */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="glass-card p-4"
				>
					<div className="flex items-center justify-between mb-3">
						<span className="text-sm text-slate-400">Avg Quality Score</span>
						<div className="p-2 rounded-lg bg-purple-500/10">
							<TrendingUp className="w-5 h-5 text-purple-400" />
						</div>
					</div>
					<div className="text-2xl font-bold text-slate-100">
						{stats.avgQualityScore.toFixed(1)}
					</div>
					<div className="mt-2 h-2 bg-slate-700 rounded-full overflow-hidden">
						<div
							className={cn(
								'h-full rounded-full transition-all',
								stats.avgQualityScore >= 80
									? 'bg-emerald-500'
									: stats.avgQualityScore >= 60
									? 'bg-yellow-500'
									: 'bg-red-500'
							)}
							style={{ width: `${stats.avgQualityScore}%` }}
						/>
					</div>
				</motion.div>

				{/* Open Issues */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.15 }}
					className="glass-card p-4"
				>
					<div className="flex items-center justify-between mb-3">
						<span className="text-sm text-slate-400">Open Issues</span>
						<div className="p-2 rounded-lg bg-orange-500/10">
							<FileWarning className="w-5 h-5 text-orange-400" />
						</div>
					</div>
					<div className="text-2xl font-bold text-slate-100">
						{Object.values(stats.issuesBySeverity).reduce((a, b) => a + b, 0)}
					</div>
					<div className="mt-2 flex gap-2">
						{(Object.entries(stats.issuesBySeverity) as [RuleSeverity, number][])
							.filter(([, count]) => count > 0)
							.map(([severity, count]) => (
								<span
									key={severity}
									className={cn(
										'px-2 py-0.5 rounded text-xs',
										SEVERITY_CONFIG[severity].bgColor,
										SEVERITY_CONFIG[severity].color
									)}
								>
									{count} {severity}
								</span>
							))}
					</div>
				</motion.div>
			</div>

			{/* Trend Chart */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="glass-card p-4"
			>
				<h3 className="text-sm font-medium text-slate-200 mb-4">
					7-Day Quality Trend
				</h3>
				<div className="h-48">
					<TrendChart data={trend} />
				</div>
			</motion.div>

			{/* Issues by Metric */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.25 }}
					className="glass-card p-4"
				>
					<h3 className="text-sm font-medium text-slate-200 mb-4">
						Issues by Metric
					</h3>
					<div className="space-y-3">
						{Object.entries(stats.issuesByMetric)
							.sort((a, b) => b[1] - a[1])
							.slice(0, 5)
							.map(([metric, count]) => {
								const total = Object.values(stats.issuesByMetric).reduce(
									(a, b) => a + b,
									0
								);
								const percentage = total > 0 ? (count / total) * 100 : 0;

								return (
									<div key={metric}>
										<div className="flex items-center justify-between mb-1">
											<span className="text-sm text-slate-300 capitalize">
												{metric.replace(/_/g, ' ')}
											</span>
											<span className="text-sm text-slate-400">{count}</span>
										</div>
										<div className="h-2 bg-slate-700 rounded-full overflow-hidden">
											<div
												className="h-full bg-brass-500 rounded-full"
												style={{ width: `${percentage}%` }}
											/>
										</div>
									</div>
								);
							})}
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="glass-card p-4"
				>
					<h3 className="text-sm font-medium text-slate-200 mb-4">
						Issues by Severity
					</h3>
					<div className="space-y-3">
						{(
							['critical', 'error', 'warning', 'info'] as RuleSeverity[]
						).map((severity) => {
							const count = stats.issuesBySeverity[severity] || 0;
							const total = Object.values(stats.issuesBySeverity).reduce(
								(a, b) => a + b,
								0
							);
							const percentage = total > 0 ? (count / total) * 100 : 0;
							const config = SEVERITY_CONFIG[severity];

							return (
								<div key={severity}>
									<div className="flex items-center justify-between mb-1">
										<span className={cn('text-sm', config.color)}>
											{config.label}
										</span>
										<span className="text-sm text-slate-400">{count}</span>
									</div>
									<div className="h-2 bg-slate-700 rounded-full overflow-hidden">
										<div
											className={cn(
												'h-full rounded-full',
												severity === 'critical'
													? 'bg-red-500'
													: severity === 'error'
													? 'bg-red-400'
													: severity === 'warning'
													? 'bg-yellow-500'
													: 'bg-blue-500'
											)}
											style={{ width: `${percentage}%` }}
										/>
									</div>
								</div>
							);
						})}
					</div>
				</motion.div>
			</div>
		</div>
	);
}

// Simple trend chart component
function TrendChart({
	data,
}: {
	data: Array<{ date: string; total: number; passed: number; failed: number }>;
}) {
	if (!data || data.length === 0) {
		return (
			<div className="h-full flex items-center justify-center text-slate-500">
				No data available
			</div>
		);
	}

	const maxTotal = Math.max(...data.map((d) => d.total), 1);

	return (
		<div className="h-full flex items-end gap-2">
			{data.map((day, i) => {
				const passedHeight = (day.passed / maxTotal) * 100;
				const failedHeight = (day.failed / maxTotal) * 100;

				return (
					<div key={day.date} className="flex-1 flex flex-col items-center gap-1">
						<div
							className="w-full flex flex-col-reverse"
							style={{ height: 'calc(100% - 24px)' }}
						>
							<motion.div
								initial={{ height: 0 }}
								animate={{ height: `${passedHeight}%` }}
								transition={{ delay: i * 0.05, duration: 0.3 }}
								className="w-full bg-emerald-500 rounded-t"
								title={`${day.passed} passed`}
							/>
							<motion.div
								initial={{ height: 0 }}
								animate={{ height: `${failedHeight}%` }}
								transition={{ delay: i * 0.05 + 0.1, duration: 0.3 }}
								className="w-full bg-red-500 rounded-t"
								title={`${day.failed} failed`}
							/>
						</div>
						<span className="text-2xs text-slate-500">
							{new Date(day.date).toLocaleDateString('en-US', {
								weekday: 'short',
							})}
						</span>
					</div>
				);
			})}
		</div>
	);
}
