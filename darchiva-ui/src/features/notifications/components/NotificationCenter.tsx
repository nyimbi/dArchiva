// Notification Center — domain-aware, warm archival theme
import '../styles/theme.css';
import { cn } from '@/lib/utils';
import {
	AlertTriangle,
	Bell,
	Check,
	CheckCircle,
	Clock,
	GitBranch,
	ScanLine,
	Share2,
	Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
	useClearAllNotifications,
	useDismissNotification,
	useMarkAllAsRead,
	useMarkAsRead,
	useNotifications,
} from '../api/hooks';
import { useNotificationStore } from '../store';
import type { Notification, NotificationType } from '../types';

// Domain-specific type icons per spec
const TYPE_ICONS: Record<string, typeof Bell> = {
	ocr_complete: ScanLine,
	workflow_triggered: GitBranch,
	approval_needed: CheckCircle,
	document_shared: Share2,
	system_alert: AlertTriangle,
	// legacy generic types
	error: AlertTriangle,
	warning: AlertTriangle,
	success: CheckCircle,
};

const TYPE_ICON_CLASSES: Partial<Record<NotificationType, string>> = {
	ocr_complete: 'notif-icon-green',
	workflow_triggered: 'notif-icon-blue',
	approval_needed: 'notif-icon-amber',
	document_shared: 'notif-icon-purple',
	system_alert: 'notif-icon-red',
	error: 'notif-icon-red',
	warning: 'notif-icon-amber',
};

function getIcon(type: NotificationType) {
	return TYPE_ICONS[type] ?? Bell;
}

function getIconClass(type: NotificationType) {
	return TYPE_ICON_CLASSES[type] ?? 'notif-icon-slate';
}

function getNotificationHref(notification: Notification): string | undefined {
	const documentId = notification.data?.document_id;
	if (typeof documentId === 'string' && documentId.length > 0) {
		return `/documents?nodeId=${encodeURIComponent(documentId)}`;
	}
	return notification.link;
}

function isExternalHref(href: string): boolean {
	return /^https?:\/\//i.test(href);
}

function isPersistedNotification(notification: Notification): boolean {
	return !notification.id.startsWith('ws-');
}

interface Props {
	className?: string;
}

