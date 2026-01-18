// Delete Token Dialog - Warm Archival Theme
import { AlertTriangle, Key, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteToken } from '../api/hooks';
import type { APIToken } from '../types';

interface Props {
	token: APIToken | null;
	onClose: () => void;
}

export function DeleteTokenDialog({ token, onClose }: Props) {
	const deleteToken = useDeleteToken();

	const handleDelete = async () => {
		if (token) {
			await deleteToken.mutateAsync(token.id);
			onClose();
		}
	};

	if (!token) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
			<div className="token-modal relative z-10 w-full max-w-md mx-4 token-modal-animate">
				<div className="p-6 text-center">
					<div className="token-danger-icon mx-auto mb-4">
						<Trash2 className="w-6 h-6" />
					</div>
					<h3 className="font-display text-lg font-semibold text-[var(--token-text)] mb-2">
						Delete API Token
					</h3>
					<p className="text-[var(--token-muted)] mb-4">
						Are you sure you want to delete <strong className="text-[var(--token-text)]">{token.name}</strong>?
						This action cannot be undone.
					</p>

					<div className="token-warning-box-sm mb-6">
						<AlertTriangle className="w-4 h-4 text-[var(--token-warning)]" />
						<span className="text-sm text-[var(--token-muted)]">
							Any applications using this token will lose access
						</span>
					</div>

					<div className="flex items-center justify-center gap-3">
						<Button variant="ghost" onClick={onClose}>Cancel</Button>
						<Button
							variant="destructive"
							onClick={handleDelete}
							disabled={deleteToken.isPending}
							className="token-btn-danger"
						>
							{deleteToken.isPending ? 'Deleting...' : 'Delete Token'}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
