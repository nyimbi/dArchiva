// Split Document Dialog — choose split page, optional titles, POST /api/v1/documents/{id}/split
import { useState } from 'react';
import { Loader2, Scissors, X, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiClient } from '@/lib/api-client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { documentKeys } from '../api';

// ── Types ────────────────────────────────────────────────────────────────────

interface SplitRequest {
	at_page: number;
	title_part1?: string;
	title_part2?: string;
}

interface SplitPartInfo {
	document_id: string;
	title: string;
	page_count: number;
	version_id: string;
}

interface SplitResponse {
	part1: SplitPartInfo;
	part2: SplitPartInfo;
}

interface Props {
	open: boolean;
	documentId: string;
	documentTitle: string;
	pageCount: number;
	onClose: () => void;
	onSuccess?: (result: SplitResponse) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useSplitDocument(documentId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: async (body: SplitRequest): Promise<SplitResponse> => {
			const { data } = await apiClient.post<SplitResponse>(
				`/documents/${documentId}/split`,
				body,
			);
			return data;
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: documentKeys.all });
		},
	});
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number) {
	return Math.min(max, Math.max(min, value));
}

// ── Component ────────────────────────────────────────────────────────────────

export function SplitDocumentDialog({
	open,
	documentId,
	documentTitle,
	pageCount,
	onClose,
	onSuccess,
}: Props) {
	const maxSplit = Math.max(1, pageCount - 1);
	const [atPage, setAtPage] = useState(Math.ceil(pageCount / 2));
	const [title1, setTitle1] = useState('');
	const [title2, setTitle2] = useState('');
	const { mutateAsync: split, isPending, error } = useSplitDocument(documentId);

	const part1Pages = atPage;
	const part2Pages = pageCount - atPage;

	const handleSplit = async () => {
		const result = await split({
			at_page: atPage,
			title_part1: title1.trim() || undefined,
			title_part2: title2.trim() || undefined,
		});
		onSuccess?.(result);
		onClose();
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
			<div className="doc-modal relative z-10 w-full max-w-md mx-4">
				<div className="p-6">
					{/* Header */}
					<div className="flex items-center gap-3 mb-5">
						<div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
							<Scissors className="w-5 h-5 text-amber-500" />
						</div>
						<div>
							<h3 className="font-display text-lg font-semibold text-[var(--doc-text)]">
								Split Document
							</h3>
							<p className="text-sm text-[var(--doc-muted)] truncate max-w-[240px]">
								{documentTitle}
							</p>
						</div>
						<button
							onClick={onClose}
							className="ml-auto text-[var(--doc-muted)] hover:text-[var(--doc-text)] transition-colors"
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Split point */}
					<div className="mb-5">
						<label className="block text-sm font-medium text-[var(--doc-text)] mb-2">
							Split after page
						</label>
						<div className="flex items-center gap-3">
							<input
								type="range"
								min={1}
								max={maxSplit}
								value={atPage}
								onChange={e => setAtPage(Number(e.target.value))}
								className="flex-1 accent-amber-500 cursor-pointer"
							/>
							<input
								type="number"
								min={1}
								max={maxSplit}
								value={atPage}
								onChange={e =>
									setAtPage(clamp(Number(e.target.value), 1, maxSplit))
								}
								className="w-16 text-center rounded-md border border-[var(--doc-border)] bg-[var(--doc-surface)] text-[var(--doc-text)] text-sm px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--doc-accent)]"
							/>
						</div>
					</div>

					{/* Preview */}
					<div className="grid grid-cols-2 gap-3 mb-5">
						<div className="rounded-lg border border-[var(--doc-border)] bg-[var(--doc-surface)] p-3">
							<div className="flex items-center gap-2 mb-1.5">
								<FileText className="w-4 h-4 text-[var(--doc-accent)]" />
								<span className="text-xs font-medium text-[var(--doc-text)]">Part 1</span>
							</div>
							<p className="text-xs text-[var(--doc-muted)]">
								Pages 1 – {part1Pages}
							</p>
							<p className="text-lg font-semibold text-[var(--doc-text)] mt-0.5">
								{part1Pages}
								<span className="text-xs text-[var(--doc-muted)] font-normal ml-1">pages</span>
							</p>
						</div>
						<div className="rounded-lg border border-[var(--doc-border)] bg-[var(--doc-surface)] p-3">
							<div className="flex items-center gap-2 mb-1.5">
								<FileText className="w-4 h-4 text-amber-500" />
								<span className="text-xs font-medium text-[var(--doc-text)]">Part 2</span>
							</div>
							<p className="text-xs text-[var(--doc-muted)]">
								Pages {part1Pages + 1} – {pageCount}
							</p>
							<p className="text-lg font-semibold text-[var(--doc-text)] mt-0.5">
								{part2Pages}
								<span className="text-xs text-[var(--doc-muted)] font-normal ml-1">pages</span>
							</p>
						</div>
					</div>

					{/* Optional titles */}
					<div className="space-y-3 mb-5">
						<div>
							<label className="block text-sm font-medium text-[var(--doc-text)] mb-1">
								Part 1 title{' '}
								<span className="text-[var(--doc-muted)] font-normal">(optional)</span>
							</label>
							<Input
								value={title1}
								onChange={e => setTitle1(e.target.value)}
								placeholder={`${documentTitle} (part 1)`}
								className="doc-input text-sm"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-[var(--doc-text)] mb-1">
								Part 2 title{' '}
								<span className="text-[var(--doc-muted)] font-normal">(optional)</span>
							</label>
							<Input
								value={title2}
								onChange={e => setTitle2(e.target.value)}
								placeholder={`${documentTitle} (part 2)`}
								className="doc-input text-sm"
							/>
						</div>
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
					<div className="flex items-center justify-end gap-3 pt-1">
						<Button variant="ghost" onClick={onClose} disabled={isPending}>
							Cancel
						</Button>
						<Button
							onClick={handleSplit}
							disabled={isPending || pageCount < 2}
							className="bg-amber-500 hover:bg-amber-600 text-white border-0"
						>
							{isPending ? (
								<>
									<Loader2 className="w-4 h-4 animate-spin mr-2" />
									Splitting…
								</>
							) : (
								<>
									<Scissors className="w-4 h-4 mr-2" />
									Split at Page {atPage}
								</>
							)}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
