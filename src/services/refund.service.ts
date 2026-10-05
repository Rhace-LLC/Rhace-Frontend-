import api from '@/lib/axios';

export type RefundStatus = 'open' | 'pending' | 'completed' | 'cancelled' | 'failed';
export type RefundSource = 'manual' | 'outlet_rejected' | 'paid_after_expiry' | 'folio_credit';
export type RefundMethod = 'cash' | 'bank_transfer' | 'other';

export interface RefundActivityDto {
  at: string;
  actorName: string;
  action: 'opened' | 'note' | 'amount_changed' | 'completed' | 'cancelled' | 'reopened';
  note?: string;
}

export interface RefundTicketDto {
  _id: string;
  ticketNo?: string;
  vendor: string;
  hostVendor?: string | null;
  order?: string | null;
  stay?: string | null;
  folio?: string | null;
  source: RefundSource;
  guestName?: string;
  guestEmail?: string;
  guestPhone?: string;
  amount: number;
  currency?: string;
  reason?: string;
  status: RefundStatus;
  method?: RefundMethod | null;
  reference?: string | null;
  completedByName?: string | null;
  cancelledReason?: string | null;
  processedAt?: string | null;
  activity?: RefundActivityDto[];
  createdAt: string;
}

export interface RefundList {
  docs: RefundTicketDto[];
  total: number;
  page: number;
  pages: number;
  open: { count: number; amount: number };
}

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } & T;
  return (body?.data ?? body) as T;
};

/** Refund tickets — refunds are paid offline (cash / bank transfer) and recorded here. */
class RefundApi {
  async list(params?: { status?: string; source?: string; page?: number; limit?: number; orderId?: string }) {
    const res = await api.get('/refunds', { params });
    return res.data as RefundList;
  }
  async get(id: string): Promise<RefundTicketDto> {
    return unwrap<RefundTicketDto>(await api.get(`/refunds/${id}`));
  }
  async open(input: {
    amount: number;
    reason: string;
    orderId?: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
  }): Promise<RefundTicketDto> {
    return unwrap<RefundTicketDto>(await api.post('/refunds', input));
  }
  async complete(
    id: string,
    input: { method: RefundMethod; reference?: string; note?: string; amount?: number },
  ): Promise<RefundTicketDto> {
    return unwrap<RefundTicketDto>(await api.patch(`/refunds/${id}/complete`, input));
  }
  async cancel(id: string, reason: string): Promise<RefundTicketDto> {
    return unwrap<RefundTicketDto>(await api.patch(`/refunds/${id}/cancel`, { reason }));
  }
  async note(id: string, note: string): Promise<RefundTicketDto> {
    return unwrap<RefundTicketDto>(await api.post(`/refunds/${id}/notes`, { note }));
  }
}

export const refundApi = new RefundApi();
