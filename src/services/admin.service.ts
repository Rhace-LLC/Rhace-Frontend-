import api from '@/lib/axios';

const extractArray = (p: unknown): unknown[] => {
  if (Array.isArray(p)) return p;
  const pObj = p as Record<string, unknown> | null | undefined;
  const candidates = [
    pObj?.data,
    pObj?.items,
    pObj?.results,
    pObj?.docs,
    pObj?.rows,
    pObj?.vendors,
    pObj?.users,
    pObj?.reservations,
    pObj?.list,
    (pObj?.data as Record<string, unknown>)?.data,
    (pObj?.data as Record<string, unknown>)?.items,
    (pObj?.data as Record<string, unknown>)?.results,
    (pObj?.data as Record<string, unknown>)?.docs,
    (pObj?.data as Record<string, unknown>)?.rows,
    (pObj?.data as Record<string, unknown>)?.vendors,
    (pObj?.data as Record<string, unknown>)?.users,
    (pObj?.data as Record<string, unknown>)?.reservations,
  ];
  for (const c of candidates) if (Array.isArray(c)) return c;
  return [];
};

export const getDashboardKPIs = () => api.get('/dashboard/kpis');
export const getRecentTransactions = () => api.get('/dashboard/recent-transactions');
export const getRevenueTrends = (params: Record<string, unknown> = {}) =>
  api.get('/dashboard/revenue-trends', { params });
export const getTodaysReservations = () => api.get('/dashboard/todays-reservations');
export const getTopVendors = () => api.get('/dashboard/top-vendors');

// New function for top performing vendors - uses the correct endpoint
export const getTopVendorEarnings = (params: Record<string, unknown> = {}) =>
  api.get('/payments/vendors-earnings', { params });

export const getVendorsEarnings = () => api.get('/dashboard/vendors-earnings');
export const getUpcomingReservations = () => api.get('/dashboard/upcoming-reservations');
export const getBookingTrends = () => api.get('/dashboard/booking-trends');
export const getCustomerFrequency = () => api.get('/dashboard/customer-frequency');
export const getRevenueByCategory = () => api.get('/dashboard/revenue-by-category');
export const getReservationSources = () => api.get('/dashboard/reservation-sources');

export const getVendors = (params?: Record<string, unknown>) =>
  api.get('/vendors', { params }).then((response) => {
    if (response.data) {
      if (response.data.message && typeof response.data.message === 'string') {
        response.data.message = response.data.message.replace(
          'Fetched undefined vendor Succesfully!',
          'Vendors fetched successfully!'
        );
      } else if (typeof response.data === 'string') {
        response.data = response.data
          .replace(/undefined vendor/g, 'vendors')
          .replace(/Succesfully/g, 'successfully');
      }
    }
    return response;
  });
export const getVendorById = (id: string | number) =>
  api.get(`/vendors/${id}`).then((response) => {
    if (response.data) {
      if (response.data.message && typeof response.data.message === 'string') {
        response.data.message = response.data.message.replace(
          'Fetched undefined vendor Succesfully!',
          'Vendor fetched successfully!'
        );
      } else if (typeof response.data === 'string') {
        response.data = response.data
          .replace(/undefined vendor/g, 'vendor')
          .replace(/Succesfully/g, 'successfully');
      }
    }
    return response;
  });
export const getVendorStats = () => api.get('/vendors/stats');
export const approveVendor = (id: string | number, data: unknown) =>
  api.patch(`/vendors/${id}/approval`, data);
export const updateVendorStatus = (id: string | number, data: unknown) =>
  api.patch(`/vendors/${id}/status`, data);
export const updateVendor = (id: string | number, data: unknown) =>
  api.put(`/vendors/${id}`, data);
export const deleteVendor = (id: string | number) => api.delete(`/vendors/${id}`);
export const updateVendorCommission = (id: string | number, data: unknown) =>
  api.patch(`/vendors/${id}/commission`, data);
