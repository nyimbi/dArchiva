// Notification Store
import { create } from 'zustand';
import type { Notification, NotificationConnectionStatus, Toast } from '../types';

interface NotificationStore {
	toasts: Toast[];
	notifications: Notification[];
	unreadCount: number;
	connectionStatus: NotificationConnectionStatus;

	// Toast actions
	addToast: (toast: Omit<Toast, 'id'>) => string;
	removeToast: (id: string) => void;
	clearToasts: () => void;

	// Notification actions
	setNotifications: (notifications: Notification[]) => void;
	addNotification: (notification: Notification) => void;
	markAsRead: (id: string) => void;
	markAllRead: () => void;
	markAllAsRead: () => void;
	removeNotification: (id: string) => void;
	clearAll: () => void;
	setConnectionStatus: (status: NotificationConnectionStatus) => void;

	// Convenience methods
	success: (title: string, message?: string) => string;
	error: (title: string, message?: string) => string;
	warning: (title: string, message?: string) => string;
	info: (title: string, message?: string) => string;
}

let toastId = 0;
const generateId = () => `toast-${++toastId}-${Date.now()}`;
const withUnreadCount = (notifications: Notification[]) => ({
	notifications,
	unreadCount: notifications.filter(n => !n.read).length,
});

export const useNotificationStore = create<NotificationStore>((set, get) => ({
	toasts: [],
	notifications: [],
	unreadCount: 0,
	connectionStatus: 'disconnected',

	addToast: (toast) => {
		const id = generateId();
		const newToast: Toast = {
			...toast,
			id,
			duration: toast.duration ?? 5000,
			dismissible: toast.dismissible ?? true,
		};
		set(state => ({ toasts: [...state.toasts, newToast] }));

		if (newToast.duration && newToast.duration > 0) {
			setTimeout(() => get().removeToast(id), newToast.duration);
		}
		return id;
	},

	removeToast: (id) => {
		set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
	},

	clearToasts: () => set({ toasts: [] }),

	setNotifications: (notifications) => set(withUnreadCount(notifications)),

	addNotification: (notification) => {
		set(state => withUnreadCount([notification, ...state.notifications]));
	},

	markAsRead: (id) => {
		set(state => withUnreadCount(
			state.notifications.map(n =>
				n.id === id ? { ...n, read: true } : n
			)
		));
	},

	markAllRead: () => set(state => withUnreadCount(
		state.notifications.map(n => ({ ...n, read: true }))
	)),

	markAllAsRead: () => get().markAllRead(),

	removeNotification: (id) => {
		set(state => withUnreadCount(state.notifications.filter(n => n.id !== id)));
	},

	clearAll: () => {
		set(withUnreadCount([]));
	},

	setConnectionStatus: (status) => set({ connectionStatus: status }),

	success: (title, message) => get().addToast({ type: 'success', title, message }),
	error: (title, message) => get().addToast({ type: 'error', title, message, duration: 8000 }),
	warning: (title, message) => get().addToast({ type: 'warning', title, message }),
	info: (title, message) => get().addToast({ type: 'info', title, message }),
}));

// Convenience export for direct usage
export const toast = {
	success: (title: string, message?: string) => useNotificationStore.getState().success(title, message),
	error: (title: string, message?: string) => useNotificationStore.getState().error(title, message),
	warning: (title: string, message?: string) => useNotificationStore.getState().warning(title, message),
	info: (title: string, message?: string) => useNotificationStore.getState().info(title, message),
	dismiss: (id: string) => useNotificationStore.getState().removeToast(id),
	clear: () => useNotificationStore.getState().clearToasts(),
};
