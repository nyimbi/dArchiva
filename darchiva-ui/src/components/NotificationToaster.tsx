// (c) Copyright Datacraft, 2026
/**
 * NotificationToaster — shows a sonner toast for each incoming WebSocket notification.
 *
 * Mount once near the app root. Renders nothing visible itself — just orchestrates toasts.
 * Toasts auto-dismiss after 5 s. If the notification carries a document_id or link, a
 * clickable "View" action is included in the toast.
 */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, Info, ScanLine, Sparkles } from 'lucide-react';

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
        icon: <Info className="h-4 w-4 text-slate-400" />,
      };
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationToaster() {
  const { notifications } = useNotifications();
  const navigate = useNavigate();

  // Track which notification IDs we've already toasted to avoid duplicates on re-renders.
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (notifications.length === 0) return;

    // Hook prepends new notifications, so index 0 is always the newest.
    const latest = notifications[0];
    if (seenRef.current.has(latest.id)) return;
    seenRef.current.add(latest.id);

    const { title, variant, icon } = toastConfig(latest.event);
    const message =
      (latest.data?.message as string) ??
      (latest.data?.title as string) ??
      title;

    // Build optional navigation action
    const documentId = latest.data?.document_id as string | undefined;
    const link = latest.data?.link as string | undefined;

    const action = documentId
      ? {
          label: 'View',
          onClick: () => navigate(`/documents?nodeId=${documentId}`),
        }
      : link
      ? {
          label: 'Open',
          onClick: () => window.open(link, '_blank'),
        }
      : undefined;

    const opts = {
      duration: TOAST_DURATION_MS,
      icon,
      ...(action && { action }),
    };

    if (variant === 'destructive') {
      toast.error(message, { ...opts, description: title });
    } else {
      toast(message, { ...opts, description: title });
    }
  }, [notifications, navigate]);

  // Renders nothing — toasts are injected into the Sonner <Toaster /> at the app root.
  return null;
}

export default NotificationToaster;
