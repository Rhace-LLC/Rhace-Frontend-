import api from '@/lib/axios';

export type BatchStatus = 'draft' | 'approved' | 'paid' | 'disputed';
export type SettlementSide = 'hotel' | 'partner';

export interface BatchTotals {
  entries: number;
  orders: number;
  gross: number;
  commission: number;
  partnerFees: number;
  hotelFees: number;
  reversals: number;
  adjustments: number;
  net: number;
}

export interface BatchCommentDto {
  at: string;
  side: 'hotel' | 'partner' | 'system';
  actorName: string;
  kind: 'comment' | 'created' | 'approved' | 'paid' | 'disputed' | 'resolved';
  body?: string;
}

export interface SettlementBatchDto {
  _id: string;
  batchNo: string;
  vendorLink: string;
  hotelVendor: string;
  partnerVendor: string;
  outletName?: string;
  counterpartName?: string | null;
  periodStart: string;
  periodEnd: string;
  currency: string;
  totals: BatchTotals;
  status: BatchStatus;
  approvedAt?: string | null;
  approvedByName?: string | null;
  payout?: { method?: string | null; reference?: string | null; paidAt?: string | null; recordedByName?: string | null };
  comments: BatchCommentDto[];
  createdAt: string;
}

export interface BatchRowDto {
  _id: string;
  type: 'due_to_partner' | 'reversal' | 'adjustment' | 'settled' | 'commission';
  gross: number;
  commission: number;
  partnerFees: number;
  hotelFees: number;
  net: number;
  note?: string | null;
  orderRef: string | null;
  orderTotal: number | null;
  location: string | null;
  createdAt: string;
}

export interface OutletRevenueRow {
  vendorLink: string;
  outletName: string | null;
  counterpartName: string | null;
  commissionRule: { kind: string; value: number; appliesTo: string } | null;
  orders: number;
  gross: number;
  commission: number;
  partnerFees: number;
  hotelFees: number;
  net: number;
  roomCharged: number;
  online: number;
  reversals: number;
  adjustments: number;
}

export interface ReconciliationReportDto {
  _id: string;
  vendorLink: string;
  outletName?: string;
  date: string;
  status: 'ok' | 'mismatch';
  totals: {
    orders: number;
    ordersTotal: number;
    folioPosted: number;
    accruedGross: number;
    accruedNet: number;
    onlineOrders: number;
  };
  issues: Array<{ code: string; order?: string | null; folioEntry?: string | null; detail: string }>;
  ranAt: string;
}

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } & T;
  return (body?.data ?? body) as T;
};

/** Phase 7: hotel ↔ outlet settlement (payouts are made offline and recorded). */
class SettlementApi {
  async batches(params?: { status?: string; linkId?: string }) {
    return unwrap<{
      side: SettlementSide;
      batches: SettlementBatchDto[];
      unbatched: Array<{ vendorLink: string; net: number; rows: number }>;
    }>(await api.get('/settlements/batches', { params }));
  }
  async batch(id: string) {
    return unwrap<{ batch: SettlementBatchDto; side: SettlementSide; rows: BatchRowDto[] }>(
      await api.get(`/settlements/batches/${id}`),
    );
  }
  async generate(linkId?: string) {
    return unwrap<SettlementBatchDto[]>(await api.post('/settlements/batches/generate', linkId ? { linkId } : {}));
  }
  async approve(id: string) {
    return unwrap<SettlementBatchDto>(await api.post(`/settlements/batches/${id}/approve`));
  }
  async markPaid(id: string, input: { method: string; reference?: string; note?: string }) {
    return unwrap<SettlementBatchDto>(await api.post(`/settlements/batches/${id}/paid`, input));
  }
  async dispute(id: string, comment: string) {
    return unwrap<SettlementBatchDto>(await api.post(`/settlements/batches/${id}/dispute`, { comment }));
  }
  async resolve(id: string, comment: string) {
    return unwrap<SettlementBatchDto>(await api.post(`/settlements/batches/${id}/resolve`, { comment }));
  }
  async comment(id: string, body: string) {
    return unwrap<SettlementBatchDto>(await api.post(`/settlements/batches/${id}/comments`, { body }));
  }
  async adjustment(input: { linkId: string; amount: number; note: string }) {
    return unwrap<unknown>(await api.post('/settlements/adjustments', input));
  }
  /** Download a batch statement as CSV. */
  async downloadStatement(batch: Pick<SettlementBatchDto, '_id' | 'batchNo'>) {
    const res = await api.get(`/settlements/batches/${batch._id}/statement.csv`, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settlement-${batch.batchNo}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  async outletRevenue(params: { from?: string; to?: string; linkId?: string }) {
    return unwrap<{ side: SettlementSide; from: string; to: string; rows: OutletRevenueRow[] }>(
      await api.get('/settlements/reports/outlet-revenue', { params }),
    );
  }
  async folioPostings(date?: string) {
    return unwrap<{
      date: string;
      groups: Array<{ revenueCode: string; count: number; amount: number }>;
      entries: Array<{ _id: string; type: string; amount: number; revenueCode: string; description?: string; postedAt: string }>;
    }>(await api.get('/settlements/reports/folio-postings', { params: date ? { date } : undefined }));
  }
  async reconciliation(params?: { from?: string; to?: string; status?: string }) {
    return unwrap<ReconciliationReportDto[]>(await api.get('/settlements/reconciliation', { params }));
  }
  async runReconciliation(date: string) {
    return unwrap<ReconciliationReportDto[]>(await api.post('/settlements/reconciliation/run', { date }));
  }
}

export const settlementApi = new SettlementApi();
