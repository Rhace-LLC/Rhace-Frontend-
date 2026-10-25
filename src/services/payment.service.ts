import api from '@/lib/axios';

export interface EarningsTrendParams {
  metric?: string;
  range?: string;
}

// ─── Payments report (/payments/report/*, /payments/transactions*) ────────

export type ReportPreset =
  | 'today'
  | 'this_week'
  | 'last_30_days'
  | 'this_month'
  | 'last_quarter'
  | 'last_year';
export type ReportBucket = 'hour' | 'day' | 'week' | 'month';

/** Shared report filter: a preset, or a custom `from`/`to` (YYYY-MM-DD, Lagos days). */
export interface ReportParams {
  preset?: ReportPreset;
  from?: string;
  to?: string;
  currency?: string;
  bucket?: ReportBucket;
}

export interface ReportRangeDto {
  preset: ReportPreset | 'custom';
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
  bucket: ReportBucket;
  tz: string;
}

export interface ReportTotals {
  gross: number;
  net: number;
  platformCommission: number;
  transactionFees: number;
  refunds: number;
  count: number;
  avgTransaction: number;
  successRate: number | null;
}

export interface ReportSummaryDto {
  range: ReportRangeDto;
  currency: string;
  current: ReportTotals;
  previous: ReportTotals;
  change: Record<keyof ReportTotals, number | null>;
  otherCurrencies: { currency: string; gross: number; count: number }[];
}

export type TimeseriesMetric = 'gross' | 'net' | 'fees' | 'count';

export interface ReportTimeseriesDto {
  range: ReportRangeDto;
  currency: string;
  metric: TimeseriesMetric;
  points: { bucket: string; current: number; previous: number }[];
}

export type BreakdownDimension = 'provider' | 'method' | 'source' | 'vertical';

export interface BreakdownRow {
  key: string;
  label: string;
  count: number;
  volume: number;
  fees: number;
  net: number;
  share: number;
  effectiveRate: number;
}

export interface ReportBreakdownDto {
  range: ReportRangeDto;
  currency: string;
  by: BreakdownDimension;
  rows: BreakdownRow[];
}

export type TransactionStatus = 'success' | 'pending' | 'failed' | 'refunded' | 'partially_refunded';

export interface TransactionDto {
  _id: string;
  shortId: string;
  paidAt: string | null;
  createdAt: string | null;
  at: string;
  customerName: string;
  amount: number;
  currency: string;
  provider: string;
  method: string;
  source: string;
  status: TransactionStatus;
  refundedAmount: number;
  transactionFee: number;
  netToVendor: number;
  reference: string | null;
  billingModel: 'percentage' | 'subscription';
  platformPercentage: number | null;
}

export interface TransactionDetailDto extends TransactionDto {
  email: string | null;
  paymentMode: string | null;
  vertical: string | null;
  subjectType: string | null;
  subjectId: string | null;
  vendorShare: number;
  platformShare: number;
  providerFee: number;
  feeBearer: string;
  paymentConfig: { billingModel?: string; platformPercentage?: number } | null;
  offline: { reference: string | null; note: string | null } | null;
  refunds: {
    _id: string;
    ticketNo: string | null;
    amount: number;
    currency: string;
    status: string;
    reason: string | null;
    at: string | null;
  }[];
}

export interface TransactionQuery extends ReportParams {
  page?: number;
  limit?: number;
  status?: string[];
  provider?: string[];
  method?: string[];
  source?: string[];
  q?: string;
  sort?: '-paidAt' | 'paidAt' | 'amount' | '-amount';
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const unwrap = <T>(body: unknown): T => ((body as { data?: T })?.data ?? body) as T;

/** Drop empty values and join list filters as the API's comma lists. */
function reportQuery(params: TransactionQuery): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      if (value.length) out[key] = value.join(',');
    } else out[key] = value as string | number;
  }
  return out;
}

class PaymentService {
  async getReportSummary(params: ReportParams) {
    const res = await api.get('/payments/report/summary', { params: reportQuery(params) });
    return unwrap<ReportSummaryDto>(res.data);
  }

  async getReportTimeseries(params: ReportParams & { metric: TimeseriesMetric }) {
    const res = await api.get('/payments/report/timeseries', { params: reportQuery(params) });
    return unwrap<ReportTimeseriesDto>(res.data);
  }

  async getReportBreakdown(params: ReportParams & { by: BreakdownDimension }) {
    const res = await api.get('/payments/report/breakdown', { params: reportQuery(params) });
    return unwrap<ReportBreakdownDto>(res.data);
  }

  async getTransactions(params: TransactionQuery) {
    const res = await api.get('/payments/transactions', { params: reportQuery(params) });
    return unwrap<Paginated<TransactionDto>>(res.data);
  }

  async getTransaction(id: string) {
    const res = await api.get(`/payments/transactions/${id}`);
    return unwrap<TransactionDetailDto>(res.data);
  }

