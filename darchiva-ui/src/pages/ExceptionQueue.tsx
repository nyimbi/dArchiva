// (c) Copyright Datacraft, 2026
import {
	exceptionKeys,
	type CreateRoutingRuleInput,
	type ExceptionEvent,
	type ExceptionFilters,
	type ExceptionRoutingRule,
	type ExceptionSeverity,
	type ExceptionStatus,
	type ExceptionType,
	useAutoFixAll,
	useCreateRoutingRule,
	useDeleteRoutingRule,
	useDismissException,
	useExceptionRoutingRules,
	useExceptionStats,
	useExceptions,
	useResolveException,
	useUpdateRoutingRule,
} from '@/features/scanning-projects/api/exceptions';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from '@/components/ui/sheet';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
	AlertTriangle,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Loader2,
	Plus,
	RefreshCw,
	ToggleLeft,
	ToggleRight,
	Trash2,
	User,
	Wand2,
	XCircle,
} from 'lucide-react';
import { useState } from 'react';

// =====================================================
// Badge helpers
// =====================================================

function TypeBadge({ type }: { type: ExceptionType }) {
	const map: Record<ExceptionType, { label: string; cls: string }> = {
		quality_rejected:   { label: 'Quality Rejected',   cls: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
		missing_signature:  { label: 'Missing Signature',  cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
		incomplete_set:     { label: 'Incomplete Set',     cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
		barcode_unreadable: { label: 'Barcode Unreadable', cls: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
		orientation_error:  { label: 'Orientation Error',  cls: 'bg-purple-500/20 text-purple-300 border border-purple-500/30' },
	};
	const { label, cls } = map[type] ?? { label: type, cls: 'bg-slate-700 text-slate-300' };
	return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', cls)}>{label}</span>;
}

function SeverityBadge({ severity }: { severity: ExceptionSeverity }) {
	const map: Record<ExceptionSeverity, { label: string; cls: string }> = {
		critical: { label: 'Critical', cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
		error:    { label: 'Error',    cls: 'bg-orange-500/20 text-orange-300 border border-orange-500/30' },
		warning:  { label: 'Warning',  cls: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
	};
	const { label, cls } = map[severity] ?? { label: severity, cls: 'bg-slate-700 text-slate-300' };
	return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', cls)}>{label}</span>;
}

function StatusBadge({ status }: { status: ExceptionStatus }) {
	const map: Record<ExceptionStatus, { label: string; cls: string }> = {
		open:          { label: 'Open',          cls: 'bg-red-500/20 text-red-300 border border-red-500/30' },
		in_review:     { label: 'In Review',     cls: 'bg-blue-500/20 text-blue-300 border border-blue-500/30' },
		resolved:      { label: 'Resolved',      cls: 'bg-green-500/20 text-green-300 border border-green-500/30' },
		dismissed:     { label: 'Dismissed',     cls: 'bg-slate-500/20 text-slate-400 border border-slate-500/30' },
		auto_resolved: { label: 'Auto Resolved', cls: 'bg-green-500/20 text-green-300 border border-green-500/30' },
	};
	const { label, cls } = map[status] ?? { label: status, cls: 'bg-slate-700 text-slate-300' };
	return <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', cls)}>{label}</span>;
}

// =====================================================
// Stat card
// =====================================================

function StatCard({
	label,
	value,
	icon: Icon,
	color,
}: {
	label: string;
	value: number | undefined;
	icon: React.ElementType;
	color: string;
}) {
	return (
		<div className="glass-card p-4 flex items-center gap-4">
			<div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', color)}>
				<Icon className="w-5 h-5" />
			</div>
			<div>
				<p className="text-2xl font-semibold text-slate-100">{value ?? '—'}</p>
				<p className="text-xs text-slate-500 mt-0.5">{label}</p>
			</div>
		</div>
	);
}

// =====================================================
// Exceptions tab
// =====================================================

const PAGE_SIZE = 20;

const STATUS_OPTIONS: Array<{ value: ExceptionStatus | ''; label: string }> = [
	{ value: '', label: 'All statuses' },
	{ value: 'open', label: 'Open' },
	{ value: 'in_review', label: 'In Review' },
	{ value: 'resolved', label: 'Resolved' },
	{ value: 'dismissed', label: 'Dismissed' },
	{ value: 'auto_resolved', label: 'Auto Resolved' },
];

const TYPE_OPTIONS: Array<{ value: ExceptionType | ''; label: string }> = [
	{ value: '', label: 'All types' },
	{ value: 'quality_rejected', label: 'Quality Rejected' },
	{ value: 'missing_signature', label: 'Missing Signature' },
	{ value: 'incomplete_set', label: 'Incomplete Set' },
	{ value: 'barcode_unreadable', label: 'Barcode Unreadable' },
	{ value: 'orientation_error', label: 'Orientation Error' },
];

const SEVERITY_OPTIONS: Array<{ value: ExceptionSeverity | ''; label: string }> = [
	{ value: '', label: 'All severities' },
	{ value: 'critical', label: 'Critical' },
	{ value: 'error', label: 'Error' },
	{ value: 'warning', label: 'Warning' },
];

function ExceptionsTab() {
	const [statusFilter, setStatusFilter] = useState<ExceptionStatus | ''>('');
	const [typeFilter, setTypeFilter] = useState<ExceptionType | ''>('');
	const [severityFilter, setSeverityFilter] = useState<ExceptionSeverity | ''>('');
	const [page, setPage] = useState(0);
	const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
	const [detailExc, setDetailExc] = useState<ExceptionEvent | null>(null);
	const [resolveNotes, setResolveNotes] = useState('');

	const dismiss = useDismissException();
	const resolve = useResolveException();
	const qc = useQueryClient();

	const requeueMutation = useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.patch<ExceptionEvent>(`/exceptions/${id}/reopen`, {});
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: exceptionKeys.all }),
	});

	const assignMutation = useMutation({
		mutationFn: async (id: string) => {
			const { data } = await apiClient.patch<ExceptionEvent>(`/exceptions/${id}/assign-me`, {});
			return data;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: exceptionKeys.all }),
	});

	const filters: ExceptionFilters = {
		...(statusFilter && { status: statusFilter }),
		...(typeFilter && { exception_type: typeFilter }),
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
	};

	const { data, isLoading } = useExceptions(filters);

	const items = data?.items ?? [];
	const total = data?.total ?? 0;
	const totalPages = Math.ceil(total / PAGE_SIZE);

	const filteredItems = severityFilter
		? items.filter((e) => e.severity === severityFilter)
		: items;

	// Bulk selection
	const allChecked =
		filteredItems.length > 0 && filteredItems.every((e) => selectedIds.has(e.id));
	const someChecked = filteredItems.some((e) => selectedIds.has(e.id));

	function toggleAll() {
		if (allChecked) {
			setSelectedIds(new Set());
		} else {
			setSelectedIds(new Set(filteredItems.map((e) => e.id)));
		}
	}

	function toggleOne(id: string) {
		setSelectedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	async function bulkResolve() {
		await Promise.all(
			Array.from(selectedIds).map((id) =>
				resolve.mutateAsync({ id, resolution_notes: 'Bulk resolved' }),
			),
		);
		setSelectedIds(new Set());
	}

	async function bulkDismiss() {
		await Promise.all(
			Array.from(selectedIds).map((id) => dismiss.mutateAsync({ id })),
		);
		setSelectedIds(new Set());
	}

	async function bulkRequeue() {
		await Promise.all(
			Array.from(selectedIds).map((id) => requeueMutation.mutateAsync(id)),
		);
		setSelectedIds(new Set());
	}

	async function bulkAssign() {
		await Promise.all(
			Array.from(selectedIds).map((id) => assignMutation.mutateAsync(id)),
		);
		setSelectedIds(new Set());
	}

	const selectCls =
		'bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brass-500';

	return (
		<div className="space-y-4">
			{/* Filter bar */}
			<div className="flex flex-wrap items-center gap-3">
				<select
					value={statusFilter}
					onChange={(e) => {
						setStatusFilter(e.target.value as ExceptionStatus | '');
						setPage(0);
					}}
					className={selectCls}
				>
					{STATUS_OPTIONS.map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				<select
					value={typeFilter}
					onChange={(e) => {
						setTypeFilter(e.target.value as ExceptionType | '');
						setPage(0);
					}}
					className={selectCls}
				>
					{TYPE_OPTIONS.map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				<select
					value={severityFilter}
					onChange={(e) => {
						setSeverityFilter(e.target.value as ExceptionSeverity | '');
						setPage(0);
					}}
					className={selectCls}
				>
					{SEVERITY_OPTIONS.map((o) => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				<span className="ml-auto text-sm text-slate-500">{total} total</span>
			</div>

			{/* Bulk action bar */}
			{selectedIds.size > 0 && (
				<div className="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-brass-500/10 border border-brass-700/30 rounded-lg">
					<span className="text-sm text-brass-300 font-medium">
						{selectedIds.size} selected
					</span>
					<div className="flex flex-wrap items-center gap-2 ml-auto">
						<button
							onClick={bulkResolve}
							disabled={resolve.isPending}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-700/30 hover:bg-emerald-600/30 transition-colors disabled:opacity-50"
						>
							<CheckCircle className="w-3.5 h-3.5" />
							Bulk Resolve
						</button>
						<button
							onClick={bulkDismiss}
							disabled={dismiss.isPending}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-600/50 transition-colors disabled:opacity-50"
						>
							<XCircle className="w-3.5 h-3.5" />
							Bulk Dismiss
						</button>
						<button
							onClick={bulkRequeue}
							disabled={requeueMutation.isPending}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-amber-600/20 text-amber-400 border border-amber-700/30 hover:bg-amber-600/30 transition-colors disabled:opacity-50"
						>
							<RefreshCw className="w-3.5 h-3.5" />
							Bulk Requeue
						</button>
						<button
							onClick={bulkAssign}
							disabled={assignMutation.isPending}
							className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-blue-600/20 text-blue-400 border border-blue-700/30 hover:bg-blue-600/30 transition-colors disabled:opacity-50"
						>
							<User className="w-3.5 h-3.5" />
							Bulk Assign
						</button>
						<button
							onClick={() => setSelectedIds(new Set())}
							className="text-xs text-slate-500 hover:text-slate-300 transition-colors px-2"
						>
							Clear
						</button>
					</div>
				</div>
			)}

			{/* Table */}
			<div className="glass-card overflow-hidden">
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-slate-800">
								<th className="px-4 py-3 w-10">
									<Checkbox
										checked={allChecked ? true : someChecked ? 'indeterminate' : false}
										onCheckedChange={toggleAll}
										className="border-slate-600"
									/>
								</th>
								<th className="text-left px-4 py-3 text-slate-500 font-medium">Date</th>
								<th className="text-left px-4 py-3 text-slate-500 font-medium">Type</th>
								<th className="text-left px-4 py-3 text-slate-500 font-medium">Severity</th>
								<th className="text-left px-4 py-3 text-slate-500 font-medium">Description</th>
								<th className="text-left px-4 py-3 text-slate-500 font-medium">Document</th>
								<th className="text-left px-4 py-3 text-slate-500 font-medium">Status</th>
								<th className="text-left px-4 py-3 text-slate-500 font-medium">Actions</th>
							</tr>
						</thead>
						<tbody>
							{isLoading && (
								<tr>
									<td colSpan={8} className="px-4 py-10 text-center text-slate-500">
										<Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
										Loading…
									</td>
								</tr>
							)}
							{!isLoading && filteredItems.length === 0 && (
								<tr>
									<td colSpan={8} className="px-4 py-10 text-center text-slate-500">
										No exceptions found.
									</td>
								</tr>
							)}
							{filteredItems.map((exc: ExceptionEvent) => (
								<tr
									key={exc.id}
									className={cn(
										'border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer',
										selectedIds.has(exc.id) && 'bg-brass-500/5',
									)}
									onClick={() => {
										setDetailExc(exc);
										setResolveNotes('');
									}}
								>
									<td
										className="px-4 py-3"
										onClick={(e) => e.stopPropagation()}
									>
										<Checkbox
											checked={selectedIds.has(exc.id)}
											onCheckedChange={() => toggleOne(exc.id)}
											className="border-slate-600"
										/>
									</td>
									<td className="px-4 py-3 text-slate-400 whitespace-nowrap">
										{new Date(exc.created_at).toLocaleDateString()}
									</td>
									<td className="px-4 py-3">
										<TypeBadge type={exc.exception_type} />
									</td>
									<td className="px-4 py-3">
										<SeverityBadge severity={exc.severity} />
									</td>
									<td
										className="px-4 py-3 text-slate-300 max-w-xs truncate"
										title={exc.description}
									>
										{exc.description}
									</td>
									<td className="px-4 py-3 text-slate-400 font-mono text-xs">
										{exc.document_id ? (
											<span className="text-brass-400">
												{exc.document_id.slice(0, 8)}…
											</span>
										) : exc.batch_id ? (
											<span className="text-slate-500">
												batch:{exc.batch_id.slice(0, 6)}…
											</span>
										) : (
											<span className="text-slate-600">—</span>
										)}
									</td>
									<td className="px-4 py-3">
										<StatusBadge status={exc.status} />
									</td>
									<td
										className="px-4 py-3"
										onClick={(e) => e.stopPropagation()}
									>
										{(exc.status === 'open' || exc.status === 'in_review') && (
											<div className="flex items-center gap-2">
												<button
													onClick={() => {
														resolve.mutate(
															{ id: exc.id, resolution_notes: '' },
															{ onSuccess: () => setDetailExc(null) },
														);
													}}
													disabled={resolve.isPending}
													className="btn-primary text-xs py-1 px-2"
												>
													Resolve
												</button>
												<button
													onClick={() => dismiss.mutate({ id: exc.id })}
													disabled={dismiss.isPending}
													className="btn-secondary text-xs py-1 px-2"
												>
													Dismiss
												</button>
											</div>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* Pagination */}
				{totalPages > 1 && (
					<div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
						<span className="text-sm text-slate-500">
							Page {page + 1} of {totalPages}
						</span>
						<div className="flex items-center gap-2">
							<button
								onClick={() => setPage((p) => Math.max(0, p - 1))}
								disabled={page === 0}
								className="btn-secondary text-sm py-1 px-2 disabled:opacity-40"
							>
								<ChevronLeft className="w-4 h-4" />
							</button>
							<button
								onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
								disabled={page >= totalPages - 1}
								className="btn-secondary text-sm py-1 px-2 disabled:opacity-40"
							>
								<ChevronRight className="w-4 h-4" />
							</button>
						</div>
					</div>
				)}
			</div>

			{/* Detail side sheet */}
			<Sheet
				open={!!detailExc}
				onOpenChange={(open) => {
					if (!open) setDetailExc(null);
				}}
			>
				<SheetContent
					side="right"
					className="w-full sm:max-w-xl bg-slate-900 border-slate-700 overflow-y-auto"
				>
					<SheetHeader className="pb-4 border-b border-slate-800">
						<SheetTitle className="text-slate-100 flex items-center gap-2">
							{detailExc && <TypeBadge type={detailExc.exception_type} />}
							Exception Detail
						</SheetTitle>
					</SheetHeader>

					{detailExc && (
						<div className="py-5 space-y-5">
							{/* Meta */}
							<div className="grid grid-cols-2 gap-3">
								<div>
									<p className="text-xs text-slate-500 mb-1">Status</p>
									<StatusBadge status={detailExc.status} />
								</div>
								<div>
									<p className="text-xs text-slate-500 mb-1">Severity</p>
									<SeverityBadge severity={detailExc.severity} />
								</div>
								<div>
									<p className="text-xs text-slate-500 mb-1">Occurred</p>
									<p className="text-sm text-slate-300">
										{new Date(detailExc.created_at).toLocaleString()}
									</p>
								</div>
								<div>
									<p className="text-xs text-slate-500 mb-1">Auto-fixable</p>
									<p className="text-sm text-slate-300">
										{detailExc.auto_fixable ? 'Yes' : 'No'}
									</p>
								</div>
								{detailExc.document_id && (
									<div className="col-span-2">
										<p className="text-xs text-slate-500 mb-1">Document ID</p>
										<p className="text-sm font-mono text-brass-400 break-all">
											{detailExc.document_id}
										</p>
									</div>
								)}
								{detailExc.batch_id && (
									<div className="col-span-2">
										<p className="text-xs text-slate-500 mb-1">Batch ID</p>
										<p className="text-sm font-mono text-slate-300 break-all">
											{detailExc.batch_id}
										</p>
									</div>
								)}
								{detailExc.page_number != null && (
									<div>
										<p className="text-xs text-slate-500 mb-1">Page</p>
										<p className="text-sm text-slate-300">{detailExc.page_number}</p>
									</div>
								)}
								{detailExc.quality_score != null && (
									<div>
										<p className="text-xs text-slate-500 mb-1">Quality Score</p>
										<p className="text-sm text-slate-300">
											{(detailExc.quality_score * 100).toFixed(1)}%
										</p>
									</div>
								)}
							</div>

							{/* Error details */}
							<div>
								<p className="text-xs text-slate-500 mb-2">Error Details</p>
								<p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 rounded-lg p-3 border border-slate-700/50">
									{detailExc.description}
								</p>
							</div>

							{/* Defects / stack trace */}
							{detailExc.defects && detailExc.defects.length > 0 && (
								<div>
									<p className="text-xs text-slate-500 mb-2">Defects / Stack Trace</p>
									<pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-48">
										{detailExc.defects.join('\n')}
									</pre>
								</div>
							)}

							{/* Resolution notes (existing) */}
							{detailExc.resolution_notes && (
								<div>
									<p className="text-xs text-slate-500 mb-2">Resolution Notes</p>
									<p className="text-sm text-slate-300 bg-emerald-900/20 border border-emerald-800/30 rounded-lg p-3">
										{detailExc.resolution_notes}
									</p>
								</div>
							)}

							{/* Action buttons */}
							<div className="space-y-2 pt-2 border-t border-slate-800">
								<p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-3">
									Actions
								</p>

								{(detailExc.status === 'open' || detailExc.status === 'in_review') && (
									<>
										<button
											onClick={() =>
												assignMutation.mutate(detailExc.id, {
													onSuccess: (updated) => setDetailExc(updated),
												})
											}
											disabled={
												assignMutation.isPending ||
												detailExc.status === 'in_review'
											}
											className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-700/30 hover:bg-blue-600/30 transition-colors text-sm disabled:opacity-50"
										>
											{assignMutation.isPending ? (
												<Loader2 className="w-4 h-4 animate-spin" />
											) : (
												<User className="w-4 h-4" />
											)}
											{detailExc.status === 'in_review'
												? 'Already In Review'
												: 'Assign to Me'}
										</button>

										{/* Resolve with notes */}
										<div className="space-y-1.5">
											<textarea
												value={resolveNotes}
												onChange={(e) => setResolveNotes(e.target.value)}
												placeholder="Resolution notes (optional)"
												rows={2}
												className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brass-500 resize-none"
											/>
											<button
												onClick={() =>
													resolve.mutate(
														{
															id: detailExc.id,
															resolution_notes: resolveNotes,
														},
														{
															onSuccess: (updated) => {
																setDetailExc(updated);
																setResolveNotes('');
															},
														},
													)
												}
												disabled={resolve.isPending}
												className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-700/30 hover:bg-emerald-600/30 transition-colors text-sm disabled:opacity-50"
											>
												{resolve.isPending ? (
													<Loader2 className="w-4 h-4 animate-spin" />
												) : (
													<CheckCircle className="w-4 h-4" />
												)}
												Mark Resolved
											</button>
										</div>

										<button
											onClick={() =>
												dismiss.mutate(
													{ id: detailExc.id },
													{ onSuccess: () => setDetailExc(null) },
												)
											}
											disabled={dismiss.isPending}
											className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-600/50 transition-colors text-sm disabled:opacity-50"
										>
											{dismiss.isPending ? (
												<Loader2 className="w-4 h-4 animate-spin" />
											) : (
												<XCircle className="w-4 h-4" />
											)}
											Dismiss
										</button>
									</>
								)}

								{(detailExc.status === 'resolved' ||
									detailExc.status === 'dismissed' ||
									detailExc.status === 'auto_resolved') && (
									<button
										onClick={() =>
											requeueMutation.mutate(detailExc.id, {
												onSuccess: (updated) => setDetailExc(updated),
											})
										}
										disabled={requeueMutation.isPending}
										className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600/20 text-amber-300 border border-amber-700/30 hover:bg-amber-600/30 transition-colors text-sm disabled:opacity-50"
									>
										{requeueMutation.isPending ? (
											<Loader2 className="w-4 h-4 animate-spin" />
										) : (
											<RefreshCw className="w-4 h-4" />
										)}
										Requeue (Reopen)
									</button>
								)}
							</div>
						</div>
					)}
				</SheetContent>
			</Sheet>
		</div>
	);
}

// =====================================================
// Routing Rules tab
// =====================================================

const EXCEPTION_TYPE_LABELS: Record<ExceptionType, string> = {
	quality_rejected:   'Quality Rejected',
	missing_signature:  'Missing Signature',
	incomplete_set:     'Incomplete Set',
	barcode_unreadable: 'Barcode Unreadable',
	orientation_error:  'Orientation Error',
};

const EXCEPTION_TYPES: ExceptionType[] = [
	'quality_rejected',
	'missing_signature',
	'incomplete_set',
	'barcode_unreadable',
	'orientation_error',
];

const ROUTING_ACTIONS = ['rescan', 'escalate', 'auto_fix', 'notify', 'reject', 'quarantine'];

function AddRuleForm({ onClose }: { onClose: () => void }) {
	const [form, setForm] = useState<CreateRoutingRuleInput>({
		exception_type: 'quality_rejected',
		action: 'escalate',
		priority: 10,
		is_active: true,
	});
	const create = useCreateRoutingRule();

	const submit = () => {
		create.mutate(form, { onSuccess: onClose });
	};

	const inputCls =
		'bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-brass-500';

	return (
		<div className="glass-card p-4 space-y-3">
			<h3 className="text-sm font-semibold text-slate-200">New Routing Rule</h3>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div>
					<label className="block text-xs text-slate-500 mb-1">Exception Type</label>
					<select
						value={form.exception_type}
						onChange={(e) => setForm((f) => ({ ...f, exception_type: e.target.value as ExceptionType }))}
						className={cn(inputCls, 'w-full')}
					>
						{EXCEPTION_TYPES.map((t) => (
							<option key={t} value={t}>{EXCEPTION_TYPE_LABELS[t]}</option>
						))}
					</select>
				</div>
				<div>
					<label className="block text-xs text-slate-500 mb-1">Action</label>
					<select
						value={form.action}
						onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
						className={cn(inputCls, 'w-full')}
					>
						{ROUTING_ACTIONS.map((a) => (
							<option key={a} value={a}>{a}</option>
						))}
					</select>
				</div>
				<div>
					<label className="block text-xs text-slate-500 mb-1">Priority</label>
					<input
						type="number"
						min={1}
						max={100}
						value={form.priority}
						onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
						className={cn(inputCls, 'w-full')}
					/>
				</div>
				<div className="flex flex-col justify-end">
					<label className="flex items-center gap-2 cursor-pointer pb-1.5">
						<input
							type="checkbox"
							checked={form.is_active}
							onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
							className="rounded border-slate-600"
						/>
						<span className="text-sm text-slate-300">Active</span>
					</label>
				</div>
			</div>
			<div className="flex items-center gap-2 pt-1">
				<button
					onClick={submit}
					disabled={create.isPending}
					className="btn-primary text-sm py-1.5 px-4"
				>
					{create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Rule'}
				</button>
				<button onClick={onClose} className="btn-secondary text-sm py-1.5 px-4">Cancel</button>
			</div>
		</div>
	);
}

function RoutingRulesTab() {
	const { data: rules, isLoading } = useExceptionRoutingRules();
	const deleteRule = useDeleteRoutingRule();
	const updateRule = useUpdateRoutingRule();
	const [showForm, setShowForm] = useState(false);

	const toggleActive = (rule: ExceptionRoutingRule) => {
		updateRule.mutate({ id: rule.id, data: { is_active: !rule.is_active } });
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<span className="text-sm text-slate-500">{rules?.length ?? 0} rules configured</span>
				<button onClick={() => setShowForm(true)} className="btn-primary text-sm py-1.5 px-4 flex items-center gap-2">
					<Plus className="w-4 h-4" /> Add Rule
				</button>
			</div>

			{showForm && <AddRuleForm onClose={() => setShowForm(false)} />}

			<div className="glass-card overflow-hidden">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-slate-800">
							<th className="text-left px-4 py-3 text-slate-500 font-medium">Exception Type</th>
							<th className="text-left px-4 py-3 text-slate-500 font-medium">Action</th>
							<th className="text-left px-4 py-3 text-slate-500 font-medium">Priority</th>
							<th className="text-left px-4 py-3 text-slate-500 font-medium">Active</th>
							<th className="text-left px-4 py-3 text-slate-500 font-medium"></th>
						</tr>
					</thead>
					<tbody>
						{isLoading && (
							<tr>
								<td colSpan={5} className="px-4 py-8 text-center text-slate-500">
									<Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
									Loading…
								</td>
							</tr>
						)}
						{!isLoading && (!rules || rules.length === 0) && (
							<tr>
								<td colSpan={5} className="px-4 py-8 text-center text-slate-500">
									No routing rules configured.
								</td>
							</tr>
						)}
						{rules?.map((rule: ExceptionRoutingRule) => (
							<tr key={rule.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
								<td className="px-4 py-3">
									<TypeBadge type={rule.exception_type} />
								</td>
								<td className="px-4 py-3 text-slate-300 font-mono text-xs">{rule.action}</td>
								<td className="px-4 py-3 text-slate-400">{rule.priority}</td>
								<td className="px-4 py-3">
									<button
										onClick={() => toggleActive(rule)}
										disabled={updateRule.isPending}
										className="text-slate-400 hover:text-slate-200 transition-colors"
										title={rule.is_active ? 'Deactivate' : 'Activate'}
									>
										{rule.is_active ? (
											<ToggleRight className="w-5 h-5 text-green-400" />
										) : (
											<ToggleLeft className="w-5 h-5 text-slate-600" />
										)}
									</button>
								</td>
								<td className="px-4 py-3">
									<button
										onClick={() => deleteRule.mutate(rule.id)}
										disabled={deleteRule.isPending}
										className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
										title="Delete rule"
									>
										<Trash2 className="w-4 h-4" />
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}

// =====================================================
// Main page
// =====================================================

type Tab = 'exceptions' | 'routing-rules';

export function ExceptionQueue() {
	const [tab, setTab] = useState<Tab>('exceptions');
	const [autoFixResult, setAutoFixResult] = useState<{ fixed: number; failed: number } | null>(null);

	const { data: stats } = useExceptionStats();
	const autoFixAll = useAutoFixAll();

	const handleAutoFix = () => {
		autoFixAll.mutate(undefined, {
			onSuccess: (result) => {
				setAutoFixResult({ fixed: result.fixed_count, failed: result.failed_count });
				setTimeout(() => setAutoFixResult(null), 5000);
			},
		});
	};

	const tabCls = (t: Tab) =>
		cn(
			'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors',
			tab === t
				? 'bg-slate-800 text-slate-100 border-t border-l border-r border-slate-700'
				: 'text-slate-500 hover:text-slate-300'
		);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100 flex items-center gap-2">
						<AlertTriangle className="w-6 h-6 text-amber-400" />
						Exception Queue
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Review and resolve scan pipeline exceptions
					</p>
				</div>
				<div className="flex items-center gap-3">
					{autoFixResult && (
						<span className="text-sm text-green-400">
							Fixed {autoFixResult.fixed}, failed {autoFixResult.failed}
						</span>
					)}
					<button
						onClick={handleAutoFix}
						disabled={autoFixAll.isPending || !stats?.auto_fixable_count}
						className="btn-primary flex items-center gap-2 disabled:opacity-50"
					>
						{autoFixAll.isPending ? (
							<Loader2 className="w-4 h-4 animate-spin" />
						) : (
							<Wand2 className="w-4 h-4" />
						)}
						Auto-fix All
						{!!stats?.auto_fixable_count && (
							<span className="ml-1 bg-slate-900/50 rounded px-1.5 py-0.5 text-xs">
								{stats.auto_fixable_count}
							</span>
						)}
					</button>
				</div>
			</div>

			{/* Stats cards */}
			<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatCard
					label="Open"
					value={stats?.total_open}
					icon={XCircle}
					color="bg-red-500/20 text-red-400"
				/>
				<StatCard
					label="In Review"
					value={stats?.total_in_review}
					icon={AlertTriangle}
					color="bg-blue-500/20 text-blue-400"
				/>
				<StatCard
					label="Auto-fixable"
					value={stats?.auto_fixable_count}
					icon={Wand2}
					color="bg-amber-500/20 text-amber-400"
				/>
				<StatCard
					label="Resolved"
					value={stats?.total_resolved}
					icon={CheckCircle}
					color="bg-green-500/20 text-green-400"
				/>
			</div>

			{/* Tabs */}
			<div>
				<div className="flex gap-1 border-b border-slate-700">
					<button className={tabCls('exceptions')} onClick={() => setTab('exceptions')}>
						Exceptions
					</button>
					<button className={tabCls('routing-rules')} onClick={() => setTab('routing-rules')}>
						Routing Rules
					</button>
				</div>
				<div className="pt-4">
					{tab === 'exceptions' ? <ExceptionsTab /> : <RoutingRulesTab />}
				</div>
			</div>
		</div>
	);
}

export default ExceptionQueue;
