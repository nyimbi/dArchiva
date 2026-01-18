// Unsaved Changes Dialog
import { AlertTriangle, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
	open: boolean;
	onSave: () => void;
	onDiscard: () => void;
	onClose: () => void;
}

export function UnsavedChangesDialog({ open, onSave, onDiscard, onClose }: Props) {
	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
			<div className="doc-modal relative z-10 w-full max-w-sm mx-4">
				<div className="p-6 text-center">
					<div className="doc-warning-icon mx-auto mb-4">
						<AlertTriangle className="w-6 h-6" />
					</div>
					<h3 className="font-display text-lg font-semibold text-[var(--doc-text)] mb-2">
						Unsaved Changes
					</h3>
					<p className="text-[var(--doc-muted)] mb-5">
						You have unsaved changes. What would you like to do?
					</p>

					<div className="flex flex-col gap-2">
						<Button onClick={onSave} className="doc-btn-primary w-full">
							<Save className="w-4 h-4 mr-2" />
							Save Changes
						</Button>
						<Button variant="outline" onClick={onDiscard} className="w-full">
							<X className="w-4 h-4 mr-2" />
							Discard Changes
						</Button>
						<Button variant="ghost" onClick={onClose} className="w-full text-[var(--doc-muted)]">
							Continue Editing
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
