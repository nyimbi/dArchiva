// (c) Copyright Datacraft, 2026
import { useCases } from '@/features/cases/api';
import { type Portfolio } from '@/features/portfolios/api';
import { formatRelativeTime } from '@/lib/utils';
import { Briefcase, FolderOpen, Loader2, X } from 'lucide-react';

interface Props {
	onClose: () => void;
	portfolio: Portfolio;
}

const STATUS_COLORS: Record<string, string> = {
	active: 'badge-green',
	archived: 'badge-gray',
	on_hold: 'badge-brass',
};

export function ViewPortfolioModal({ onClose, portfolio }: Props) {
	const { data: casesData, isLoading } = useCases(1, 10, undefined, portfolio.id);
	const cases = casesData?.items ?? [];

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-xl max-h-[80vh] flex flex-col">
				<div className="flex items-center justify-between p-6 border-b border-slate-700/50">
					<div className="flex items-center gap-3">
						<div className="p-2 bg-emerald-500/10 rounded-lg">
							<FolderOpen className="w-5 h-5 text-emerald-400" />
						</div>
						<div>
							<h2 className="text-lg font-semibold text-slate-100">{portfolio.name}</h2>
							{portfolio.description && <p className="text-xs text-slate-500 mt-0.5">{portfolio.description}</p>}
						</div>
					</div>
					<div className="flex items-center gap-3">
						<span className={`badge ${STATUS_COLORS[portfolio.status] ?? 'badge-gray'}`}>{portfolio.status}</span>
						<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-6 space-y-5">
					<div className="grid grid-cols-3 gap-4">
						{[
							{ label: 'Cases', value: portfolio.caseCount },
							{ label: 'Documents', value: portfolio.documentCount },
							{ label: 'Created', value: formatRelativeTime(portfolio.createdAt) },
						].map(({ label, value }) => (
							<div key={label} className="bg-slate-800/40 rounded-lg p-3 text-center">
								<p className="text-xl font-semibold text-slate-100">{value}</p>
								<p className="text-xs text-slate-500">{label}</p>
							</div>
						))}
					</div>

					<div>
						<h3 className="text-sm font-medium text-slate-300 mb-3">Cases</h3>
						{isLoading ? (
							<div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
						) : cases.length === 0 ? (
							<p className="text-sm text-slate-500 text-center py-4">No cases in this portfolio</p>
						) : (
							<div className="space-y-2">
								{cases.map((c) => (
									<div key={c.id} className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg">
										<div className="flex items-center gap-2">
											<Briefcase className="w-4 h-4 text-slate-500" />
											<div>
												<p className="text-sm font-medium text-slate-200">{c.title}</p>
												<p className="text-xs text-slate-500">#{c.caseNumber}</p>
											</div>
										</div>
										<span className={`badge text-2xs ${STATUS_COLORS[c.status] ?? 'badge-gray'}`}>{c.status}</span>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				<div className="p-4 border-t border-slate-700/50">
					<button onClick={onClose} className="btn-secondary w-full">Close</button>
				</div>
			</div>
		</div>
	);
}
