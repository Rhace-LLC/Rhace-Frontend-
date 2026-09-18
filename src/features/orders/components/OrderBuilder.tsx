import { useMemo, useState } from 'react';
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
  unitPrice: number;
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

  const catalog: CatalogItem[] = useMemo(() => {
    const items: CatalogItem[] = [];
    if (vertical === 'restaurant') {
      for (const dish of dishesQuery.data ?? []) {
        items.push({
          key: `dish:${dish._id}`,
          itemType: 'dish',
          itemId: dish._id,
          name: dish.name,
          unitPrice: dish.discount && dish.discountPrice ? dish.discountPrice : dish.price,
          addons: dish.addonIds ?? [],
        });
      }
    }
    for (const drink of drinksQuery.data ?? []) {
      items.push({
        key: `drink:${drink._id}`,
        itemType: 'drink',
        itemId: drink._id,
        name: drink.name,
        unitPrice: drink.discountPrice ?? drink.price,
        addons: drink.addonIds ?? [],
      });
    }
    if (vertical === 'club') {
      for (const set of bottleSetsQuery.data ?? []) {
        items.push({
          key: `bottle_set:${set._id}`,
          itemType: 'bottle_set',
          itemId: set._id,
          name: set.name,
          unitPrice: set.setPrice,
          addons: [],
        });
      }
    }
    return items;
  }, [vertical, dishesQuery.data, drinksQuery.data, bottleSetsQuery.data]);

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

  if (loading) return <div className="mt-6 h-64 animate-pulse rounded-2xl bg-gray-100" />;

  if (loadFailed) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-red-200 bg-red-50 py-16 text-center text-sm text-red-600">
        Could not load the menu. Please try again.
      </div>
    );
  }

  if (!catalog.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-sm text-gray-500">
        This venue has no items available to order yet.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        {catalog.map((item) => {
          const line = cart[item.key];
          return (
            <div key={item.key} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{item.name}</p>
                  <p className="text-xs text-gray-500">{money(item.unitPrice)}</p>
                </div>
                {line ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => changeQty(item.key, -1)}
                      className="h-8 w-8 rounded-lg border border-gray-200 text-gray-700"
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-medium">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => changeQty(item.key, 1)}
                      className="h-8 w-8 rounded-lg border border-gray-200 text-gray-700"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => addToCart(item)}
                    className="rounded-lg bg-[#0A6C6D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#0A6C6D]/90"
                  >
                    Add
                  </button>
                )}
              </div>

              {item.addons.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.addons.map((addon) => {
                    const active = line?.addonIds.includes(addon._id) ?? false;
                    return (
                      <button
                        key={addon._id}
                        type="button"
                        disabled={!line}
                        onClick={() => toggleAddon(item.key, addon._id)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors disabled:opacity-40 ${
                          active
                            ? 'border-[#0A6C6D] bg-[#0A6C6D]/5 text-[#0A6C6D]'
                            : 'border-gray-200 text-gray-600'
                        }`}
                      >
                        {addon.name} +{money(addon.price)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
        <h2 className="text-sm font-semibold text-gray-900">Your order</h2>
        {cartLines.length === 0 ? (
          <p className="mt-2 text-xs text-gray-400">No items yet.</p>
        ) : (
          <ul className="mt-2 divide-y divide-gray-100 text-sm">
            {cartLines.map((line) => (
              <li key={line.key} className="flex justify-between py-2">
                <span className="text-gray-700">
                  {line.quantity} × {line.name}
                </span>
                <span className="font-medium text-gray-900">{money(lineTotal(line))}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 border-t border-gray-100 pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Subtotal</span>
            <span className="font-medium text-gray-900">{money(subtotal)}</span>
          </div>
          {depositCredit > 0 && (
            <p className="mt-1 text-[11px] text-emerald-600">
              Your {money(depositCredit)} deposit will be credited against this bill.
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={!cartLines.length || submitting}
          onClick={handleSubmit}
          className="mt-4 w-full rounded-xl bg-[#0A6C6D] px-4 py-3 text-sm font-medium text-white hover:bg-[#0A6C6D]/90 disabled:opacity-50"
        >
          {submitting ? 'Placing…' : submitLabel}
        </button>
      </aside>
    </div>
  );
}
