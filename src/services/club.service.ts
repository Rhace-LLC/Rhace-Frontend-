import api from '@/lib/axios';

class ClubService {
  /**
   * Create a new drink type for a club
   */
  async createDrinkType(drinksData: Record<string, unknown>) {
    try {
      const res = await api.post(`/drinks/`, drinksData);
      return res.data;
    } catch (error) {
      const e = error as {
        response?: { status?: number; data?: unknown; headers?: unknown };
        request?: unknown;
        message?: string;
      };
      if (e.response) {
        console.error('[club.service] createDrinkType failed', {
          status: e.response.status,
          data: e.response.data,
          headers: e.response.headers,
        });
      } else if (e.request) {
        console.error('[club.service] createDrinkType no response received', e.request);
      } else {
        console.error('[club.service] createDrinkType error', e.message);
      }
      throw error;
    }
  }
  async createTable(tableData: Record<string, unknown>) {
    const res = await api.post(`/tables/`, tableData);
    return res.data;
  }

  async updateTable(tableData: Record<string, unknown>) {
    const res = await api.put(`/tables/${tableData.tableId}`, tableData);
    return res.data;
  }

  async createBottleSet(data: Record<string, unknown>) {
    const res = await api.post('/bottle-sets', data);
    return res.data;
  }

  async getBottleSet(clubId: string) {
    const res = await api.get(`/bottle-sets?clubId=${clubId}`);
    return res.data;
  }

  async getDrinks(clubId: string) {
    const res = await api.get(`/drinks?clubId=${clubId}`);
    return res.data;
  }

  async getTables(clubId: string) {
    const res = await api.get(`/tables?clubId=${clubId}`);
    return res.data;
  }
}

export const clubService = new ClubService();
