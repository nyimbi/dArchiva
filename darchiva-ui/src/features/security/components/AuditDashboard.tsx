// (c) Copyright Datacraft, 2026
/**
 * Audit dashboard for security monitoring and access logging.
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
	Activity,
	Clock,
	User,
	FileText,
	CheckCircle2,
	XCircle,
	AlertTriangle,
	Search,
	Filter,
	Download,
	Calendar,
	Globe,
	Monitor,
	ChevronDown,
	RefreshCw,
	BarChart3,
} from 'lucide-react';
import { cn, formatDateTime, formatRelativeTime } from '@/lib/utils';
import type { AuditLogEntry } from '../types';
import type { AuditFilters } from '../api';

interface AuditDashboardProps {
	logs: AuditLogEntry[];
	total: number;
	page: number;
	limit: number;
	onPageChange: (page: number) => void;
	onFilterChange: (filters: AuditFilters) => void;
	onExport: () => void;
	onRefresh: () => void;
	isLoading?: boolean;
}

const OUTCOME_ICONS = {
	success: CheckCircle2,
	failure: XCircle,
	denied: AlertTriangle,
};

const OUTCOME_COLORS = {
	success: 'text-emerald-400 bg-emerald-500/10',
	failure: 'text-red-400 bg-red-500/10',
	denied: 'text-amber-400 bg-amber-500/10',
};

const ACTION_COLORS: Record<string, string> = {
	view: 'bg-blue-500/10 text-blue-400',
	create: 'bg-emerald-500/10 text-emerald-400',
	edit: 'bg-amber-500/10 text-amber-400',
	delete: 'bg-red-500/10 text-red-400',
	share: 'bg-purple-500/10 text-purple-400',
	approve: 'bg-cyan-500/10 text-cyan-400',
	login: 'bg-brass-500/10 text-brass-400',
	logout: 'bg-slate-500/10 text-slate-400',
};

export function AuditDashboard({
	logs,
	total,
	page,
	limit,
	onPageChange,
	onFilterChange,
	onExport,
	onRefresh,
	isLoading,
}: AuditDashboardProps) {
	const [filters, setFilters] = useState<AuditFilters>({});
	const [showFilters, setShowFilters] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	// Stats from logs
	const stats = useMemo(() => {
		const counts = { success: 0, failure: 0, denied: 0 };
		const actionCounts: Record<string, number> = {};
		const userCounts: Record<string, number> = {};

		logs.forEach((log) => {
			counts[log.outcome]++;
			actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
			userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
		});

		return { counts, actionCounts, userCounts };
	}, [logs]);

	const filteredLogs = useMemo(() => {
		if (!searchQuery) return logs;
		const query = searchQuery.toLowerCase();
		return logs.filter(
			(log) =>
				log.userName.toLowerCase().includes(query) ||
				log.action.toLowerCase().includes(query) ||
				log.resourceName.toLowerCase().includes(query) ||
				log.resourceType.toLowerCase().includes(query)
		);
	}, [logs, searchQuery]);

	const totalPages = Math.ceil(total / limit);

	const updateFilter = (key: keyof AuditFilters, value: string | undefined) => {
		const newFilters = { ...filters, [key]: value || undefined };
		setFilters(newFilters);
		onFilterChange(newFilters);
	};

	return (
		<div className="space-y-6">
			{/* Stats Cards */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="stat-card"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-500">Total Events</p>
							<p className="mt-2 text-2xl font-display font-semibold text-slate-100">
								{total.toLocaleString()}
							</p>
						</div>
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400">
							<Activity className="w-5 h-5" />
						</div>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="stat-card"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-500">Successful</p>
							<p className="mt-2 text-2xl font-display font-semibold text-emerald-400">
								{stats.counts.success.toLocaleString()}
							</p>
						</div>
						<div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
							<CheckCircle2 className="w-5 h-5" />
						</div>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="stat-card"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-500">Denied</p>
							<p className="mt-2 text-2xl font-display font-semibold text-amber-400">
								{stats.counts.denied.toLocaleString()}
							</p>
						</div>
						<div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
							<AlertTriangle className="w-5 h-5" />
						</div>
					</div>
				</motion.div>

				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="stat-card"
				>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-slate-500">Failures</p>
							<p className="mt-2 text-2xl font-display font-semibold text-red-400">
								{stats.counts.failure.toLocaleString()}
							</p>
						</div>
						<div className="p-2 rounded-lg bg-red-500/10 text-red-400">
							<XCircle className="w-5 h-5" />
						</div>
					</div>
				</motion.div>
			</div>

			{/* Main Log Table */}
			<div className="glass-card overflow-hidden">
				{/* Header */}
				<div className="p-4 border-b border-slate-700/50 flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-brass-500/10">
							<BarChart3 className="w-5 h-5 text-brass-400" />
						</div>
						<div>
							<h2 className="font-display font-semibold text-slate-100">Audit Log</h2>
							<p className="text-xs text-slate-500 mt-0.5">
								Showing {filteredLogs.length} of {total} events
							</p>
						</div>
					</div>

					<div className="flex items-center gap-3">
						{/* Search */}
						<div className="relative">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
							<input
								type="text"
								placeholder="Search logs..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="w-48 pl-9 pr-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brass-500/50"
							/>
						</div>

						{/* Filter Toggle */}
						<button
							onClick={() => setShowFilters(!showFilters)}
							className={cn(
								'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
								showFilters
									? 'bg-brass-500/20 border-brass-500/50 text-brass-400'
									: 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:bg-slate-700/50'
							)}
						>
							<Filter className="w-4 h-4" />
							Filters
							<ChevronDown
								className={cn('w-3 h-3 transition-transform', showFilters && 'rotate-180')}
							/>
						</button>

						{/* Refresh */}
						<button
							onClick={onRefresh}
							disabled={isLoading}
							className="p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:bg-slate-700/50 disabled:opacity-50 transition-colors"
						>
							<RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
						</button>

						{/* Export */}
						<button
							onClick={onExport}
							className="flex items-center gap-2 px-3 py-2 bg-brass-500/10 border border-brass-500/30 rounded-lg text-sm text-brass-400 hover:bg-brass-500/20 transition-colors"
						>
							<Download className="w-4 h-4" />
							Export
						</button>
					</div>
				</div>

				{/* Filter Panel */}
				{showFilters && (
					<motion.div
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
						className="p-4 border-b border-slate-700/50 bg-slate-800/30"
					>
						<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
							{/* Outcome */}
							<div className="space-y-1">
								<label className="text-xs text-slate-500">Outcome</label>
								<select
									value={filters.outcome || ''}
									onChange={(e) => updateFilter('outcome', e.target.value)}
									className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200"
								>
									<option value="">All</option>
									<option value="success">Success</option>
									<option value="denied">Denied</option>
									<option value="failure">Failure</option>
								</select>
							</div>

							{/* Action */}
							<div className="space-y-1">
								<label className="text-xs text-slate-500">Action</label>
								<select
									value={filters.action || ''}
									onChange={(e) => updateFilter('action', e.target.value)}
									className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200"
								>
									<option value="">All</option>
									<option value="view">View</option>
									<option value="create">Create</option>
									<option value="edit">Edit</option>
									<option value="delete">Delete</option>
									<option value="share">Share</option>
									<option value="login">Login</option>
									<option value="logout">Logout</option>
								</select>
							</div>

							{/* Resource Type */}
							<div className="space-y-1">
								<label className="text-xs text-slate-500">Resource Type</label>
								<select
									value={filters.resourceType || ''}
									onChange={(e) => updateFilter('resourceType', e.target.value)}
									className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200"
								>
									<option value="">All</option>
									<option value="document">Document</option>
									<option value="folder">Folder</option>
									<option value="user">User</option>
									<option value="role">Role</option>
									<option value="workflow">Workflow</option>
								</select>
							</div>

							{/* Start Date */}
							<div className="space-y-1">
								<label className="text-xs text-slate-500">From</label>
								<input
									type="date"
									value={filters.startDate || ''}
									onChange={(e) => updateFilter('startDate', e.target.value)}
									className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200"
								/>
							</div>

							{/* End Date */}
							<div className="space-y-1">
								<label className="text-xs text-slate-500">To</label>
								<input
									type="date"
									value={filters.endDate || ''}
									onChange={(e) => updateFilter('endDate', e.target.value)}
									className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200"
								/>
							</div>
						</div>
					</motion.div>
				)}

				{/* Log Table */}
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="bg-slate-800/30">
								<th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
									Timestamp
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
									User
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
									Action
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
									Resource
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
									Outcome
								</th>
								<th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
									Details
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-800/50">
							{filteredLogs.map((log, idx) => {
								const OutcomeIcon = OUTCOME_ICONS[log.outcome];
								return (
									<motion.tr
										key={log.id}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{ delay: idx * 0.02 }}
										className="hover:bg-slate-800/30 transition-colors"
									>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="flex items-center gap-2">
												<Clock className="w-4 h-4 text-slate-500" />
												<div>
													<p className="text-sm text-slate-200">
														{formatDateTime(log.timestamp)}
													</p>
													<p className="text-xs text-slate-500">
														{formatRelativeTime(log.timestamp)}
													</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="flex items-center gap-2">
												<div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
													<User className="w-4 h-4 text-blue-400" />
												</div>
												<span className="text-sm text-slate-200">{log.userName}</span>
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<span
												className={cn(
													'px-2 py-1 rounded text-xs capitalize',
													ACTION_COLORS[log.action] || 'bg-slate-700/50 text-slate-400'
												)}
											>
												{log.action}
											</span>
										</td>
										<td className="px-4 py-3">
											<div className="flex items-center gap-2 max-w-xs">
												<FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
												<div className="min-w-0">
													<p className="text-sm text-slate-200 truncate">
														{log.resourceName}
													</p>
													<p className="text-xs text-slate-500">{log.resourceType}</p>
												</div>
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div
												className={cn(
													'inline-flex items-center gap-1.5 px-2 py-1 rounded',
													OUTCOME_COLORS[log.outcome]
												)}
											>
												<OutcomeIcon className="w-3.5 h-3.5" />
												<span className="text-xs capitalize">{log.outcome}</span>
											</div>
										</td>
										<td className="px-4 py-3 whitespace-nowrap">
											<div className="flex items-center gap-2 text-xs text-slate-500">
												<Globe className="w-3 h-3" />
												<span className="font-mono">{log.ipAddress}</span>
											</div>
										</td>
									</motion.tr>
								);
							})}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				<div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
					<p className="text-sm text-slate-500">
						Page {page} of {totalPages}
					</p>
					<div className="flex items-center gap-2">
						<button
							onClick={() => onPageChange(page - 1)}
							disabled={page <= 1}
							className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-slate-400 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							Previous
						</button>
						<button
							onClick={() => onPageChange(page + 1)}
							disabled={page >= totalPages}
							className="px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-sm text-slate-400 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							Next
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
