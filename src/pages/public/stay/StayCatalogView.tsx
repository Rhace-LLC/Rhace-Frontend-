import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { money } from '@/features/orders/money';
import { guestStayApi } from '@/services/stay.service';
import type { StayCatalog } from '@/services/hotelService.service';
import type { useStayCart } from '@/features/stay/cart';

type Cart = ReturnType<typeof useStayCart>;

interface Props {
  cart: Cart;
  onCheckout: () => void;
  /** Expand this outlet's menu first (from the hub's In-Room Dining tile). */
  initialOutlet?: string | null;
}

/**
 * Guest catalog: hotel amenities + schedulable experiences, and (Phase 5)
 * the menus of linked outlets that deliver to this room.
 */
const StayCatalogView = ({ cart, onCheckout, initialOutlet }: Props) => {
  const [openOutlet, setOpenOutlet] = useState<string | null>(initialOutlet ?? null);
  const [catalog, setCatalog] = useState<StayCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [slotFor, setSlotFor] = useState<string | null>(null);
  const [slotDate, setSlotDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Array<{ start: string; end: string; remaining: number }>>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    guestStayApi
      .catalog()
      .then(setCatalog)
      .catch(() => toast.error('Could not load the catalog.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!slotFor) return;
    setSlotsLoading(true);
    guestStayApi
      .slots(slotFor, slotDate)
      .then(setSlots)
      .catch(() => toast.error('Could not load slots.'))
      .finally(() => setSlotsLoading(false));
  }, [slotFor, slotDate]);

  if (loading) return <p className="py-8 text-center text-sm text-slate-400">Loading…</p>;
  const hotel = catalog?.sources.find((s) => s.type === 'hotel');
  const outlets = catalog?.sources.filter((s) => s.type === 'outlet') ?? [];
  if (!hotel || (hotel.items.length === 0 && outlets.every((o) => o.items.length === 0))) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        No services available right now.
      </p>
    );
  }

  const items = categoryId ? hotel.items.filter((i) => i.categoryId === categoryId) : hotel.items;
  const noOutletOpen = outlets.length > 0 && outlets.every((o) => !o.open);

  return (
    <div className="space-y-3">
      {noOutletOpen && hotel.items.length > 0 && (
        <p role="status" className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Restaurants aren&apos;t taking room orders right now — hotel amenities and services are still
          available below.
        </p>
      )}
      {outlets.length > 0 && (
        <div className="space-y-2">
          {outlets.map((o) => (
            <div key={o.vendorLink} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">🍽️ {o.outletName}</p>
                  <p className="text-xs text-slate-500">
                    {o.open ? `Open · ${o.etaMins}–${o.etaMins + 10} min to your room` : o.reason || 'Closed'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    o.open ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {o.open ? 'Open' : 'Unavailable'}
                </span>
              </div>
              {o.open && o.items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setOpenOutlet(openOutlet === o.vendorLink ? null : o.vendorLink)}
                  aria-expanded={openOutlet === o.vendorLink}
                  className="mt-2 w-full rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {openOutlet === o.vendorLink ? 'Hide menu' : `View menu · ${o.items.length} dish(es)`}
                </button>
              )}
              {o.open && openOutlet === o.vendorLink && (
                <div className="mt-2 space-y-3">
                  {(o.categories.length ? o.categories : [{ _id: '', name: '' }]).map((cat) => {
                    const dishes = o.categories.length
                      ? o.items.filter((d) => d.categoryId === cat._id)
                      : o.items;
                    const uncategorised = o.categories.length
                      ? o.items.filter((d) => !d.categoryId || !o.categories.some((c) => c._id === d.categoryId))
                      : [];
                    const list = cat._id === o.categories[0]?._id ? [...dishes, ...uncategorised] : dishes;
                    if (list.length === 0) return null;
                    return (
                      <div key={cat._id || 'all'}>
                        {cat.name && (
                          <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                            {cat.name}
                          </p>
                        )}
                        <div className="space-y-1.5">
                          {list.map((dish) => (
                            <div
                              key={dish._id}
                              className="flex items-start justify-between gap-2 rounded-xl bg-slate-50 p-2"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold">{dish.name}</p>
                                {dish.description && (
                                  <p className="line-clamp-2 text-xs text-slate-500">{dish.description}</p>
                                )}
                                <p className="mt-0.5 text-sm font-bold">{money(dish.price)}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  cart.addLine({
                                    itemId: dish._id,
                                    name: dish.name,
                                    price: dish.price,
                                    kind: 'dish',
                                    vendorLink: o.vendorLink,
                                    outletName: o.outletName,
                                  });
                                  toast.success(`Added from ${o.outletName}`);
                                }}
                                aria-label={`Add ${dish.name}, ${money(dish.price)}`}
                                className="shrink-0 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white"
                              >
                                Add
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {hotel.categories.length > 0 && (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategoryId(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
              !categoryId ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}
          >
            All
          </button>
          {hotel.categories.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => setCategoryId(c._id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold ${
                categoryId === c._id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {items.map((item) => (
        <div key={item._id} className="rounded-2xl border border-slate-200 bg-white p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{item.name}</p>
              {item.description && <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>}
              <p className="mt-1 text-sm font-bold">{money(item.price)}</p>
            </div>
            {item.kind === 'amenity' ? (
              <button
                type="button"
                onClick={() =>
                  cart.addLine({
                    itemId: item._id,
                    name: item.name,
                    price: item.price,
                    kind: 'amenity',
                  })
                }
                aria-label={`Add ${item.name}, ${money(item.price)}`}
                className="shrink-0 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white"
              >
                Add
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSlotFor(slotFor === item._id ? null : item._id)}
                className="shrink-0 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white"
              >
                {slotFor === item._id ? 'Close' : 'Pick time'}
              </button>
            )}
          </div>

          {slotFor === item._id && (
            <div className="mt-2 rounded-xl bg-slate-50 p-2">
              <input
                type="date"
                value={slotDate}
                onChange={(e) => e.target.value && setSlotDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
              />
              {slotsLoading ? (
                <p className="py-3 text-center text-xs text-slate-400">Loading slots…</p>
              ) : slots.length === 0 ? (
                <p className="py-3 text-center text-xs text-slate-400">No open slots this day.</p>
              ) : (
                <div className="mt-2 grid grid-cols-3 gap-1.5">
                  {slots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      disabled={s.remaining <= 0}
                      onClick={() => {
                        cart.addLine(
                          {
                            itemId: item._id,
                            name: `${item.name} · ${new Date(s.start).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}`,
                            price: item.price,
                            kind: 'experience',
                            serviceStart: s.start,
                          },
                          1,
                        );
                        setSlotFor(null);
                        toast.success('Added to cart');
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-1 py-1.5 text-[11px] font-semibold disabled:opacity-40"
                    >
                      {new Date(s.start).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {s.remaining} left
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {cart.lines.length > 0 && (
        <button
          type="button"
          onClick={onCheckout}
          className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        >
          Review cart · {money(cart.subtotal)}
        </button>
      )}
    </div>
  );
};

export default StayCatalogView;
