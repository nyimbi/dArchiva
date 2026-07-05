// (c) Copyright Datacraft, 2026
import { useMemo, useState } from 'react';
import {
	Activity,
	AlertTriangle,
	Bell,
	ChevronDown,
	Clock,
	Download,
	FileStack,
	Layers,
	MessageSquare,
	MonitorDot,
	Printer,
	RefreshCw,
	Send,
	TrendingUp,
	Trophy,
	Users,
	X,
} from 'lucide-react';
import {
	Bar,
	BarChart,
	ResponsiveContainer,
	Tooltip as RechartsTip,
	XAxis,
	YAxis,
} from 'recharts';
import { toast } from 'sonner';
import {
	useBatchPipeline,
	useExportKpis,
	useLiveOps,
	useOperatorKpis,
	useProjects,
	useSLAAlerts,
	useTeamSummary,
} from '@/features/scanning-projects/api/hooks';
import type { SLAAlert } from '@/features/scanning-projects/types';
import { BatchKanban } from '@/features/scanning-projects/components/BatchKanban';
import type { OperatorKPI, OperatorLiveStatus } from '@/features/scanning-projects/api/index';
import { Leaderboard } from '@/features/scanning-ops/components/Leaderboard';
import { OperatorScorecard } from '@/features/scanning-ops/components/OperatorScorecard';
import { useUserPreferences } from '@/hooks/useUserPreferences';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtPct(v: number): string {
	return `${(v * 100).toFixed(1)}%`;
}

function timeAgo(iso: string | null): string {
	if (!iso) return '—';
	const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
	if (diff < 60) return `${diff}s ago`;
	if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
	return `${Math.floor(diff / 3600)}h ago`;
}

type StatusColor = 'green' | 'amber' | 'gray';

function operatorStatusColor(status: string): StatusColor {
	if (status === 'scanning') return 'green';
	if (status === 'idle' || status === 'on_break') return 'amber';
	return 'gray';
}

const STATUS_DOT: Record<StatusColor, string> = {
	green: 'bg-emerald-400',
	amber: 'bg-amber-400',
	gray: 'bg-slate-500',
};

const STATUS_RING: Record<StatusColor, string> = {
	green: 'ring-emerald-500/40',
	amber: 'ring-amber-500/40',
	gray: 'ring-slate-600/40',
};

const STATUS_LABEL: Record<string, string> = {
	scanning: 'Scanning',
	idle: 'Idle',
	on_break: 'On Break',
	offline: 'Offline',
};

// KPI cell colouring
function kpiCell(value: number, kind: 'higher-good' | 'lower-good', warn: number, bad: number) {
	if (kind === 'higher-good') {
		if (value >= warn) return 'text-emerald-400';
		if (value >= bad) return 'text-amber-400';
		return 'text-red-400';
	} else {
		if (value <= warn) return 'text-emerald-400';
		if (value <= bad) return 'text-amber-400';
		return 'text-red-400';
	}
}

// ── sub-components ────────────────────────────────────────────────────────────

