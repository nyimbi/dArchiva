// (c) Copyright Datacraft, 2026
import { type Case } from '@/features/cases/api';
import { useDocuments } from '@/features/documents/api';
import { apiClient } from '@/lib/api-client';
import { FileText, Loader2, Search, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface Props {
	onClose: () => void;
	case_?: Case | null;
}

export function AddDocumentsToCaseModal({ onClose, case_ }: Props) {
	const [search, setSearch] = useState('');
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [adding, setAdding] = useState(false);

	const { data, isLoading } = useDocuments(undefined, 1, 50);
	const docs = (data?.items ?? []).filter(
		(d) => d.ctype === 'document' && (!search || d.title.toLowerCase().includes(search.toLowerCase()))
	);

	const toggleDoc = (id: string) =>
		setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

	const handleAdd = async () => {
		if (!case_ || selectedIds.length === 0) return;
		setAdding(true);
		try {
			await apiClient.post(`/cases/${case_.id}/documents`, { document_ids: selectedIds });
			toast.success(`Added ${selectedIds.length} document(s) to case`);
			onClose();
		} catch {
			toast.error('Failed to add documents');
		} finally {
			setAdding(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
			<div className="glass-card w-full max-w-lg max-h-[80vh] flex flex-col">
				<div className="flex items-center justify-between p-5 border-b border-slate-700/50">
					<div>
						<h2 className="text-lg font-semibold text-slate-100">Add Documents</h2>
						{case_ && <p className="text-xs text-slate-500 mt-0.5">to case: {case_.title}</p>}
					</div>
					<button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 rounded"><X className="w-5 h-5" /></button>
				</div>

				<div className="p-4 border-b border-slate-700/50">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
						<input className="input w-full pl-9" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
					</div>
				</div>

				<div className="flex-1 overflow-y-auto p-2">
					{isLoading ? (
						<div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-slate-500" /></div>
					) : docs.length === 0 ? (
						<p className="text-center text-slate-500 py-8">No documents found</p>
					) : (
						docs.map((doc) => (
							<label key={doc.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 cursor-pointer">
								<input
									type="checkbox"
									checked={selectedIds.includes(doc.id)}
									onChange={() => toggleDoc(doc.id)}
									className="rounded border-slate-600"
								/>
								<FileText className="w-4 h-4 text-slate-500 shrink-0" />
								<span className="text-sm text-slate-300 truncate">{doc.title}</span>
							</label>
						))
					)}
				</div>

				<div className="p-4 border-t border-slate-700/50 flex gap-2">
					<button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
					<button onClick={handleAdd} disabled={adding || selectedIds.length === 0} className="btn-primary flex-1">
						{adding ? <Loader2 className="w-4 h-4 animate-spin" /> : `Add ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`}
					</button>
				</div>
			</div>
		</div>
	);
}
