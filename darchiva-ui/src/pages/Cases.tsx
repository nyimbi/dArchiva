// (c) Copyright Datacraft, 2026
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/hooks/useStore';
import {
	Briefcase,
	Plus,
	Search,
	Filter,
	MoreVertical,
	FolderOpen,
	FileText,
	Calendar,
	User,
	Tag,
	Archive,
	ChevronRight,
	Loader2,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import {
	useCases,
	useBundles,
	type Case,
	type Bundle,
	type CaseStatus,
} from '@/features/cases';

function CaseCard({ caseData, onViewCase, onMoreOptions }: { caseData: Case; onViewCase: (c: Case) => void; onMoreOptions: (c: Case) => void }) {
	const statusConfig: Record<CaseStatus, { label: string; color: string }> = {
		open: { label: 'Open', color: 'badge-blue' },
		pending: { label: 'Pending', color: 'badge-brass' },
		closed: { label: 'Closed', color: 'badge-green' },
		on_hold: { label: 'On Hold', color: 'badge-gray' },
	};

	const status = statusConfig[caseData.status] || statusConfig.open;

	return (
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			className="doc-card group"
		>
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<div className={cn(
						'p-2 rounded-lg',
						caseData.status === 'closed' ? 'bg-slate-700/50 text-slate-400' : 'bg-brass-500/10 text-brass-400'
					)}>
						{caseData.status === 'closed' ? (
							<Archive className="w-5 h-5" />
						) : (
							<Briefcase className="w-5 h-5" />
						)}
					</div>
					<div>
						<p className="text-xs text-slate-500 font-mono">{caseData.caseNumber}</p>
						<h3 className="font-medium text-slate-200 group-hover:text-brass-400 transition-colors">
							{caseData.title}
						</h3>
					</div>
				</div>
				<button
					onClick={(e) => { e.stopPropagation(); onMoreOptions(caseData); }}
					className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<MoreVertical className="w-4 h-4" />
				</button>
			</div>

			{caseData.description && (
				<p className="mt-3 text-sm text-slate-500 line-clamp-2">
					{caseData.description}
				</p>
			)}

			<div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
				<span className="flex items-center gap-1">
					<FileText className="w-3 h-3" />
					{caseData.documentCount} documents
				</span>
				<span className="flex items-center gap-1">
					<Calendar className="w-3 h-3" />
					{formatDate(caseData.createdAt)}
				</span>
			</div>

			<div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/50">
				<span className={cn('badge', status.color)}>
					{status.label}
				</span>
				<button onClick={(e) => { e.stopPropagation(); onViewCase(caseData); }} className="btn-ghost text-xs">
					View Case <ChevronRight className="w-3 h-3" />
				</button>
			</div>
		</motion.div>
	);
}

function BundleRow({ bundle }: { bundle: Bundle }) {
	return (
		<div className="flex items-center gap-4 p-4 hover:bg-slate-800/30 transition-colors cursor-pointer">
			<div className="p-2 rounded-lg bg-slate-800">
				<FolderOpen className="w-5 h-5 text-slate-400" />
			</div>
			<div className="flex-1 min-w-0">
				<h4 className="text-sm font-medium text-slate-200">{bundle.name}</h4>
				<p className="text-xs text-slate-500">{bundle.description}</p>
			</div>
			<div className="text-right">
				<p className="text-sm text-slate-300">{bundle.documentCount} docs</p>
				<span className={cn(
					'badge text-2xs',
					bundle.status === 'active' ? 'badge-green' :
					bundle.status === 'locked' ? 'badge-red' :
					bundle.status === 'archived' ? 'badge-gray' : 'badge-brass'
				)}>
					{bundle.status}
				</span>
			</div>
		</div>
	);
}

export function Cases() {
	const [selectedCase, setSelectedCase] = useState<Case | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>('all');
	const { openModal } = useStore();

	const { data: casesData, isLoading: casesLoading } = useCases(1, 50, statusFilter !== 'all' ? statusFilter as CaseStatus : undefined);
	const { data: bundlesData, isLoading: bundlesLoading } = useBundles(selectedCase?.id);

	const handleNewCase = () => openModal('create-case');
	const handleMoreFilters = () => openModal('case-filters');
	const handleViewCase = (c: Case) => openModal('view-case', c);
	const handleCaseOptions = (c: Case) => openModal('case-options', c);
	const handleCreateBundle = () => openModal('create-bundle', selectedCase);
	const handleAddDocuments = () => openModal('add-documents-to-case', selectedCase);
	const handleManageAccess = () => openModal('manage-case-access', selectedCase);
	const handleEditTags = () => openModal('edit-case-tags', selectedCase);

	const cases = casesData?.items || [];
	const bundles = bundlesData?.items || [];

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Cases
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Manage legal cases and document bundles
					</p>
				</div>
				<button onClick={handleNewCase} className="btn-primary">
					<Plus className="w-4 h-4" />
					New Case
				</button>
			</div>

			{/* Filters */}
			<div className="flex items-center gap-4">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
					<input
						type="text"
						placeholder="Search cases..."
						className="input-field pl-10"
					/>
				</div>
				<select
					value={statusFilter}
					onChange={(e) => setStatusFilter(e.target.value)}
					className="input-field w-40"
				>
					<option value="all">All Statuses</option>
					<option value="open">Open</option>
					<option value="pending">Pending</option>
					<option value="closed">Closed</option>
					<option value="on_hold">On Hold</option>
				</select>
				<button onClick={handleMoreFilters} className="btn-ghost">
					<Filter className="w-4 h-4" />
					More Filters
				</button>
			</div>

			{/* Content */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Cases list */}
				<div className="lg:col-span-2 space-y-4">
					{casesLoading ? (
						<div className="flex justify-center py-16">
							<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
						</div>
					) : cases.length === 0 ? (
						<div className="text-center py-16 text-slate-500">
							<Briefcase className="w-12 h-12 mx-auto mb-4" />
							<p>No cases found</p>
						</div>
					) : (
						cases.map((caseData: Case, idx: number) => (
							<motion.div
								key={caseData.id}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: idx * 0.05 }}
								onClick={() => setSelectedCase(caseData)}
							>
								<CaseCard caseData={caseData} onViewCase={handleViewCase} onMoreOptions={handleCaseOptions} />
							</motion.div>
						))
					)}
				</div>

				{/* Case detail / quick view */}
				<div className="glass-card">
					{selectedCase ? (
						<>
							<div className="p-4 border-b border-slate-700/50">
								<div className="flex items-center justify-between">
									<span className="text-xs font-mono text-slate-500">
										{selectedCase.caseNumber}
									</span>
									<button
										onClick={() => setSelectedCase(null)}
										className="text-xs text-slate-500 hover:text-slate-300"
									>
										Close
									</button>
								</div>
								<h3 className="mt-2 text-lg font-display font-semibold text-slate-100">
									{selectedCase.title}
								</h3>
								<p className="mt-1 text-sm text-slate-500">
									{selectedCase.description}
								</p>
							</div>

							<div className="p-4 border-b border-slate-700/50">
								<h4 className="text-sm font-medium text-slate-300 mb-3">
									Document Bundles
								</h4>
								{bundlesLoading ? (
									<div className="flex justify-center py-8">
										<Loader2 className="w-6 h-6 animate-spin text-slate-500" />
									</div>
								) : bundles.length === 0 ? (
									<p className="text-sm text-slate-500 text-center py-4">No bundles</p>
								) : (
									<div className="space-y-1">
										{bundles.map((bundle: Bundle) => (
											<BundleRow key={bundle.id} bundle={bundle} />
										))}
									</div>
								)}
								<button onClick={handleCreateBundle} className="mt-3 w-full btn-ghost border border-dashed border-slate-700 justify-center">
									<Plus className="w-4 h-4" />
									Create Bundle
								</button>
							</div>

							<div className="p-4">
								<h4 className="text-sm font-medium text-slate-300 mb-3">
									Quick Actions
								</h4>
								<div className="space-y-2">
									<button onClick={handleAddDocuments} className="w-full btn-ghost justify-start">
										<FileText className="w-4 h-4" />
										Add Documents
									</button>
									<button onClick={handleManageAccess} className="w-full btn-ghost justify-start">
										<User className="w-4 h-4" />
										Manage Access
									</button>
									<button onClick={handleEditTags} className="w-full btn-ghost justify-start">
										<Tag className="w-4 h-4" />
										Edit Tags
									</button>
								</div>
							</div>
						</>
					) : (
						<div className="p-8 text-center">
							<Briefcase className="w-12 h-12 mx-auto text-slate-700 mb-4" />
							<p className="text-slate-500">
								Select a case to view details
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
