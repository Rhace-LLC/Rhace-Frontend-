import { useMemo, useState } from 'react';
import { GlassWater, Minus, Package, Plus, Search, UtensilsCrossed } from 'lucide-react';
import {
  useVendorBottleSets,
  useVendorDishes,
  useVendorDrinks,
  type CreateOrderLineInput,
  type OrderItemType,
} from '../index';
import type { AddOnDto } from '@/services/addon.service';
import { money } from '../money';

interface CatalogItem {
  key: string;
  itemType: OrderItemType;
  itemId: string;
  name: string;
  description?: string;
  image?: string;
  category?: string;
  kindLabel: string;
  volume?: string;
  contentsNote?: string;
  unitPrice: number;
  originalPrice?: number;
  addons: AddOnDto[];
}

interface CartLine {
  key: string;
  itemType: OrderItemType;
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  addonIds: string[];
  addonOptions: AddOnDto[];
}

interface OrderBuilderProps {
  vendorId?: string;
  vertical?: string;
  depositCredit?: number;
  submitLabel: string;
  submitting?: boolean;
  onSubmit: (lines: CreateOrderLineInput[], subtotal: number) => void;
}

function categoryName(categoryId: unknown): string {
  return (typeof categoryId === 'object' && (categoryId as { name?: string } | null)?.name) || '';
}

function ItemVisual({ item }: { item: CatalogItem }) {
  const Icon = item.itemType === 'dish' ? UtensilsCrossed : item.itemType === 'drink' ? GlassWater : Package;
  if (item.image) {
    return (
      <img
        src={item.image}
        alt={item.name}
        loading="lazy"
        className="h-20 w-20 shrink-0 rounded-res-sm object-cover"
      />
    );
  }
  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-res-sm bg-res-surface">
      <Icon className="h-6 w-6 text-res-brand" />
    </div>
  );
}

