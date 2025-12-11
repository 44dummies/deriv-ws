import { useState, useEffect, useCallback, useRef } from 'react';
import CONFIG from '../config';

interface TradeEvent {
    id: string;
    type: string;
    timestamp: number;
    sessionId: string | null;
    userId: string | null;
    correlationId: string;
    payload: Record<string, unknown>;
}

interface UseEventStreamOptions {
    topics?: string[];
    onEvent?: (event: TradeEvent) => void;
    onError?: (error: Error) => void;
    onConnected?: () => void;
    onDisconnected?: () => void;
}

interface UseEventStreamResult {
    events: TradeEvent[];
    isConnected: boolean;
    error: Error | null;
    reconnect: () => void;
    clearEvents: () => void;
}

/**
 * React hook for consuming Server-Sent Events from the trading engine
 * Replaces WebSocket polling with efficient server push
 */
export function useEventStream(options: UseEventStreamOptions = {}): UseEventStreamResult {
    const {
        topics = ['all'],
        onEvent,
        onError,
        onConnected,
        onDisconnected
    } = options;

    const [events, setEvents] = useState<TradeEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Use refs for callbacks to avoid re-connecting when callbacks change
    const onEventRef = useRef(onEvent);
    onEventRef.current = onEvent;

    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    const onConnectedRef = useRef(onConnected);
    onConnectedRef.current = onConnected;

    const onDisconnectedRef = useRef(onDisconnected);
    onDisconnectedRef.current = onDisconnected;

    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastEventIdRef = useRef<string | null>(null);

    // Stable connection function
    const connect = useCallback(() => {
        // Clean up existing connection
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        const topicsParam = topics.join(',');
        // Include token in URL since EventSource can't send headers
        const token = sessionStorage.getItem('accessToken') || '';
        const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
        const url = `${CONFIG.SERVER_URL}/api/events/stream?topics=${topicsParam}${tokenParam}`;

        const eventSource = new EventSource(url, {
            withCredentials: true
        });
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            console.log('[EventStream] Connected');
            setIsConnected(true);
            setError(null);
            onConnectedRef.current?.();
        };

        eventSource.onerror = (e) => {
            console.error('[EventStream] Error:', e);
            setIsConnected(false);
            const err = new Error('EventStream connection failed');
            setError(err);
            onErrorRef.current?.(err);
            onDisconnectedRef.current?.();

            // Auto-reconnect after 5 seconds
            reconnectTimeoutRef.current = setTimeout(() => {
                console.log('[EventStream] Attempting reconnect...');
                connect();
            }, 5000);
        };

        // Handle connection event
        eventSource.addEventListener('connected', (e: MessageEvent) => {
            console.log('[EventStream] Handshake complete:', e.data);
        });

        const safeHandleEvent = (e: MessageEvent) => {
            try {
                const event: TradeEvent = JSON.parse(e.data);
                lastEventIdRef.current = event.id;

                setEvents(prev => {
                    const updated = [...prev, event];
                    return updated.slice(-100);
                });

                onEventRef.current?.(event);
            } catch (err) {
                console.error('[EventStream] Failed to parse event:', err);
            }
        };

        // Handle trade events
        eventSource.addEventListener('trade.executed', safeHandleEvent);
        eventSource.addEventListener('trade.closed', safeHandleEvent);
        // Handle session events
        eventSource.addEventListener('session.started', safeHandleEvent);
        eventSource.addEventListener('session.stopped', safeHandleEvent);
        // Handle notification events
        eventSource.addEventListener('notification.trade', safeHandleEvent);

        // Generic message handler for any event type
        eventSource.onmessage = (e: MessageEvent) => {
            if (e.data.startsWith(':')) return; // Ignore heartbeats
            safeHandleEvent(e);
        };

        // Use JSON.stringify(topics) or join(',') as dependency to ensure value equality checks
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topics.join(',')]);

    const disconnect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
            eventSourceRef.current = null;
        }
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        setIsConnected(false);
    }, []);

    const reconnect = useCallback(() => {
        disconnect();
        connect();
    }, [disconnect, connect]);

    const clearEvents = useCallback(() => {
        setEvents([]);
    }, []);

    // Connect on mount
    useEffect(() => {
        connect();
        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        events,
        isConnected,
        error,
        reconnect,
        clearEvents
    };
}

/**
 * Hook for admin SSE stream (all events)
 */
export function useAdminEventStream(options: Omit<UseEventStreamOptions, 'topics'> = {}) {
    const [events, setEvents] = useState<TradeEvent[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        // Include token in URL since EventSource can't send headers
        const token = sessionStorage.getItem('accessToken') || '';
        const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
        const url = `${CONFIG.SERVER_URL}/api/events/admin-stream${tokenParam}`;
        const eventSource = new EventSource(url, { withCredentials: true });
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setIsConnected(true);
            setError(null);
            options.onConnected?.();
        };

        eventSource.onerror = () => {
            setIsConnected(false);
            setError(new Error('Admin stream connection failed'));
            options.onDisconnected?.();

            reconnectTimeoutRef.current = setTimeout(connect, 5000);
        };

        eventSource.onmessage = (e: MessageEvent) => {
            if (e.data.startsWith(':')) return;
            try {
                const event = JSON.parse(e.data);
                setEvents(prev => [...prev.slice(-99), event]);
                options.onEvent?.(event);
            } catch (err) {
                console.error('[AdminEventStream] Parse error:', err);
            }
        };
    }, [options]);

    useEffect(() => {
        connect();
        return () => {
            eventSourceRef.current?.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [connect]);

    return { events, isConnected, error, reconnect: connect, clearEvents: () => setEvents([]) };
}

export default useEventStream;
