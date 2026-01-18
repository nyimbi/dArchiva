// Toast Container - Warm Archival Theme
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotificationStore } from '../store';
import type { Toast, NotificationType } from '../types';
import '../styles/theme.css';

const ICONS: Record<NotificationType, typeof CheckCircle2> = {
	success: CheckCircle2,
	error: AlertCircle,
	warning: AlertTriangle,
	info: Info,
};

export function ToastContainer() {
	const toasts = useNotificationStore(s => s.toasts);
	const removeToast = useNotificationStore(s => s.removeToast);

	return (
		<div className="toast-container">
			{toasts.map((toast, i) => (
				<ToastItem
					key={toast.id}
					toast={toast}
					index={i}
					onDismiss={() => removeToast(toast.id)}
				/>
			))}
		</div>
	);
}

function ToastItem({
	toast,
	index,
	onDismiss,
}: {
	toast: Toast;
	index: number;
	onDismiss: () => void;
}) {
	const [exiting, setExiting] = useState(false);
	const [progress, setProgress] = useState(100);
	const Icon = ICONS[toast.type];

	useEffect(() => {
		if (!toast.duration || toast.duration <= 0) return;

		const interval = 50;
		const decrement = (interval / toast.duration) * 100;
		const timer = setInterval(() => {
			setProgress(p => Math.max(0, p - decrement));
		}, interval);

		return () => clearInterval(timer);
	}, [toast.duration]);

	const handleDismiss = () => {
		setExiting(true);
		setTimeout(onDismiss, 200);
	};

	return (
		<div
			className={cn(
				'toast-item',
				`toast-${toast.type}`,
				exiting && 'toast-exit'
			)}
			style={{ '--toast-delay': `${index * 0.05}s` } as React.CSSProperties}
		>
			<div className="toast-icon">
				<Icon className="w-5 h-5" />
			</div>
			<div className="toast-content">
				<p className="toast-title">{toast.title}</p>
				{toast.message && <p className="toast-message">{toast.message}</p>}
				{toast.action && (
					<button onClick={toast.action.onClick} className="toast-action">
						{toast.action.label}
					</button>
				)}
			</div>
			{toast.dismissible && (
				<button onClick={handleDismiss} className="toast-dismiss">
					<X className="w-4 h-4" />
				</button>
			)}
			{toast.duration && toast.duration > 0 && (
				<div className="toast-progress">
					<div className="toast-progress-bar" style={{ width: `${progress}%` }} />
				</div>
			)}
		</div>
	);
}
