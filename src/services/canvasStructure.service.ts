import api from '@/lib/axios';
import type {
  CanvasStructureDto,
  FloorPlanApiEnvelope,
  UpdateStructureInput,
} from '@/types';

class CanvasStructureService {
  async get(structureId: string) {
    const res = await api.get<FloorPlanApiEnvelope<CanvasStructureDto>>(
      `/structures/${structureId}`
    );
    return res.data;
  }

  async update(structureId: string, input: UpdateStructureInput) {
    const res = await api.patch<FloorPlanApiEnvelope<CanvasStructureDto>>(
      `/structures/${structureId}`,
      input
    );
    return res.data;
  }

  async remove(structureId: string) {
    const res = await api.delete<FloorPlanApiEnvelope<{ id: string }>>(
      `/structures/${structureId}`
    );
    return res.data;
  }
}

export const canvasStructureService = new CanvasStructureService();
