import api from '@/lib/axios';
import type { CategoryDto } from './menuCategory.service';

export interface DishDto {
  _id: string;
  vendor?: string;
  name: string;
  description?: string;
  price: number;
  discount?: boolean;
  discountPrice?: number;
  categoryId?: string | CategoryDto | null;
  mealTimes?: string[];
  tags?: string[];
  coverImage?: string;
  images?: string[];
  availability?: boolean;
  isVisible?: boolean;
  addOns?: boolean;
  addonIds?: string[];
}

export interface DishInput {
  name: string;
  description?: string;
  price: number;
  categoryId?: string | null;
  mealTimes?: string[];
  tags?: string[];
  coverImage?: string;
  images?: string[];
  availability?: boolean;
  isVisible?: boolean;
  discount?: boolean;
  discountPrice?: number;
  addonIds?: string[];
}

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } & T;
  return (body?.data ?? body) as T;
};

class DishService {
  async list(params?: { categoryId?: string; search?: string; page?: number; limit?: number }): Promise<{
    menuItems: DishDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const res = await api.get('/dishes', { params });
    return res.data as { menuItems: DishDto[]; total: number; page: number; limit: number };
  }

  async create(input: DishInput): Promise<DishDto> {
    const res = await api.post('/dishes', input);
    return unwrap<DishDto>(res);
  }

  async get(id: string): Promise<DishDto> {
    const res = await api.get(`/dishes/${id}`);
    return unwrap<DishDto>(res);
  }

  async update(id: string, patch: Partial<DishInput>): Promise<DishDto> {
    const res = await api.put(`/dishes/${id}`, patch);
    return unwrap<DishDto>(res);
  }

  async remove(id: string): Promise<void> {
    await api.delete(`/dishes/${id}`);
  }

  async attachAddon(id: string, addonId: string): Promise<DishDto> {
    const res = await api.post(`/dishes/${id}/addons`, { addonId });
    return unwrap<DishDto>(res);
  }

  async detachAddon(id: string, addonId: string): Promise<DishDto> {
    const res = await api.delete(`/dishes/${id}/addons/${addonId}`);
    return unwrap<DishDto>(res);
  }
}

export const dishService = new DishService();
