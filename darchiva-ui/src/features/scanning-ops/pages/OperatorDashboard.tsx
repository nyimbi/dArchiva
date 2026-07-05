import { Activity, AlertTriangle, RefreshCw, Target, TrendingUp, Users } from 'lucide-react';
import { useOperatorKpis } from '@/features/scanning-projects/api/hooks';
import type { OperatorKPI } from '@/features/scanning-projects/api/index';
import { useShiftStats } from '../api/hooks';

// ── Helpers ──────────────────────────────────────────────────────────────────

function deriveStatus(kpi: OperatorKPI): 'scanning' | 'idle' | 'break' {
    if (kpi.idle_time_min > 30) return 'break';
    if (kpi.pages_per_hour > 0) return 'scanning';
    return 'idle';
}

const STATUS_STYLE = {
    scanning: { dot: 'bg-green-500 animate-pulse', label: 'text-green-400', text: 'Scanning' },
    idle:     { dot: 'bg-amber-400',               label: 'text-amber-400', text: 'Idle'     },
    break:    { dot: 'bg-blue-400',                 label: 'text-blue-400', text: 'Break'    },
} as const;

function qualityColor(score: number) {
    if (score >= 90) return 'text-green-400';
    if (score >= 75) return 'text-amber-400';
    return 'text-red-400';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({
    label,
    value,
    sub,
    icon: Icon,
    iconBg,
    iconColor,
    valueColor,
}: {
    label: string;
    value: string | number;
    sub: string;
    icon: typeof Activity;
    iconBg: string;
    iconColor: string;
    valueColor: string;
}) {
    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
                <div className={`p-2 rounded-lg ${iconBg}`}>
                    <Icon className={`w-4 h-4 ${iconColor}`} />
                </div>
            </div>
            <div className={`text-3xl font-bold ${valueColor}`}>{value}</div>
            <div className="text-xs text-slate-500 mt-1">{sub}</div>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export function OperatorDashboard() {
    const { data: operatorKpis = [], isLoading, refetch } = useOperatorKpis(1);
    const { data: shiftStats } = useShiftStats();

    const activeCount   = operatorKpis.filter(op => op.pages_per_hour > 0).length;
    const totalPages    = operatorKpis.reduce((s, op) => s + op.pages_scanned, 0);
    const targetPages   = shiftStats?.target_pages ?? 0;
    const qualScores    = operatorKpis.filter(op => op.first_pass_yield > 0).map(op => op.first_pass_yield);
    const avgQuality    = qualScores.length > 0
        ? qualScores.reduce((s, v) => s + v, 0) / qualScores.length
        : 0;
    const targetPct     = targetPages > 0 ? Math.round((totalPages / targetPages) * 100) : null;
    const alertOps      = operatorKpis.filter(op => op.first_pass_yield > 0 && op.first_pass_yield < 75);
    const maxPages      = Math.max(...operatorKpis.map(op => op.pages_scanned), 1);

    return (
        <div className="h-full flex flex-col gap-6 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100">Team Overview</h1>
                    <p className="text-sm text-slate-500">Live operator performance — today</p>
                </div>
                <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 text-sm font-bold transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-4 gap-4 shrink-0">
                <SummaryCard
                    label="Operators Active"
                    value={activeCount}
                    sub={`${operatorKpis.length} total on roster`}
                    icon={Users}
                    iconBg="bg-brass-500/10"
                    iconColor="text-brass-400"
                    valueColor="text-brass-400"
                />
                <SummaryCard
                    label="Total Pages Today"
                    value={totalPages.toLocaleString()}
                    sub="across all operators"
                    icon={Activity}
                    iconBg="bg-green-500/10"
                    iconColor="text-green-400"
                    valueColor="text-green-400"
                />
                <SummaryCard
                    label="Avg Quality Score"
                    value={avgQuality > 0 ? `${avgQuality.toFixed(1)}%` : '—'}
                    sub="first-pass yield"
                    icon={TrendingUp}
                    iconBg="bg-blue-500/10"
                    iconColor="text-blue-400"
                    valueColor={avgQuality > 0 ? qualityColor(avgQuality) : 'text-slate-400'}
                />
                <SummaryCard
                    label="Target vs Actual"
                    value={targetPct !== null ? `${targetPct}%` : '—'}
                    sub={
                        targetPages > 0
                            ? `${totalPages.toLocaleString()} / ${targetPages.toLocaleString()} pages`
                            : 'no shift target set'
                    }
                    icon={Target}
                    iconBg="bg-purple-500/10"
                    iconColor="text-purple-400"
                    valueColor={
                        targetPct === null ? 'text-slate-400'
                        : targetPct >= 100 ? 'text-green-400'
                        : targetPct >= 75  ? 'text-amber-400'
                        : 'text-slate-200'
                    }
                />
            </div>

            {/* Operators Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shrink-0">
                <div className="px-6 py-4 border-b border-slate-800">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Operators</h2>
                </div>

                {isLoading ? (
                    <div className="px-6 py-12 text-center text-slate-500 animate-pulse">
                        Loading operator data…
                    </div>
                ) : operatorKpis.length === 0 ? (
                    <div className="px-6 py-12 text-center text-slate-500">
                        No operator data for today
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-800">
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Operator</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Project</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Pages</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Quality</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase min-w-[160px]">Progress</th>
                                    <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/50">
                                {operatorKpis.map((op) => {
                                    const status  = deriveStatus(op);
                                    const style   = STATUS_STYLE[status];
                                    const progress = Math.min(100, (op.pages_scanned / maxPages) * 100);
                                    return (
                                        <tr key={op.operator_id} className="hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 font-bold text-slate-200">
                                                {op.operator_name ?? 'Unknown'}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 max-w-[180px] truncate">
                                                {op.project_name ?? '—'}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono font-bold text-brass-400">
                                                {op.pages_scanned.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-bold ${op.first_pass_yield > 0 ? qualityColor(op.first_pass_yield) : 'text-slate-500'}`}>
                                                    {op.first_pass_yield > 0 ? `${op.first_pass_yield.toFixed(1)}%` : '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 w-48">
                                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-brass-500 rounded-full transition-all duration-700"
                                                        style={{ width: `${progress}%` }}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                    <span className={`text-xs font-bold ${style.label}`}>
                                                        {style.text}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Alerts */}
            {alertOps.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/30 rounded-2xl p-6 shrink-0">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <h3 className="text-sm font-bold text-amber-300 mb-2">
                                Operators Needing Attention ({alertOps.length})
                            </h3>
                            <div className="space-y-1.5">
                                {alertOps.map((op) => (
                                    <div key={op.operator_id} className="flex items-center gap-3 text-xs">
                                        <span className="font-bold text-amber-400">{op.operator_name}</span>
                                        <span className="text-slate-400">
                                            First-pass yield {op.first_pass_yield.toFixed(1)}% — below 75% threshold
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* No-alert positive state */}
            {!isLoading && operatorKpis.length > 0 && alertOps.length === 0 && (
                <div className="bg-green-500/5 border border-green-500/20 rounded-2xl px-6 py-4 shrink-0">
                    <p className="text-sm text-green-400 font-medium">
                        All operators within quality thresholds — no alerts.
                    </p>
                </div>
            )}
        </div>
    );
}
