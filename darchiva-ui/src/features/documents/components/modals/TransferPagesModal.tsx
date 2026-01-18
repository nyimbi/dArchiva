// Transfer Pages Modal - Move pages between documents
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, ArrowRight, Layers, Replace, Shuffle, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type TransferStrategy = 'mix' | 'replace';

interface Props {
	open: boolean;
	sourceDocument: { id: string; title: string; pageCount: number } | null;
	targetDocument: { id: string; title: string; pageCount: number } | null;
	selectedPages: number[];
	onTransfer: (strategy: TransferStrategy) => Promise<void>;
	onClose: () => void;
}

export function TransferPagesModal({
	open,
	sourceDocument,
	targetDocument,
	selectedPages,
	onTransfer,
	onClose,
}: Props) {
	const [strategy, setStrategy] = useState<TransferStrategy>('mix');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleTransfer = async () => {
		setLoading(true);
		setError(null);
		try {
			await onTransfer(strategy);
			onClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Transfer failed');
		} finally {
			setLoading(false);
		}
	};

	if (!open || !sourceDocument || !targetDocument) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
			<div className="doc-modal relative z-10 w-full max-w-md mx-4">
				{/* Header */}
				<div className="flex items-center justify-between p-5 border-b border-[var(--doc-border)]">
					<div className="flex items-center gap-3">
						<div className="doc-icon-box">
							<Layers className="w-5 h-5" />
						</div>
						<h2 className="font-display text-lg font-semibold text-[var(--doc-text)]">
							Transfer Pages
						</h2>
					</div>
					<button onClick={onClose} className="doc-close-btn">
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-5 space-y-5">
					{/* Transfer Preview */}
					<div className="flex items-center gap-4">
						<div className="doc-transfer-doc">
							<FileText className="w-5 h-5 text-[var(--doc-accent)]" />
							<div>
								<p className="font-medium text-[var(--doc-text)] text-sm truncate max-w-[120px]">
									{sourceDocument.title}
								</p>
								<p className="text-xs text-[var(--doc-muted)]">
									{selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''} selected
								</p>
							</div>
						</div>
						<ArrowRight className="w-5 h-5 text-[var(--doc-muted)] flex-shrink-0" />
						<div className="doc-transfer-doc">
							<FileText className="w-5 h-5 text-[var(--doc-gold)]" />
							<div>
								<p className="font-medium text-[var(--doc-text)] text-sm truncate max-w-[120px]">
									{targetDocument.title}
								</p>
								<p className="text-xs text-[var(--doc-muted)]">
									{targetDocument.pageCount} pages
								</p>
							</div>
						</div>
					</div>

					{/* Strategy Selection */}
					<div>
						<label className="doc-label">Transfer Strategy</label>
						<div className="grid grid-cols-2 gap-3">
							<button
								onClick={() => setStrategy('mix')}
								className={cn('doc-strategy-btn', strategy === 'mix' && 'doc-strategy-btn-active')}
							>
								<Shuffle className="w-5 h-5" />
								<span className="font-medium">Mix</span>
								<span className="text-xs text-[var(--doc-muted)]">Append to existing pages</span>
							</button>
							<button
								onClick={() => setStrategy('replace')}
								className={cn('doc-strategy-btn', strategy === 'replace' && 'doc-strategy-btn-active')}
							>
								<Replace className="w-5 h-5" />
								<span className="font-medium">Replace</span>
								<span className="text-xs text-[var(--doc-muted)]">Replace all pages</span>
							</button>
						</div>
					</div>

					{/* Warning for Replace */}
					{strategy === 'replace' && (
						<div className="doc-warning-box">
							<p className="text-sm">
								This will <strong>replace all existing pages</strong> in the target document.
								This action cannot be undone.
							</p>
						</div>
					)}

					{error && (
						<div className="doc-error-box">
							<p className="text-sm">{error}</p>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--doc-border)]">
					<Button variant="ghost" onClick={onClose}>Cancel</Button>
					<Button onClick={handleTransfer} disabled={loading} className="doc-btn-primary">
						{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
						Transfer {selectedPages.length} Page{selectedPages.length !== 1 ? 's' : ''}
					</Button>
				</div>
			</div>
		</div>
	);
}
