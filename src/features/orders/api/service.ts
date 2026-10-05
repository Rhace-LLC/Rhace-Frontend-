import api from '@/lib/axios';
import type {
  CreateOrderInput,
  OrderDto,
  OrderIntentResult,
  OrderLineDto,
  CreateOrderLineInput,
} from '../types';

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } & T;
  return (body?.data ?? body) as T;
};

/** Whole room tab for a stay (Phase 0 D5): every order plus summed totals. */
export interface ReservationTabSummary {
  count: number;
  subtotal: number;
  discount: number;
  serviceFee: number;
  total: number;
  amountPaid: number;
  balance: number;
}

export interface ReservationTab {
  orders: OrderDto[];
  tab: ReservationTabSummary;
  /** Earliest order; kept for backward compatibility. */
  order: OrderDto | null;
}

class OrdersApi {
  async create(input: CreateOrderInput): Promise<OrderDto> {
    const res = await api.post('/orders', input);
    return unwrap<OrderDto>(res);
  }

  async get(id: string): Promise<OrderDto> {
    const res = await api.get(`/orders/${id}`);
    return unwrap<OrderDto>(res);
  }

  async getByReservation(reservationId: string): Promise<ReservationTab> {
    const res = await api.get(`/orders/by-reservation/${reservationId}`);
    return unwrap<ReservationTab>(res);
  }

  /**
   * `withLines` asks the API to embed each order's lines, so ticket screens
   * (KDS / bar / dispatch) get their items in a single request.
   */
  async list(params?: {
    status?: string;
    source?: string;
    page?: number;
    limit?: number;
    withLines?: boolean;
    /** Staff token only: restrict to orders this staff member created. */
    mine?: boolean;
    /** ISO date bounds on `createdAt` (backend `from`/`to`). */
    from?: string;
    to?: string;
    /** Restrict to orders on one table/room, or any of several. */
    unitId?: string;
    unitIds?: string[];
  }) {
    const res = await api.get('/orders', {
      params: params
        ? {
            ...params,
            mine: params.mine ? 'true' : undefined,
            // CSV keeps parsing deterministic across query parsers.
            unitIds:
              params.unitIds && params.unitIds.length > 0 ? params.unitIds.join(',') : undefined,
          }
        : undefined,
    });
    // `paginated()` wraps the page in a `{ success, data }` envelope; callers read
    // `.items` straight off the result, so unwrap it here.
    return unwrap<{ items: OrderDto[]; total: number; page: number; limit: number; pages: number }>(
      res,
    );
  }

  async addLine(id: string, line: CreateOrderLineInput): Promise<OrderDto> {
    const res = await api.post(`/orders/${id}/lines`, line);
    return unwrap<OrderDto>(res);
  }

  async removeLine(id: string, lineId: string): Promise<OrderDto> {
    const res = await api.delete(`/orders/${id}/lines/${lineId}`);
    return unwrap<OrderDto>(res);
  }

  /** Kitchen/bar bump for a single ticket line. */
  async bumpLine(
    id: string,
    lineId: string,
    prepStatus: 'queued' | 'preparing' | 'ready' | 'served',
  ): Promise<OrderDto> {
    const res = await api.patch(`/orders/${id}/lines/${lineId}/prep`, { prepStatus });
    return unwrap<OrderDto>(res);
  }

  async updateStatus(id: string, status: string): Promise<OrderDto> {
    const res = await api.patch(`/orders/${id}/status`, { status });
    return unwrap<OrderDto>(res);
  }

  async cancel(id: string): Promise<OrderDto> {
    const res = await api.delete(`/orders/${id}`);
    return unwrap<OrderDto>(res);
  }

  /** Phase 5 outlet: accept a pending in-stay order (posts the room charge). */
  async accept(id: string): Promise<OrderDto> {
    const res = await api.post(`/orders/${id}/accept`);
    return unwrap<OrderDto>(res);
  }

  /** Phase 5 outlet: reject a pending in-stay order (voids the room charge). */
  async reject(id: string, reason: string): Promise<OrderDto> {
    const res = await api.post(`/orders/${id}/reject`, { reason });
    return unwrap<OrderDto>(res);
  }

  /** Phase 5 hotel: every in-stay order it hosts (own services + outlets). */
  async hosted(params?: { status?: string; vendorLink?: string; from?: string; to?: string; limit?: number }) {
    const res = await api.get('/orders/hosted', { params });
    return unwrap<OrderDto[]>(res);
  }

  /** Phase 5 hotel runner: mark an outlet order out for delivery / delivered. */
  async hostedDelivery(id: string, status: 'out_for_delivery' | 'delivered'): Promise<OrderDto> {
    const res = await api.patch(`/orders/hosted/${id}/delivery`, { status });
    return unwrap<OrderDto>(res);
  }

  /** Creates a Paystack intent for the order and returns the redirect URL. */
  async intent(orderId: string): Promise<OrderIntentResult> {
    const res = await api.post(`/payments/order/${orderId}/intent`);
    return unwrap<OrderIntentResult>(res);
  }

  /** Public: resolve a scanned QR token to its vendor/unit. */
  async resolveQrToken(token: string) {
    const res = await api.get(`/quick-order/resolve/${token}`);
    return unwrap<{ vendorId: string; unitId: string; blueprintId: string | null }>(res);
  }

  /** Vendor: mint a signed QR token for a unit. */
  async createQrToken(unitId: string) {
    const res = await api.post('/quick-order/token', { unitId });
    return unwrap<{ token: string; path: string }>(res);
  }

  linesOf(order: OrderDto): OrderLineDto[] {
    return order.lines ?? [];
  }
}

export const ordersApi = new OrdersApi();
