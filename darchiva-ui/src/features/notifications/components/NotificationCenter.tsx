// Notification Center - Warm Archival Theme
import { cn } from '@/lib/utils';
import {
  AlertCircle,AlertTriangle,
  Bell,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Info,
  Trash2
} from 'lucide-react';
import { useEffect,useRef,useState } from 'react';
import {
  useClearAllNotifications,
  useDismissNotification,
  useMarkAllAsRead,
  useMarkAsRead,
  useNotifications,
} from '../api/hooks';
import type { Notification,NotificationType } from '../types';

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

	const { data: notifications = [] } = useNotifications();
	const markAsReadMutation = useMarkAsRead();
	const markAllAsReadMutation = useMarkAllAsRead();
	const dismissMutation = useDismissNotification();
	const clearAllMutation = useClearAllNotifications();

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
						<div className="flex gap-2">
							{unreadCount > 0 && (
								<button
									onClick={() => markAllAsReadMutation.mutate()}
									className="notif-mark-all"
									disabled={markAllAsReadMutation.isPending}
								>
									<Check className="w-3.5 h-3.5" />
									Mark all read
								</button>
							)}
							{notifications.length > 0 && (
								<button
									onClick={() => clearAllMutation.mutate()}
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
									onRead={() => markAsReadMutation.mutate(notif.id)}
									onRemove={() => dismissMutation.mutate(notif.id)}
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
