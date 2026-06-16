// (c) Copyright Datacraft, 2026
import { useCreatePortfolio } from '@/features/portfolios/api';
import { Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
}

export function CreatePortfolioModal({ onClose }: Props) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const createPortfolio = useCreatePortfolio();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		try {
			await createPortfolio.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
			toast.success('Portfolio created');
			onClose();
		} catch {
			toast.error('Failed to create portfolio');
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-md p-6">
				<div className="flex items-center justify-between mb-5">
					<h2 className="text-lg font-semibold text-slate-100">Create Portfolio</h2>
					<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
				</div>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm text-slate-400 mb-1">Portfolio Name *</label>
						<input className="input w-full" placeholder="e.g. Legal Affairs 2026" value={name} onChange={(e) => setName(e.target.value)} required />
					</div>
					<div>
						<label className="block text-sm text-slate-400 mb-1">Description</label>
						<textarea className="input w-full resize-none" rows={3} placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
					</div>
					<div className="flex gap-2 pt-1">
						<button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
						<button type="submit" disabled={createPortfolio.isPending} className="btn-primary flex-1">
							{createPortfolio.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Portfolio'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