  /** Download the filtered ledger as CSV (through axios so the auth header is sent). */
  async exportTransactions(params: TransactionQuery) {
    const query = { ...params, page: undefined, limit: undefined };
    const res = await api
      .get('/payments/transactions/export', { params: reportQuery(query), responseType: 'blob' })
      .catch(async (error: { response?: { data?: unknown } }) => {
        // Errors arrive as a Blob too; turn the JSON body back into a message.
        const data = error?.response?.data;
        if (data instanceof Blob && error.response) {
          try {
            error.response.data = JSON.parse(await data.text());
          } catch {
            /* keep the original error */
          }
        }
        throw error;
      });
    const disposition = String(res.headers['content-disposition'] ?? '');
    const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? 'payments.csv';
    const url = URL.createObjectURL(res.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  async getPayments() {
    const res = await api.get('/payments');
    return res.data;
  }

  async getPaymentStats() {
    const res = await api.get('/payments/stats');
    return res.data;
  }

  async getKpis() {
    const res = await api.get('/dashboard/kpis');
    return res.data;
  }

  async getTrends({ metric, range }: EarningsTrendParams) {
    const params = new URLSearchParams({
      range: range || '',
      ...(metric ? { metric } : {}),
    });

    const res = await api.get(`/payments/earnings-trend?${params.toString()}`);

    return res.data;
  }

  async getPaymentInfo() {
    const vendorId = localStorage.getItem('vendorId');
    if (!vendorId) {
      throw new Error('Vendor ID missing. Please log in again.');
    }
    const res = await api.get(`/payments/payment-info?vendorId=${vendorId}`);
    return res.data;
  }

  async verifyPayment(reference: string) {
    const res = await api.post('/payments/verify', { reference });
    return res.data;
  }

  /** Stripe Connect self-onboarding (foreign-currency opt-in). Returns an onboarding link. */
  async connectStripe(country = 'NG') {
    const res = await api.post('/vendors/me/connect-stripe', { country });
    return res.data as { success: boolean; accountId?: string; onboardingUrl?: string; alreadyReady?: boolean };
  }

  /** Get the calling vendor's payment-provider account status. */
  async getMyPaymentAccounts() {
    const res = await api.get('/vendors/me/payment-accounts');
    return res.data as {
      success: boolean;
      account: {
        bank: { bankName?: string; accountName?: string; accountNumberLast4?: string };
        activeProvider: 'paystack' | 'monnify';
        providers: {
          paystack: { enabled: boolean; ready: boolean; lastError?: string };
          monnify: { enabled: boolean; ready: boolean; lastError?: string };
          stripe: { enabled: boolean; ready: boolean; lastError?: string; started: boolean; requirementsDue: string[] };
        };
        feeBearer: 'customer' | 'vendor' | 'platform' | 'split';
      };
    };
  }

  /** Retry/create a Paystack or Monnify sub-account using stored bank details. */
  async retryProviderAccount(provider: 'paystack' | 'monnify') {
    const res = await api.post('/vendors/me/payment-accounts/subaccount', { provider });
    return res.data as {
      success: boolean;
      account: {
        bank: { bankName?: string; accountName?: string; accountNumberLast4?: string };
        activeProvider: 'paystack' | 'monnify';
        providers: Record<string, { enabled: boolean; ready: boolean; lastError?: string }>;
        feeBearer: 'customer' | 'vendor' | 'platform' | 'split';
      };
      failed: { gateway: string; message: string }[];
    };
  }

  async initializePayment(bookingData: Record<string, unknown>) {
    const response = await api.post('/payments/initialize', bookingData);
    return response.data;
  }

  async initializeSubsequentPayment(reservationId: string) {
    const res = await api.post(`/payments/${reservationId}/subsequent-payment`);

    return res.data;
  }

  /** Unit engine: create Paystack intent for a BookingGroup (full / deposit / balance). */
  async createGroupIntent(groupId: string, strategy?: string) {
    const res = await api.post(`/payments/group/${groupId}/intent`, { strategy });
    return res.data;
  }

  /** Unit engine: record a cash/POS/bank-transfer payment against a BookingGroup. */
  async recordGroupOfflinePayment(
    groupId: string,
    body: { amount: number; method: string; reference?: string; note?: string }
  ) {
    const res = await api.post(`/payments/group/${groupId}/offline-payment`, body);
    return res.data;
  }

  async recordOfflinePayment(reservationId: string, body: Record<string, unknown>) {
    const res = await api.post(`/payments/${reservationId}/offline-payment`, body);

    return res.data;
  }

  /** Record a cash/card/transfer/POS payment against a standalone order. */
  async recordOrderOfflinePayment(
    orderId: string,
    body: { amount: number; method: string; reference?: string; note?: string }
  ) {
    const res = await api.post(`/payments/order/${orderId}/offline-payment`, body);
    return res.data;
  }

  async completeReservation(trxref: string) {
    const response = await api.post('/bookings/complete-payment', {
      trxref,
    });
    return response.data;
  }
}

export const paymentService = new PaymentService();
