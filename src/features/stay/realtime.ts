import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { envConfig } from '@/envloader';
import { getGuestToken } from '@/services/stay.service';

function socketBaseUrl(): string {
  const raw = envConfig.socketUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return raw.replace(/\/+$/, '');
}

export type GuestRealtimeEvent =
  | 'folio:updated'
  | 'order:created'
  | 'order:updated'
  | 'order:accepted'
  | 'order:rejected'
  | 'order:status'
  | 'stay:credit-limit';

/**
 * Guest realtime: the stay socket joins `stay:<stayId>` (server-side from the
 * guest JWT) and refreshes the bill/orders on folio and order events. The
 * callback receives the event name and payload so the hub can tell the
 * guest when a restaurant confirms or declines.
 */
export function useGuestRealtime(onEvent: (event: GuestRealtimeEvent, payload: unknown) => void) {
  const handlerRef = useRef(onEvent);
  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    const token = getGuestToken();
    if (!token) return;
    const socket: Socket = io(socketBaseUrl(), {
      transports: ['websocket'],
      auth: { token },
    });
    const events: GuestRealtimeEvent[] = [
      'folio:updated',
      'order:created',
      'order:updated',
      'order:accepted',
      'order:rejected',
      'order:status',
      'stay:credit-limit',
    ];
    for (const event of events) {
      socket.on(event, (payload: unknown) => handlerRef.current(event, payload));
    }
    socket.on('stay:closed', () => {
      try {
        sessionStorage.removeItem('rhace_guest_token');
      } catch {
        // ignore
      }
      window.location.reload();
    });
    return () => {
      socket.disconnect();
    };
  }, []);
}
