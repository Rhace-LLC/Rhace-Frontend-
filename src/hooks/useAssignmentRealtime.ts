import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { envConfig } from '@/envloader';

/**
 * Socket.io client for staff ↔ unit assignment events (plan §5.2).
 *
 * The backend broadcasts `assignment:updated` to the `vendor:<id>` room on the
 * ROOT namespace (via `emitToVendor`, the same path order events use), so this
 * hook connects without a namespace suffix and joins through the handshake
 * `auth.vendorId` — the same join logic the gateway applies to every socket.
 */

export interface AssignmentRealtimeMessage {
  action: 'created' | 'released' | 'reassigned' | 'updated' | 'deleted';
  assignmentId?: string;
  unitId?: string;
  staffId?: string;
  date?: string;
  reason?: string;
}

function socketBaseUrl(): string {
  const raw =
    envConfig.socketUrl ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return raw.replace(/\/+$/, '');
}

export function useAssignmentRealtime(
  vendorId: string | undefined,
  onEvent: (message: AssignmentRealtimeMessage) => void,
) {
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!vendorId) return;

    const socket: Socket = io(socketBaseUrl(), {
      transports: ['websocket'],
      auth: { vendorId },
    });

    socket.on('assignment:updated', (payload: unknown) => {
      handlerRef.current?.((payload ?? {}) as AssignmentRealtimeMessage);
    });

    return () => {
      socket.disconnect();
    };
  }, [vendorId]);
}
