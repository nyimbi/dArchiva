// (c) Copyright Datacraft, 2026
/**
 * SLA Dashboard component for workflow compliance monitoring.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
	acknowledgeSLAAlert,
	getSLADashboard,
	type SLAAlert,
} from '../api';

interface SLADashboardProps {
	className?: string;
}

type PeriodOption = 7 | 30 | 90;

export function SLADashboard({ className }: SLADashboardProps) {
	const [periodDays, setPeriodDays] = useState<PeriodOption>(30);
	const queryClient = useQueryClient();

	const { data: dashboard, isLoading, isError } = useQuery({
		queryKey: ['sla-dashboard', periodDays],
		queryFn: () => getSLADashboard(periodDays),
		refetchInterval: 60000,
	});

	const acknowledgeMutation = useMutation({
		mutationFn: (alertId: string) => acknowledgeSLAAlert(alertId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sla-dashboard'] });
			queryClient.invalidateQueries({ queryKey: ['sla-alerts'] });
			toast.success('SLA alert acknowledged');
		},
		onError: () => {
			toast.error('Failed to acknowledge SLA alert');
		},
	});

	if (isLoading) {
		return (
			<Card className={cn('border-slate-800 bg-slate-900/80 text-slate-200 shadow-none', className)}>
				<CardContent className="p-8">
					<div className="flex items-center justify-center gap-2 text-sm text-slate-400">
						<Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
						Loading SLA dashboard...
					</div>
				</CardContent>
			</Card>
		);
	}

	if (isError) {
		return (
			<Card className={cn('border-red-500/30 bg-red-500/10 text-red-300 shadow-none', className)}>
				<CardContent className="flex items-center justify-center gap-2 p-8 text-sm">
					<AlertCircle className="h-5 w-5" />
					Failed to load SLA dashboard.
				</CardContent>
			</Card>
		);
	}

	if (!dashboard) {
		return null;
	}

	const { stats, recent_alerts, recent_metrics } = dashboard;

	return (
		<div className={cn('space-y-4', className)}>
			<Card className="border-slate-800 bg-slate-900/80 text-slate-200 shadow-none">
				<CardHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b border-slate-800 p-4">
					<div className="space-y-1">
						<CardTitle className="text-lg text-slate-100">SLA Compliance Dashboard</CardTitle>
						<p className="text-sm text-slate-400">Deadline monitoring and compliance health</p>
					</div>
					<div className="flex items-center gap-2">
						<label className="text-sm text-slate-400">Period</label>
						<select
							value={periodDays}
							onChange={event => setPeriodDays(Number(event.target.value) as PeriodOption)}
							className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
						>
							<option value={7}>Last 7 days</option>
							<option value={30}>Last 30 days</option>
							<option value={90}>Last 90 days</option>
						</select>
					</div>
				</CardHeader>

				<CardContent className="space-y-4 p-4">
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
						<StatCard
							label="Compliance Rate"
							value={`${stats.compliance_rate.toFixed(1)}%`}
							variant={stats.compliance_rate >= 90 ? 'success' : stats.compliance_rate >= 70 ? 'warning' : 'danger'}
						/>
						<StatCard label="Total Tasks" value={stats.total_tasks} variant="neutral" />
						<StatCard label="On Track" value={stats.on_track} variant="success" />
						<StatCard label="Warning" value={stats.warning} variant="warning" />
						<StatCard label="Breached" value={stats.breached} variant="danger" />
					</div>

					<Card className="border-slate-800 bg-slate-950/70 shadow-none">
						<CardHeader className="p-4 pb-2">
							<CardTitle className="text-base text-slate-100">Compliance Overview</CardTitle>
						</CardHeader>
						<CardContent className="p-4 pt-2">
							<ComplianceGauge
								onTrack={stats.on_track}
								warning={stats.warning}
								breached={stats.breached}
							/>
						</CardContent>
					</Card>
				</CardContent>
			</Card>

			<div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
				<Card className="border-slate-800 bg-slate-900/80 text-slate-200 shadow-none">
					<CardHeader className="p-4">
						<CardTitle className="text-base text-slate-100">
							Recent Alerts ({recent_alerts.filter(alert => !alert.acknowledged).length} unacknowledged)
						</CardTitle>
					</CardHeader>
					<CardContent className="p-4 pt-0">
						{recent_alerts.length === 0 ? (
							<p className="rounded-md border border-dashed border-slate-700 py-8 text-center text-sm text-slate-500">
								No recent alerts
							</p>
						) : (
							<ul className="space-y-2">
								{recent_alerts.map(alert => (
									<AlertItem
										key={alert.id}
										alert={alert}
										onAcknowledge={() => acknowledgeMutation.mutate(alert.id)}
										isAcknowledging={acknowledgeMutation.isPending}
									/>
								))}
							</ul>
						)}
					</CardContent>
				</Card>

				<Card className="border-slate-800 bg-slate-900/80 text-slate-200 shadow-none">
					<CardHeader className="p-4">
						<CardTitle className="text-base text-slate-100">Recent Task Metrics</CardTitle>
					</CardHeader>
					<CardContent className="p-4 pt-0">
						{recent_metrics.length === 0 ? (
							<p className="rounded-md border border-dashed border-slate-700 py-8 text-center text-sm text-slate-500">
								No recent metrics
							</p>
						) : (
							<div className="overflow-x-auto rounded-md border border-slate-800">
								<table className="min-w-full divide-y divide-slate-800 text-sm">
									<thead className="bg-slate-950/80 text-xs uppercase tracking-wide text-slate-500">
										<tr>
											<th className="px-3 py-2 text-left">Step Type</th>
											<th className="px-3 py-2 text-left">Started</th>
											<th className="px-3 py-2 text-left">Duration</th>
											<th className="px-3 py-2 text-left">Target</th>
											<th className="px-3 py-2 text-left">Status</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-800">
										{recent_metrics.map(metric => (
											<tr key={metric.id} className="hover:bg-slate-800/40">
												<td className="px-3 py-2 text-slate-200">{metric.step_type || 'N/A'}</td>
												<td className="px-3 py-2 text-slate-400">{formatDate(metric.started_at)}</td>
												<td className="px-3 py-2 text-slate-400">{formatDuration(metric.duration_seconds)}</td>
												<td className="px-3 py-2 text-slate-400">{formatDuration(metric.target_seconds)}</td>
												<td className="px-3 py-2">
													<StatusBadge status={metric.sla_status} />
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

interface StatCardProps {
	label: string;
	value: string | number;
	variant: 'success' | 'warning' | 'danger' | 'neutral';
}

function StatCard({ label, value, variant }: StatCardProps) {
	const variantClasses = {
		success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
		warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
		danger: 'border-red-500/30 bg-red-500/10 text-red-300',
		neutral: 'border-slate-700 bg-slate-950/70 text-slate-300',
	};

	return (
		<Card className={cn('shadow-none', variantClasses[variant])}>
			<CardContent className="p-4">
				<span className="block text-2xl font-semibold">{value}</span>
				<span className="mt-1 block text-xs uppercase tracking-wide text-slate-400">{label}</span>
			</CardContent>
		</Card>
	);
}

interface ComplianceGaugeProps {
	onTrack: number;
	warning: number;
	breached: number;
}

function ComplianceGauge({ onTrack, warning, breached }: ComplianceGaugeProps) {
	const total = onTrack + warning + breached;
	if (total === 0) {
		return <div className="rounded-md border border-dashed border-slate-700 py-8 text-center text-sm text-slate-500">No data</div>;
	}

	const onTrackPercent = (onTrack / total) * 100;
	const warningPercent = (warning / total) * 100;
	const breachedPercent = (breached / total) * 100;

	return (
		<div className="space-y-3">
			<div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
				<div className="bg-emerald-500" style={{ width: `${onTrackPercent}%` }} title={`On Track: ${onTrack} (${onTrackPercent.toFixed(1)}%)`} />
				<div className="bg-amber-500" style={{ width: `${warningPercent}%` }} title={`Warning: ${warning} (${warningPercent.toFixed(1)}%)`} />
				<div className="bg-red-500" style={{ width: `${breachedPercent}%` }} title={`Breached: ${breached} (${breachedPercent.toFixed(1)}%)`} />
			</div>
			<div className="flex flex-wrap gap-3 text-xs text-slate-400">
				<LegendItem className="bg-emerald-500" label={`On Track (${onTrackPercent.toFixed(1)}%)`} />
				<LegendItem className="bg-amber-500" label={`Warning (${warningPercent.toFixed(1)}%)`} />
				<LegendItem className="bg-red-500" label={`Breached (${breachedPercent.toFixed(1)}%)`} />
			</div>
		</div>
	);
}

function LegendItem({ className, label }: { className: string; label: string }) {
	return (
		<span className="inline-flex items-center gap-1.5">
			<span className={cn('h-2 w-2 rounded-full', className)} />
			{label}
		</span>
	);
}

interface AlertItemProps {
	alert: SLAAlert;
	onAcknowledge: () => void;
	isAcknowledging: boolean;
}

function AlertItem({ alert, onAcknowledge, isAcknowledging }: AlertItemProps) {
	const severityClasses = {
		low: 'border-blue-500/30 bg-blue-500/10',
		medium: 'border-amber-500/30 bg-amber-500/10',
		high: 'border-orange-500/30 bg-orange-500/10',
		critical: 'border-red-500/30 bg-red-500/10',
	}[alert.severity];

	return (
		<li className={cn('flex items-start justify-between gap-3 rounded-md border p-3', severityClasses)}>
			<div className="min-w-0 space-y-1">
				<div className="flex flex-wrap items-center gap-2">
					<span className="font-medium text-slate-100">{alert.title}</span>
					<SeverityBadge severity={alert.severity} />
				</div>
				{alert.message && <p className="text-sm text-slate-400">{alert.message}</p>}
				<span className="block text-xs text-slate-500">{formatDate(alert.created_at)}</span>
			</div>
			{!alert.acknowledged ? (
				<Button
					size="sm"
					variant="outline"
					className="shrink-0 border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
					onClick={onAcknowledge}
					disabled={isAcknowledging}
				>
					{isAcknowledging ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
					Acknowledge
				</Button>
			) : (
				<Badge className="shrink-0 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20">Acknowledged</Badge>
			)}
		</li>
	);
}

interface StatusBadgeProps {
	status: 'on_track' | 'warning' | 'breached';
}

function StatusBadge({ status }: StatusBadgeProps) {
	const labels = {
		on_track: 'On Track',
		warning: 'Warning',
		breached: 'Breached',
	};
	const classes = {
		on_track: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
		warning: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
		breached: 'border-red-500/30 bg-red-500/10 text-red-300',
	};

	return <Badge variant="outline" className={classes[status]}>{labels[status]}</Badge>;
}

function SeverityBadge({ severity }: { severity: SLAAlert['severity'] }) {
	const classes = {
		low: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
		medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
		high: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
		critical: 'border-red-500/30 bg-red-500/10 text-red-300',
	};

	return <Badge variant="outline" className={classes[severity]}>{severity}</Badge>;
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function formatDuration(seconds?: number): string {
	if (!seconds) return 'N/A';
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
	const hours = Math.floor(seconds / 3600);
	const mins = Math.floor((seconds % 3600) / 60);
	return `${hours}h ${mins}m`;
}

export default SLADashboard;
