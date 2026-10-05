import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { envConfig } from '@/envloader';
import { socketHandshakeAuth } from '@/lib/storage';

/**
 * Socket.io client for staff ↔ unit assignment events (plan §5.2).
 *
 * The backend broadcasts `assignment:updated` to the `vendor:<id>` room on the
 * ROOT namespace (via `emitToVendor`, the same path order events use), so this
 * hook connects without a namespace suffix. Phase 0 (D1): the socket
 * authenticates with the verified access token and the server derives the
 * vendor room from the JWT — client-claimed `vendorId` joins are ignored.
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
      auth: socketHandshakeAuth(),
    });

    socket.on('assignment:updated', (payload: unknown) => {
      handlerRef.current?.((payload ?? {}) as AssignmentRealtimeMessage);
    });

    return () => {
      socket.disconnect();
    };
  }, [vendorId]);
}
