// (c) Copyright Datacraft, 2026
import { useDeletePortfolio, type Portfolio } from '@/features/portfolios/api';
import { useStore } from '@/hooks/useStore';
import { Archive, Eye, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
	portfolio: Portfolio;
}

export function PortfolioOptionsModal({ onClose, portfolio }: Props) {
	const { openModal } = useStore();
	const deletePortfolio = useDeletePortfolio();

	const handleDelete = async () => {
		if (!confirm(`Delete portfolio "${portfolio.name}"? This cannot be undone.`)) return;
		try {
			await deletePortfolio.mutateAsync(portfolio.id);
			toast.success('Portfolio deleted');
			onClose();
		} catch {
			toast.error('Failed to delete portfolio');
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-xs p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-semibold text-slate-200 truncate">{portfolio.name}</h3>
					<button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded"><X className="w-4 h-4" /></button>
				</div>
				<div className="space-y-1">
					<button onClick={() => { onClose(); openModal('view-portfolio', portfolio); }}
						className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
						<Eye className="w-4 h-4" /> View Portfolio
					</button>
					<button onClick={() => { onClose(); }}
						className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-300 hover:bg-slate-700/50 transition-colors">
						<Archive className="w-4 h-4" /> Archive Portfolio
					</button>
					<button onClick={handleDelete}
						className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors">
						<Trash2 className="w-4 h-4" /> Delete Portfolio
					</button>
				</div>
			</div>
		</div>
	);
}
