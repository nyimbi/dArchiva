// Confirm Dialog - Reusable confirmation modal
import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Variant = 'danger' | 'warning' | 'info';

interface Props {
	open: boolean;
	title: string;
	message: string | React.ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: Variant;
	onConfirm: () => void | Promise<void>;
	onCancel: () => void;
}

const VARIANTS: Record<Variant, { icon: string; button: string }> = {
	danger: {
		icon: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
		button: 'bg-red-600 hover:bg-red-700 text-white',
	},
	warning: {
		icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
		button: 'bg-amber-600 hover:bg-amber-700 text-white',
	},
	info: {
		icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
		button: 'bg-blue-600 hover:bg-blue-700 text-white',
	},
};

export function ConfirmDialog({
	open,
	title,
	message,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	variant = 'danger',
	onConfirm,
	onCancel,
}: Props) {
	const [loading, setLoading] = useState(false);
	const styles = VARIANTS[variant];

	const handleConfirm = async () => {
		setLoading(true);
		try {
			await onConfirm();
		} finally {
			setLoading(false);
		}
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
			<div className="confirm-dialog relative z-10 w-full max-w-sm mx-4">
				<div className="p-6 text-center">
					<div className={cn('confirm-icon mx-auto mb-4', styles.icon)}>
						<AlertTriangle className="w-6 h-6" />
					</div>
					<h3 className="font-display text-lg font-semibold text-[var(--confirm-text)] mb-2">
						{title}
					</h3>
					<div className="text-[var(--confirm-muted)] mb-5">
						{message}
					</div>
					<div className="flex items-center justify-center gap-3">
						<Button variant="ghost" onClick={onCancel} disabled={loading}>
							{cancelLabel}
						</Button>
						<Button
							onClick={handleConfirm}
							disabled={loading}
							className={styles.button}
						>
							{loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
							{confirmLabel}
						</Button>
					</div>
				</div>
			</div>
		</div>
	);
}
