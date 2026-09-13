import api from '@/lib/axios';
import type {
  CreateBlueprintInput,
  FloorPlanApiEnvelope,
  InventoryBlueprintDto,
  PaginatedData,
  UpdateBlueprintInput,
} from '@/types';

class InventoryBlueprintService {
  async list(params?: {
    vertical?: string;
    category?: string;
    includeSystem?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const res = await api.get<FloorPlanApiEnvelope<PaginatedData<InventoryBlueprintDto>>>(
      '/inventory-blueprints',
      { params }
    );
    return res.data;
  }

  async create(input: CreateBlueprintInput) {
    const res = await api.post<FloorPlanApiEnvelope<InventoryBlueprintDto>>(
      '/inventory-blueprints',
      input
    );
    return res.data;
  }

  async get(id: string) {
    const res = await api.get<FloorPlanApiEnvelope<InventoryBlueprintDto>>(
      `/inventory-blueprints/${id}`
    );
    return res.data;
  }

  async update(id: string, input: UpdateBlueprintInput) {
    const res = await api.patch<FloorPlanApiEnvelope<InventoryBlueprintDto>>(
      `/inventory-blueprints/${id}`,
      input
    );
    return res.data;
  }

  async remove(id: string) {
    const res = await api.delete<FloorPlanApiEnvelope<{ id: string }>>(
      `/inventory-blueprints/${id}`
    );
    return res.data;
  }

  /** Idempotently clones the built-in catalog for the vendor. */
  async seedSystem(vertical: string) {
    const res = await api.post<FloorPlanApiEnvelope<InventoryBlueprintDto[]>>(
      '/inventory-blueprints/seed-system',
      { vertical }
    );
    return res.data;
  }
}

export const inventoryBlueprintService = new InventoryBlueprintService();
