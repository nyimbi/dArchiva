// (c) Copyright Datacraft, 2026
/**
 * Unified compliance dashboard — retention, GDPR, legal holds, alerts.
 */
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
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
	AlertTriangle,
	ArrowRight,
	Calendar,
	Clock,
	Database,
	FileText,
	Info,
	Lock,
	Play,
	RefreshCw,
	Scale,
	ShieldAlert,
	ShieldCheck,
	Timer,
	XCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useRetentionPolicies, useRunPolicy } from '../retention/api';
import { useComplianceAlerts, useComplianceStats } from './api';
import type { ComplianceAlert, ComplianceStats } from './types';

// ── helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
	if (!iso) return '—';
	return new Date(iso).toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function formatDays(days: number): string {
	if (days % 365 === 0) return `${days / 365}y`;
	if (days % 30 === 0) return `${days / 30}mo`;
	return `${days}d`;
}

// ── stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
	label: string;
	value: string | number;
	icon: React.ElementType;
	danger?: boolean;
	loading?: boolean;
}

function StatCard({ label, value, icon: Icon, danger = false, loading = false }: StatCardProps) {
	return (
		<Card className="bg-slate-900/60 border-slate-800">
			<CardContent className="pt-6">
				<div className="flex items-start justify-between">
					<div className="space-y-1">
						<p className="text-xs text-slate-500 uppercase tracking-wider font-medium">{label}</p>
						{loading ? (
							<Skeleton className="h-8 w-16" />
						) : (
							<p
								className={cn(
									'text-2xl font-bold',
									danger && Number(value) > 0 ? 'text-red-400' : 'text-slate-100',
								)}
							>
								{value}
							</p>
						)}
					</div>
					<div
						className={cn(
							'w-10 h-10 rounded-lg flex items-center justify-center',
							danger && Number(value) > 0
								? 'bg-red-500/10 text-red-400'
								: 'bg-slate-800 text-slate-400',
						)}
					>
						<Icon className="w-5 h-5" />
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

// ── alert row ─────────────────────────────────────────────────────────────────

const ALERT_LINKS: Record<ComplianceAlert['type'], string> = {
	overdue_retention: '/retention',
	legal_hold_expiring: '/documents',
	gdpr_deadline: '/admin/data-export',
	audit_gap: '/audit',
};

const SEVERITY_ICONS: Record<ComplianceAlert['severity'], React.ElementType> = {
	critical: XCircle,
	warning: AlertTriangle,
	info: Info,
};

const SEVERITY_CLASSES: Record<ComplianceAlert['severity'], string> = {
	critical: 'text-red-400 bg-red-500/10 border-red-500/30',
	warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
	info: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

const SEVERITY_ORDER: Record<ComplianceAlert['severity'], number> = {
	critical: 0,
	warning: 1,
	info: 2,
};

interface AlertRowProps {
	alert: ComplianceAlert;
}

function AlertRow({ alert }: AlertRowProps) {
	const SevIcon = SEVERITY_ICONS[alert.severity];
	const link = ALERT_LINKS[alert.type];

	return (
		<div
			className={cn(
				'flex items-start gap-3 p-3 rounded-lg border',
				SEVERITY_CLASSES[alert.severity],
			)}
		>
			<SevIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
			<div className="flex-1 min-w-0">
				<p className="text-sm font-medium text-slate-200">{alert.message}</p>
				<div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
					{alert.dueDate && (
						<span className="flex items-center gap-1">
							<Calendar className="w-3 h-3" />
							Due {formatDate(alert.dueDate)}
						</span>
					)}
					{alert.documentCount !== undefined && (
						<span className="flex items-center gap-1">
							<FileText className="w-3 h-3" />
							{alert.documentCount} documents
						</span>
					)}
				</div>
			</div>
			<Link to={link}>
				<Button size="sm" variant="ghost" className="text-xs flex-shrink-0">
					View
					<ArrowRight className="w-3 h-3 ml-1" />
				</Button>
			</Link>
		</div>
	);
}

// ── quick action button ───────────────────────────────────────────────────────

interface QuickActionProps {
	label: string;
	icon: React.ElementType;
	href: string;
}

function QuickAction({ label, icon: Icon, href }: QuickActionProps) {
	return (
		<Link to={href} className="block">
			<Button
				variant="outline"
				className="w-full justify-start gap-2 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
			>
				<Icon className="w-4 h-4" />
				{label}
			</Button>
		</Link>
	);
}

// ── retention policy badge ────────────────────────────────────────────────────

function PolicyBadge({ isActive }: { isActive: boolean }) {
	return (
		<Badge
			variant={isActive ? 'default' : 'secondary'}
			className={isActive ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : ''}
		>
			{isActive ? 'Active' : 'Inactive'}
		</Badge>
	);
}

function PolicyTypeBadge({ type }: { type: string }) {
	const colours: Record<string, string> = {
		archive: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
		delete: 'bg-red-500/20 text-red-400 border-red-500/30',
		move: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
	};
	return (
		<Badge variant="outline" className={colours[type] ?? ''}>
			{type}
		</Badge>
	);
}

// ── stats skeleton ────────────────────────────────────────────────────────────

function StatsSkeleton() {
	return (
		<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
			{Array.from({ length: 6 }).map((_, i) => (
				<Card key={i} className="bg-slate-900/60 border-slate-800">
					<CardContent className="pt-6 space-y-3">
						<Skeleton className="h-3 w-24" />
						<Skeleton className="h-8 w-12" />
					</CardContent>
				</Card>
			))}
		</div>
	);
}

// ── main component ────────────────────────────────────────────────────────────

export function ComplianceDashboard() {
	const {
		data: stats,
		isLoading: statsLoading,
		isError: statsError,
		refetch: refetchStats,
	} = useComplianceStats();

	const {
		data: alerts,
		isLoading: alertsLoading,
		isError: alertsError,
		refetch: refetchAlerts,
	} = useComplianceAlerts();

	const {
		data: policies,
		isLoading: policiesLoading,
		isError: policiesError,
		refetch: refetchPolicies,
	} = useRetentionPolicies();

	const runPolicy = useRunPolicy();

	const sortedAlerts = (alerts ?? []).slice().sort(
		(a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity],
	);

	return (
		<div className="p-6 space-y-8 max-w-screen-xl mx-auto">
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 rounded-lg bg-brass-500/10 flex items-center justify-center">
						<Scale className="w-5 h-5 text-brass-400" />
					</div>
					<div>
						<h1 className="text-xl font-display font-semibold text-slate-100">
							Compliance
						</h1>
						<p className="text-sm text-slate-500">
							Retention, legal holds, GDPR and audit health at a glance
						</p>
					</div>
				</div>
				<Button
					variant="ghost"
					size="sm"
					onClick={() => {
						void refetchStats();
						void refetchAlerts();
						void refetchPolicies();
					}}
					className="text-slate-400 hover:text-slate-100"
				>
					<RefreshCw className="w-4 h-4 mr-2" />
					Refresh
				</Button>
			</div>

			{/* ── Stats row ── */}
			<section aria-label="Compliance metrics">
				{statsLoading ? (
					<StatsSkeleton />
				) : statsError ? (
					<div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
						<XCircle className="w-4 h-4 flex-shrink-0" />
						<span className="text-sm">Failed to load compliance stats.</span>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => void refetchStats()}
							className="ml-auto text-red-400 hover:text-red-300"
						>
							Retry
						</Button>
					</div>
				) : (
					<div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
						<StatCard
							label="Active Policies"
							value={stats?.activePolicies ?? 0}
							icon={Timer}
						/>
						<StatCard
							label="Under Retention"
							value={stats?.documentsUnderRetention ?? 0}
							icon={Database}
						/>
						<StatCard
							label="Legal Holds"
							value={stats?.legalHoldsActive ?? 0}
							icon={Lock}
							danger
						/>
						<StatCard
							label="Pending GDPR"
							value={stats?.gdprRequestsPending ?? 0}
							icon={ShieldAlert}
							danger
						/>
						<StatCard
							label="Overdue Actions"
							value={stats?.overdueRetentionActions ?? 0}
							icon={AlertTriangle}
							danger
						/>
						<StatCard
							label="Next Retention Due"
							value={formatDate(stats?.nextRetentionDue)}
							icon={Calendar}
						/>
					</div>
				)}
			</section>

			{/* ── Alerts + Quick Actions row ── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Alerts section */}
				<section className="lg:col-span-2" aria-label="Compliance alerts">
					<Card className="bg-slate-900/60 border-slate-800 h-full">
						<CardHeader className="pb-3">
							<CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
								<ShieldAlert className="w-4 h-4 text-amber-400" />
								Alerts
								{!alertsLoading && sortedAlerts.length > 0 && (
									<Badge variant="destructive" className="ml-auto text-xs">
										{sortedAlerts.filter(a => a.severity === 'critical').length} critical
									</Badge>
								)}
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{alertsLoading ? (
								<>
									<Skeleton className="h-14 w-full rounded-lg" />
									<Skeleton className="h-14 w-full rounded-lg" />
									<Skeleton className="h-14 w-full rounded-lg" />
								</>
							) : alertsError ? (
								<div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
									<XCircle className="w-4 h-4" />
									Failed to load alerts.
									<Button
										variant="ghost"
										size="sm"
										onClick={() => void refetchAlerts()}
										className="ml-auto text-red-400 hover:text-red-300"
									>
										Retry
									</Button>
								</div>
							) : sortedAlerts.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-600">
									<ShieldCheck className="w-8 h-8 text-emerald-500/50" />
									<p className="text-sm">No compliance alerts</p>
								</div>
							) : (
								sortedAlerts.map(alert => (
									<AlertRow key={alert.id} alert={alert} />
								))
							)}
						</CardContent>
					</Card>
				</section>

				{/* Quick Actions */}
				<section aria-label="Quick actions">
					<Card className="bg-slate-900/60 border-slate-800 h-full">
						<CardHeader className="pb-3">
							<CardTitle className="text-base font-semibold text-slate-100">
								Quick Actions
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							<QuickAction label="Retention Policies" icon={Timer} href="/retention" />
							<QuickAction label="Data Export (GDPR)" icon={Database} href="/admin/data-export" />
							<QuickAction label="Audit Logs" icon={Clock} href="/audit" />
							<QuickAction label="Legal Holds" icon={Lock} href="/documents" />
						</CardContent>
					</Card>
				</section>
			</div>

			{/* ── Retention Overview ── */}
			<section aria-label="Retention policies overview">
				<Card className="bg-slate-900/60 border-slate-800">
					<CardHeader className="pb-3">
						<CardTitle className="text-base font-semibold text-slate-100 flex items-center gap-2">
							<Timer className="w-4 h-4 text-slate-400" />
							Retention Policies
						</CardTitle>
					</CardHeader>
					<CardContent>
						{policiesLoading ? (
							<div className="space-y-2">
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
								<Skeleton className="h-10 w-full" />
							</div>
						) : policiesError ? (
							<div className="flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
								<XCircle className="w-4 h-4" />
								Failed to load retention policies.
								<Button
									variant="ghost"
									size="sm"
									onClick={() => void refetchPolicies()}
									className="ml-auto text-red-400 hover:text-red-300"
								>
									Retry
								</Button>
							</div>
						) : !policies || policies.length === 0 ? (
							<div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-600">
								<FileText className="w-8 h-8" />
								<p className="text-sm">No retention policies defined</p>
								<Link to="/retention">
									<Button variant="outline" size="sm" className="mt-2 border-slate-700 text-slate-400">
										Create Policy
									</Button>
								</Link>
							</div>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow className="border-slate-800 hover:bg-transparent">
											<TableHead className="text-slate-500 font-medium">Policy</TableHead>
											<TableHead className="text-slate-500 font-medium">Type</TableHead>
											<TableHead className="text-slate-500 font-medium">Period</TableHead>
											<TableHead className="text-slate-500 font-medium">Applies To</TableHead>
											<TableHead className="text-slate-500 font-medium">Last Run</TableHead>
											<TableHead className="text-slate-500 font-medium">Status</TableHead>
											<TableHead className="text-slate-500 font-medium text-right">Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{policies.map(policy => (
											<TableRow key={policy.id} className="border-slate-800 hover:bg-slate-800/30">
												<TableCell className="text-slate-200 font-medium">
													{policy.name}
													{policy.description && (
														<p className="text-xs text-slate-500 font-normal truncate max-w-48">
															{policy.description}
														</p>
													)}
												</TableCell>
												<TableCell>
													<PolicyTypeBadge type={policy.policy_type} />
												</TableCell>
												<TableCell className="text-slate-400 text-sm">
													{formatDays(policy.after_days)}
												</TableCell>
												<TableCell className="text-slate-400 text-sm">
													{policy.applies_to_document_type ?? (
														policy.applies_to_project_id ? 'Project' : 'All documents'
													)}
												</TableCell>
												<TableCell className="text-slate-400 text-sm">
													{formatDate(policy.last_run_at ?? undefined)}
												</TableCell>
												<TableCell>
													<PolicyBadge isActive={policy.is_active} />
												</TableCell>
												<TableCell className="text-right">
													<Button
														size="sm"
														variant="ghost"
														disabled={runPolicy.isPending}
														onClick={() => void runPolicy.mutateAsync({ id: policy.id, dryRun: false })}
														className="text-slate-400 hover:text-slate-100 text-xs"
													>
														<Play className="w-3 h-3 mr-1" />
														Run Now
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			</section>
		</div>
	);
}
