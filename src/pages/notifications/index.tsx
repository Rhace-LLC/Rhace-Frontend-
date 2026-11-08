import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'react-toastify';
import {
  Bell,
  CalendarCheck,
  CheckCheck,
  ChevronRight,
  ShieldCheck,
  Store,
  Trash2,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import {
  PILL_QUIET,
  SegmentedControl,
  SurfaceCard,
  TEXT_ACTION,
} from '@/components/dashboard/res-ui';
import { Skeleton } from '@/components/ui/skeleton';
import { useVendorEvents } from '@/features/orders/realtime';
import { notificationService, type AppNotification } from '@/services/notification.service';

const PAGE_SIZE = 20;

const TYPE_ICON: Record<string, LucideIcon> = {
  RESERVATION: CalendarCheck,
  PAYMENT: Wallet,
  SECURITY: ShieldCheck,
  VENDOR: Store,
  STAFF: Users,
  GENERAL: Bell,
};

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
] as const;
type Filter = (typeof FILTERS)[number]['value'];

function dayLabel(iso?: string): string {
  if (!iso) return 'Earlier';
  const d = new Date(iso);
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

const timeOf = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';

/**
 * Full notification feed for whoever is signed in (vendor, staff or guest):
 * filter, open (marks read and follows the link), delete, mark all read.
 * Refreshes live on `notification:new`.
 */
export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<AppNotification[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  const status = filter === 'unread' ? ('unread' as const) : undefined;

  /** First page (fresh load, filter change, or a live ping). */
  const load = useCallback(async () => {
    try {
      const res = await notificationService.page({ page: 1, limit: PAGE_SIZE, status });
      setItems(res.items);
      setPage(1);
      setPages(res.pages);
      setUnread(res.unread);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useVendorEvents(['notification:new'], () => void load());

  const loadMore = async () => {
    try {
      setLoadingMore(true);
      const res = await notificationService.page({ page: page + 1, limit: PAGE_SIZE, status });
      setItems((prev) => [...prev, ...res.items.filter((n) => !prev.some((p) => p._id === n._id))]);
      setPage(res.page);
      setPages(res.pages);
      setUnread(res.unread);
    } catch {
      toast.error('Could not load more notifications.');
    } finally {
      setLoadingMore(false);
    }
  };

  const open = async (item: AppNotification) => {
    if (item.status === 'unread') {
      setItems((prev) => prev.map((n) => (n._id === item._id ? { ...n, status: 'read' } : n)));
      setUnread((u) => Math.max(0, u - 1));
      notificationService.markRead(item._id).catch(() => undefined);
    }
    if (item.link) navigate(item.link);
  };

  const remove = async (item: AppNotification) => {
    setItems((prev) => prev.filter((n) => n._id !== item._id));
    if (item.status === 'unread') setUnread((u) => Math.max(0, u - 1));
    try {
      await notificationService.remove(item._id);
    } catch {
      toast.error('Could not delete the notification.');
      void load();
    }
  };

  const markAll = async () => {
    setItems((prev) =>
      filter === 'unread' ? [] : prev.map((n) => ({ ...n, status: 'read' as const }))
    );
    setUnread(0);
    try {
      await notificationService.markAllRead();
    } catch {
      toast.error('Could not mark all as read.');
      void load();
    }
  };

  const groups = useMemo(() => {
    const out: { label: string; items: AppNotification[] }[] = [];
    for (const item of items) {
      const label = dayLabel(item.createdAt);
      const last = out[out.length - 1];
      if (last?.label === label) last.items.push(item);
      else out.push({ label, items: [item] });
    }
    return out;
  }, [items]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6 md:px-6">
      <DashboardPageHeader
        title="Notifications"
        subtitle={unread ? `${unread} unread` : 'You are all caught up.'}
        actions={
          unread > 0 ? (
            <button type="button" onClick={() => void markAll()} className={PILL_QUIET}>
              <CheckCheck className="size-4" strokeWidth={1.75} aria-hidden />
              Mark all read
            </button>
          ) : undefined
        }
      />

      <SegmentedControl label="Show" value={filter} onChange={setFilter} options={FILTERS} />

      <SurfaceCard className="p-2 md:p-3">
        {loading ? (
          <div className="space-y-2 p-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-res-md" />
            ))}
          </div>
        ) : failed && items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-14 text-center">
            <p className="type-res-h3 text-res-ink">Couldn&apos;t load notifications</p>
            <button type="button" onClick={() => void load()} className={PILL_QUIET}>
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-full bg-res-surface text-res-brand">
              <Bell className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <p className="type-res-h3 text-res-ink">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="type-res-small max-w-xs font-normal text-res-ink-muted">
              Bookings, payments and team updates land here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <section key={group.label}>
                <h2 className="type-res-caption px-3 pt-2 pb-1 tracking-wider text-res-ink-muted uppercase">
                  {group.label}
                </h2>
                <ul>
                  {group.items.map((item) => {
                    const Icon = TYPE_ICON[item.type] ?? Bell;
                    const isUnread = item.status === 'unread';
                    return (
                      <li key={item._id} className="group relative">
                        <button
                          type="button"
                          onClick={() => void open(item)}
                          className={`flex w-full cursor-pointer items-start gap-3 rounded-res-md py-3 pr-12 pl-3 text-left transition-colors outline-none hover:bg-res-surface focus-visible:ring-2 focus-visible:ring-res-brand ${
                            isUnread ? 'bg-res-secondary/40' : ''
                          }`}
                        >
                          <span
                            aria-hidden
                            className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                              isUnread
                                ? 'bg-res-secondary text-res-brand'
                                : 'bg-res-surface text-res-ink-muted'
                            }`}
                          >
                            <Icon className="size-4.5" strokeWidth={1.75} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span
                                className={`type-res-body truncate text-res-ink ${isUnread ? 'font-semibold' : 'font-normal'}`}
                              >
                                {item.title}
                              </span>
                              {isUnread && (
                                <span className="size-2 shrink-0 rounded-full bg-res-brand">
                                  <span className="sr-only">Unread</span>
                                </span>
                              )}
                            </span>
                            <span className="type-res-small mt-0.5 block font-normal text-res-ink-muted">
                              {item.message}
                            </span>
                            <span className="type-res-caption mt-1 flex items-center gap-1 text-res-ink-muted">
                              {timeOf(item.createdAt)}
                              {item.link && (
                                <>
                                  <span aria-hidden>·</span>
                                  <span className="font-semibold text-res-brand">Open</span>
                                  <ChevronRight className="size-3 text-res-brand" aria-hidden />
                                </>
                              )}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(item)}
                          aria-label={`Delete notification: ${item.title}`}
                          className={`${TEXT_ACTION} absolute top-3 right-2 p-2 opacity-100 hover:text-red-600 md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100`}
                        >
                          <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {page < pages && (
              <div className="flex justify-center pt-1 pb-2">
                <button
                  type="button"
                  disabled={loadingMore}
                  onClick={() => void loadMore()}
                  className={PILL_QUIET}
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </div>
        )}
      </SurfaceCard>
    </div>
  );
}
