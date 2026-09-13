import api from '@/lib/axios';

interface RoomData {
  [key: string]: unknown;
}

class HotelService {
  /**
   * Create a new room type for a hotel
   */
  async createRoomType(hotelId: string, roomData: RoomData) {
    try {
      const res = await api.post(`/hotels/${hotelId}/roomtypes`, roomData);
      return res.data;
    } catch (error) {
      const e = error as {
        response?: { status?: number; data?: unknown; headers?: unknown };
        request?: unknown;
        message?: string;
      };
      if (e.response) {
        console.error('[hotel.service] createRoomType failed', {
          status: e.response.status,
          data: e.response.data,
          headers: e.response.headers,
        });
      } else if (e.request) {
        console.error('[hotel.service] createRoomType no response received', e.request);
      } else {
        console.error('[hotel.service] createRoomType error', e.message);
      }
      throw error;
    }
  }
  async updateRoomType(hotelId: string, roomData: RoomData, id: string) {
    try {
      const res = await api.put(`/hotels/${hotelId}/roomtypes/${id}`, roomData);
      return res.data;
    } catch (error) {
      const e = error as {
        response?: { status?: number; data?: unknown; headers?: unknown };
        request?: unknown;
        message?: string;
      };
      if (e.response) {
        console.error('[hotel.service] updateRoomType failed', {
          status: e.response.status,
          data: e.response.data,
          headers: e.response.headers,
        });
      } else if (e.request) {
        console.error('[hotel.service] updateRoomType no response received', e.request);
      } else {
        console.error('[hotel.service] updateRoomType error', e.message);
      }
      throw error;
    }
  }
  async deleteRoomType(hotelId: string, id: string) {
    try {
      const res = await api.delete(`/hotels/${hotelId}/roomtypes/${id}`);
      return res.data;
    } catch (error) {
      const e = error as {
        response?: { status?: number; data?: unknown; headers?: unknown };
        request?: unknown;
        message?: string;
      };
      if (e.response) {
        console.error('[hotel.service] deleteRoomType failed', {
          status: e.response.status,
          data: e.response.data,
          headers: e.response.headers,
        });
      } else if (e.request) {
        console.error('[hotel.service] deleteRoomType no response received', e.request);
      } else {
        console.error('[hotel.service] deleteRoomType error', e.message);
      }
      throw error;
    }
  }

  /**
   * Get all room types for a hotel
   */
  async getRoomTypes(hotelId: string) {
    const res = await api.get(`/hotels/${hotelId}/roomtypes`);
    return res.data;
  }
  async getpayment() {
    const res = await api.get(`/payments`);
    return res.data;
  }

  /**
   * Get a single room type by id for a hotel
   */
  async getRoomType(hotelId: string, id: string) {
    const res = await api.get(`/hotels/${hotelId}/roomtypes/${id}`);
    return res.data;
  }
}

export const hotelService = new HotelService();
