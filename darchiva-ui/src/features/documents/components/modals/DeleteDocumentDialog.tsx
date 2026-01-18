// Delete Document Dialog
import { useState } from 'react';
import { Trash2, AlertTriangle, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
	open: boolean;
	document: { id: string; title: string; pageCount?: number } | null;
	onDelete: () => Promise<void>;
	onClose: () => void;
}

export function DeleteDocumentDialog({ open, document, onDelete, onClose }: Props) {
	const [loading, setLoading] = useState(false);

	const handleDelete = async () => {
		setLoading(true);
		try {
			await onDelete();
			onClose();
		} finally {
			setLoading(false);
		}
	};

	if (!open || !document) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
			<div className="doc-modal relative z-10 w-full max-w-sm mx-4">
				<div className="p-6 text-center">
					<div className="doc-danger-icon mx-auto mb-4">
						<Trash2 className="w-6 h-6" />
					</div>
					<h3 className="font-display text-lg font-semibold text-[var(--doc-text)] mb-2">
						Delete Document
					</h3>
					<p className="text-[var(--doc-muted)] mb-4">
						Are you sure you want to delete{' '}
						<strong className="text-[var(--doc-text)]">{document.title}</strong>?
					</p>

					<div className="doc-warning-box-sm mb-5">
						<AlertTriangle className="w-4 h-4 text-[var(--doc-warning)]" />
						<span className="text-sm text-[var(--doc-muted)]">
							This action cannot be undone
						</span>
					</div>

					<div className="flex items-center justify-center gap-3">
						<Button variant="ghost" onClick={onClose}>Cancel</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={loading}
							className="doc-btn-danger"
						>
							{loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
							Delete Document
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
