import api from '@/lib/axios';

export interface EarningsTrendParams {
  metric?: string;
  range?: string;
}

class PaymentService {
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
