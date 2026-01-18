// Notification Types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: string;
	type: NotificationType;
	title: string;
	message?: string;
	duration?: number; // ms, 0 = no auto-dismiss
	action?: { label: string; onClick: () => void };
	dismissible?: boolean;
}

export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	timestamp: string;
	read: boolean;
	link?: string;
	metadata?: Record<string, unknown>;
}

export interface NotificationState {
	toasts: Toast[];
	notifications: Notification[];
	unreadCount: number;
}
