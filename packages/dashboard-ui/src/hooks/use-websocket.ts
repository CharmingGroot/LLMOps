/**
 * WebSocket hook for real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ConnectionStatus, WSEvent } from '../types/api.js';

interface UseWebSocketOptions {
  url: string;
  onMessage?: (event: WSEvent) => void;
  reconnectInterval?: number;
}

interface UseWebSocketResult {
  status: ConnectionStatus;
  lastEvent: WSEvent | null;
  reconnect: () => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketResult {
  const { url, onMessage, reconnectInterval = 5000 } = options;
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setStatus('connecting');
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setStatus('connected');
    };

    ws.onmessage = (event) => {
      try {
        const parsed: WSEvent = JSON.parse(event.data);
        setLastEvent(parsed);
        onMessage?.(parsed);
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onclose = () => {
      setStatus('disconnected');
      // Auto reconnect
      reconnectTimerRef.current = setTimeout(connect, reconnectInterval);
    };

    ws.onerror = () => {
      setStatus('error');
    };

    wsRef.current = ws;
  }, [url, onMessage, reconnectInterval]);

  const reconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    wsRef.current?.close();
    connect();
  }, [connect]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  return { status, lastEvent, reconnect };
}
