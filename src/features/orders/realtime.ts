import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { envConfig } from '@/envloader';
import { socketHandshakeAuth } from '@/lib/storage';

/** Order lifecycle events the backend pushes to `vendor:<id>` rooms. */
export const ORDER_REALTIME_EVENTS = [
  'order:created',
  'order:updated',
  'order:deleted',
  'order:accepted',
  'order:rejected',
  'order:status',
  'settlement:reversal',
] as const;
export type OrderRealtimeEvent = (typeof ORDER_REALTIME_EVENTS)[number];

function socketBaseUrl(): string {
  const raw = envConfig.socketUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return raw.replace(/\/+$/, '');
}

/**
 * Listen to any vendor-room events (refund tickets, settlement batches…).
 * The server derives the vendor room from the access token.
 */
export function useVendorEvents(events: readonly string[], onEvent: (event: string, payload: unknown) => void) {
  const handlerRef = useRef(onEvent);
  const key = events.join(',');
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);
  useEffect(() => {
    const socket: Socket = io(socketBaseUrl(), { transports: ['websocket'], auth: socketHandshakeAuth() });
    for (const event of key.split(',')) {
      socket.on(event, (payload: unknown) => handlerRef.current?.(event, payload));
    }
    return () => {
      socket.disconnect();
    };
  }, [key]);
}

/**
 * Phase 5: live order updates for vendor/staff screens. The server derives
 * the vendor room from the access token, so the hook only needs to know
 * whether to connect. Returns `connected` so callers can fall back to
 * polling while the socket is down.
 */
export function useOrderRealtime(
  enabled: boolean,
  onEvent: (event: OrderRealtimeEvent, payload: unknown) => void,
): { connected: boolean } {
  const handlerRef = useRef(onEvent);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;
    const socket: Socket = io(socketBaseUrl(), {
      transports: ['websocket'],
      auth: socketHandshakeAuth(),
    });
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    for (const event of ORDER_REALTIME_EVENTS) {
      socket.on(event, (payload: unknown) => handlerRef.current?.(event, payload));
    }
    return () => {
      socket.disconnect();
      setConnected(false);
    };
  }, [enabled]);

  return { connected };
}
