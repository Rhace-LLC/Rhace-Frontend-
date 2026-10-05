import axios from 'axios';
import api from '@/lib/axios';
import { envConfig } from '@/envloader';

const GUEST_TOKEN_KEY = 'rhace_guest_token';

export function getGuestToken(): string | null {
  try {
    return sessionStorage.getItem(GUEST_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setGuestToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(GUEST_TOKEN_KEY, token);
    else sessionStorage.removeItem(GUEST_TOKEN_KEY);
  } catch {
    // sessionStorage unavailable (SSR/tests) — guest flow needs a browser.
  }
}

/** Separate axios instance for the guest app: never uses AuthContext tokens. */
export const guestApi = axios.create({
  baseURL: envConfig.apiBaseUrl?.includes('localhost')
    ? envConfig.apiBaseUrl.replace('https://', 'http://')
    : envConfig.apiBaseUrl,
});

guestApi.interceptors.request.use((config) => {
  const token = getGuestToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } & T;
  return (body?.data ?? body) as T;
};

export interface ResolvedRoom {
  hotelVendor: string;
  unitId: string;
  roomLabel: string;
  hotelName: string;
  hasActiveStay: boolean;
  challenge: Array<'lastName' | 'pin'>;
  guestOrderingEnabled: boolean;
}

export interface ChallengeResult {
  token: string;
  stayId: string;
  expiresAt: string;
}

export interface GuestMe {
  stayId: string;
  roomUnitId: string;
  firstName: string;
  creditLimit: number;
  checkoutAt: string | null;
}

export interface GuestOrderingSettings {
  enabled: boolean;
  challengeMode: 'lastName' | 'pin' | 'either';
  defaultCreditLimit: number;
  acceptanceTimeoutMins: number;
}

export interface StayDto {
  _id: string;
  guestName: string;
  status: 'active' | 'closed';
  unitId: string;
  reservation: string;
  creditLimit: number;
  checkedInAt: string;
}

export interface RoomQr {
  unitId: string;
  label: string;
  token: string;
  path: string;
}

export interface StayCheckoutInput {
  items: Array<{
    itemType: string;
    itemId: string;
    quantity?: number;
    notes?: string;
    serviceStart?: string;
    /** Phase 5: linked outlet that fulfils this line (absent = hotel). */
    vendorLink?: string;
  }>;
  fulfillment: {
    mode: 'room' | 'location';
    zoneId?: string;
    locationLabel?: string;
    scheduledFor?: string;
  };
  /** Staff desk only — the guest checkout ignores client fees. */
  fees?: Array<{ label: string; amount: number }>;
  paymentMethod: 'room' | 'online';
  idempotencyKey: string;
}

export interface StayCheckoutOrderSummary {
  orderId: string;
  vendor: string;
  vendorLink: string | null;
  outletName: string | null;
  status: string;
  total: number;
  settlementMethod: string | null;
}

export interface StayCheckoutResult {
  /** First order (back-compat for single-order flows). */
  orderId: string;
  folioEntryId?: string;
  total: number;
  balance?: number | null;
  availableCredit?: number | null;
  /** Phase 5: one order per fulfilling vendor. */
  cart?: string;
  orders?: StayCheckoutOrderSummary[];
}

export interface PaymentIntent {
  authorization_url: string;
  ref: string;
  paymentId: string;
  amount: number;
}

export interface StayLocation {
  _id: string;
  name: string;
  allowsScheduled: boolean;
  vendorLinks: string[];
}

export interface FolioEntryDto {
  _id: string;
  type: 'charge' | 'fee' | 'payment' | 'adjustment' | 'reversal';
  status: 'draft' | 'posted' | 'voided';
  amount: number;
  revenueCode: string;
  description?: string;
  postedAt?: string | null;
  createdAt?: string;
}

export interface StayFolio {
  folio: {
    _id: string;
    status: 'open' | 'settling' | 'closed';
    creditLimit: number;
  } | null;
  entries: FolioEntryDto[];
  totals: {
    postedCharges: number;
    draftCharges: number;
    postedPayments: number;
    balance: number;
    availableCredit: number;
  } | null;
}

/** Guest (unauthenticated + session) endpoints. */
export const guestStayApi = {
  async resolve(roomToken: string): Promise<ResolvedRoom> {
    const res = await guestApi.get(`/stay/resolve/${roomToken}`);
    return unwrap<ResolvedRoom>(res);
  },
  async challenge(input: {
    roomToken: string;
    lastName?: string;
    pin?: string;
    deviceLabel?: string;
  }): Promise<ChallengeResult> {
    const res = await guestApi.post('/stay/challenge', input);
    return unwrap<ChallengeResult>(res);
  },
  async me(): Promise<GuestMe> {
    const res = await guestApi.get('/stay/me');
    return unwrap<GuestMe>(res);
  },
  async logout(): Promise<void> {
    try {
      await guestApi.post('/stay/logout');
    } finally {
      setGuestToken(null);
    }
  },
  async catalog(): Promise<import('./hotelService.service').StayCatalog> {
    const res = await guestApi.get('/stay/catalog');
    return unwrap<import('./hotelService.service').StayCatalog>(res);
  },
  async slots(serviceItemId: string, date: string) {
    const res = await guestApi.get(`/stay/slots/${serviceItemId}`, { params: { date } });
    return unwrap<import('./hotelService.service').SlotDto[]>(res);
  },
  /** Phase 5: common-area delivery locations (pool, lounge, cabanas). */
  async locations(): Promise<StayLocation[]> {
    const res = await guestApi.get('/stay/locations');
    return unwrap<StayLocation[]>(res);
  },
  async checkout(input: StayCheckoutInput): Promise<StayCheckoutResult> {
    const res = await guestApi.post('/stay/checkout', input);
    return unwrap<StayCheckoutResult>(res);
  },
  async folio(): Promise<StayFolio> {
    const res = await guestApi.get('/stay/folio');
    return unwrap<StayFolio>(res);
  },
  async orders(): Promise<import('@/features/orders/types').OrderDto[]> {
    const res = await guestApi.get('/stay/orders');
    return unwrap<import('@/features/orders/types').OrderDto[]>(res);
  },
  /** Phase 6: pay an online cart (hotel + outlets, one split payment). */
  async cartIntent(cart: string, roomToken: string): Promise<PaymentIntent> {
    const res = await guestApi.post('/stay/payments/cart-intent', { cart, roomToken });
    return unwrap<PaymentIntent>(res);
  },
  /** Phase 6: settle (part of) the room tab online; omit amount for the full balance. */
  async folioPay(roomToken: string, amount?: number): Promise<PaymentIntent> {
    const res = await guestApi.post('/stay/folio/pay', { roomToken, ...(amount ? { amount } : {}) });
    return unwrap<PaymentIntent>(res);
  },
  /** Phase 6: confirm a Paystack return now (does not wait for the webhook). */
  async verifyPayment(reference: string): Promise<{ status: string; alreadyProcessed: boolean }> {
    const res = await guestApi.post('/stay/payments/verify', { reference });
    return unwrap<{ status: string; alreadyProcessed: boolean }>(res);
  },
  async orderIntent(
    orderId: string,
    roomToken: string,
  ): Promise<{ authorization_url: string; ref: string; paymentId: string; amount: number }> {
    const res = await guestApi.post(`/stay/orders/${orderId}/intent`, { roomToken });
    return unwrap<{ authorization_url: string; ref: string; paymentId: string; amount: number }>(res);
  },
};

/** Staff/vendor endpoints (main authenticated api). */
class StayService {
  async listStays(status?: 'active' | 'closed'): Promise<StayDto[]> {
    const res = await api.get('/stay/stays', { params: status ? { status } : undefined });
    return unwrap<StayDto[]>(res);
  }
  async resetPin(reservationId: string): Promise<{ stayId: string; pin: string }> {
    const res = await api.post(`/stay/reservations/${reservationId}/pin/reset`);
    return unwrap<{ stayId: string; pin: string }>(res);
  }
  async setCreditLimit(stayId: string, creditLimit: number): Promise<StayDto> {
    const res = await api.patch(`/stay/stays/${stayId}/credit-limit`, { creditLimit });
    return unwrap<StayDto>(res);
  }
  async getSettings(): Promise<GuestOrderingSettings> {
    const res = await api.get('/stay/settings');
    return unwrap<GuestOrderingSettings>(res);
  }
  async updateSettings(patch: Partial<GuestOrderingSettings>): Promise<GuestOrderingSettings> {
    const res = await api.patch('/stay/settings', patch);
    return unwrap<GuestOrderingSettings>(res);
  }
  async mintRoomQr(unitId: string): Promise<RoomQr> {
    const res = await api.post('/stay/qr/mint', { unitId });
    return unwrap<RoomQr>(res);
  }
  async bulkRoomQr(floorPlanId: string): Promise<RoomQr[]> {
    const res = await api.post('/stay/qr/bulk', { floorPlanId });
    return unwrap<RoomQr[]>(res);
  }
  async rotateRoomQr(unitId: string): Promise<RoomQr & { qrVersion: number }> {
    const res = await api.post(`/stay/qr/rotate/${unitId}`);
    return unwrap<RoomQr & { qrVersion: number }>(res);
  }
  /** Staff: folio detail for a stay (front-desk panel). */
  async folioForStay(stayId: string): Promise<StayFolio> {
    const res = await api.get(`/folios/stay/${stayId}`);
    return unwrap<StayFolio>(res);
  }
  /** Staff: post a charge-to-room order to a stay's folio. */
  async staffCheckout(
    stayId: string,
    input: Omit<StayCheckoutInput, 'paymentMethod'> & { guestName?: string },
  ): Promise<StayCheckoutResult> {
    const res = await api.post(`/folios/stay/${stayId}/checkout`, {
      ...input,
      idempotencyKey: input.idempotencyKey || `desk-${stayId}-${Date.now()}`,
    });
    return unwrap<StayCheckoutResult>(res);
  }
  async voidFolioEntry(folioId: string, entryId: string, reason: string) {
    const res = await api.post(`/folios/${folioId}/entries/${entryId}/void`, { reason });
    return unwrap<unknown>(res);
  }
  async manualFolioEntry(folioId: string, input: { amount: number; description: string }) {
    const res = await api.post(`/folios/${folioId}/entries`, input);
    return unwrap<unknown>(res);
  }
  async folioPayment(folioId: string, input: { amount: number; method: string; reference?: string }) {
    const res = await api.post(`/folios/${folioId}/payments`, input);
    return unwrap<unknown>(res);
  }
  /** Phase 6: Paystack link the guest can use to settle the room tab. */
  async folioPayLink(folioId: string, amount?: number): Promise<PaymentIntent> {
    const res = await api.post(`/folios/${folioId}/pay-link`, amount ? { amount } : {});
    return unwrap<PaymentIntent>(res);
  }
  async closeFolio(folioId: string, allowOpenBalance = false) {
    const res = await api.post(`/folios/${folioId}/close`, { allowOpenBalance });
    return unwrap<unknown>(res);
  }
}

export const stayService = new StayService();
