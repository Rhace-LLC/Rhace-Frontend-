import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { toast } from 'react-toastify';
import { envConfig } from '@/envloader';
import { socketHandshakeAuth } from '@/lib/storage';
import { ordersApi } from '@/features/orders/api/service';
import { hotelServiceApi, type ServiceRequestDto } from '@/services/hotelService.service';

function socketBaseUrl(): string {
  const raw = envConfig.socketUrl || (typeof window !== 'undefined' ? window.location.origin : '');
  return raw.replace(/\/+$/, '');
}

const NEXT: Record<string, { to: 'preparing' | 'ready' | 'served'; label: string }> = {
  queued: { to: 'preparing', label: 'Accept' },
  preparing: { to: 'ready', label: 'Mark ready' },
  ready: { to: 'served', label: 'Mark delivered' },
};

/**
 * Phase 2 live lane board (housekeeping, front desk, concierge, spa).
 * Loads the requests feed and refreshes on `request:created` socket events.
 */
export default function ServiceRequestsQueue({ routeTo }: { routeTo?: string }) {
  const [requests, setRequests] = useState<ServiceRequestDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRequests(await hotelServiceApi.requestsFeed(routeTo));
    } catch {
      toast.error('Could not load service requests.');
    } finally {
      setLoading(false);
    }
  }, [routeTo]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);

  useEffect(() => {
    const socket: Socket = io(socketBaseUrl(), {
      transports: ['websocket'],
      auth: socketHandshakeAuth(),
    });
    socket.on('request:created', () => void loadRef.current());
    socket.on('order:updated', () => void loadRef.current());
    return () => {
      socket.disconnect();
    };
  }, []);

  const advance = async (r: ServiceRequestDto) => {
    const next = NEXT[r.prepStatus];
    if (!next) return;
    try {
      setBusyId(r._id);
      await ordersApi.bumpLine(r.orderId, r._id, next.to);
      await load();
    } catch {
      toast.error('Could not update the request.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <div className="h-32 animate-pulse rounded-res-md bg-res-surface" />;
  }

  if (requests.length === 0) {
    return (
      <p className="type-res-small py-6 text-center font-normal text-res-ink-muted">
        No open requests{routeTo ? ` for ${routeTo.replace('_', ' ')}` : ''}.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {requests
        .filter((r) => r.prepStatus !== 'served')
        .map((r) => (
          <li
            key={r._id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-res-md border border-res-line bg-res-card p-3 shadow-res-low"
          >
            <div className="min-w-0">
              <p className="type-res-body font-semibold text-res-ink">
                {r.quantity}× {r.name}
              </p>
              <p className="type-res-small font-normal text-res-ink-muted">
                {r.guestName ?? 'Guest'}
                {r.prepStatus ? ` · ${r.prepStatus}` : ''}
                {r.notes ? ` · ${r.notes}` : ''}
              </p>
            </div>
            {NEXT[r.prepStatus] && (
              <button
                type="button"
                disabled={busyId === r._id}
                onClick={() => advance(r)}
                className="type-res-small cursor-pointer rounded-full bg-res-brand px-4 py-2 font-semibold text-res-ink-inverted outline-none disabled:opacity-50"
              >
                {NEXT[r.prepStatus].label}
              </button>
            )}
          </li>
        ))}
    </ul>
  );
}
