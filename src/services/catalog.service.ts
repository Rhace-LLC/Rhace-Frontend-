import api from '@/lib/axios';
import type { AddOnDto } from './addon.service';

export interface VendorDishDto {
  _id: string;
  name: string;
  description?: string;
  price: number;
  discount?: boolean;
  discountPrice?: number;
  images?: string[];
  coverImage?: string;
  categoryId?: { _id: string; name: string } | string | null;
  addonIds?: AddOnDto[];
}

export interface VendorDrinkDto {
  _id: string;
  name: string;
  description?: string;
  volume?: string;
  price: number;
  discountPrice?: number;
  images?: string[];
  categoryId?: { _id: string; name: string } | string | null;
  addonIds?: AddOnDto[];
}

export interface VendorBottleSetDto {
  _id: string;
  name: string;
  setPrice: number;
  discount?: number;
  image?: string;
  items?: { drinkId?: { _id: string; name?: string; price?: number }; quantity?: number }[];
}

const asArray = <T>(body: unknown): T[] => {
  const data = (body as { data?: T[] })?.data;
  return Array.isArray(data) ? data : [];
};

/** Public (unauthenticated) vendor catalog for the customer menu / pre-order. */
class CatalogService {
  async getDishes(vendorId: string): Promise<VendorDishDto[]> {
    const res = await api.get(`/vendors/${vendorId}/dishes`);
    return asArray<VendorDishDto>(res.data);
  }

  async getDrinks(vendorId: string): Promise<VendorDrinkDto[]> {
    const res = await api.get(`/vendors/${vendorId}/drinks`);
    return asArray<VendorDrinkDto>(res.data);
  }

  async getBottleSets(vendorId: string): Promise<VendorBottleSetDto[]> {
    const res = await api.get(`/vendors/${vendorId}/bottle-sets`);
    return asArray<VendorBottleSetDto>(res.data);
  }
}

export const catalogService = new CatalogService();
