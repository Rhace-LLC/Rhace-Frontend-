import api from '@/lib/axios';

interface UpdateStatusPayload {
  reservationId: string;
  vendorId: string;
  resId?: string;
  paymentRef?: { _id?: string; toString?: () => string } | string;
}

interface FetchReservationsParams {
  vendorId?: string;
  userId?: string;
  bookingId?: string;
  resId?: string;
  page?: number | string;
  limit?: number;
  search?: string;
  status?: string;
}

class UserService {
  async getFavorites(params: Record<string, unknown> = {}) {
    const response = await api.get('/users/favorites', { params });
    return response.data;
  }

  // Add to favorites - FIXED: removed trailing slash and added error handling
  async addToFavorites(vendorId: string, vendorType = 'restaurant') {
    try {
      // Validate inputs
      if (!vendorId) {
        throw new Error('vendorId is required');
      }

      // Ensure vendorType is valid
      const validVendorType = vendorType || 'restaurant';
      const allowedTypes = ['restaurant', 'hotel', 'club', 'other'];
      if (!allowedTypes.includes(validVendorType)) {
        throw new Error(
          `Invalid vendorType: ${validVendorType}. Must be one of: ${allowedTypes.join(', ')}`
        );
      }

      const payload = {
        vendorId: vendorId,
        vendorType: vendorType,
      };

      console.log('Sending payload to backend:', payload);
      console.log('Payload stringified:', JSON.stringify(payload));

      const response = await api.post('/users/favorites', payload, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Backend response:', response.data);
      return response.data;
    } catch (error) {
      const e = error as { response?: { data?: unknown; status?: number }; message?: string };
      console.error(
        'Error in addToFavorites:',
        e.response?.data || e.message,
        'Status:',
        e.response?.status
      );
      throw error;
    }
  }
  // Remove from favorites - FIXED: removed trailing slash
  async removeFromFavorites(vendorId: string) {
    try {
      if (!vendorId) {
        throw new Error('vendorId is required');
      }

      const response = await api.delete('/users/favorites', {
        data: { vendorId },
      });
      return response.data;
    } catch (error) {
      const e = error as { response?: { data?: unknown }; message?: string };
      console.error('Error in removeFromFavorites:', e.response?.data || e.message);
      throw error;
    }
  }
  /**
   * Update the authenticated user's profile picture
   */
  async updateProfilePicture(file: File) {
    if (!file) {
      throw new Error('Image file is required');
    }
    const formData = new FormData();
    formData.append('profilePic', file);
    console.log('File received:', file, file instanceof File); // should be true
    console.log('FormData entries:', [...formData.entries()]);

    const response = await api.put('/users/profile/picture', formData, {
      transformRequest: (data, headers) => {
        delete (headers as Record<string, string>)['Content-Type']; // remove any preset header
        return data;
      },
    });

    return response.data;
  }
  async getVendor(id?: string) {
    const res = await api.get(`/vendors/${id ? id : ''}`);
    return res.data;
  }

  async getVendors(type?: string, id?: string) {
    const res = await api.get(`/vendors?type=${type}&user=${id ? id : ''}`);
    return res.data;
  }

  async getOffers(id?: string) {
    const res = await api.get(`/vendors/offers?id=${id ? id : ''}`);
    return res.data;
  }

  async getTopRated({ type }: { type?: string }) {
    const res = await api.get(`/vendors/top-rated?type=${type || ''}`);
    return res.data;
  }

  async getNearest({ longitude, latitude, type }: { longitude?: number; latitude?: number; type?: string }) {
    const res = await api.get(
      `/vendors/nearest?longitude=${longitude || ''}&latitude=${latitude || ''}&type=${type || ''}`
    );
    return res.data;
  }

  async createReservation(data: Record<string, unknown>) {
    const res = await api.post('/bookings/create', data);
    return res.data;
  }
  async updateReservationStatus({ reservationId, vendorId, resId, paymentRef }: UpdateStatusPayload) {
    if (!reservationId) throw new Error('reservationId is required');
    if (!vendorId) throw new Error('vendorId is required');

    // Improved paymentId extraction - tries multiple common fields
    let paymentId: unknown = null;
    if (paymentRef) {
      paymentId =
        typeof paymentRef === 'string' ? paymentRef.toString() : paymentRef?._id?.toString();
    }

    const payload = {
      resId,
      paymentId,
      vendorId, // Include vendorId for backend validation
    };

    console.log('[user.service] Sending confirm payload:', payload);

    const res = await api.post(`/bookings/${reservationId}/confirm`, payload);
    return res.data;
  }

  async getReservationStatus({ reservationId }: { reservationId: string }) {
    // if (!reservationId) throw new Error("reservationId is required");
    // if (!vendorId) throw new Error("vendorId is required");

    // const payload = { vendorId };
    const res = await api.post(`/bookings/${reservationId}/confirmation-status`);
    return res.data;
  }
  async updatePassword(data: Record<string, unknown>) {
    const res = await api.put(`/users/profile/password`, {
      data,
    });
    return res.data;
  }

  async confirmReservation(bookingId: string) {
    if (!bookingId) {
      throw new Error('bookingId required');
    }

    const res = await api.post(`/bookings/${bookingId}/confirm`);
    return res.data;
  }

  async fetchReservationsStats() {
    const res = await api.get(`/bookings/stats`);
    return res.data;
  }

  async fetchReservations({
    vendorId,
    userId,
    bookingId,
    resId,
    page,
    limit = 10,
    search,
    status,
  }: FetchReservationsParams) {
    const res = await api.get(
      `/bookings?vendorId=${vendorId ? vendorId : ''}&userId=${
        userId ? userId : ''
      }&bookingId=${bookingId ? bookingId : ''}&resId=${resId ? resId : ''}&page=${page}&limit=${limit}&search=${search ? search : ''}&status=${status ? status : ''}`
    );
    return res.data;
  }

  async getReviews(id: string) {
    const res = await api.get(`/reviews/${id}`);
    return res.data;
  }

  /**
   * Fetch full reservation details by ID (populated w/ vendor/room/menu etc)
   * for Payments page drawer
   */
  async fetchFullReservation(bookingId: string) {
    if (!bookingId) {
      throw new Error('bookingId required');
    }
    const res = await api.get(`/bookings/${bookingId}`);
    console.log('res', res);
    return res.data;
  }

  async createReview(data: Record<string, unknown>) {
    const res = await api.post(`/reviews/create`, data);
    return res.data;
  }

  async cancelReservation(id: string) {
    const res = await api.put(`/bookings/${id}/cancel`);
    return res.data;
  }
}

export const userService = new UserService();