function StatCard({
	icon: Icon,
	label,
	value,
	sub,
}: {
	icon: React.ElementType;
	label: string;
	value: string | number;
	sub?: string;
}) {
	return (
		<div className="glass-card flex items-center gap-4 px-5 py-4">
			<div className="rounded-xl bg-brass-500/10 p-3 flex-shrink-0">
				<Icon className="w-5 h-5 text-brass-400" />
			</div>
			<div className="min-w-0">
				<p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{label}</p>
				<p className="text-2xl font-bold text-slate-100 leading-tight">{value}</p>
				{sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
			</div>
		</div>
	);
}

function ThroughputChart({ pagesToday }: { pagesToday: number }) {
	// Approximate hourly distribution across last 8 hours of a workday
	const data = useMemo(() => {
		const now = new Date();
		const weights = [0.06, 0.09, 0.14, 0.17, 0.19, 0.15, 0.12, 0.08];
		return Array.from({ length: 8 }, (_, i) => {
			const h = new Date(now);
			h.setHours(h.getHours() - (7 - i), 0, 0, 0);
			return {
				hour: h.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
				pages: Math.round(pagesToday * weights[i]),
			};
		});
	}, [pagesToday]);

	return (
		<div className="glass-card p-5">
			<div className="flex items-center gap-2 mb-4">
				<TrendingUp className="w-4 h-4 text-brass-400" />
				<h3 className="text-sm font-semibold text-slate-300">Throughput — Last 8 Hours</h3>
				<span className="text-xs text-slate-500 ml-auto">pages / hour</span>
			</div>
			<ResponsiveContainer width="100%" height={140}>
				<BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
					<XAxis
						dataKey="hour"
						tick={{ fontSize: 10, fill: '#94a3b8' }}
						axisLine={false}
						tickLine={false}
					/>
					<YAxis
						tick={{ fontSize: 10, fill: '#94a3b8' }}
						axisLine={false}
						tickLine={false}
					/>
					<RechartsTip
						contentStyle={{
							backgroundColor: '#1e293b',
							border: '1px solid #334155',
							borderRadius: 8,
							color: '#f1f5f9',
							fontSize: 12,
						}}
						cursor={{ fill: 'rgba(201,162,39,0.1)' }}
					/>
					<Bar dataKey="pages" fill="#c9a227" radius={[3, 3, 0, 0]} name="Pages" />
				</BarChart>
			</ResponsiveContainer>
		</div>
	);
}

function AlertPanel({
	slaAlerts,
	operators,
}: {
	slaAlerts: SLAAlert[];
	operators: OperatorLiveStatus[];
}) {
	const active = slaAlerts.filter((a) => !a.acknowledged_at);

	// Operators idle more than 15 minutes
	const idleAlerts = operators
		.filter((op): op is OperatorLiveStatus & { last_activity_at: string } =>
			op.status === 'idle' && op.last_activity_at !== null
		)
		.filter((op) => Date.now() - new Date(op.last_activity_at).getTime() > 15 * 60_000)
		.map((op) => ({
			id: `idle-${op.operator_id}`,
			message: `${op.operator_name} idle ${Math.floor(
				(Date.now() - new Date(op.last_activity_at).getTime()) / 60_000
			)}m`,
		}));

	const total = active.length + idleAlerts.length;

	return (
		<div className="glass-card p-4 space-y-3 h-fit">
			<div className="flex items-center gap-2">
				<Bell className="w-4 h-4 text-amber-400" />
				<h3 className="text-sm font-semibold text-slate-300">Alerts</h3>
				{total > 0 && (
					<span className="badge badge-red text-2xs ml-auto">{total}</span>
				)}
			</div>

			{total === 0 ? (
				<div className="flex items-center justify-center h-28 text-xs text-slate-500">
					No active alerts
				</div>
			) : (
				<div className="space-y-2">
					{active.map((a) => (
						<div
							key={a.id}
							className={[
								'rounded-lg px-3 py-2 text-xs flex items-start gap-2',
								a.alert_type === 'critical'
									? 'bg-red-500/10 border border-red-500/30 text-red-300'
									: 'bg-amber-500/10 border border-amber-500/30 text-amber-300',
							].join(' ')}
						>
							<AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
							<span>{a.message}</span>
						</div>
					))}
					{idleAlerts.map((a) => (
						<div
							key={a.id}
							className="rounded-lg px-3 py-2 text-xs flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300"
						>
							<Clock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
							<span>{a.message}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

function SendMessageDialog({
	operator,
	onClose,
}: {
	operator: OperatorLiveStatus | null;
	onClose: () => void;
}) {
	const [message, setMessage] = useState('');
	const [sending, setSending] = useState(false);

	if (!operator) return null;
	// Capture narrowed non-null reference so async closure sees it as OperatorLiveStatus
	const op = operator;

	async function handleSend() {
		if (!message.trim()) return;
		setSending(true);
		// TODO: POST /scanning-projects/supervisor/messages
		await new Promise<void>((r) => setTimeout(r, 600));
		toast.success(`Message sent to ${op.operator_name}`);
		setSending(false);
		onClose();
	}

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
			onClick={onClose}
		>
			<div
				className="glass-card w-full max-w-sm p-6 space-y-4"
				onClick={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<MessageSquare className="w-4 h-4 text-brass-400" />
						<h3 className="font-semibold text-slate-100 text-sm">
							Message: {op.operator_name}
						</h3>
					</div>
					<button
						onClick={onClose}
						className="text-slate-400 hover:text-slate-200 transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
				<textarea
					autoFocus
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					placeholder="Type a message to the operator…"
					rows={4}
					className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-brass-500 resize-none"
				/>
				<div className="flex justify-end gap-2">
					<button
						onClick={onClose}
						className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
					>
						Cancel
					</button>
					<button
						onClick={handleSend}
						disabled={!message.trim() || sending}
						className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-brass-500 hover:bg-brass-400 text-slate-900 text-sm font-semibold disabled:opacity-50 transition-colors"
					>
						<Send className="w-3.5 h-3.5" />
						{sending ? 'Sending…' : 'Send'}
					</button>
				</div>
			</div>
		</div>
	);
}

function OperatorCard({
	op,
	qualityPct,
	onSendMessage,
}: {
	op: OperatorLiveStatus;
	qualityPct?: number;
	onSendMessage: () => void;
}) {
	const color = operatorStatusColor(op.status);

	const qualityColor =
		qualityPct === undefined
			? null
			: qualityPct >= 90
				? 'text-emerald-400'
				: qualityPct >= 70
					? 'text-amber-400'
					: 'text-red-400';

	return (
		<div className={`glass-card p-4 ring-1 ${STATUS_RING[color]} transition-shadow`}>
			<div className="flex items-start justify-between gap-2 mb-3">
				<div className="flex items-center gap-2.5 min-w-0">
					{/* Avatar initial */}
					<div className="w-8 h-8 rounded-full bg-brass-500/20 flex items-center justify-center flex-shrink-0 font-bold text-sm text-brass-400">
						{op.operator_name.charAt(0).toUpperCase()}
					</div>
					<div className="min-w-0">
						<p className="font-semibold text-slate-100 truncate text-sm">{op.operator_name}</p>
						{qualityPct !== undefined && qualityColor && (
							<p className={`text-xs font-mono ${qualityColor}`}>
								{qualityPct.toFixed(0)}% FPY
							</p>
						)}
					</div>
				</div>
				<span
					className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold flex-shrink-0 ${
						color === 'green'
							? 'bg-emerald-500/20 text-emerald-400'
							: color === 'amber'
								? 'bg-amber-500/20 text-amber-400'
								: 'bg-slate-500/20 text-slate-400'
					}`}
				>
					<span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[color]}`} />
					{STATUS_LABEL[op.status] ?? op.status}
				</span>
			</div>

			<div className="space-y-1.5 text-xs text-slate-400">
				<div className="flex items-center gap-2">
					<Layers className="w-3.5 h-3.5 flex-shrink-0" />
					<span className="truncate">{op.current_batch ?? 'No batch assigned'}</span>
				</div>
				<div className="flex items-center gap-2">
					<FileStack className="w-3.5 h-3.5 flex-shrink-0" />
					<span>{op.pages_this_session} pages this session</span>
				</div>
				<div className="flex items-center gap-2">
					<Clock className="w-3.5 h-3.5 flex-shrink-0" />
					<span>Active {timeAgo(op.last_activity_at)}</span>
				</div>
			</div>

			<button
				onClick={onSendMessage}
				className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-brass-400 transition-colors py-1 rounded hover:bg-brass-500/5"
			>
				<MessageSquare className="w-3.5 h-3.5" />
				Send message
			</button>
		</div>
	);
}

const KPI_COLS: {
	key: keyof OperatorKPI;
	label: string;
	fmt: (v: number) => string;
	kind: 'higher-good' | 'lower-good';
	warn: number;
	bad: number;
}[] = [
	{ key: 'pages_per_hour', label: 'Pages/hr', fmt: (v) => v.toFixed(0), kind: 'higher-good', warn: 200, bad: 100 },
	{ key: 'rescan_rate', label: 'Rescan%', fmt: fmtPct, kind: 'lower-good', warn: 0.05, bad: 0.15 },
	{ key: 'first_pass_yield', label: 'FPY', fmt: fmtPct, kind: 'higher-good', warn: 0.9, bad: 0.75 },
	{ key: 'sla_compliance_rate', label: 'SLA', fmt: fmtPct, kind: 'higher-good', warn: 0.95, bad: 0.8 },
];

type SortKey = keyof OperatorKPI | null;
type KpiSortPreference = { column: SortKey; direction: 'asc' | 'desc' };

function KpiTable({ kpis }: { kpis: OperatorKPI[] }) {
	const preferences = useUserPreferences();
	const [sortPreference, setSortPreference] = useState<KpiSortPreference>(() =>
		preferences.get<KpiSortPreference>('table_sort:/supervisor:operator-kpis', {
			column: 'pages_per_hour',
			direction: 'desc',
		})
	);
	const sortKey = sortPreference.column;
	const sortDir = sortPreference.direction;

	function handleSort(k: SortKey) {
		const next: KpiSortPreference = sortKey === k
			? { column: k, direction: sortDir === 'asc' ? 'desc' : 'asc' }
			: { column: k, direction: 'desc' };
		setSortPreference(next);
		preferences.set('table_sort:/supervisor:operator-kpis', next);
	}

	const sorted = [...kpis].sort((a, b) => {
		if (!sortKey) return 0;
		const av = a[sortKey];
		const bv = b[sortKey];
		if (typeof av === 'number' && typeof bv === 'number') {
			return sortDir === 'asc' ? av - bv : bv - av;
		}
		return sortDir === 'asc'
			? String(av).localeCompare(String(bv))
			: String(bv).localeCompare(String(av));
	});

	return (
		<div className="overflow-x-auto rounded-xl">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-slate-700/60">
						{(['operator_name', 'project_name'] as const).map((k) => (
							<th
								key={k}
								onClick={() => handleSort(k)}
								className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-200 select-none"
							>
								{k === 'operator_name' ? 'Operator' : 'Project'}
								{sortKey === k && (
									<ChevronDown
										className={`inline w-3 h-3 ml-1 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`}
									/>
								)}
							</th>
						))}
						{KPI_COLS.map((col) => (
							<th
								key={col.key}
								onClick={() => handleSort(col.key)}
								className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-200 select-none"
							>
								{col.label}
								{sortKey === col.key && (
									<ChevronDown
										className={`inline w-3 h-3 ml-1 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`}
									/>
								)}
							</th>
						))}
						<th className="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">
							Idle&nbsp;min
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-slate-800/40">
					{sorted.map((kpi) => (
						<tr key={kpi.operator_id} className="hover:bg-slate-800/30 transition-colors">
							<td className="px-4 py-3 text-slate-100 font-medium whitespace-nowrap">
								{kpi.operator_name}
							</td>
							<td className="px-4 py-3 text-slate-400 whitespace-nowrap">{kpi.project_name}</td>
							{KPI_COLS.map((col) => {
								const v = kpi[col.key] as number;
								return (
									<td
										key={col.key}
										className={`px-4 py-3 text-right font-mono font-semibold ${kpiCell(v, col.kind, col.warn, col.bad)}`}
									>
										{col.fmt(v)}
									</td>
								);
							})}
							<td className="px-4 py-3 text-right text-slate-400 font-mono">
								{kpi.idle_time_min.toFixed(0)}
							</td>
						</tr>
					))}
					{sorted.length === 0 && (
						<tr>
							<td colSpan={7} className="px-4 py-8 text-center text-slate-500 text-sm">
								No KPI data for the selected period.
							</td>
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

function SLAAlertBanner({ alerts }: { alerts: SLAAlert[] }) {
	const active = alerts.filter((a) => !a.acknowledged_at);
	if (active.length === 0) return null;

	const hasCritical = active.some((a) => a.alert_type === 'critical');

	return (
		<div
			className={[
				'flex items-start gap-3 rounded-lg border px-4 py-3 text-sm',
				hasCritical
					? 'border-red-500/50 bg-red-500/10 text-red-300'
					: 'border-amber-500/50 bg-amber-500/10 text-amber-300',
			].join(' ')}
		>
			<AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
			<div className="min-w-0 space-y-1">
				<p className="font-semibold text-xs uppercase tracking-wide">
					{hasCritical ? 'SLA Breach' : 'SLA Warning'} &mdash; {active.length} active alert
					{active.length !== 1 ? 's' : ''}
				</p>
				{active.slice(0, 3).map((a) => (
					<p key={a.id} className="text-xs opacity-80 truncate">
						{a.message}
					</p>
				))}
				{active.length > 3 && (
					<p className="text-xs opacity-60">
						+{active.length - 3} more — check the SLAs tab for details.
					</p>
				)}
			</div>
		</div>
	);
}

function BatchPipelineTab({ projectId, slaAlerts }: { projectId: string; slaAlerts: SLAAlert[] }) {
	const { data, isLoading, error } = useBatchPipeline(projectId);

	if (!projectId) {
		return (
			<div className="flex items-center justify-center h-48 text-slate-500">
				Select a project to view the batch pipeline.
			</div>
		);
	}

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-48 text-slate-500">
				<RefreshCw className="w-5 h-5 animate-spin mr-2" />
				Loading pipeline…
			</div>
		);
	}

	if (error || !data) {
		return (
			<div className="space-y-4">
				<SLAAlertBanner alerts={slaAlerts} />
				<BatchKanban projectId={projectId} />
			</div>
		);
	}

	const hasCriticalAlert = slaAlerts.some((a) => !a.acknowledged_at && a.alert_type === 'critical');
	const hasWarningAlert = slaAlerts.some((a) => !a.acknowledged_at && a.alert_type === 'warning');

	const cols = [
		{ label: 'Unassigned', items: data.unassigned, border: 'border-slate-600/40', badge: 'badge-gray' },
		{
			label: 'In Progress',
			items: data.in_progress,
			border: hasCriticalAlert
				? 'border-red-500/60'
				: hasWarningAlert
					? 'border-amber-500/60'
					: 'border-blue-500/40',
			badge: 'badge-blue',
		},
		{ label: 'QC Review', items: data.qc_review, border: 'border-amber-500/40', badge: 'badge-brass' },
		{ label: 'Complete', items: data.complete, border: 'border-emerald-500/40', badge: 'badge-green' },
	];

	const total = cols.reduce((s, c) => s + c.items.length, 0);
	const done = data.complete.length;

	return (
		<div className="space-y-4">
			<SLAAlertBanner alerts={slaAlerts} />

			<div className="flex items-center justify-between">
				<p className="text-xs text-slate-400">{done}/{total} batches complete</p>
				<span className="text-xs text-slate-400">
					{total > 0 ? Math.round((done / total) * 100) : 0}% through pipeline
				</span>
			</div>

			<div className="grid grid-cols-4 gap-3 min-h-64">
				{cols.map((col) => (
					<div
						key={col.label}
						className={`flex flex-col gap-2 rounded-xl border-2 ${col.border} bg-slate-800/20 p-3 min-h-48`}
					>
						<div className="flex items-center justify-between mb-1">
							<div className="flex items-center gap-1.5">
								<span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
									{col.label}
								</span>
								{col.label === 'In Progress' && hasCriticalAlert && (
									<span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-1.5 py-0.5 text-2xs font-semibold text-red-400 border border-red-500/30">
										<AlertTriangle className="w-2.5 h-2.5" />
										SLA Breach
									</span>
								)}
								{col.label === 'In Progress' && !hasCriticalAlert && hasWarningAlert && (
									<span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-1.5 py-0.5 text-2xs font-semibold text-amber-400 border border-amber-500/30">
										<AlertTriangle className="w-2.5 h-2.5" />
										Approaching
									</span>
								)}
							</div>
							<span className={`badge ${col.badge} text-xs`}>{col.items.length}</span>
						</div>

						{col.items.length === 0 ? (
							<div className="flex-1 flex items-center justify-center">
								<p className="text-xs text-slate-600 text-center">Empty</p>
							</div>
						) : (
							col.items.map((item) => {
								const pct =
									item.estimated_pages > 0
										? Math.round((item.scanned_pages / item.estimated_pages) * 100)
										: 0;
								return (
									<div
										key={item.batch_id}
										className="rounded-lg bg-slate-800/60 border border-slate-700/40 p-3 space-y-1.5"
									>
										<p className="text-xs font-semibold text-slate-100 truncate">
											{item.batch_number}
										</p>
										<div className="h-1 bg-slate-700 rounded-full overflow-hidden">
											<div
												className="h-full bg-brass-500 rounded-full transition-all"
												style={{ width: `${pct}%` }}
											/>
										</div>
										<div className="flex justify-between text-2xs text-slate-500">
											<span>{item.scanned_pages}/{item.estimated_pages}p</span>
											<span>{pct}%</span>
										</div>
										{item.assigned_operator_name && (
											<p className="text-2xs text-slate-500 truncate">
												{item.assigned_operator_name}
											</p>
										)}
									</div>
								);
							})
						)}
					</div>
				))}
			</div>
		</div>
	);
}

// ── main component ────────────────────────────────────────────────────────────

type Tab = 'live-ops' | 'operator-kpis' | 'batch-pipeline' | 'leaderboard';

export function SupervisorDashboard() {
	const [activeTab, setActiveTab] = useState<Tab>('live-ops');
	const [selectedProjectId, setSelectedProjectId] = useState<string>('');
	const [selectedDays, setSelectedDays] = useState<number>(30);
	const [msgTarget, setMsgTarget] = useState<OperatorLiveStatus | null>(null);

	const { data: liveOps, dataUpdatedAt: liveUpdated } = useLiveOps();
	const { data: kpis } = useOperatorKpis(selectedDays);
	const { data: teamSummary } = useTeamSummary(selectedProjectId || undefined);
	const { data: projects } = useProjects({});
	const { mutate: exportKpis, isPending: isExporting } = useExportKpis();
	const { data: slaAlerts } = useSLAAlerts(selectedProjectId);

	// operator_id → KPI for quality score lookup in operator cards
	const kpiMap = useMemo(
		() => new Map(kpis?.map((k) => [k.operator_id, k]) ?? []),
		[kpis]
	);

	const projectList =
		(projects as { items?: { id: string; name: string }[] } | { id: string; name: string }[] | undefined) ?? [];
	const projectItems = Array.isArray(projectList)
		? projectList
		: (projectList as { items?: { id: string; name: string }[] }).items ?? [];

	const lastUpdated = liveUpdated
		? new Date(liveUpdated).toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit',
			})
		: '—';

	const tabs: { id: Tab; label: string; icon?: React.ElementType }[] = [
		{ id: 'live-ops', label: 'Live Ops' },
		{ id: 'operator-kpis', label: 'Operator KPIs' },
		{ id: 'batch-pipeline', label: 'Batch Pipeline' },
		{ id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
	];

	return (
		<div className="min-h-screen bg-slate-900 p-6 space-y-6">
			{/* Page header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="rounded-xl bg-brass-500/10 p-2.5">
						<MonitorDot className="w-6 h-6 text-brass-400" />
					</div>
					<div>
						<h1 className="text-xl font-bold text-slate-100 font-display">
							Supervisor Dashboard
						</h1>
						<p className="text-xs text-slate-400 mt-0.5">
							Real-time scanning operations overview
						</p>
					</div>
				</div>

				<div className="flex items-center gap-3">
					{/* Project selector */}
					<div className="relative">
						<select
							value={selectedProjectId}
							onChange={(e) => setSelectedProjectId(e.target.value)}
							className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-sm rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-1 focus:ring-brass-500 cursor-pointer"
						>
							<option value="">All projects</option>
							{projectItems.map((p) => (
								<option key={p.id} value={p.id}>
									{p.name}
								</option>
							))}
						</select>
						<ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
					</div>

					{/* Last updated */}
					<div className="flex items-center gap-1.5 text-xs text-slate-500">
						<Activity className="w-3.5 h-3.5" />
						<span>Updated {lastUpdated}</span>
					</div>
				</div>
			</div>

			{/* Stat bar: Active Operators | Scans Today | Error Rate | Avg Quality */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<StatCard
					icon={Users}
					label="Active Operators"
					value={liveOps?.operators.filter((o) => o.status !== 'offline').length ?? '—'}
					sub={`${liveOps?.operators.length ?? 0} total`}
				/>
				<StatCard
					icon={FileStack}
					label="Scans Today"
					value={liveOps?.pages_scanned_today ?? '—'}
				/>
				<StatCard
					icon={AlertTriangle}
					label="Error Rate"
					value={teamSummary ? fmtPct(teamSummary.team_rescan_rate) : '—'}
					sub="rescan rate"
				/>
				<StatCard
					icon={Trophy}
					label="Avg Quality"
					value={
						teamSummary
							? `${(teamSummary.team_first_pass_yield * 100).toFixed(0)}%`
							: '—'
					}
					sub="first pass yield"
				/>
			</div>

			{/* Tab navigation */}
			<div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					return (
						<button
							key={tab.id}
							onClick={() => setActiveTab(tab.id)}
							className={[
								'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
								activeTab === tab.id
									? 'bg-slate-700 text-slate-100 shadow-sm'
									: 'text-slate-400 hover:text-slate-200',
							].join(' ')}
						>
							{Icon && <Icon className="w-3.5 h-3.5" />}
							{tab.label}
						</button>
					);
				})}
			</div>

			{/* Tab content */}
			<div>
				{activeTab === 'live-ops' && (
					<div className="space-y-4">
						<OperatorScorecard />

						{/* Pages-per-hour throughput chart */}
						<ThroughputChart pagesToday={liveOps?.pages_scanned_today ?? 0} />

						{/* Operator grid (2/3) + Alert panel (1/3) */}
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
							<div className="lg:col-span-2 space-y-4">
								<div className="flex items-center justify-between">
									<h2 className="text-sm font-semibold text-slate-300">
										Operator Status ({liveOps?.operators.length ?? 0})
									</h2>
									<div className="flex items-center gap-4 text-xs text-slate-500">
										<span className="flex items-center gap-1.5">
											<span className="w-2 h-2 rounded-full bg-emerald-400" />
											Scanning
										</span>
										<span className="flex items-center gap-1.5">
											<span className="w-2 h-2 rounded-full bg-amber-400" />
											Idle
										</span>
										<span className="flex items-center gap-1.5">
											<span className="w-2 h-2 rounded-full bg-slate-500" />
											Offline
										</span>
									</div>
								</div>

								{!liveOps || liveOps.operators.length === 0 ? (
									<div className="glass-card flex items-center justify-center h-48 text-slate-500">
										No operator data available.
									</div>
								) : (
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										{liveOps.operators.map((op) => (
											<OperatorCard
												key={op.operator_id}
												op={op}
												qualityPct={
													kpiMap.has(op.operator_id)
														? kpiMap.get(op.operator_id)!.first_pass_yield * 100
														: undefined
												}
												onSendMessage={() => setMsgTarget(op)}
											/>
										))}
									</div>
								)}
							</div>

							{/* Alert panel */}
							<AlertPanel
								slaAlerts={slaAlerts ?? []}
								operators={liveOps?.operators ?? []}
							/>
						</div>
					</div>
				)}

				{activeTab === 'operator-kpis' && (
					<div className="glass-card">
						<div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between gap-3 flex-wrap">
							<h2 className="text-sm font-semibold text-slate-300">Operator KPIs</h2>
							<div className="flex items-center gap-2 flex-wrap">
								<select
									value={selectedDays}
									onChange={(e) => setSelectedDays(Number(e.target.value))}
									className="appearance-none bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brass-500 cursor-pointer"
								>
									<option value={7}>Last 7 days</option>
									<option value={30}>Last 30 days</option>
									<option value={90}>Last 90 days</option>
								</select>
								<button
									onClick={() => exportKpis({ days: selectedDays, format: 'csv' })}
									disabled={isExporting}
									className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Download className="w-3.5 h-3.5" />
									Export CSV
								</button>
								<button
									onClick={() => exportKpis({ days: selectedDays, format: 'pdf' })}
									disabled={isExporting}
									className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
								>
									<Printer className="w-3.5 h-3.5" />
									Export PDF (Print)
								</button>
								<span className="text-xs text-slate-500">Refreshes every 30s</span>
							</div>
						</div>
						<KpiTable kpis={kpis ?? []} />
					</div>
				)}

				{activeTab === 'batch-pipeline' && (
					<div className="glass-card p-5">
						<div className="flex items-center justify-between mb-5">
							<h2 className="text-sm font-semibold text-slate-300">Batch Pipeline</h2>
							<span className="text-xs text-slate-500">Refreshes every 15s</span>
						</div>
						{selectedProjectId ? (
							<BatchPipelineTab
								projectId={selectedProjectId}
								slaAlerts={slaAlerts ?? []}
							/>
						) : (
							<div className="flex items-center justify-center h-48 text-slate-500 text-sm">
								Select a project above to view its batch pipeline.
							</div>
						)}
					</div>
				)}

				{activeTab === 'leaderboard' && (
					<div className="space-y-4">
						<Leaderboard />
					</div>
				)}
			</div>

			{/* Send message overlay dialog */}
			<SendMessageDialog operator={msgTarget} onClose={() => setMsgTarget(null)} />
		</div>
	);
}
