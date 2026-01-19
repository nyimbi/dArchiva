// (c) Copyright Datacraft, 2026
/**
 * Policy evaluation log viewer with filtering.
 */
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldOff, Search, Filter, Clock, User, File, Zap, RefreshCw } from 'lucide-react';
import type { EvaluationLog } from '../types';
import { fetchEvaluationLogs } from '../api';

interface LogRowProps {
	log: EvaluationLog;
}

function LogRow({ log }: LogRowProps) {
	const time = new Date(log.timestamp).toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
	});

	return (
		<motion.tr
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			className="border-b border-charcoal/5 transition-colors hover:bg-cream/50"
		>
			{/* Status */}
			<td className="py-3 pl-4">
				<div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
					log.allowed ? 'bg-sage/15' : 'bg-terracotta/15'
				}`}>
					{log.allowed ? (
						<Shield className="h-4 w-4 text-sage" />
					) : (
						<ShieldOff className="h-4 w-4 text-terracotta" />
					)}
				</div>
			</td>

			{/* Time */}
			<td className="py-3 font-['DM_Sans'] text-sm tabular-nums text-charcoal/60">
				{time}
			</td>

			{/* Subject */}
			<td className="py-3">
				<div className="flex items-center gap-2">
					<User className="h-3.5 w-3.5 text-charcoal/40" />
					<span className="font-['DM_Sans'] text-sm text-charcoal">
						{log.subject_username || log.subject_id.slice(0, 8)}
					</span>
				</div>
			</td>

			{/* Action */}
			<td className="py-3">
				<span className="inline-flex items-center gap-1 rounded bg-charcoal/5 px-2 py-1 font-['DM_Sans'] text-xs font-medium text-charcoal/70">
					<Zap className="h-3 w-3" />
					{log.action}
				</span>
			</td>

			{/* Resource */}
			<td className="py-3">
				<div className="flex items-center gap-2">
					<File className="h-3.5 w-3.5 text-charcoal/40" />
					<span className="font-['DM_Sans'] text-sm text-charcoal/70">
						{log.resource_type}
					</span>
					<span className="font-['DM_Sans'] text-xs text-charcoal/40">
						{log.resource_id.slice(0, 8)}...
					</span>
				</div>
			</td>

			{/* Latency */}
			<td className="py-3 font-['DM_Sans'] text-sm tabular-nums text-charcoal/50">
				{log.evaluation_time_ms}ms
			</td>

			{/* Reason */}
			<td className="max-w-[200px] truncate py-3 pr-4 font-['DM_Sans'] text-sm text-charcoal/50" title={log.reason}>
				{log.reason || '-'}
			</td>
		</motion.tr>
	);
}

export function EvaluationLogViewer() {
	const [logs, setLogs] = useState<EvaluationLog[]>([]);
	const [loading, setLoading] = useState(true);
	const [filters, setFilters] = useState({
		action: '',
		hours: 24,
		limit: 100,
	});
	const [searchQuery, setSearchQuery] = useState('');

	const loadLogs = async () => {
		setLoading(true);
		try {
			const data = await fetchEvaluationLogs({
				action: filters.action || undefined,
				hours: filters.hours,
				limit: filters.limit,
			});
			setLogs(data);
		} catch (err) {
			console.error('Failed to load logs:', err);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadLogs();
	}, [filters]);

	const filteredLogs = logs.filter(log => {
		if (!searchQuery) return true;
		const q = searchQuery.toLowerCase();
		return (
			log.subject_username?.toLowerCase().includes(q) ||
			log.subject_id.toLowerCase().includes(q) ||
			log.resource_id.toLowerCase().includes(q) ||
			log.action.toLowerCase().includes(q)
		);
	});

	const allowCount = logs.filter(l => l.allowed).length;
	const denyCount = logs.length - allowCount;

	return (
		<div className="overflow-hidden rounded-xl border-2 border-charcoal/10 bg-parchment">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-charcoal/10 bg-cream/50 px-5 py-4">
				<div className="flex items-center gap-3">
					<Clock className="h-5 w-5 text-charcoal/60" />
					<h2 className="font-['Newsreader'] text-xl font-semibold text-charcoal">
						Evaluation Log
					</h2>
					<div className="flex gap-2">
						<span className="rounded-full bg-sage/15 px-2 py-0.5 font-['DM_Sans'] text-xs font-medium text-sage">
							{allowCount} allowed
						</span>
						<span className="rounded-full bg-terracotta/15 px-2 py-0.5 font-['DM_Sans'] text-xs font-medium text-terracotta">
							{denyCount} denied
						</span>
					</div>
				</div>

				<button
					onClick={loadLogs}
					disabled={loading}
					className="flex items-center gap-2 rounded-lg bg-charcoal/5 px-3 py-2 font-['DM_Sans'] text-sm text-charcoal transition-colors hover:bg-charcoal/10 disabled:opacity-50"
				>
					<RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
					Refresh
				</button>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3 border-b border-charcoal/10 px-5 py-3">
				<div className="relative flex-1 min-w-[200px]">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
					<input
						type="text"
						placeholder="Search by user, resource, action..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full rounded-lg border border-charcoal/10 bg-cream py-2 pl-9 pr-4 font-['DM_Sans'] text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal/30 focus:outline-none"
					/>
				</div>

				<select
					value={filters.action}
					onChange={(e) => setFilters({ ...filters, action: e.target.value })}
					className="rounded-lg border border-charcoal/10 bg-cream px-3 py-2 font-['DM_Sans'] text-sm text-charcoal focus:border-charcoal/30 focus:outline-none"
				>
					<option value="">All Actions</option>
					<option value="view">view</option>
					<option value="edit">edit</option>
					<option value="delete">delete</option>
					<option value="share">share</option>
					<option value="download">download</option>
				</select>

				<select
					value={filters.hours}
					onChange={(e) => setFilters({ ...filters, hours: Number(e.target.value) })}
					className="rounded-lg border border-charcoal/10 bg-cream px-3 py-2 font-['DM_Sans'] text-sm text-charcoal focus:border-charcoal/30 focus:outline-none"
				>
					<option value={1}>Last hour</option>
					<option value={6}>Last 6 hours</option>
					<option value={24}>Last 24 hours</option>
					<option value={72}>Last 3 days</option>
					<option value={168}>Last week</option>
				</select>
			</div>

			{/* Table */}
			{loading ? (
				<div className="flex items-center justify-center py-16">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
				</div>
			) : filteredLogs.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<Clock className="h-12 w-12 text-charcoal/20" />
					<p className="mt-4 font-['Newsreader'] text-lg text-charcoal/60">No logs found</p>
					<p className="mt-1 font-['DM_Sans'] text-sm text-charcoal/40">
						Policy evaluations will appear here
					</p>
				</div>
			) : (
				<div className="max-h-[500px] overflow-auto">
					<table className="w-full">
						<thead className="sticky top-0 bg-cream/95 backdrop-blur">
							<tr className="border-b border-charcoal/10 text-left">
								<th className="py-3 pl-4 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
									Result
								</th>
								<th className="py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
									Time
								</th>
								<th className="py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
									Subject
								</th>
								<th className="py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
									Action
								</th>
								<th className="py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
									Resource
								</th>
								<th className="py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
									Latency
								</th>
								<th className="py-3 pr-4 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
									Reason
								</th>
							</tr>
						</thead>
						<tbody>
							{filteredLogs.map(log => (
								<LogRow key={log.id} log={log} />
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
