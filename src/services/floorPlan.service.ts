import api from '@/lib/axios';
import type {
  BlueprintDaySlotsDto,
  BulkEntitiesInput,
  CanvasStructureDto,
  CreateFloorPlanInput,
  CreateStructureInput,
  FloorPlanApiEnvelope,
  FloorPlanAvailabilityDto,
  FloorPlanDto,
  FloorPlanLayoutDto,
  FloorPlanTimelineDto,
  PaginatedData,
  UnitActivityLogDto,
  UpdateFloorPlanInput,
} from '@/types';

class FloorPlanService {
  async list(params?: { vertical?: string; page?: number; limit?: number }) {
    const res = await api.get<FloorPlanApiEnvelope<PaginatedData<FloorPlanDto>>>('/floor-plans', {
      params,
    });
    return res.data;
  }

  async create(input: CreateFloorPlanInput) {
    const res = await api.post<FloorPlanApiEnvelope<FloorPlanDto>>('/floor-plans', input);
    return res.data;
  }

  async get(id: string) {
    const res = await api.get<FloorPlanApiEnvelope<FloorPlanDto>>(`/floor-plans/${id}`);
    return res.data;
  }

  /** Public (unauthenticated) floor plan list for a vendor. */
  async listForVendor(vendorId: string, params?: { vertical?: string; page?: number; limit?: number }) {
    const res = await api.get<FloorPlanApiEnvelope<PaginatedData<FloorPlanDto>>>(
      `/vendors/${vendorId}/floor-plans`,
      { params }
    );
    return res.data;
  }

  async getLayout(id: string) {
    const res = await api.get<FloorPlanApiEnvelope<FloorPlanLayoutDto>>(
      `/floor-plans/${id}/layout`
    );
    return res.data;
  }

  async update(id: string, input: UpdateFloorPlanInput) {
    const res = await api.patch<FloorPlanApiEnvelope<FloorPlanDto>>(`/floor-plans/${id}`, input);
    return res.data;
  }

  async remove(id: string) {
    const res = await api.delete<FloorPlanApiEnvelope<{ id: string }>>(`/floor-plans/${id}`);
    return res.data;
  }

  async addArea(id: string, name: string) {
    const res = await api.post<FloorPlanApiEnvelope<FloorPlanDto>>(`/floor-plans/${id}/areas`, {
      name,
    });
    return res.data;
  }

  async deleteArea(id: string, name: string) {
    const res = await api.delete<FloorPlanApiEnvelope<FloorPlanDto>>(
      `/floor-plans/${id}/areas/${encodeURIComponent(name)}`
    );
    return res.data;
  }

  async addFloor(id: string, input: { name: string; area?: string }) {
    const res = await api.post<FloorPlanApiEnvelope<FloorPlanDto>>(`/floor-plans/${id}/floors`, input);
    return res.data;
  }

  async deleteFloor(id: string, name: string, area?: string) {
    const res = await api.delete<FloorPlanApiEnvelope<FloorPlanDto>>(
      `/floor-plans/${id}/floors/${encodeURIComponent(name)}`,
      { data: { area } }
    );
    return res.data;
  }

  async bulkUpdateEntities(id: string, input: BulkEntitiesInput) {
    const res = await api.patch<FloorPlanApiEnvelope<{ version: number; updated: number }>>(
      `/floor-plans/${id}/entities`,
      input
    );
    return res.data;
  }

  async createStructure(id: string, input: CreateStructureInput) {
    const res = await api.post<FloorPlanApiEnvelope<CanvasStructureDto>>(
      `/floor-plans/${id}/structures`,
      input
    );
    return res.data;
  }

  async audit(
    id: string,
    params?: { from?: string; to?: string; actorId?: string; limit?: number }
  ) {
    const res = await api.get<FloorPlanApiEnvelope<UnitActivityLogDto[]>>(
      `/floor-plans/${id}/audit`,
      { params }
    );
    return res.data;
  }

  async getAvailability(
    id: string,
    params?: { blueprintId?: string; start?: string; end?: string; floor?: string; area?: string }
  ) {
    const res = await api.get<FloorPlanApiEnvelope<FloorPlanAvailabilityDto>>(
      `/floor-plans/${id}/availability`,
      { params }
    );
    return res.data;
  }

  async getSlots(
    id: string,
    params: { blueprintId: string; date: string; partySize?: number; tz?: string }
  ) {
    const res = await api.get<FloorPlanApiEnvelope<BlueprintDaySlotsDto>>(
      `/floor-plans/${id}/slots`,
      { params }
    );
    return res.data;
  }

  async getTimeline(
    id: string,
    params?: { start?: string; end?: string; blueprintId?: string; floor?: string; area?: string }
  ) {
    const res = await api.get<FloorPlanApiEnvelope<FloorPlanTimelineDto>>(
      `/floor-plans/${id}/timeline`,
      { params }
    );
    return res.data;
  }
}

export const floorPlanService = new FloorPlanService();
