// (c) Copyright Datacraft, 2026
/**
 * Exception queue table with inline resolve/dismiss actions and filters.
 */
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ExternalLink,
	Filter,
	RefreshCw,
	XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useDismissException, useExceptions, useResolveException } from '../api/hooks';
import type {
	ExceptionSeverity,
	ExceptionStatus,
	ExceptionType,
} from '../types';
import {
	EXCEPTION_SEVERITY_CONFIG,
	EXCEPTION_STATUS_CONFIG,
	EXCEPTION_TYPE_LABELS,
} from '../types';

const SEVERITY_ICONS: Record<ExceptionSeverity, typeof AlertCircle> = {
	low: AlertCircle,
	medium: AlertTriangle,
	high: AlertTriangle,
	critical: XCircle,
};

export function ExceptionQueue() {
	const [statusFilter, setStatusFilter] = useState<ExceptionStatus | undefined>('open');
	const [typeFilter, setTypeFilter] = useState<ExceptionType | undefined>(undefined);
	const [severityFilter, setSeverityFilter] = useState<ExceptionSeverity | undefined>(undefined);
	const [page, setPage] = useState(1);
	const PAGE_SIZE = 20;

	const { data, isLoading, refetch, isFetching } = useExceptions({
		status: statusFilter,
		type: typeFilter,
		severity: severityFilter,
		page,
		pageSize: PAGE_SIZE,
	});

	const resolveException = useResolveException();
	const dismissException = useDismissException();

	const exceptions = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / PAGE_SIZE);

	return (
		<div className="space-y-4">
			{/* Toolbar */}
			<div className="flex items-center justify-between gap-3 flex-wrap">
				<div className="flex items-center gap-2 flex-wrap">
					<Filter className="w-4 h-4 text-slate-400" />

					{/* Status filter */}
					<div className="relative">
						<select
							value={statusFilter ?? ''}
							onChange={(e) => {
								setStatusFilter((e.target.value as ExceptionStatus) || undefined);
								setPage(1);
							}}
							className="appearance-none pl-3 pr-8 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 cursor-pointer focus:outline-none focus:border-brass-500"
						>
							<option value="">All Statuses</option>
							<option value="open">Open</option>
							<option value="in_progress">In Progress</option>
							<option value="resolved">Resolved</option>
							<option value="dismissed">Dismissed</option>
						</select>
						<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
					</div>

					{/* Type filter */}
					<div className="relative">
						<select
							value={typeFilter ?? ''}
							onChange={(e) => {
								setTypeFilter((e.target.value as ExceptionType) || undefined);
								setPage(1);
							}}
							className="appearance-none pl-3 pr-8 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 cursor-pointer focus:outline-none focus:border-brass-500"
						>
							<option value="">All Types</option>
							{(Object.entries(EXCEPTION_TYPE_LABELS) as [ExceptionType, string][]).map(
								([type, label]) => (
									<option key={type} value={type}>{label}</option>
								)
							)}
						</select>
						<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
					</div>

					{/* Severity filter */}
					<div className="relative">
						<select
							value={severityFilter ?? ''}
							onChange={(e) => {
								setSeverityFilter((e.target.value as ExceptionSeverity) || undefined);
								setPage(1);
							}}
							className="appearance-none pl-3 pr-8 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 cursor-pointer focus:outline-none focus:border-brass-500"
						>
							<option value="">All Severities</option>
							<option value="critical">Critical</option>
							<option value="high">High</option>
							<option value="medium">Medium</option>
							<option value="low">Low</option>
						</select>
						<ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
					</div>
				</div>

				<div className="flex items-center gap-2">
					<span className="text-sm text-slate-500">{total} exception{total !== 1 ? 's' : ''}</span>
					<button
						onClick={() => refetch()}
						disabled={isFetching}
						className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
					>
						<RefreshCw className={cn('w-4 h-4', isFetching && 'animate-spin')} />
					</button>
				</div>
			</div>

			{/* Table */}
			<div className="glass-card overflow-hidden">
				{isLoading ? (
					<div className="py-16 text-center text-slate-500">
						<RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-slate-600" />
						Loading exceptions...
					</div>
				) : exceptions.length === 0 ? (
					<div className="py-16 text-center">
						<CheckCircle2 className="w-8 h-8 mx-auto mb-3 text-emerald-500/50" />
						<p className="text-slate-400">No exceptions found</p>
						<p className="text-sm text-slate-600 mt-1">
							{statusFilter === 'open' ? 'Queue is clear.' : 'Try adjusting your filters.'}
						</p>
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-slate-800">
									<th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
									<th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Severity</th>
									<th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Document</th>
									<th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Batch</th>
									<th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
									<th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
									<th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
									<th className="px-4 py-3" />
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-800/50">
								{exceptions.map((exc, i) => {
									const severityCfg = EXCEPTION_SEVERITY_CONFIG[exc.severity];
									const statusCfg = EXCEPTION_STATUS_CONFIG[exc.status];
									const SeverityIcon = SEVERITY_ICONS[exc.severity];
									const isActing =
										(resolveException.isPending && (resolveException.variables as { id: string })?.id === exc.id) ||
										(dismissException.isPending && (dismissException.variables as { id: string })?.id === exc.id);

									return (
										<motion.tr
											key={exc.id}
											initial={{ opacity: 0, y: 4 }}
											animate={{ opacity: 1, y: 0 }}
											transition={{ delay: i * 0.02 }}
											className="hover:bg-slate-800/30 transition-colors"
										>
											{/* Type badge */}
											<td className="px-4 py-3">
												<span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium bg-slate-700/50 text-slate-300">
													{EXCEPTION_TYPE_LABELS[exc.type]}
												</span>
											</td>

											{/* Severity badge */}
											<td className="px-4 py-3">
												<span
													className={cn(
														'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
														severityCfg.bgColor,
														severityCfg.color
													)}
												>
													<SeverityIcon className="w-3 h-3" />
													{severityCfg.label}
												</span>
											</td>

											{/* Document link */}
											<td className="px-4 py-3">
												{exc.documentId ? (
													<Link
														to={`/documents/${exc.documentId}`}
														className="flex items-center gap-1 text-brass-400 hover:text-brass-300 transition-colors max-w-[160px] truncate"
													>
														<span className="truncate">{exc.documentTitle ?? exc.documentId.slice(0, 8)}</span>
														<ExternalLink className="w-3 h-3 shrink-0" />
													</Link>
												) : (
													<span className="text-slate-600">—</span>
												)}
											</td>

											{/* Batch */}
											<td className="px-4 py-3">
												{exc.batchNumber ? (
													<span className="font-mono text-xs text-slate-400">{exc.batchNumber}</span>
												) : (
													<span className="text-slate-600">—</span>
												)}
											</td>

											{/* Description */}
											<td className="px-4 py-3 max-w-[240px]">
												<p className="text-slate-300 truncate" title={exc.description}>
													{exc.description}
												</p>
											</td>

											{/* Created at */}
											<td className="px-4 py-3 whitespace-nowrap text-slate-500 text-xs">
												{new Date(exc.createdAt).toLocaleDateString('en-US', {
													month: 'short',
													day: 'numeric',
													hour: '2-digit',
													minute: '2-digit',
												})}
											</td>

											{/* Status badge */}
											<td className="px-4 py-3">
												<span
													className={cn(
														'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
														statusCfg.bgColor,
														statusCfg.color
													)}
												>
													{statusCfg.label}
												</span>
											</td>

											{/* Actions */}
											<td className="px-4 py-3">
												{(exc.status === 'open' || exc.status === 'in_progress') && (
													<div className="flex items-center gap-1.5 justify-end">
														<button
															onClick={() => resolveException.mutate({ id: exc.id })}
															disabled={isActing}
															className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
														>
															Resolve
														</button>
														<button
															onClick={() => dismissException.mutate({ id: exc.id })}
															disabled={isActing}
															className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-700 text-slate-400 hover:bg-slate-600 transition-colors disabled:opacity-50"
														>
															Dismiss
														</button>
													</div>
												)}
											</td>
										</motion.tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
						<span className="text-xs text-slate-500">
							Page {page} of {totalPages}
						</span>
						<div className="flex items-center gap-2">
							<button
								onClick={() => setPage((p) => Math.max(1, p - 1))}
								disabled={page === 1}
								className="px-3 py-1.5 rounded-md text-xs bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-40 transition-colors"
							>
								Previous
							</button>
							<button
								onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
								disabled={page === totalPages}
								className="px-3 py-1.5 rounded-md text-xs bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-40 transition-colors"
							>
								Next
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
