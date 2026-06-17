// Notification Center — domain-aware, warm archival theme
import { cn } from '@/lib/utils';
import {
	Bell,
	Check,
	CheckCircle,
	Clock,
	Package,
	Tag,
	Trash2,
	Workflow,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
	useClearAllNotifications,
	useDismissNotification,
	useMarkAllAsRead,
	useMarkAsRead,
	useNotifications,
	useUnreadCount,
} from '../api/hooks';
import type { Notification, NotificationType } from '../types';

// Domain-specific type icons per spec
const TYPE_ICONS: Record<string, typeof Bell> = {
	expiry_reminder: Clock,
	ocr_complete: CheckCircle,
	classification_done: Tag,
	batch_complete: Package,
	auto_routing: Workflow,
	system: Bell,
	// legacy generic types
	success: CheckCircle,
	error: Bell,
	warning: Bell,
	info: Bell,
};

function getIcon(type: NotificationType) {
	return TYPE_ICONS[type] ?? Bell;
}

interface Props {
	className?: string;
}

export function NotificationCenter({ className }: Props) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();

	const { data: notifications = [] } = useNotifications();
	const { data: unreadCount = 0 } = useUnreadCount();
	const markAsReadMutation = useMarkAsRead();
	const markAllAsReadMutation = useMarkAllAsRead();
	const dismissMutation = useDismissNotification();
	const clearAllMutation = useClearAllNotifications();

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
		if (!notif.read) markAsReadMutation.mutate(notif.id);
		// Navigate to document if data.document_id present
		const docId = notif.data?.document_id;
		if (docId) {
			navigate(`/document/${docId}`);
			setOpen(false);
			return;
		}
		if (notif.link) {
			window.open(notif.link, '_blank');
		}
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
						<div className="flex items-center gap-2">
							<h3 className="notif-title">Notifications</h3>
							{unreadCount > 0 && (
								<span className="notif-badge-inline">{unreadCount}</span>
							)}
						</div>
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
								<p>You're all caught up</p>
							</div>
						) : (
							notifications.map(notif => (
								<NotificationItem
									key={notif.id}
									notification={notif}
									onClick={() => handleNotificationClick(notif)}
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
			<div className={cn('notif-icon', `notif-icon-${notification.type}`)}>
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
