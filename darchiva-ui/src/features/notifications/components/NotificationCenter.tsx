// Notification Center - Warm Archival Theme
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
	Bell, X, CheckCircle2, AlertCircle, AlertTriangle, Info,
	Check, Trash2, ExternalLink, Clock,
} from 'lucide-react';
import { useNotificationStore } from '../store';
import type { Notification, NotificationType } from '../types';

const ICONS: Record<NotificationType, typeof CheckCircle2> = {
	success: CheckCircle2,
	error: AlertCircle,
	warning: AlertTriangle,
	info: Info,
};

interface Props {
	className?: string;
}

export function NotificationCenter({ className }: Props) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const notifications = useNotificationStore(s => s.notifications);
	const markAsRead = useNotificationStore(s => s.markAsRead);
	const markAllAsRead = useNotificationStore(s => s.markAllAsRead);
	const removeNotification = useNotificationStore(s => s.removeNotification);

	const unreadCount = notifications.filter(n => !n.read).length;

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

	return (
		<div ref={ref} className={cn('notif-center', className)}>
			{/* Bell Button */}
			<button
				onClick={() => setOpen(!open)}
				className={cn('notif-bell', open && 'notif-bell-active')}
			>
				<Bell className="w-5 h-5" />
				{unreadCount > 0 && (
					<span className="notif-badge">
						{unreadCount > 99 ? '99+' : unreadCount}
					</span>
				)}
			</button>

			{/* Dropdown */}
			{open && (
				<div className="notif-dropdown">
					{/* Header */}
					<div className="notif-header">
						<h3 className="notif-title">Notifications</h3>
						{unreadCount > 0 && (
							<button onClick={markAllAsRead} className="notif-mark-all">
								<Check className="w-3.5 h-3.5" />
								Mark all read
							</button>
						)}
					</div>

					{/* List */}
					<div className="notif-list">
						{notifications.length === 0 ? (
							<div className="notif-empty">
								<Bell className="w-10 h-10 text-[var(--notif-muted)] mb-2" />
								<p>No notifications</p>
							</div>
						) : (
							notifications.map(notif => (
								<NotificationItem
									key={notif.id}
									notification={notif}
									onRead={() => markAsRead(notif.id)}
									onRemove={() => removeNotification(notif.id)}
									formatTime={formatTime}
								/>
							))
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function NotificationItem({
	notification,
	onRead,
	onRemove,
	formatTime,
}: {
	notification: Notification;
	onRead: () => void;
	onRemove: () => void;
	formatTime: (ts: string) => string;
}) {
	const Icon = ICONS[notification.type];

	const handleClick = () => {
		if (!notification.read) onRead();
		if (notification.link) window.open(notification.link, '_blank');
	};

	return (
		<div
			onClick={handleClick}
			className={cn(
				'notif-item group',
				!notification.read && 'notif-item-unread',
				notification.link && 'cursor-pointer'
			)}
		>
			<div className={cn('notif-icon', `notif-icon-${notification.type}`)}>
				<Icon className="w-4 h-4" />
			</div>
			<div className="notif-content">
				<p className="notif-item-title">{notification.title}</p>
				<p className="notif-item-message">{notification.message}</p>
				<div className="notif-meta">
					<Clock className="w-3 h-3" />
					<span>{formatTime(notification.timestamp)}</span>
					{notification.link && <ExternalLink className="w-3 h-3 ml-2" />}
				</div>
			</div>
			<button
				onClick={e => { e.stopPropagation(); onRemove(); }}
				className="notif-remove"
			>
				<Trash2 className="w-3.5 h-3.5" />
			</button>
			{!notification.read && <div className="notif-unread-dot" />}
		</div>
	);
}
