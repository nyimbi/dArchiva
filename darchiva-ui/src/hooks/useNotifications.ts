// (c) Copyright Datacraft, 2026
/**
 * useNotifications — WebSocket hook for dArchiva real-time notifications.
 *
 * Connects to /ws/notifications, reconnects with exponential backoff (max 30 s),
 * and exposes a local notification list backed by Zustand-compatible local state.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NotificationEventType =
  | 'batch_status_changed'
  | 'sla_breach'
  | 'exception_raised'
  | 'scan_complete'
  | 'classification_done';

export interface NotificationEvent {
  id: string;           // client-generated, for React keys / deduplication
  event: NotificationEventType;
  data: Record<string, unknown>;
  timestamp: string;    // ISO-8601 from server
  read: boolean;
}

interface UseNotificationsReturn {
  notifications: NotificationEvent[];
  unreadCount: number;
  isConnected: boolean;
  markAllRead: () => void;
  clearAll: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_STORED = 20;
const BACKOFF_BASE_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

const WS_BASE_URL: string =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (import.meta as any).env?.VITE_WS_URL ??
  `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

let _idCounter = 0;
function nextId(): string {
  return `notif-${Date.now()}-${++_idCounter}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotifications(): UseNotificationsReturn {
  const { isAuthenticated } = useAuth();

  const wsRef = useRef<WebSocket | null>(null);
  const attemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const [notifications, setNotifications] = useState<NotificationEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const connect = useCallback(() => {
    if (!mountedRef.current || !isAuthenticated) return;

    const token = localStorage.getItem('darchiva_token');
    if (!token) return;

    const url = `${WS_BASE_URL}/ws/notifications`;

    // Token is sent via Sec-WebSocket-Protocol to keep it out of URLs/access logs.
    const ws = new WebSocket(url, token);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      setIsConnected(true);
      attemptsRef.current = 0;

      pingTimerRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send('ping');
      }, 30_000);
    };

    ws.onmessage = (evt) => {
      if (!mountedRef.current) return;
      const raw = evt.data as string;
      if (raw === 'ping') { ws.send('pong'); return; }
      if (raw === 'pong') return;

      try {
        const msg = JSON.parse(raw) as { event: NotificationEventType; data: Record<string, unknown>; timestamp: string };
        const notif: NotificationEvent = {
          id: nextId(),
          event: msg.event,
          data: msg.data ?? {},
          timestamp: msg.timestamp,
          read: false,
        };
        setNotifications((prev) => [notif, ...prev].slice(0, MAX_STORED));
      } catch {
        // malformed payload — ignore
      }
    };

    ws.onerror = () => {
      // onclose fires after onerror, so reconnect logic lives there
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setIsConnected(false);

      if (pingTimerRef.current) {
        clearInterval(pingTimerRef.current);
        pingTimerRef.current = null;
      }

      // Exponential backoff: 1 s, 2 s, 4 s … capped at 30 s
      const delay = Math.min(BACKOFF_BASE_MS * 2 ** attemptsRef.current, BACKOFF_MAX_MS);
      attemptsRef.current += 1;

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    mountedRef.current = true;

    if (isAuthenticated) connect();

    return () => {
      mountedRef.current = false;

      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional unmount
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [isAuthenticated, connect]);

  return { notifications, unreadCount, isConnected, markAllRead, clearAll };
}

export default useNotifications;
