// (c) Copyright Datacraft, 2026
/**
 * NotificationToaster — shows a sonner toast for each incoming notification.
 *
 * Mount this once near the app root (wiring agent handles placement).
 * It renders nothing visible itself — just orchestrates toasts.
 */
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, ScanLine, Sparkles } from 'lucide-react';

import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationEvent, NotificationEventType } from '@/hooks/useNotifications';

// ---------------------------------------------------------------------------
// Toast config by event type
// ---------------------------------------------------------------------------

const TOAST_DURATION_MS = 5_000;

interface ToastConfig {
  title: string;
  variant: 'default' | 'destructive';
  icon: React.ReactNode;
}

function toastConfig(event: NotificationEventType): ToastConfig {
  switch (event) {
    case 'sla_breach':
      return {
        title: 'SLA Breach',
        variant: 'destructive',
        icon: <AlertTriangle className="h-4 w-4 text-red-400" />,
      };
    case 'exception_raised':
      return {
        title: 'Exception Raised',
        variant: 'destructive',
        icon: <AlertTriangle className="h-4 w-4 text-orange-400" />,
      };
    case 'scan_complete':
      return {
        title: 'Scan Complete',
        variant: 'default',
        icon: <CheckCircle className="h-4 w-4 text-green-400" />,
      };
    case 'batch_status_changed':
      return {
        title: 'Batch Update',
        variant: 'default',
        icon: <ScanLine className="h-4 w-4 text-blue-400" />,
      };
    case 'classification_done':
      return {
        title: 'Classification Done',
        variant: 'default',
        icon: <Sparkles className="h-4 w-4 text-purple-400" />,
      };
    default:
      return {
        title: 'Notification',
        variant: 'default',
        icon: null,
      };
  }
}

function fireToast(notif: NotificationEvent) {
  const { title, variant, icon } = toastConfig(notif.event);
  const message =
    (notif.data?.message as string) ??
    (notif.data?.title as string) ??
    title;

  const opts = {
    duration: TOAST_DURATION_MS,
    icon,
  };

  if (variant === 'destructive') {
    toast.error(message, { ...opts, description: title });
  } else {
    toast(message, { ...opts, description: title });
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationToaster() {
  const { notifications } = useNotifications();

  // Track which notification IDs we have already toasted to avoid duplicates
  // on re-renders.
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (notifications.length === 0) return;

    // The hook prepends new notifications, so index 0 is always the newest.
    const latest = notifications[0];
    if (!seenRef.current.has(latest.id)) {
      seenRef.current.add(latest.id);
      fireToast(latest);
    }
  }, [notifications]);

  // This component renders nothing — toasts are injected into the Sonner
  // <Toaster /> that the wiring agent places in the app root.
  return null;
}

export default NotificationToaster;
