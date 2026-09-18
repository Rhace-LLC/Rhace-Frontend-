import api from '@/lib/axios';

export interface CategoryDto {
  _id: string;
  vendor?: string;
  name: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

export interface CategoryInput {
  name: string;
  description?: string;
  order?: number;
  isActive?: boolean;
}

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } & T;
  return (body?.data ?? body) as T;
};

class MenuCategoryService {
  async list(includeInactive = false): Promise<CategoryDto[]> {
    const res = await api.get('/menu-categories', {
      params: includeInactive ? { includeInactive: true } : undefined,
    });
    return unwrap<CategoryDto[]>(res);
  }

  async create(input: CategoryInput): Promise<CategoryDto> {
    const res = await api.post('/menu-categories', input);
    return unwrap<CategoryDto>(res);
  }

  async update(id: string, patch: Partial<CategoryInput>): Promise<CategoryDto> {
    const res = await api.put(`/menu-categories/${id}`, patch);
    return unwrap<CategoryDto>(res);
  }

  async remove(id: string): Promise<void> {
    await api.delete(`/menu-categories/${id}`);
  }
}

export const menuCategoryService = new MenuCategoryService();
