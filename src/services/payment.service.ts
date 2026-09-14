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

  async completeReservation(trxref: string) {
    const response = await api.post('/bookings/complete-payment', {
      trxref,
    });
    return response.data;
  }
}

export const paymentService = new PaymentService();
