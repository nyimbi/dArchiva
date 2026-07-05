// (c) Copyright Datacraft, 2026
import { X } from 'lucide-react';
import { useState } from 'react';

interface Props {
	onClose: () => void;
}

export interface CaseFiltersAppliedDetail {
	status: string;
	portfolioId: string;
	portfolio: string;
	createdAfter: string;
	createdBefore: string;
	dateFrom: string;
	dateTo: string;
}

export function CaseFiltersModal({ onClose }: Props) {
	const [status, setStatus] = useState('');
	const [portfolioId, setPortfolioId] = useState('');
	const [createdAfter, setCreatedAfter] = useState('');
	const [createdBefore, setCreatedBefore] = useState('');

	const handleApply = () => {
		const detail: CaseFiltersAppliedDetail = {
			status,
			portfolioId,
			portfolio: portfolioId,
			createdAfter,
			createdBefore,
			dateFrom: createdAfter,
			dateTo: createdBefore,
		};
		const event = new CustomEvent<CaseFiltersAppliedDetail>('case-filters-applied', {
			detail,
		});
		window.dispatchEvent(event);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-sm p-6">
				<div className="flex items-center justify-between mb-5">
					<h2 className="text-lg font-semibold text-slate-100">Filter Cases</h2>
					<button aria-label="Close" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
				</div>

				<div className="space-y-4">
					<div>
						<label className="block text-sm text-slate-400 mb-1">Status</label>
						<select className="input w-full" value={status} onChange={(e) => setStatus(e.target.value)}>
							<option value="">All statuses</option>
							<option value="open">Open</option>
							<option value="closed">Closed</option>
							<option value="pending">Pending</option>
							<option value="on_hold">On Hold</option>
						</select>
					</div>
					<div>
						<label className="block text-sm text-slate-400 mb-1">Created After</label>
						<input type="date" className="input w-full" value={createdAfter} onChange={(e) => setCreatedAfter(e.target.value)} />
					</div>
					<div>
						<label className="block text-sm text-slate-400 mb-1">Created Before</label>
						<input type="date" className="input w-full" value={createdBefore} onChange={(e) => setCreatedBefore(e.target.value)} />
					</div>
					<div className="flex gap-2 pt-1">
						<button type="button" onClick={() => { setStatus(''); setPortfolioId(''); setCreatedAfter(''); setCreatedBefore(''); }} className="btn-secondary flex-1">Reset</button>
						<button type="button" onClick={handleApply} className="btn-primary flex-1">Apply Filters</button>
					</div>
				</div>
			</div>
		</div>
	);
}
