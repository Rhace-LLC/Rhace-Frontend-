export type OrderSource = 'reservation' | 'quick_order' | 'pos';
export type OrderItemType = 'dish' | 'drink' | 'bottle_set';
export type OrderStatus =
  | 'open'
  | 'placed'
  | 'preparing'
  | 'served'
  | 'completed'
  | 'cancelled';

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
}

export interface CreateOrderLineInput {
  itemType: OrderItemType;
  itemId: string;
  quantity?: number;
  notes?: string;
  addonIds?: string[];
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
