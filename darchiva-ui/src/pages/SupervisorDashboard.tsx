// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import {
	Activity,
	ChevronDown,
	Clock,
	FileStack,
	Layers,
	MonitorDot,
	RefreshCw,
	Users,
} from 'lucide-react';
import {
	useBatchPipeline,
	useLiveOps,
	useOperatorKpis,
	useProjects,
	useTeamSummary,
} from '@/features/scanning-projects/api/hooks';
import { BatchKanban } from '@/features/scanning-projects/components/BatchKanban';
import type { OperatorKPI } from '@/features/scanning-projects/api/index';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
	if (!iso) return '—';
	const d = new Date(iso);
	return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtPct(v: number): string {
	return `${(v * 100).toFixed(1)}%`;
}

type StatusColor = 'green' | 'amber' | 'gray';

function operatorStatusColor(status: string): StatusColor {
	if (status === 'scanning') return 'green';
	if (status === 'idle') return 'amber';
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

// KPI cell colouring: low is bad for yield/compliance, high is bad for rescan
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

function OperatorCard({ op }: { op: ReturnType<typeof useLiveOps>['data'] extends { operators: (infer T)[] } | undefined ? T : never }) {
	const color = operatorStatusColor(op.status);
	return (
		<div className={`glass-card p-4 ring-1 ${STATUS_RING[color]} transition-shadow`}>
			<div className="flex items-start justify-between gap-2 mb-3">
				<div className="flex items-center gap-2 min-w-0">
					<span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[color]} shadow-sm`} />
					<span className="font-semibold text-slate-100 truncate text-sm">{op.operator_name}</span>
				</div>
				<span className="badge badge-gray text-2xs capitalize flex-shrink-0">{op.status}</span>
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
					<span>Last active {fmtTime(op.last_activity_at)}</span>
				</div>
			</div>
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

function KpiTable({ kpis }: { kpis: OperatorKPI[] }) {
	const [sortKey, setSortKey] = useState<SortKey>('pages_per_hour');
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

	function handleSort(k: SortKey) {
		if (sortKey === k) {
			setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
		} else {
			setSortKey(k);
			setSortDir('desc');
		}
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

function BatchPipelineTab({ projectId }: { projectId: string }) {
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
		// Fall back to BatchKanban which fetches its own data from batches endpoint
		return <BatchKanban projectId={projectId} />;
	}

	// Render pipeline columns directly from supervisor endpoint data
	const cols = [
		{ label: 'Unassigned', items: data.unassigned, border: 'border-slate-600/40', badge: 'badge-gray' },
		{ label: 'In Progress', items: data.in_progress, border: 'border-blue-500/40', badge: 'badge-blue' },
		{ label: 'QC Review', items: data.qc_review, border: 'border-amber-500/40', badge: 'badge-brass' },
		{ label: 'Complete', items: data.complete, border: 'border-emerald-500/40', badge: 'badge-green' },
	];

	const total = cols.reduce((s, c) => s + c.items.length, 0);
	const done = data.complete.length;

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<p className="text-xs text-slate-400">
					{done}/{total} batches complete
				</p>
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
							<span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
								{col.label}
							</span>
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
											<span>
												{item.scanned_pages}/{item.estimated_pages}p
											</span>
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

type Tab = 'live-ops' | 'operator-kpis' | 'batch-pipeline';

export function SupervisorDashboard() {
	const [activeTab, setActiveTab] = useState<Tab>('live-ops');
	const [selectedProjectId, setSelectedProjectId] = useState<string>('');

	const { data: liveOps, dataUpdatedAt: liveUpdated } = useLiveOps();
	const { data: kpis } = useOperatorKpis();
	const { data: projects } = useProjects({});

	const projectList = (projects as { items?: { id: string; name: string }[] } | { id: string; name: string }[] | undefined) ?? [];
	const projectItems = Array.isArray(projectList)
		? projectList
		: (projectList as { items?: { id: string; name: string }[] }).items ?? [];

	const lastUpdated = liveUpdated
		? new Date(liveUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
		: '—';

	const tabs: { id: Tab; label: string }[] = [
		{ id: 'live-ops', label: 'Live Ops' },
		{ id: 'operator-kpis', label: 'Operator KPIs' },
		{ id: 'batch-pipeline', label: 'Batch Pipeline' },
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
						<h1 className="text-xl font-bold text-slate-100 font-display">Supervisor Dashboard</h1>
						<p className="text-xs text-slate-400 mt-0.5">Real-time scanning operations overview</p>
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

			{/* Stat bar */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<StatCard
					icon={FileStack}
					label="Pages Today"
					value={liveOps?.pages_scanned_today ?? '—'}
				/>
				<StatCard
					icon={Layers}
					label="Active Batches"
					value={liveOps?.active_batches ?? '—'}
				/>
				<StatCard
					icon={Clock}
					label="Queue Depth"
					value={liveOps?.queue_depth ?? '—'}
					sub="batches waiting"
				/>
				<StatCard
					icon={Users}
					label="Active Operators"
					value={
						liveOps?.operators.filter((o) => o.status !== 'offline').length ?? '—'
					}
					sub={`${liveOps?.operators.length ?? 0} total`}
				/>
			</div>

			{/* Tab navigation */}
			<div className="flex gap-1 bg-slate-800/50 p-1 rounded-xl w-fit">
				{tabs.map((tab) => (
					<button
						key={tab.id}
						onClick={() => setActiveTab(tab.id)}
						className={[
							'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
							activeTab === tab.id
								? 'bg-slate-700 text-slate-100 shadow-sm'
								: 'text-slate-400 hover:text-slate-200',
						].join(' ')}
					>
						{tab.label}
					</button>
				))}
			</div>

			{/* Tab content */}
			<div>
				{activeTab === 'live-ops' && (
					<div className="space-y-4">
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
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
								{liveOps.operators.map((op) => (
									<OperatorCard key={op.operator_id} op={op} />
								))}
							</div>
						)}
					</div>
				)}

				{activeTab === 'operator-kpis' && (
					<div className="glass-card">
						<div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
							<h2 className="text-sm font-semibold text-slate-300">Operator KPIs</h2>
							<span className="text-xs text-slate-500">Refreshes every 30s</span>
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
							<BatchPipelineTab projectId={selectedProjectId} />
						) : (
							<div className="flex items-center justify-center h-48 text-slate-500 text-sm">
								Select a project above to view its batch pipeline.
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