export const bulkUpdateVendors = (data: unknown) => api.post('/vendors/bulk-update', data);
export const submitVendorKYC = (id: string | number, data: unknown) =>
  api.post(`/vendors/${id}/kyc`, data);
export const verifyVendorKYC = (id: string | number, data: unknown) =>
  api.patch(`/vendors/${id}/kyc/verify`, data);
export const addVendorBankAccount = (id: string | number, data: unknown) =>
  api.post(`/vendors/${id}/bank-account`, data);
export const verifyVendorBankAccount = (id: string | number, data: unknown) =>
  api.patch(`/vendors/${id}/bank-account/verify`, data);
export const exportVendors = (params?: Record<string, unknown>) =>
  api.get('/vendors/export', {
    params,
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
  });
export const getPublicVendors = () => api.get('/vendors/public');

export const getReservations = (params?: Record<string, unknown>) => {
  return api
    .get('/reservations', { params })
    .then((response) => {
      return response;
    })
    .catch((error) => {
      console.error(
        'Error fetching reservations:',
        (error as { response?: unknown })?.response || (error as { message?: string })?.message
      );
      throw error;
    });
};

export const getUserReservations = (userId: string, params: Record<string, unknown> = {}) => {
  // Try to use user-specific endpoint first, fallback to filtering all reservations
  return api
    .get(`/reservations/user/${userId}`, { params })
    .then((response) => {
      // Check if response contains actual reservation data or just a welcome message
      if (
        typeof response.data === 'string' &&
        response.data.includes('Welcome to Rhace Backend API')
      ) {
        throw new Error('Endpoint not implemented');
      }

      return response;
    })
    .catch(() => {
      // Fallback: fetch all reservations and filter client-side
      return api
        .get('/reservations', {
          params: {
            limit: 1000, // Reduced limit for better performance
            ...params,
          },
        })
        .then((response) => {
          // Filter reservations for this specific user
          const allReservations = extractArray(response?.data) || [];

          const userReservations = allReservations.filter(
            (reservation: Record<string, unknown>) => {
              const user = reservation.user as Record<string, unknown> | undefined;
              const customer = reservation.customer as Record<string, unknown> | undefined;
              const resUserId =
                reservation.customerId ||
                reservation.guest ||
                reservation.userId ||
                user?.id ||
                user?._id ||
                customer?.id ||
                customer?.email;
              return resUserId === userId;
            }
          );

          return {
            ...response,
            data: userReservations,
          };
        });
    });
};
export const getReservationById = (id: string | number) => api.get(`/reservations/${id}`);
export const updateReservationStatus = (id: string | number, data: unknown) =>
  api.patch(`/reservations/${id}/status`, data);
export const addReservationMeals = (id: string | number, data: unknown) =>
  api.post(`/reservations/${id}/meals`, data);
export const waiveReservationPenalty = (id: string | number, data: unknown) =>
  api.patch(`/reservations/${id}/penalty/waive`, data);
export const getReservationCounters = () => {
  return api
    .get('/reservations/counters')
    .then((response) => {
      // Normalize counters payload to be easier for callers to consume
      const payload = response?.data as Record<string, unknown> | undefined;
      const normalized = payload?.data || payload || {};
      return { data: normalized };
    })
    .catch((error) => {
      console.error(
        'Error fetching counters:',
        (error as { response?: unknown })?.response || (error as { message?: string })?.message
      );
      throw error;
    });
};
export const exportReservations = (params?: Record<string, unknown>) =>
  api.get('/reservations/export', {
    params,
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
  });

export const getTotalEarnings = () => api.get('/payments/stats');
export const getVendorEarnings = (vendorId: string) => api.get(`/payments/vendor-earnings/${vendorId}`);
export const initiatePayout = (data: unknown) => api.post('/payments/payouts', data);
export const getPayouts = (params?: Record<string, unknown>) => api.get('/payments/payouts', { params });
export const getPayoutById = (id: string | number) => api.get(`/payments/payouts/${id}`);
export const getVendorPayouts = (vendorId: string) => api.get(`/payments/payouts/vendor/${vendorId}`);
export const approvePayout = (id: string | number, data?: unknown) =>
  api.patch(`/payments/payouts/${id}/approve`, data);
