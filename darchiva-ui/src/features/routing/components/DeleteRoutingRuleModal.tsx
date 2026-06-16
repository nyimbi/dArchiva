// (c) Copyright Datacraft, 2026
import { useDeleteRoutingRule } from '@/features/routing/api';
import type { RoutingRule } from '@/types';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
	rule: RoutingRule;
}

export function DeleteRoutingRuleModal({ onClose, rule }: Props) {
	const deleteMutation = useDeleteRoutingRule();

	const handleDelete = async () => {
		try {
			await deleteMutation.mutateAsync(rule.id);
			toast.success('Routing rule deleted');
			onClose();
		} catch {
			toast.error('Failed to delete routing rule');
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-md p-6">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold text-slate-100">Delete Routing Rule</h2>
					<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded">
						<X className="w-5 h-5" />
					</button>
				</div>

				<div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-lg mb-6">
					<AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
					<div>
						<p className="text-sm text-slate-200">
							Delete <span className="font-semibold">"{rule.name}"</span>?
						</p>
						<p className="text-xs text-slate-500 mt-1">
							Documents will no longer be routed by this rule. This cannot be undone.
						</p>
					</div>
				</div>

				<div className="flex gap-2">
					<button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
					<button
						onClick={handleDelete}
						disabled={deleteMutation.isPending}
						className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
					>
						{deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete Rule'}
					</button>
				</div>
			</div>
		</div>
	);
}
