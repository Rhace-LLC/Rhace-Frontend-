import api from '@/lib/axios';

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

async getTrends({
  metric,
  range,
}) {
  const params = new URLSearchParams({
    range,
    ...(metric ? { metric } : {}),
  });

  const res = await api.get(
    `/payments/earnings-trend?${params.toString()}`
  );

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

  async verifyPayment(reference) {
    const res = await api.post('/payments/verify', { reference });
    return res.data;
  }

  async initializePayment(bookingData) {
    const response = await api.post('/payments/initialize', bookingData);
    return response.data;
  }

  async initializeSubsequentPayment(reservationId) {
  const res = await api.post(
    `/payments/${reservationId}/subsequent-payment`
  );

  return res.data;
}

async recordOfflinePayment(reservationId, body) {
  const res = await api.post(
    `/payments/${reservationId}/offline-payment`,
    body
  );
  
  return res.data;
}

  async completeReservation(trxref) {
    const response = await api.post('/bookings/complete-payment', {
      trxref,
    });
    return response.data;
  }
}

export const paymentService = new PaymentService();


/*
export async function submitInitializeBalancePayment(
  reservationId
) {
  try {
    const response =
      await paymentService.initializeSubsequentPayment(
        reservationId
      );

    return response;
  } catch (error) {
    throw error;
  }
}

export async function submitRecordOfflinePayment(
  reservationId,
  body
) {
  try {
    const response =
      await paymentService.recordOfflinePayment(
        reservationId,
        body
      );
    return response;
  } catch (error) {
    throw error;
  }
}
*/