export const getPayoutReceipt = (id: string | number) =>
  api.get(`/payments/payouts/${id}/receipt`, {
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
  });

export const getUsers = (params?: Record<string, unknown>) => api.get('/users', { params });
export const getUserById = (id: string | number) => api.get(`/users/${id}`);
export const getUserStats = () => api.get('/users/stats');
export const updateUserStatus = (id: string | number, data: unknown) =>
  api.patch(`/users/${id}/status`, data);
export const updateUserRole = (id: string | number, data: unknown) =>
  api.patch(`/users/${id}/role`, data);
export const toggleUserVIP = (id: string | number, data: unknown) =>
  api.patch(`/users/${id}/vip`, data);
export const bulkUpdateUsers = (data: unknown) => api.post('/users/bulk-update', data);
export const exportUsers = (params?: Record<string, unknown>) =>
  api.get('/users/export', {
    params,
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
  });

export const getSettings = () => api.get('/settings');
export const updateSettings = (data: unknown) => api.put('/settings', data);
export const getAccountSettings = () => api.get('/settings/account');
export const updateAccountSettings = (data: unknown) => api.put('/settings/account', data);

// ============================================================
// NEW DIRECT EXPORT FUNCTIONS (No Cloudinary, no job queue)
// ============================================================

// Direct export reservations report
export const exportReservationsDirect = (params?: Record<string, unknown>) =>
  api.post('/reports/export/reservations', params, {
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
  });

// Direct export vendor earnings report
export const exportVendorEarningsDirect = (params?: Record<string, unknown>) =>
  api.post('/reports/export/vendor-earnings', params, {
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
  });

// Direct export payments report
export const exportPaymentsDirect = (params?: Record<string, unknown>) =>
  api.post('/reports/export/payments', params, {
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
  });

// Direct export users report
export const exportUsersDirect = (params?: Record<string, unknown>) =>
  api.post('/reports/export/users', params, {
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
  });

// Direct export vendors report
export const exportVendorsDirect = (params?: Record<string, unknown>) =>
  api.post('/reports/export/vendors', params, {
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
  });

// ============================================================
// LEGACY REPORT FUNCTIONS (Kept for backward compatibility)
// ============================================================

export const generateVendorEarningsReport = (data: unknown) => api.post('/reports/vendor-earnings', data);
export const generateReservationsReport = (data: unknown) => api.post('/reports/reservations', data);
export const generatePaymentsReport = (data: unknown) => api.post('/reports/payments', data);
export const generateUsersReport = (data: unknown) => api.post('/reports/users', data);
export const generateVendorsReport = (data: unknown) => api.post('/reports/vendors', data);
export const getReportStatus = (id: string | number) => api.get(`/reports/${id}/status`);
export const downloadReport = (id: string | number) =>
  api.get(`/reports/${id}/download`, {
    responseType: 'blob',
    headers: { Accept: 'application/octet-stream' },
  });

export const getPayments = (params?: Record<string, unknown>) => api.get('/payments', { params });

// Paystack API Functions - Direct integration
export const getPaystackBalance = () => api.get('/payments/paystack/balance');
export const getPaystackBalanceLedger = () => api.get('/payments/paystack/balance/ledger');
export const getPaystackTransactions = (params?: Record<string, unknown>) =>
  api.get('/payments/paystack/transactions', { params });
export const getPaystackTransactionStats = (params?: Record<string, unknown>) =>
  api.get('/payments/paystack/transactions/stats', { params });

// New Admin Earnings API Functions
// These endpoints calculate: Admin Earnings = (Gross Amount × Vendor %) - (Gross Amount × Paystack Commission)
export const getAdminEarnings = (params: Record<string, unknown> = {}) =>
  api.get('/payments/admin-earnings', { params });
export const getSuccessfulPaymentsCount = (params: Record<string, unknown> = {}) =>
  api.get('/payments/successful-count', { params });
