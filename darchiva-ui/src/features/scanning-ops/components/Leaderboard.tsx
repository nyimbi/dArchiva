// (c) Copyright Datacraft, 2026
import { AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import {
	useLeaderboard,
	type LeaderboardEntry,
	type LeaderboardPeriod,
} from '../api/leaderboard';

// ── sparkline ─────────────────────────────────────────────────────────────

function Sparkline({ values }: { values: number[] }) {
	if (!values.length) return <span className="text-slate-600 text-xs">—</span>;

	const w = 56;
	const h = 20;
	const max = Math.max(...values, 1);
	const pts = values
		.map((v, i) => {
			const x = (i / (values.length - 1)) * w;
			const y = h - (v / max) * h;
			return `${x},${y}`;
		})
		.join(' ');

	return (
		<svg width={w} height={h} className="overflow-visible">
			<polyline
				points={pts}
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				strokeLinejoin="round"
				strokeLinecap="round"
				className="text-brass-400"
			/>
			{values.map((v, i) => {
				const x = (i / (values.length - 1)) * w;
				const y = h - (v / max) * h;
				return (
					<circle
						key={i}
						cx={x}
						cy={y}
						r={1.5}
						className="fill-brass-400"
					/>
				);
			})}
		</svg>
	);
}

// ── rank badge ────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
	if (rank === 1) return <span className="text-xl leading-none">🥇</span>;
	if (rank === 2) return <span className="text-xl leading-none">🥈</span>;
	if (rank === 3) return <span className="text-xl leading-none">🥉</span>;
	return (
		<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700 text-slate-300 text-xs font-bold">
			{rank}
		</span>
	);
}

// ── quality colour ────────────────────────────────────────────────────────

function qualityColor(score: number): string {
	if (score >= 90) return 'text-emerald-400';
	if (score >= 75) return 'text-amber-400';
	return 'text-red-400';
}

// ── period tabs ───────────────────────────────────────────────────────────

const PERIODS: { id: LeaderboardPeriod; label: string }[] = [
	{ id: 'today', label: 'Today' },
	{ id: 'week', label: 'This Week' },
	{ id: 'month', label: 'This Month' },
];

// ── row ───────────────────────────────────────────────────────────────────

function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
	return (
		<tr className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
			<td className="px-4 py-3 text-center w-12">
				<RankBadge rank={entry.rank} />
			</td>
			<td className="px-4 py-3 text-slate-100 font-medium whitespace-nowrap">
				{entry.username}
			</td>
			<td className="px-4 py-3 text-right font-mono text-slate-200 font-semibold">
				{entry.pages_scanned.toLocaleString()}
			</td>
			<td className="px-4 py-3 text-right font-mono text-slate-400">
				{entry.batches_completed}
			</td>
			<td className={`px-4 py-3 text-right font-mono font-semibold ${qualityColor(entry.avg_quality_score)}`}>
				{entry.avg_quality_score.toFixed(1)}%
			</td>
			<td className="px-4 py-3 text-right">
				<Sparkline values={entry.trend_pages} />
			</td>
		</tr>
	);
}

// ── main component ────────────────────────────────────────────────────────

interface LeaderboardProps {
	period?: LeaderboardPeriod;
}

export function Leaderboard({ period: defaultPeriod = 'today' }: LeaderboardProps) {
	const [period, setPeriod] = useState<LeaderboardPeriod>(defaultPeriod);
	const { data, isLoading, error } = useLeaderboard(period);

	return (
		<div className="glass-card">
			{/* Header */}
			<div className="px-5 py-4 border-b border-slate-700/60 flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2">
					<TrendingUp className="w-4 h-4 text-brass-400" />
					<h2 className="text-sm font-semibold text-slate-200">Operator Leaderboard</h2>
				</div>

				{/* Period tabs */}
				<div className="flex gap-1 bg-slate-800/60 p-0.5 rounded-lg">
					{PERIODS.map((p) => (
						<button
							key={p.id}
							onClick={() => setPeriod(p.id)}
							className={[
								'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
								period === p.id
									? 'bg-slate-700 text-slate-100 shadow-sm'
									: 'text-slate-400 hover:text-slate-200',
							].join(' ')}
						>
							{p.label}
						</button>
					))}
				</div>
			</div>

			{/* Body */}
			{isLoading ? (
				<div className="flex items-center justify-center h-40 gap-2 text-slate-500">
					<RefreshCw className="w-4 h-4 animate-spin" />
					<span className="text-sm">Loading leaderboard…</span>
				</div>
			) : error ? (
				<div className="flex items-center gap-2 rounded-md border border-red-800 bg-red-950/40 px-4 py-3 text-sm text-red-400">
					<AlertCircle className="h-4 w-4 shrink-0" />
					Failed to load leaderboard. Check your connection and try refreshing.
				</div>
			) : !data || data.entries.length === 0 ? (
				<div className="flex flex-col items-center justify-center h-40 gap-2 text-slate-500">
					<TrendingUp className="w-6 h-6 opacity-40" />
					<span className="text-sm">No scanning data for this period yet.</span>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-slate-700/40">
								<th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-12">
									#
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
									Operator
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
									Pages
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
									Batches
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
									Quality
								</th>
								<th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
									7d Trend
								</th>
							</tr>
						</thead>
						<tbody>
							{data.entries.map((entry) => (
								<LeaderboardRow key={entry.user_id} entry={entry} />
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
