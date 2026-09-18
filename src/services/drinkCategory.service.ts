import api from '@/lib/axios';
import type { CategoryDto, CategoryInput } from './menuCategory.service';

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } & T;
  return (body?.data ?? body) as T;
};

class DrinkCategoryService {
  // `includeInactive` is accepted for signature parity with the menu-category service.
  async list(_includeInactive = false): Promise<CategoryDto[]> {
    const res = await api.get('/drinks/categories');
    return res.data as CategoryDto[];
  }

  async create(input: CategoryInput): Promise<CategoryDto> {
    const res = await api.post('/drinks/categories', input);
    return unwrap<CategoryDto>(res);
  }

  async update(id: string, patch: Partial<CategoryInput>): Promise<CategoryDto> {
    const res = await api.put(`/drinks/categories/${id}`, patch);
    return unwrap<CategoryDto>(res);
  }

  async remove(id: string): Promise<void> {
    await api.delete(`/drinks/categories/${id}`);
  }
}

export const drinkCategoryService = new DrinkCategoryService();