export function NotificationCenter({ className }: Props) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	const { data: apiNotifications = [] } = useNotifications();
	const notifications = useNotificationStore(s => s.notifications);
	const unreadCount = useNotificationStore(s => s.unreadCount);
	const setNotifications = useNotificationStore(s => s.setNotifications);
	const markAsRead = useNotificationStore(s => s.markAsRead);
	const markAllRead = useNotificationStore(s => s.markAllRead);
	const removeNotification = useNotificationStore(s => s.removeNotification);
	const clearAll = useNotificationStore(s => s.clearAll);
	const markAsReadMutation = useMarkAsRead();
	const markAllAsReadMutation = useMarkAllAsRead();
	const dismissMutation = useDismissNotification();
	const clearAllMutation = useClearAllNotifications();
	const recentNotifications = notifications.slice(0, 10);

	useEffect(() => {
		setNotifications(apiNotifications);
	}, [apiNotifications, setNotifications]);

	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, []);

	const formatTime = (timestamp: string) => {
		const diff = Date.now() - new Date(timestamp).getTime();
		const mins = Math.floor(diff / 60000);
		if (mins < 1) return 'Just now';
		if (mins < 60) return `${mins}m ago`;
		const hours = Math.floor(mins / 60);
		if (hours < 24) return `${hours}h ago`;
		const days = Math.floor(hours / 24);
		return `${days}d ago`;
	};

	const handleNotificationClick = (notif: Notification) => {
		if (!notif.read) {
			markAsRead(notif.id);
			if (isPersistedNotification(notif)) markAsReadMutation.mutate(notif.id);
		}

		const href = getNotificationHref(notif);
		if (!href) return;
		if (isExternalHref(href)) {
			window.open(href, '_blank', 'noopener,noreferrer');
			setOpen(false);
			return;
		}
		navigate(href);
		setOpen(false);
	};

	const handleMarkAllRead = () => {
		markAllRead();
		markAllAsReadMutation.mutate();
	};

	const handleClearAll = () => {
		clearAll();
		clearAllMutation.mutate();
	};

	return (
		<div ref={ref} className={cn('notif-center', className)}>
			{/* Bell Button */}
			<button
				onClick={() => setOpen(!open)}
				className={cn('notif-bell', open && 'notif-bell-active')}
				aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
			>
				<Bell className="w-5 h-5" />
				{unreadCount > 0 && (
					<span className="notif-badge notif-badge-pulse">
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</button>

			{/* Dropdown */}
			{open && (
				<div className="notif-dropdown">
					{/* Header */}
					<div className="notif-header">
						<div className="flex items-center gap-2">
							<h3 className="notif-title">Notifications</h3>
							{unreadCount > 0 && (
								<span className="notif-badge-inline">{unreadCount}</span>
							)}
						</div>
						<div className="flex gap-2">
							{unreadCount > 0 && (
								<button
									onClick={handleMarkAllRead}
									className="notif-mark-all"
									disabled={markAllAsReadMutation.isPending}
								>
									<Check className="w-3.5 h-3.5" />
									Mark all read
								</button>
							)}
							{notifications.length > 0 && (
								<button
									onClick={handleClearAll}
									className="notif-mark-all"
									disabled={clearAllMutation.isPending}
								>
									<Trash2 className="w-3.5 h-3.5" />
									Clear all
								</button>
							)}
						</div>
					</div>

					{/* List */}
					<div className="notif-list">
						{recentNotifications.length === 0 ? (
							<div className="notif-empty">
								<Bell className="w-10 h-10 text-[var(--notif-muted)] mb-2" />
								<p>You're all caught up</p>
							</div>
						) : (
							recentNotifications.map(notif => (
								<NotificationItem
									key={notif.id}
									notification={notif}
									onClick={() => handleNotificationClick(notif)}
									onRemove={() => {
										removeNotification(notif.id);
										if (isPersistedNotification(notif)) dismissMutation.mutate(notif.id);
									}}
									formatTime={formatTime}
								/>
							))
						)}
					</div>
					<div className="notif-footer">
						<Link to="/inbox" onClick={() => setOpen(false)} className="notif-view-all">
							View all
						</Link>
					</div>
				</div>
			)}
		</div>
	);
}

function NotificationItem({
	notification,
	onClick,
	onRemove,
	formatTime,
}: {
	notification: Notification;
	onClick: () => void;
	onRemove: () => void;
	formatTime: (ts: string) => string;
}) {
	const Icon = getIcon(notification.type);
	const iconClass = getIconClass(notification.type);
	const body = notification.body ?? notification.message;
	const truncatedBody = body.length > 80 ? body.slice(0, 80) + '…' : body;
	const isClickable = !!(notification.data?.document_id ?? notification.link);

	return (
		<div
			onClick={onClick}
			className={cn(
				'notif-item group',
				!notification.read && 'notif-item-unread',
				isClickable && 'cursor-pointer'
			)}
		>
			<div className={cn('notif-icon', iconClass)}>
				<Icon className="w-4 h-4" />
			</div>
			<div className="notif-content">
				<p className="notif-item-title">{notification.title}</p>
				<p className="notif-item-message">{truncatedBody}</p>
				<div className="notif-meta">
					<Clock className="w-3 h-3" />
					<span>{formatTime(notification.timestamp)}</span>
				</div>
			</div>
			<div className="flex flex-col items-end gap-1">
				{!notification.read && <div className="notif-unread-dot" />}
				<button
					onClick={e => { e.stopPropagation(); onRemove(); }}
					className="notif-remove opacity-0 group-hover:opacity-100"
					aria-label="Dismiss notification"
				>
					<Trash2 className="w-3.5 h-3.5" />
				</button>
			</div>
		</div>
	);
}
