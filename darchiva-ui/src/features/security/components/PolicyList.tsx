// (c) Copyright Datacraft, 2026
/**
 * Policy list with filtering, sorting, and actions.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
	Shield, ShieldOff, Plus, Search, Filter, ChevronDown, ChevronUp,
	MoreHorizontal, Edit2, Trash2, Send, Copy, Eye
} from 'lucide-react';
import type { PBACPolicy, PolicyStatus, PolicyEffect } from '../types';
import { fetchPolicies, deletePolicy, submitForApproval } from '../api';

const STATUS_CONFIG: Record<PolicyStatus, { label: string; color: string; bg: string }> = {
	draft: { label: 'Draft', color: 'text-charcoal/70', bg: 'bg-charcoal/10' },
	pending_approval: { label: 'Pending', color: 'text-gold', bg: 'bg-gold/15' },
	active: { label: 'Active', color: 'text-sage', bg: 'bg-sage/15' },
	inactive: { label: 'Inactive', color: 'text-charcoal/50', bg: 'bg-charcoal/5' },
	archived: { label: 'Archived', color: 'text-charcoal/40', bg: 'bg-charcoal/5' },
};

interface PolicyRowProps {
	policy: PBACPolicy;
	onEdit: (policy: PBACPolicy) => void;
	onDelete: (id: string) => void;
	onSubmitForApproval: (id: string) => void;
}

function PolicyRow({ policy, onEdit, onDelete, onSubmitForApproval }: PolicyRowProps) {
	const [showMenu, setShowMenu] = useState(false);
	const status = STATUS_CONFIG[policy.status];

	return (
		<motion.tr
			initial={{ opacity: 0, x: -10 }}
			animate={{ opacity: 1, x: 0 }}
			exit={{ opacity: 0, x: 10 }}
			className="group border-b border-charcoal/5 transition-colors hover:bg-cream/50"
		>
			{/* Effect Indicator */}
			<td className="py-4 pl-4">
				<div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
					policy.effect === 'allow' ? 'bg-sage/15' : 'bg-terracotta/15'
				}`}>
					{policy.effect === 'allow' ? (
						<Shield className="h-4 w-4 text-sage" />
					) : (
						<ShieldOff className="h-4 w-4 text-terracotta" />
					)}
				</div>
			</td>

			{/* Name & Description */}
			<td className="py-4 pr-4">
				<div className="flex flex-col">
					<span className="font-['Newsreader'] text-base font-medium text-charcoal">
						{policy.name}
					</span>
					{policy.description && (
						<span className="mt-0.5 font-['DM_Sans'] text-sm text-charcoal/50 line-clamp-1">
							{policy.description}
						</span>
					)}
				</div>
			</td>

			{/* Status Badge */}
			<td className="py-4">
				<span className={`inline-flex items-center rounded-full px-2.5 py-1 font-['DM_Sans'] text-xs font-medium ${status.bg} ${status.color}`}>
					{status.label}
				</span>
			</td>

			{/* Priority */}
			<td className="py-4 font-['DM_Sans'] text-sm tabular-nums text-charcoal/70">
				{policy.priority}
			</td>

			{/* Actions */}
			<td className="py-4">
				<div className="flex flex-wrap gap-1">
					{policy.actions.slice(0, 2).map(action => (
						<span key={action} className="rounded bg-charcoal/5 px-2 py-0.5 font-['DM_Sans'] text-xs text-charcoal/70">
							{action}
						</span>
					))}
					{policy.actions.length > 2 && (
						<span className="rounded bg-charcoal/5 px-2 py-0.5 font-['DM_Sans'] text-xs text-charcoal/50">
							+{policy.actions.length - 2}
						</span>
					)}
				</div>
			</td>

			{/* Resource Types */}
			<td className="py-4">
				<div className="flex flex-wrap gap-1">
					{policy.resource_types.slice(0, 2).map(rt => (
						<span key={rt} className="rounded bg-gold/10 px-2 py-0.5 font-['DM_Sans'] text-xs text-gold">
							{rt}
						</span>
					))}
					{policy.resource_types.length > 2 && (
						<span className="rounded bg-gold/10 px-2 py-0.5 font-['DM_Sans'] text-xs text-gold/60">
							+{policy.resource_types.length - 2}
						</span>
					)}
				</div>
			</td>

			{/* Menu */}
			<td className="py-4 pr-4">
				<div className="relative">
					<button
						onClick={() => setShowMenu(!showMenu)}
						className="rounded-lg p-2 text-charcoal/40 transition-colors hover:bg-charcoal/5 hover:text-charcoal"
					>
						<MoreHorizontal className="h-4 w-4" />
					</button>

					<AnimatePresence>
						{showMenu && (
							<>
								<div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
								<motion.div
									initial={{ opacity: 0, scale: 0.95 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0, scale: 0.95 }}
									className="absolute right-0 top-full z-20 mt-1 min-w-[160px] overflow-hidden rounded-lg border border-charcoal/10 bg-cream shadow-lg"
								>
									<button
										onClick={() => { onEdit(policy); setShowMenu(false); }}
										className="flex w-full items-center gap-2 px-3 py-2 font-['DM_Sans'] text-sm text-charcoal transition-colors hover:bg-charcoal/5"
									>
										<Edit2 className="h-3.5 w-3.5" /> Edit
									</button>
									<button
										onClick={() => { navigator.clipboard.writeText(policy.dsl_text || ''); setShowMenu(false); }}
										className="flex w-full items-center gap-2 px-3 py-2 font-['DM_Sans'] text-sm text-charcoal transition-colors hover:bg-charcoal/5"
									>
										<Copy className="h-3.5 w-3.5" /> Copy DSL
									</button>
									{policy.status === 'draft' && (
										<button
											onClick={() => { onSubmitForApproval(policy.id); setShowMenu(false); }}
											className="flex w-full items-center gap-2 px-3 py-2 font-['DM_Sans'] text-sm text-gold transition-colors hover:bg-gold/5"
										>
											<Send className="h-3.5 w-3.5" /> Submit for Approval
										</button>
									)}
									<hr className="my-1 border-charcoal/10" />
									<button
										onClick={() => { onDelete(policy.id); setShowMenu(false); }}
										className="flex w-full items-center gap-2 px-3 py-2 font-['DM_Sans'] text-sm text-terracotta transition-colors hover:bg-terracotta/5"
									>
										<Trash2 className="h-3.5 w-3.5" /> Delete
									</button>
								</motion.div>
							</>
						)}
					</AnimatePresence>
				</div>
			</td>
		</motion.tr>
	);
}

interface PolicyListProps {
	onEdit: (policy: PBACPolicy) => void;
	onCreate: () => void;
}

export function PolicyList({ onEdit, onCreate }: PolicyListProps) {
	const [policies, setPolicies] = useState<PBACPolicy[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState<PolicyStatus | 'all'>('all');
	const [effectFilter, setEffectFilter] = useState<PolicyEffect | 'all'>('all');
	const [sortField, setSortField] = useState<'name' | 'priority' | 'updated_at'>('updated_at');
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

	const loadPolicies = useCallback(async () => {
		setLoading(true);
		try {
			const result = await fetchPolicies({
				status: statusFilter !== 'all' ? statusFilter : undefined,
				effect: effectFilter !== 'all' ? effectFilter : undefined,
			});
			setPolicies(result.items);
		} catch (err) {
			console.error('Failed to load policies:', err);
		} finally {
			setLoading(false);
		}
	}, [statusFilter, effectFilter]);

	useEffect(() => {
		loadPolicies();
	}, [loadPolicies]);

	const handleDelete = async (id: string) => {
		if (!confirm('Are you sure you want to delete this policy?')) return;
		try {
			await deletePolicy(id);
			setPolicies(p => p.filter(policy => policy.id !== id));
		} catch (err) {
			console.error('Failed to delete policy:', err);
		}
	};

	const handleSubmitForApproval = async (id: string) => {
		try {
			await submitForApproval(id);
			loadPolicies();
		} catch (err) {
			console.error('Failed to submit for approval:', err);
		}
	};

	const filteredPolicies = policies
		.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
		.sort((a, b) => {
			const aVal = a[sortField];
			const bVal = b[sortField];
			const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal as string) : (aVal as number) - (bVal as number);
			return sortDir === 'asc' ? cmp : -cmp;
		});

	const toggleSort = (field: typeof sortField) => {
		if (sortField === field) {
			setSortDir(d => d === 'asc' ? 'desc' : 'asc');
		} else {
			setSortField(field);
			setSortDir('asc');
		}
	};

	const SortIcon = ({ field }: { field: typeof sortField }) => {
		if (sortField !== field) return null;
		return sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />;
	};

	return (
		<div className="overflow-hidden rounded-xl border-2 border-charcoal/10 bg-parchment">
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-4 border-b border-charcoal/10 p-4">
				<div className="flex items-center gap-2">
					<Shield className="h-5 w-5 text-charcoal/60" />
					<h2 className="font-['Newsreader'] text-xl font-semibold text-charcoal">
						Access Policies
					</h2>
				</div>

				<button
					onClick={onCreate}
					className="flex items-center gap-2 rounded-lg bg-charcoal px-4 py-2 font-['DM_Sans'] text-sm font-medium text-cream transition-colors hover:bg-charcoal/90"
				>
					<Plus className="h-4 w-4" /> New Policy
				</button>
			</div>

			{/* Filters */}
			<div className="flex flex-wrap items-center gap-3 border-b border-charcoal/10 bg-cream/30 px-4 py-3">
				<div className="relative flex-1 min-w-[200px]">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
					<input
						type="text"
						placeholder="Search policies..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full rounded-lg border border-charcoal/10 bg-cream py-2 pl-9 pr-4 font-['DM_Sans'] text-sm text-charcoal placeholder:text-charcoal/40 focus:border-charcoal/30 focus:outline-none"
					/>
				</div>

				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value as PolicyStatus | 'all')}
					className="rounded-lg border border-charcoal/10 bg-cream px-3 py-2 font-['DM_Sans'] text-sm text-charcoal focus:border-charcoal/30 focus:outline-none"
				>
					<option value="all">All Status</option>
					<option value="draft">Draft</option>
					<option value="pending_approval">Pending Approval</option>
					<option value="active">Active</option>
					<option value="inactive">Inactive</option>
				</select>

				<select
					value={effectFilter}
					onChange={(e) => setEffectFilter(e.target.value as PolicyEffect | 'all')}
					className="rounded-lg border border-charcoal/10 bg-cream px-3 py-2 font-['DM_Sans'] text-sm text-charcoal focus:border-charcoal/30 focus:outline-none"
				>
					<option value="all">All Effects</option>
					<option value="allow">Allow</option>
					<option value="deny">Deny</option>
				</select>
			</div>

			{/* Table */}
			{loading ? (
				<div className="flex items-center justify-center py-16">
					<div className="h-8 w-8 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal" />
				</div>
			) : filteredPolicies.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<Shield className="h-12 w-12 text-charcoal/20" />
					<p className="mt-4 font-['Newsreader'] text-lg text-charcoal/60">No policies found</p>
					<p className="mt-1 font-['DM_Sans'] text-sm text-charcoal/40">
						Create your first policy to control access
					</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-charcoal/10 bg-cream/50 text-left">
								<th className="py-3 pl-4 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
									Effect
								</th>
								<th
									onClick={() => toggleSort('name')}
									className="cursor-pointer py-3 pr-4 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50 hover:text-charcoal"
								>
									<span className="flex items-center gap-1">Name <SortIcon field="name" /></span>
								</th>
								<th className="py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
									Status
								</th>
								<th
									onClick={() => toggleSort('priority')}
									className="cursor-pointer py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50 hover:text-charcoal"
								>
									<span className="flex items-center gap-1">Priority <SortIcon field="priority" /></span>
								</th>
								<th className="py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
									Actions
								</th>
								<th className="py-3 font-['DM_Sans'] text-xs font-semibold uppercase tracking-wider text-charcoal/50">
									Resources
								</th>
								<th className="py-3 pr-4" />
							</tr>
						</thead>
						<tbody>
							<AnimatePresence>
								{filteredPolicies.map(policy => (
									<PolicyRow
										key={policy.id}
										policy={policy}
										onEdit={onEdit}
										onDelete={handleDelete}
										onSubmitForApproval={handleSubmitForApproval}
									/>
								))}
							</AnimatePresence>
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}
