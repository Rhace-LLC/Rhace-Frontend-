import api from '@/lib/axios';

/**
 * The 86-list: dishes and drinks the floor/kitchen can pull off the menu in one
 * tap. Both endpoints are availability-only and tenant-scoped server-side.
 */
export type StockItemKind = 'dish' | 'drink';

export interface StockItem {
  id: string;
  name: string;
  kind: StockItemKind;
  available: boolean;
  category?: string;
}

interface RawDish {
  _id: string;
  name: string;
  availability?: boolean;
  category?: string;
  categoryId?: { name?: string } | string;
}

interface RawDrink {
  _id: string;
  name: string;
  status?: string;
  category?: string;
}

const categoryLabel = (value: RawDish['categoryId']): string | undefined => {
  if (!value) return undefined;
  return typeof value === 'string' ? undefined : (value.name ?? undefined);
};

class StockService {
  async listDishes(search?: string): Promise<StockItem[]> {
    const res = await api.get('/dishes', { params: { limit: 200, search } });
    const dishes = (res.data?.menuItems ?? []) as RawDish[];
    return dishes.map((dish) => ({
      id: dish._id,
      name: dish.name,
      kind: 'dish' as const,
      available: dish.availability !== false,
      category: categoryLabel(dish.categoryId) ?? dish.category,
    }));
  }

  async listDrinks(search?: string): Promise<StockItem[]> {
    const res = await api.get('/drinks', { params: { limit: 200, search } });
    // Vendors get `{ drinks }`; the paginated shape is `{ docs }`.
    const drinks = (res.data?.drinks ?? res.data?.docs ?? []) as RawDrink[];
    return drinks.map((drink) => ({
      id: drink._id,
      name: drink.name,
      kind: 'drink' as const,
      available: drink.status !== 'hidden',
      category: drink.category,
    }));
  }

  /** Dishes for the kitchen, drinks for the bar — both when asked for everything. */
  async list(kinds: StockItemKind[], search?: string): Promise<StockItem[]> {
    const results = await Promise.all([
      kinds.includes('dish') ? this.listDishes(search) : Promise.resolve([]),
      kinds.includes('drink') ? this.listDrinks(search) : Promise.resolve([]),
    ]);
    return results.flat().sort((a, b) => a.name.localeCompare(b.name));
  }

  async setAvailability(kind: StockItemKind, id: string, available: boolean): Promise<void> {
    const path = kind === 'dish' ? `/dishes/${id}/availability` : `/drinks/${id}/availability`;
    await api.patch(path, { available });
  }
}

export const stockService = new StockService();
