// (c) Copyright Datacraft, 2026
import { motion } from 'framer-motion';
import { useStore } from '@/hooks/useStore';
import {
	FolderKanban,
	Plus,
	Search,
	MoreVertical,
	Briefcase,
	Users,
	Calendar,
	ChevronRight,
	Loader2,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import {
	usePortfolios,
	usePortfolioStats,
	type Portfolio,
} from '@/features/portfolios';

function PortfolioCard({ portfolio, onOpen, onOptions }: { portfolio: Portfolio; onOpen: (p: Portfolio) => void; onOptions: (p: Portfolio) => void }) {
	const typeColors: Record<string, string> = {
		active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
		archived: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
		on_hold: 'bg-brass-500/10 text-brass-400 border-brass-500/30',
	};

	return (
		<motion.div
			initial={{ opacity: 0, scale: 0.95 }}
			animate={{ opacity: 1, scale: 1 }}
			whileHover={{ y: -2 }}
			className="doc-card group cursor-pointer"
		>
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<div className="p-2.5 rounded-xl bg-brass-500/10 text-brass-400">
						<FolderKanban className="w-6 h-6" />
					</div>
					<div>
						<h3 className="font-display font-semibold text-slate-100 group-hover:text-brass-400 transition-colors">
							{portfolio.name}
						</h3>
						<span className={cn('badge text-2xs mt-1', typeColors[portfolio.status] || typeColors.active)}>
							{portfolio.status}
						</span>
					</div>
				</div>
				<button
					onClick={(e) => { e.stopPropagation(); onOptions(portfolio); }}
					className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity"
				>
					<MoreVertical className="w-4 h-4" />
				</button>
			</div>

			{portfolio.description && (
				<p className="mt-3 text-sm text-slate-500 line-clamp-2">
					{portfolio.description}
				</p>
			)}

			<div className="mt-6 grid grid-cols-2 gap-4">
				<div className="text-center p-3 bg-slate-800/30 rounded-lg">
					<p className="text-2xl font-display font-semibold text-slate-100">
						{portfolio.caseCount}
					</p>
					<p className="text-xs text-slate-500">Active Cases</p>
				</div>
				<div className="text-center p-3 bg-slate-800/30 rounded-lg">
					<p className="text-2xl font-display font-semibold text-slate-100">
						{portfolio.documentCount}
					</p>
					<p className="text-xs text-slate-500">Documents</p>
				</div>
			</div>

			<div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/50">
				<div className="flex items-center gap-2 text-xs text-slate-500">
					<Calendar className="w-3 h-3" />
					Created {formatDate(portfolio.createdAt)}
				</div>
				<button onClick={(e) => { e.stopPropagation(); onOpen(portfolio); }} className="flex items-center gap-1 text-xs text-brass-400 hover:text-brass-300">
					Open <ChevronRight className="w-3 h-3" />
				</button>
			</div>
		</motion.div>
	);
}

export function Portfolios() {
	const { openModal } = useStore();
	const { data: portfoliosData, isLoading: portfoliosLoading } = usePortfolios();
	const { data: stats, isLoading: statsLoading } = usePortfolioStats();

	const portfolios = portfoliosData?.items || [];

	const handleNewPortfolio = () => openModal('create-portfolio');
	const handleOpenPortfolio = (p: Portfolio) => openModal('view-portfolio', p);
	const handlePortfolioOptions = (p: Portfolio) => openModal('portfolio-options', p);

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-display font-semibold text-slate-100">
						Portfolios
					</h1>
					<p className="mt-1 text-sm text-slate-500">
						Organize cases and manage access control
					</p>
				</div>
				<button onClick={handleNewPortfolio} className="btn-primary">
					<Plus className="w-4 h-4" />
					New Portfolio
				</button>
			</div>

			{/* Search */}
			<div className="flex items-center gap-4">
				<div className="relative flex-1 max-w-md">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
					<input
						type="text"
						placeholder="Search portfolios..."
						className="input-field pl-10"
					/>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<div className="stat-card">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400">
							<FolderKanban className="w-5 h-5" />
						</div>
						<div>
							<p className="text-2xl font-display font-semibold text-slate-100">
								{statsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : stats?.total || portfolios.length}
							</p>
							<p className="text-sm text-slate-500">Total Portfolios</p>
						</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400">
							<Briefcase className="w-5 h-5" />
						</div>
						<div>
							<p className="text-2xl font-display font-semibold text-slate-100">
								{statsLoading ? (
									<Loader2 className="w-5 h-5 animate-spin" />
								) : (
									stats?.totalCases || portfolios.reduce((acc: number, p: Portfolio) => acc + p.caseCount, 0)
								)}
							</p>
							<p className="text-sm text-slate-500">Total Cases</p>
						</div>
					</div>
				</div>
				<div className="stat-card">
					<div className="flex items-center gap-3">
						<div className="p-2 rounded-lg bg-brass-500/10 text-brass-400">
							<Users className="w-5 h-5" />
						</div>
						<div>
							<p className="text-2xl font-display font-semibold text-slate-100">
								{statsLoading ? (
									<Loader2 className="w-5 h-5 animate-spin" />
								) : (
									stats?.totalDocuments || portfolios.reduce((acc: number, p: Portfolio) => acc + p.documentCount, 0)
								)}
							</p>
							<p className="text-sm text-slate-500">Total Documents</p>
						</div>
					</div>
				</div>
			</div>

			{/* Portfolios grid */}
			{portfoliosLoading ? (
				<div className="flex justify-center py-16">
					<Loader2 className="w-8 h-8 animate-spin text-slate-500" />
				</div>
			) : portfolios.length === 0 ? (
				<div className="text-center py-16 text-slate-500">
					<FolderKanban className="w-12 h-12 mx-auto mb-4" />
					<p>No portfolios yet</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{portfolios.map((portfolio: Portfolio, idx: number) => (
						<motion.div
							key={portfolio.id}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: idx * 0.05 }}
						>
							<PortfolioCard portfolio={portfolio} onOpen={handleOpenPortfolio} onOptions={handlePortfolioOptions} />
						</motion.div>
					))}

					{/* Add new portfolio card */}
					<motion.button
						onClick={handleNewPortfolio}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: portfolios.length * 0.05 }}
						className="doc-card border-dashed border-2 border-slate-700 hover:border-brass-500/50 flex flex-col items-center justify-center gap-3 min-h-[240px]"
					>
						<div className="p-3 rounded-full bg-slate-800">
							<Plus className="w-6 h-6 text-slate-400" />
						</div>
						<span className="text-slate-400">Create New Portfolio</span>
					</motion.button>
				</div>
			)}
		</div>
	);
}
