// Merge Documents Dialog — reorder selected docs, set title, POST /api/v1/documents/merge
import { useState, useCallback } from 'react';
import { Loader2, Merge, ChevronUp, ChevronDown, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentKeys } from '../api';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MergeSourceDocument {
	id: string;
	title: string;
	page_count?: number;
}

interface MergeRequest {
	source_document_ids: string[];
	title: string;
	destination_folder_id?: string | null;
}

interface MergeResponse {
	document_id: string;
	title: string;
	page_count: number;
	version_id: string;
}

interface Props {
	open: boolean;
	documents: MergeSourceDocument[];
	destinationFolderId?: string | null;
	onClose: () => void;
	onSuccess?: (result: MergeResponse) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useMergeDocuments() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: MergeRequest): Promise<MergeResponse> => {
			const { data } = await apiClient.post<MergeResponse>('/documents/merge', body);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: documentKeys.all });
		},
	});
}

// ── Component ────────────────────────────────────────────────────────────────

export function MergeDocumentsDialog({
	open,
	documents: initialDocuments,
	destinationFolderId,
	onClose,
	onSuccess,
}: Props) {
	const [docs, setDocs] = useState<MergeSourceDocument[]>(initialDocuments);
	const [title, setTitle] = useState('Merged Document');
	const { mutateAsync: merge, isPending, error } = useMergeDocuments();

	const moveUp = useCallback((index: number) => {
		if (index === 0) return;
		setDocs(prev => {
			const next = [...prev];
			[next[index - 1], next[index]] = [next[index], next[index - 1]];
			return next;
		});
	}, []);

	const moveDown = useCallback((index: number) => {
		setDocs(prev => {
			if (index >= prev.length - 1) return prev;
			const next = [...prev];
			[next[index], next[index + 1]] = [next[index + 1], next[index]];
			return next;
		});
	}, []);

	const remove = useCallback((index: number) => {
		setDocs(prev => prev.filter((_, i) => i !== index));
	}, []);

	const handleMerge = async () => {
		if (docs.length < 2) return;
		const result = await merge({
			source_document_ids: docs.map(d => d.id),
			title: title.trim() || 'Merged Document',
			destination_folder_id: destinationFolderId ?? null,
		});
		onSuccess?.(result);
		onClose();
	};

	if (!open) return null;

	const totalPages = docs.reduce((sum, d) => sum + (d.page_count ?? 0), 0);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
			<div className="doc-modal relative z-10 w-full max-w-lg mx-4">
				<div className="p-6">
					{/* Header */}
					<div className="flex items-center gap-3 mb-5">
						<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--doc-accent)]/10">
							<Merge className="w-5 h-5 text-[var(--doc-accent)]" />
						</div>
						<div>
							<h3 className="font-display text-lg font-semibold text-[var(--doc-text)]">
								Merge Documents
							</h3>
							<p className="text-sm text-[var(--doc-muted)]">
								{docs.length} document{docs.length !== 1 ? 's' : ''} · {totalPages} page{totalPages !== 1 ? 's' : ''} total
							</p>
						</div>
						<button
							onClick={onClose}
							className="ml-auto text-[var(--doc-muted)] hover:text-[var(--doc-text)] transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Title input */}
					<div className="mb-4">
						<label className="block text-sm font-medium text-[var(--doc-text)] mb-1.5">
							Title for merged document
						</label>
						<Input
							value={title}
							onChange={e => setTitle(e.target.value)}
							placeholder="Merged Document"
							className="doc-input"
						/>
					</div>

					{/* Document list */}
					<div className="mb-4">
						<label className="block text-sm font-medium text-[var(--doc-text)] mb-1.5">
							Merge order (drag or use arrows to reorder)
						</label>
						<div className="space-y-1.5 max-h-60 overflow-y-auto">
							{docs.map((doc, i) => (
								<div
									key={doc.id}
									className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--doc-surface)] border border-[var(--doc-border)] group"
								>
									<span className="text-xs text-[var(--doc-muted)] w-5 text-center font-mono">
										{i + 1}
									</span>
									<FileText className="w-4 h-4 text-[var(--doc-accent)] flex-shrink-0" />
									<span className="flex-1 text-sm text-[var(--doc-text)] truncate">
										{doc.title}
									</span>
									{doc.page_count != null && (
										<span className="text-xs text-[var(--doc-muted)] flex-shrink-0">
											{doc.page_count}p
										</span>
									)}
									<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
										<button
											onClick={() => moveUp(i)}
											disabled={i === 0}
											className="p-0.5 rounded hover:bg-[var(--doc-border)] disabled:opacity-30 disabled:cursor-not-allowed"
											title="Move up"
										>
											<ChevronUp className="w-3.5 h-3.5 text-[var(--doc-muted)]" />
										</button>
										<button
											onClick={() => moveDown(i)}
											disabled={i === docs.length - 1}
											className="p-0.5 rounded hover:bg-[var(--doc-border)] disabled:opacity-30 disabled:cursor-not-allowed"
											title="Move down"
										>
											<ChevronDown className="w-3.5 h-3.5 text-[var(--doc-muted)]" />
										</button>
										<button
											onClick={() => remove(i)}
											className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20"
											title="Remove from merge"
										>
											<X className="w-3.5 h-3.5 text-[var(--doc-muted)] hover:text-red-500" />
										</button>
									</div>
								</div>
							))}
						</div>
						{docs.length < 2 && (
							<p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">
								At least 2 documents required to merge.
							</p>
						)}
					</div>

					{/* Error */}
					{error && (
						<div className="doc-warning-box-sm mb-4">
							<span className="text-sm text-red-600 dark:text-red-400">
								{(error as any)?.response?.data?.detail ?? (error as Error).message}
							</span>
						</div>
					)}

					{/* Actions */}
					<div className="flex items-center justify-end gap-3 pt-2">
						<Button variant="ghost" onClick={onClose} disabled={isPending}>
							Cancel
						</Button>
						<Button
							onClick={handleMerge}
							disabled={isPending || docs.length < 2 || !title.trim()}
							className="doc-btn-primary"
						>
							{isPending ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin mr-2" />
									Merging…
								</>
							) : (
								<>
									<Merge className="w-4 h-4 mr-2" />
									Merge {docs.length} Documents
								</>
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
