import api from '@/lib/axios';

/**
 * Restaurant tables are a separate domain from club tables:
 * they carry floor/section and minimum-spend semantics rather than
 * bottle-service add-ons. They are intentionally handled by their own
 * service and UI components.
 */
class RestaurantTableService {
  async getTables(restaurantId: string) {
    const res = await api.get(`/tables?restaurantId=${restaurantId}`);
    return res.data;
  }

  async createTable(tableData: Record<string, unknown>) {
    const res = await api.post(`/tables/`, tableData);
    return res.data;
  }

  async updateTable(tableData: Record<string, unknown>) {
    const res = await api.put(`/tables/${tableData.tableId}`, tableData);
    return res.data;
  }
}

export const restaurantTableService = new RestaurantTableService();
