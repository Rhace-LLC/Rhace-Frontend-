import api from '@/lib/axios';

export type AddOnTarget = 'dish' | 'drink';

export interface AddOnDto {
  _id: string;
  vendor?: string;
  name: string;
  price: number;
  discountPrice?: number;
  minOrderQuantity?: number;
  enablePriceVisibility?: boolean;
  appliesTo?: AddOnTarget[];
  isActive?: boolean;
}

export interface AddOnInput {
  name: string;
  price: number;
  discountPrice?: number;
  minOrderQuantity?: number;
  enablePriceVisibility?: boolean;
  appliesTo?: AddOnTarget[];
  isActive?: boolean;
}

const unwrap = <T>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } & T;
  return (body?.data ?? body) as T;
};

class AddOnService {
  async list(params?: { appliesTo?: AddOnTarget }): Promise<AddOnDto[]> {
    const res = await api.get('/addons', { params });
    return res.data as AddOnDto[];
  }

  async create(input: AddOnInput): Promise<AddOnDto> {
    const res = await api.post('/addons', input);
    return unwrap<AddOnDto>(res);
  }

  async update(id: string, patch: Partial<AddOnInput>): Promise<AddOnDto> {
    const res = await api.put(`/addons/${id}`, patch);
    return unwrap<AddOnDto>(res);
  }

  async remove(id: string): Promise<void> {
    await api.delete(`/addons/${id}`);
  }
}

export const addOnService = new AddOnService();
