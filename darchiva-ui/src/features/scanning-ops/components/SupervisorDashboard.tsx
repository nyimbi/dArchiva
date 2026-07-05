// (c) Copyright Datacraft, 2026
/**
 * Supervisor dashboard: live ops summary, operator KPI table, batch pipeline Kanban.
 */
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
	Activity,
	AlertCircle,
	AlertTriangle,
	Clock,
	FileText,
	Layers,
	RefreshCw,
	TrendingUp,
	Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { useAssignedBatches, useShiftStats } from '../api/hooks';
import type { AssignedBatch } from '../api/hooks';
import { useOperatorKpis } from '@/features/scanning-projects/api/hooks';
import type { OperatorKPI } from '@/features/scanning-projects/api/index';

// ──────────────────────────────────────────────────────────────────────────────
// Types

type KanbanColumn = {
	id: string;
	label: string;
	statuses: string[];
	color: string;
	headerBg: string;
};

const KANBAN_COLUMNS: KanbanColumn[] = [
	{
		id: 'unassigned',
		label: 'Unassigned',
		statuses: ['pending'],
		color: 'text-slate-400',
		headerBg: 'bg-slate-700/40',
	},
	{
		id: 'in_progress',
		label: 'In Progress',
		statuses: ['in_progress', 'scanning'],
		color: 'text-blue-400',
		headerBg: 'bg-blue-500/10',
	},
	{
		id: 'qc',
		label: 'QC',
		statuses: ['qc_pending', 'ocr_processing', 'qc_failed'],
		color: 'text-amber-400',
		headerBg: 'bg-amber-500/10',
	},
	{
		id: 'complete',
		label: 'Complete',
		statuses: ['completed', 'qc_passed'],
		color: 'text-emerald-400',
		headerBg: 'bg-emerald-500/10',
	},
];

// ──────────────────────────────────────────────────────────────────────────────
// Sub-components

