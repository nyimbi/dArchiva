// (c) Copyright Datacraft, 2026
import { motion } from 'framer-motion';
import {
	FolderKanban,
	Plus,
	Search,
	MoreVertical,
	Briefcase,
	Users,
	Lock,
	Calendar,
	ChevronRight,
} from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';
import type { Portfolio } from '@/types';

const mockPortfolios: Portfolio[] = [
	{ id: 'p1', name: 'Estate Planning', description: 'Estate and trust matters', portfolioType: 'legal', caseCount: 12, createdAt: new Date(Date.now() - 15552000000).toISOString() },
	{ id: 'p2', name: 'Real Estate Transactions', description: 'Property acquisitions and sales', portfolioType: 'legal', caseCount: 8, createdAt: new Date(Date.now() - 10368000000).toISOString() },
	{ id: 'p3', name: 'Corporate Compliance', description: 'Regulatory and compliance documents', portfolioType: 'compliance', caseCount: 5, createdAt: new Date(Date.now() - 7776000000).toISOString() },
	{ id: 'p4', name: 'Insurance Claims', description: 'Active insurance claim cases', portfolioType: 'insurance', caseCount: 23, createdAt: new Date(Date.now() - 5184000000).toISOString() },
	{ id: 'p5', name: 'Intellectual Property', description: 'Patents, trademarks, and copyrights', portfolioType: 'legal', caseCount: 7, createdAt: new Date(Date.now() - 2592000000).toISOString() },
];

function PortfolioCard({ portfolio }: { portfolio: Portfolio }) {
	const typeColors: Record<string, string> = {
		legal: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
		compliance: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
		insurance: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
		general: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
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
						<span className={cn('badge text-2xs mt-1', typeColors[portfolio.portfolioType] || typeColors.general)}>
							{portfolio.portfolioType}
						</span>
					</div>
				</div>
				<button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
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
						3
					</p>
					<p className="text-xs text-slate-500">Team Members</p>
				</div>
			</div>

			<div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-700/50">
				<div className="flex items-center gap-2 text-xs text-slate-500">
					<Calendar className="w-3 h-3" />
					Created {formatDate(portfolio.createdAt)}
				</div>
				<button className="flex items-center gap-1 text-xs text-brass-400 hover:text-brass-300">
					Open <ChevronRight className="w-3 h-3" />
				</button>
			</div>
		</motion.div>
	);
}

export function Portfolios() {
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
				<button className="btn-primary">
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
								{mockPortfolios.length}
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
								{mockPortfolios.reduce((acc, p) => acc + p.caseCount, 0)}
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
								15
							</p>
							<p className="text-sm text-slate-500">Shared Access</p>
						</div>
					</div>
				</div>
			</div>

			{/* Portfolios grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{mockPortfolios.map((portfolio, idx) => (
					<motion.div
						key={portfolio.id}
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: idx * 0.05 }}
					>
						<PortfolioCard portfolio={portfolio} />
					</motion.div>
				))}

				{/* Add new portfolio card */}
				<motion.button
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: mockPortfolios.length * 0.05 }}
					className="doc-card border-dashed border-2 border-slate-700 hover:border-brass-500/50 flex flex-col items-center justify-center gap-3 min-h-[240px]"
				>
					<div className="p-3 rounded-full bg-slate-800">
						<Plus className="w-6 h-6 text-slate-400" />
					</div>
					<span className="text-slate-400">Create New Portfolio</span>
				</motion.button>
			</div>
		</div>
	);
}
