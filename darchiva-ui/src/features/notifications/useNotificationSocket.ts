// Real-time WebSocket hook for dArchiva notifications.
//
// Connects to /ws/notifications?token=<bearer> (backend at papermerge/app.py).
// Messages are JSON event envelopes: { event, data, timestamp }.
// Plain-text "ping"/"pong" frames from the keepalive loop are silently ignored.
//
// Reconnects with exponential backoff (1 s → 2 s → … → 30 s max).
// Does not reconnect after component unmount or on code 1008 (policy violation /
// bad token) — waits 10 s then retries so a fresh login can recover.

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificationStore } from './store';
import type { Notification, NotificationConnectionStatus, NotificationType } from './types';

const TOKEN_KEY = 'darchiva_token';

/** Derive the WebSocket base URL.
 *
 * In development the Vite proxy only covers /api, so the WS connection must
 * go directly to the backend.  Set VITE_API_URL=http://localhost:8000 (or
 * whatever the backend port is) and this function converts it to ws://.
 *
 * In production the backend is typically co-located with the frontend, so we
 * derive from window.location.
 */
function getWsBaseUrl(): string {
	const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
	if (apiUrl) {
		return apiUrl.replace(/^http/, 'ws').replace(/\/$/, '');
	}
	const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
	return `${proto}://${window.location.host}`;
}

const EVENT_TYPE_MAP: Record<string, NotificationType> = {
	batch_status_changed: 'batch_complete',
	scan_complete: 'batch_complete',
	classification_done: 'classification_done',
	sla_breach: 'system',
	exception_raised: 'system',
	ocr_complete: 'ocr_complete',
	auto_routing: 'auto_routing',
	expiry_reminder: 'expiry_reminder',
	workflow_triggered: 'workflow_triggered',
	approval_needed: 'approval_needed',
	document_shared: 'document_shared',
	system_alert: 'system_alert',
};

const EVENT_TITLE_MAP: Record<string, string> = {
	batch_status_changed: 'Batch Status Updated',
	scan_complete: 'Scan Complete',
	classification_done: 'Classification Done',
	sla_breach: 'SLA Breach',
	exception_raised: 'Pipeline Error',
	ocr_complete: 'OCR Complete',
	auto_routing: 'Document Auto-Routed',
	expiry_reminder: 'Document Expiry Reminder',
	workflow_triggered: 'Workflow Triggered',
	approval_needed: 'Approval Needed',
	document_shared: 'Document Shared',
	system_alert: 'System Alert',
};

function buildNotification(raw: Record<string, unknown>): Notification {
	const event = typeof raw.event === 'string' ? raw.event : 'system';
	const data = (raw.data ?? {}) as Record<string, unknown>;
	const timestamp =
		typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString();

	const type: NotificationType = EVENT_TYPE_MAP[event] ?? 'system';
	const title =
		EVENT_TITLE_MAP[event] ??
		event.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

	const message =
		typeof data.message === 'string'
			? data.message
			: typeof data.detail === 'string'
				? data.detail
				: title;

	return {
		id:
			typeof raw.id === 'string'
				? raw.id
				: typeof data.id === 'string'
					? data.id
					: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
		type,
		title,
		message,
		timestamp,
		read: false,
		link: typeof data.link === 'string' ? data.link : undefined,
		data: data as { document_id?: string; [key: string]: unknown },
	};
}

interface NotificationSocketState {
	connected: boolean;
	status: NotificationConnectionStatus;
}

export function useNotificationSocket(): NotificationSocketState {
	const queryClient = useQueryClient();
	const wsRef = useRef<WebSocket | null>(null);
	// Reconnect delay in ms; reset to 1000 on each successful open.
	const delayRef = useRef(1000);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Set to true on cleanup so pending retries don't re-open the socket.
	const destroyedRef = useRef(false);
	const [status, setStatus] = useState<NotificationConnectionStatus>('disconnected');

	useEffect(() => {
		destroyedRef.current = false;
		const publishStatus = (nextStatus: NotificationConnectionStatus) => {
			setStatus(nextStatus);
			useNotificationStore.getState().setConnectionStatus(nextStatus);
		};

		function connect(): void {
			if (destroyedRef.current) return;

			const token = localStorage.getItem(TOKEN_KEY);
			if (!token) {
				// Not authenticated yet — retry after a short pause.
				publishStatus('disconnected');
				timerRef.current = setTimeout(connect, 5_000);
				return;
			}

			const wsBase = getWsBaseUrl();
			const url = `${wsBase}/ws/notifications`;

			let ws: WebSocket;
			try {
				// Token via Sec-WebSocket-Protocol to keep it out of URLs/access logs.
				ws = new WebSocket(url, token);
			} catch {
				// URL construction failed (e.g., invalid protocol) — no point retrying.
				publishStatus('disconnected');
				return;
			}
			publishStatus('reconnecting');
			wsRef.current = ws;

			ws.onopen = () => {
				delayRef.current = 1_000; // reset backoff
				publishStatus('connected');
			};

			ws.onmessage = (event) => {
				const text = event.data as string;

				// The keepalive loop sends bare "ping" / "pong" strings — skip them.
				if (text === 'ping' || text === 'pong') return;

				try {
					const raw = JSON.parse(text) as Record<string, unknown>;
					// Also skip any JSON-encoded ping/pong the server may send.
					if (raw.type === 'ping' || raw.type === 'pong') return;

					const notification = buildNotification(raw);
					useNotificationStore.getState().addNotification(notification);

					// Invalidate REST query cache so the NotificationCenter list
					// stays in sync with the new item.
					queryClient.invalidateQueries({ queryKey: ['notifications'] });
				} catch {
					// Non-JSON frame — nothing to do.
				}
			};

			ws.onclose = (evt) => {
				wsRef.current = null;
				if (destroyedRef.current) return;
				publishStatus('reconnecting');

				// 1008 = Policy Violation (server rejected the token).
				// Back off more aggressively to avoid hammering on bad auth.
				const baseDelay =
					evt.code === 1008 ? 10_000 : delayRef.current;

				if (evt.code !== 1008) {
					delayRef.current = Math.min(30_000, delayRef.current * 2);
				}

				timerRef.current = setTimeout(connect, baseDelay);
			};

			ws.onerror = () => {
				// onerror is always followed by onclose — just let close handle retry.
				publishStatus('reconnecting');
				ws.close();
			};
		}

		connect();

		return () => {
			destroyedRef.current = true;
			if (timerRef.current !== null) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			if (wsRef.current) {
				wsRef.current.close();
				wsRef.current = null;
			}
			useNotificationStore.getState().setConnectionStatus('disconnected');
		};
	}, [queryClient]);

	return { connected: status === 'connected', status };
}
