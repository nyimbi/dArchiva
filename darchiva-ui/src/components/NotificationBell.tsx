// (c) Copyright Datacraft, 2026
/**
 * NotificationBell — bell icon with unread badge + dropdown panel.
 *
 * Drop this anywhere in the header area.  Wiring (importing into Header/Sidebar)
 * is handled by the wiring agent.
 */
import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle,
  ScanLine,
  Sparkles,
  Trash2,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

import { useNotifications } from '@/hooks/useNotifications';
import type { NotificationEvent, NotificationEventType } from '@/hooks/useNotifications';

// ---------------------------------------------------------------------------
// Event-type metadata
// ---------------------------------------------------------------------------

interface EventMeta {
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  colour: string; // Tailwind text colour class
}

const EVENT_META: Record<NotificationEventType, EventMeta> = {
  batch_status_changed: {
    label: 'Batch update',
    Icon: ScanLine,
    colour: 'text-blue-400',
  },
  sla_breach: {
    label: 'SLA breach',
    Icon: AlertTriangle,
    colour: 'text-red-400',
  },
  exception_raised: {
    label: 'Exception',
    Icon: AlertTriangle,
    colour: 'text-orange-400',
  },
  scan_complete: {
    label: 'Scan complete',
    Icon: CheckCircle,
    colour: 'text-green-400',
  },
  classification_done: {
    label: 'Classification done',
    Icon: Sparkles,
    colour: 'text-purple-400',
  },
};

function fallbackMeta(event: string): EventMeta {
  return { label: event, Icon: Bell, colour: 'text-zinc-400' };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NotificationItem({
  notif,
  onMarkRead,
}: {
  notif: NotificationEvent;
  onMarkRead: (id: string) => void;
}) {
  const meta = EVENT_META[notif.event] ?? fallbackMeta(notif.event);
  const { Icon, colour, label } = meta;

  const message =
    (notif.data?.message as string) ??
    (notif.data?.title as string) ??
    label;

  const ago = (() => {
    try {
      return formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true });
    } catch {
      return '';
    }
  })();

  return (
    <button
      type="button"
      onClick={() => onMarkRead(notif.id)}
      className={[
        'w-full text-left px-3 py-2.5 flex gap-3 items-start transition-colors',
        'hover:bg-zinc-700/50',
        notif.read ? 'opacity-60' : '',
      ].join(' ')}
    >
      <span className={`mt-0.5 shrink-0 ${colour}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-medium text-zinc-100 truncate">
          {label}
        </span>
        <span className="block text-xs text-zinc-400 line-clamp-2 leading-snug mt-0.5">
          {message}
        </span>
        {ago && (
          <span className="block text-[10px] text-zinc-500 mt-1">{ago}</span>
        )}
      </span>
      {!notif.read && (
        <span className="mt-1.5 shrink-0 h-1.5 w-1.5 rounded-full bg-blue-400" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const { notifications, unreadCount, isConnected, markAllRead, clearAll } =
    useNotifications();

  const [open, setOpen] = useState(false);
  const [localNotifs, setLocalNotifs] = useState(notifications);
  const panelRef = useRef<HTMLDivElement>(null);

  // Keep local copy so we can do optimistic mark-read without mutating the hook
  useEffect(() => {
    setLocalNotifs(notifications);
  }, [notifications]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function handleMarkRead(id: string) {
    setLocalNotifs((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }

  function handleMarkAllRead() {
    markAllRead();
    setLocalNotifs((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleClearAll() {
    clearAll();
    setLocalNotifs([]);
    setOpen(false);
  }

  const displayedUnread = localNotifs.filter((n) => !n.read).length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {displayedUnread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
            {displayedUnread > 99 ? '99+' : displayedUnread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl z-50 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100">Notifications</span>
              {isConnected ? (
                <Wifi className="h-3 w-3 text-green-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-zinc-500" />
              )}
            </div>
            <div className="flex items-center gap-1">
              {localNotifs.length > 0 && (
                <>
                  <button
                    type="button"
                    title="Mark all read"
                    onClick={handleMarkAllRead}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Clear all"
                    onClick={handleClearAll}
                    className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-700 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="overflow-y-auto max-h-[400px] divide-y divide-zinc-700/50">
            {localNotifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-zinc-500">
                No notifications
              </div>
            ) : (
              localNotifs.map((n) => (
                <NotificationItem
                  key={n.id}
                  notif={n}
                  onMarkRead={handleMarkRead}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
