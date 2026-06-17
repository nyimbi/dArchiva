// Notification Types

/** Generic toast/alert types (UI only) */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/** Domain notification types stored in the database */
export type NotificationType =
	| 'expiry_reminder'
	| 'ocr_complete'
	| 'classification_done'
	| 'batch_complete'
	| 'auto_routing'
	| 'system'
	// legacy generic types — kept for backward compat with toast usage
	| 'success'
	| 'error'
	| 'warning'
	| 'info';

export interface Toast {
	id: string;
	type: ToastType;
	title: string;
	message?: string;
	duration?: number; // ms, 0 = no auto-dismiss
	action?: { label: string; onClick: () => void };
	dismissible?: boolean;
}

export interface NotificationData {
	document_id?: string;
	[key: string]: unknown;
}

export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	body?: string;        // alias for message used by newer API responses
	timestamp: string;
	read: boolean;
	link?: string;
	metadata?: Record<string, unknown>;
	data?: NotificationData;
}

export interface NotificationState {
	toasts: Toast[];
	notifications: Notification[];
	unreadCount: number;
}
