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

class OrdersApi {
  async create(input: CreateOrderInput): Promise<OrderDto> {
    const res = await api.post('/orders', input);
    return unwrap<OrderDto>(res);
  }

  async get(id: string): Promise<OrderDto> {
    const res = await api.get(`/orders/${id}`);
    return unwrap<OrderDto>(res);
  }

  async getByReservation(reservationId: string): Promise<{ order: OrderDto | null }> {
    const res = await api.get(`/orders/by-reservation/${reservationId}`);
    return unwrap<{ order: OrderDto | null }>(res);
  }

  async list(params?: { status?: string; source?: string; page?: number; limit?: number }) {
    const res = await api.get('/orders', { params });
    return res.data as { items: OrderDto[]; total: number; page: number; limit: number; pages: number };
  }

  async addLine(id: string, line: CreateOrderLineInput): Promise<OrderDto> {
    const res = await api.post(`/orders/${id}/lines`, line);
    return unwrap<OrderDto>(res);
  }

  async removeLine(id: string, lineId: string): Promise<OrderDto> {
    const res = await api.delete(`/orders/${id}/lines/${lineId}`);
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
