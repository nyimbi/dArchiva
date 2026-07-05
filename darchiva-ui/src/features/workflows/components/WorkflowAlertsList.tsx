// (c) Copyright Datacraft, 2026
/**
 * Workflow Alerts List - Filterable alert management console
 * with bulk actions and expandable detail views.
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	AlertCircle,
	ArrowUp,
	Bell,
	Check,
	CheckCircle2,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	Clock,
	Loader2,
	TriangleAlert,
	User,
} from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
	acknowledgeSLAAlert,
	assignSLAAlert,
	escalateSLAAlertAction,
	getSLAAlerts,
	type SLAAlert,
} from '../api';

interface WorkflowAlertsListProps {
	className?: string;
}

type Severity = 'low' | 'medium' | 'high' | 'critical';
const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];

export function WorkflowAlertsList({ className }: WorkflowAlertsListProps) {
	const [page, setPage] = useState(1);
	const [severityFilter, setSeverityFilter] = useState<Severity | null>(null);
	const [showAcknowledged, setShowAcknowledged] = useState(false);
	const [expandedId, setExpandedId] = useState<string | null>(null);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const queryClient = useQueryClient();

	const { data, isLoading, isError } = useQuery({
		queryKey: ['sla-alerts', page, severityFilter, showAcknowledged],
		queryFn: () => getSLAAlerts(page, 20, showAcknowledged ? undefined : false, severityFilter || undefined),
	});

	const acknowledgeMutation = useMutation({
		mutationFn: (alertId: string) => acknowledgeSLAAlert(alertId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sla-alerts'] });
			queryClient.invalidateQueries({ queryKey: ['sla-dashboard'] });
			toast.success('Alert acknowledged');
		},
		onError: () => {
			toast.error('Failed to acknowledge alert');
		},
	});

	const escalateAlertMutation = useMutation({
		mutationFn: (alertId: string) => escalateSLAAlertAction(alertId),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sla-alerts'] });
			queryClient.invalidateQueries({ queryKey: ['sla-dashboard'] });
			toast.success('Alert escalated');
		},
		onError: () => {
			toast.error('Failed to escalate alert');
		},
	});

	const assignAlertMutation = useMutation({
		mutationFn: ({ id, owner }: { id: string; owner: string }) =>
			assignSLAAlert(id, owner),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['sla-alerts'] });
			toast.success('Alert assigned');
		},
		onError: () => {
			toast.error('Failed to assign alert');
		},
	});

	const handleAcknowledgeBulk = useCallback(async () => {
		try {
			const promises = Array.from(selectedIds).map(id => acknowledgeSLAAlert(id));
			await Promise.all(promises);
			setSelectedIds(new Set());
			queryClient.invalidateQueries({ queryKey: ['sla-alerts'] });
			queryClient.invalidateQueries({ queryKey: ['sla-dashboard'] });
			toast.success('Selected alerts acknowledged');
		} catch {
			toast.error('Failed to acknowledge selected alerts');
		}
	}, [selectedIds, queryClient]);

	const toggleSelect = (id: string) => {
		setSelectedIds(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	};

	const unackCount = data?.items.filter(alert => !alert.acknowledged).length || 0;

	return (
		<Card className={cn('border-slate-800 bg-slate-900/80 text-slate-200 shadow-none', className)}>
			<CardHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b border-slate-800 p-4">
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-cyan-400">
						<Bell className="h-4 w-4" />
					</div>
					<CardTitle className="flex items-center gap-2 text-base text-slate-100">
						Workflow Alerts
						<Badge
							className={cn(
								'bg-red-500/10 text-red-300 hover:bg-red-500/20',
								unackCount === 0 && 'bg-slate-800 text-slate-400 hover:bg-slate-800',
							)}
						>
							{unackCount}
						</Badge>
					</CardTitle>
				</div>
			</CardHeader>

			<CardContent className="space-y-4 p-4">
				<div className="flex flex-col gap-3 rounded-md border border-slate-800 bg-slate-950/70 p-3 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-wrap items-center gap-2">
						<span className="mr-1 text-sm font-medium text-slate-400">Severity</span>
						{SEVERITIES.map(severity => (
							<Button
								key={severity}
								type="button"
								variant="outline"
								size="sm"
								className={cn(
									'capitalize',
									severityButtonClass(severity, severityFilter === severity),
								)}
								onClick={() => setSeverityFilter(prev => prev === severity ? null : severity)}
							>
								{severity}
							</Button>
						))}
					</div>

					<div className="flex flex-wrap items-center gap-3">
						<label className="flex items-center gap-2 text-sm text-slate-300">
							<Switch
								checked={showAcknowledged}
								onCheckedChange={setShowAcknowledged}
								className="data-[state=checked]:bg-cyan-500 data-[state=unchecked]:bg-slate-700"
							/>
							Show Acknowledged
						</label>

						{selectedIds.size > 0 && (
							<Button
								type="button"
								size="sm"
								className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
								onClick={handleAcknowledgeBulk}
							>
								<Check className="h-4 w-4" />
								Acknowledge ({selectedIds.size})
							</Button>
						)}
					</div>
				</div>

				{isLoading ? (
					<div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
						<Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
						Loading alerts...
					</div>
				) : isError ? (
					<div className="flex items-center justify-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-8 text-sm text-red-300">
						<AlertCircle className="h-5 w-5" />
						Failed to load workflow alerts.
					</div>
				) : !data?.items.length ? (
					<div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-700 px-4 py-10 text-center text-slate-400">
						<Bell className="mb-3 h-9 w-9 text-slate-500" />
						<p className="text-sm">No alerts match your filters</p>
					</div>
				) : (
					<div className="space-y-3">
						{data.items.map(alert => (
							<AlertCard
								key={alert.id}
								alert={alert}
								isExpanded={expandedId === alert.id}
								isSelected={selectedIds.has(alert.id)}
								onToggleExpand={() => setExpandedId(prev => prev === alert.id ? null : alert.id)}
								onToggleSelect={() => toggleSelect(alert.id)}
								onAcknowledge={() => acknowledgeMutation.mutate(alert.id)}
								isAcknowledging={acknowledgeMutation.isPending}
								onEscalate={() => escalateAlertMutation.mutate(alert.id)}
								isEscalating={escalateAlertMutation.isPending}
								onAssign={owner => assignAlertMutation.mutate({ id: alert.id, owner })}
							/>
						))}
					</div>
				)}

				{data && data.total > 20 && (
					<div className="flex items-center justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="h-8 w-8 border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
							onClick={() => setPage(current => Math.max(1, current - 1))}
							disabled={page === 1}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<span className="text-sm text-slate-400">Page {page} of {Math.ceil(data.total / 20)}</span>
						<Button
							type="button"
							variant="outline"
							size="icon"
							className="h-8 w-8 border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
							onClick={() => setPage(current => current + 1)}
							disabled={page >= Math.ceil(data.total / 20)}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

// ---------------------------------------------------------------------------
// AlertCard
// ---------------------------------------------------------------------------

interface AlertCardProps {
	alert: SLAAlert;
	isExpanded: boolean;
	isSelected: boolean;
	onToggleExpand: () => void;
	onToggleSelect: () => void;
	onAcknowledge: () => void;
	isAcknowledging: boolean;
	onEscalate: () => void;
	isEscalating: boolean;
	onAssign: (owner: string) => void;
}

function AlertCard({
	alert,
	isExpanded,
	isSelected,
	onToggleExpand,
	onToggleSelect,
	onAcknowledge,
	isAcknowledging,
	onEscalate,
	isEscalating,
	onAssign,
}: AlertCardProps) {
	const [showAssign, setShowAssign] = useState(false);
	const [assignOwner, setAssignOwner] = useState('');

	function submitAssign() {
		const trimmed = assignOwner.trim();
		if (!trimmed) return;
		onAssign(trimmed);
		setShowAssign(false);
		setAssignOwner('');
	}

	return (
		<Card className={cn('border-slate-800 bg-slate-950/70 shadow-none', alert.acknowledged && 'opacity-70')}>
			<div className={cn('border-l-2', severityBorderClass(alert.severity))}>
				<div className="flex items-start gap-3 p-4">
					<button
						type="button"
						className={cn(
							'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-600 text-transparent',
							isSelected && 'border-cyan-500 bg-cyan-500 text-slate-950',
						)}
						onClick={event => {
							event.stopPropagation();
							onToggleSelect();
						}}
					>
						<Check className="h-3 w-3" />
					</button>

					<button type="button" className="min-w-0 flex-1 text-left" onClick={onToggleExpand}>
						<div className="flex flex-wrap items-center gap-2">
							<span className="font-medium text-slate-100">{alert.title}</span>
							<SeverityBadge severity={alert.severity} />
						</div>
						<div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
							<span className="inline-flex items-center gap-1 capitalize">
								<TriangleAlert className="h-3.5 w-3.5" />
								{formatAlertType(alert.alert_type)}
							</span>
							<span className="inline-flex items-center gap-1">
								<Clock className="h-3.5 w-3.5" />
								{formatDate(alert.created_at)}
							</span>
						</div>
					</button>

					<div className="flex shrink-0 flex-wrap items-center gap-1">
						{!alert.acknowledged && (
							<>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
									onClick={event => {
										event.stopPropagation();
										onEscalate();
									}}
									disabled={isEscalating}
									title="Escalate alert"
								>
									{isEscalating ? (
										<Loader2 className="h-4 w-4 animate-spin" />
									) : (
										<ArrowUp className="h-4 w-4" />
									)}
									Escalate
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className={cn(
										'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100',
										showAssign && 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300',
									)}
									onClick={event => {
										event.stopPropagation();
										setShowAssign(v => !v);
									}}
									title="Assign alert owner"
								>
									<User className="h-4 w-4" />
									Assign
								</Button>
								<Button
									type="button"
									variant="outline"
									size="sm"
									className="border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
									onClick={event => { event.stopPropagation(); onAcknowledge(); }}
									disabled={isAcknowledging}
								>
									{isAcknowledging ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
									Ack
								</Button>
							</>
						)}
						{alert.acknowledged && (
							<Badge className="bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20">
								<Check className="mr-1 h-3 w-3" />
								Acknowledged
							</Badge>
						)}
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
							onClick={event => { event.stopPropagation(); onToggleExpand(); }}
						>
							<ChevronDown className={cn('h-4 w-4 transition-transform', isExpanded && 'rotate-180')} />
						</Button>
					</div>
				</div>

				{showAssign && !alert.acknowledged && (
					<div className="flex flex-wrap items-center gap-2 border-t border-slate-800 px-4 py-3">
						<User className="h-4 w-4 shrink-0 text-slate-400" />
						<input
							type="text"
							placeholder="Owner name or email"
							value={assignOwner}
							onChange={e => setAssignOwner(e.target.value)}
							onKeyDown={e => { if (e.key === 'Enter') submitAssign(); }}
							className="flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
						/>
						<Button
							type="button"
							size="sm"
							className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
							onClick={submitAssign}
							disabled={!assignOwner.trim()}
						>
							Assign
						</Button>
						<Button
							type="button"
							size="sm"
							variant="ghost"
							className="text-slate-400 hover:text-slate-200"
							onClick={() => { setShowAssign(false); setAssignOwner(''); }}
						>
							Cancel
						</Button>
					</div>
				)}

				{isExpanded && (
					<div className="space-y-4 border-t border-slate-800 p-4">
						{alert.message && (
							<div className="rounded-md border border-slate-800 bg-slate-900/70 p-3 text-sm text-slate-300">
								{alert.message}
							</div>
						)}
						<div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
							{alert.workflow_id && <DetailItem label="Workflow" value={alert.workflow_id} />}
							{alert.instance_id && <DetailItem label="Instance" value={`${alert.instance_id.slice(0, 8)}...`} />}
							{alert.assignee_id && <DetailItem label="Assignee" value={alert.assignee_id} />}
							{alert.acknowledged_at && <DetailItem label="Acknowledged At" value={formatDate(alert.acknowledged_at)} />}
						</div>
					</div>
				)}
			</div>
		</Card>
	);
}

function DetailItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="space-y-1">
			<span className="block text-xs font-medium uppercase tracking-wide text-slate-500">{label}</span>
			<span className="block break-all text-slate-300">{value}</span>
		</div>
	);
}

function SeverityBadge({ severity }: { severity: Severity }) {
	const classes = {
		low: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
		medium: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
		high: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
		critical: 'border-red-500/30 bg-red-500/10 text-red-300',
	};

	return <Badge variant="outline" className={cn('capitalize', classes[severity])}>{severity}</Badge>;
}

function severityButtonClass(severity: Severity, isActive: boolean) {
	const inactive = 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-slate-100';
	if (!isActive) return inactive;
	return {
		low: 'border-blue-500 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20',
		medium: 'border-amber-500 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20',
		high: 'border-orange-500 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20',
		critical: 'border-red-500 bg-red-500/10 text-red-300 hover:bg-red-500/20',
	}[severity];
}

function severityBorderClass(severity: Severity) {
	return {
		low: 'border-l-blue-500',
		medium: 'border-l-amber-500',
		high: 'border-l-orange-500',
		critical: 'border-l-red-500',
	}[severity];
}

function formatDate(dateStr: string) {
	const date = new Date(dateStr);
	return date.toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

function formatAlertType(type: string) {
	return type.replace(/_/g, ' ');
}

export default WorkflowAlertsList;
