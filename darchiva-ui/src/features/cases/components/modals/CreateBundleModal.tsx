// (c) Copyright Datacraft, 2026
import { useCreateBundle, type Case } from '@/features/cases/api';
import { Loader2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
	case_?: Case | null;
}

export function CreateBundleModal({ onClose, case_ }: Props) {
	const [name, setName] = useState('');
	const [description, setDescription] = useState('');
	const createBundle = useCreateBundle();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim() || !case_) return;
		try {
			await createBundle.mutateAsync({ name: name.trim(), caseId: case_.id, description: description.trim() || undefined });
			toast.success('Bundle created');
			onClose();
		} catch {
			toast.error('Failed to create bundle');
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-md p-6">
				<div className="flex items-center justify-between mb-5">
					<h2 className="text-lg font-semibold text-slate-100">Create Bundle</h2>
					<button aria-label="Close" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
				</div>

				{case_ && (
					<p className="text-sm text-slate-500 mb-4">Adding to case: <span className="text-slate-300">{case_.title}</span></p>
				)}

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-sm text-slate-400 mb-1">Bundle Name *</label>
						<input className="input w-full" placeholder="e.g. Invoices Q1 2026" value={name} onChange={(e) => setName(e.target.value)} required />
					</div>
					<div>
						<label className="block text-sm text-slate-400 mb-1">Description</label>
						<textarea className="input w-full resize-none" rows={3} placeholder="Optional description" value={description} onChange={(e) => setDescription(e.target.value)} />
					</div>
					<div className="flex gap-2 pt-1">
						<button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
						<button type="submit" disabled={createBundle.isPending || !case_} className="btn-primary flex-1">
							{createBundle.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Bundle'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
