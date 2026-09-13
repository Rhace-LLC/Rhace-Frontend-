import api from '@/lib/axios';

class MenuService {
  async createMenu(data: Record<string, any>) {
    const res = await api.post('/menus', data);
    return res.data;
  }

  async createMenuItem(data: Record<string, any>) {
    const res = await api.post('/menus/items', data);
    return res.data;
  }

  async getMenuItems(id: string) {
    const res = await api.get(`/menus/items?userId=${id}`);
    return res.data;
  }

  async getMenu(id: string) {
    const res = await api.get(`/menus?id=${id}`);
    return res.data;
  }

  async getMenus(id: string) {
    const res = await api.get(`/menus?userId=${id}`);
    return res.data;
  }

  async deleteMenu(id: string, type: string) {
    if (type === 'item') {
      const res = await api.delete(`/menus/items/${id}`);
      return res.data;
    } else {
      const res = await api.delete(`/menus/${id}`);
      return res.data;
    }
  }
}

export const menuService = new MenuService();
