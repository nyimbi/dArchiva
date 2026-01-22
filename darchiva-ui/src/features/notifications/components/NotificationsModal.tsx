// (c) Copyright Datacraft, 2026
import { X, Bell, Trash2, Check, Clock, ExternalLink, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNotificationStore } from '../store';
import { cn } from '@/lib/utils';
import type { Notification, NotificationType } from '../types';

const ICONS: Record<NotificationType, any> = {
    success: CheckCircle2,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
};

interface NotificationsModalProps {
    onClose: () => void;
}

export function NotificationsModal({ onClose }: NotificationsModalProps) {
    const notifications = useNotificationStore(s => s.notifications);
    const markAsRead = useNotificationStore(s => s.markAsRead);
    const markAllAsRead = useNotificationStore(s => s.markAllAsRead);
    const removeNotification = useNotificationStore(s => s.removeNotification);
    const clearAll = useNotificationStore(s => s.clearAll);

    const unreadCount = notifications.filter(n => !n.read).length;

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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-brass-500/10 flex items-center justify-center text-brass-400">
                            <Bell className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-display font-semibold text-slate-100">Notifications</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Stay updated with your activities</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Toolbar */}
                <div className="px-6 py-3 bg-slate-900/30 border-b border-slate-800/50 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {notifications.length} Total • {unreadCount} Unread
                    </span>
                    <div className="flex items-center gap-4">
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="text-xs text-brass-400 hover:text-brass-300 flex items-center gap-1">
                                <Check className="w-3 h-3" />
                                Mark all read
                            </button>
                        )}
                        {notifications.length > 0 && (
                            <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                                <Trash2 className="w-3 h-3" />
                                Clear all
                            </button>
                        )}
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {notifications.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                            <Bell className="w-12 h-12 mb-4 opacity-20" />
                            <p>No notifications yet</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {notifications.map(notif => (
                                <NotificationItem
                                    key={notif.id}
                                    notification={notif}
                                    onRead={() => markAsRead(notif.id)}
                                    onRemove={() => removeNotification(notif.id)}
                                    formatTime={formatTime}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800/50 flex justify-center bg-slate-900/50">
                    <button onClick={onClose} className="btn-ghost text-sm">
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

function NotificationItem({ notification, onRead, onRemove, formatTime }: any) {
    const Icon = ICONS[notification.type as NotificationType] || Info;

    return (
        <div
            onClick={() => !notification.read && onRead()}
            className={cn(
                "group flex items-start gap-4 p-4 rounded-xl transition-all cursor-pointer",
                notification.read ? "hover:bg-slate-800/30" : "bg-brass-500/5 border border-brass-500/10 hover:bg-brass-500/10"
            )}
        >
            <div className={cn(
                "mt-1 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                notification.type === 'success' ? "bg-emerald-500/10 text-emerald-400" :
                    notification.type === 'error' ? "bg-red-500/10 text-red-400" :
                        notification.type === 'warning' ? "bg-orange-500/10 text-orange-400" :
                            "bg-brass-500/10 text-brass-400"
            )}>
                <Icon className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                    <h4 className={cn("text-sm font-medium truncate", notification.read ? "text-slate-300" : "text-slate-100")}>
                        {notification.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1 whitespace-nowrap">
                        <Clock className="w-2.5 h-2.5" />
                        {formatTime(notification.timestamp)}
                    </span>
                </div>
                <p className="mt-1 text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {notification.message}
                </p>
                {notification.link && (
                    <a
                        href={notification.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-[10px] text-brass-400 hover:text-brass-300 font-medium"
                        onClick={e => e.stopPropagation()}
                    >
                        View Details
                        <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                )}
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded-lg text-slate-500 hover:text-red-400 transition-all"
            >
                <Trash2 className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}
