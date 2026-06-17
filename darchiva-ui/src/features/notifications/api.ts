// Notification Center API hooks
// Re-exports from api/hooks.ts with spec-aligned names
export {
	useNotifications,
	useUnreadCount,
	useMarkAsRead as useMarkRead,
	useMarkAllAsRead as useMarkAllRead,
	useDismissNotification,
	useClearAllNotifications,
} from './api/hooks';
