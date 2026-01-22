// (c) Copyright Datacraft, 2026
/**
 * WebSocket hook for real-time workflow notifications.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/features/auth/context/AuthContext';

export interface WorkflowNotification {
	event_type: 'approval_created' | 'deadline_reminder' | 'escalation' | 'sla_breach' | 'delegation';
	title: string;
	message: string;
	severity: 'info' | 'warning' | 'error';
	data: Record<string, unknown>;
	timestamp: string;
}

interface UseWorkflowNotificationsOptions {
	/** Callback when a notification is received */
	onNotification?: (notification: WorkflowNotification) => void;
	/** Whether to automatically reconnect on disconnect */
	autoReconnect?: boolean;
	/** Reconnect interval in ms (default: 5000) */
	reconnectInterval?: number;
	/** Maximum reconnection attempts (default: 10) */
	maxReconnectAttempts?: number;
}

interface UseWorkflowNotificationsReturn {
	/** Whether the WebSocket is connected */
	isConnected: boolean;
	/** Last error message */
	error: string | null;
	/** Manually reconnect */
	reconnect: () => void;
	/** Disconnect */
	disconnect: () => void;
	/** Recent notifications (last 50) */
	notifications: WorkflowNotification[];
}

const WS_BASE_URL = import.meta.env.VITE_WS_URL ||
	`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

export function useWorkflowNotifications(
	options: UseWorkflowNotificationsOptions = {},
): UseWorkflowNotificationsReturn {
	const {
		onNotification,
		autoReconnect = true,
		reconnectInterval = 5000,
		maxReconnectAttempts = 10,
	} = options;

	const { user, isAuthenticated } = useAuth();
	const wsRef = useRef<WebSocket | null>(null);
	const reconnectAttemptsRef = useRef(0);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

	const [isConnected, setIsConnected] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);

	const connect = useCallback(() => {
		if (!isAuthenticated || !user) {
			return;
		}

		// Clean up existing connection
		if (wsRef.current) {
			wsRef.current.close();
		}

		try {
			const wsUrl = `${WS_BASE_URL}/ws/workflows/notifications`;
			wsRef.current = new WebSocket(wsUrl);

			wsRef.current.onopen = () => {
				setIsConnected(true);
				setError(null);
				reconnectAttemptsRef.current = 0;

				// Start ping interval to keep connection alive
				pingIntervalRef.current = setInterval(() => {
					if (wsRef.current?.readyState === WebSocket.OPEN) {
						wsRef.current.send('ping');
					}
				}, 30000);
			};

			wsRef.current.onmessage = (event) => {
				if (event.data === 'pong') {
					return; // Ignore pong responses
				}

				try {
					const notification: WorkflowNotification = JSON.parse(event.data);

					// Add to notifications list (keep last 50)
					setNotifications((prev) => {
						const updated = [notification, ...prev].slice(0, 50);
						return updated;
					});

					// Call notification callback
					onNotification?.(notification);
				} catch (e) {
					console.error('Failed to parse WebSocket message:', e);
				}
			};

			wsRef.current.onerror = () => {
				setError('WebSocket connection error');
			};

			wsRef.current.onclose = () => {
				setIsConnected(false);

				// Clear ping interval
				if (pingIntervalRef.current) {
					clearInterval(pingIntervalRef.current);
					pingIntervalRef.current = null;
				}

				// Attempt reconnection if enabled
				if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
					reconnectAttemptsRef.current += 1;
					reconnectTimeoutRef.current = setTimeout(() => {
						connect();
					}, reconnectInterval);
				}
			};
		} catch (e) {
			setError('Failed to create WebSocket connection');
		}
	}, [isAuthenticated, user, onNotification, autoReconnect, reconnectInterval, maxReconnectAttempts]);

	const disconnect = useCallback(() => {
		// Clear reconnection timeout
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		// Clear ping interval
		if (pingIntervalRef.current) {
			clearInterval(pingIntervalRef.current);
			pingIntervalRef.current = null;
		}

		// Close connection
		if (wsRef.current) {
			wsRef.current.close();
			wsRef.current = null;
		}

		setIsConnected(false);
		reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect
	}, [maxReconnectAttempts]);

	const reconnect = useCallback(() => {
		reconnectAttemptsRef.current = 0;
		disconnect();
		connect();
	}, [connect, disconnect]);

	// Connect on mount, disconnect on unmount
	useEffect(() => {
		if (isAuthenticated) {
			connect();
		}

		return () => {
			disconnect();
		};
	}, [isAuthenticated, connect, disconnect]);

	return {
		isConnected,
		error,
		reconnect,
		disconnect,
		notifications,
	};
}

export default useWorkflowNotifications;
