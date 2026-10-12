import { useCallback, useEffect, useState } from 'react';

export interface StayCartLine {
  key: string;
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  kind: 'amenity' | 'experience' | 'dish';
  serviceStart?: string;
  notes?: string;
  /** Phase 5: linked outlet that fulfils this line (absent = hotel service). */
  vendorLink?: string;
  outletName?: string;
}

export interface StayFulfillment {
  mode: 'room' | 'location';
  /** Phase 5: common-area delivery zone (pool, lounge, cabanas). */
  zoneId: string;
  locationLabel: string;
  scheduledFor: string;
}

const cartKey = (stayId: string) => `rhace_stay_cart:${stayId}`;

function loadCart(stayId: string): StayCartLine[] {
  try {
    const raw = localStorage.getItem(cartKey(stayId));
    const parsed = raw ? (JSON.parse(raw) as StayCartLine[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Stay cart holding hotel services and linked-outlet dishes together (the
 * server splits it into one order per fulfilling vendor at checkout).
 * Persisted per stay so reloads and lock/unlock cycles keep it.
 */
export function useStayCart(stayId: string | null) {
  const [lines, setLines] = useState<StayCartLine[]>(() => (stayId ? loadCart(stayId) : []));
  const [fulfillment, setFulfillment] = useState<StayFulfillment>({
    mode: 'room',
    zoneId: '',
    locationLabel: '',
    scheduledFor: '',
  });

  useEffect(() => {
    setLines(stayId ? loadCart(stayId) : []);
  }, [stayId]);

  useEffect(() => {
    if (!stayId) return;
    try {
      localStorage.setItem(cartKey(stayId), JSON.stringify(lines));
    } catch {
      // Storage full/blocked — cart still works in memory.
    }
  }, [stayId, lines]);

  const addLine = useCallback((line: Omit<StayCartLine, 'key' | 'quantity'>, quantity = 1) => {
    const key = `${line.vendorLink ?? 'hotel'}:${line.itemId}:${line.serviceStart ?? ''}`;
    setLines((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { ...line, key, quantity }];
    });
  }, []);

  const updateQty = useCallback((key: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.key !== key)
        : prev.map((l) => (l.key === key ? { ...l, quantity } : l)),
    );
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
  const hasOutletItems = lines.some((l) => Boolean(l.vendorLink));

  return { lines, addLine, updateQty, clear, subtotal, hasOutletItems, fulfillment, setFulfillment };
}
