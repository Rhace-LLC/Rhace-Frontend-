import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { envConfig } from '@/envloader';
import { floorPlanKeys } from './keys';

/**
 * Socket.io client for the backend `/floor-plan` namespace (D5).
 * Authenticates with `{ vendorId, planId }`; the server joins `vendor:<id>`
 * and `plan:<id>` rooms.
 */

export interface FloorPlanSocketMessage {
  event: string;
  payload: Record<string, unknown> & { floorPlanId?: string };
  at?: string;
}

const FLOOR_PLAN_EVENTS = [
  'reservation:created',
  'reservation:updated',
  'reservation:cancelled',
  'lock:acquired',
  'lock:released',
  'availability:invalidated',
  'unit:updated',
  'unit:created',
  'unit:deleted',
  'plan:updated',
  'structure:updated',
  'structure:created',
  'structure:deleted',
];

function socketBaseUrl(): string {
  const raw =
    envConfig.socketUrl ||
    (typeof window !== 'undefined' ? window.location.origin : '');
  return raw.replace(/\/+$/, '');
}

export function useFloorPlanRealtime(options: {
  vendorId?: string;
  planId?: string;
  onEvent?: (message: FloorPlanSocketMessage) => void;
}) {
  const { vendorId, planId, onEvent } = options;
  const handlerRef = useRef(onEvent);

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!vendorId) return;

    const socket: Socket = io(`${socketBaseUrl()}/floor-plan`, {
      transports: ['websocket'],
      auth: { vendorId, planId },
    });

    FLOOR_PLAN_EVENTS.forEach((event) => {
      socket.on(event, (payload: Record<string, unknown>) => {
        handlerRef.current?.({ event, payload: payload ?? {} });
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [vendorId, planId]);
}

/** Subscribes to floor-plan events and invalidates React Query caches. */
export function useFloorPlanRealtimeInvalidation(vendorId?: string, planId?: string) {
  const queryClient = useQueryClient();

  useFloorPlanRealtime({
    vendorId,
    planId,
    onEvent: (message) => {
      if (!message?.event) return;
      const floorPlanId = message.payload?.floorPlanId;
      if (floorPlanId) {
        queryClient.invalidateQueries({ queryKey: floorPlanKeys.detail(String(floorPlanId)) });
      } else {
        queryClient.invalidateQueries({ queryKey: floorPlanKeys.all });
      }
    },
  });
}
