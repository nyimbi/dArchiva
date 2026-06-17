// (c) Copyright Datacraft, 2026
import { Flame, RefreshCw, Target } from 'lucide-react';
import { useLeaderboard } from '../api/leaderboard';
import { useOperatorTargets } from '../api/leaderboard';
import { useShiftStats } from '../api/hooks';

// ── progress ring ─────────────────────────────────────────────────────────

interface ProgressRingProps {
	value: number;   // 0–100
	size?: number;
	stroke?: number;
	color?: string;
	label: string;
	sub: string;
}

function ProgressRing({
	value,
	size = 80,
	stroke = 6,
	color = 'text-brass-400',
	label,
	sub,
}: ProgressRingProps) {
	const r = (size - stroke) / 2;
	const circ = 2 * Math.PI * r;
	const offset = circ - (Math.min(value, 100) / 100) * circ;

	return (
		<div className="flex flex-col items-center gap-1">
			<div className="relative" style={{ width: size, height: size }}>
				<svg width={size} height={size} className="-rotate-90">
					{/* track */}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill="none"
						stroke="currentColor"
						strokeWidth={stroke}
						className="text-slate-700"
					/>
					{/* progress */}
					<circle
						cx={size / 2}
						cy={size / 2}
						r={r}
						fill="none"
						stroke="currentColor"
						strokeWidth={stroke}
						strokeDasharray={circ}
						strokeDashoffset={offset}
						strokeLinecap="round"
						className={`${color} transition-all duration-500`}
					/>
				</svg>
				<div className="absolute inset-0 flex items-center justify-center">
					<span className="text-sm font-bold text-slate-100">{Math.round(value)}%</span>
				</div>
			</div>
			<p className="text-xs font-semibold text-slate-300">{label}</p>
			<p className="text-2xs text-slate-500">{sub}</p>
		</div>
	);
}

// ── quality badge ─────────────────────────────────────────────────────────

function QualityBadge({ score }: { score: number }) {
	let cls = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
	let label = 'Excellent';
	if (score < 75) {
		cls = 'bg-red-500/15 text-red-400 border-red-500/30';
		label = 'Needs Improvement';
	} else if (score < 90) {
		cls = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
		label = 'Good';
	}
	return (
		<span
			className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold ${cls}`}
		>
			{label} · {score.toFixed(1)}%
		</span>
	);
}

// ── streak pill ───────────────────────────────────────────────────────────

function StreakPill({ days }: { days: number }) {
	if (days <= 0) return null;
	return (
		<span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold">
			<Flame className="w-3.5 h-3.5" />
			{days} day streak
		</span>
	);
}

// ── stat pill ─────────────────────────────────────────────────────────────

function StatPill({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="flex flex-col items-center gap-0.5 px-4 py-3 bg-slate-800/50 rounded-xl border border-slate-700/40">
			<span className="text-lg font-bold text-slate-100">{value}</span>
			<span className="text-2xs text-slate-500 uppercase tracking-wide font-medium">{label}</span>
		</div>
	);
}

// ── main component ────────────────────────────────────────────────────────

interface OperatorScorecardProps {
	/** If omitted, falls back to current user (from shift stats). */
	userId?: string;
}

export function OperatorScorecard({ userId }: OperatorScorecardProps) {
	// All hooks must be called unconditionally before any early return.
	const { data: stats, isLoading: statsLoading } = useShiftStats();
	const { data: targets, isLoading: targetsLoading } = useOperatorTargets(userId);
	const { data: leaderboardData } = useLeaderboard('today');
	const { data: weekData } = useLeaderboard('week');
	const { data: monthData } = useLeaderboard('month');

	const isLoading = statsLoading || targetsLoading;

	if (isLoading) {
		return (
			<div className="glass-card flex items-center justify-center h-36 gap-2 text-slate-500">
				<RefreshCw className="w-4 h-4 animate-spin" />
				<span className="text-sm">Loading scorecard…</span>
			</div>
		);
	}

	// Find quality from leaderboard if available
	const myEntry = leaderboardData?.entries.find(
		(e) => !userId || e.user_id === userId,
	);
	const qualityScore = myEntry?.avg_quality_score ?? stats?.quality_score ?? 0;
	const pagesScanned = stats?.pages_scanned ?? 0;
	const dailyTarget = targets?.daily_page_target ?? 500;
	const dailyPct = dailyTarget > 0 ? (pagesScanned / dailyTarget) * 100 : 0;

	const weekEntry = weekData?.entries.find(
		(e) => !userId || e.user_id === userId,
	);
	const weekPages = weekEntry?.pages_scanned ?? 0;

	const monthEntry = monthData?.entries.find(
		(e) => !userId || e.user_id === userId,
	);
	const monthBatches = monthEntry?.batches_completed ?? 0;

	// Streak: count consecutive days with pages > 0 from today entry trend
	const trend = myEntry?.trend_pages ?? [];
	let streak = 0;
	for (let i = trend.length - 1; i >= 0; i--) {
		if (trend[i] > 0) streak++;
		else break;
	}

	return (
		<div className="glass-card p-5 space-y-4">
			{/* Header */}
			<div className="flex items-center justify-between flex-wrap gap-2">
				<div className="flex items-center gap-2">
					<Target className="w-4 h-4 text-brass-400" />
					<h3 className="text-sm font-semibold text-slate-200">My Scorecard</h3>
				</div>
				<div className="flex items-center gap-2 flex-wrap">
					<QualityBadge score={qualityScore} />
					<StreakPill days={streak} />
				</div>
			</div>

			{/* Rings + stats row */}
			<div className="flex items-center gap-6 flex-wrap">
				{/* Daily progress ring */}
				<ProgressRing
					value={dailyPct}
					label="Today"
					sub={`${pagesScanned} / ${dailyTarget} pages`}
					color={dailyPct >= 100 ? 'text-emerald-400' : dailyPct >= 60 ? 'text-brass-400' : 'text-amber-400'}
				/>

				{/* Stat pills */}
				<div className="flex gap-3 flex-wrap">
					<StatPill label="Pages this week" value={weekPages.toLocaleString()} />
					<StatPill label="Batches this month" value={monthBatches} />
					<StatPill label="Daily target" value={dailyTarget.toLocaleString()} />
				</div>
			</div>
		</div>
	);
}