/** Shared catalog + cart used by the reservation pre-order and the table quick-order. */
export function OrderBuilder({
  vendorId,
  vertical,
  depositCredit = 0,
  submitLabel,
  submitting,
  onSubmit,
}: OrderBuilderProps) {
  const dishesQuery = useVendorDishes(vertical === 'restaurant' ? vendorId : undefined);
  const drinksQuery = useVendorDrinks(vendorId);
  const bottleSetsQuery = useVendorBottleSets(vertical === 'club' ? vendorId : undefined);

  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('All');

  const catalog: CatalogItem[] = useMemo(() => {
    const items: CatalogItem[] = [];
    if (vertical === 'restaurant') {
      for (const dish of dishesQuery.data ?? []) {
        const deal = Boolean(dish.discount && dish.discountPrice && dish.discountPrice < dish.price);
        items.push({
          key: `dish:${dish._id}`,
          itemType: 'dish',
          itemId: dish._id,
          name: dish.name,
          description: dish.description,
          image: dish.images?.[0] || dish.coverImage || undefined,
          category: categoryName(dish.categoryId),
          kindLabel: 'Dish',
          unitPrice: deal ? dish.discountPrice! : dish.price,
          originalPrice: deal ? dish.price : undefined,
          addons: dish.addonIds ?? [],
        });
      }
    }
    for (const drink of drinksQuery.data ?? []) {
      const deal = Boolean(drink.discountPrice && drink.discountPrice < drink.price);
      items.push({
        key: `drink:${drink._id}`,
        itemType: 'drink',
        itemId: drink._id,
        name: drink.name,
        description: drink.description,
        image: drink.images?.[0] || undefined,
        category: categoryName(drink.categoryId),
        kindLabel: 'Drink',
        volume: drink.volume,
        unitPrice: deal ? drink.discountPrice! : drink.price,
        originalPrice: deal ? drink.price : undefined,
        addons: drink.addonIds ?? [],
      });
    }
    if (vertical === 'club') {
      for (const set of bottleSetsQuery.data ?? []) {
        const contents = (set.items ?? [])
          .slice(0, 3)
          .map((it) => `${it.quantity ? `${it.quantity}× ` : ''}${it.drinkId?.name ?? 'Drink'}`);
        if ((set.items ?? []).length > 3) contents.push(`+${(set.items ?? []).length - 3} more`);
        items.push({
          key: `bottle_set:${set._id}`,
          itemType: 'bottle_set',
          itemId: set._id,
          name: set.name,
          image: set.image || undefined,
          kindLabel: 'Bottle set',
          contentsNote: contents.length ? contents.join(' · ') : undefined,
          unitPrice: set.setPrice,
          addons: [],
        });
      }
    }
    return items;
  }, [vertical, dishesQuery.data, drinksQuery.data, bottleSetsQuery.data]);

  const kinds = useMemo(() => {
    const seen: string[] = [];
    for (const item of catalog) {
      if (!seen.includes(item.kindLabel)) seen.push(item.kindLabel);
    }
    return seen;
  }, [catalog]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((item) => {
      if (kindFilter !== 'All' && item.kindLabel !== kindFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description ?? '').toLowerCase().includes(q) ||
        (item.category ?? '').toLowerCase().includes(q)
      );
    });
  }, [catalog, kindFilter, query]);

  const loading =
    dishesQuery.isLoading || drinksQuery.isLoading || bottleSetsQuery.isLoading;
  const loadFailed =
    (dishesQuery.isError && vertical === 'restaurant') ||
    drinksQuery.isError ||
    (bottleSetsQuery.isError && vertical === 'club');
  const cartLines = Object.values(cart);

  const lineTotal = (line: CartLine) => {
    const addonTotal = line.addonIds.reduce((sum, id) => {
      const addon = line.addonOptions.find((a) => a._id === id);
      return sum + (addon ? addon.price : 0);
    }, 0);
    return (line.unitPrice + addonTotal) * line.quantity;
  };

  const subtotal = cartLines.reduce((sum, line) => sum + lineTotal(line), 0);

  const addToCart = (item: CatalogItem) =>
    setCart((prev) => {
      const existing = prev[item.key];
      if (existing) return { ...prev, [item.key]: { ...existing, quantity: existing.quantity + 1 } };
      return {
        ...prev,
        [item.key]: {
          key: item.key,
          itemType: item.itemType,
          itemId: item.itemId,
          name: item.name,
          unitPrice: item.unitPrice,
          quantity: 1,
          addonIds: [],
          addonOptions: item.addons,
        },
      };
    });

  const changeQty = (key: string, delta: number) =>
    setCart((prev) => {
      const line = prev[key];
      if (!line) return prev;
      const quantity = line.quantity + delta;
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { ...line, quantity } };
    });

  const toggleAddon = (key: string, addonId: string) =>
    setCart((prev) => {
      const line = prev[key];
      if (!line) return prev;
      const addonIds = line.addonIds.includes(addonId)
        ? line.addonIds.filter((id) => id !== addonId)
        : [...line.addonIds, addonId];
      return { ...prev, [key]: { ...line, addonIds } };
    });

  const handleSubmit = () => {
    const lines: CreateOrderLineInput[] = cartLines.map((line) => ({
      itemType: line.itemType,
      itemId: line.itemId,
      quantity: line.quantity,
      addonIds: line.addonIds,
    }));
    onSubmit(lines, subtotal);
  };

  if (loading) return <div className="mt-6 h-64 animate-pulse rounded-res-lg bg-res-card shadow-res-low" />;

  if (loadFailed) {
    return (
      <div className="mt-6 rounded-res-lg bg-res-card px-6 py-12 text-center shadow-res-low">
        <p className="type-res-h3 text-res-ink">Couldn&apos;t load the menu</p>
        <p className="type-res-small mt-1 text-res-ink-muted">Please try again in a moment.</p>
      </div>
    );
  }

  if (!catalog.length) {
    return (
      <div className="mt-6 rounded-res-lg bg-res-card px-6 py-12 text-center shadow-res-low">
        <p className="type-res-h3 text-res-ink">Nothing to order yet</p>
        <p className="type-res-small mt-1 text-res-ink-muted">
          This venue has no items available to order yet.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid items-start gap-5 lg:grid-cols-[1fr_320px]">
      <section className="rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="type-res-h3 text-res-ink">Menu</h2>
              <p className="type-res-small font-normal text-res-ink-muted">
                {visible.length} item{visible.length === 1 ? '' : 's'}
                {kindFilter !== 'All' ? ` · ${kindFilter}s` : ''}
              </p>
            </div>
            <label className="flex items-center gap-2 rounded-full bg-res-surface px-4 py-2.5">
              <Search className="h-4 w-4 shrink-0 text-res-ink-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the menu…"
                className="type-res-body w-full bg-transparent font-normal text-res-ink outline-none placeholder:text-res-ink-muted md:w-48"
              />
            </label>
          </div>
          {kinds.length > 1 && (
            <div className="hide-scrollbar -mx-1 overflow-x-auto px-1 py-1">
              <div className="flex w-max gap-2">
                {['All', ...kinds].map((kind) => {
                  const isActive = kindFilter === kind;
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => setKindFilter(kind)}
                      aria-pressed={isActive}
                      className={`type-res-small cursor-pointer rounded-full px-4 py-2 whitespace-nowrap transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-res-brand ${
                        isActive
                          ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                          : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
                      }`}
                    >
                      {kind === 'All' ? 'All' : `${kind}s`}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-3">
          {visible.length === 0 ? (
            <div className="rounded-res-md bg-res-surface px-6 py-10 text-center">
              <p className="type-res-h3 text-res-ink">No matches</p>
              <p className="type-res-small mt-1 text-res-ink-muted">
                Nothing matches &quot;{query}&quot; yet.
              </p>
            </div>
          ) : (
            visible.map((item) => {
              const line = cart[item.key];
              return (
                <article
                  key={item.key}
                  className="rounded-res-md border border-res-line bg-res-card p-3 shadow-res-low"
                >
                  <div className="flex items-start gap-3">
                    <ItemVisual item={item} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="type-res-caption font-medium tracking-[0.2px] text-res-ink-muted uppercase">
                          {item.kindLabel}
                          {item.category ? ` · ${item.category}` : ''}
                        </p>
                        {item.volume && (
                          <span className="type-res-caption rounded-full bg-res-surface px-2 py-0.5 font-semibold text-res-ink-muted">
                            {item.volume}
                          </span>
                        )}
                        {item.originalPrice && (
                          <span className="type-res-caption rounded-full bg-res-brand px-2 py-0.5 font-semibold text-res-ink-inverted">
                            Deal
                          </span>
                        )}
                      </div>
                      <h3 className="type-res-body mt-1 line-clamp-1 font-semibold text-res-ink">
                        {item.name}
                      </h3>
                      {(item.description || item.contentsNote) && (
                        <p className="type-res-small mt-0.5 line-clamp-2 font-normal text-res-ink-muted">
                          {item.description || item.contentsNote}
                        </p>
                      )}
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <p className="type-res-body font-semibold text-res-ink">
                          {money(item.unitPrice)}
                        </p>
                        {item.originalPrice && (
                          <p className="type-res-small font-medium text-res-ink-muted line-through">
                            {money(item.originalPrice)}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {line ? (
                        <div className="flex items-center gap-1.5 rounded-full bg-res-surface p-1">
                          <button
                            type="button"
                            onClick={() => changeQty(item.key, -1)}
                            aria-label={`Remove one ${item.name}`}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-res-card text-res-ink shadow-res-low transition-all hover:text-res-brand"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="type-res-body w-5 text-center font-semibold text-res-ink">
                            {line.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => changeQty(item.key, 1)}
                            aria-label={`Add one more ${item.name}`}
                            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-res-brand text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="type-res-small cursor-pointer rounded-full bg-res-brand px-4 py-2 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </div>

                  {item.addons.length > 0 && (
                    <div className="mt-2.5 border-t border-res-line pt-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {item.addons.map((addon) => {
                          const active = line?.addonIds.includes(addon._id) ?? false;
                          return (
                            <button
                              key={addon._id}
                              type="button"
                              disabled={!line}
                              title={line ? `Add ${addon.name}` : 'Add the item first to pick extras'}
                              onClick={() => toggleAddon(item.key, addon._id)}
                              className={`type-res-small cursor-pointer rounded-full px-2.5 py-1 transition-all outline-none focus-visible:ring-2 focus-visible:ring-res-brand disabled:cursor-not-allowed disabled:opacity-40 ${
                                active
                                  ? 'bg-res-brand text-res-ink-inverted shadow-res-low'
                                  : 'bg-res-surface text-res-ink-muted hover:text-res-ink'
                              }`}
                            >
                              {addon.name} +{money(addon.price)}
                            </button>
                          );
                        })}
                      </div>
                      {!line && (
                        <p className="type-res-small mt-1.5 font-normal text-res-ink-muted">
                          Add the item to pick {item.addons.length} extra
                          {item.addons.length === 1 ? '' : 's'}.
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </section>

      <aside className="h-fit rounded-res-lg bg-res-card p-4 shadow-res-low md:p-5 lg:sticky lg:top-24">
        <h2 className="type-res-h3 text-res-ink">Your order</h2>
        {cartLines.length === 0 ? (
          <p className="type-res-small mt-2 font-normal text-res-ink-muted">
            Nothing here yet — tap Add on anything you like.
          </p>
        ) : (
          <ul className="mt-2 rounded-res-md bg-res-surface p-3">
            {cartLines.map((line) => (
              <li
                key={line.key}
                className="type-res-body flex justify-between gap-2 border-b border-res-line py-2 font-normal text-res-ink last:border-0 last:pb-0 first:pt-0"
              >
                <span>
                  <span className="font-semibold">{line.quantity} × </span>
                  {line.name}
                </span>
                <span className="shrink-0 font-semibold">{money(lineTotal(line))}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="type-res-small font-medium text-res-ink-muted">Subtotal</span>
          <span className="type-res-h3 text-res-ink">{money(subtotal)}</span>
        </div>
        {depositCredit > 0 && (
          <p className="type-res-small mt-1.5 rounded-res-sm bg-res-secondary px-3 py-2 font-medium text-res-brand">
            Your {money(depositCredit)} deposit comes off this bill.
          </p>
        )}

        <button
          type="button"
          disabled={!cartLines.length || submitting}
          onClick={handleSubmit}
          className="type-res-body mt-4 w-full cursor-pointer rounded-full bg-res-brand px-4 py-3 font-semibold text-res-ink-inverted shadow-res-low transition-colors hover:bg-res-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Placing…' : submitLabel}
        </button>
      </aside>
    </div>
  );
}
