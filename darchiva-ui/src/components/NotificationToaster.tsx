// (c) Copyright Datacraft, 2026
/**
 * NotificationToaster — shows queued Sonner toasts for live notification-store items.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Bell,
  CheckCircle,
  GitBranch,
  ScanLine,
  Share2,
  X,
} from 'lucide-react';
import type { ComponentType } from 'react';

import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/features/notifications/store';
import type { Notification, NotificationType } from '@/features/notifications/types';

const MAX_VISIBLE_TOASTS = 4;

type ToastSeverity = 'info' | 'warning' | 'error';

interface ToastMeta {
  Icon: ComponentType<{ className?: string }>;
  iconClassName: string;
  severity: ToastSeverity;
}

const TYPE_META: Partial<Record<NotificationType, ToastMeta>> = {
  ocr_complete: {
    Icon: ScanLine,
    iconClassName: 'bg-emerald-500/10 text-emerald-400',
    severity: 'info',
  },
  workflow_triggered: {
    Icon: GitBranch,
    iconClassName: 'bg-blue-500/10 text-blue-400',
    severity: 'info',
  },
  approval_needed: {
    Icon: CheckCircle,
    iconClassName: 'bg-amber-500/10 text-amber-400',
    severity: 'warning',
  },
  document_shared: {
    Icon: Share2,
    iconClassName: 'bg-purple-500/10 text-purple-400',
    severity: 'info',
  },
  system_alert: {
    Icon: AlertTriangle,
    iconClassName: 'bg-red-500/10 text-red-400',
    severity: 'error',
  },
  error: {
    Icon: AlertTriangle,
    iconClassName: 'bg-red-500/10 text-red-400',
    severity: 'error',
  },
  warning: {
    Icon: AlertTriangle,
    iconClassName: 'bg-amber-500/10 text-amber-400',
    severity: 'warning',
  },
};

const DEFAULT_META: ToastMeta = {
  Icon: Bell,
  iconClassName: 'bg-slate-500/10 text-slate-400',
  severity: 'info',
};

function getToastMeta(type: NotificationType): ToastMeta {
  return TYPE_META[type] ?? DEFAULT_META;
}

function getDuration(severity: ToastSeverity): number {
  if (severity === 'error') return Number.POSITIVE_INFINITY;
  if (severity === 'warning') return 8_000;
  return 5_000;
}

function getNotificationHref(notification: Notification): string | undefined {
  const documentId = notification.data?.document_id;
  if (typeof documentId === 'string' && documentId.length > 0) {
    return `/documents?nodeId=${encodeURIComponent(documentId)}`;
  }
  if (notification.link) return notification.link;
  return undefined;
}

function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}

export function NotificationToaster() {
  const notifications = useNotificationStore(s => s.notifications);
  const navigate = useNavigate();
  const seenRef = useRef<Set<string>>(new Set());
  const queueRef = useRef<Notification[]>([]);
  const activeCountRef = useRef(0);

  useEffect(() => {
    const nextItems = notifications
      .filter(notification => !seenRef.current.has(notification.id))
      .reverse();

    if (nextItems.length === 0) return;

    nextItems.forEach(notification => {
      seenRef.current.add(notification.id);
      queueRef.current.push(notification);
    });

    drainQueue();
  }, [notifications, navigate]);

  function openNotification(notification: Notification, toastId: string | number) {
    const href = getNotificationHref(notification);
    if (!href) return;

    toast.dismiss(toastId);
    if (isExternalHref(href)) {
      window.open(href, '_blank', 'noopener,noreferrer');
    } else {
      navigate(href);
    }
  }

  function drainQueue() {
    while (activeCountRef.current < MAX_VISIBLE_TOASTS && queueRef.current.length > 0) {
      const notification = queueRef.current.shift();
      if (!notification) return;
      showToast(notification);
    }
  }

  function releaseToast() {
    activeCountRef.current = Math.max(0, activeCountRef.current - 1);
    drainQueue();
  }

  function showToast(notification: Notification) {
    const meta = getToastMeta(notification.type);
    const duration = getDuration(meta.severity);
    const { Icon } = meta;
    activeCountRef.current += 1;

    toast.custom(
      toastId => (
        <div
          role={getNotificationHref(notification) ? 'button' : 'status'}
          tabIndex={getNotificationHref(notification) ? 0 : -1}
          onClick={() => openNotification(notification, toastId)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openNotification(notification, toastId);
            }
          }}
          className={cn(
            'group flex w-full min-w-80 max-w-sm items-start gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3 text-left shadow-xl',
            getNotificationHref(notification) && 'cursor-pointer hover:border-slate-500'
          )}
        >
          <span className={cn('mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md', meta.iconClassName)}>
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-slate-100">
              {notification.title}
            </span>
            <span className="mt-1 block text-xs leading-5 text-slate-400">
              {notification.message}
            </span>
          </span>
          <button
            type="button"
            className="rounded-md p-1 text-slate-500 opacity-0 transition hover:bg-slate-800 hover:text-slate-200 group-hover:opacity-100"
            aria-label="Dismiss notification"
            onClick={event => {
              event.stopPropagation();
              toast.dismiss(toastId);
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ),
      {
        duration,
        onAutoClose: releaseToast,
        onDismiss: releaseToast,
      }
    );
  }

  return null;
}

export default NotificationToaster;
