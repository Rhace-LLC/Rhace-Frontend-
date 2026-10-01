import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Bell } from 'lucide-react';
import {
  notificationService,
  type AppNotification,
} from '@/services/notification.service';

const POLL_MS = 45_000;

/**
 * Shared live bell: vendors, staff and signed-in guests. Polls the
 * notification feed, shows a real unread dot, and opens a panel with
 * mark-read behaviour. Token-styled for light headers.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [failed, setFailed] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const res = await notificationService.list(12);
      setItems(res.items);
      setUnread(res.unread);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    load();
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, load]);

  const openItem = async (item: AppNotification) => {
    setOpen(false);
    if (item.status === 'unread') {
      setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, status: 'read' } : n)));
      setUnread((u) => Math.max(0, u - 1));
      try {
        await notificationService.markRead(item._id);
      } catch {
        /* badge already optimistically cleared */
      }
    }
    if (item.link) navigate(item.link);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((n) => ({ ...n, status: 'read' as const })));
    setUnread(0);
    try {
      await notificationService.markAllRead();
    } catch {
      load();
    }
  };

  // The bell itself always renders — a failed feed shows an error state
  // inside the panel instead of making the bell vanish.
  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread > 0 ? `${unread} unread notifications` : 'Notifications'}
        aria-expanded={open}
        className="relative cursor-pointer rounded-full p-2 text-res-ink-muted transition-colors outline-none hover:bg-res-surface hover:text-res-ink focus-visible:ring-2 focus-visible:ring-res-brand"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-res-brand px-1 type-res-caption font-semibold text-res-ink-inverted">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-res-md border border-res-line bg-res-card shadow-res-high">
          <div className="flex items-center justify-between border-b border-res-line px-4 py-3">
            <p className="type-res-h3 text-res-ink">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAll}
                className="type-res-small cursor-pointer font-semibold text-res-brand hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {failed && items.length === 0 ? (
              <li className="px-4 py-8 text-center">
                <p className="type-res-h3 text-res-ink">Couldn&apos;t load notifications</p>
                <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                  Check your connection and try again.
                </p>
              </li>
            ) : items.length === 0 ? (
              <li className="px-4 py-8 text-center">
                <p className="type-res-h3 text-res-ink">All caught up</p>
                <p className="type-res-small mt-1 font-normal text-res-ink-muted">
                  Bookings, payments and team updates land here.
                </p>
              </li>
            ) : (
              items.map((item) => (
                <li key={item._id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={`flex w-full cursor-pointer items-start gap-2.5 px-4 py-3 text-left transition-colors hover:bg-res-surface ${
                      item.status === 'unread' ? 'bg-res-surface/60' : ''
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        item.status === 'unread' ? 'bg-res-brand' : 'bg-res-line'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="type-res-body block font-semibold text-res-ink">
                        {item.title}
                      </span>
                      <span className="type-res-small mt-0.5 line-clamp-2 block font-normal text-res-ink-muted">
                        {item.message}
                      </span>
                      {item.createdAt && (
                        <span className="type-res-small mt-0.5 block font-normal text-res-ink-muted">
                          {new Date(item.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