function SummaryCard({
	label,
	value,
	sub,
	icon: Icon,
	color,
	bg,
	delay,
}: {
	label: string;
	value: string | number;
	sub?: string;
	icon: typeof Activity;
	color: string;
	bg: string;
	delay?: number;
}) {
	return (
		<motion.div
			initial={{ opacity: 0, y: 16 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: delay ?? 0 }}
			className="glass-card p-4"
		>
			<div className="flex items-center justify-between mb-3">
				<span className="text-sm text-slate-400">{label}</span>
				<div className={cn('p-2 rounded-lg', bg)}>
					<Icon className={cn('w-5 h-5', color)} />
				</div>
			</div>
			<div className={cn('text-2xl font-bold', color)}>{value}</div>
			{sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
		</motion.div>
	);
}

function KanbanCard({ batch }: { batch: AssignedBatch }) {
	return (
		<div className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 text-sm">
			<div className="flex items-start justify-between gap-2 mb-1.5">
				<span className="font-mono text-xs text-brass-400 font-medium">{batch.batch_number}</span>
				<span className="text-2xs text-slate-600 capitalize">{batch.type}</span>
			</div>
			<p className="text-slate-300 text-xs truncate mb-1">{batch.physical_location}</p>
			<div className="flex items-center gap-1 text-2xs text-slate-500">
				<FileText className="w-3 h-3" />
				{batch.estimated_pages} pages
			</div>
		</div>
	);
}

function BatchKanban({ batches }: { batches: AssignedBatch[] }) {
	const columnBatches = useMemo(
		() =>
			KANBAN_COLUMNS.map((col) => ({
				...col,
				items: batches.filter((b) => col.statuses.includes(b.status)),
			})),
		[batches]
	);

	return (
		<div className="glass-card p-4">
			<h3 className="text-sm font-medium text-slate-200 mb-4 flex items-center gap-2">
				<Layers className="w-4 h-4 text-slate-400" />
				Batch Pipeline
			</h3>
			<div className="grid grid-cols-4 gap-3">
				{columnBatches.map((col) => (
					<div key={col.id} className="flex flex-col gap-2">
						{/* Column header */}
						<div
							className={cn(
								'flex items-center justify-between px-3 py-1.5 rounded-lg',
								col.headerBg
							)}
						>
							<span className={cn('text-xs font-semibold uppercase tracking-wider', col.color)}>
								{col.label}
							</span>
							<span
								className={cn(
									'text-xs font-bold tabular-nums px-1.5 py-0.5 rounded-full',
									col.headerBg,
									col.color
								)}
							>
								{col.items.length}
							</span>
						</div>

						{/* Cards */}
						<div className="space-y-2 min-h-[120px]">
							{col.items.length === 0 ? (
								<p className="text-2xs text-slate-700 text-center pt-4">Empty</p>
							) : (
								col.items.slice(0, 8).map((batch) => (
									<KanbanCard key={batch.id} batch={batch} />
								))
							)}
							{col.items.length > 8 && (
								<p className="text-2xs text-slate-600 text-center pt-1">
									+{col.items.length - 8} more
								</p>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

function OperatorKPITable({ scores }: { scores: OperatorKPI[] }) {
	const rows = scores.map((op, i) => ({
		...op,
		rank: i + 1,
		pagesHour: op.pages_per_hour,
		rescanRate: op.rescan_rate > 0 ? op.rescan_rate.toFixed(1) : '—',
		firstPassYield: op.first_pass_yield > 0 ? `${op.first_pass_yield.toFixed(1)}%` : '—',
	}));

	return (
		<div className="glass-card overflow-hidden">
			<div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800">
				<TrendingUp className="w-4 h-4 text-slate-400" />
				<h3 className="text-sm font-medium text-slate-200">Operator KPIs</h3>
			</div>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-slate-800">
							<th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider w-8">#</th>
							<th className="text-left px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Operator</th>
							<th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Pages Today</th>
							<th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Pages/Hour</th>
							<th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">Rescan Rate</th>
							<th className="text-right px-4 py-2.5 text-xs font-medium text-slate-500 uppercase tracking-wider">First-Pass Yield</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-slate-800/50">
						{rows.length === 0 ? (
							<tr>
								<td colSpan={6} className="px-4 py-8 text-center text-slate-500">
									No active operators today
								</td>
							</tr>
						) : (
							rows.map((op) => (
								<motion.tr
									key={op.operator_id}
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									className="hover:bg-slate-800/30 transition-colors"
								>
									<td className="px-4 py-3">
										<span
											className={cn(
												'inline-flex items-center justify-center w-6 h-6 rounded-md text-xs font-bold',
												op.rank === 1
													? 'bg-yellow-500 text-slate-900'
													: op.rank === 2
													? 'bg-slate-400 text-slate-900'
													: op.rank === 3
													? 'bg-amber-700 text-slate-200'
													: 'bg-slate-800 text-slate-500'
											)}
										>
											{op.rank}
										</span>
									</td>
									<td className="px-4 py-3">
										<span
											className={cn(
												'font-medium',
												op.rank === 1 ? 'text-yellow-400' : 'text-slate-200'
											)}
										>
											{op.operator_name ?? 'Unknown'}
										</span>
									</td>
									<td className="px-4 py-3 text-right font-mono font-bold text-slate-200">
										{op.pages_scanned.toLocaleString()}
									</td>
									<td className="px-4 py-3 text-right text-slate-400">
										{op.pagesHour}
									</td>
									<td className="px-4 py-3 text-right">
										<span
											className={cn(
												'text-sm',
												parseFloat(op.rescanRate as string) > 10
													? 'text-red-400'
													: parseFloat(op.rescanRate as string) > 5
													? 'text-yellow-400'
													: 'text-emerald-400'
											)}
										>
											{op.rescanRate === '—' ? '—' : `${op.rescanRate}%`}
										</span>
									</td>
									<td className="px-4 py-3 text-right">
										<span
											className={cn(
												'text-sm font-medium',
												op.first_pass_yield >= 90
													? 'text-emerald-400'
													: op.first_pass_yield >= 75
													? 'text-yellow-400'
													: 'text-red-400'
											)}
										>
											{op.firstPassYield}
										</span>
									</td>
								</motion.tr>
							))
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component

export function SupervisorDashboard() {
	const { data: operatorKpis = [], isLoading: loadingKpis, isError: kpisError, refetch } = useOperatorKpis(7);
	const { data: batches = [], isLoading: loadingBatches, isError: batchesError } = useAssignedBatches();
	const { data: shiftStats } = useShiftStats();

	const activeOperators = operatorKpis.filter((op) => op.pages_scanned > 0).length;
	const totalPagesToday = operatorKpis.reduce((sum, op) => sum + op.pages_scanned, 0);
	const queueDepth = batches.filter(
		(b) => b.status === 'pending' || b.status === 'in_progress'
	).length;

	const isLoading = loadingKpis || loadingBatches;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-xl font-display font-bold text-slate-100">Supervisor Dashboard</h1>
					<p className="text-sm text-slate-500 mt-0.5">Live operations overview</p>
				</div>
				<button
					onClick={() => refetch()}
					disabled={isLoading}
					className="btn-ghost text-sm"
				>
					<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
					Refresh
				</button>
			</div>

			{/* Live Ops Summary Cards */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<SummaryCard
					label="Active Operators"
					value={activeOperators}
					sub={`${operatorKpis.length} total on roster`}
					icon={Users}
					color="text-brass-400"
					bg="bg-brass-500/10"
					delay={0}
				/>
				<SummaryCard
					label="Pages Today"
					value={totalPagesToday.toLocaleString()}
					sub={
						shiftStats?.target_pages
							? `Target: ${shiftStats.target_pages.toLocaleString()}`
							: undefined
					}
					icon={Activity}
					color="text-emerald-400"
					bg="bg-emerald-500/10"
					delay={0.05}
				/>
				<SummaryCard
					label="Queue Depth"
					value={queueDepth}
					sub="batches pending or in progress"
					icon={Clock}
					color={queueDepth > 20 ? 'text-red-400' : queueDepth > 10 ? 'text-yellow-400' : 'text-slate-300'}
					bg={queueDepth > 20 ? 'bg-red-500/10' : queueDepth > 10 ? 'bg-yellow-500/10' : 'bg-slate-500/10'}
					delay={0.1}
				/>
			</div>

			{(kpisError || batchesError) && (
				<div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
					<AlertCircle className="h-4 w-4 shrink-0" />
					Failed to load supervisor dashboard data. Check your connection and try refreshing.
				</div>
			)}

			{/* Operator KPI Table */}
			{loadingKpis ? (
				<div className="glass-card p-6 text-center text-slate-500 animate-pulse">
					Loading operator data...
				</div>
			) : (
				<OperatorKPITable scores={operatorKpis} />
			)}

			{/* Batch Pipeline Kanban */}
			{loadingBatches ? (
				<div className="glass-card p-6 text-center text-slate-500 animate-pulse">
					Loading batch pipeline...
				</div>
			) : (
				<BatchKanban batches={batches} />
			)}

			{/* Alerts section — high rescan rates */}
			{operatorKpis.some((op) => op.first_pass_yield > 0 && op.first_pass_yield < 75) && (
				<motion.div
					initial={{ opacity: 0, y: 8 }}
					animate={{ opacity: 1, y: 0 }}
					className="glass-card p-4 border border-amber-500/30 bg-amber-500/5"
				>
					<div className="flex items-start gap-3">
						<AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
						<div>
							<p className="text-sm font-medium text-amber-300">Quality Alerts</p>
							<ul className="mt-1 space-y-0.5">
								{operatorKpis
									.filter((op) => op.first_pass_yield > 0 && op.first_pass_yield < 75)
									.map((op) => (
										<li key={op.operator_id} className="text-xs text-amber-400/80">
											{op.operator_name} — first-pass yield {op.first_pass_yield.toFixed(1)}% (below 75% threshold)
										</li>
									))}
							</ul>
						</div>
					</div>
				</motion.div>
			)}
		</div>
	);
}
