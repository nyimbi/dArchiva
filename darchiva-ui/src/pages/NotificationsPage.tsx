// (c) Copyright Datacraft, 2026
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileWarning,
  GitBranch,
  ScanLine,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { useNotificationStore } from '@/features/notifications';
import type { Notification, NotificationType } from '@/features/notifications';
import { cn } from '@/lib/utils';

type NotificationFilter =
  | 'all'
  | 'unread'
  | 'batch_status_changed'
  | 'sla_breach'
  | 'exception_raised'
  | 'ocr_complete';

type IconComponent = ComponentType<{ className?: string }>;

const FILTERS: Array<{ value: NotificationFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'batch_status_changed', label: 'Batch status' },
  { value: 'sla_breach', label: 'SLA breach' },
  { value: 'exception_raised', label: 'Exceptions' },
  { value: 'ocr_complete', label: 'OCR complete' },
];

const TYPE_META: Partial<Record<NotificationType, { Icon: IconComponent; className: string }>> = {
  batch_status_changed: { Icon: ScanLine, className: 'bg-blue-500/10 text-blue-400' },
  batch_complete: { Icon: ScanLine, className: 'bg-blue-500/10 text-blue-400' },
  sla_breach: { Icon: AlertTriangle, className: 'bg-red-500/10 text-red-400' },
  exception_raised: { Icon: FileWarning, className: 'bg-orange-500/10 text-orange-400' },
  ocr_complete: { Icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-400' },
  classification_done: { Icon: GitBranch, className: 'bg-purple-500/10 text-purple-400' },
  system_alert: { Icon: AlertTriangle, className: 'bg-red-500/10 text-red-400' },
  error: { Icon: AlertTriangle, className: 'bg-red-500/10 text-red-400' },
  warning: { Icon: AlertTriangle, className: 'bg-amber-500/10 text-amber-400' },
  success: { Icon: CheckCircle2, className: 'bg-emerald-500/10 text-emerald-400' },
};

const DEFAULT_META = { Icon: Bell, className: 'bg-slate-500/10 text-slate-400' };

function getNotificationTime(timestamp: string): string {
  try {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  } catch {
    return 'Unknown time';
  }
}

function getNotificationRoute(notification: Notification): string | undefined {
  if (notification.type === 'exception_raised') return '/exception-queue';

  const metadata = notification.metadata ?? {};
  const exceptionId = notification.data?.exception_id ?? metadata.exception_id;
  if (typeof exceptionId === 'string' && exceptionId.length > 0) return '/exception-queue';

  const documentId = notification.data?.document_id ?? metadata.document_id;
  if (typeof documentId === 'string' && documentId.length > 0) {
    return `/documents?nodeId=${encodeURIComponent(documentId)}`;
  }

  return notification.link;
}

function isExternalRoute(route: string): boolean {
  return /^https?:\/\//i.test(route);
}

function matchesFilter(notification: Notification, filter: NotificationFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'unread') return !notification.read;
  if (filter === 'batch_status_changed') {
    return notification.type === 'batch_status_changed' || notification.type === 'batch_complete';
  }
  if (filter === 'sla_breach') {
    return notification.type === 'sla_breach' || notification.title.toLowerCase().includes('sla breach');
  }
  if (filter === 'exception_raised') {
    const title = notification.title.toLowerCase();
    return notification.type === 'exception_raised' || title.includes('exception') || title.includes('pipeline error');
  }
  return notification.type === filter;
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<NotificationFilter>('all');
  const notifications = useNotificationStore(s => s.notifications);
  const unreadCount = useNotificationStore(s => s.unreadCount);
  const markAsRead = useNotificationStore(s => s.markAsRead);
  const markAllRead = useNotificationStore(s => s.markAllRead);

  const filteredNotifications = useMemo(
    () => notifications.filter(notification => matchesFilter(notification, filter)),
    [filter, notifications],
  );

  const handleOpenNotification = (notification: Notification) => {
    if (!notification.read) markAsRead(notification.id);

    const route = getNotificationRoute(notification);
    if (!route) return;
    if (isExternalRoute(route)) {
      window.open(route, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(route);
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-slate-100">Notifications</h1>
          <p className="mt-1 text-sm text-slate-400">
            {notifications.length} total / {unreadCount} unread
          </p>
        </div>
        <button
          type="button"
          onClick={markAllRead}
          disabled={unreadCount === 0}
          className="btn-secondary w-full justify-center sm:w-auto"
        >
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Notification filters">
        {FILTERS.map(item => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass-500',
              filter === item.value
                ? 'border-brass-500/50 bg-brass-500/15 text-brass-300'
                : 'border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-600 hover:text-slate-200',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/70 text-slate-500">
              <Bell className="h-7 w-7" />
            </div>
            <h2 className="font-display text-lg font-semibold text-slate-200">No notifications yet</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Notifications will appear here as events occur
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/70">
            {filteredNotifications.map(notification => {
              const meta = TYPE_META[notification.type] ?? DEFAULT_META;
              const Icon = meta.Icon;
              const message = notification.body ?? notification.message;
              const route = getNotificationRoute(notification);

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleOpenNotification(notification)}
                  className={cn(
                    'flex w-full items-start gap-4 px-4 py-4 text-left transition-colors hover:bg-slate-800/40 sm:px-5',
                    !notification.read && 'bg-brass-500/5',
                    route && 'cursor-pointer',
                  )}
                >
                  <span className={cn('mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', meta.className)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <span className={cn('font-medium', notification.read ? 'text-slate-300' : 'text-slate-100')}>
                        {notification.title}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <Clock className="h-3.5 w-3.5" />
                        {getNotificationTime(notification.timestamp)}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-slate-400">{message}</span>
                  </span>
                  {!notification.read && (
                    <span className="mt-3 h-2.5 w-2.5 shrink-0 rounded-full bg-brass-400" aria-label="Unread" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
