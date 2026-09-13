import api from '@/lib/axios';
import type {
  BatchUnitStatusInput,
  CreateUnitInput,
  FloorPlanApiEnvelope,
  PaginatedData,
  PhysicalUnitDto,
  UnitActivityLogDto,
  UnitStatusInput,        
  UpdateUnitInput,
} from '@/types';

class PhysicalUnitService {
  async list(
    floorPlanId: string,
    params?: {
      floor?: string;
      area?: string;
      blueprintId?: string;
      state?: string;
      reservable?: boolean;
      page?: number;
      limit?: number;
    }
  ) {
    const res = await api.get<FloorPlanApiEnvelope<PaginatedData<PhysicalUnitDto>>>(
      `/floor-plans/${floorPlanId}/units`,
      { params }
    );
    return res.data;
  }

  async create(floorPlanId: string, input: CreateUnitInput) {
    const res = await api.post<FloorPlanApiEnvelope<PhysicalUnitDto>>(
      `/floor-plans/${floorPlanId}/units`,
      input
    );
    return res.data;
  }

  async createBatch(floorPlanId: string, units: CreateUnitInput[]) {
    const res = await api.post<FloorPlanApiEnvelope<{ created: PhysicalUnitDto[] }>>(
      `/floor-plans/${floorPlanId}/units/batch`,
      { units }
    );
    return res.data;
  }

  async batchUpdateStatus(floorPlanId: string, input: BatchUnitStatusInput) {
    const res = await api.patch<
      FloorPlanApiEnvelope<{ updated: number; skipped: { unitId: string; reason: string }[] }>
    >(`/floor-plans/${floorPlanId}/units/status`, input);
    return res.data;
  }

  async get(unitId: string) {
    const res = await api.get<
      FloorPlanApiEnvelope<{ unit: PhysicalUnitDto; hasActiveReservation: boolean }>
    >(`/physical-units/${unitId}`);
    return res.data;
  }

  async update(unitId: string, input: UpdateUnitInput) {
    const res = await api.patch<FloorPlanApiEnvelope<PhysicalUnitDto>>(
      `/physical-units/${unitId}`,
      input
    );
    return res.data;
  }

  async transitionStatus(unitId: string, input: UnitStatusInput) {
    const res = await api.patch<
      FloorPlanApiEnvelope<{ unit: PhysicalUnitDto; activity: UnitActivityLogDto | null }>
    >(`/physical-units/${unitId}/status`, input);
    return res.data;
  }

  async duplicate(unitId: string) {
    const res = await api.post<FloorPlanApiEnvelope<PhysicalUnitDto>>(
      `/physical-units/${unitId}/duplicate`
    );
    return res.data;
  }

  async remove(unitId: string, force = false) {
    const res = await api.delete<FloorPlanApiEnvelope<{ id: string }>>(
      `/physical-units/${unitId}`,
      { params: force ? { force: true } : undefined }
    );
    return res.data;
  }

  async activity(unitId: string, limit = 50) {
    const res = await api.get<FloorPlanApiEnvelope<UnitActivityLogDto[]>>(
      `/physical-units/${unitId}/activity`,
      { params: { limit } }
    );
    return res.data;
  }
}

export const physicalUnitService = new PhysicalUnitService();
