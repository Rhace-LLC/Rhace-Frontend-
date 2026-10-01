import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import {
  Ban,
  GlassWater,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Undo2,
  UtensilsCrossed,
} from 'lucide-react';
import { stockService, type StockItem, type StockItemKind } from '@/services/stock.service';
import { money } from '@/features/orders/money';

function ItemVisual({ item }: { item: StockItem }) {
  if (item.image) {
    return (
      <img
        src={item.image}
        alt={item.name}
        loading="lazy"
        className="h-14 w-14 shrink-0 rounded-res-sm object-cover"
      />
    );
  }
  const Icon =
    item.kind === 'dish' ? UtensilsCrossed : item.kind === 'drink' ? GlassWater : Package;
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-res-sm bg-res-surface">
      <Icon className="h-5 w-5 text-res-brand" />
    </div>
  );
}

/**
 * Stock controller / 86-list. Pulling an item marks it unavailable for ordering
 * and is audited server-side as `item_86`.
 */
export default function Item86Panel({ kinds }: { kinds: StockItemKind[] }) {
  const [items, setItems] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  // `kinds` is a fresh array on every render, so depend on its contents.
  const kindsKey = kinds.join(',');

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await stockService.list(kindsKey.split(',') as StockItemKind[]);
      setItems(res);
    } catch {
      toast.error('Failed to load the menu for 86-ing');
    } finally {
      setIsLoading(false);
    }
  }, [kindsKey]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term) ||
        (item.category ?? '').toLowerCase().includes(term),
    );
  }, [items, search]);

  const unavailable = items.filter((item) => !item.available).length;

  const toggle = async (item: StockItem) => {
    try {
      setBusyId(item.id);
      await stockService.setAvailability(item.kind, item.id, !item.available);
      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, available: !item.available } : entry)),
      );
      toast.success(
        item.available ? `${item.name} is now unavailable` : `${item.name} is available again`,
      );
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
          'Failed to update availability',
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Ban className="h-4 w-4 text-res-brand" />
          <h2 className="type-res-h3 text-res-ink">Availability</h2>
          <span
            className={`type-res-small inline-flex items-center rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${
              unavailable ? 'bg-red-50 text-red-700' : 'bg-res-surface text-res-ink-muted'
            }`}
          >
            {unavailable} unavailable
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 rounded-full bg-res-surface px-4 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-res-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the menu…"
              aria-label="Search menu items"
              className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted md:w-44"
            />
          </label>
          <button
            type="button"
            onClick={() => load()}
            disabled={isLoading}
            aria-label="Refresh menu"
            title="Refresh menu"
            className="type-res-small cursor-pointer rounded-full bg-res-surface p-2.5 font-semibold text-res-ink transition-colors outline-none hover:text-res-brand focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="mt-4">
        {isLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-res-sm bg-res-surface" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-res-md bg-res-surface px-6 py-10 text-center">
            <p className="type-res-h3 text-res-ink">No items found</p>
            <p className="type-res-small mt-1 font-normal text-res-ink-muted">
              Try adjusting the search.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {filtered.map((item) => {
              const busy = busyId === item.id;
              return (
                <li
                  key={`${item.kind}-${item.id}`}
                  className={`flex flex-col gap-3 rounded-res-md border border-res-line bg-res-card p-3 shadow-res-low sm:flex-row sm:items-center ${
                    item.available ? '' : 'opacity-90'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <ItemVisual item={item} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                          {item.kind === 'dish' ? 'Dish' : 'Drink'}
                          {item.category ? ` · ${item.category}` : ''}
                        </p>
                        {item.volume && (
                          <span className="type-res-caption rounded-full bg-res-surface px-2 py-0.5 font-semibold text-res-ink-muted">
                            {item.volume}
                          </span>
                        )}
                      </div>
                      <h3 className="type-res-body mt-0.5 line-clamp-1 font-semibold text-res-ink">
                        {item.name}
                      </h3>
                      {item.description && (
                        <p className="type-res-small mt-0.5 line-clamp-2 font-normal text-res-ink-muted">
                          {item.description}
                        </p>
                      )}
                      {item.price !== undefined && (
                        <p className="type-res-body mt-1 font-semibold text-res-ink">
                          {money(item.price)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2 pl-[68px] sm:pl-0">
                    <span
                      className={`type-res-small inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold whitespace-nowrap ${
                        item.available
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          item.available ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      {item.available ? 'Available' : 'Unavailable'}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggle(item)}
                      title={item.available ? 'Pull off the menu' : 'Put back on the menu'}
                      className={`type-res-small inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-2 font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-50 ${
                        item.available
                          ? 'bg-res-surface text-res-ink hover:text-res-brand'
                          : 'bg-res-brand text-res-ink-inverted shadow-res-low hover:bg-res-brand-hover'
                      }`}
                    >
                      {busy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : item.available ? (
                        <Ban className="h-3.5 w-3.5" />
                      ) : (
                        <Undo2 className="h-3.5 w-3.5" />
                      )}
                      {busy
                        ? 'Saving…'
                        : item.available
                          ? 'Mark unavailable'
                          : 'Mark available'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
