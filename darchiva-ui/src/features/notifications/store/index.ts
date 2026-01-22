// Notification Store
import { create } from 'zustand';
import type { Toast, Notification, NotificationType } from '../types';

interface NotificationStore {
	toasts: Toast[];
	notifications: Notification[];

	// Toast actions
	addToast: (toast: Omit<Toast, 'id'>) => string;
	removeToast: (id: string) => void;
	clearToasts: () => void;

	// Notification actions
	setNotifications: (notifications: Notification[]) => void;
	markAsRead: (id: string) => void;
	markAllAsRead: () => void;
	removeNotification: (id: string) => void;
	clearAll: () => void;

	// Convenience methods
	success: (title: string, message?: string) => string;
	error: (title: string, message?: string) => string;
	warning: (title: string, message?: string) => string;
	info: (title: string, message?: string) => string;
}

let toastId = 0;
const generateId = () => `toast-${++toastId}-${Date.now()}`;

export const useNotificationStore = create<NotificationStore>((set, get) => ({
	toasts: [],
	notifications: [],

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

	setNotifications: (notifications) => set({ notifications }),

	markAsRead: (id) => {
		set(state => ({
			notifications: state.notifications.map(n =>
				n.id === id ? { ...n, read: true } : n
			),
		}));
	},

	markAllAsRead: () => {
		set(state => ({
			notifications: state.notifications.map(n => ({ ...n, read: true })),
		}));
	},

	removeNotification: (id) => {
		set(state => ({
			notifications: state.notifications.filter(n => n.id !== id),
		}));
	},

	clearAll: () => {
		set({ notifications: [] });
	},

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
