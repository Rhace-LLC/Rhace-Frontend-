export type OrderSource = 'reservation' | 'quick_order' | 'pos' | 'in_stay';
export type OrderItemType = 'dish' | 'drink' | 'bottle_set' | 'hotel_service';
export type OrderStatus =
  | 'open'
  | 'awaiting_confirmation'
  | 'placed'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'rejected';

/** Phase 5: where an in-stay order goes. */
export interface OrderFulfillmentDto {
  mode?: 'room' | 'location' | 'pickup';
  unitId?: string | null;
  zoneId?: string | null;
  locationLabel?: string | null;
  scheduledFor?: string | null;
}

export interface OrderLineAddonDto {
  addonId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderLineDto {
  _id: string;
  order: string;
  itemType: OrderItemType;
  itemId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
  addons: OrderLineAddonDto[];
  lineTotal: number;
  status: string;
  /** Kitchen/bar bump state: queued -> preparing -> ready. */
  prepStatus?: 'queued' | 'preparing' | 'ready' | string;
}

export interface OrderDto {
  _id: string;
  vendor: string;
  vertical?: string;
  source: OrderSource;
  status: OrderStatus;
  paymentStatus: string;
  customerId?: string;
  /** Staff member the order is attributed to (POS-created orders). */
  staffId?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  reservation?: string | null;
  bookingGroup?: string | null;
  unitId?: string | null;
  currency: string;
  subtotal: number;
  discount: number;
  serviceFee: number;
  total: number;
  minimumDepositCredit: number;
  amountPaid: number;
  balance: number;
  notes?: string;
  createdAt?: string;
  lines?: OrderLineDto[];
  /** Phase 3: itemised fees + settlement. */
  fees?: Array<{ label: string; amount: number; beneficiary?: 'hotel' | 'partner' }>;
  settlementMethod?: 'folio' | 'online' | 'offline';
  folioEntry?: string | null;
  /** Phase 5: linked in-stay ordering (fulfilling vendor ≠ host hotel). */
  stay?: string | null;
  /** Phase 6: guest checkout group (one online payment covers the whole cart). */
  cart?: string | null;
  hostVendor?: string | null;
  vendorLink?: string | null;
  /** Outlet display name (hotel/guest read models only). */
  outletName?: string | null;
  fulfillment?: OrderFulfillmentDto | null;
  acceptBy?: string | null;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  rejectReason?: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
}

/** Phase 5: an in-stay order fulfilled by a linked outlet (not the hotel). */
export function isLinkedStayOrder(order: Pick<OrderDto, 'hostVendor' | 'vendor'>): boolean {
  return Boolean(order.hostVendor) && String(order.hostVendor) !== String(order.vendor);
}

/** Human status label shared by order screens. */
export const ORDER_STATUS_TEXT: Record<OrderStatus, string> = {
  open: 'Open',
  awaiting_confirmation: 'Awaiting confirmation',
  placed: 'Placed',
  preparing: 'Preparing',
  ready: 'Ready',
  served: 'Served',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
};

export interface CreateOrderLineInput {
  itemType: OrderItemType;
  itemId: string;
  quantity?: number;
  notes?: string;
  addonIds?: string[];
  /** Phase 2/3: scheduled start for hotel experience lines. */
  serviceStart?: string;
}

export interface CreateOrderInput {
  source?: OrderSource;
  vertical?: string;
  vendorId?: string;
  reservation?: string;
  bookingGroup?: string;
  unitId?: string;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
  notes?: string;
  idempotencyKey?: string;
  lines: CreateOrderLineInput[];
}

export interface OrderIntentResult {
  authorization_url: string;
  access_code: string;
  ref: string;
  paymentId: string;
  amount: number;
}
