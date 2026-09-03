import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import io, { type Socket } from 'socket.io-client';

type SocketEvent = string;
type SocketPayload = unknown;

interface WebSocketContextValue {
  connected: boolean;
  sendMessage: (type: SocketEvent, payload: SocketPayload) => void;
  subscribe: (type: SocketEvent, handler: (payload: SocketPayload) => void) => void;
  unsubscribe: (type: SocketEvent) => void;
}

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export const useWebSocket = (): WebSocketContextValue => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used within a WebSocketProvider');
  return ctx;
};

export const WebSocketProvider = ({ url, children }: { url?: string; children: ReactNode }) => {
  const socket = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const listeners = useRef(new Map<string, (payload: SocketPayload) => void>());

  useEffect(() => {
    socket.current = io(url);

    socket.current.on('connect', () => {
      setConnected(true);
      console.log('Socket.IO connected');
    });

    socket.current.on('disconnect', () => {
      setConnected(false);
      console.log('Socket.IO disconnected');
    });

    socket.current.on('report-update', (payload: SocketPayload) => {
      const handler = listeners.current.get('report-update');
      if (handler) {
        console.log('Report update received:', payload);
        handler(payload);
      }
    });

    socket.current.on('payment_update', (payload: SocketPayload) => {
      const handler = listeners.current.get('payment_update');
      if (handler) {
        console.log('Payment update received:', payload);
        handler(payload);
      }
    });

    socket.current.on('paymentUpdate', (payload: SocketPayload) => {
      const handler = listeners.current.get('payment_update');
      if (handler) {
        console.log('Payment update (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('payout_update', (payload: SocketPayload) => {
      const handler = listeners.current.get('payout_update');
      if (handler) {
        console.log('Payout update received:', payload);
        handler(payload);
      }
    });

    socket.current.on('payoutUpdate', (payload: SocketPayload) => {
      const handler = listeners.current.get('payout_update');
      if (handler) {
        console.log('Payout update (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('reservation-updated', (payload: SocketPayload) => {
      const handler = listeners.current.get('reservation-updated');
      if (handler) {
        console.log('Reservation update received:', payload);
        handler(payload);
      }
    });

    socket.current.on('reservationUpdated', (payload: SocketPayload) => {
      const handler = listeners.current.get('reservation-updated');
      if (handler) {
        console.log('Reservation update (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('reservation-created', (payload: SocketPayload) => {
      const handler = listeners.current.get('reservation-created');
      if (handler) {
        console.log('Reservation created received:', payload);
        handler(payload);
      }
    });

    socket.current.on('reservationCreated', (payload: SocketPayload) => {
      const handler = listeners.current.get('reservation-created');
      if (handler) {
        console.log('Reservation created (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('reservation-deleted', (payload: SocketPayload) => {
      const handler = listeners.current.get('reservation-deleted');
      if (handler) {
        console.log('Reservation deleted received:', payload);
        handler(payload);
      }
    });

    socket.current.on('reservationDeleted', (payload: SocketPayload) => {
      const handler = listeners.current.get('reservation-deleted');
      if (handler) {
        console.log('Reservation deleted (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('reservation-counters-updated', (payload: SocketPayload) => {
      const handler = listeners.current.get('reservation-counters-updated');
      if (handler) {
        console.log('Reservation counters updated received:', payload);
        handler(payload);
      }
    });

    socket.current.on('reservationCountersUpdated', (payload: SocketPayload) => {
      const handler = listeners.current.get('reservation-counters-updated');
      if (handler) {
        console.log('Reservation counters updated (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('user-created', (payload: SocketPayload) => {
      const handler = listeners.current.get('user-created');
      if (handler) {
        console.log('User created received:', payload);
        handler(payload);
      }
    });

    socket.current.on('userCreated', (payload: SocketPayload) => {
      const handler = listeners.current.get('user-created');
      if (handler) {
        console.log('User created (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('user-deleted', (payload: SocketPayload) => {
      const handler = listeners.current.get('user-deleted');
      if (handler) {
        console.log('User deleted received:', payload);
        handler(payload);
      }
    });

    socket.current.on('userDeleted', (payload: SocketPayload) => {
      const handler = listeners.current.get('user-deleted');
      if (handler) {
        console.log('User deleted (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('user-updated', (payload: SocketPayload) => {
      const handler = listeners.current.get('user-updated');
      if (handler) {
        console.log('User updated received:', payload);
        handler(payload);
      }
    });

    socket.current.on('userUpdated', (payload: SocketPayload) => {
      const handler = listeners.current.get('user-updated');
      if (handler) {
        console.log('User updated (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('user-count-updated', (payload: SocketPayload) => {
      const handler = listeners.current.get('user-count-updated');
      if (handler) {
        console.log('User count updated received:', payload);
        handler(payload);
      }
    });

    socket.current.on('userCountUpdated', (payload: SocketPayload) => {
      const handler = listeners.current.get('user-count-updated');
      if (handler) {
        console.log('User count updated (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('user-activity', (payload: SocketPayload) => {
      const handler = listeners.current.get('user-activity');
      if (handler) {
        console.log('User activity received:', payload);
        handler(payload);
      }
    });

    socket.current.on('userActivity', (payload: SocketPayload) => {
      const handler = listeners.current.get('user-activity');
      if (handler) {
        console.log('User activity (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('vendor-created', (payload: SocketPayload) => {
      const handler = listeners.current.get('vendor-created');
      if (handler) {
        console.log('Vendor created received:', payload);
        handler(payload);
      }
    });

    socket.current.on('vendorCreated', (payload: SocketPayload) => {
      const handler = listeners.current.get('vendor-created');
      if (handler) {
        console.log('Vendor created (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('vendor-updated', (payload: SocketPayload) => {
      const handler = listeners.current.get('vendor-updated');
      if (handler) {
        console.log('Vendor updated received:', payload);
        handler(payload);
      }
    });

    socket.current.on('vendorUpdated', (payload: SocketPayload) => {
      const handler = listeners.current.get('vendor-updated');
      if (handler) {
        console.log('Vendor updated (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('vendor-deleted', (payload: SocketPayload) => {
      const handler = listeners.current.get('vendor-deleted');
      if (handler) {
        console.log('Vendor deleted received:', payload);
        handler(payload);
      }
    });

    socket.current.on('vendorDeleted', (payload: SocketPayload) => {
      const handler = listeners.current.get('vendor-deleted');
      if (handler) {
        console.log('Vendor deleted (camelCase) received:', payload);
        handler(payload);
      }
    });

    socket.current.on('vendor-earnings-updated', (payload: SocketPayload) => {
      const handler = listeners.current.get('vendor-earnings-updated');
      if (handler) {
        console.log('Vendor earnings updated received:', payload);
        handler(payload);
      }
    });

    socket.current.on('vendorEarningsUpdated', (payload: SocketPayload) => {
      const handler = listeners.current.get('vendor-earnings-updated');
      if (handler) {
        console.log('Vendor earnings updated (camelCase) received:', payload);
        handler(payload);
      }
    });

    // Handle reservation status changed
    socket.current.on('reservation-status-changed', (payload: SocketPayload) => {
      const handler = listeners.current.get('reservation-status-changed');
      if (handler) {
        console.log('Reservation status changed received:', payload);
        handler(payload);
      }
    });

    socket.current.on('reservationStatusChanged', (payload: SocketPayload) => {
      const handler = listeners.current.get('reservation-status-changed');
      if (handler) {
        console.log('Reservation status changed (camelCase) received:', payload);
        handler(payload);
      }
    });

    // Handle payout processed
    socket.current.on('payout-processed', (payload: SocketPayload) => {
      const handler = listeners.current.get('payout-processed');
      if (handler) {
        console.log('Payout processed received:', payload);
        handler(payload);
      }
    });

    socket.current.on('payoutProcessed', (payload: SocketPayload) => {
      const handler = listeners.current.get('payout-processed');
      if (handler) {
        console.log('Payout processed (camelCase) received:', payload);
        handler(payload);
      }
    });

    // Handle payment created
    socket.current.on('payment-created', (payload: SocketPayload) => {
      const handler = listeners.current.get('payment-created');
      if (handler) {
        console.log('Payment created received:', payload);
        handler(payload);
      }
    });

    socket.current.on('paymentCreated', (payload: SocketPayload) => {
      const handler = listeners.current.get('payment-created');
      if (handler) {
        console.log('Payment created (camelCase) received:', payload);
        handler(payload);
      }
    });

    // Handle payment updated
    socket.current.on('payment-updated', (payload: SocketPayload) => {
      const handler = listeners.current.get('payment-updated');
      if (handler) {
        console.log('Payment updated received:', payload);
        handler(payload);
      }
    });

    socket.current.on('paymentUpdated', (payload: SocketPayload) => {
      const handler = listeners.current.get('payment-updated');
      if (handler) {
        console.log('Payment updated (camelCase) received:', payload);
        handler(payload);
      }
    });

    return () => {
      socket.current?.disconnect();
    };
  }, [url]);

  const sendMessage = useCallback(
    (type: SocketEvent, payload: SocketPayload) => {
      if (socket.current && connected) {
        socket.current.emit(type, payload);
      }
    },
    [connected]
  );

  const subscribe = useCallback(
    (type: SocketEvent, handler: (payload: SocketPayload) => void) => {
      listeners.current.set(type, handler);
    },
    []
  );

  const unsubscribe = useCallback((type: SocketEvent) => {
    listeners.current.delete(type);
  }, []);

  return (
    <WebSocketContext.Provider value={{ connected, sendMessage, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
};
