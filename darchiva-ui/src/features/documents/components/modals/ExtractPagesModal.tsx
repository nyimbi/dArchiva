// Extract Pages Modal - Create new document from selected pages
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, FileOutput, FileText, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
	open: boolean;
	sourceDocument: { id: string; title: string } | null;
	selectedPages: number[];
	onExtract: (title: string, destinationFolderId?: string) => Promise<void>;
	onClose: () => void;
}

export function ExtractPagesModal({
	open,
	sourceDocument,
	selectedPages,
	onExtract,
	onClose,
}: Props) {
	const [title, setTitle] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const defaultTitle = sourceDocument
		? `${sourceDocument.title} - Extracted (${selectedPages.length} pages)`
		: '';

	const handleExtract = async () => {
		setLoading(true);
		setError(null);
		try {
			await onExtract(title || defaultTitle);
			onClose();
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Extraction failed');
		} finally {
			setLoading(false);
		}
	};

	if (!open || !sourceDocument) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
			<div className="doc-modal relative z-10 w-full max-w-md mx-4">
				{/* Header */}
				<div className="flex items-center justify-between p-5 border-b border-[var(--doc-border)]">
					<div className="flex items-center gap-3">
						<div className="doc-icon-box">
							<FileOutput className="w-5 h-5" />
						</div>
						<div>
							<h2 className="font-display text-lg font-semibold text-[var(--doc-text)]">
								Extract Pages
							</h2>
							<p className="text-sm text-[var(--doc-muted)]">
								Create a new document from selected pages
							</p>
						</div>
					</div>
					<button onClick={onClose} className="doc-close-btn">
						<X className="w-5 h-5" />
					</button>
				</div>

				{/* Content */}
				<div className="p-5 space-y-5">
					{/* Source Info */}
					<div className="doc-info-box">
						<FileText className="w-5 h-5 text-[var(--doc-accent)]" />
						<div>
							<p className="font-medium text-[var(--doc-text)]">{sourceDocument.title}</p>
							<p className="text-sm text-[var(--doc-muted)]">
								Extracting {selectedPages.length} page{selectedPages.length !== 1 ? 's' : ''}:
								{' '}
								<span className="font-mono text-xs">
									{selectedPages.slice(0, 5).join(', ')}
									{selectedPages.length > 5 && `, +${selectedPages.length - 5} more`}
								</span>
							</p>
						</div>
					</div>

					{/* New Document Title */}
					<div>
						<label className="doc-label">New Document Title</label>
						<input
							type="text"
							value={title}
							onChange={e => setTitle(e.target.value)}
							placeholder={defaultTitle}
							className="doc-input"
						/>
					</div>

					{/* Destination (optional) */}
					<div>
						<label className="doc-label">Destination Folder</label>
						<button className="doc-folder-select">
							<FolderOpen className="w-4 h-4 text-[var(--doc-muted)]" />
							<span className="text-[var(--doc-muted)]">Same as source document</span>
						</button>
					</div>

					{error && (
						<div className="doc-error-box">
							<p className="text-sm">{error}</p>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-3 p-5 border-t border-[var(--doc-border)]">
					<Button variant="ghost" onClick={onClose}>Cancel</Button>
					<Button onClick={handleExtract} disabled={loading} className="doc-btn-primary">
						{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
						Extract Pages
					</Button>
				</div>
			</div>
		</div>
	);
}
